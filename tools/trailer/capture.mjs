// npm run trailer:capture (requires a running Vite server and ffmpeg).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const work=process.env.TRAILER_WORKDIR||'/tmp/meridian-trailer';
const baseURL=process.env.TRAILER_BASE_URL||'http://127.0.0.1:5173';
const copy=JSON.parse(await readFile(new URL('./copy.json',import.meta.url),'utf8'));
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
await mkdir(work,{recursive:true});await mkdir('media/trailers',{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${baseURL}/tools/trailer/`);await page.evaluate(()=>window.trailer.ready);
// Rasterize localized typography separately: one shared recording, identical shot timing.
for(const lang of ['zh','en'])for(let i=0;i<8;i++){
 const png=await page.evaluate(async({lang,i,lines})=>{
  await document.fonts.ready;const c=document.createElement('canvas');c.width=1920;c.height=1080;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,570,0,1080);g.addColorStop(0,'rgba(2,5,9,0)');g.addColorStop(.6,'rgba(2,5,9,.7)');g.addColorStop(1,'rgba(2,5,9,.98)');x.fillStyle=g;x.fillRect(0,570,1920,510);
  x.fillStyle='#020509';x.fillRect(0,0,1920,58);x.fillRect(0,1022,1920,58);
  x.fillStyle='#e7a56b';x.font='500 23px monospace';x.fillText('M / MERIDIAN',88,37);
  x.textAlign='right';x.fillStyle='#bec9cf';x.font='18px sans-serif';x.fillText(lang==='zh'?'实机画面 · 镜头剪辑 · 飞行已加速':'IN-GAME FOOTAGE / CAMERA EDIT / TIME COMPRESSED',1832,36);x.textAlign='left';
  const end=i===7;x.fillStyle='#e7a56b';x.fillRect(90,end?694:784,50,4);
  let size=end?138:lang==='zh'?72:58;x.font=`600 ${size}px ${lang==='zh'?'"PingFang SC",':' '}sans-serif`;
  while(x.measureText(lines[0]).width>1740){size--;x.font=`600 ${size}px sans-serif`;}
  x.fillStyle='#f3f1e9';x.fillText(lines[0],86,end?850:883);
  x.font=`400 ${lang==='zh'?30:27}px sans-serif`;x.fillStyle='#c8d0d2';x.fillText(lines[1],90,end?918:944);
  x.fillStyle='#e7a56b';x.font='22px monospace';x.fillText(end?'github.com/fendouai/GoToMars':`0${i+1} / ${['ENGINEERING','ASSEMBLY','LAUNCH SITE','LIFTOFF','STAGING','INSERTION','EARTH ORBIT'][i]}`,90,1000);
  return c.toDataURL('image/png').split(',')[1];
 },{lang,i,lines:copy[lang][i]});
 await writeFile(`${work}/${lang}-${i}.png`,Buffer.from(png,'base64'));
}
const fps=25,total=copy.duration*fps;
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',`${work}/master.mp4`],{stdio:['pipe','inherit','inherit']});
const completed=once(ff,'close');const samples=[];
try{
 for(let frame=0;frame<total;frame++){
  const state=await page.evaluate(t=>window.trailer.seek(t),frame/fps);
  const jpeg=await page.screenshot({type:'jpeg',quality:94});
  if(!ff.stdin.write(jpeg))await once(ff.stdin,'drain');
  if(frame%100===0){console.log(`${frame}/${total}`,JSON.stringify(state));samples.push(state);}
  if(frame===150)await writeFile(`${work}/poster-base.jpg`,jpeg);
 }
 ff.stdin.end();const [code]=await completed;if(code!==0)throw new Error(`ffmpeg exited ${code}`);
 await writeFile(`${work}/capture-report.json`,JSON.stringify({resolution:[1920,1080],fps,duration:copy.duration,errors,samples},null,2));
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}

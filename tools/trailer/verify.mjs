import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const baseURL=process.env.TRAILER_BASE_URL||'http://127.0.0.1:5173';
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({headless:true,executablePath});const page=await browser.newPage();const results=[];
try{
 for(const lang of ['zh','en']){
  const file=`media/trailers/meridian-trailer-${lang}.mp4`;
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
  const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio'),subtitle=probe.streams.find(s=>s.codec_type==='subtitle');
  if(video.width!==1920||video.height!==1080||video.r_frame_rate!=='25/1'||video.codec_name!=='h264'||video.pix_fmt!=='yuv420p'||audio.codec_name!=='aac'||audio.sample_rate!=='48000'||audio.channels!==2||!subtitle||Math.abs(Number(probe.format.duration)-42)>.1)throw Error(`Unexpected format: ${file}`);
  execFileSync('ffmpeg',['-hide_banner','-v','error','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-'],{stdio:'pipe'});
  await page.setContent('<video muted playsinline></video>');
  const playback=await page.evaluate(async url=>{
   const v=document.querySelector('video');v.src=url;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(new Error(v.error?.message||'Media error'));});
   await v.play();await new Promise(r=>setTimeout(r,400));v.pause();const advanced=v.currentTime>0;
   v.currentTime=39;await new Promise((resolve,reject)=>{v.onseeked=resolve;v.onerror=()=>reject(new Error('Seek failed'));});
   return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,advanced,seeked:v.currentTime,readyState:v.readyState};
  },`${baseURL}/${file}`);
  if(!playback.advanced||playback.readyState<2||playback.seeked!==39)throw Error('Playback/seek failed');
  results.push({file,bytes:Number(probe.format.size),sha256:createHash('sha256').update(await readFile(file)).digest('hex'),video:{codec:video.codec_name,width:video.width,height:video.height,fps:video.r_frame_rate,pixelFormat:video.pix_fmt},audio:{codec:audio.codec_name,sampleRate:audio.sample_rate,channels:audio.channels},decode:'passed',browser:playback});
  console.log(`Verified ${lang}: 1080p/25, full decode, audio, subtitles, browser play and seek`);
 }
 await writeFile('media/trailers/verification.json',JSON.stringify({results},null,2)+'\n');
}finally{await browser.close();}

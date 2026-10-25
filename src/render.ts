import { BODIES, type Design, type BodyId } from './data';
import { altitude, type Flight } from './physics';
export type View='mission'|'design'|'flight';
const stars=Array.from({length:145},(_,i)=>({x:((Math.sin(i*127.1)*43758.5453)%1+1)%1,y:((Math.sin(i*311.7)*23578.1453)%1+1)%1,r:i%9===0?1.3:.6}));
function setup(canvas:HTMLCanvasElement){const ratio=Math.min(window.devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}const c=canvas.getContext('2d')!;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);return {c,w,h};}
function starfield(c:CanvasRenderingContext2D,w:number,h:number){for(const s of stars){c.fillStyle=`rgba(230,235,218,${s.r>.7?.7:.3})`;c.beginPath();c.arc(s.x*w,s.y*h,s.r,0,Math.PI*2);c.fill();}}
export function drawPlanet(canvas:HTMLCanvasElement,body:BodyId){
 const {c,w,h}=setup(canvas);starfield(c,w,h);const b=BODIES[body],r=Math.min(w*.36,h*.43),cx=w*.51,cy=h*.49;
 c.save();c.translate(cx,cy);c.rotate(-.35);
 c.strokeStyle='#545d4c';c.lineWidth=1;c.setLineDash([3,6]);c.beginPath();c.ellipse(0,0,r*1.48,r*.47,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
 const glow=c.createRadialGradient(0,0,r*.92,0,0,r*1.14);glow.addColorStop(0,body==='earth'?'#9cb8ad44':`${b.color}33`);glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.beginPath();c.arc(0,0,r*1.14,0,Math.PI*2);c.fill();
 c.save();c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();const g=c.createRadialGradient(-r*.45,-r*.5,r*.05,r*.18,r*.15,r*1.1);g.addColorStop(0,body==='earth'?'#9fb5a9':body==='moon'?'#d0cdbb':'#dcab80');g.addColorStop(.55,b.color);g.addColorStop(1,'#17211b');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);
 if(body==='earth'){
  c.fillStyle='#455e47';for(let j=0;j<5;j++){c.beginPath();for(let i=0;i<80;i++){const a=i/80*Math.PI*2,rad=r*(.24+.045*Math.sin(a*3+j)+.035*Math.cos(a*5-j));const x=Math.cos(j*1.7)*r*.55+Math.cos(a)*rad,y=Math.sin(j*2.1)*r*.5+Math.sin(a)*rad*(j%2?1.3:.65);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.fill();}
  c.strokeStyle='#e7eee029';c.lineWidth=r*.025;for(let j=0;j<5;j++){c.beginPath();c.ellipse(Math.sin(j*3)*r*.35,(j-2)*r*.28,r*.7,r*.1,j*.2,0,Math.PI*.85);c.stroke();}
 }else{for(let i=0;i<85;i++){const x=Math.sin(i*57.31)*r,y=Math.cos(i*21.1)*r,rr=(i%7+2)*r*.012;c.fillStyle=i%2?'#00000012':'#ffffff12';c.beginPath();c.arc(x,y,rr,0,Math.PI*2);c.fill();}}
 const shade=c.createLinearGradient(-r,0,r,0);shade.addColorStop(0,'#00000000');shade.addColorStop(.5,'#00000010');shade.addColorStop(1,'#060c08dd');c.fillStyle=shade;c.fillRect(-r,-r,r*2,r*2);c.restore();
 c.fillStyle='#f3b278';c.beginPath();c.arc(r*1.4,-r*.15,3,0,Math.PI*2);c.fill();c.restore();
 c.strokeStyle='#b7bd9b33';c.beginPath();c.moveTo(w*.12,h*.81);c.lineTo(w*.28,h*.81);c.lineTo(w*.35,h*.7);c.stroke();

}
export function drawRocket(c:CanvasRenderingContext2D,d:Design,x:number,y:number,scale:number,active=0,flame=0,angle=0,capsule=false){
 c.save();c.translate(x,y);c.rotate(-angle);c.scale(scale,scale);
 const stages=capsule?[]:d.stages.slice(active);const heights=stages.map(s=>35+s.fuel/260),total=heights.reduce((a,b)=>a+b,0)+48;
 let top=-total/2;
 c.fillStyle='#e8e7d6';c.strokeStyle='#798378';c.lineWidth=1;
 c.beginPath();c.moveTo(-15,top+32);c.quadraticCurveTo(-15,top+10,0,top);c.quadraticCurveTo(15,top+10,15,top+32);c.closePath();c.fill();c.stroke();
 c.fillStyle='#edac72';c.fillRect(-15,top+29,30,4);c.fillStyle='#272f2c';c.beginPath();c.arc(0,top+20,5,0,Math.PI*2);c.fill();top+=34;
 for(let i=stages.length-1;i>=0;i--){const s=stages[i],width=s.diameter*17,hh=heights[i];const metal=c.createLinearGradient(-width/2,0,width/2,0);metal.addColorStop(0,'#87958b');metal.addColorStop(.25,'#ececdb');metal.addColorStop(.65,'#d8ddcd');metal.addColorStop(1,'#78877c');c.fillStyle=metal;c.fillRect(-width/2,top,width,hh);c.strokeRect(-width/2,top,width,hh);c.fillStyle='#26332c';c.fillRect(-width/2,top+hh*.7,width,8);c.fillStyle='#edab72';c.fillRect(-width/2,top+8,width,4);
 c.save();c.translate(2,top+hh*.45);c.rotate(Math.PI/2);c.font='7px monospace';c.fillStyle='#455044';c.fillText('G · T · M',-12,0);c.restore();
 if(i===0&&d.fins){c.fillStyle='#879489';c.beginPath();c.moveTo(-width/2,top+hh-35);c.lineTo(-width/2-18,top+hh+4);c.lineTo(-width/2,top+hh-3);c.fill();c.beginPath();c.moveTo(width/2,top+hh-35);c.lineTo(width/2+18,top+hh+4);c.lineTo(width/2,top+hh-3);c.fill();}
 if(i===0&&d.legs){c.strokeStyle='#c7cdb7';c.lineWidth=3;for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*width/2,top+hh-22);c.lineTo(sign*(width/2+21),top+hh+12);c.lineTo(sign*(width/2+28),top+hh+12);c.stroke();}}
 top+=hh+6;c.fillStyle='#5a6258';c.beginPath();c.moveTo(-7,top-6);c.lineTo(-11,top+7);c.lineTo(11,top+7);c.lineTo(7,top-6);c.fill();
 }
 if(d.solar){c.fillStyle='#4d7276';c.strokeStyle='#c2c8ad';for(const sign of [-1,1]){c.fillRect(sign===1?18:-65,-total/2+38,47,16);c.strokeRect(sign===1?18:-65,-total/2+38,47,16);}}
 if(flame>0&&!capsule){const len=30+flame*65;const grad=c.createLinearGradient(0,top,0,top+len);grad.addColorStop(0,'#fff3cf');grad.addColorStop(.25,'#ffc17b');grad.addColorStop(1,'#e8874200');c.fillStyle=grad;c.beginPath();c.moveTo(-9,top+5);c.quadraticCurveTo(-12,top+len*.45,0,top+len);c.quadraticCurveTo(12,top+len*.45,9,top+5);c.fill();}
 c.restore();return total*scale;
}
export function drawDesign(canvas:HTMLCanvasElement,d:Design,selected:number){const {c,w,h}=setup(canvas);c.strokeStyle='#bbc3a00c';c.lineWidth=1;for(let x=0;x<w;x+=28){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=28){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
 const total=d.stages.reduce((a,s)=>a+41+s.fuel/260,48),scale=Math.min(3.5,(h-150)/total,(w-25)/Math.max(d.solar?135:70,...d.stages.map(s=>s.diameter*17+60)));drawRocket(c,d,w*.5,h*.48,scale);
 c.strokeStyle='#9fa58c55';c.setLineDash([3,5]);c.beginPath();c.moveTo(w*.5,30);c.lineTo(w*.5,h-45);c.stroke();c.setLineDash([]);
 c.fillStyle='#929b83';c.font='10px monospace';c.fillText('TOP / 有效载荷',26,38);c.fillText(`STAGE ${String(selected+1).padStart(2,'0')} / 正在编辑`,26,h-30);
 c.fillStyle='#d3a477';c.beginPath();c.arc(w*.5,h*.48,3,0,Math.PI*2);c.fill();c.strokeStyle='#d3a477';c.beginPath();c.moveTo(w*.5+8,h*.48);c.lineTo(w*.5+65,h*.48);c.stroke();c.font='9px monospace';c.fillText('CoM · 示意',w*.5+70,h*.48+3);
}
export function drawFlight(canvas:HTMLCanvasElement,f:Flight,map:boolean){const {c,w,h}=setup(canvas),b=BODIES[f.body],alt=altitude(f);starfield(c,w,h);
 if(map||['transfer','cruise','capture'].includes(f.phase)){
  const cx=w*.46,cy=h*.48,r=Math.min(w,h)*.19;
  c.strokeStyle='#d7d9ba33';c.lineWidth=1;for(let i=1;i<=4;i++){c.beginPath();c.arc(cx,cy,r*(1+i*.22),0,Math.PI*2);c.stroke();}
  const g=c.createRadialGradient(cx-r*.4,cy-r*.4,0,cx,cy,r);g.addColorStop(0,b.color);g.addColorStop(1,'#26382d');c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
  c.strokeStyle='#e5ad79';c.setLineDash([4,5]);c.beginPath();c.ellipse(cx+25,cy-10,r*1.75,r*1.32,-.3,0,Math.PI*2);c.stroke();c.setLineDash([]);
  const a=f.time*.003;c.fillStyle='#eeb97d';c.beginPath();c.arc(cx+25+Math.cos(a)*r*1.75,cy-10+Math.sin(a)*r*1.32,4,0,Math.PI*2);c.fill();
  c.fillStyle='#c5cbb7';c.font='11px monospace';c.fillText(`${b.name} · ${['transfer','cruise','capture'].includes(f.phase)?'解析转移示意':'轨道示意 · 以遥测为准'}`,24,h-26);
  if(f.phase==='cruise'){c.fillStyle='#eab07e';c.font='26px monospace';c.fillText(`${(f.cruiseRemaining/86400).toFixed(1)} DAYS`,24,55);}
 }else{
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#101a18');sky.addColorStop(1,f.body==='mars'?'#5c4033':f.body==='earth'&&alt<45000?'#314a43':'#1c2420');c.fillStyle=sky;c.fillRect(0,0,w,h);starfield(c,w,h);
  const groundY=h*.83+Math.min(h*.6,alt/100),near=alt<12000;
  c.fillStyle=f.body==='mars'?'#8e5a40':f.body==='moon'?'#65685b':'#465341';c.beginPath();c.moveTo(0,h);c.lineTo(0,groundY);for(let x=0;x<=w;x+=20)c.lineTo(x,groundY-Math.sin(x*.008)*16-Math.sin(x*.031)*4);c.lineTo(w,h);c.fill();
  if(!near){c.strokeStyle='#99b59b33';c.lineWidth=4;c.beginPath();c.ellipse(w/2,h*2.4,w*1.8,h*1.65,0,Math.PI*1.13,Math.PI*1.87);c.stroke();}
  const scale=Math.min(1.05,(h*.58)/(f.design.stages.reduce((a,s)=>a+41+s.fuel/260,48)));
  drawRocket(c,f.design,w*.5,h*.47,scale,f.active,f.throttle&&!f.capsule&&f.fuels[f.active]>0?f.throttle:0,f.angle,f.capsule);
  if(f.chute){const cy=h*.47-120;c.strokeStyle='#cbd4ba';c.lineWidth=1;c.beginPath();c.moveTo(w*.5-65,cy);c.lineTo(w*.5,h*.47-24);c.lineTo(w*.5+65,cy);c.stroke();c.fillStyle='#dfae7e';c.beginPath();c.arc(w*.5,cy,65,Math.PI,0);c.fill();}
  c.fillStyle='#a9b49b';c.font='10px monospace';c.fillText(`${b.name} / ${alt<1000?'SURFACE':alt<50000?'ATMOSPHERE':'SPACE'}`,24,h-26);
 }
}

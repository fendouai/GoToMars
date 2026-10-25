import { BODIES, DEFAULT_PROGRAM, ENGINES, G0, type BodyId, type Design, type Mission, type Stage } from './data';
export const clone = <T>(v:T):T => structuredClone(v);
export const engineOf = (id:string) => ENGINES.find(e=>e.id===id) ?? ENGINES[0];
export function stageEngine(s:Stage){
 const base=engineOf(s.engine),count=s.count??1,nozzle=s.nozzle??'balanced';
 const isp=base.isp*(nozzle==='vacuum'?1.08:nozzle==='sea'?.95:1);
 return {...base,thrust:base.thrust*count*(nozzle==='sea'?1.08:nozzle==='vacuum'?.94:1),isp,dry:base.dry*count*(nozzle==='vacuum'?1.13:nozzle==='sea'?.94:1),cost:Math.ceil(base.cost*count*(nozzle==='vacuum'?1.15:nozzle==='sea'?.96:1)),loss:nozzle==='vacuum'?.45:nozzle==='sea'?.06:base.id==='vacuum'?.36:.12};
}
export function tankMass(fuel:number,diameter:number,structure:number) { return 55 + fuel*(0.065+0.015*(diameter/2))*structure; }
export function equipmentMass(d:Design) { return 120+d.payload+(d.fins?45:0)+(d.fairing?65:0)+(d.shield?110:0)+(d.parachute?35:0)+(d.legs?65:0)+(d.solar?30:0)+d.battery*20; }
export function stageDry(d:Design,i:number) { const s=d.stages[i]; return stageEngine(s).dry+tankMass(s.fuel,s.diameter,s.structure)+35; }
export function massOf(d:Design,active=0,fuels=d.stages.map(s=>s.fuel)) { return equipmentMass(d)+d.stages.slice(active).reduce((m,_,j)=>m+stageDry(d,active+j)+(fuels[active+j]??0),0); }
export function costOf(d:Design,m?:Mission) { return Math.ceil(1400+d.payload*2+d.battery*150+(d.fins?200:0)+(d.fairing?450:0)+(d.shield?900:0)+(d.parachute?350:0)+(d.legs?650:0)+(d.solar?800:0)+d.stages.reduce((n,s)=>n+stageEngine(s).cost+s.fuel*.35+s.structure*200,0)+(m&&m.start!=='surface'?2500:0)); }
export function analyze(d:Design,body:BodyId='earth') {
  const fuels=d.stages.map(s=>s.fuel), b=BODIES[body];
  const stages=d.stages.map((s,i)=> {const mass=massOf(d,i,fuels),e=stageEngine(s);return {mass,dry:stageDry(d,i),dv:e.isp*G0*Math.log(mass/(mass-s.fuel)),twr:e.thrust/(mass*b.mu/b.radius**2),burn:s.fuel/(e.thrust/(e.isp*G0))};});
  return {mass:massOf(d),cost:costOf(d),dv:stages.reduce((a,s)=>a+s.dv,0),stages};
}
export function orbitOf(x:number,y:number,vx:number,vy:number,mu:number,radius:number) {
  const r=Math.hypot(x,y),v2=vx*vx+vy*vy,h=x*vy-y*vx,energy=v2/2-mu/r;
  const e=Math.sqrt(Math.max(0,1+2*energy*h*h/(mu*mu)));
  const p=h*h/mu, peri=p/(1+e)-radius;
  const apo=energy<0?(-mu/(2*energy))*(1+e)-radius:Infinity;
  return {peri,apo,e,energy};
}
export function warnings(d:Design,m:Mission,tech:number):string[] {
  const a=analyze(d,m.body),w:string[]=[];
  if(d.payload<m.payload)w.push(`任务需要至少 ${m.payload} kg 载荷`);
  if(m.start==='surface'&&a.stages[0].twr<1.1)w.push('地面推重比偏低，火箭可能无法离台');
  if(d.stages.some(s=>engineOf(s.engine).tech>tech))w.push('设计含尚未研发的发动机');
  if((m.kind==='land')&&!d.legs)w.push('缺少着陆腿，接地容易损坏');
  if((m.id==='mars-final'||m.id==='mars-entry'||m.kind==='return')&&!d.shield)w.push('缺少隔热盾，再入存在过热风险');
  if(m.kind==='recovery'&&!d.parachute)w.push('缺少降落伞，记录舱无法安全回收');
  if(m.body==='mars'&&!d.solar)w.push('长途任务需要太阳能供电');
  if(m.kind==='orbit'&&a.dv<3400)w.push('入轨 Δv 偏少，建议增加上面级效率');
  return w;
}
export type Phase='ascent'|'transfer'|'cruise'|'capture'|'descent'|'return-burn'|'reentry'|'complete'|'failed';
export interface Event { t:number; text:string; level:'info'|'warn'|'success'; }
export interface Sample {t:number;h:number;v:number;fuel:number;q:number;temp:number;}
export interface Flight {
  design:Design; mission:Mission; body:BodyId; phase:Phase; time:number; localTime:number; x:number;y:number;vx:number;vy:number;angle:number;commandAngle:number;angularRate:number;throttle:number;active:number;fuels:number[];autopilot:boolean;fairingGone:boolean;capsule:boolean;chute:boolean;temperature:number;electric:number;maxAltitude:number;maxSpeed:number;maxQ:number;events:Event[];samples:Sample[];lastSample:number;success:boolean;reason:string;burnRemaining:number;cruiseRemaining:number;warp:number;paused:boolean;window:number;dataSent:boolean; touchdownSpeed?:number; touchdownError?:number; circularizing:boolean; initialMass:number;
}
export function log(f:Flight,text:string,level:Event['level']='info') { f.events.push({t:f.time,text,level}); }
export function transferBudget(body:BodyId,window=0) { return body==='moon'?{depart:860,capture:230,travel:172800}:{depart:1800+Math.abs(Math.sin(window/780*Math.PI))*650,capture:650,travel:7776000}; }
export function createFlight(design:Design,mission:Mission,window=0):Flight {
  const body=mission.start==='parking'?'earth':mission.body,b=BODIES[body];
  const h=mission.start==='parking'?70000:mission.start==='approach'?(mission.entry?.height??(body==='moon'?12000:32000)):0;
  const phase:Phase=mission.start==='parking'?'transfer':mission.start==='approach'?'descent':'ascent';
  const f:Flight={design:clone(design),mission:clone(mission),body,phase,time:0,localTime:0,x:mission.start==='approach'?(mission.entry?.x??0):0,y:b.radius+h,vx:mission.start==='approach'?(mission.entry?.horizontal??0):0,vy:mission.start==='approach'?(mission.entry?.vertical??(body==='moon'?-50:-500)):0,angle:0,commandAngle:0,angularRate:0,throttle:1,active:0,fuels:design.stages.map(s=>s.fuel),autopilot:true,fairingGone:false,capsule:false,chute:false,temperature:20,electric:design.battery*100,maxAltitude:h,maxSpeed:0,maxQ:0,events:[],samples:[],lastSample:-1,success:false,reason:'',burnRemaining:phase==='transfer'?transferBudget(mission.body,window).depart:0,cruiseRemaining:0,warp:1,paused:false,window,dataSent:false,circularizing:false,initialMass:massOf(design)};
  log(f,mission.start==='surface'?'发射台就绪 · 自动驾驶已接通':mission.start==='parking'?'轨道投送完成 · 开始解析转移机动':mission.start==='lunar'?'月面返回器就绪':'已进入下降走廊 · 开始着陆验证');
  return f;
}
export function altitude(f:Flight) {return Math.max(0,Math.hypot(f.x,f.y)-BODIES[f.body].radius);}
export function currentMass(f:Flight) {return f.capsule?equipmentMass(f.design)-(f.fairingGone&&f.design.fairing?65:0):massOf(f.design,f.active,f.fuels)-(f.fairingGone&&f.design.fairing?65:0);}
export function remainingDV(f:Flight) {if(f.capsule)return 0; return f.design.stages.slice(f.active).reduce((total,s,j)=>{const i=f.active+j,m=massOf(f.design,i,f.fuels);return total+stageEngine(s).isp*G0*Math.log(m/(m-f.fuels[i]));},0);}
export function separate(f:Flight) {
  if(f.capsule||f.phase==='complete'||f.phase==='failed')return;
  if(f.active<f.design.stages.length-1){f.active++;log(f,`分离完成 · 第 ${f.active+1} 级点火`);}
  else {f.capsule=true;f.throttle=0;log(f,'运载段分离 · 返回舱独立飞行');}
}
export function deployChute(f:Flight) {
  if(!f.design.parachute||f.chute||!BODIES[f.body].atmosphere)return;
  if(altitude(f)>10000||Math.hypot(f.vx,f.vy)>650){log(f,'开伞条件未满足：高度 ≤ 10 km，速度 ≤ 650 m/s','warn');return;}
  f.chute=true;log(f,'降落伞展开');
}
export function finish(f:Flight,success:boolean,reason:string) {
  if(f.phase==='complete'||f.phase==='failed')return;
  f.success=success; f.reason=reason; f.phase=success?'complete':'failed';f.throttle=0;f.dataSent=success;
  log(f,reason,success?'success':'warn');record(f,true);
}
function record(f:Flight,force=false){if(force||f.time-f.lastSample>=2){f.lastSample=f.time;f.samples.push({t:f.time,h:altitude(f),v:Math.hypot(f.vx,f.vy),fuel:f.fuels.reduce((a,b)=>a+b,0),q:f.maxQ,temp:f.temperature});if(f.samples.length>2400) f.samples.splice(1,1);}}
function engineStep(f:Flight,dt:number,pressure=0) {
  if(f.capsule)return {thrust:0,used:0,dv:0};
  if(f.fuels[f.active]<=.001&&f.autopilot&&f.design.program?.autoStage!==false&&f.active<f.design.stages.length-1) separate(f);
  const e=stageEngine(f.design.stages[f.active]),loss=e.loss;
  const thrust=e.thrust*(1-loss*pressure)*Math.max(0,Math.min(1,f.throttle));
  const before=currentMass(f);
  const wanted=thrust/(e.isp*(1-loss*pressure)*G0)*dt,used=Math.min(f.fuels[f.active],wanted);
  f.fuels[f.active]=Math.max(0,f.fuels[f.active]-used);
  return {thrust:wanted>0?thrust*used/wanted:0,used,dv:used>0?e.isp*(1-loss*pressure)*G0*Math.log(before/currentMass(f)):0};
}
function burnStep(f:Flight,dt:number) {

  if(f.autopilot) f.throttle=1;
  const r=engineStep(f,dt);
  const delivered=r.dv;
  f.burnRemaining-=delivered;
  f.vx+=delivered;
  if(f.burnRemaining<=0){
    if(f.phase==='transfer') {f.phase='cruise';f.cruiseRemaining=transferBudget(f.mission.body,f.window).travel;log(f,'出发机动完成 · 进入无推力巡航');f.throttle=0;}
    else if(f.phase==='capture') {
      if(f.mission.kind==='transfer')finish(f,true,`${BODIES[f.mission.body].name}轨道捕获成功 · 科学数据已回传`);
      else beginDescent(f);
    } else {f.phase='reentry';f.body='earth';f.x=0;f.y=BODIES.earth.radius+45000;f.vx=900;f.vy=-650;f.throttle=0;log(f,'地球返回注入完成 · 进入再入走廊');}
  } else if(r.used===0&&remainingDV(f)<1)finish(f,false,'推进剂耗尽，无法完成机动。增加转移级燃料或降低干重。');
}
function beginDescent(f:Flight) {
  f.phase='descent';f.body=f.mission.body;f.x=f.mission.entry?.x??0;f.y=BODIES[f.body].radius+(f.mission.entry?.height??(f.body==='moon'?12000:32000));f.vx=f.mission.entry?.horizontal??0;f.vy=f.mission.entry?.vertical??(f.body==='moon'?-50:-500);f.angle=0;f.commandAngle=0;f.angularRate=0;
  if(f.active<f.design.stages.length-1)separate(f);
  log(f,'进入下降走廊 · 交接至动力着陆');
}
function guidance(f:Flight,dt:number){
  const program=f.design.program??DEFAULT_PROGRAM;
  const b=BODIES[f.body],h=altitude(f),r=b.radius+h,g=b.mu/r**2,v=Math.hypot(f.vx,f.vy),radial=(f.x*f.vx+f.y*f.vy)/r;
  const e=stageEngine(f.design.stages[f.active]),maxA=e.thrust/currentMass(f);
  if(f.phase==='descent'){
    f.commandAngle=Math.atan2(f.x,f.y);
    const speed=Math.max(1,-radial),brake=Math.max(.2,maxA-g),safe=Math.sqrt(2*Math.min(brake,3)*Math.max(0,h-30))*.65;
    const desired=-Math.min(f.body==='moon'?150:330,Math.max(1.5,safe));
    const vertical=Math.max(0,g+(desired-radial)*2);
    const desiredVx=Math.max(-45,Math.min(45,-f.x*.07));
    const horizontal=f.mission.entry?Math.max(-maxA*.4,Math.min(maxA*.4,(desiredVx-f.vx)*.7)):0;
    f.commandAngle=Math.atan2(f.x,f.y)+Math.atan2(horizontal,Math.max(.01,vertical));
    f.throttle=Math.max(0,Math.min(1,Math.hypot(vertical,horizontal)/maxA));
    if(program.autoChute&&f.body==='mars'&&f.design.parachute&&h<8500&&v<600)deployChute(f);
  } else if(f.mission.kind==='recovery'||f.phase==='reentry'){
    if(f.phase==='reentry'||radial<0){
      f.throttle=0;if(program.autoStage&&h<25000&&!f.capsule)separate(f);
      if(program.autoChute&&h<9000&&v<620)deployChute(f);
    }else f.throttle=f.maxAltitude>=f.mission.target?0:1;
    f.commandAngle=0;
  }else if(f.mission.kind==='altitude') {f.commandAngle=0;f.throttle=1;}
  else if(f.mission.kind==='return'){
    f.commandAngle=0;f.throttle=1;
    if(h>12000){f.phase='return-burn';f.burnRemaining=1450;log(f,'月面上升完成 · 开始地球返回注入');}
  }else {
    const o=orbitOf(f.x,f.y,f.vx,f.vy,b.mu,b.radius),target=f.mission.target+14000;
    if(h>f.mission.target*.9&&radial<25)f.circularizing=true;
    if(!f.circularizing&&o.apo>target&&radial>20){f.throttle=0;f.commandAngle=Math.PI/2+Math.atan2(f.x,f.y);}
    else {
      f.throttle=1;
      const pitch=Math.min(89,Math.max(0,(h-program.turnStart)/(program.turnEnd-program.turnStart)*89))*Math.PI/180;
      f.commandAngle=pitch+Math.atan2(f.x,f.y);
      if(h>40000)f.commandAngle=Math.PI/2+Math.atan2(f.x,f.y);
      if(o.apo>target&&radial>0)f.commandAngle=Math.PI/2+Math.atan2(f.x,f.y);
    }
    if(f.circularizing){f.throttle=1;f.commandAngle=Math.PI/2+Math.atan2(f.x,f.y)-Math.max(-.18,Math.min(.18,(5-radial)*.008));}
    if(maxA>program.maxAccel)f.throttle=Math.min(f.throttle,program.maxAccel/maxA);
  }
  if(f.phase==='ascent'&&maxA>program.maxAccel)f.throttle=Math.min(f.throttle,program.maxAccel/maxA);
  if(h>28000&&f.design.fairing&&!f.fairingGone){f.fairingGone=true;log(f,'整流罩抛离');}
  void dt;
}
function isTerminal(f:Flight){return f.phase==='complete'||f.phase==='failed';}
export function step(f:Flight,dt:number) {
  if(f.paused||f.phase==='complete'||f.phase==='failed'||dt<=0)return;
  if(f.phase==='cruise'){
    const elapsed=Math.min(dt,f.cruiseRemaining);f.time+=elapsed;f.cruiseRemaining-=elapsed;
    if(!f.design.solar)f.electric=Math.max(0,f.electric-elapsed*.005);
    if(f.electric<=0){finish(f,false,'巡航期间电量耗尽。安装太阳能板，并保留电池。');return;}
    if(f.cruiseRemaining<=0){f.body=f.mission.body;f.phase='capture';f.burnRemaining=transferBudget(f.mission.body,f.window).capture;f.x=0;f.y=BODIES[f.body].radius+30000;f.vx=0;f.vy=0;log(f,'目标天体抵达 · 开始捕获机动');}
    record(f);return;
  }
  // Fixed substeps make the outcome independent of rendering frame rate and time warp.
  let left=Math.min(dt,120);
  while(left>1e-9&&!isTerminal(f)) {
    const delta=Math.min(.05,left);left-=delta;f.time+=delta;f.localTime+=delta;
    if(f.phase==='transfer'||f.phase==='capture'||f.phase==='return-burn'){burnStep(f,delta);record(f);continue;}
    const b=BODIES[f.body],h=altitude(f),r=Math.hypot(f.x,f.y);
    if(f.autopilot)guidance(f,delta);
    const rho=h<b.atmosphere?b.density*Math.exp(-h/b.scaleHeight):0,v=Math.hypot(f.vx,f.vy),q=.5*rho*v*v;
    const engine=engineStep(f,delta,rho/Math.max(b.density,1e-6));
    const m=currentMass(f)+engine.used/2,diam=f.design.stages[f.active].diameter;
    const area=Math.PI*(diam/2)**2;
    const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
    const prograde=Math.atan2(f.vx,f.vy),attack=v>50?wrap(f.angle-prograde):0;
    const length=4+f.design.stages.slice(f.active).reduce((sum,s)=>sum+s.fuel/2000,0);
    const inertia=Math.max(100,m*length*length/12);
    const moment=q*area*length/inertia;
    const aero=(f.design.fins?-.025:.003)*Math.sin(attack)*moment;
    const authority=f.capsule?.15:Math.min(1.4,stageEngine(f.design.stages[f.active]).thrust*length*.025/inertia+.12);
    const control=Math.max(-authority,Math.min(authority,wrap(f.commandAngle-f.angle)*4-f.angularRate*3));
    f.angularRate+=(control+aero)*delta;f.angularRate=Math.max(-1,Math.min(1,f.angularRate));f.angle=wrap(f.angle+f.angularRate*delta);
    const cd=(f.design.fairing&&!f.fairingGone?.25:.46)+Math.sin(attack)**2*.55;
    const drag=q*(area*cd+(f.chute?240:0));
    let ax=-b.mu*f.x/r**3+engine.thrust/m*Math.sin(f.angle),ay=-b.mu*f.y/r**3+engine.thrust/m*Math.cos(f.angle);
    if(v>.001){const dec=Math.min(drag/m,v/delta);ax-=dec*f.vx/v;ay-=dec*f.vy/v;}
    f.vx+=ax*delta;f.vy+=ay*delta;f.x+=f.vx*delta;f.y+=f.vy*delta;
    // Launch clamps hold an underpowered vehicle; a falling vehicle is not clamped.
    if(Math.hypot(f.x,f.y)<b.radius&&f.maxAltitude<1&&f.time<8){f.x=0;f.y=b.radius;f.vx=0;f.vy=0;}
    const newH=altitude(f);f.maxAltitude=Math.max(f.maxAltitude,newH);f.maxSpeed=Math.max(f.maxSpeed,v);f.maxQ=Math.max(f.maxQ,q);
    const heat=rho*v**3*.000001/(f.design.shield?24:1);
    f.temperature=Math.max(20,f.temperature+(heat-(f.temperature-20)*.035)*delta);
    f.electric=Math.max(0,Math.min(f.design.battery*100,f.electric+(f.design.solar?.1:-.005)*delta));
    if(f.temperature>1200){finish(f,false,'热防护失效。降低进入速度或安装隔热盾。');break;}
    if(q>95000*f.design.stages[f.active].structure){finish(f,false,'结构载荷超限。减小低空速度，或提高结构规格。');break;}
    if(f.time>10&&f.maxAltitude<1){finish(f,false,'推重比不足，火箭无法离开发射台。减轻重量或提高推力。');break;}
    if(f.mission.kind==='altitude'&&newH>=f.mission.target){finish(f,f.design.payload>=f.mission.payload,'探空目标已达到 · 遥测数据已回传');break;}
    if(f.mission.kind==='orbit'){
      const o=orbitOf(f.x,f.y,f.vx,f.vy,b.mu,b.radius);
      if(o.peri>=f.mission.target&&o.energy<0){finish(f,f.design.payload>=f.mission.payload,'稳定轨道建立 · 有效载荷部署成功');break;}
    }
    if(Math.hypot(f.x,f.y)<=b.radius&&f.maxAltitude>2){
      const speed=Math.hypot(f.vx,f.vy),land=f.phase==='descent',equipment=land?f.design.legs:f.design.parachute&&f.chute;
      const achieved=land||f.phase==='reentry'||f.maxAltitude>=f.mission.target;
      const tilt=Math.abs(Math.atan2(Math.sin(f.angle-Math.atan2(f.x,f.y)),Math.cos(f.angle-Math.atan2(f.x,f.y))));
      f.touchdownSpeed=speed;f.touchdownError=Math.abs(f.x);
      const inZone=!land||!f.mission.entry||Math.abs(f.x)<=f.mission.entry.radius;
      const ok=inZone&&(!land||tilt<Math.PI/9)&&speed<=(land?f.mission.target:9)&&equipment&&achieved&&f.design.payload>=f.mission.payload&&f.electric>0;
      finish(f,ok,ok?(land?`${b.name}软着陆成功 · 科学设备部署，数据已回传`:'返回舱安全回收 · 样本与数据完整'):`接地速度 ${speed.toFixed(1)} m/s。${!inZone?`偏离着陆区 ${Math.round(Math.abs(f.x))} m，提前消除水平误差。`:!equipment?'检查着陆腿／降落伞配置。':tilt>=Math.PI/9?'着陆姿态超过 20°，请保持直立。':'提前减速并保留更多下降燃料。'}`);break;
    }
    if(f.localTime>7200){finish(f,false,'任务超时。检查轨道、推进余量和飞行程序。');break;}
    record(f);
  }
}
export function simulate(design:Design,mission:Mission,limit=30000):Flight {
  const f=createFlight(design,mission);
  for(let i=0;i<limit&&f.phase!=='complete'&&f.phase!=='failed';i++) step(f,f.phase==='cruise'?f.cruiseRemaining:1);
  return f;
}

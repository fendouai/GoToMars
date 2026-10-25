import { EARTH, OMEGA, MATERIALS, add, analyzeVehicle, atmosphere, clamp, cross, dot, dryMass, enginePerformance, engineSpec, fuelMass, fairingMass, fairingPart, inspectVehicle, length, mul, payloadMass, stageHeight, sub, unit, vehicleCost, vehicleHeight, vehicleMass, type Objective, type V3, type Vehicle } from './model';
export type FlightPhase='countdown'|'ascent'|'coast'|'insertion'|'orbit'|'failed';
export interface FlightEvent {time:number;text:string;kind:'info'|'warning'|'success';}
export interface Telemetry {time:number;altitude:number;speed:number;airSpeed:number;vertical:number;horizontal:number;mass:number;fuel:number;q:number;g:number;heat:number;apo:number;peri:number;}
export interface Debris {stage:number;r:V3;v:V3;axis:V3;separatedAt:number;}
export interface Flight3D {
 vehicle:Vehicle;objective:Objective;ignitions?:number[];running?:boolean[];time:number;phase:FlightPhase;r:V3;v:V3;axis:V3;omega:V3;
 fuels:number[];active:number;throttle:number;command:number;autopilot:boolean;manualPitch:number;manualYaw:number;
 fairingGone:boolean;launched:boolean;stageIgnition:number;orbitHold:number;paused:boolean;reason:string;
 events:FlightEvent[];samples:Telemetry[];path:V3[];debris:Debris[];lastSample:number;lastPath:number;
 maxQ:number;maxG:number;maxHeat:number;temperature:number;gravityLoss:number;dragLoss:number;engineDV:number;maxAltitude:number;currentThrust:number;currentFlow:number;currentGimbal:number;maxAlpha:number;structuralStress:number;
}
export interface Orbit {apo:number;peri:number;eccentricity:number;energy:number;period:number;inclination:number;speed:number;}
export const LAT=-28.5*Math.PI/180;
export const launchPosition=():V3=>[0,EARTH.radius*Math.cos(LAT),EARTH.radius*Math.sin(LAT)];
export function orbitState(r:V3,v:V3):Orbit{
 const radius=length(r),speed=length(v),h=cross(r,v),energy=speed*speed/2-EARTH.mu/radius;
 const eccentricity=Math.sqrt(Math.max(0,1+2*energy*dot(h,h)/EARTH.mu**2));
 const a=energy<0?-EARTH.mu/(2*energy):Infinity,p=dot(h,h)/EARTH.mu;
 return {apo:energy<0?a*(1+eccentricity)-EARTH.radius:Infinity,peri:p/(1+eccentricity)-EARTH.radius,eccentricity,energy,period:energy<0?2*Math.PI*Math.sqrt(a**3/EARTH.mu):Infinity,inclination:Math.acos(clamp(-h[2]/Math.max(1,length(h)),-1,1))*180/Math.PI,speed};
}
export const altitude3D=(f:Flight3D)=>length(f.r)-EARTH.radius;
export const mass3D=(f:Flight3D)=>vehicleMass(f.vehicle,f.active,f.fuels,f.fairingGone);
export function deltaV3D(f:Flight3D){return f.vehicle.stages.slice(f.active).reduce((sum,s,j)=>{const i=f.active+j,m=vehicleMass(f.vehicle,i,f.fuels,f.fairingGone);return sum+engineSpec(s).ispVac*EARTH.g0*Math.log(m/(m-f.fuels[i]));},0);}
export function emit(f:Flight3D,text:string,kind:FlightEvent['kind']='info'){f.events.push({time:f.time,text,kind});}
export function createFlight3D(vehicle:Vehicle,objective:Objective):Flight3D{
 const r=launchPosition();const f:Flight3D={vehicle:structuredClone(vehicle),objective:structuredClone(objective),ignitions:vehicle.stages.map(()=>0),running:vehicle.stages.map(()=>false),time:-8,phase:'countdown',r,v:cross(OMEGA,r),axis:unit(r),omega:[0,0,0],fuels:vehicle.stages.map(fuelMass),active:0,throttle:0,command:1,autopilot:true,manualPitch:0,manualYaw:0,fairingGone:false,launched:false,stageIgnition:0,orbitHold:0,paused:false,reason:'',events:[],samples:[],path:[],debris:[],lastSample:-99,lastPath:-99,maxQ:0,maxG:0,maxHeat:0,temperature:288,gravityLoss:0,dragLoss:0,engineDV:0,maxAltitude:0,currentThrust:0,currentFlow:0,currentGimbal:0,maxAlpha:0,structuralStress:0};
 emit(f,'飞行计算机接管 · 发射序列开始');return f;
}
export function stopFlight(f:Flight3D,reason:string){if(f.phase==='failed')return;f.phase='failed';f.reason=reason;f.throttle=0;f.currentThrust=0;f.currentFlow=0;emit(f,reason,'warning');sampleFlight(f);}
export function separate3D(f:Flight3D){
 if(f.phase==='countdown'||f.phase==='failed'||f.active>=f.vehicle.stages.length-1)return false;
 if(f.vehicle.stages[f.active].coupling==='fixed'){if(!f.events.some(e=>e.text.includes('固定环阻止分离')))emit(f,'固定环阻止分离 · 空级仍连接在飞行器上','warning');return false;}
 const old=f.active;f.debris.push({stage:old,r:[...f.r],v:[...f.v],axis:[...f.axis],separatedAt:f.time});f.active++;f.stageIgnition=f.time+1.2;f.throttle=0;
 emit(f,`第 ${old+1} 级分离 · 质量减少 ${((dryMass(f.vehicle.stages[old])+f.fuels[old])/1000).toFixed(2)} t`);return true;
}
export function jettisonFairing(f:Flight3D){if(!f.vehicle.fairing||f.fairingGone)return;f.fairingGone=true;emit(f,`整流罩分离 · 载荷已暴露，减重 ${fairingMass(f.vehicle)} kg`);}
function guidance(f:Flight3D):V3{
 const up=unit(f.r),h=altitude3D(f),r=length(f.r),vertical=dot(f.v,up),tangent=unit(sub(f.v,mul(up,vertical))),vt=length(sub(f.v,mul(up,vertical))),g=EARTH.mu/r**2;
 const s=f.vehicle.stages[f.active],perf=enginePerformance(s,atmosphere(h).pressure),maxA=perf.thrust/mass3D(f),goal=f.objective.altitude;
 const north=unit(cross(up,tangent));
 if(!f.autopilot){f.throttle=f.command;return unit(add(add(mul(up,Math.cos(f.manualPitch)),mul(tangent,Math.sin(f.manualPitch))),mul(north,Math.sin(f.manualYaw))));}
 const o=orbitState(f.r,f.v);
 if(f.phase==='countdown'){f.throttle=0;return up;}
 if(f.phase==='orbit'){f.throttle=0;return unit(f.v);}
 if(f.phase==='ascent'){
  const a=f.vehicle.guidance;
  const angle=clamp((h-a.turnStart)/(a.turnEnd-a.turnStart),0,1)*Math.PI*.49;
  f.throttle=Math.min(1,a.maxG*EARTH.g0/maxA);
  // Hold down around maximum dynamic pressure; throttle limits obey the selected engine.
  if(h<35000&&f.maxQ>27000&&.5*atmosphere(h).density*length(sub(f.v,cross(OMEGA,f.r)))**2>27000)f.throttle=Math.min(f.throttle,.58);
  if(o.apo>goal+8000&&h>65000){f.phase='coast';f.throttle=0;emit(f,'目标远地点已建立 · 关机滑行，准备圆化');}
  return unit(add(mul(up,Math.cos(angle)),mul(tangent,Math.sin(angle))));
 }
 if(f.phase==='coast'){
  f.throttle=0;
  // Begin finite-duration insertion early enough to arrest radial fall.
  if(vertical<130||h>goal-12000){f.phase='insertion';emit(f,'轨道圆化点火 · 建立水平速度');}
  return tangent;
 }
 const desiredVr=clamp((goal-h)*.008,-180,180);
 const radialAcceleration=g-vt*vt/r+(desiredVr-vertical)*.04;
 f.throttle=Math.min(1,f.vehicle.guidance.maxG*EARTH.g0/maxA);
 const effectiveA=maxA*Math.max(engineSpec(s).minThrottle,f.throttle);
 const verticalFraction=clamp(radialAcceleration/Math.max(.01,effectiveA),-.78,.94);
 // Taper only in the final metres per second; full thrust otherwise.
 const circular=Math.sqrt(EARTH.mu/r),missing=circular-vt;
 if(missing<35)f.throttle=Math.min(f.throttle,clamp(missing/30,.05,1));
 return unit(add(mul(up,verticalFraction),mul(tangent,Math.sqrt(1-verticalFraction**2))));
}
export function telemetry3D(f:Flight3D):Telemetry{
 const up=unit(f.r),vertical=dot(f.v,up),air=sub(f.v,cross(OMEGA,f.r)),h=altitude3D(f),o=orbitState(f.r,f.v);
 return {time:f.time,altitude:h,speed:length(f.v),airSpeed:length(air),vertical,horizontal:length(sub(f.v,mul(up,vertical))),mass:mass3D(f),fuel:f.fuels.slice(f.active).reduce((a,b)=>a+b,0),q:.5*atmosphere(h).density*dot(air,air),g:f.currentThrust/mass3D(f)/EARTH.g0,heat:f.temperature,apo:Number.isFinite(o.apo)?o.apo:1e12,peri:o.peri};
}
function sampleFlight(f:Flight3D){if(f.time-f.lastSample>=.75||f.phase==='failed'){f.lastSample=f.time;f.samples.push(telemetry3D(f));if(f.samples.length>2400)f.samples.splice(1,1);}if(f.time-f.lastPath>=2){f.lastPath=f.time;f.path.push([...f.r]);if(f.path.length>1200)f.path.splice(1,1);}}
function failedFlight(f:Flight3D){return f.phase==='failed';}
export function stepFlight3D(f:Flight3D,seconds:number){
 if(f.paused||f.phase==='failed'||seconds<=0)return;
 f.ignitions??=f.vehicle.stages.map(()=>0);f.running??=f.vehicle.stages.map(()=>false);
 let remaining=Math.min(seconds,120);
 while(remaining>1e-9&&!failedFlight(f)){
  const dt=Math.min(.025,remaining);remaining-=dt;f.time+=dt;
  if(f.time<0){const angle=-EARTH.omega*dt,x=f.r[0]*Math.cos(angle)-f.r[1]*Math.sin(angle),y=f.r[0]*Math.sin(angle)+f.r[1]*Math.cos(angle);f.r=[x,y,f.r[2]];f.v=cross(OMEGA,f.r);f.axis=unit(f.r);if(f.time>=-2&&f.time-dt< -2)emit(f,'主发动机预点火 · 供给系统增压');sampleFlight(f);continue;}
  if(f.phase==='countdown'){f.phase='ascent';f.stageIgnition=f.time;emit(f,'T−0 · 主发动机点火');}
  if(f.fuels[f.active]<.01&&f.vehicle.guidance.autoStage&&f.active<f.vehicle.stages.length-1)separate3D(f);
  const desired=guidance(f),s=f.vehicle.stages[f.active],e=engineSpec(s),h=altitude3D(f),atm=atmosphere(h),mBefore=mass3D(f);
  let throttle=clamp(f.throttle,0,1);
  if(throttle>0)throttle=Math.max(e.minThrottle,throttle);
  const ignition=clamp((f.time-f.stageIgnition)/1.8,0,1);
  let available=enginePerformance(s,atm.pressure),thrust=available.thrust*throttle*ignition;
  const firing=thrust>1000&&s.valve&&e.fuel===s.fuel&&f.fuels[f.active]>.01;
  if(firing&&!f.running[f.active]){f.ignitions[f.active]++;if(f.ignitions[f.active]>e.restarts){stopFlight(f,`第 ${f.active+1} 级发动机超过模型点火次数限制（${e.restarts} 次）。更换发动机或调整滑行与关机程序。`);break;}emit(f,`第 ${f.active+1} 级发动机点火 / ${f.ignitions[f.active]} 次`);}
  f.running[f.active]=firing;
  if(!s.valve||e.fuel!==s.fuel||f.fuels[f.active]<=0)thrust=0;
  if(f.time<.05){const findings=inspectVehicle(f.vehicle,f.objective);const fatal=findings.find(x=>x.level==='error'&&(x.title.includes('安装空间')||x.title.includes('接口口径')))??findings.find(x=>x.level==='error');if(fatal){emit(f,`${fatal.title} · 允许试验，关注实际后果`,'warning');if(fatal.title.includes('安装空间')||fatal.title.includes('接口口径')){stopFlight(f,`${fatal.title}。${fatal.detail}`);break;}}}
  const wanted=thrust/(available.isp*EARTH.g0)*dt,used=Math.min(f.fuels[f.active],wanted);
  if(wanted>0)thrust*=used/wanted;
  f.fuels[f.active]=Math.max(0,f.fuels[f.active]-used);f.currentThrust=thrust;f.currentFlow=used/dt;f.throttle=throttle;
  const mass=mass3D(f)+used/2,up=unit(f.r),air=sub(f.v,cross(OMEGA,f.r)),speed=length(air),q=.5*atm.density*speed**2;
  const alpha=speed>30?Math.acos(clamp(dot(unit(air),f.axis),-1,1)):0;
  const height=vehicleHeight(f.vehicle,f.active),inertia=mass*height*height/12;
  const torqueLimit=Math.max(1000,thrust*Math.sin(e.gimbal*Math.PI/180)*height*.38);
  const error=cross(f.axis,desired),requested=sub(mul(error,inertia*.9),mul(f.omega,inertia*1.8));
  const control=mul(unit(requested),Math.min(length(requested),torqueLimit));
  const aeroAxis=cross(f.axis,unit(air)),aeroStrength=q*Math.PI*(s.diameter/2)**2*height*(s.fins?.045:-.006);
  const aero=mul(aeroAxis,aeroStrength);
  f.omega=add(f.omega,mul(add(control,aero),dt/Math.max(1,inertia)));
  if(length(f.omega)>.6)f.omega=mul(unit(f.omega),.6);
  f.axis=unit(add(f.axis,mul(cross(f.omega,f.axis),dt)));
  const gimbal=Math.min(e.gimbal*Math.PI/180,Math.acos(clamp(dot(f.axis,desired),-1,1)));
  const steer=unit(sub(desired,mul(f.axis,dot(desired,f.axis))));
  const thrustDir=unit(add(mul(f.axis,Math.cos(gimbal)),mul(steer,Math.sin(gimbal))));f.currentGimbal=gimbal*180/Math.PI;
  const mach=speed/atm.sound,cd=(f.vehicle.fairing&&!f.fairingGone?.2:.38)+.18*Math.exp(-(((mach-1)/.6)**2))+Math.sin(alpha)**2*1.4;
  const aeroDiameter=f.vehicle.fairing&&!f.fairingGone?Math.max(s.diameter,fairingPart(f.vehicle).diameter):s.diameter;
  const area=Math.PI*(aeroDiameter/2)**2,drag=q*area*cd;
  let acceleration=add(mul(f.r,-EARTH.mu/length(f.r)**3),mul(thrustDir,thrust/mass));
  if(speed>.01)acceleration=sub(acceleration,mul(unit(air),Math.min(drag/mass,speed/dt)));
  const groundWeight=EARTH.mu/length(f.r)**2;
  if(!f.launched&&thrust/mass>groundWeight*1.005){f.launched=true;emit(f,'离台 · 地面设备释放，飞行器进入自由飞行');}
  if(!f.launched){f.r=mul(unit(f.r),EARTH.radius);f.r=add(f.r,mul(cross(OMEGA,f.r),dt));f.r=mul(unit(f.r),EARTH.radius);f.v=cross(OMEGA,f.r);f.axis=unit(f.r);f.omega=[0,0,0];}
  else {f.v=add(f.v,mul(acceleration,dt));f.r=add(f.r,mul(f.v,dt));}
  const alt=altitude3D(f);f.maxAltitude=Math.max(f.maxAltitude,alt);f.maxQ=Math.max(f.maxQ,q);f.maxG=Math.max(f.maxG,thrust/mass/EARTH.g0);f.maxAlpha=Math.max(f.maxAlpha,alpha*180/Math.PI);
  const heat=1.83e-4*Math.sqrt(atm.density/Math.max(.4,s.diameter/2))*speed**3;
  f.maxHeat=Math.max(f.maxHeat,heat);f.temperature=Math.max(250,f.temperature+(heat/(f.fairingGone?50000:120000)-(f.temperature-250)*.006)*dt);
  f.gravityLoss+=Math.max(0,dot(unit(f.v),up))*groundWeight*dt*(f.launched?1:0);f.dragLoss+=drag/mass*dt;
  if(used>0)f.engineDV+=available.isp*EARTH.g0*Math.log(mBefore/mass3D(f));
  f.structuralStress=q*(1+Math.sin(alpha)*3)/(65000*MATERIALS[s.material].strength);
  if(alt>105000&&f.vehicle.fairing&&!f.fairingGone&&f.autopilot)jettisonFairing(f);
  for(const debris of f.debris){const gd=mul(debris.r,-EARTH.mu/length(debris.r)**3);debris.v=add(debris.v,mul(gd,dt));debris.r=add(debris.r,mul(debris.v,dt));}
  if(!f.launched&&f.time>15){stopFlight(f,!s.valve?'供给阀关闭：发动机无法得到推进剂。':e.fuel!==s.fuel?'推进剂不兼容：燃料与发动机要求不匹配。':'无法离台：实际海平面推重比不足。');break;}
  if(thrust/mass/EARTH.g0>8*MATERIALS[s.material].strength){stopFlight(f,'轴向加速度超过结构承载能力。减少发动机数量，或提高结构强度。');break;}
  if(f.structuralStress>1.1){stopFlight(f,'气动结构载荷超限。调整转弯程序、降低低空推力或选择更强的材料。');break;}
  if(f.temperature>1100){stopFlight(f,'热防护失效。检查整流罩、迎角与大气内飞行速度。');break;}
  if(f.launched&&alt< -2){stopFlight(f,'飞行器撞击地表。检查推力、级间供给与姿态程序。');break;}
  if(!s.valve&&f.time>f.stageIgnition+5&&f.launched){stopFlight(f,'供给中断：当前级阀门关闭，发动机熄火。');break;}
  if(e.fuel!==s.fuel&&f.time>f.stageIgnition+5&&f.launched){stopFlight(f,'当前级推进剂不匹配，发动机无法点火。');break;}
  const o=orbitState(f.r,f.v);
  if(o.peri>=f.objective.altitude-20000&&o.apo<=f.objective.altitude+60000&&o.eccentricity<.012&&f.vehicle.payload>=f.objective.payload&&alt>140000){
   if(f.phase!=='orbit'){f.phase='orbit';f.throttle=0;emit(f,'发动机关机 · 进入无推力轨道验证','success');}
   f.orbitHold+=dt;
   if(f.orbitHold>=8&&!f.reason){f.reason='轨道已确认：载荷完整，近地点与偏心率满足任务要求。';emit(f,f.reason,'success');}
  }else if(f.phase==='orbit'&&!f.reason){f.phase='insertion';f.orbitHold=0;emit(f,'轨道验证中断，继续圆化','warning');}
  if(f.time>1500&&f.phase!=='orbit'){stopFlight(f,'未在飞行窗口内建立目标轨道。用遥测检查重力损失、分级与机动余量。');break;}
  if(f.active===f.vehicle.stages.length-1&&f.fuels[f.active]<.01&&f.phase!=='orbit'&&dot(f.v,up)< -50){stopFlight(f,'推进剂耗尽，轨道近地点仍在大气内。优化上面级质量比或增加有效机动预算。');break;}
  sampleFlight(f);
 }
}
export function simulate3D(v:Vehicle,o:Objective,maxSeconds=1550){const f=createFlight3D(v,o);for(let i=0;i<maxSeconds*2&&!f.reason;i++)stepFlight3D(f,.5);return f;}
export function missionGrade(f:Flight3D){const success=f.phase==='orbit'&&f.orbitHold>=8;return {success,stars:success?1+Number(vehicleCost(f.vehicle)<=f.objective.budget)+Number(deltaV3D(f)>=300&&f.maxG<=4):0,cost:vehicleCost(f.vehicle),remaining:deltaV3D(f)};}

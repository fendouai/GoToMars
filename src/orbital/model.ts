import { FAIRING_PARTS, assembledTanks, tankPart } from './parts';
import { REAL_ENGINES, type EngineProvenance } from './engine-catalog';
export type V3=[number,number,number];
export const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const mul=(a:V3,s:number):V3=>[a[0]*s,a[1]*s,a[2]*s];
export const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length=(a:V3)=>Math.hypot(...a);
export const unit=(a:V3):V3=>length(a)>1e-12?mul(a,1/length(a)):[0,1,0];
export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export const EARTH={radius:6371000,mu:3.986004418e14,omega:7.2921159e-5,atmosphere:140000,g0:9.80665};
export const OMEGA:V3=[0,0,-EARTH.omega];
export type Propellant='kerolox'|'methalox'|'hydrolox';
export const FUELS:Record<Propellant,{name:string;density:number;price:number;oxidizer:number;color:string}>={
 kerolox:{name:'液氧 / 煤油',density:1020,price:.24,oxidizer:2.56,color:'#f0a56b'},
 methalox:{name:'液氧 / 甲烷',density:820,price:.32,oxidizer:3.6,color:'#79cccf'},
 hydrolox:{name:'液氧 / 液氢',density:350,price:.88,oxidizer:5.5,color:'#aecbff'}
};
export interface EngineSpec {provenance?:EngineProvenance;id:string;name:string;role:string;fuel:Propellant;sea:number;vac:number;ispSea:number;ispVac:number;mass:number;cost:number;gimbal:number;minThrottle:number;restarts:number;diameter:number;description:string;}
export const ENGINES3D:EngineSpec[]=[...REAL_ENGINES,
 {id:'m760',name:'MERIDIAN M-760',role:'海平面运载',fuel:'kerolox',sea:760000,vac:835000,ispSea:282,ispVac:311,mass:520,cost:14500,gimbal:6,minThrottle:.35,restarts:3,diameter:1.05,description:'高推重比煤油发动机。适合密集组合，喷管在海平面效率较高。'},
 {id:'v450',name:'MERIDIAN V-450',role:'真空上面级',fuel:'kerolox',sea:180000,vac:450000,ispSea:240,ispVac:353,mass:620,cost:19500,gimbal:5,minThrottle:.12,restarts:8,diameter:1.75,description:'大膨胀比喷管。真空效率高，在地面推力显著下降。'},
 {id:'c1100',name:'CINDER C-1100',role:'甲烷主发动机',fuel:'methalox',sea:1100000,vac:1240000,ispSea:322,ispVac:365,mass:950,cost:27000,gimbal:8,minThrottle:.25,restarts:6,diameter:1.4,description:'更高效率的甲烷发动机。储箱更大，发动机更重，控制范围更宽。'},
 {id:'h220',name:'AURORA H-220',role:'氢氧真空推进',fuel:'hydrolox',sea:65000,vac:220000,ispSea:310,ispVac:450,mass:460,cost:33000,gimbal:4,minThrottle:.2,restarts:4,diameter:1.8,description:'高比冲、低推力。液氢密度低，需要大体积储箱与额外隔热。'}
];
export type MaterialId='aluminum'|'composite'|'steel';
export const MATERIALS:Record<MaterialId,{name:string;mass:number;price:number;strength:number;description:string}>={aluminum:{name:'铝锂合金',mass:1,price:1,strength:1,description:'重量、成本和承载能力较均衡。'},composite:{name:'复合材料',mass:.73,price:1.8,strength:.83,description:'更轻，但成本高，对载荷和热环境更敏感。'},steel:{name:'不锈钢',mass:1.35,price:.73,strength:1.5,description:'更重、便宜，结构与热耐受更好。'}};
export interface Stage3D {tankModules?:string[];coupling?:'separator'|'fixed';adapter?:boolean;id:string;engine:string;engines:number;diameter:number;tankLength:number;fill:number;fuel:Propellant;material:MaterialId;valve:boolean;fins:boolean;}
export interface Vehicle {fairingModel?:string;name:string;payload:number;fairing:boolean;battery:number;stages:Stage3D[];guidance:{turnStart:number;turnEnd:number;maxG:number;autoStage:boolean;};}
export interface Objective {id:string;name:string;client:string;payload:number;altitude:number;budget:number;description:string;}
export const OBJECTIVES:Objective[]=[
 {id:'first-light',name:'第一缕轨道曙光',client:'深空计划 · 首飞验证',payload:1500,altitude:200000,budget:220000,description:'将 1.5 t 验证载荷送入 180–260 km 近地轨道。建立连续、稳定、可复现的轨道能力。'},
 {id:'relay',name:'轨道上的第一座桥',client:'地球通信网',payload:4500,altitude:220000,budget:245000,description:'交付 4.5 t 通信卫星，近地点至少 200 km。新增载荷会改变推重比和各级机动预算。'},
 {id:'heavy',name:'为下一次远行铺路',client:'空间站先遣计划',payload:10000,altitude:240000,budget:325000,description:'将 10 t 轨道舱送入至少 220 km 的稳定轨道。重新选择推进、材料和级间质量分配。'},
 {id:'economy',name:'每一公斤都算数',client:'商业发射评审',payload:2500,altitude:200000,budget:155000,description:'将 2.5 t 载荷送入轨道，并将制造费用控制在 155,000 以内。预算与余量会影响工程评级。'}
];
let sequence=0;
export const newStage=(upper=false):Stage3D=>({coupling:'separator',adapter:true,id:`stage-${Date.now()}-${sequence++}`,engine:upper?'merlin-vac':'merlin-1d',engines:upper?1:5,diameter:upper?2.5:3.7,tankModules:upper?['k25m']:['k37l','k37m'],tankLength:upper?8:20,fill:upper?.9:.95,fuel:'kerolox',material:'aluminum',valve:true,fins:!upper});
export function defaultVehicle():Vehicle{return {fairingModel:'f37',name:'MERIDIAN / 曙光一号',payload:1500,fairing:true,battery:2,stages:[newStage(),newStage(true)],guidance:{turnStart:750,turnEnd:110000,maxG:3.5,autoStage:true}};}
export const engineSpec=(s:Stage3D)=>ENGINES3D.find(e=>e.id===s.engine)!;
export function engineMountLayout(s:Stage3D){
 const e=engineSpec(s),n=s.engines,centre=n===5||n===7||n===9,ring=n-Number(centre);
 if(n===1)return {diameter:e.diameter,positions:[[0,0]] as [number,number][]};
 const radius=Math.max(centre?e.diameter:0,e.diameter/(2*Math.sin(Math.PI/ring)))*1.04;
 const positions:[number,number][]=centre?[[0,0]]:[];
 for(let i=0;i<ring;i++)positions.push([Math.cos(i/ring*Math.PI*2)*radius,Math.sin(i/ring*Math.PI*2)*radius]);
 return {diameter:2*radius+e.diameter,positions};
}
export function tankVolume(s:Stage3D){const parts=assembledTanks(s);if(parts.length)return parts.reduce((sum,p)=>{const r=p.diameter/2;return sum+Math.PI*r*r*p.length+4/3*Math.PI*r*r*r*.35;},0);const r=s.diameter/2;return Math.PI*r*r*s.tankLength+4/3*Math.PI*r*r*r*.35;}
export const fuelCapacity=(s:Stage3D)=>tankVolume(s)*FUELS[s.fuel].density;
export const fuelMass=(s:Stage3D)=>fuelCapacity(s)*s.fill;
export function dryMass(s:Stage3D){const r=s.diameter/2,area=2*Math.PI*r*s.tankLength+4*Math.PI*r*r*.75;return (area*15.5+fuelCapacity(s)*.028)*MATERIALS[s.material].mass+(s.fuel==='hydrolox'?area*4:0)+(engineSpec(s).mass+(s.engine.startsWith('rutherford')?80:0))*s.engines+450+(s.fins?160:0)+Math.max(0,assembledTanks(s).length-1)*85+(s.coupling==='separator'?85:0)+(s.adapter?60:0);}
export const stageHeight=(s:Stage3D)=>s.tankLength+s.diameter*.35*Math.max(1,assembledTanks(s).length)+2.5;
export const fairingPart=(v:Vehicle)=>FAIRING_PARTS.find(p=>p.id===v.fairingModel)??FAIRING_PARTS[1];
export const fairingMass=(v:Vehicle)=>v.fairing?fairingPart(v).mass:0;
export function payloadMass(v:Vehicle,fairingGone=false){return v.payload+450+v.battery*65+(v.fairing&&!fairingGone?fairingMass(v):0);}
export function vehicleMass(v:Vehicle,active=0,fuels=v.stages.map(fuelMass),fairingGone=false){return payloadMass(v,fairingGone)+v.stages.slice(active).reduce((sum,s,j)=>sum+dryMass(s)+fuels[active+j],0);}
export const vehicleHeight=(v:Vehicle,active=0)=>v.stages.slice(active).reduce((sum,s)=>sum+stageHeight(s),0)+(v.fairing?fairingPart(v).height:5);
export function vehicleCost(v:Vehicle){return Math.round(7000+v.payload*3+v.battery*500+(v.fairing?fairingPart(v).cost:0)+v.stages.reduce((sum,s)=>sum+engineSpec(s).cost*s.engines+fuelMass(s)*FUELS[s.fuel].price+(dryMass(s)-engineSpec(s).mass*s.engines)*MATERIALS[s.material].price*3,0));}
export function atmosphere(h:number){
 if(h>=EARTH.atmosphere)return {density:0,pressure:0,sound:295};
 const height=Math.max(0,h);let temperature:number,pressure:number;
 if(height<11000){temperature=288.15-.0065*height;pressure=101325*(temperature/288.15)**5.25588;}
 else if(height<20000){temperature=216.65;pressure=22632*Math.exp(-(height-11000)/6341.62);}
 else if(height<32000){temperature=216.65+.001*(height-20000);pressure=5474.9*(temperature/216.65)**-34.1632;}
 else {temperature=228.65;pressure=868.02*Math.exp(-(height-32000)/6800);}
 return {density:pressure/(287.05*temperature),pressure,sound:Math.sqrt(1.4*287.05*temperature)};
}
export function enginePerformance(s:Stage3D,pressure:number){const e=engineSpec(s),ratio=clamp(pressure/101325,0,1);return {thrust:(e.vac+(e.sea-e.vac)*ratio)*s.engines,isp:e.ispVac+(e.ispSea-e.ispVac)*ratio};}
export function analyzeVehicle(v:Vehicle){
 const stages=v.stages.map((s,i)=>{const mass=vehicleMass(v,i),fuel=fuelMass(s),engine=engineSpec(s);return {wet:mass,dry:dryMass(s),fuel,volume:tankVolume(s),height:stageHeight(s),dv:engine.ispVac*EARTH.g0*Math.log(mass/(mass-fuel)),twr:engine.sea*s.engines/(mass*EARTH.g0),vacTwr:engine.vac*s.engines/(mass*EARTH.g0),burn: fuel/(engine.vac*s.engines/(engine.ispVac*EARTH.g0))};});
 const mass=vehicleMass(v),height=vehicleHeight(v),cost=vehicleCost(v);
 let weighted=0,offset=0;v.stages.forEach((s,i)=>{weighted+=(dryMass(s)+fuelMass(s))*(offset+stageHeight(s)/2);offset+=stageHeight(s);});weighted+=payloadMass(v)*(offset+3);
 const com=weighted/mass,inertia=mass*(height*height/12+v.stages[0].diameter**2/16);
 return {stages,mass,height,cost,dv:stages.reduce((sum,s)=>sum+s.dv,0),com,inertia};
}
export interface Finding {level:'error'|'warning'|'ok';title:string;detail:string;stage?:number;}
export function inspectVehicle(v:Vehicle,o:Objective):Finding[]{
 const a=analyzeVehicle(v),f:Finding[]=[];
 v.stages.forEach((s,i)=>{
  if(engineSpec(s).fuel!==s.fuel)f.push({level:'error',title:`第 ${i+1} 级推进剂不匹配`,detail:`${engineSpec(s).name} 需要 ${FUELS[engineSpec(s).fuel].name}；当前储箱无法供给正确混合物。`,stage:i});
  if(i<v.stages.length-1&&s.coupling==='fixed')f.push({level:'error',title:`第 ${i+1} 级未安装分离器`,detail:'固定连接环不会释放空级。请换装级间分离器，或作为单级整体飞行。',stage:i});
  if(i<v.stages.length-1&&!s.adapter&&Math.abs(s.diameter-v.stages[i+1].diameter)>.05)f.push({level:'error',title:`第 ${i+1} 级接口口径不匹配`,detail:'异径级间需要安装锥形适配器。',stage:i});
  if(!s.valve)f.push({level:'error',title:`第 ${i+1} 级供给阀关闭`,detail:'发动机与储箱之间没有可用推进剂流路。',stage:i});
  const packing=engineMountLayout(s).diameter;
  if(packing>s.diameter*1.15)f.push({level:'error',title:`第 ${i+1} 级发动机安装空间不足`,detail:`${s.engines} 台发动机需要约 ${packing.toFixed(1)} m 安装直径。扩大箱径或减少发动机。`,stage:i});
 });
 if(a.stages[0].twr<1.15)f.push({level:'warning',title:'离台推重比不足或偏低',detail:`海平面 TWR ${a.stages[0].twr.toFixed(2)}；过低会增加重力损失，低于 1 无法离台。`,stage:0});
 if(a.dv<9400)f.push({level:'warning',title:'机动预算偏少',detail:`理论真空 Δv ${(a.dv/1000).toFixed(2)} km/s；真实地球发射还要支付重力与气动损失。`});
 if(v.payload<o.payload)f.push({level:'error',title:'载荷不足',detail:`任务需要 ${o.payload.toLocaleString()} kg，当前只有 ${v.payload.toLocaleString()} kg。`});
 if(a.cost>o.budget)f.push({level:'warning',title:'超出任务预算',detail:'可以试飞，但无法获得成本星。尝试优化材料、发动机数量和箱体尺寸。'});
 if(v.stages.length===1)f.push({level:'warning',title:'单级方案携带全部干重',detail:'地球入轨对质量比要求高。增加高效上面级可能更合适。'});
 if(!v.fairing)f.push({level:'warning',title:'载荷未安装整流罩',detail:'迎风阻力和载荷热输入增加，但可以节省质量与成本。'});
 if(!f.some(x=>x.level==='error'))f.push({level:'ok',title:'推进剂与结构接口检查通过',detail:'静态检查不等于飞行成功。请继续验证轨道预算和飞行程序。'});
 return f;
}
export function validVehicle(v:unknown):v is Vehicle{
 if(!v||typeof v!=='object')return false;const d=v as Vehicle;
 return (d.fairingModel===undefined||FAIRING_PARTS.some(p=>p.id===d.fairingModel))&&typeof d.name==='string'&&d.name.length<=80&&Number.isFinite(d.payload)&&d.payload>=100&&d.payload<=20000&&typeof d.fairing==='boolean'&&Number.isInteger(d.battery)&&d.battery>=1&&d.battery<=5&&Array.isArray(d.stages)&&d.stages.length>=1&&d.stages.length<=3&&new Set(d.stages.map(s=>s?.id)).size===d.stages.length&&d.stages.every(s=>s&&(s.coupling===undefined||['separator','fixed'].includes(s.coupling))&&(s.adapter===undefined||typeof s.adapter==='boolean')&&(s.tankModules===undefined||(Array.isArray(s.tankModules)&&s.tankModules.length>=1&&s.tankModules.length<=5&&s.tankModules.every(id=>!!tankPart(id))&&s.tankModules.every(id=>Math.abs(tankPart(id)!.diameter-s.diameter)<.01&&tankPart(id)!.fuel===s.fuel)&&Math.abs(s.tankModules.reduce((sum,id)=>sum+tankPart(id)!.length,0)-s.tankLength)<.01))&&typeof s.id==='string'&&s.id.length<=100&&ENGINES3D.some(e=>e.id===s.engine)&&Number.isInteger(s.engines)&&s.engines>=1&&s.engines<=9&&Number.isFinite(s.diameter)&&s.diameter>=1&&s.diameter<=6&&Number.isFinite(s.tankLength)&&s.tankLength>=1&&s.tankLength<=25&&Number.isFinite(s.fill)&&s.fill>=.1&&s.fill<=1&&Object.hasOwn(FUELS,s.fuel)&&Object.hasOwn(MATERIALS,s.material)&&typeof s.valve==='boolean'&&typeof s.fins==='boolean')&&!!d.guidance&&Number.isFinite(d.guidance.turnStart)&&d.guidance.turnStart>=200&&d.guidance.turnStart<=5000&&Number.isFinite(d.guidance.turnEnd)&&d.guidance.turnEnd>=35000&&d.guidance.turnEnd<=110000&&Number.isFinite(d.guidance.maxG)&&d.guidance.maxG>=2&&d.guidance.maxG<=5&&typeof d.guidance.autoStage==='boolean';
}

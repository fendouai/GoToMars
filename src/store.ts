import { contractById, missionForContract } from './contracts';
import { evaluate, type ContractRecord, type Evaluation } from './engineering';
import { MISSIONS, presetFor, type Design, type Mission } from './data';
import { clone, costOf, type Flight } from './physics';
export interface History { id:string;mission:string;name:string;success:boolean;reason:string;time:number;maxAltitude:number;cost:number;date:string;contractId?:string;design?:Design;evaluation?:Evaluation;reward?:number;events:Flight['events'];samples:Flight['samples']; }
export interface SavedRun {flight:Flight;formal:boolean;cost:number;mode:string;}
export interface Save {contracts:Record<string,ContractRecord>;ratings:Record<string,number>;selectedContract:string|null;run?:SavedRun;version:1;funds:number;tech:number;completed:string[];selected:string;design:Design;blueprints:{id:string;name:string;design:Design;date:string}[];history:History[];muted:boolean;helpSeen:boolean;}
export const SAVE_KEY='go-to-mars-v1';
export function freshSave():Save{return {contracts:{},ratings:{},selectedContract:null,version:1,funds:40000,tech:0,completed:[],selected:'sounding',design:presetFor(MISSIONS[0]),blueprints:[],history:[],muted:true,helpSeen:false};}
export function validateDesign(d:unknown):d is Design{
  if(!d||typeof d!=='object')return false; const v=d as Design;
  if(v.program&&(!Number.isFinite(v.program.turnStart)||v.program.turnStart<100||v.program.turnStart>5000||!Number.isFinite(v.program.turnEnd)||v.program.turnEnd<15000||v.program.turnEnd>60000||!Number.isFinite(v.program.maxAccel)||v.program.maxAccel<15||v.program.maxAccel>60||typeof v.program.autoStage!=='boolean'||typeof v.program.autoChute!=='boolean'))return false;
  return typeof v.name==='string'&&v.name.length<=100&&Array.isArray(v.stages)&&v.stages.length>=1&&v.stages.length<=4&&v.stages.every(s=>s&&(s.count===undefined||(Number.isInteger(s.count)&&s.count>=1&&s.count<=5))&&(s.nozzle===undefined||['balanced','sea','vacuum'].includes(s.nozzle))&&['spark','atlas','vacuum','lander','nova'].includes(s.engine)&&Number.isFinite(s.fuel)&&s.fuel>=100&&s.fuel<=40000&&Number.isFinite(s.diameter)&&s.diameter>=1&&s.diameter<=4&&Number.isFinite(s.structure)&&s.structure>=.7&&s.structure<=1.5)&&Number.isFinite(v.payload)&&v.payload>=50&&v.payload<=3000&&Number.isInteger(v.battery)&&v.battery>=1&&v.battery<=5&&['fins','fairing','shield','parachute','legs','solar'].every(k=>typeof v[k as keyof Design]==='boolean');
}
function finite(v:unknown){return typeof v==='number'&&Number.isFinite(v);}
function validEvents(events:unknown):boolean{return Array.isArray(events)&&events.length<=10000&&events.every(e=>e&&finite(e.t)&&typeof e.text==='string'&&['info','warn','success'].includes(e.level));}
function validSamples(samples:unknown):boolean{return Array.isArray(samples)&&samples.length<=2400&&samples.every(s=>s&&['t','h','v','fuel','q','temp'].every(k=>finite(s[k])));}
function validRun(r:SavedRun):boolean{
 if(!r||typeof r.formal!=='boolean'||!finite(r.cost)||r.cost<0||!['campaign','sandbox','challenge'].includes(r.mode))return false;
 const f=r.flight;if(!f||!validateDesign(f.design)||!f.mission||!MISSIONS.some(m=>m.id===f.mission.id)||!['earth','moon','mars'].includes(f.body)||!['ascent','transfer','cruise','capture','descent','return-burn','reentry'].includes(f.phase))return false;
 return ['time','localTime','x','y','vx','vy','angle','commandAngle','angularRate','throttle','temperature','electric','maxAltitude','maxSpeed','maxQ','lastSample','burnRemaining','cruiseRemaining','window','initialMass'].every(k=>finite(f[k as keyof Flight]))&&Number.isInteger(f.active)&&f.active>=0&&f.active<f.design.stages.length&&Array.isArray(f.fuels)&&f.fuels.length===f.design.stages.length&&f.fuels.every((v,i)=>finite(v)&&v>=0&&v<=f.design.stages[i].fuel)&&validEvents(f.events)&&validSamples(f.samples)&&['autopilot','fairingGone','capsule','chute','success','paused','dataSent','circularizing'].every(k=>typeof f[k as keyof Flight]==='boolean');
}
export function parseSave(raw:string):Save{
 const s=JSON.parse(raw) as Save;
 if(!s||s.version!==1||!validateDesign(s.design)||!finite(s.funds)||s.funds<0||!Number.isInteger(s.tech)||s.tech<0||s.tech>3||!Array.isArray(s.completed)||s.completed.some(id=>!MISSIONS.some(m=>m.id===id))||new Set(s.completed).size!==s.completed.length||!MISSIONS.some(m=>m.id===s.selected)||!Array.isArray(s.blueprints)||s.blueprints.some(b=>!b||typeof b.id!=='string'||typeof b.name!=='string'||typeof b.date!=='string'||!validateDesign(b.design))||!Array.isArray(s.history)||s.history.some(h=>!h||typeof h.id!=='string'||typeof h.name!=='string'||typeof h.reason!=='string'||typeof h.success!=='boolean'||typeof h.date!=='string'||!Number.isFinite(Date.parse(h.date))||!finite(h.time)||!finite(h.maxAltitude)||!finite(h.cost)||!MISSIONS.some(m=>m.id===h.mission)||!validEvents(h.events)||!validSamples(h.samples))||(s.run!==undefined&&!validRun(s.run)))throw new Error('存档格式无效或版本不兼容');
 if(s.contracts!==undefined&&(!s.contracts||typeof s.contracts!=='object'||Array.isArray(s.contracts)||Object.entries(s.contracts).some(([id,r])=>!contractById(id)||!r||!Number.isInteger(r.stars)||r.stars<0||r.stars>3||!finite(r.score)||!finite(r.bestCost)||!Number.isInteger(r.attempts)||r.attempts<0)))throw new Error('合同记录无效');
 if(s.ratings!==undefined&&(!s.ratings||typeof s.ratings!=='object'||Array.isArray(s.ratings)||Object.entries(s.ratings).some(([id,n])=>!MISSIONS.some(m=>m.id===id)||!Number.isInteger(n)||n<0||n>3)))throw new Error('星级记录无效');
 if(s.selectedContract!==undefined&&s.selectedContract!==null&&!contractById(s.selectedContract))throw new Error('合同无效');
 if(s.history.some(h=>(h.design!==undefined&&!validateDesign(h.design))||(h.contractId!==undefined&&!contractById(h.contractId))||(h.evaluation!==undefined&&(!h.evaluation||!Array.isArray(h.evaluation.checks)||h.evaluation.checks.some(c=>!c||typeof c.name!=='string'||typeof c.detail!=='string'||typeof c.pass!=='boolean')||!Number.isInteger(h.evaluation.stars)||h.evaluation.stars<0||h.evaluation.stars>3))))throw new Error('复盘记录无效');
 if(s.run){const c=contractById(s.run.flight.mission.contractId);if(s.run.flight.mission.contractId&&!c)throw new Error('飞行合同无效');const original=MISSIONS.find(m=>m.id===s.run!.flight.mission.id)!;s.run.flight.mission=c?missionForContract(c):clone(original);if(s.run.mode==='challenge'&&!c)s.run.flight.mission.payload=Math.ceil(original.payload*1.25);}
 return {...freshSave(),...s,blueprints:s.blueprints.slice(0,30),history:s.history.slice(0,30)};
}
export function loadSave():Save{try {const raw=localStorage.getItem(SAVE_KEY);return raw?parseSave(raw):freshSave();}catch{return freshSave();}}
export function persist(s:Save){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function unlocked(s:Save,id:string){const m=MISSIONS.find(m=>m.id===id);return !!m&&m.requires.every(r=>s.completed.includes(r));}
export function repeatReward(m:Mission){return Math.min(m.reward,Math.max(Math.round(m.reward*.35),Math.ceil(costOf(presetFor(m),m)*1.15)));}
export function settle(s:Save,f:Flight,formal:boolean,cost:number):Save{
 const n=clone(s);delete n.run;const evaluation=evaluate(f),contract=contractById(f.mission.contractId);let reward=0;
 if(formal&&evaluation.accepted){
  if(contract){
   const previous=n.contracts[contract.id];
   reward=previous?.stars?Math.ceil(contract.budget*1.02):contract.reward+evaluation.stars*500;
   n.contracts[contract.id]={stars:Math.max(previous?.stars??0,evaluation.stars),score:Math.max(previous?.score??0,evaluation.score),bestCost:Math.min(previous?.stars?previous.bestCost:Infinity,cost),attempts:(previous?.attempts??0)+1};
  }else{
   const first=!n.completed.includes(f.mission.id);if(first)n.completed.push(f.mission.id);
   reward=first?f.mission.reward:repeatReward(f.mission);n.ratings[f.mission.id]=Math.max(n.ratings[f.mission.id]??0,evaluation.stars);
  }
  n.funds+=reward;
 }else if(formal&&contract){const p=n.contracts[contract.id];n.contracts[contract.id]={stars:p?.stars??0,score:p?.score??0,bestCost:p?.bestCost??0,attempts:(p?.attempts??0)+1};}
 n.history.unshift({id:crypto.randomUUID(),mission:f.mission.id,contractId:contract?.id,name:f.design.name,design:clone(f.design),evaluation,success:evaluation.accepted,reason:evaluation.accepted?f.reason:f.success?'飞行成功，但验收未通过：'+evaluation.checks.filter(c=>!c.pass).map(c=>c.name+' '+c.detail).join('；'):f.reason,time:f.time,maxAltitude:f.maxAltitude,cost:formal?cost:0,reward,date:new Date().toISOString(),events:clone(f.events),samples:clone(f.samples)});n.history=n.history.slice(0,30);return n;
}

import { MISSIONS, presetFor, type Design, type Mission } from './data';
import { CONTRACTS, contractById } from './contracts';
import { analyze, clone, costOf, remainingDV, simulate, type Flight } from './physics';
export interface Check {name:string;detail:string;pass:boolean;}
export interface Evaluation {accepted:boolean;stars:number;score:number;checks:Check[];efficiency:number;reserve:number;}
export interface ContractRecord {stars:number;score:number;bestCost:number;attempts:number;}
export interface Experiment {id:string;name:string;design:Design;mission:Mission;cost:number;dv:number;success:boolean;reason:string;maxAltitude:number;maxQ:number;peakTemp:number;reserve:number;stars:number;checks:Check[];}
export function staticChecks(d:Design,m:Mission):Check[]{
 const c=contractById(m.contractId);if(!c)return [];
 return [
 {name:'预算',detail:`${costOf(d,m).toLocaleString()} / ${c.budget.toLocaleString()} 额度`,pass:costOf(d,m)<=c.budget},
 {name:'交付载荷',detail:`${d.payload} / ${c.payload} kg`,pass:d.payload>=c.payload},
 ...(c.maxMass?[{name:'场地限重',detail:`${(analyze(d).mass/1000).toFixed(2)} / ${c.maxMass/1000} t`,pass:analyze(d).mass<=c.maxMass}]:[]),
 ...(c.maxStages?[{name:'级数限制',detail:`${d.stages.length} / ${c.maxStages} 级`,pass:d.stages.length<=c.maxStages}]:[])
 ];
}
export function evaluate(f:Flight):Evaluation {
 const c=contractById(f.mission.contractId),cost=costOf(f.design,f.mission),baseline=c?.budget??costOf(presetFor(MISSIONS.find(m=>m.id===f.mission.id)!),f.mission),reserve=remainingDV(f);
 const checks:Check[]=[{name:'飞行任务',detail:f.success?'任务目标已完成':f.reason,pass:f.success},...staticChecks(f.design,f.mission)];
 if(c?.maxQ)checks.push({name:'载荷保护',detail:`峰值 ${(f.maxQ/1000).toFixed(1)} / ${c.maxQ/1000} kPa`,pass:f.maxQ<=c.maxQ});
 if(c?.reserve)checks.push({name:'机动余量',detail:`${Math.round(reserve)} / ${c.reserve} m/s`,pass:reserve>=c.reserve});
 if(c?.entry)checks.push({name:'定点着陆',detail:`${Math.round(f.touchdownError??Infinity)} / ${c.entry.radius} m`,pass:f.touchdownError!==undefined&&f.touchdownError<=c.entry.radius});
 const accepted=checks.every(x=>x.pass),efficiency=cost/baseline;
 const economical=cost<=baseline*.86;
 const refined=f.mission.kind==='land'?(f.touchdownSpeed??Infinity)<=2.2&&(!c?.entry||(f.touchdownError??Infinity)<=c.entry.radius*.4):f.mission.kind==='recovery'||f.mission.kind==='return'?f.maxQ<=24000:reserve>=Math.max(400,c?.reserve??0);
 const stars=accepted?1+Number(economical)+Number(refined):0;
 const score=accepted?Math.round(500+Math.max(0,1-efficiency)*450+Math.min(300,reserve*.12)+(stars-1)*120):0;
 return {accepted,stars,score,checks,efficiency,reserve};
}
export function experiment(d:Design,m:Mission,name='当前方案'):Experiment {
 const f=simulate(d,m),ev=evaluate(f);return {id:crypto.randomUUID(),name,design:clone(d),mission:clone(m),cost:costOf(d,m),dv:analyze(d).dv,success:ev.accepted,reason:f.reason,maxAltitude:f.maxAltitude,maxQ:f.maxQ,peakTemp:Math.max(...f.samples.map(s=>s.temp),20),reserve:ev.reserve,stars:ev.stars,checks:ev.checks};
}
export function fuelSweep(d:Design,m:Mission,index:number):Experiment[]{
 return [.55,.75,1,1.25,1.5].map(factor=>{const candidate=clone(d);candidate.stages[index].fuel=Math.max(100,Math.min(40000,Math.round(candidate.stages[index].fuel*factor/100)*100));return experiment(candidate,m,`${Math.round(factor*100)}% 燃料`);});
}
export function stressTest(d:Design,m:Mission):Experiment[]{
 const heavy=clone(d);heavy.payload=Math.min(3000,Math.ceil(d.payload*1.15));const lean=clone(d);lean.stages.forEach(s=>s.fuel=Math.max(100,Math.round(s.fuel*.9/100)*100));return [experiment(d,m,'基准工况'),experiment(heavy,m,'载荷 +15%'),experiment(lean,m,'推进剂 −10%')];
}
export function earnedReputation(records:Record<string,ContractRecord>){return Object.values(records).reduce((sum,r)=>sum+r.stars*2,0);}
export function researchReady(id:number,completed:string[],reputation:number,required:string){return completed.includes(required)||reputation>=[0,6,20,42][id];}
export const tierText=['起步工程','轨道运输','月面作业','深空后勤'];
export const totalStars=(records:Record<string,ContractRecord>)=>CONTRACTS.reduce((s,c)=>s+(records[c.id]?.stars??0),0);
export function gradeTip(f:Flight){const e=evaluate(f);if(!e.accepted)return e.checks.find(c=>!c.pass)?.detail??f.reason;if(e.efficiency>.86)return '任务完成了，但成本仍有优化空间。试验台可以比较更小的燃料箱。';if(f.mission.kind==='land'&&(f.touchdownSpeed??0)>2.2)return '着陆已验收；尝试更轻、更平稳的末段下降争取精确星。';return '方案已验证。试着减少无用设备，或为下一份更重的合同改型。';}

import { MISSIONS, presetFor, type Design, type Mission } from './data';
export interface Contract {
 id:string;name:string;client:string;chapter:number;tech:number;base:string;
 brief:string;problem:string;payload:number;budget:number;reward:number;
 target?:number;maxMass?:number;maxStages?:number;maxQ?:number;reserve?:number;
 entry?:{height:number;vertical:number;horizontal:number;x:number;radius:number};
}
export const CONTRACTS:Contract[]=[
 {id:'needle',name:'一枚小火箭的野心',client:'青穹大学',chapter:0,tech:0,base:'sounding',payload:200,target:25000,budget:6200,reward:11500,maxMass:4500,maxStages:1,brief:'学校只租得起小型发射台。把 200 kg 实验包送到 25 km，预算只有 6,200。',problem:'大燃料箱会超出场地与预算。减重、控制推重比，用刚好够用的燃料。'},
 {id:'blackbox',name:'请把黑匣子带回来',client:'近空实验室',chapter:0,tech:0,base:'recovery',payload:250,target:35000,budget:7200,reward:13500,maxMass:5500,brief:'高空材料样本必须完整回收。先到 35 km，再安全返回，不能靠一次性探空完成。',problem:'燃料之外，还要为降落伞与返回舱留出质量。'},
 {id:'fragile',name:'别震坏这件艺术品',client:'微重力研究所',chapter:0,tech:0,base:'recovery',payload:400,target:22000,budget:7900,reward:14500,maxQ:21000,brief:'精密光学设备承受不了高动压。到达 22 km 并回收，全程动压不能超过 21 kPa。',problem:'把飞行程序的加速度上限调低；盲目加大发动机只会让载荷更危险。'},
 {id:'heavy-mail',name:'六百公斤的来信',client:'轨道邮政',chapter:0,tech:1,base:'satellite',payload:600,target:80000,budget:18000,reward:30000,maxStages:2,reserve:150,brief:'把 600 kg 通信卫星送到 80 km 稳定轨道，只接受两级以内的运载器。',problem:'比较多台小发动机与单台大发动机；别让过重的一级吃掉上面级预算。'},
 {id:'single-stage',name:'不分离的挑战',client:'先锋工程竞赛',chapter:0,tech:1,base:'orbit',payload:250,target:55000,budget:14000,reward:24000,maxStages:1,brief:'竞赛只允许单级运载器。将 250 kg 载荷送入轨道，全程不能依靠抛掉一级减重。',problem:'单级的干重会一直带到终点。发动机质量与真空效率都很重要。'},
 {id:'bulk-orbit',name:'轨道上的大件快递',client:'远望空间站',chapter:0,tech:1,base:'satellite',payload:1500,target:65000,budget:23000,reward:38000,maxMass:20000,brief:'空间站急需 1.5 t 备件。整箭质量必须控制在 20 t 内。',problem:'载荷更重时，增加级数、组合推力和调整转弯程序，可能比堆燃料更有效。'},
 {id:'lunar-courier',name:'月球经济舱',client:'月球邮政',chapter:1,tech:1,base:'moon-flyby',payload:500,budget:11500,reward:20000,maxStages:1,reserve:350,brief:'使用单级转移器将 500 kg 设备送入月球轨道，保留少量机动余量。',problem:'轨道任务不需要尾翼。每一个无用的部件都在消耗你的 Δv。'},
 {id:'lunar-heavy',name:'给月球送一座实验室',client:'静海科学站',chapter:1,tech:1,base:'moon-flyby',payload:1800,budget:14500,reward:26000,reserve:650,brief:'送达 1.8 t 实验设备，并保留 650 m/s 以上机动能力。',problem:'更高的比冲并不代表任何质量比例下都够用。用试验台比较分级方案。'},
 {id:'quiet-landing',name:'轻轻放在宁静海',client:'静海科学站',chapter:1,tech:2,base:'moon-land',payload:300,budget:10500,reward:22000,target:3,entry:{height:12000,vertical:-65,horizontal:28,x:-1200,radius:160},brief:'着陆器偏离目标 1.2 km，带着水平速度。请落进半径 160 m 的着陆区，接地不超过 3 m/s。',problem:'把水平误差消除得太晚，会同时消耗姿态控制与下降燃料。'},
 {id:'lunar-tanker',name:'月面上的油罐车',client:'月面后勤局',chapter:1,tech:2,base:'moon-land',payload:1000,budget:12500,reward:25000,target:4,entry:{height:14000,vertical:-90,horizontal:-35,x:1500,radius:200},reserve:250,brief:'把一吨补给放到指定区域，还需要留出 250 m/s 推进余量。',problem:'更大的发动机有助于刹车，但干重也会跟着到月面。'},
 {id:'moon-sample',name:'一百五十公斤月光',client:'地质样本中心',chapter:1,tech:2,base:'moon-return',payload:150,budget:11200,reward:22000,maxStages:1,brief:'用单级返回器把珍贵样本带回地球。需要同时兼顾起飞与再入回收。',problem:'返回设备会增加起飞质量，但省掉它们的代价是样本无法交付。'},
 {id:'red-relay',name:'红色星球的第一根天线',client:'深空通信网',chapter:2,tech:3,base:'mars-flyby',payload:500,budget:12500,reward:24000,reserve:500,brief:'将通信卫星送入火星轨道，并留下 500 m/s 修正能力。',problem:'窗口偏移会增加出发代价。用高效转移级和足够的供电完成长途任务。'},
 {id:'red-lab',name:'实验室，请签收',client:'荧惑联合研究站',chapter:2,tech:3,base:'mars-final',payload:700,budget:18500,reward:34000,target:4,entry:{height:32000,vertical:-650,horizontal:40,x:-1800,radius:250},brief:'从地球轨道起飞，将 700 kg 实验室送到火星指定区域。',problem:'转移级过度设计会挤占着陆器预算；单看总 Δv 无法判断末段是否够用。'},
 {id:'red-precision',name:'在旧探测器旁边降落',client:'火星救援计划',chapter:2,tech:3,base:'mars-entry',payload:350,budget:12000,reward:26000,target:2.5,entry:{height:28000,vertical:-700,horizontal:-55,x:2200,radius:100},brief:'备用电源要降在旧探测器 100 m 内，接地速度必须低于 2.5 m/s。',problem:'推力、燃料、横向制动缺一不可。更窄的区域需要更早消除速度误差。'},
 {id:'red-freight',name:'两吨货，另一个世界',client:'火星建设先遣队',chapter:2,tech:3,base:'mars-final',payload:2000,budget:28500,reward:48000,target:5,entry:{height:34000,vertical:-700,horizontal:35,x:-2000,radius:300},reserve:150,brief:'运送两吨设备，从地球停泊轨道一直到火星地面。',problem:'多发动机组合可以提高末段制动能力，但要把额外的发动机质量也算进转移。'}
];
export function contractById(id?:string|null){return CONTRACTS.find(c=>c.id===id);}
export function missionForContract(c:Contract):Mission{
 const m=structuredClone(MISSIONS.find(m=>m.id===c.base)!);
 return {...m,name:c.name,payload:c.payload,target:c.target??m.target,description:c.brief,lesson:c.problem,requires:[],contractId:c.id,entry:c.entry,goal:`交付 ${c.payload} kg · 费用 ≤ ${c.budget.toLocaleString()}${c.entry?` · 误差 ≤ ${c.entry.radius} m`:''}`};
}
export function draftForContract(c:Contract):Design{
 const d=presetFor(missionForContract(c));d.name=`${c.name} · 试验草案`;
 d.stages=[{engine:c.tech===0||c.chapter===0?'spark':c.tech>=2?'lander':'vacuum',fuel:c.chapter===0?2000:c.base.includes('land')||c.base==='mars-entry'?500:1200,diameter:1.8,structure:1}];
 d.fins=c.chapter===0;d.fairing=false;d.legs=false;d.parachute=false;d.shield=false;d.solar=false;d.battery=1;
 return d;
}

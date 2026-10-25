export type BodyId = 'earth' | 'moon' | 'mars';
export interface Body { id: BodyId; name: string; radius: number; mu: number; atmosphere: number; density: number; scaleHeight: number; color: string; }
export const G0 = 9.80665;
// Deliberately scaled educational system; these are not real Solar System dimensions.
export const BODIES: Record<BodyId, Body> = {
  earth: { id:'earth', name:'地球', radius:600000, mu:G0*600000**2, atmosphere:50000, density:1.225, scaleHeight:5800, color:'#759b9b' },
  moon: { id:'moon', name:'月球', radius:170000, mu:1.62*170000**2, atmosphere:0, density:0, scaleHeight:1, color:'#aaa99b' },
  mars: { id:'mars', name:'火星', radius:320000, mu:3.71*320000**2, atmosphere:35000, density:0.025, scaleHeight:7000, color:'#be7658' }
};
export interface Engine { id:string; name:string; thrust:number; isp:number; dry:number; cost:number; tech:number; description:string; }
export const ENGINES: Engine[] = [
  {id:'spark',name:'火种 · L-180',thrust:180000,isp:285,dry:550,cost:2400,tech:0,description:'可靠的入门液体发动机，适合轻型一级。'},
  {id:'atlas',name:'擎天 · L-650',thrust:650000,isp:300,dry:1500,cost:6800,tech:1,description:'高推力运载发动机，适合重型一级。'},
  {id:'vacuum',name:'远行 · V-90',thrust:90000,isp:365,dry:230,cost:3900,tech:1,description:'真空效率高，地面性能下降。适合上面级与转移级。'},
  {id:'lander',name:'萤火 · D-35',thrust:35000,isp:335,dry:130,cost:3100,tech:2,description:'轻量深度节流发动机，适合着陆与小型转移级。'},
  {id:'nova',name:'新星 · L-1200',thrust:1200000,isp:320,dry:2400,cost:11000,tech:3,description:'重型主发动机，支持大载荷与深空任务。'}
];
export interface Stage { count?:number; nozzle?:'balanced'|'sea'|'vacuum'; engine:string; fuel:number; diameter:number; structure:number; }
export interface FlightProgram {turnStart:number;turnEnd:number;maxAccel:number;autoStage:boolean;autoChute:boolean;}
export const DEFAULT_PROGRAM:FlightProgram={turnStart:600,turnEnd:24630,maxAccel:32,autoStage:true,autoChute:true};
export interface Design { program?:FlightProgram; name:string; stages:Stage[]; payload:number; fins:boolean; fairing:boolean; shield:boolean; parachute:boolean; legs:boolean; solar:boolean; battery:number; }
export interface Mission { contractId?:string; entry?:{height:number;vertical:number;horizontal:number;x:number;radius:number}; id:string; chapter:number; name:string; tag:string; description:string; lesson:string; goal:string; kind:'altitude'|'recovery'|'orbit'|'transfer'|'land'|'return'; body:BodyId; start:'surface'|'parking'|'approach'|'lunar'; target:number; payload:number; reward:number; requires:string[]; tech:number; }
export const MISSIONS: Mission[] = [
  {id:'sounding',chapter:0,name:'向天空提问',tag:'01 / 探空',description:'把记录仪送到 15 km 高度。第一次点火，验证推力与重量之间的关系。',lesson:'燃料也有重量。先确认推重比大于 1，再考虑飞多高。',goal:'达到 15 km，载荷 ≥ 100 kg',kind:'altitude',body:'earth',start:'surface',target:15000,payload:100,reward:12000,requires:[],tech:0},
  {id:'recovery',chapter:0,name:'带着答案回来',tag:'02 / 回收',description:'越过 20 km 后，把记录仪安全送回地面。为返回舱安装降落伞。',lesson:'下降阶段先丢弃运载级。降落伞只适合有大气的环境。',goal:'达到 20 km 后安全回收',kind:'recovery',body:'earth',start:'surface',target:20000,payload:100,reward:14000,requires:['sounding'],tech:0},
  {id:'orbit',chapter:0,name:'留在天空',tag:'03 / 入轨',description:'建立近地点高于 55 km 的稳定轨道。飞得高之外，还要获得足够的水平速度。',lesson:'轨道是不断错过地面的下落。逐渐向水平方向转弯。',goal:'近地点 ≥ 55 km，载荷 ≥ 150 kg',kind:'orbit',body:'earth',start:'surface',target:55000,payload:150,reward:26000,requires:['recovery'],tech:1},
  {id:'satellite',chapter:0,name:'第一位乘客',tag:'04 / 商业送星',description:'将 400 kg 卫星送入稳定轨道。试着用成熟型号改型完成任务。',lesson:'新增载荷会同时影响推重比与 Δv。比较每一级的性能。',goal:'近地点 ≥ 65 km，载荷 ≥ 400 kg',kind:'orbit',body:'earth',start:'surface',target:65000,payload:400,reward:30000,requires:['orbit'],tech:1},
  {id:'moon-flyby',chapter:1,name:'月球来信',tag:'05 / 地月转移',description:'从地球停泊轨道出发，完成地月转移与月球捕获。发射服务负责把你的深空段送入轨道。',lesson:'从这里开始设计上面级。发射服务费已计入正式任务成本。',goal:'完成地月转移与捕获',kind:'transfer',body:'moon',start:'parking',target:0,payload:150,reward:24000,requires:['satellite'],tech:1},
  {id:'moon-land',chapter:1,name:'宁静之地',tag:'06 / 月球软着陆',description:'从月球接近轨道下降，用发动机完成软着陆。任务包含轨道投送服务。',lesson:'月球没有大气。着陆腿需要配合足够的减速推力和燃料。',goal:'月面着陆速度 ≤ 6 m/s，载荷 ≥ 150 kg',kind:'land',body:'moon',start:'approach',target:6,payload:150,reward:30000,requires:['moon-flyby'],tech:2},
  {id:'moon-return',chapter:1,name:'把月亮带回家',tag:'07 / 月面返回',description:'从月面起飞，完成地球返回注入与再入回收。月面部署服务负责运送你的返回器。',lesson:'返回任务既需要推进余量，也需要隔热盾和降落伞。',goal:'从月面返回并安全回收样本',kind:'return',body:'moon',start:'lunar',target:0,payload:100,reward:40000,requires:['moon-land'],tech:2},
  {id:'mars-flyby',chapter:2,name:'红色航线',tag:'08 / 火星转移',description:'选择转移窗口，用足够的推进预算把探测器送入火星轨道。',lesson:'窗口影响出发机动。长途巡航需要太阳能与电池。',goal:'抵达火星轨道，完成数据回传',kind:'transfer',body:'mars',start:'parking',target:0,payload:200,reward:36000,requires:['moon-return'],tech:3},
  {id:'mars-entry',chapter:2,name:'穿过红色天空',tag:'09 / 进入与下降',description:'从火星进入界面开始，验证隔热、降落伞和动力减速的组合。',lesson:'火星大气稀薄。降落伞能减速，最后一段仍需发动机。',goal:'火星软着陆，载荷 ≥ 150 kg',kind:'land',body:'mars',start:'approach',target:6,payload:150,reward:35000,requires:['mars-flyby'],tech:3},
  {id:'mars-final',chapter:2,name:'我们抵达了',tag:'10 / 最终任务',description:'从地球轨道出发，将 350 kg 科学设备送达火星表面，部署设备并传回第一份观测。',lesson:'统一检查转移、热防护、下降燃料、着陆装置与供电。',goal:'350 kg 科学载荷软着陆并回传数据',kind:'land',body:'mars',start:'parking',target:6,payload:350,reward:60000,requires:['mars-entry'],tech:3}
];
export const CHAPTERS = [ {name:'走出地球',en:'LEAVE EARTH',subtitle:'从第一次点火，到第一条轨道',body:'earth'}, {name:'登陆月球',en:'TO THE MOON',subtitle:'跨过距离，把月亮带回家',body:'moon'}, {name:'抵达火星',en:'HELLO, MARS',subtitle:'让一个大胆的想法，落在另一个世界',body:'mars'} ];
export const TECH = [
  {id:1,name:'轨道工程',cost:6000,requires:'sounding',description:'解锁擎天运载发动机与远行真空发动机。'},
  {id:2,name:'月面系统',cost:9000,requires:'moon-flyby',description:'解锁萤火着陆发动机、着陆腿与返回系统。'},
  {id:3,name:'深空推进',cost:14000,requires:'moon-return',description:'解锁新星重型发动机与火星任务。'}
];
export function presetFor(m:Mission):Design {
  const base:Design={program:{...DEFAULT_PROGRAM},name:'曙光一号',stages:[{engine:'spark',fuel:4800,diameter:1.8,structure:1}],payload:m.payload,fins:true,fairing:true,shield:false,parachute:false,legs:false,solar:false,battery:1};
  if(m.id==='recovery') return {...base,name:'曙光一号 · 回收型',parachute:true};
  if(m.kind==='orbit') return {...base,name:'曙光二号',stages:[{engine:'atlas',fuel:19000,diameter:2.5,structure:1},{engine:'vacuum',fuel:4100,diameter:1.8,structure:1}]};
  if(m.id==='moon-flyby') return {...base,name:'望舒 · 转移级',fins:false,stages:[{engine:'vacuum',fuel:2800,diameter:1.8,structure:1}],solar:true};
  if(m.id==='moon-land') return {...base,name:'望舒 · 着陆器',fins:false,fairing:false,legs:true,stages:[{engine:'lander',fuel:1300,diameter:1.8,structure:1}],solar:true};
  if(m.kind==='return') return {...base,name:'望舒 · 返回器',fins:false,fairing:false,shield:true,parachute:true,stages:[{engine:'lander',fuel:3200,diameter:1.8,structure:1}],solar:true};
  if(m.id==='mars-flyby') return {...base,name:'荧惑 · 先行者',fins:false,solar:true,stages:[{engine:'vacuum',fuel:3800,diameter:1.8,structure:1}],battery:2};
  if(m.id==='mars-entry') return {...base,name:'荧惑 · 下降验证',fins:false,fairing:false,solar:true,shield:true,parachute:true,legs:true,stages:[{engine:'lander',fuel:1200,diameter:2.5,structure:1}],battery:2};
  if(m.id==='mars-final') return {...base,name:'荧惑一号',fins:false,fairing:false,solar:true,shield:true,parachute:true,legs:true,stages:[{engine:'vacuum',fuel:3600,diameter:2.5,structure:1},{engine:'lander',fuel:1400,diameter:2.5,structure:1}],battery:2};
  return base;
}

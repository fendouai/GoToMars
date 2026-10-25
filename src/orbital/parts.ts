import type { Stage3D, Propellant } from './model';
export interface TankPart {id:string;name:string;diameter:number;length:number;fuel:Propellant;description:string;}
export const TANK_PARTS:TankPart[]=[
 {id:'k12s',name:'K-12 / 轻型煤油箱',diameter:1.2,length:3,fuel:'kerolox',description:'1.2 m 标准接口，适合小型火箭与 Rutherford 组合。'},
 {id:'k25s',name:'K-25S / 短煤油箱',diameter:2.5,length:4,fuel:'kerolox',description:'2.5 m 接口，短筒段，适合上面级。'},
 {id:'k25m',name:'K-25M / 中煤油箱',diameter:2.5,length:8,fuel:'kerolox',description:'与 K-25S 同口径，可轴向堆叠。'},
 {id:'k37s',name:'K-37S / 短煤油箱',diameter:3.7,length:4,fuel:'kerolox',description:'3.7 m 接口，用于精细调整级间燃料分配。'},
 {id:'k37m',name:'K-37M / 中煤油箱',diameter:3.7,length:8,fuel:'kerolox',description:'3.7 m 标准接口，容量与箭体高度较均衡。'},
 {id:'k37l',name:'K-37L / 长煤油箱',diameter:3.7,length:12,fuel:'kerolox',description:'适合地面运载级。堆叠后要复核推重比。'},
 {id:'k50l',name:'K-50L / 重型煤油箱',diameter:5,length:12,fuel:'kerolox',description:'5 m 接口，允许更大推力架与更重载荷。'},
 {id:'m37m',name:'M-37M / 甲烷储箱',diameter:3.7,length:8,fuel:'methalox',description:'液氧/甲烷供给，匹配 Raptor 与 BE-4。'},
 {id:'m50l',name:'M-50L / 重型甲烷箱',diameter:5,length:12,fuel:'methalox',description:'5 m 接口，适合大推力甲烷主发动机。'},
 {id:'h37m',name:'H-37M / 氢氧储箱',diameter:3.7,length:8,fuel:'hydrolox',description:'额外隔热质量，适合氢氧上面级。'},
 {id:'h50m',name:'H-50M / 大直径氢氧箱',diameter:5,length:8,fuel:'hydrolox',description:'液氢密度低，需要更大体积。'},
 {id:'h50l',name:'H-50L / 长氢氧储箱',diameter:5,length:12,fuel:'hydrolox',description:'大体积、长筒段；高比冲之外也要关注干重。'}
];
export const FAIRING_PARTS=[{id:'f25',name:'F-25 / 轻型整流罩',diameter:2.5,height:5.5,mass:260,cost:4200},{id:'f37',name:'F-37 / 标准整流罩',diameter:3.7,height:6.3,mass:480,cost:6500},{id:'f50',name:'F-50 / 大型整流罩',diameter:5,height:8.5,mass:850,cost:9500}];
export const tankPart=(id:string)=>TANK_PARTS.find(p=>p.id===id);
export function assembledTanks(s:Stage3D){return (s.tankModules??[]).map(id=>tankPart(id)!).filter(Boolean);}
export function fitTank(s:Stage3D,id:string,replace=false){
 const part=tankPart(id);if(!part)throw new Error('未知储箱');
 const current=assembledTanks(s);
 if(!replace&&current.length&&(Math.abs(part.diameter-current[0].diameter)>.01||part.fuel!==current[0].fuel))throw new Error('接口不兼容：同一级只可堆叠相同口径、相同推进剂的储箱。不同口径可分到独立级并安装适配器。');
 const modules=replace?[part]:[...current,part];if(modules.length>5)throw new Error('每级最多 5 个标准储箱。');
 const total=modules.reduce((sum,p)=>sum+p.length,0);if(total>25)throw new Error('当前结构允许的总筒段长度不超过 25 m。');
 s.tankModules=modules.map(p=>p.id);s.diameter=part.diameter;s.fuel=part.fuel;s.tankLength=total;
}
export function removeTank(s:Stage3D,index:number){const parts=assembledTanks(s);if(parts.length<=1)throw new Error('至少保留一个储箱。');parts.splice(index,1);s.tankModules=parts.map(p=>p.id);s.tankLength=parts.reduce((sum,p)=>sum+p.length,0);}

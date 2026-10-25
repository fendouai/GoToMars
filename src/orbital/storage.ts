import { OBJECTIVES, defaultVehicle, validVehicle, type Vehicle } from './model';
import { missionGrade, type Flight3D } from './simulation';
export const ORBITAL_KEY='meridian-orbital-v2';
export interface Report3D {id:string;date:string;simulation:boolean;flight:Flight3D;stars:number;}
export interface Save3D {version:2;vehicle:Vehicle;objective:string;blueprints:{id:string;vehicle:Vehicle;date:string}[];reports:Report3D[];records:Record<string,{stars:number;cost:number}>;muted:boolean;active?:{flight:Flight3D;simulation:boolean;recorded:boolean};}
export function fresh3D():Save3D{return {version:2,vehicle:defaultVehicle(),objective:'first-light',blueprints:[],reports:[],records:{},muted:true};}
export function validFlight(f:unknown):f is Flight3D{
 if(!f||typeof f!=='object')return false;const v=f as Flight3D;
 const validVec=(a:unknown)=>Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n));
 return validVehicle(v.vehicle)&&!!v.objective&&OBJECTIVES.some(o=>o.id===v.objective.id)&&['countdown','ascent','coast','insertion','orbit','failed'].includes(v.phase)&&['time','throttle','command','manualPitch','manualYaw','stageIgnition','orbitHold','lastSample','lastPath','maxQ','maxG','maxHeat','temperature','gravityLoss','dragLoss','engineDV','maxAltitude','currentThrust','currentFlow','currentGimbal','maxAlpha','structuralStress'].every(k=>typeof v[k as keyof Flight3D]==='number'&&Number.isFinite(v[k as keyof Flight3D]))&&validVec(v.r)&&validVec(v.v)&&validVec(v.axis)&&validVec(v.omega)&&Math.hypot(...v.r)>3e6&&Math.hypot(...v.r)<1e9&&Math.hypot(...v.axis)>.5&&Math.hypot(...v.axis)<1.5&&(v.ignitions===undefined||(Array.isArray(v.ignitions)&&v.ignitions.length===v.vehicle.stages.length&&v.ignitions.every(n=>Number.isInteger(n)&&n>=0&&n<100)))&&(v.running===undefined||(Array.isArray(v.running)&&v.running.length===v.vehicle.stages.length&&v.running.every(b=>typeof b==='boolean')))&&Number.isInteger(v.active)&&v.active>=0&&v.active<v.vehicle.stages.length&&Array.isArray(v.fuels)&&v.fuels.length===v.vehicle.stages.length&&v.fuels.every(n=>Number.isFinite(n)&&n>=0)&&['autopilot','fairingGone','launched','paused'].every(k=>typeof v[k as keyof Flight3D]==='boolean')&&typeof v.reason==='string'&&Array.isArray(v.events)&&v.events.length<=2000&&v.events.every(e=>e&&Number.isFinite(e.time)&&typeof e.text==='string'&&['info','warning','success'].includes(e.kind))&&Array.isArray(v.path)&&v.path.length<=1200&&v.path.every(validVec)&&Array.isArray(v.samples)&&v.samples.length<=2400&&v.samples.every(s=>s&&['time','altitude','speed','airSpeed','vertical','horizontal','mass','fuel','q','g','heat','apo','peri'].every(k=>typeof s[k as keyof typeof s]==='number'&&Number.isFinite(s[k as keyof typeof s])))&&Array.isArray(v.debris)&&v.debris.length<=3&&v.debris.every(d=>d&&Number.isInteger(d.stage)&&d.stage>=0&&d.stage<v.vehicle.stages.length&&validVec(d.r)&&validVec(d.v)&&validVec(d.axis)&&Number.isFinite(d.separatedAt));
}
export function parse3D(raw:string):Save3D{
 const s=JSON.parse(raw) as Save3D;
 if(!s||s.version!==2||!validVehicle(s.vehicle)||!OBJECTIVES.some(o=>o.id===s.objective)||typeof s.muted!=='boolean'||!Array.isArray(s.blueprints)||s.blueprints.length>25||s.blueprints.some(b=>!b||typeof b.id!=='string'||!validVehicle(b.vehicle)||typeof b.date!=='string')||!Array.isArray(s.reports)||s.reports.length>12||s.reports.some(r=>!r||typeof r.id!=='string'||typeof r.date!=='string'||typeof r.simulation!=='boolean'||!Number.isInteger(r.stars)||r.stars<0||r.stars>3||!validFlight(r.flight))||!s.records||typeof s.records!=='object'||Array.isArray(s.records)||Object.entries(s.records).some(([id,r])=>!OBJECTIVES.some(o=>o.id===id)||!r||!Number.isInteger(r.stars)||r.stars<0||r.stars>3||!Number.isFinite(r.cost)||r.cost<0)||(s.active&&(!validFlight(s.active.flight)||typeof s.active.simulation!=='boolean'||typeof s.active.recorded!=='boolean')))throw new Error('无效或不兼容的 3D 存档');
 for(const r of s.reports)r.flight.objective=structuredClone(OBJECTIVES.find(o=>o.id===r.flight.objective.id)!);
 if(s.active)s.active.flight.objective=structuredClone(OBJECTIVES.find(o=>o.id===s.active!.flight.objective.id)!);
 return s;
}
export function read3D(){try{const raw=localStorage.getItem(ORBITAL_KEY);return raw?parse3D(raw):fresh3D();}catch{return fresh3D();}}
export function write3D(s:Save3D){try{localStorage.setItem(ORBITAL_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function recordFlight(s:Save3D,f:Flight3D,simulation:boolean){
 const grade=missionGrade(f);const report:Report3D={id:crypto.randomUUID(),date:new Date().toISOString(),simulation,flight:structuredClone(f),stars:grade.stars};
 s.reports.unshift(report);s.reports=s.reports.slice(0,12);
 if(!simulation&&grade.success){const prev=s.records[f.objective.id];s.records[f.objective.id]={stars:Math.max(prev?.stars??0,grade.stars),cost:Math.min(prev?.cost??Infinity,grade.cost)};}
 return report;
}

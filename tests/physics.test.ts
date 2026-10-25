import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, BODIES, G0, presetFor } from '../src/data';
import { analyze, clone, costOf, createFlight, currentMass, deployChute, engineOf, finish, massOf, orbitOf, remainingDV, separate, simulate, step, transferBudget, warnings } from '../src/physics';
import { freshSave, parseSave, repeatReward, settle, unlocked, validateDesign } from '../src/store';

for (const m of MISSIONS) test(`reference craft completes mission: ${m.id}`,()=>{
 const f=simulate(presetFor(m),m);assert.equal(f.success,true,f.reason);assert.equal(f.phase,'complete');assert.ok(f.samples.length>1);assert.ok(f.fuels.every(v=>v>=0));assert.ok(f.dataSent);
});
test('vacuum delta-v matches Tsiolkovsky equation',()=>{const d=presetFor(MISSIONS[0]);const a=analyze(d);assert.ok(Math.abs(a.dv-engineOf(d.stages[0].engine).isp*G0*Math.log(a.mass/(a.mass-d.stages[0].fuel)))<1e-8);});
test('adding payload lowers delta-v and thrust-to-weight',()=>{const d=presetFor(MISSIONS[2]),a=analyze(d);d.payload+=700;const b=analyze(d);assert.ok(b.dv<a.dv);assert.ok(b.stages[0].twr<a.stages[0].twr);});
test('fuel consumption equals thrust / exhaust velocity',()=>{const m=MISSIONS[4],d=presetFor(m),f=createFlight(d,m);f.autopilot=false;f.throttle=.5;const fuel=f.fuels[0];step(f,1);assert.ok(Math.abs((fuel-f.fuels[0])-engineOf(d.stages[0].engine).thrust*.5/(365*G0))<.001);});
test('fuel, throttle and mass remain bounded',()=>{const f=createFlight(presetFor(MISSIONS[0]),MISSIONS[0]);f.throttle=10;for(let i=0;i<100;i++)step(f,10);assert.ok(f.fuels.every(v=>v>=0));assert.ok(currentMass(f)>0);});
test('underpowered rocket fails with actionable diagnosis',()=>{const d=presetFor(MISSIONS[0]);d.stages[0].fuel=40000;d.payload=3000;const f=simulate(d,MISSIONS[0]);assert.equal(f.success,false);assert.match(f.reason,/推重比/);});
test('moon landing without legs fails',()=>{const d=presetFor(MISSIONS[5]);d.legs=false;const f=simulate(d,MISSIONS[5]);assert.equal(f.success,false);assert.match(f.reason,/着陆腿/);});
test('recovery without parachute fails',()=>{const d=presetFor(MISSIONS[1]);d.parachute=false;const f=simulate(d,MISSIONS[1]);assert.equal(f.success,false);});
test('long cruise without solar power fails',()=>{const d=presetFor(MISSIONS[7]);d.solar=false;const f=simulate(d,MISSIONS[7]);assert.equal(f.success,false);assert.match(f.reason,/电量/);});
test('insufficient transfer propellant fails',()=>{const d=presetFor(MISSIONS[7]);d.stages[0].fuel=100;const f=simulate(d,MISSIONS[7]);assert.equal(f.success,false);assert.match(f.reason,/推进剂/);});
test('unprotected atmospheric entry overheats',()=>{const d=presetFor(MISSIONS[8]);d.shield=false;const f=createFlight(d,MISSIONS[8]);f.body='earth';f.phase='reentry';f.y=BODIES.earth.radius+45000;f.vy=-1800;f.autopilot=false;f.throttle=0;for(let i=0;i<100&&f.phase!=='failed';i++)step(f,1);assert.equal(f.success,false);assert.match(f.reason,/热防护/);});
test('circular orbit conserves energy within integration tolerance',()=>{const m=MISSIONS[2],f=createFlight(presetFor(m),m),b=BODIES.earth;f.autopilot=false;f.throttle=0;f.y=b.radius+80000;f.vx=Math.sqrt(b.mu/f.y);const initial=orbitOf(f.x,f.y,f.vx,f.vy,b.mu,b.radius);for(let i=0;i<100;i++)step(f,.5);const final=orbitOf(f.x,f.y,f.vx,f.vy,b.mu,b.radius);assert.ok(Math.abs((final.energy-initial.energy)/initial.energy)<.0001);});
test('analytic circular orbit reports expected apoapsis and periapsis',()=>{const b=BODIES.earth,h=80000,r=b.radius+h,o=orbitOf(0,r,Math.sqrt(b.mu/r),0,b.mu,b.radius);assert.ok(Math.abs(o.peri-h)<.1);assert.ok(Math.abs(o.apo-h)<.1);});
test('fixed-step flight is independent of frame grouping',()=>{const d=presetFor(MISSIONS[0]),a=createFlight(d,MISSIONS[0]),b=clone(a);for(let i=0;i<100;i++)step(a,.1);for(let i=0;i<10;i++)step(b,1);assert.ok(Math.abs(a.y-b.y)<.0001);assert.ok(Math.abs(a.fuels[0]-b.fuels[0])<.0001);});
test('stage separation removes dry mass without creating propellant',()=>{const d=presetFor(MISSIONS[2]),f=createFlight(d,MISSIONS[2]);const before=currentMass(f),fuels=clone(f.fuels);separate(f);assert.equal(f.active,1);assert.ok(currentMass(f)<before);assert.deepEqual(f.fuels,fuels);assert.ok(remainingDV(f)<analyze(d).dv);});
test('chute cannot deploy outside safe atmosphere envelope',()=>{const f=createFlight(presetFor(MISSIONS[1]),MISSIONS[1]);f.y=BODIES.earth.radius+15000;deployChute(f);assert.equal(f.chute,false);f.y=BODIES.earth.radius+5000;deployChute(f);assert.equal(f.chute,true);});
test('pause and final state freeze simulation',()=>{const f=createFlight(presetFor(MISSIONS[0]),MISSIONS[0]);f.paused=true;step(f,10);assert.equal(f.time,0);f.paused=false;finish(f,false,'abort');step(f,10);assert.equal(f.time,0);});
test('off-window departure costs more delta-v',()=>{assert.ok(transferBudget('mars',390).depart>transferBudget('mars',0).depart);});
test('simulation does not mutate design',()=>{const d=presetFor(MISSIONS[0]),original=clone(d);simulate(d,MISSIONS[0]);assert.deepEqual(d,original);assert.equal(massOf(d),analyze(d).mass);});
test('design validation rejects NaN, unknown engine and missing equipment',()=>{const d=presetFor(MISSIONS[0]);assert.ok(validateDesign(d));assert.ok(!validateDesign({...d,payload:NaN}));assert.ok(!validateDesign({...d,legs:undefined}));assert.ok(!validateDesign({...d,stages:[{...d.stages[0],engine:'infinite'}]}));});
test('save import validates progress and blueprint structures',()=>{const s=freshSave();assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.throws(()=>parseSave(JSON.stringify({...s,funds:-1})));assert.throws(()=>parseSave(JSON.stringify({...s,completed:['fake']})));assert.throws(()=>parseSave(JSON.stringify({...s,blueprints:[{design:{}}]})));});
test('simulation success does not award funds or campaign completion',()=>{const s=freshSave(),f=simulate(presetFor(MISSIONS[0]),MISSIONS[0]),n=settle(s,f,false,0);assert.equal(n.funds,s.funds);assert.deepEqual(n.completed,[]);assert.equal(n.history.length,1);assert.equal(s.history.length,0);});
test('formal first completion pays full reward; repeats pay sustainable baseline reward',()=>{const s=freshSave(),m=MISSIONS[0],f=simulate(presetFor(m),m),a=settle(s,f,true,costOf(f.design,m)),b=settle(a,f,true,costOf(f.design,m));assert.equal(a.funds,s.funds+m.reward);assert.equal(b.funds,a.funds+repeatReward(m));assert.equal(b.completed.length,1);});
test('full campaign is completable with available funding and research gates',()=>{let s=freshSave();for(const m of MISSIONS){assert.ok(unlocked(s,m.id));if(m.tech>s.tech){const cost=[0,6000,9000,14000][m.tech];s.funds-=cost;s.tech=m.tech;}const d=presetFor(m),cost=costOf(d,m);assert.ok(s.funds>=cost,`${m.id}: funds ${s.funds} < ${cost}`);assert.equal(warnings(d,m,s.tech).filter(x=>/尚未研发/.test(x)).length,0);s.funds-=cost;s=settle(s,simulate(d,m),true,cost);}assert.equal(s.completed.length,10);assert.ok(s.funds>0);});
test('radial suborbital trajectory has a meaningful apogee',()=>{const b=BODIES.earth,v=600,o=orbitOf(0,b.radius,0,v,b.mu,b.radius),expected=1/(1/b.radius-v*v/(2*b.mu))-b.radius;assert.ok(Math.abs(o.apo-expected)<.01);});
test('flight program acceleration limit changes the launch trajectory',()=>{const m=MISSIONS[0],d=presetFor(m),a=createFlight(d,m);d.program!.maxAccel=20;const b=createFlight(d,m);for(let i=0;i<10;i++){step(a,1);step(b,1);}assert.ok(a.y>b.y);});
test('automatic staging can be disabled without consuming the upper stage',()=>{const d=presetFor(MISSIONS[2]);d.stages[0].fuel=100;d.program!.autoStage=false;const f=createFlight(d,MISSIONS[2]);for(let i=0;i<10;i++)step(f,1);assert.equal(f.active,0);assert.equal(f.fuels[1],d.stages[1].fuel);});
test('all engineering challenges admit a lower-cost, higher-payload solution',()=>{
 for(let i=0;i<MISSIONS.length;i++){
  const original=MISSIONS[i],m={...original,payload:Math.ceil(original.payload*1.25)},base=presetFor(original),d=presetFor(m);
  const fuels:Record<string,number[]>={sounding:[3600],recovery:[2000],orbit:[2900,600],satellite:[3800,800],'moon-flyby':[400],'moon-land':[300],'moon-return':[800],'mars-flyby':[1000],'mars-entry':[500],'mars-final':[1800,700]};
  d.stages.forEach((s,j)=>s.fuel=fuels[m.id][j]);
  if(['moon-land','mars-entry'].includes(m.id))d.solar=false;
  if(['mars-entry','mars-final'].includes(m.id))d.shield=false;
  d.battery=1;
  assert.ok(costOf(d,m)<=costOf(base,original)*.95,`${m.id} over budget`);
  const f=simulate(d,m);assert.ok(f.success,`${m.id}: ${f.reason}`);
 }
});
test('import rejects malformed events, telemetry and active flights',()=>{const s=freshSave(),f=simulate(presetFor(MISSIONS[0]),MISSIONS[0]),n=settle(s,f,false,0);const bad=clone(n);bad.history[0].samples=[null as never];assert.throws(()=>parseSave(JSON.stringify(bad)));assert.throws(()=>parseSave(JSON.stringify({...s,run:{flight:{},formal:true,cost:100,mode:'campaign'}})));});

test('repeated standard missions remain profitable without rewarding overbuilding',()=>{for(const m of MISSIONS){const cost=costOf(presetFor(m),m);assert.ok(repeatReward(m)>cost);assert.ok(repeatReward(m)<=m.reward);}});
test('active save restores canonical mission metadata',()=>{const s=freshSave(),f=createFlight(presetFor(MISSIONS[0]),MISSIONS[0]);f.mission.name='<img onerror=alert(1)>';s.run={flight:f,formal:true,cost:6680,mode:'campaign'};const n=parseSave(JSON.stringify(s));assert.equal(n.run!.flight.mission.name,MISSIONS[0].name);});

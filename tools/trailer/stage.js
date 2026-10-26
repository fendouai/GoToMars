// Cinematic camera edit of the shipping renderer and flight model. No mocked flight physics.
import * as THREE from 'three';
import { OrbitalScene } from '../../src/orbital/scene.ts';
import { defaultVehicle, OBJECTIVES, vehicleHeight, unit, cross } from '../../src/orbital/model.ts';
import { createFlight3D, stepFlight3D, altitude3D, orbitState } from '../../src/orbital/simulation.ts';
const vehicle=defaultVehicle(), world=new OrbitalScene(document.querySelector('#film'),vehicle);
world.controls.enableDamping=false;world.controls.enabled=false;
let flight=createFlight3D(vehicle,OBJECTIVES[0]),lastShot=-1;
const cuts=[0,4,10,14,21,27,33,37,42];
const vector=v=>new THREE.Vector3(...v);
function advance(target){if(target<flight.time)flight=createFlight3D(vehicle,OBJECTIVES[0]);while(flight.time<target-1e-7)stepFlight3D(flight,Math.min(.5,target-flight.time));}
function shotAt(t){return Math.min(7,cuts.findIndex((x,i)=>i<8&&t>=x&&t<cuts[i+1]));}
function seek(t){
 const shot=shotAt(Math.min(t,41.999)),p=(t-cuts[shot])/(cuts[shot+1]-cuts[shot]);
 if(shot!==lastShot){if(shot<2){world.workshop();world.setCutaway(false);}else{const start=[0,0,-8,-2,272,300,450,470][shot];advance(start);world.enterFlight(flight);world.setCameraMode(shot>=6?'orbit':shot===2?'wide':'chase',flight);}lastShot=shot;}
 world.camera.fov=40;
 if(shot===0){world.controls.minDistance=.002;world.controls.target.set(0,.0012,0);const a=.45+p*.6;world.camera.position.set(Math.sin(a)*.014,.0001+p*.001,Math.cos(a)*.014);}
 else if(shot===1){world.setCutaway(p>.48);const h=vehicleHeight(vehicle)*.001,a=.5+p*.25;world.controls.minDistance=.012;world.controls.target.set(0,h*.48,0);world.camera.position.set(Math.sin(a)*.092,h*.6,Math.cos(a)*.092);}
 else{
  const sim=shot===2?-8+p*5:shot===3?-2+p*67:shot===4?272+p*20:shot===5?300+p*150:shot===6?450+p*20:470+p*25;
  advance(sim);world.updateFlight(flight,t);
  const up=vector(unit(flight.r)),east=vector(unit(cross([0,0,-1],unit(flight.r)))),north=new THREE.Vector3().crossVectors(up,east).normalize();
  if(shot>=6){const centre=vector(flight.r).multiplyScalar(-.001),a=.75+p*.12;world.controls.target.copy(centre);world.camera.position.copy(centre).addScaledVector(east,14000*Math.cos(a)).addScaledVector(up,14000*Math.sin(a)).addScaledVector(north,3000);world.camera.fov=shot===7?48:40;}
  else{const target=vector(flight.axis).multiplyScalar(vehicleHeight(vehicle,flight.active)*.001*.43),dist=shot===2?.19:shot===3?.075:shot===4?.065:.07;
   world.controls.target.copy(target);const a=(shot===2?-1.0:.8)+p*.16;world.camera.position.copy(target).addScaledVector(east,dist*Math.sin(a)).addScaledVector(north,dist*Math.cos(a)).addScaledVector(up,dist*(shot===2?.24:.1));}
  world.camera.up.copy(up);
 }
 world.camera.updateProjectionMatrix();world.controls.update();world.render();
 const orbit=orbitState(flight.r,flight.v);
 return {shot,time:t,simulationTime:flight.time,altitude:altitude3D(flight),phase:flight.phase,stage:flight.active+1,perigee:orbit.peri,apogee:orbit.apo,textures:world.canvas.dataset.textures};
}
window.trailer={seek,cuts,world};
seek(0);
window.trailer.ready=new Promise(resolve=>{const timer=setInterval(()=>{world.render();if(world.canvas.dataset.textures==='ready'){clearInterval(timer);resolve(true);}},100);});

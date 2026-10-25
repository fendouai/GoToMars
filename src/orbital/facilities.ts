import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SurfaceLibrary, canvasMap, hashNoise } from './surfaces';
const UP=new T.Vector3(0,1,0);
class Fabricator {
 readonly group=new T.Group();private batches=new Map<T.Material,T.BufferGeometry[]>();
 add(g:T.BufferGeometry,m:T.Material,p:T.Vector3=new T.Vector3(),q:T.Quaternion=new T.Quaternion(),scale?:T.Vector3){if(g.index){const original=g;g=g.toNonIndexed();original.dispose();}g.applyMatrix4(new T.Matrix4().compose(p,q,scale??new T.Vector3(1,1,1)));const position=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv');if(uv)for(let i=0;i<position.count;i++){const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));uv.setXY(i,(ny>nx&&ny>nz?position.getX(i):nx>nz?position.getZ(i):position.getX(i))*.5,(ny>nx&&ny>nz?position.getZ(i):position.getY(i))*.5);}if(!this.batches.has(m))this.batches.set(m,[]);this.batches.get(m)!.push(g);}
 box(w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0,bevel=0){this.add(bevel?new RoundedBoxGeometry(w,h,d,1,bevel):new T.BoxGeometry(w,h,d),m,new T.Vector3(x,y,z));}
 pipe(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,segments=8){const dir=b.clone().sub(a);this.add(new T.CylinderGeometry(r,r,dir.length(),segments),m,a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(UP,dir.normalize()));}
 beam(a:T.Vector3,b:T.Vector3,width:number,m:T.Material){const dir=b.clone().sub(a);this.add(new T.BoxGeometry(width,dir.length(),width),m,a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(UP,dir.normalize()));}
 finish(){this.batches.forEach((geos,mat)=>{const merged=mergeGeometries(geos,false);if(merged){const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);}geos.forEach(g=>g.dispose());});return this.group;}
}
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
function label(text:string,sub:string,w:number,h:number,color='#b9c7c8'){const tex=canvasMap(1024,256,c=>{c.clearRect(0,0,1024,256);c.fillStyle=color;c.font='600 100px sans-serif';c.fillText(text,25,120);c.font='24px monospace';c.fillStyle='#758c94';c.fillText(sub,30,190);});const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));return p;}
function safetyStripe(w:number,d:number){const tex=canvasMap(512,128,c=>{c.fillStyle='#bca04f';c.fillRect(0,0,512,128);c.fillStyle='#20292d';for(let i=-128;i<640;i+=80){c.beginPath();c.moveTo(i,0);c.lineTo(i+37,0);c.lineTo(i+165,128);c.lineTo(i+128,128);c.fill();}});tex.repeat.set(w/2,1);const p=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:tex,roughness:.85,polygonOffset:true,polygonOffsetFactor:-1}));p.rotation.x=-Math.PI/2;return p;}
export function buildWorkshop(s:SurfaceLibrary){
 const b=new Fabricator(),concrete=s.get('concrete',{color:'#888c88'}),steel=s.get('grating'),dark=s.get('rubber'),yellow=s.get('paint',{color:'#a68b4a'}),white=s.get('paint',{color:'#bcc5c4'}),metal=s.get('metal');
 b.box(130,.7,130,concrete,0,-1.1,0);b.box(130,82,.5,dark,0,40,-32);b.box(.5,82,100,dark,-48,40,0);
 // Structural portal frames and horizontal wall girts.
 for(let x=-48;x<=48;x+=12){for(const dx of [-.24,.24])b.box(.16,80,1,steel,x+dx,39,-31.4);b.box(1.2,.18,1.4,steel,x,1,-31.4);for(let y=5;y<76;y+=10){b.beam(V(x-.5,y,-30.8),V(x+.5,y+10,-30.8),.08,steel);}}
 for(let y=3;y<80;y+=8)b.box(100,.14,.2,steel,0,y,-30.4);
 for(let x=-46;x<46;x+=4){b.box(3.85,72,.08,s.get('metal',{color:x%8===0?'#444f53':'#546064',roughness:.8}),x,39,-31.5);}
 for(let x=-30;x<=36;x+=11){b.beam(V(x,72,-30),V(x,72,45),.3,steel);b.beam(V(x,73,-29),V(x,73,44),.15,steel);b.beam(V(x,72,-29),V(x,73,-21),.09,steel);}
 // Service platforms: floor grates, guard rails, diagonal braces, ladder cages.
 for(const side of [-1,1]){const x=side*7;
  for(const z of [-4,1]){b.box(.32,39,.32,steel,x,19,z);for(let y=0;y<36;y+=6)b.beam(V(x,y,z),V(x+side*4,y+6,z),.11,steel);}
  for(let y=5;y<37;y+=8){b.box(5,.18,6,steel,x+side*1.9,y,-1.5);for(let gx=-2;gx<=2;gx+=.22)b.box(.045,.04,5.7,metal,x+side*1.9+gx,y+.12,-1.5);for(const z of [-4.35,1.35]){b.pipe(V(x-side*.3,y+1.05,z),V(x+side*4.1,y+1.05,z),.035,yellow);for(let xx=0;xx<=4;xx+=1.3)b.pipe(V(x+side*xx,y+.1,z),V(x+side*xx,y+1.05,z),.028,yellow);}}
  b.pipe(V(x+side*4,0,-3.2),V(x+side*4,38,-3.2),.045,metal);b.pipe(V(x+side*4+.6,0,-3.2),V(x+side*4+.6,38,-3.2),.045,metal);for(let y=.3;y<38;y+=.35)b.pipe(V(x+side*4,y,-3.2),V(x+side*4+.6,y,-3.2),.027,metal);
 }
 // Crane beam, hoist, cable drums and industrial ducts.
 b.box(86,1.8,1.2,yellow,0,62,-5);b.box(3.4,1.6,3.3,dark,0,60.2,-5);for(const x of [-.55,.55])b.pipe(V(x,59,-5),V(x,49,-5),.018,metal);
 for(let y=5;y<65;y+=15){b.pipe(V(-43,y,-27),V(44,y,-27),.26,metal,16);b.pipe(V(-43,y-.7,-27),V(44,y-.7,-27),.08,yellow);}
 // Work area furniture and maintenance equipment.
 for(const side of [-1,1]){for(let i=0;i<3;i++){const x=side*(15+i*4),z=-5-i*5;b.box(2.8,1.5,1.5,s.get('paint',{color:i%2?'#3e5662':'#9c9d85'}),x,.4,z,.07);for(const dx of [-.95,.95])for(const dz of [-.5,.5]){b.pipe(V(x+dx,-.55,z+dz),V(x+dx,-.7,z+dz),.13,dark);}}}
 for(let x=-24;x<=24;x+=8){b.box(5.7,.016,.1,yellow,x,-.735,12);b.box(.1,.016,15,yellow,x-2.85,-.735,5);}
 for(let z=-15;z<25;z+=2)b.box(.3,.01,.025,metal,-10,-.72,z);
 // Floor drains and a recessed-looking channel under the vehicle.
 b.box(.7,.01,56,dark,4,-.73,0);for(let z=-27;z<28;z+=.22)b.box(.66,.015,.045,steel,4,-.71,z);
 const group=b.finish();group.name='Detailed VAB';
 const sign=label('MERIDIAN','VEHICLE ASSEMBLY  /  COMPLEX 01',24,6);sign.position.set(14,45,-30.9);group.add(sign);
 const bay=label('01','AUTHORIZED PERSONNEL ONLY',6,1.5,'#d8b478');bay.position.set(-19,8,-30.8);group.add(bay);
 const stripe=safetyStripe(9,.42);stripe.position.set(0,-.71,9);group.add(stripe);
 // Visible light fixtures are matched to the workshop lighting rig.
 const emissive=new T.MeshStandardMaterial({color:'#e4eee9',emissive:'#d7e9ee',emissiveIntensity:1.2,roughness:.4});
 for(const x of [-18,18])for(const z of [-16,3,22]){const light=new T.Mesh(new T.BoxGeometry(1,.1,10),emissive);light.position.set(x,49,z);group.add(light);}
 for(const x of [-13,13]){const softbox=new T.Mesh(new T.BoxGeometry(.12,8,1.2),emissive);softbox.position.set(x,17,6);softbox.rotation.y=x>0?-.5:.5;group.add(softbox);}
 // Soft grime patches: contact evidence without adding global darkness.
 const oil=canvasMap(256,256,c=>{const g=c.createRadialGradient(128,128,8,128,128,120);g.addColorStop(0,'rgba(15,24,25,.23)');g.addColorStop(.5,'rgba(20,25,22,.1)');g.addColorStop(1,'rgba(20,25,22,0)');c.fillStyle=g;c.fillRect(0,0,256,256);});
 for(let i=0;i<12;i++){const p=new T.Mesh(new T.PlaneGeometry(2+hashNoise(i,1)*6,2+hashNoise(i,4)*3),new T.MeshBasicMaterial({map:oil,transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set((hashNoise(i,2)-.5)*30,-.71,(hashNoise(i,3)-.5)*35);group.add(p);}
 return group;
}
export function buildLaunchComplex(s:SurfaceLibrary){
 const b=new Fabricator(),concrete=s.get('concrete'),steel=s.get('grating',{color:'#8c999b'}),metal=s.get('metal'),dark=s.get('rubber'),yellow=s.get('paint',{color:'#d1aa5e'}),white=s.get('paint',{color:'#d7d8ce'}),blue=s.get('paint',{color:'#657b83'});
 b.box(150,1.2,150,concrete,0,-.6,0,.15);
 // A flush central deck with a flame trench, grate panels, launch hold-down arms.
 b.box(13,.2,18,dark,0,-.14,3);for(const x of [-9,9])b.box(4,1.1,23,concrete,x,-.65,3);
 for(const side of [-1,1]){b.box(2.2,.32,12,steel,side*5,-.06,1);for(let z=-4;z<7;z+=.25)b.box(2.1,.045,.055,metal,side*5,.12,z);for(let z=-4;z<=5;z+=9){b.box(.6,2.1,.6,metal,side*3.4,.8,z);b.beam(V(side*3.4,1.7,z),V(side*1.7,1.1,z),.24,steel);}}
 // A complete steel lattice service tower positioned behind the rocket.
 const tx=-9,tz=-9,w=4.7,height=54;
 for(const x of [-1,1])for(const z of [-1,1])b.box(.32,height,.32,steel,tx+x*w/2,height/2,tz+z*w/2);
 for(let y=0;y<height;y+=4.5){for(const z of [-1,1]){b.beam(V(tx-w/2,y,tz+z*w/2),V(tx+w/2,y+4.5,tz+z*w/2),.12,steel);b.beam(V(tx+w/2,y,tz+z*w/2),V(tx-w/2,y+4.5,tz+z*w/2),.12,steel);b.box(w,.18,.22,steel,tx,y,tz+z*w/2);}for(const x of [-1,1])b.beam(V(tx+x*w/2,y,tz-w/2),V(tx+x*w/2,y+4.5,tz+w/2),.12,steel);}
 for(const y of [8,18,30,43]){b.box(8,.22,4,steel,tx+3,y,tz);for(let z=-1.8;z<=1.8;z+=3.6){b.pipe(V(tx+1,y+1.1,tz+z),V(tx+6.8,y+1.1,tz+z),.035,yellow);for(let x=1;x<7;x+=1.3)b.pipe(V(tx+x,y,tz+z),V(tx+x,y+1.1,tz+z),.03,yellow);}b.beam(V(tx+1,y-3,tz),V(tx+5,y,tz),.17,steel);}
 // Retracting-looking fuel and data umbilicals, lightning mast.
 for(const y of [12,28,36]){b.pipe(V(tx+3,y,tz),V(-2,y,-1),.11,yellow,12);b.pipe(V(-2,y,-1),V(-1.5,y-.5,0),.08,metal,12);}
 b.pipe(V(tx,54,tz),V(tx,67,tz),.065,steel,12);
 for(let x=-50;x<=50;x+=12)b.box(.12,.018,10,yellow,x,.02,46);
 // Tank farm with ellipsoidal ends, raised pipes, concrete bunds and valve stations.
 for(let i=0;i<6;i++){const x=-75-i%3*18,z=-40-Math.floor(i/3)*31,h=10+i%2*5,r=4.2;const material=i%2?white:metal;b.add(new T.CylinderGeometry(r,r,h,32),material,V(x,h/2,z));for(const yy of [0,h])b.add(new T.SphereGeometry(r,24,12),material,V(x,yy,z),new T.Quaternion(),V(1,.38,1));b.pipe(V(x,1,z),V(x,1,-10),.17,metal,12);b.pipe(V(x,1,-10),V(-12,1,-10),.17,metal,12);b.box(12,.6,19,concrete,x,-.4,z);}
 for(let i=0;i<8;i++){const x=95+i%4*40,z=-100-Math.floor(i/4)*70;b.box(27,6+i%3*2,18,white,x,3+i%3,z,.12);b.box(29,.2,20,metal,x,6+i%3*2+.1,z);for(let j=0;j<5;j++)b.box(2.1,1.5,.06,blue,x-10+j*5,3,z+9.05);}
 // Baffled ducts, power boxes and perimeter fencing give scale to the pad.
 for(let i=0;i<8;i++){const angle=i/8*Math.PI*2,x=Math.cos(angle)*25,z=Math.sin(angle)*25;b.box(1.4,1.7,.75,blue,x,.85,z,.05);b.pipe(V(x,.15,z),V(x*.75,.15,z*.75),.05,dark);}
 for(const z of [-58,58]){b.pipe(V(-58,2,z),V(58,2,z),.025,steel);for(let x=-58;x<=58;x+=4)b.pipe(V(x,0,z),V(x,2.3,z),.035,steel);}
 const group=b.finish();group.name='Launch Complex';group.userData.facility=true;
 const stripe=safetyStripe(32,.65);stripe.position.set(0,.03,26);group.add(stripe);
 const sign=label('MERIDIAN','LAUNCH COMPLEX 01',8,2,'#d5d2bd');sign.position.set(tx,46,tz+2.5);group.add(sign);
 const deck=new T.Mesh(new T.CylinderGeometry(3.6,3.6,.04,64),s.get('metal',{color:'#555f63',roughness:.8}));deck.position.y=-.045;deck.receiveShadow=true;group.add(deck);
 return group;
}
export function buildTransportCradle(s:SurfaceLibrary,diameter:number){const b=new Fabricator(),steel=s.get('grating'),dark=s.get('rubber'),yellow=s.get('paint',{color:'#ac9859'}),radius=diameter/2+.18;for(let i=0;i<4;i++){const a=i/4*Math.PI*2,x=Math.cos(a)*(radius+.7),z=Math.sin(a)*(radius+.7);b.box(.6,.2,.6,steel,x,-.47,z);b.box(.18,2.7,.18,yellow,x,.9,z);b.beam(V(x,2.2,z),V(Math.cos(a)*radius,2.3,Math.sin(a)*radius),.13,steel);b.box(.5,.18,.5,dark,Math.cos(a)*radius,2.28,Math.sin(a)*radius);b.beam(V(x,-.35,z),V(Math.cos(a+Math.PI/2)*(radius+.7),-.35,Math.sin(a+Math.PI/2)*(radius+.7)),.15,steel);}const group=b.finish();group.name='Workshop transport cradle';return group;}

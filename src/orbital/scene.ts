import { assetURL } from './assets';
import { SurfaceLibrary } from './surfaces';
import { buildWorkshop, buildLaunchComplex, buildTransportCradle } from './facilities';
import { buildCoastalLandscape } from './landscape';
import { PhysicalSky, SurfaceAtmospherePass } from './aerial';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { assembledTanks } from './parts';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { EARTH, FUELS, MATERIALS, cross, dot, engineSpec, engineMountLayout, fuelMass, length, mul, stageHeight, fairingPart, unit, vehicleHeight, type V3, type Vehicle } from './model';
import { altitude3D, launchPosition, orbitState, type Flight3D } from './simulation';
const K=.001;
const vec=(v:V3)=>new T.Vector3(...v);
const UP=new T.Vector3(0,1,0);
const SUN=new T.Vector3(.7,.6,-.3).normalize();
function mesh(geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function box(w:number,h:number,d:number,material:T.Material,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),material,x,y,z);}
function cyl(rt:number,rb:number,h:number,material:T.Material,y=0,segments=48){return mesh(new T.CylinderGeometry(rt,rb,h,segments),material,0,y);}
function dispose(root:T.Object3D){const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});geos.forEach(g=>g.dispose());mats.forEach(m=>{if(m.userData.sharedSurface)return;for(const v of Object.values(m))if(v instanceof T.Texture&&v.userData.owned)v.dispose();m.dispose();});root.clear();}
function canvasTexture(w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d')!);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.userData.owned=true;return texture;}
const plumeVertex=`varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`;
const plumeFragment=`varying vec2 vUv;uniform float uTime;uniform vec3 uColor;
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
float flame=pow(vUv.y,.7);float streak=.65+.25*sin(vUv.y*90.-uTime*37.)+.1*sin(vUv.x*70.+uTime*21.);float side=pow(max(0.,sin(vUv.x*3.14159265)),.35);vec3 color=mix(uColor,vec3(2.5,2.,1.3),pow(vUv.y,3.));gl_FragColor=vec4(color,flame*side*streak*.74);}`;
export class OrbitalScene {
 readonly renderer:T.WebGLRenderer;readonly camera:T.PerspectiveCamera;readonly controls:OrbitControls;
 readonly scene=new T.Scene();private composer:EffectComposer;private bloom:UnrealBloomPass;private surfaces=new SurfaceLibrary();private physicalSky!:PhysicalSky;private atmospherePass!:SurfaceAtmospherePass;private fxaa!:ShaderPass;private indoorEnv!:T.WebGLRenderTarget;private outdoorEnv!:T.WebGLRenderTarget;private hemisphere!:T.HemisphereLight;private rimLight!:T.DirectionalLight;private panelLights=new T.Group();private groundLandscape=new T.Group();private cradle=new T.Group();
 private rocket=new T.Group();private stageGroups:T.Group[]=[];private flames:T.Mesh[][]=[];private shellMaterials:T.MeshPhysicalMaterial[]=[];
 private hangar=new T.Group();private ground=new T.Group();private planet=new T.Group();private atmosphere:T.Mesh;private cloud:T.Mesh;private stars:T.Points;
 private sky:T.Mesh;private trackLine:T.Line;private predictLine:T.Line;private detached:T.Group[]=[];private smoke:T.Sprite[]=[];
 private sunLight:T.DirectionalLight;private engineLight:T.PointLight;private raycaster=new T.Raycaster();private lastPointer=[0,0];
 private current:Vehicle;private selected=0;private cutaway=false;private mode:'workshop'|'flight'='workshop';private cameraMode='chase';private reportScale=1;
 private mark=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:'#f7b47c',depthTest:false}));
 private previousUp=new T.Vector3(0,1,0);private fps=60;private frames=0;private fpsTime=performance.now();private resizeObserver:ResizeObserver;
 private lastPathCount=-1;private lastPrediction=-999;private lastActive=-1;
 onSelect:(index:number)=>void=()=>{};
 constructor(readonly canvas:HTMLCanvasElement,vehicle:Vehicle){
  this.current=structuredClone(vehicle);
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.78;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  this.camera=new T.PerspectiveCamera(40,1,.00025,250000);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.minDistance=.012;this.controls.maxDistance=.35;this.controls.maxPolarAngle=Math.PI*.92;
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.03);this.indoorEnv=env;this.scene.environment=env.texture;this.scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
  this.scene.add(new T.AmbientLight('#b6cce0',.035));this.hemisphere=new T.HemisphereLight('#c4d9df','#6b6451',.35);this.scene.add(this.hemisphere);RectAreaLightUniformsLib.init();for(const x of [-.013,.013]){const light=new T.RectAreaLight('#d7e7ed',5,.003,.016);light.position.set(x,.017,.006);light.lookAt(0,.016,0);this.panelLights.add(light);}this.scene.add(this.panelLights);this.sunLight=new T.DirectionalLight('#ffe0bb',3.1);this.sunLight.position.copy(SUN).multiplyScalar(30);this.sunLight.castShadow=true;this.sunLight.shadow.mapSize.set(2048,2048);this.sunLight.shadow.camera.left=-.065;this.sunLight.shadow.camera.right=.065;this.sunLight.shadow.camera.top=.085;this.sunLight.shadow.camera.bottom=-.025;this.sunLight.shadow.camera.near=.001;this.sunLight.shadow.camera.far=.6;this.sunLight.shadow.bias=-.000002;this.sunLight.shadow.normalBias=.000025;this.sunLight.shadow.camera.updateProjectionMatrix();this.scene.add(this.sunLight,this.sunLight.target);
  const rim=this.rimLight=new T.DirectionalLight('#a9d2ed',.45);rim.position.set(-2,.5,-1);this.scene.add(rim);
  this.engineLight=new T.PointLight('#ff9e4f',0,.12,1);this.engineLight.position.y=.003;this.scene.add(this.engineLight);
  this.buildHangar();this.buildGround();
  const loader=new T.TextureLoader();const earthMap=loader.load(assetURL('/textures/earth.jpg'));earthMap.colorSpace=T.SRGBColorSpace;earthMap.anisotropy=8;
  const spec=loader.load(assetURL('/textures/earth-specular.jpg'));
  const earth=mesh(new T.SphereGeometry(EARTH.radius*K,192,128),new T.MeshPhongMaterial({map:earthMap,specularMap:spec,specular:new T.Color('#789cac'),shininess:22}));earth.rotation.x=-Math.PI/2;earth.castShadow=false;earth.receiveShadow=false;this.planet.add(earth);
  const cloudMap=loader.load(assetURL('/textures/clouds.png'));cloudMap.colorSpace=T.SRGBColorSpace;
  this.cloud=mesh(new T.SphereGeometry((EARTH.radius+6500)*K,160,100),new T.MeshPhongMaterial({map:cloudMap,alphaMap:cloudMap,color:'#ffffff',transparent:true,opacity:.68,depthWrite:false,side:T.DoubleSide}));this.cloud.rotation.x=-Math.PI/2;this.cloud.castShadow=false;this.cloud.receiveShadow=false;this.planet.add(this.cloud);
  const atmosphereMaterial=new T.ShaderMaterial({uniforms:{uSun:{value:SUN}},vertexShader:`varying vec3 vNormal;varying vec3 vView;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){vec4 wp=modelMatrix*vec4(position,1.);vNormal=normalize(mat3(modelMatrix)*normal);vView=normalize(cameraPosition-wp.xyz);gl_Position=projectionMatrix*viewMatrix*wp;
#include <logdepthbuf_vertex>
}`,fragmentShader:`varying vec3 vNormal;varying vec3 vView;uniform vec3 uSun;
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.5);float day=smoothstep(-.18,.65,dot(normalize(vNormal),uSun));vec3 col=mix(vec3(.02,.08,.25),vec3(.22,.52,1.),day);gl_FragColor=vec4(col,rim*(.13+.4*day));}`,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.BackSide});
  this.atmosphere=mesh(new T.SphereGeometry((EARTH.radius+35000)*K,160,100),atmosphereMaterial);this.atmosphere.castShadow=false;this.atmosphere.receiveShadow=false;this.planet.add(this.atmosphere);this.scene.add(this.planet);
  const starPos=new Float32Array(4000*3);for(let i=0;i<4000;i++){const z=2*hash(i*3+2)-1,a=hash(i*3+1)*Math.PI*2,r=Math.sqrt(1-z*z);starPos.set([r*Math.cos(a)*85000,z*85000,r*Math.sin(a)*85000],i*3);}const starsGeo=new T.BufferGeometry();starsGeo.setAttribute('position',new T.BufferAttribute(starPos,3));this.stars=new T.Points(starsGeo,new T.PointsMaterial({color:'#d4e4ff',size:1.1,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false}));this.stars.renderOrder=-3;this.scene.add(this.stars);
  this.physicalSky=new PhysicalSky(SUN);this.surfaces.weatherUniforms.uWeather.value=this.physicalSky.noise;this.sky=this.physicalSky.mesh;this.scene.add(this.sky);this.outdoorEnv=this.physicalSky.environment(this.renderer,SUN);
  this.trackLine=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#e9a15f',transparent:true,opacity:.8}));this.predictLine=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#98c9bd',transparent:true,opacity:.62}));this.scene.add(this.trackLine,this.predictLine,this.mark);this.mark.visible=false;
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});this.composer=new EffectComposer(this.renderer,target);this.composer.addPass(new RenderPass(this.scene,this.camera));this.atmospherePass=new SurfaceAtmospherePass(this.camera);this.composer.addPass(this.atmospherePass);this.bloom=new UnrealBloomPass(new T.Vector2(1,1),.15,.35,2.0);this.composer.addPass(this.bloom);this.fxaa=new ShaderPass(FXAAShader);this.composer.addPass(this.fxaa);this.composer.addPass(new OutputPass());
  canvas.addEventListener('pointerdown',e=>{this.lastPointer=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(this.mode!=='workshop'||Math.hypot(e.clientX-this.lastPointer[0],e.clientY-this.lastPointer[1])>5)return;const r=canvas.getBoundingClientRect();this.raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=this.raycaster.intersectObjects(this.rocket.children,true).find(x=>x.object.userData.stage!==undefined);if(hit)this.onSelect(hit.object.userData.stage);});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canvas.dispatchEvent(new CustomEvent('rendererror',{detail:'WebGL 上下文丢失。请刷新页面恢复，飞行进度已自动保存。'}));});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();this.setVehicle(vehicle);this.workshop();
 }
 private buildHangar(){this.hangar=buildWorkshop(this.surfaces);this.hangar.scale.setScalar(K);this.scene.add(this.hangar);}
 private buildGround(){this.groundLandscape=buildCoastalLandscape(this.surfaces);this.ground.add(this.groundLandscape,buildLaunchComplex(this.surfaces));
  const smokeTexture=canvasTexture(64,64,c=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(215,211,201,.45)');g.addColorStop(1,'rgba(180,180,180,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
  for(let i=0;i<56;i++){const p=new T.Sprite(new T.SpriteMaterial({map:smokeTexture,transparent:true,opacity:0,depthWrite:false,color:'#ddd9cf'}));this.smoke.push(p);this.ground.add(p);}this.ground.scale.setScalar(K);this.scene.add(this.ground);
 }
 setVehicle(vehicle:Vehicle){
  this.scene.remove(this.cradle);dispose(this.cradle);this.cradle=buildTransportCradle(this.surfaces,vehicle.stages[0].diameter);this.cradle.scale.setScalar(K);this.cradle.visible=this.mode==='workshop';this.scene.add(this.cradle);this.current=structuredClone(vehicle);this.detached.forEach(g=>this.scene.remove(g));this.detached=[];this.lastPrediction=-999;this.scene.remove(this.rocket);dispose(this.rocket);this.rocket=new T.Group();this.stageGroups=[];this.flames=[];this.shellMaterials=[];
  let y=0;
  vehicle.stages.forEach((s,index)=>{
   const group=new T.Group();group.position.y=y;const r=s.diameter/2,h=stageHeight(s),bodyBottom=2.3+s.diameter*.175;
   const shell=this.surfaces.paint(s.material);this.shellMaterials.push(shell);
   const metal=this.surfaces.get('metal'),black=this.surfaces.get('rubber'),copper=this.surfaces.get('copper'),seam=this.surfaces.get('metal',{color:'#b7c1c2',roughness:.4});
   const main=cyl(r,r,s.tankLength,shell,bodyBottom+s.tankLength/2,64);main.visible=!assembledTanks(s).length;group.add(main);
   for(const top of [false,true]){const dome=mesh(new T.SphereGeometry(r,48,24),shell,0,top?bodyBottom+s.tankLength:bodyBottom);dome.scale.y=.35;dome.visible=!assembledTanks(s).length;group.add(dome);}
   for(let j=0;j<=Math.ceil(s.tankLength/3);j++){const ring=new T.Mesh(new T.TorusGeometry(r+.008,.014,6,64),seam);ring.rotation.x=Math.PI/2;ring.position.y=bodyBottom+j*s.tankLength/Math.ceil(s.tankLength/3);ring.visible=!assembledTanks(s).length;group.add(ring);}
   group.add(cyl(r*1.015,r*1.015,.48,black,2.3),cyl(r*1.005,r*1.005,.25,black,h-.2));
   const parts=assembledTanks(s),segments=parts.length?parts:[{diameter:s.diameter,length:s.tankLength,name:'定制储箱'}];
   let segmentY=2.3;
   for(let pi=0;pi<segments.length;pi++){
    const part=segments[pi],sr=part.diameter/2,base=segmentY+part.diameter*.175;
    if(pi>0)group.add(cyl(sr*.998,sr*.998,part.diameter*.35,shell,segmentY,64));
    if(parts.length){group.add(cyl(sr,sr,part.length,shell,base+part.length/2,64));for(const edge of [base,base+part.length]){const dome=mesh(new T.SphereGeometry(sr,48,24),shell,0,edge);dome.scale.y=.35;group.add(dome);}const band=cyl(sr*1.008,sr*1.008,.16,black,segmentY+.08,64);group.add(band);for(let j=0;j<Math.ceil(part.length/3)+1;j++){const ring=new T.Mesh(new T.TorusGeometry(sr+.01,.012,6,64),seam);ring.rotation.x=Math.PI/2;ring.position.y=base+j*part.length/Math.ceil(part.length/3);group.add(ring);}}
    const fuelDensity=s.fuel==='hydrolox'?70.8:s.fuel==='methalox'?422:810,oxVolume=(FUELS[s.fuel].oxidizer/1141)/(FUELS[s.fuel].oxidizer/1141+1/fuelDensity);
    const fuelH=part.length*(1-oxVolume)*s.fill,oxH=part.length*oxVolume*s.fill;
    const fuelMat=new T.MeshPhysicalMaterial({color:FUELS[s.fuel].color,transparent:true,opacity:.6,metalness:.12,roughness:.25,depthWrite:false});
    const liquid=cyl(sr*.94,sr*.94,fuelH,fuelMat,base+fuelH/2,48);liquid.name='propellant';liquid.visible=this.cutaway;liquid.userData.base=base;liquid.userData.fullHeight=fuelH;group.add(liquid);
    const oxBase=base+part.length*(1-oxVolume),oxMat=new T.MeshStandardMaterial({color:'#85c5ed',metalness:.3,roughness:.3,transparent:true,opacity:.6});const oxidizer=cyl(sr*.945,sr*.945,oxH,oxMat,oxBase+oxH/2,48);oxidizer.name='oxidizer';oxidizer.visible=this.cutaway;oxidizer.userData.base=oxBase;oxidizer.userData.fullHeight=oxH;group.add(oxidizer);
    segmentY+=part.length+part.diameter*.35;
   }
   const fastenerCount=24*segments.length,fasteners=new T.InstancedMesh(new T.CylinderGeometry(.018,.018,.025,6),metal,fastenerCount),boltObject=new T.Object3D();let boltIndex=0,ringY=2.3;
   for(const segment of segments){ringY+=segment.length+segment.diameter*.35;for(let bolt=0;bolt<24;bolt++){const a=bolt/24*Math.PI*2;boltObject.position.set(Math.cos(a)*(r+.012),ringY-.16,Math.sin(a)*(r+.012));boltObject.quaternion.setFromUnitVectors(UP,new T.Vector3(Math.cos(a),0,Math.sin(a)));boltObject.updateMatrix();fasteners.setMatrixAt(boltIndex++,boltObject.matrix);}}group.add(fasteners);
   const feed=mesh(new T.CylinderGeometry(.045,.045,s.tankLength+1.3,10),copper,r*.95,bodyBottom+s.tankLength/2,.2);group.add(feed);
   const e=engineSpec(s),centres=engineMountLayout(s).positions;const jets:T.Mesh[]=[];
   for(const [x,z]of centres){const engine=new T.Group();engine.position.set(x,0,z);engine.add(cyl(.18,.22,.6,metal,1.92),cyl(.17,.17,.5,copper,1.55));
    const bellProfile:T.Vector2[]=[];for(let k=0;k<=70;k++){const t=k/70,rad=.12+(e.diameter*.5-.12)*Math.pow(t,.73)+Math.sin(t*Math.PI*96)*.0025;bellProfile.push(new T.Vector2(rad,1.65*(1-t)+.06));}const bell=mesh(new T.LatheGeometry(bellProfile,36),this.surfaces.get('metal',{color:'#7c8589',metalness:.94,roughness:.4,side:T.DoubleSide}));engine.add(bell);
    const sootProfile=bellProfile.map(p=>new T.Vector2(Math.max(.08,p.x-.015),p.y+.005));const soot=mesh(new T.LatheGeometry(sootProfile,40),this.surfaces.get('rubber',{color:'#343b3e',side:T.DoubleSide,roughness:.93}));engine.add(soot);
    const pump=mesh(new T.SphereGeometry(.17,18,12),metal,.27,1.97,.08);pump.scale.set(1,1.35,1);engine.add(pump);engine.add(box(.36,.14,.38,metal,0,2.27,0));
    for(const side of [-1,1]){const curve=new T.CatmullRomCurve3([new T.Vector3(side*.2,2.35,.06),new T.Vector3(side*.37,2.05,.1),new T.Vector3(side*.29,1.55,.16),new T.Vector3(side*.17,1.39,.06)]);engine.add(mesh(new T.TubeGeometry(curve,24,.026,7,false),copper));const rodA=new T.Vector3(side*.28,2.12,-.12),rodB=new T.Vector3(side*.18,1.25,-.07),dir=rodB.clone().sub(rodA),actuator=mesh(new T.CylinderGeometry(.032,.032,dir.length(),10),metal);actuator.position.copy(rodA.add(rodB).multiplyScalar(.5));actuator.quaternion.setFromUnitVectors(UP,dir.normalize());engine.add(actuator);}
    for(let bolt=0;bolt<8;bolt++){const a=bolt/8*Math.PI*2,head=mesh(new T.CylinderGeometry(.022,.022,.04,6),metal,Math.cos(a)*.2,2.35,Math.sin(a)*.2);engine.add(head);}
    const lip=new T.Mesh(new T.TorusGeometry(e.diameter*.5,.018,6,48),copper);lip.rotation.x=Math.PI/2;lip.position.y=.06;engine.add(lip);
    for(let j=0;j<4;j++){const ring=new T.Mesh(new T.TorusGeometry(.15+j*.04,.018,5,28),copper);ring.rotation.x=Math.PI/2;ring.position.y=1.6-j*.13;engine.add(ring);}
    const jet=new T.Mesh(new T.ConeGeometry(e.diameter*.65,8,32,1,true),new T.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:new T.Color(s.fuel==='hydrolox'?'#72b8ff':s.fuel==='methalox'?'#83bcff':'#ff9f50')}},vertexShader:plumeVertex,fragmentShader:plumeFragment,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false}));jet.position.y=-3.9;jet.visible=false;engine.add(jet);jets.push(jet);group.add(engine);
   }this.flames.push(jets);
   if(s.fins){for(let j=0;j<4;j++){const finGeo=new T.BufferGeometry();finGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,3.8,0,0,0,1.8],3));finGeo.computeVertexNormals();const fin=mesh(finGeo,new T.MeshStandardMaterial({color:'#89969a',metalness:.8,roughness:.35,side:T.DoubleSide}));fin.position.set(Math.cos(j*Math.PI/2)*r,2.7,Math.sin(j*Math.PI/2)*r);fin.rotation.y=-j*Math.PI/2;group.add(fin);}}
   const label=canvasTexture(512,1024,c=>{c.clearRect(0,0,512,1024);c.fillStyle='#283945';c.font='600 90px sans-serif';c.save();c.translate(230,850);c.rotate(-Math.PI/2);c.fillText('MERIDIAN',0,0);c.restore();c.fillStyle='#dc8b4e';c.fillRect(155,130,200,20);c.font='36px monospace';c.fillText(`0${index+1} / GTM`,130,930);});const decal=mesh(new T.CylinderGeometry(r+.009,r+.009,Math.min(s.tankLength*.82,10),48,1,true,.15,1.25),new T.MeshStandardMaterial({map:label,transparent:true,depthWrite:false,roughness:.6}),0,bodyBottom+s.tankLength*.5);group.add(decal);
   if(index<vehicle.stages.length-1){const next=vehicle.stages[index+1];const interstage=cyl(next.diameter*.51,r,2.2+s.diameter*.175,black,h+1.1-s.diameter*.0875,64);group.add(interstage);for(let k=0;k<16;k++){const angle=k/16*Math.PI*2;const rib=box(.035,1.9,.035,metal,Math.cos(angle)*r,h+1.05,Math.sin(angle)*r);group.add(rib);}}
   group.traverse(o=>o.userData.stage=index);this.rocket.add(group);this.stageGroups.push(group);y+=h;
  });
  const stageTopR=vehicle.stages.at(-1)!.diameter/2,topR=fairingPart(vehicle).diameter/2;
  const payload=new T.Group();payload.position.y=y;payload.name='payload';const gold=new T.MeshStandardMaterial({color:'#c3a05c',metalness:.8,roughness:.4});payload.add(cyl(topR*.75,topR*.75,3.5,gold,2.1));const dark=new T.MeshStandardMaterial({color:'#172731',metalness:.55,roughness:.4});for(let i=0;i<4;i++){const solar=box(.12,2.8,1.2,dark,Math.cos(i*Math.PI/2)*(topR*.8),2,Math.sin(i*Math.PI/2)*(topR*.8));solar.rotation.y=i*Math.PI/2;payload.add(solar);}this.rocket.add(payload);
  const fairing=new T.Group();fairing.name='fairing';fairing.position.y=y;
  const fairMat=new T.MeshPhysicalMaterial({color:'#e8eae3',metalness:.35,roughness:.37,clearcoat:.3});const profile=[new T.Vector2(topR,0),new T.Vector2(topR*1.05,.3),new T.Vector2(topR*1.05,3.4),new T.Vector2(topR*.95,4.5),new T.Vector2(topR*.7,5.3),new T.Vector2(topR*.38,5.9),new T.Vector2(.04,6.3)];const cover=mesh(new T.LatheGeometry(profile,64),fairMat);cover.scale.y=fairingPart(vehicle).height/6.3;fairing.add(cover);fairing.add(cyl(topR,stageTopR,.45,fairMat,.22,64));fairing.visible=vehicle.fairing;this.rocket.add(fairing);
  this.rocket.scale.setScalar(K);this.scene.add(this.rocket);this.applySelection();this.setCutaway(this.cutaway);this.lastActive=-1;this.lastPathCount=-1;
 }
 inspectEngine(){if(this.mode!=='workshop')return;const base=this.current.stages.slice(0,this.selected).reduce((sum,s)=>sum+stageHeight(s),0)*K;this.controls.minDistance=.003;this.controls.target.set(0,base+.001,0);this.camera.position.set(.008,base-.0002,.012);this.controls.update();}
 setSelected(index:number){this.selected=index;this.applySelection();}
 private applySelection(){this.shellMaterials.forEach((m,i)=>{m.emissive.set(i===this.selected&&this.mode==='workshop'?'#182d35':'#000000');m.emissiveIntensity=i===this.selected?.3:0;});}
 setCutaway(value:boolean){this.cutaway=value;this.shellMaterials.forEach(m=>{m.transparent=value;m.opacity=value?.17:1;m.depthWrite=!value;});this.rocket.traverse(o=>{if(o.name==='propellant'||o.name==='oxidizer')o.visible=value;});const fair=this.rocket.getObjectByName('fairing');if(fair)fair.visible=this.current.fairing&&!value;}
 workshop(){this.surfaces.weatherUniforms.uWeatherEnabled.value=0;this.cradle.visible=true;this.mode='workshop';this.hangar.visible=true;this.ground.visible=false;this.planet.visible=false;this.sky.visible=false;this.stars.visible=false;this.trackLine.visible=false;this.predictLine.visible=false;this.mark.visible=false;this.detached.forEach(g=>g.visible=false);this.scene.background=new T.Color('#202c34');this.rocket.position.set(0,0,0);this.rocket.quaternion.identity();this.stageGroups.forEach(g=>g.visible=true);this.flames.flat().forEach(m=>m.visible=false);this.controls.maxDistance=.3;this.controls.minDistance=.015;const height=vehicleHeight(this.current)*K;this.controls.target.set(0,height*.48,0);this.camera.up.copy(UP);this.camera.position.set(.054,height*.64,.078);this.controls.update();this.sunLight.position.set(.1,.15,.08);this.sunLight.target.position.set(0,height*.4,0);this.sunLight.intensity=1.4;this.scene.environment=this.indoorEnv.texture;this.scene.environmentIntensity=.5;this.hemisphere.intensity=.2;this.hemisphere.position.copy(UP);this.hemisphere.color.set('#c4d9df');this.hemisphere.groundColor.set('#6b6451');this.rimLight.intensity=.45;this.panelLights.visible=true;this.atmospherePass.uniforms.uOutdoor.value=0;this.engineLight.intensity=0;this.applySelection();}
 enterFlight(f:Flight3D){this.cradle.visible=false;this.mode='flight';this.applySelection();this.panelLights.visible=false;this.scene.environment=this.outdoorEnv.texture;this.hemisphere.intensity=.55;this.rimLight.intensity=0;this.atmospherePass.uniforms.uOutdoor.value=1;this.cameraMode='chase';this.hangar.visible=false;this.planet.visible=true;this.sky.visible=true;this.stars.visible=true;this.scene.background=new T.Color('#01040a');this.controls.minDistance=.012;this.controls.maxDistance=100000;this.lastActive=-1;this.setCutaway(false);this.updateFlight(f,0);this.resetCamera(f);}
 setCameraMode(mode:string,f?:Flight3D){this.cameraMode=mode;if(f)this.resetCamera(f);else this.workshop();}
 private resetCamera(f:Flight3D){const up=vec(unit(f.r)),east=vec(unit(cross([0,0,-1],unit(f.r)))),north=new T.Vector3().crossVectors(up,east).normalize(),target=vec(f.axis).multiplyScalar(vehicleHeight(f.vehicle,f.active)*K*.45);this.camera.up.copy(up);this.controls.target.copy(target);this.previousUp.copy(up);
  if(this.cameraMode==='orbit'){const centre=vec(f.r).multiplyScalar(-K);this.controls.target.copy(centre);const offset=east.multiplyScalar(.8).addScaledVector(north,.3).addScaledVector(up,.5).normalize().multiplyScalar(EARTH.radius*K*4);this.camera.position.copy(centre).add(offset);this.controls.update();return;}
  const dist=this.cameraMode==='orbit'?length(f.r)*K*2.35:this.cameraMode==='wide'?.28:.09;
  this.camera.position.copy(target).addScaledVector(east,dist*(this.cameraMode==='wide'?-.9:.85)).addScaledVector(north,dist*.52).addScaledVector(up,dist*(this.cameraMode==='orbit'?.5:.16));this.controls.update();this.reportScale=dist;
 }
 updateFlight(f:Flight3D,realTime:number){
  if(this.mode!=='flight')return;
  const h=altitude3D(f),up=vec(unit(f.r));this.rocket.quaternion.setFromUnitVectors(UP,vec(f.axis));
  if(f.active!==this.lastActive){const offset=f.vehicle.stages.slice(0,f.active).reduce((sum,s)=>sum+stageHeight(s),0);this.rocket.position.copy(vec(f.axis).multiplyScalar(-offset*K));this.stageGroups.forEach((g,i)=>g.visible=i>=f.active);this.lastActive=f.active;
   if(this.cameraMode!=='orbit'){const target=vec(f.axis).multiplyScalar(vehicleHeight(f.vehicle,f.active)*K*.45);const delta=target.clone().sub(this.controls.target);this.controls.target.copy(target);this.camera.position.add(delta);}
  }else{const offset=f.vehicle.stages.slice(0,f.active).reduce((sum,s)=>sum+stageHeight(s),0);this.rocket.position.copy(vec(f.axis).multiplyScalar(-offset*K));}
  const fair=this.rocket.getObjectByName('fairing');if(fair)fair.visible=f.vehicle.fairing&&!f.fairingGone;
  const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-EARTH.omega*(f.time+8));
  this.planet.position.copy(vec(f.r).multiplyScalar(-K));this.planet.quaternion.copy(rotation);
  this.cloud.rotation.y=f.time*.000002;
  const launch=vec(launchPosition()).applyQuaternion(rotation);this.ground.position.copy(launch.sub(vec(f.r)).multiplyScalar(K));this.ground.quaternion.setFromUnitVectors(UP,vec(unit(launchPosition())).applyQuaternion(rotation));this.ground.visible=h<145000;this.ground.traverse(o=>{if(o.userData.vegetation)o.visible=h<12000;if(o.userData.facility)o.visible=h<45000;if(o.name==='coastalWater')((o as T.Mesh).material as T.ShaderMaterial).uniforms.uTime.value=f.time;});
  this.sunLight.position.copy(SUN).multiplyScalar(.2);this.sunLight.target.position.set(0,.015,0);this.sunLight.intensity=2.5;this.scene.environment=h<100000?this.outdoorEnv.texture:null;this.scene.environmentIntensity=1.0*Math.exp(-h/45000);this.hemisphere.position.copy(up);this.hemisphere.color.set(h>100000?'#050a14':'#c4dae2');this.hemisphere.groundColor.set(h>100000?'#506777':'#847d60');this.hemisphere.intensity=h>100000?.14:.8;
  this.surfaces.weatherUniforms.uWeatherEnabled.value=h<12000?1:0;this.surfaces.weatherUniforms.uWorldOrigin.value.copy(vec(f.r).multiplyScalar(K));this.surfaces.weatherUniforms.uTime.value=f.time;this.physicalSky.update(vec(f.r).multiplyScalar(K),this.camera,f.time);this.atmospherePass.uniforms.uHeight.value=h;this.atmospherePass.uniforms.uUp.value.copy(up);(this.stars.material as T.PointsMaterial).opacity=clamp01((h-45000)/70000)*.7;

  this.stageGroups.forEach((group,i)=>group.traverse(o=>{if(o.name==='propellant'||o.name==='oxidizer'){const remaining=f.fuels[i]/Math.max(1,fuelMass(f.vehicle.stages[i]));o.scale.y=Math.max(.001,remaining);o.position.y=o.userData.base+o.userData.fullHeight*remaining/2;}}));
  this.flames.forEach((jets,i)=>jets.forEach(jet=>{jet.visible=i===f.active&&f.currentThrust>1000&&f.phase!=='failed';const mat=jet.material as T.ShaderMaterial;mat.uniforms.uTime.value=f.time;const vacuum=clamp01(h/90000);jet.scale.set(1+vacuum*1.7,.55+f.throttle*1.1,1+vacuum*1.7);jet.position.y=-3.9*jet.scale.y;}));
  this.engineLight.intensity=f.currentThrust>1000?f.throttle*.035:0;this.engineLight.position.copy(vec(f.axis).multiplyScalar(.002));
  while(this.detached.length<f.debris.length){const d=f.debris[this.detached.length],clone=this.stageGroups[d.stage].clone(true);clone.position.set(0,0,0);clone.scale.setScalar(K);clone.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.ShaderMaterial)o.visible=false;});this.detached.push(clone);this.scene.add(clone);}
  f.debris.forEach((d,i)=>{const group=this.detached[i];group.visible=true;group.position.copy(vec(d.r).sub(vec(f.r)).multiplyScalar(K));group.quaternion.setFromUnitVectors(UP,vec(d.axis));group.rotateX((f.time-d.separatedAt)*.055);});
  if(f.time>0&&f.time<24&&h<250){this.smoke.forEach((p,i)=>{const age=(f.time+i*.53)%13,size=5+age*2.6;p.position.set(Math.sin(i*8.4)*age*4,2+age*.9,Math.cos(i*4.2)*age*3);p.scale.set(size,size,1);(p.material as T.SpriteMaterial).opacity=(1-age/13)*.38;});}else this.smoke.forEach(p=>(p.material as T.SpriteMaterial).opacity=0);
  const orbital=this.cameraMode==='orbit';this.mark.visible=orbital;this.mark.position.set(0,0,0);this.mark.scale.setScalar(orbital?Math.max(6,this.camera.position.distanceTo(this.controls.target)*.002):.001);
  this.trackLine.visible=f.path.length>2&&(orbital||h>6000);this.predictLine.visible=orbital;
  if(this.lastPathCount!==f.path.length||orbital){this.trackLine.geometry.dispose();this.trackLine.geometry=new T.BufferGeometry().setFromPoints(f.path.map(p=>vec(p).sub(vec(f.r)).multiplyScalar(K)));this.lastPathCount=f.path.length;}
  if(orbital&&f.time-this.lastPrediction>2){this.lastPrediction=f.time;this.drawPrediction(f);}
  if(orbital){const centre=vec(f.r).multiplyScalar(-K),change=centre.clone().sub(this.controls.target);this.camera.position.add(change);this.controls.target.copy(centre);}else{const target=vec(f.axis).multiplyScalar(vehicleHeight(f.vehicle,f.active)*K*.45);const offset=this.camera.position.clone().sub(this.controls.target);offset.applyQuaternion(new T.Quaternion().setFromUnitVectors(this.previousUp,up));this.controls.target.copy(target);this.camera.position.copy(target).add(offset);}
  this.previousUp.copy(up);this.camera.up.copy(up);
  if(this.cameraMode==='cinema'){const offset=this.camera.position.clone().sub(this.controls.target);offset.applyAxisAngle(up,.0008);this.camera.position.copy(this.controls.target).add(offset);}
  this.controls.update();void realTime;
 }
 private drawPrediction(f:Flight3D){
  const r=vec(f.r),v=vec(f.v),h=new T.Vector3().crossVectors(r,v),evec=new T.Vector3().crossVectors(v,h).divideScalar(EARTH.mu).sub(r.clone().normalize()),ecc=evec.length(),a=ecc>1e-5?evec.clone().normalize():r.clone().normalize(),b=new T.Vector3().crossVectors(h.clone().normalize(),a),p=h.lengthSq()/EARTH.mu,pts:T.Vector3[]=[];
  for(let i=0;i<=360;i++){const theta=i/360*Math.PI*2,den=1+ecc*Math.cos(theta),radius=p/Math.max(.001,den);if(den<=0||radius>EARTH.radius*12)continue;pts.push(a.clone().multiplyScalar(radius*Math.cos(theta)).addScaledVector(b,radius*Math.sin(theta)).sub(r).multiplyScalar(K));}
  this.predictLine.geometry.dispose();this.predictLine.geometry=new T.BufferGeometry().setFromPoints(pts);(this.predictLine.material as T.LineBasicMaterial).color.set(orbitState(f.r,f.v).peri>140000?'#a3d6b8':'#dca16f');
 }
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);if(this.composer)this.composer.setSize(w,h);if(this.fxaa)this.fxaa.uniforms.resolution.value.set(1/(w*this.renderer.getPixelRatio()),1/(h*this.renderer.getPixelRatio()));if(this.atmospherePass)this.atmospherePass.uniforms.uResolution.value.set(w*this.renderer.getPixelRatio(),h*this.renderer.getPixelRatio());}
 render(){this.controls.update();if(this.mode==='flight')this.scene.background=this.physicalSky.background(this.renderer,this.camera);this.composer.render();this.frames++;const now=performance.now();if(now-this.fpsTime>1000){this.fps=this.frames*1000/(now-this.fpsTime);this.frames=0;this.fpsTime=now;}this.canvas.dataset.renderer='webgl2';this.canvas.dataset.textures=this.surfaces.failed?'error':this.surfaces.pending?'loading':'ready';this.canvas.dataset.fps=String(Math.round(this.fps));}
 stats(){return {fps:this.fps,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,webgl:this.renderer.getContext().getParameter(this.renderer.getContext().VERSION)};}
 destroy(){this.resizeObserver.disconnect();this.controls.dispose();this.composer.dispose();dispose(this.scene);this.indoorEnv.dispose();this.outdoorEnv.dispose();this.surfaces.dispose();this.renderer.dispose();}
}
function hash(i:number){const x=Math.sin(i*127.13+19.17)*43758.5453;return x-Math.floor(x);}
function clamp01(n:number){return Math.max(0,Math.min(1,n));}

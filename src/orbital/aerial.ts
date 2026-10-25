import * as T from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { EARTH } from './model';
import { launchPosition } from './simulation';
const noiseTexture=()=>{const size=128,data=new Uint8Array(size*size*4);const hash=(x:number,y:number)=>{const a=Math.sin((x%size)*127.1+(y%size)*311.7)*43758.5453;return (a-Math.floor(a))*255;};for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i]=hash(x,y);data[i+1]=hash(x+37,y+17);data[i+2]=hash(x+19,y+53);data[i+3]=255;}const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;};
export const atmosphereGLSL=`
const float PI=3.14159265359;
const float PLANET=6371.0;
const float ATMOS=6471.0;
const vec3 BETA_R=vec3(.005802,.013558,.0331);
const vec3 BETA_M=vec3(.00444);
vec2 sphereHit(vec3 p,vec3 d,float r){float b=dot(p,d),c=dot(p,p)-r*r,disc=b*b-c;if(disc<0.)return vec2(-1.);float s=sqrt(disc);return vec2(-b-s,-b+s);}
vec2 medium(float height){return exp(-max(height,0.)/vec2(8.,1.2));}
vec3 physicalSky(vec3 observer,vec3 direction,vec3 sun){
 vec2 atmo=sphereHit(observer,direction,ATMOS);if(atmo.y<0.)return vec3(0.);
 float entry=max(atmo.x,0.),exit=atmo.y;
 vec2 planet=sphereHit(observer,direction,PLANET);if(planet.x>0.)exit=min(exit,planet.x);
 float stepLength=max(0.,exit-entry)/12.;vec2 optical=vec2(0.);vec3 raySum=vec3(0.),mieSum=vec3(0.);
 for(int i=0;i<12;i++){
  vec3 p=observer+direction*(entry+(float(i)+.5)*stepLength);vec2 density=medium(length(p)-PLANET);optical+=density*stepLength;
  vec2 sunHit=sphereHit(p,sun,ATMOS);float sunStep=max(0.,sunHit.y)/5.;vec2 sunOptical=vec2(0.);bool shadow=sphereHit(p,sun,PLANET).x>0.;
  for(int j=0;j<5;j++)sunOptical+=medium(length(p+sun*(float(j)+.5)*sunStep)-PLANET)*sunStep;
  vec3 trans=exp(-(BETA_R*(optical.x+sunOptical.x)+BETA_M*(optical.y+sunOptical.y)));
  if(!shadow){raySum+=trans*density.x*stepLength;mieSum+=trans*density.y*stepLength;}
 }
 float mu=dot(direction,sun),phaseR=3./(16.*PI)*(1.+mu*mu),g=.78;
 float phaseM=(1.-g*g)/(4.*PI*pow(max(.001,1.+g*g-2.*g*mu),1.5));
 return 16.*(raySum*BETA_R*phaseR+mieSum*.003996*phaseM);
}
`;
export const weatherGLSL=`
uniform sampler2D uWeather;
uniform float uTime;
float noise3(vec3 x){vec3 p=floor(x),f=fract(x);f=f*f*(3.-2.*f);vec2 uv=p.xy+vec2(37.,17.)*p.z+f.xy;vec2 rg=texture2D(uWeather,(uv+.5)/128.).rg;return mix(rg.x,rg.y,f.z);}
float weather(vec3 p){vec3 q=p*.22+vec3(uTime*.0009,0.,uTime*.0004);return noise3(q)*.72+noise3(q*2.03)*.22+noise3(q*4.11)*.06;}
`;
const cloudGLSL=weatherGLSL+`
float cloudDensity(vec3 p){float h=length(p)-PLANET;float shape=smoothstep(1.45,1.9,h)*(1.-smoothstep(3.,4.1,h));float w=weather(p);return max(0.,w-.55)*shape*3.6;}
vec4 clouds(vec3 ro,vec3 rd,vec3 sun){vec2 outer=sphereHit(ro,rd,PLANET+4.1),inner=sphereHit(ro,rd,PLANET+1.45);if(outer.y<0.)return vec4(0.);
 float start=max(0.,outer.x),end=outer.y;if(inner.x>0.)end=min(end,inner.x);else if(inner.y>0.&&length(ro)<PLANET+1.45)start=max(start,inner.y);
 float horizon=dot(rd,normalize(ro));if(length(ro)<PLANET+1.45&&horizon<.025)return vec4(0.);
 end=min(end,start+32.);float stepLength=max(0.,end-start)/28.,trans=1.;vec3 col=vec3(0.);
 for(int i=0;i<28;i++){vec3 p=ro+rd*(start+(float(i)+.5)*stepLength);float d=cloudDensity(p);if(d>.001){float shadow=cloudDensity(p+sun*.22)+cloudDensity(p+sun*.65)*.6;float lit=exp(-shadow*2.5);float alpha=1.-exp(-d*stepLength*2.5);vec3 light=mix(vec3(.22,.29,.36),vec3(1.12,1.03,.87),lit);col+=light*alpha*trans;trans*=1.-alpha;}}
 return vec4(col,1.-trans);
}
`;
export class PhysicalSky {
 private backgroundTarget:T.WebGLRenderTarget|null=null;private backgroundScene=new T.Scene();private backgroundCamera=new T.PerspectiveCamera();private frame=0;private lastSignature='';
 readonly mesh:T.Mesh;readonly material:T.ShaderMaterial;readonly noise=noiseTexture();
 constructor(sun:T.Vector3){this.material=new T.ShaderMaterial({uniforms:{uObserver:{value:new T.Vector3(...launchPosition()).multiplyScalar(.001)},uSun:{value:sun.clone()},uTime:{value:0},uWeather:{value:this.noise},uClouds:{value:1}},vertexShader:'varying vec3 vRay;void main(){vRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',fragmentShader:`varying vec3 vRay;uniform vec3 uObserver;uniform vec3 uSun;uniform float uClouds;${atmosphereGLSL}${cloudGLSL}
void main(){vec3 rd=normalize(vRay);vec3 sky=physicalSky(uObserver,rd,uSun);float ground=sphereHit(uObserver,rd,PLANET).x; if(ground>0.)sky+=vec3(.015,.02,.016)*exp(-ground*.0005);float disc=smoothstep(cos(.0048),cos(.0042),dot(rd,uSun));sky+=vec3(8.,6.,3.8)*disc*exp(-max(0.,length(uObserver)-PLANET)*.0005);vec4 cloud=uClouds>.5?clouds(uObserver,rd,uSun):vec4(0.);gl_FragColor=vec4(sky*(1.-cloud.a)+cloud.rgb,1.);}`,side:T.BackSide,depthWrite:false,depthTest:false});this.mesh=new T.Mesh(new T.SphereGeometry(100000,24,16),this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=-4;}
 background(renderer:T.WebGLRenderer,camera:T.PerspectiveCamera){
  const observer=this.material.uniforms.uObserver.value as T.Vector3,time=this.material.uniforms.uTime.value;
  const signature=[...observer.toArray(),...camera.quaternion.toArray(),time,camera.aspect].map(x=>x.toFixed(6)).join(',');
  if(this.backgroundTarget&&signature===this.lastSignature)return this.backgroundTarget.texture;
  this.frame++;if(this.backgroundTarget&&this.frame%3!==0)return this.backgroundTarget.texture;
  const width=400,height=Math.max(160,Math.round(width/camera.aspect));
  if(!this.backgroundTarget)this.backgroundTarget=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:false});else if(this.backgroundTarget.height!==height)this.backgroundTarget.setSize(width,height);
  this.backgroundCamera.copy(camera);this.backgroundCamera.updateMatrixWorld();this.mesh.position.copy(camera.position);this.backgroundScene.add(this.mesh);this.mesh.visible=true;
  const target=renderer.getRenderTarget();renderer.setRenderTarget(this.backgroundTarget);renderer.render(this.backgroundScene,this.backgroundCamera);renderer.setRenderTarget(target);this.lastSignature=signature;return this.backgroundTarget.texture;
 }
 update(position:T.Vector3,camera:T.PerspectiveCamera,time:number){this.material.uniforms.uObserver.value.copy(position).add(camera.position);this.material.uniforms.uTime.value=time;this.mesh.position.copy(camera.position);}
 environment(renderer:T.WebGLRenderer,sun:T.Vector3){const s=new T.Scene(),sky=new PhysicalSky(sun);sky.material.uniforms.uClouds.value=0;sky.material.uniforms.uObserver.value.normalize().multiplyScalar(EARTH.radius*.001+.01);s.add(sky.mesh);const gen=new T.PMREMGenerator(renderer),target=gen.fromScene(s,.04,.001,200000,{size:128});gen.dispose();sky.material.dispose();sky.mesh.geometry.dispose();sky.noise.dispose();return target;}
}
export class SurfaceAtmospherePass extends ShaderPass {
 constructor(camera:T.PerspectiveCamera){super({uniforms:{tDiffuse:{value:null},tDepth:{value:null},uProjectionInverse:{value:camera.projectionMatrixInverse},uCameraWorld:{value:camera.matrixWorld},uResolution:{value:new T.Vector2(1,1)},uFar:{value:camera.far},uUp:{value:new T.Vector3(0,1,0)},uSun:{value:new T.Vector3(.7,.6,-.3).normalize()},uHeight:{value:0},uOutdoor:{value:0},uAO:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse;uniform sampler2D tDepth;uniform mat4 uProjectionInverse;uniform mat4 uCameraWorld;uniform vec2 uResolution;uniform float uFar;uniform vec3 uUp;uniform vec3 uSun;uniform float uHeight;uniform float uOutdoor;uniform float uAO;
float viewZ(vec2 uv){float d=texture2D(tDepth,clamp(uv,vec2(.001),vec2(.999))).x;return exp2(d*log2(uFar+1.))-1.;}
vec3 viewP(vec2 uv){vec4 ray=uProjectionInverse*vec4(uv*2.-1.,1.,1.);return ray.xyz/abs(ray.z)*viewZ(uv);}
void main(){vec3 col=texture2D(tDiffuse,vUv).rgb;float z=viewZ(vUv);if(z<.8&&uAO>.01){vec2 px=1./uResolution;vec3 p=viewP(vUv),rx=viewP(vUv+vec2(px.x,0.))-p,lx=p-viewP(vUv-vec2(px.x,0.)),dy=viewP(vUv+vec2(0.,px.y))-p,uy=p-viewP(vUv-vec2(0.,px.y));vec3 dx=abs(rx.z)<abs(lx.z)?rx:lx,ddy=abs(dy.z)<abs(uy.z)?dy:uy;vec3 N=normalize(cross(dx,ddy));if(N.z<0.)N=-N;
float radius=.0012,occlusion=0.,weight=0.;float screen=clamp(radius/max(z,.0001)*uResolution.y*.8,2.,35.);for(int i=0;i<12;i++){float a=float(i)*2.399963;float r=sqrt((float(i)+.5)/12.);vec2 uv=vUv+vec2(cos(a),sin(a))*r*screen*px;vec3 delta=viewP(uv)-p;float dist=length(delta);float w=1.-smoothstep(radius*.2,radius*2.,dist);occlusion+=max(0.,dot(N,delta)/max(.000001,dist)-.09)*w;weight+=w;}col*=1.-clamp(occlusion/max(1.,weight)*1.7,0.,.48)*uAO;}
if(uOutdoor>.5&&z<1000.&&uHeight<50000.){vec3 rayV=normalize(viewP(vUv)),rd=normalize(mat3(uCameraWorld)*rayV);float distance=min(length(viewP(vUv)),150.),rise=dot(rd,uUp);float middle=max(0.,uHeight*.001+rise*distance*.5);float sigma=.032*exp(-middle/1.4)+.08*exp(-middle/.11);float fog=1.-exp(-sigma*distance);float sun=pow(max(0.,dot(rd,uSun)),12.);vec3 fogColor=mix(vec3(.27,.37,.44),vec3(.85,.68,.46),sun*.6);col=mix(col,fogColor,clamp(fog,0.,.83));}
float vignette=dot(vUv-.5,vUv-.5);col*=1.-vignette*.12;gl_FragColor=vec4(col,1.);}`});}
 override render(renderer:T.WebGLRenderer,writeBuffer:T.WebGLRenderTarget,readBuffer:T.WebGLRenderTarget,dt:number,mask:boolean){this.uniforms.tDepth.value=readBuffer.depthTexture;super.render(renderer,writeBuffer,readBuffer,dt,mask);}
}

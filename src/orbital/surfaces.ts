import { weatherGLSL } from './aerial';
import { assetURL } from './assets';
import * as T from 'three';
export const PBR_ASSETS=['concrete_floor_02','aerial_asphalt_01','metal_plate_02','aerial_grass_rock','rock_face'] as const;
export type SurfaceName='concrete'|'asphalt'|'metal'|'paint'|'rubber'|'copper'|'grating'|'sand'|'grass'|'rock';
export function hashNoise(x:number,y:number,seed=0){const n=Math.sin(x*127.1+y*311.7+seed*43.7)*43758.5453;return n-Math.floor(n);}
export function canvasMap(w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d')!);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
function noiseMaps(){
 const size=256,height=new Float32Array(size*size),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)height[y*size+x]=hashNoise(x,y)*.3+hashNoise(Math.floor(x/5),Math.floor(y/13))*.15+Math.sin(x*.25)*.025;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,dx=height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size],dy=height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x],n=new T.Vector3(-dx,-dy,1).normalize();normal.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],i);const r=130+height[y*size+x]*180;rough.set([r,r,r,255],i);}
 const texture=(data:Uint8Array)=>{const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};return {normal:texture(normal),rough:texture(rough)};
}
export class SurfaceLibrary {
 pending=PBR_ASSETS.length*3;failed=false;readonly weatherUniforms={uWeather:{value:null as T.Texture|null},uTime:{value:0},uWeatherEnabled:{value:0},uWorldOrigin:{value:new T.Vector3()},uWeatherSun:{value:new T.Vector3(.7,.6,-.3).normalize()}};readonly maps=new Map<string,T.Texture>();readonly materials=new Map<string,T.MeshStandardMaterial>();private noise=noiseMaps();
 constructor(){const loader=new T.TextureLoader();for(const asset of PBR_ASSETS)for(const kind of ['diff','nor_gl','rough']){const map=loader.load(assetURL(`/textures/pbr/${asset}_${kind}_1k.jpg`),()=>{this.pending--;},undefined,()=>{this.failed=true;this.pending--;});map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;if(kind==='diff')map.colorSpace=T.SRGBColorSpace;this.maps.set(`${asset}/${kind}`,map);}}
 get(name:SurfaceName,options:Partial<T.MeshStandardMaterialParameters>={}):T.MeshStandardMaterial{
  const key=name+JSON.stringify(options);const old=this.materials.get(key);if(old)return old;
  const preset:Record<SurfaceName,T.MeshStandardMaterialParameters>={
   concrete:{color:'#b3b4ac',roughness:.92,metalness:.02},asphalt:{color:'#8e9795',roughness:.94,metalness:0},metal:{color:'#9fadb1',roughness:.46,metalness:.92},paint:{color:'#d9ddda',roughness:.62,metalness:.06},rubber:{color:'#172024',roughness:.87,metalness:.04},copper:{color:'#a5754c',roughness:.33,metalness:.92},grating:{color:'#56636a',roughness:.63,metalness:.82},sand:{color:'#baa889',roughness:.97,metalness:0},grass:{color:'#ffffff',roughness:.97,metalness:0},rock:{color:'#b3b3a0',roughness:.9,metalness:0}
  };
  const asset=name==='grass'?'aerial_grass_rock':name==='rock'?'rock_face':name==='concrete'||name==='sand'?'concrete_floor_02':name==='asphalt'?'aerial_asphalt_01':name==='metal'||name==='grating'?'metal_plate_02':null;
  const mat=new T.MeshStandardMaterial({...preset[name],...options});
  if(asset){mat.map=this.maps.get(`${asset}/diff`)!;mat.normalMap=this.maps.get(`${asset}/nor_gl`)!;mat.roughnessMap=this.maps.get(`${asset}/rough`)!;mat.normalScale.set(.5,.5);}else{mat.normalMap=this.noise.normal;mat.roughnessMap=this.noise.rough;mat.normalScale.set(name==='paint'?.12:.28,name==='paint'?.12:.28);}
  mat.userData.terrainBlend=name==='grass';this.weatherMaterial(mat);mat.userData.sharedSurface=true;this.materials.set(key,mat);return mat;
 }
 private weatherMaterial(mat:T.MeshStandardMaterial){mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,this.weatherUniforms);shader.vertexShader='varying vec3 vSurfaceWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
vec4 surfacePos=vec4(transformed,1.);
#ifdef USE_INSTANCING
surfacePos=instanceMatrix*surfacePos;
#endif
vSurfaceWorld=(modelMatrix*surfacePos).xyz;`);shader.fragmentShader=weatherGLSL+'\nuniform float uWeatherEnabled;uniform vec3 uWorldOrigin;uniform vec3 uWeatherSun;varying vec3 vSurfaceWorld;\n'+shader.fragmentShader;if(mat.userData.terrainBlend)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
#ifdef USE_MAP
vec2 uvA=vMapUv,uvB=mat2(.8,-.6,.6,.8)*vMapUv*.83+vec2(17.3,6.1),uvC=mat2(.45,.893,-.893,.45)*vMapUv*.57+vec2(4.7,8.3);vec4 grassColor=texture2D(map,uvA)*.45+texture2D(map,uvB)*.35+texture2D(map,uvC)*.2;grassColor.rgb*=mix(.85,1.15,noise3(vec3(vMapUv*.027,7.)));diffuseColor*=grassColor;
#endif
`);shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
if(uWeatherEnabled>.5){vec3 p=vSurfaceWorld+uWorldOrigin;float h=length(p)-6371.;if(h<8.){p+=uWeatherSun*(2.3-h)/max(.2,dot(normalize(p),uWeatherSun));float shade=1.-smoothstep(.52,.66,weather(p))*.48;reflectedLight.directDiffuse*=shade;reflectedLight.directSpecular*=shade;}}`);};mat.customProgramCacheKey=()=> 'meridian-cloud-lighting-v1-'+Number(!!mat.userData.terrainBlend);}
 paint(material:string){const m=new T.MeshPhysicalMaterial({color:material==='composite'?'#323b40':material==='steel'?'#b8c1c3':'#e2e3db',metalness:material==='steel'?.93:material==='composite'?.2:.08,roughness:material==='steel'?.34:.62,clearcoat:material==='steel'?0:.16,clearcoatRoughness:.46,normalMap:material==='steel'?this.maps.get('metal_plate_02/nor_gl'):this.noise.normal,roughnessMap:material==='steel'?this.maps.get('metal_plate_02/rough'):this.noise.rough,envMapIntensity:.85});this.weatherMaterial(m);m.normalScale.set(material==='steel'?.16:.13,material==='steel'?.16:.13);return m;}
 dispose(){this.maps.forEach(t=>t.dispose());this.noise.normal.dispose();this.noise.rough.dispose();this.materials.forEach(m=>m.dispose());}
}

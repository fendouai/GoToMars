import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';
const dist=resolve('dist');let html=readFileSync(resolve(dist,'index.html'),'utf8');
const script=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[0],scriptPath=script?.match(/src="([^"]+)"/)?.[1];
const style=html.match(/<link[^>]+rel="stylesheet"[^>]*>/)?.[0],stylePath=style?.match(/href="([^"]+)"/)?.[1];
if(!script||!scriptPath||!style||!stylePath)throw new Error('Unexpected build output');
let js=buildSync({entryPoints:[resolve(dist,scriptPath.replace(/^\//,''))],bundle:true,format:'iife',minify:true,write:false,target:'es2022'}).outputFiles[0].text;
const embedded={};
for(const item of readdirSync(resolve(dist,'textures'),{recursive:true})){if(typeof item!=='string'||! /\.(png|jpg|jpeg)$/.test(item))continue;embedded['/textures/'+item.replaceAll('\\','/')]=`data:${item.endsWith('.png')?'image/png':'image/jpeg'};base64,${readFileSync(resolve(dist,'textures',item)).toString('base64')}`;}
js='globalThis.__MERIDIAN_ASSETS__='+JSON.stringify(embedded)+';'+js;
let css=readFileSync(resolve(dist,stylePath.replace(/^\//,'')),'utf8');
css=css.replace(/url\(([^)]+)\)/g,(match,url)=>{const path=url.replace(/["']/g,'');if(path.startsWith('data:'))return match;const ext=path.split('.').pop();return `url(data:font/${ext};base64,${readFileSync(resolve(dist,path.replace(/^\//,''))).toString('base64')})`;});
const licenses=['barlow-condensed','ibm-plex-mono'].map(name=>`${name}\n${readFileSync(resolve('node_modules/@fontsource',name,'LICENSE'),'utf8')}`).join('\n\n')+'\n\nThree.js\n'+readFileSync(resolve('node_modules/three/LICENSE'),'utf8');
html=html.replace(script,()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`).replace(style,()=>`<style>${css}</style>`).replace(/<link[^>]+rel="modulepreload"[^>]*>/g,'').replace(/href="\/favicon.svg"/,`href="data:image/svg+xml;base64,${readFileSync(resolve(dist,'favicon.svg')).toString('base64')}"`).replace(/<!doctype html>/i,`<!doctype html>\n<!-- Embedded dependency licenses\n${licenses.replace(/-->/g,'-- >')}\nEarth textures: https://threejs.org/examples/textures/planets/\nAdditional PBR assets: concrete_floor_02, aerial_asphalt_01, metal_plate_02, aerial_grass_rock, rock_face — Poly Haven, CC0 1.0. https://polyhaven.com/license\n-->`);
mkdirSync('releases',{recursive:true});writeFileSync('releases/MERIDIAN-3D-v2.html',html);cpSync('dist','releases/MERIDIAN-3D-v2-web',{recursive:true});
console.log(`Created standalone releases/MERIDIAN-3D-v2.html (${Math.round(Buffer.byteLength(html)/1024)} KiB) and static web build.`);

"""Build both localized trailers from capture.mjs outputs; requires Python 3 + ffmpeg."""
import array,json,math,os,random,subprocess,wave
from pathlib import Path
work=Path(os.environ.get('TRAILER_WORKDIR','/tmp/meridian-trailer'))
out=Path('media/trailers');out.mkdir(parents=True,exist_ok=True)
copy=json.loads(Path('tools/trailer/copy.json').read_text());duration=copy['duration']
# Original procedural soundtrack: minor pads, sequenced plucks, sub pulses and launch noise.
# No third-party music or voice synthesis is used.
rate=48000;rng=random.Random(2701);audio=array.array('h');low=0.;tau=2*math.pi
roots=[73.4162,58.2705,65.4064,55.0]
for sample in range(duration*rate):
 t=sample/rate;root=roots[int(t/7)%4];env=min(1,t/1.8)*min(1,max(0,(duration-t)/2))
 intensity=.5+.5*min(1,t/14)
 pad=sum(math.sin(tau*root*ratio*t)*amp for ratio,amp in [(1,.035),(1.5,.021),(2,.017),(2.3784,.012),(3,.007)])
 beat=t%.375;note=[2,3,4,3,2.3784,3,4.7568,4][int(t/.375)%8]
 pluck=math.sin(tau*root*note*t)*math.exp(-beat*13)*.045*intensity
 pulse=t%.75;kick=math.sin(tau*(44*pulse+9*(1-math.exp(-pulse*20))))*math.exp(-pulse*18)*.09*intensity
 noise=rng.uniform(-1,1);low=.985*low+.015*noise
 launch=max(0,min(1,(t-14)/1.5))*max(0,min(1,(28-t)/4))
 rumble=(low*1.4+noise*.025+math.sin(tau*31*t)*.055)*launch
 impact=sum(math.exp(-(t-cut)*12) if 0<=t-cut<.6 else 0 for cut in [4,10,14,21,27,33,37])
 hit=(math.sin(tau*49*t)*.11+noise*.025)*impact
 value=max(-.95,min(.95,(pad+pluck+kick+rumble+hit)*env))
 audio.append(int(value*32767))
with wave.open(str(work/'score.wav'),'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(audio.tobytes())
def timestamp(t):return f'{int(t)//3600:02}:{int(t)//60%60:02}:{int(t)%60:02},000'
for lang in ['zh','en']:
 srt='\n\n'.join(f'{i+1}\n{timestamp(copy["cuts"][i])} --> {timestamp(copy["cuts"][i+1])}\n'+ '\n'.join(lines) for i,lines in enumerate(copy[lang]))+'\n'
 subtitle=out/f'meridian-trailer-{lang}.srt';subtitle.write_text(srt)
 concat=work/f'{lang}-captions.txt';concat.write_text(''.join(f"file '{work}/{lang}-{i}.png'\nduration {copy['cuts'][i+1]-copy['cuts'][i]}\n" for i in range(8))+f"file '{work}/{lang}-7.png'\n")
 target=out/f'meridian-trailer-{lang}.mp4'
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(work/'master.mp4'),'-f','concat','-safe','0','-i',str(concat),'-i',str(work/'score.wav'),'-i',str(subtitle),'-filter_complex','[1:v]fps=25,format=rgba[cap];[0:v][cap]overlay=0:0,fade=t=in:st=0:d=0.35,fade=t=out:st=41:d=1,scale=in_range=pc:out_range=tv,format=yuv420p[v];[2:a]loudnorm=I=-16:TP=-1.5:LRA=9[a]','-map','[v]','-map','[a]','-map','3:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-c:s','mov_text','-metadata:s:s:0',f'language={"zho" if lang=="zh" else "eng"}','-metadata','title=MERIDIAN — Earth Orbit Trailer','-metadata','artist=Go To Mars contributors','-movflags','+faststart','-t',str(duration),str(target)],check=True)
 print('Rendered',target,flush=True)
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(work/'poster-base.jpg'),'-i',str(work/'en-7.png'),'-filter_complex','[0:v][1:v]overlay=0:0,scale=1280:720','-frames:v','1',str(out/'poster.jpg')],check=True)

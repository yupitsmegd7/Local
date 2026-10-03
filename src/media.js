import {FFmpeg} from '@ffmpeg/ffmpeg';
import {extension,mimeTypes} from './catalog.js';
export function mediaArgs(input,output,kind,target,quality){
 const video=['mp4','mov','webm'].includes(target);
 const bitrate=quality==='high'?'256k':quality==='small'?'96k':'192k';
 const args=['-hide_banner','-y'];
 if(kind==='audio'&&video)args.push('-f','lavfi','-i','color=c=0x162242:s=1280x720:r=10','-i',input,'-map','0:v:0','-map','1:a:0','-shortest');
 else args.push('-i',input,...(video?['-map','0:v:0','-map','0:a:0?']:['-map','0:a:0','-vn']));
 args.push('-map_metadata','-1');
 if(target==='mp4'||target==='mov')args.push('-c:v','libx264','-preset','ultrafast','-crf',quality==='high'?'18':quality==='small'?'30':'23','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-pix_fmt','yuv420p','-c:a','aac','-b:a',bitrate,'-movflags','+faststart');
 if(target==='webm')args.push('-c:v','libvpx','-deadline','realtime','-cpu-used','8','-b:v',quality==='high'?'2500k':quality==='small'?'700k':'1400k','-c:a','libopus','-b:a','128k');
 if(target==='mp3')args.push('-c:a','libmp3lame','-b:a',bitrate);
 if(target==='wav')args.push('-c:a','pcm_s16le');
 if(target==='flac')args.push('-c:a','flac');
 if(target==='ogg')args.push('-c:a','libvorbis','-q:a',quality==='high'?'7':quality==='small'?'2':'5');
 if(target==='m4a')args.push('-c:a','aac','-b:a',bitrate);
 args.push(output);return args;
}
export async function convertMedia(file,kind,target,{signal,onStatus,quality}){
 const ffmpeg=new FFmpeg();let wasmURL;const abort=()=>ffmpeg.terminate();signal.addEventListener('abort',abort,{once:true});
 try{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  onStatus('Loading the local media engine (about 31 MB)…');
  const chunks=await Promise.all(['/engine/core-1.bin','/engine/core-2.bin'].map(async url=>{
   const response=await fetch(url,{signal,credentials:'same-origin'});if(!response.ok)throw new Error('The media engine could not load. Check your connection and try again.');return response.arrayBuffer();
  }));
  wasmURL=URL.createObjectURL(new Blob(chunks,{type:'application/wasm'}));
  await ffmpeg.load({coreURL:new URL('/engine/ffmpeg-core.js',location.origin).href,wasmURL});
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  onStatus('Converting on your device…');
  const input='input.'+extension(file),output='output.'+target;
  await ffmpeg.writeFile(input,new Uint8Array(await file.arrayBuffer()));
  const exit=await ffmpeg.exec(mediaArgs(input,output,kind,target,quality),300000);
  if(exit!==0)throw new Error('This file could not be converted. Its codec may be unsupported, it may be damaged, or it exceeded the 5-minute processing limit. Try a smaller file.');
  const data=await ffmpeg.readFile(output);
  if(!data.length)throw new Error('The conversion produced an empty file. Try a different output format.');
  return new Blob([data],{type:mimeTypes[target]});
 }finally{signal.removeEventListener('abort',abort);ffmpeg.terminate();if(wasmURL)URL.revokeObjectURL(wasmURL);}
}

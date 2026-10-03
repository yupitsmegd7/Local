import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {mediaArgs} from '../src/media.js';
globalThis.self={location:{href:'file:///ffmpeg-core.js'}};
const require=createRequire(import.meta.url);
const createFFmpeg=require('@ffmpeg/core');
const core=await createFFmpeg({wasmBinary:await readFile(require.resolve('@ffmpeg/core/wasm'))});
const logs=[];core.setLogger(({message})=>logs.push(message));
const samples=8000;const wav=Buffer.alloc(44+samples*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(3000*Math.sin(2*Math.PI*440*i/8000)),44+i*2);
core.FS.writeFile('input.wav',wav);
for(const target of ['mp3','wav','flac','ogg','m4a','mp4','mov']){
 const output='output.'+target;core.exec(...mediaArgs('input.wav',output,'audio',target,'balanced'));
 if(core.ret!==0)throw new Error(target+': '+logs.slice(-12).join('\n'));
 const data=core.FS.readFile(output);if(data.length<50)throw new Error('Empty '+target);console.log(target+': '+data.length+' bytes, valid encode');core.reset();
}
core.exec(...mediaArgs('output.mp4','output.webm','video','webm','balanced'));
if(core.ret!==0)throw new Error(logs.slice(-12).join('\n'));console.log('mp4 -> webm: '+core.FS.readFile('output.webm').length+' bytes');

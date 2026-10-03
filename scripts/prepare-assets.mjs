import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
await mkdir('public/engine',{recursive:true});
await copyFile('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js','public/engine/ffmpeg-core.js');
const wasm=await readFile('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm');
const middle=Math.ceil(wasm.length/2);
await writeFile('public/engine/core-1.bin',wasm.subarray(0,middle));
await writeFile('public/engine/core-2.bin',wasm.subarray(middle));
await mkdir('public/pdf',{recursive:true});
for(const folder of ['cmaps','standard_fonts','wasm']) await cp(`node_modules/pdfjs-dist/${folder}`,`public/pdf/${folder}`,{recursive:true});
console.log('Local conversion assets prepared.');
await mkdir('public/notices',{recursive:true});
for(const name of ['@ffmpeg/core','@ffmpeg/ffmpeg','docx','jspdf','mammoth','pdfjs-dist','react','react-dom','lucide-react']){
 for(const license of ['LICENSE','LICENSE.txt','LICENSE.md','LICENSE-MIT']){
  try {await copyFile(`node_modules/${name}/${license}`,`public/notices/${name.replaceAll('/','-').replace('@','')}-${license}`);}catch{}
 }
}
await mkdir('public/ocr/core',{recursive:true});
await mkdir('public/ocr/lang',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
const {readdir}=await import('node:fs/promises');
for(const file of await readdir('node_modules/tesseract.js-core'))if(file.endsWith('.wasm.js')||file.endsWith('.wasm'))await copyFile(`node_modules/tesseract.js-core/${file}`,`public/ocr/core/${file}`);
for(const lang of ['eng','hin'])await copyFile(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,`public/ocr/lang/${lang}.traineddata.gz`);
for(const name of ['tesseract.js','tesseract.js-core','emojibase-data','jszip','docx-preview','html2canvas'])for(const file of ['LICENSE','LICENSE.txt','LICENSE.md']){try{await copyFile(`node_modules/${name}/${file}`,`public/notices/${name}-${file}`);}catch{}}
console.log('Same-origin OCR engine and English/Hindi language models prepared.');

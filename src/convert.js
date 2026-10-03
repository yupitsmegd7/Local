import {extension,mimeTypes} from './catalog';
import {withPdf} from './pdf-document';
const check=signal=>{if(signal.aborted)throw new DOMException('Conversion cancelled.','AbortError');};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function convertFile(file,kind,target,{signal,onStatus,quality='balanced',documentMode='appearance'}){
 check(signal);
 if(kind==='audio'||kind==='video'){
  const {convertMedia}=await import('./media');
  return convertMedia(file,kind,target,{signal,onStatus,quality});
 }
 if(kind==='images') return convertImage(file,target,{signal,onStatus,quality});
 onStatus('Reading your document…');
 const ext=extension(file);let content='';
 // Same-format downloads retain every original byte and embedded asset.
 if(ext===target)return file.slice(0,file.size,mimeTypes[target]);
 if(ext==='docx'&&target==='pdf'){
  const {docxToVisualPdf}=await import('./document-layout');
  return docxToVisualPdf(file,{signal,onStatus});
 }
 if(ext==='pdf'&&target==='docx'&&documentMode!=='editable'){
  const {pdfToVisualDocx}=await import('./document-layout');
  return pdfToVisualDocx(file,{signal,onStatus});
 }
 if(ext==='txt'||ext==='md') content=await file.text();
 else if(ext==='docx'){
  const {default:mammoth}=await import('mammoth/mammoth.browser');
  content=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
 }else if(ext==='pdf'){
  await withPdf(file,{signal},async pdf=>{
   for(let n=1;n<=pdf.numPages;n++){
    check(signal);onStatus(`Reading page ${n} of ${pdf.numPages}…`);
    const page=await pdf.getPage(n),text=await page.getTextContent();
    content+=text.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('')+'\n\n';page.cleanup();
   }
  });
  if(!content.trim())throw new Error('This PDF has no readable text. Scanned pages need OCR. Export a page as an image and use Tools → Image to text.');
 }
 check(signal);
 if(content.length>500000)throw new Error('This document has too much text for local conversion. Please use a smaller file.');
 onStatus('Creating your '+target.toUpperCase()+'…');await tick();check(signal);
 if(target==='txt') return new Blob([content],{type:mimeTypes.txt});
 if(target==='docx'){
  const {Document,Packer,Paragraph,TextRun}=await import('docx');
  const doc=new Document({creator:'',title:'',description:'',sections:[{properties:{},children:content.split(/\r?\n/).map(text=>new Paragraph({children:[new TextRun(text)],spacing:{after:100}}))}]});
  const result=await Packer.toBlob(doc);check(signal);return result;
 }
 const {jsPDF}=await import('jspdf');const doc=new jsPDF({unit:'pt',format:'a4'});
 // Standard Latin text stays searchable; other writing systems use browser shaping.
 const unicode=/[^\u0000-\u00ff\u2010-\u2027\u20ac]/.test(content);
 if(!unicode){
  doc.setFont('helvetica','normal');doc.setFontSize(11);
  const lines=doc.splitTextToSize(content,499);let y=56;
  for(let i=0;i<lines.length;i++){if(y>787){doc.addPage();y=56;}doc.text(lines[i],48,y);y+=16;if(i%200===0){await tick();check(signal);}}
 }else{
  const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
  const ctx=canvas.getContext('2d');ctx.font='24px Arial, sans-serif';
  const lines=[];for(const paragraph of content.split(/\r?\n/)){
   let line='';const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(paragraph)].map(x=>x.segment):[...paragraph];
   for(const char of segments){if(ctx.measureText(line+char).width>1040){lines.push(line);line='';}line+=char;}lines.push(line);
  }
  const pageLines=43;
  for(let p=0;p<Math.max(1,Math.ceil(lines.length/pageLines));p++){
   check(signal);onStatus(`Creating PDF page ${p+1}…`);if(p)doc.addPage();
   ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);ctx.fillStyle='#111';ctx.font='24px Arial, sans-serif';
   lines.slice(p*pageLines,(p+1)*pageLines).forEach((line,i)=>ctx.fillText(line,100,120+i*35));
   doc.addImage(canvas.toDataURL('image/png'),'PNG',0,0,595.28,841.89);await tick();
  }canvas.width=canvas.height=0;
 }
 check(signal);return doc.output('blob');
}
async function convertImage(file,target,{signal,onStatus,quality}){
 onStatus('Reading your image…');const url=URL.createObjectURL(file);let bitmap;
 try {bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('This image could not be decoded. Check that the file is a valid supported image.'));img.src=url;});check(signal);
  if(bitmap.width*bitmap.height>32000000)throw new Error('This image exceeds 32 megapixels. Resize it before converting.');
  onStatus('Creating your '+target.toUpperCase()+'…');
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');
  if(target==='jpg'||target==='pdf'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0);
  try {
   if(target==='pdf'){
    const {jsPDF}=await import('jspdf');check(signal);const doc=new jsPDF({orientation:canvas.width>canvas.height?'landscape':'portrait',unit:'pt',format:'a4'});
    const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),scale=Math.min((w-48)/canvas.width,(h-48)/canvas.height);
    doc.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',(w-canvas.width*scale)/2,(h-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);
    return doc.output('blob');
   }
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,mimeTypes[target],quality==='high'?.98:quality==='small'?.65:.85));check(signal);
   if(!blob||blob.type!==mimeTypes[target])throw new Error(`Your browser cannot encode ${target.toUpperCase()}. Try PNG or JPEG.`);return blob;
  }finally{canvas.width=canvas.height=0;}
 }finally{URL.revokeObjectURL(url);}
}

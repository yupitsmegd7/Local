export const IMAGE_ACCEPT='.png,.jpg,.jpeg,.webp,.bmp';
export function validateImage(file){if(!/\.(png|jpe?g|webp|bmp)$/i.test(file.name))throw new Error('Choose a PNG, JPEG, WebP or BMP image.');if(!file.size)throw new Error('This image is empty.');if(file.size>30_000_000)throw new Error('Choose an image smaller than 30 MB.');}
export async function openImage(file){validateImage(file);const url=URL.createObjectURL(file);try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('This image could not be opened. It may be damaged.'));img.src=url;});if(image.naturalWidth*image.naturalHeight>32_000_000)throw new Error('Choose an image no larger than 32 megapixels.');return{file,url,image,width:image.naturalWidth,height:image.naturalHeight};}catch(e){URL.revokeObjectURL(url);throw e;}}
export function validDimensions(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8000||height>8000||width*height>32_000_000)throw new Error('Use whole-number dimensions from 1 to 8,000 pixels, with at most 32 megapixels.');}
export function drawImage(image,{width,height,fit='stretch',x=50,y=50,background='#ffffff'}){validDimensions(width,height);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,width,height);if(fit==='stretch')ctx.drawImage(image,0,0,width,height);else{const scale=fit==='cover'?Math.max(width/image.naturalWidth,height/image.naturalHeight):Math.min(width/image.naturalWidth,height/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(width-w)*x/100,(height-h)*y/100,w,h);}return canvas;}
export async function canvasBlob(canvas,type='image/png',quality=.85){const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,quality));if(!blob||blob.type!==type)throw new Error('Your browser cannot export that image format. Try PNG.');return blob;}
export async function imageDocument(images,format,{signal,onStatus}){
 const aborted=()=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError');};
 let pdf,docx,paragraphs=[];if(format==='pdf'){const {jsPDF}=await import('jspdf');pdf=new jsPDF({unit:'pt',format:'a4'});}else docx=await import('docx');
 for(let i=0;i<images.length;i++){
  aborted();onStatus(`Adding image ${i+1} of ${images.length}…`);const item=await openImage(images[i]);
  try{aborted();const scale=Math.min(1,2000/item.width,2000/item.height);const canvas=drawImage(item.image,{width:Math.max(1,Math.round(item.width*scale)),height:Math.max(1,Math.round(item.height*scale))});
   try{if(pdf){if(i)pdf.addPage();const s=Math.min(499/canvas.width,746/canvas.height);pdf.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',(595.28-canvas.width*s)/2,(841.89-canvas.height*s)/2,canvas.width*s,canvas.height*s);}
    else{const blob=await canvasBlob(canvas,'image/png');const fit=Math.min(624/canvas.width,936/canvas.height);paragraphs.push(new docx.Paragraph({pageBreakBefore:i>0,alignment:docx.AlignmentType.CENTER,children:[new docx.ImageRun({type:'png',data:new Uint8Array(await blob.arrayBuffer()),transformation:{width:Math.round(canvas.width*fit),height:Math.round(canvas.height*fit)}})]}));}
   }finally{canvas.width=canvas.height=0;}
  }finally{URL.revokeObjectURL(item.url);}await new Promise(r=>setTimeout(r,0));
 }
 aborted();if(pdf)return pdf.output('blob');const result=await docx.Packer.toBlob(new docx.Document({creator:'',sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:960,right:960,bottom:960,left:960}}},children:paragraphs}]}));aborted();return result;
}

function abortable(promise,signal){return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Cancelled','AbortError'));if(signal.aborted){abort();promise.catch(()=>{});return;}signal.addEventListener('abort',abort,{once:true});promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});});}
export async function extractText(file,language,{signal,onStatus}){
 const {createWorker}=await import('tesseract.js');if(signal.aborted)throw new DOMException('Cancelled','AbortError');let worker;
 const abort=()=>{if(worker)void worker.terminate();};signal.addEventListener('abort',abort,{once:true});
 try{const creating=createWorker(language,1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',cacheMethod:'none',workerBlobURL:false,logger:message=>{if(!signal.aborted)onStatus(message.status==='recognizing text'?`Reading text · ${Math.round(message.progress*100)}%`:'Loading local text recognition…');}}).then(async ready=>{if(signal.aborted){await ready.terminate();throw new DOMException('Cancelled','AbortError');}return ready;});
  worker=await abortable(creating,signal);
  const {data}=await abortable(worker.recognize(file),signal);if(signal.aborted)throw new DOMException('Cancelled','AbortError');return{text:data.text,confidence:data.confidence};
 }finally{signal.removeEventListener('abort',abort);if(worker)await worker.terminate();}
}

import {createWorker} from 'tesseract.js';
const worker=await createWorker('eng',1,{langPath:new URL('../public/ocr/lang',import.meta.url).pathname,cacheMethod:'none'});
try{const {data}=await worker.recognize(new URL('./fixtures/ocr-test.png',import.meta.url).pathname);if(!data.text.includes('500 MB')||!data.text.includes('LOCAL FILE CONVERTER'))throw new Error('OCR did not recover fixture text.');console.log('Local OCR passed:',JSON.stringify(data.text),'confidence:',data.confidence);}finally{await worker.terminate();}

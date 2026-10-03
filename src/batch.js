import {categories,extension} from './catalog.js';
export const BATCH_LIMIT=500_000_000;
export function validateBatch(existing,incoming,kind){
 const list=Array.from(incoming),config=categories[kind];
 if(!list.length)return [];
 if([...existing,...list].reduce((n,file)=>n+file.size,0)>BATCH_LIMIT)throw new Error('This selection exceeds 500 MB. Remove some files and try again.');
 for(const file of list){
  if(!config.inputs.includes(extension(file)))throw new Error(`${file.name}: this format is not supported in ${config.label.toLowerCase()}.`);
  if(!file.size)throw new Error(`${file.name} is empty.`);
  if(file.size>config.limit*1_000_000)throw new Error(`${file.name} exceeds the ${config.limit} MB per-file limit for ${kind}.`);
 }
 return list;
}
export function uniqueNames(names){const used=new Set();return names.map(name=>{const clean=name.replace(/[\\/\x00-\x1f]/g,'_');const dot=clean.lastIndexOf('.');const base=dot>0?clean.slice(0,dot):clean,ext=dot>0?clean.slice(dot):'';let result=clean,i=2;while(used.has(result.toLowerCase()))result=`${base} (${i++})${ext}`;used.add(result.toLowerCase());return result;});}

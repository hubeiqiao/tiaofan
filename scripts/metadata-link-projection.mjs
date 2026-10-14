/** Exact-ID public link projection. No discovery, external reads or verification. */
const safeUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?value:null}catch{return null}};
export function metadataLinkProjection(metadata){
 const items={};
 for(const [id,row] of Object.entries(metadata.items||{})){
  if(!/^[1-9]\d*$/.test(id))continue;

  const streams=(row.streams||[]).filter(link=>safeUrl(link.url)).map(link=>{
   const fields=['name','url','regions','broadcast','site','regionScope','availability','scope','scopeLabel','note','provenance'];
   return {...Object.fromEntries(fields.filter(key=>Object.hasOwn(link,key)).map(key=>[key,link[key]]))};
  });
  const sourceLinks=(row.sourceLinks||[]).filter(link=>safeUrl(link.url)).map(link=>({...Object.fromEntries(['name','url','kind','note','provenance'].filter(key=>Object.hasOwn(link,key)).map(key=>[key,link[key]]))}));
  if(streams.length||sourceLinks.length)items[id]={streams,sourceLinks};
 }
 return {items};
}

import {knownTitle} from '@/lib/known-titles';
import metadata from '@/data/metadata-runtime';
import aliases from '@/data/search-aliases.json';

const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[\s·・:：—–\-]/g,'');
export async function GET(req:Request){
 const query=normalize((new URL(req.url).searchParams.get('q')||'').slice(0,100));
 if(!query)return Response.json({items:[]});
 const index=aliases as Record<string,string[]>;
 const items=Object.entries(metadata.items as Record<string,{name:string;type:string;metadataDate:string}>).filter(([id,item])=>{
  if(['web','ona'].includes(item.type.toLowerCase())&&!['639938','551918'].includes(id))return false;
  return [item.name,...(index[id]||[])].some(s=>normalize(s).includes(query));
 }).map(([id,item])=>({id,name:knownTitle(id,item.name),date:item.metadataDate,format:item.type,special:['639938','551918'].includes(id)}))
 .sort((a,b)=>Number(b.special)-Number(a.special)||b.date.localeCompare(a.date)).slice(0,12);
 return Response.json({items,synthetic:true,scope:'Fictional demo titles and aliases only.'},{headers:{'Cache-Control':'private,max-age=300'}});
}

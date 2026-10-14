import {historicalDocument} from '@/lib/historical-document';
import {publicRows} from '@/lib/public-content';
import {relatedAnime} from '@/lib/related-anime';
import {buildHistoricalPool} from '@/lib/historical-catalog';
export const dynamic='force-dynamic';
/** Exact trusted public ID only. No caller-supplied source URLs, metadata or private account data. */
export async function GET(req:Request){
 const params=new URL(req.url).searchParams,id=params.get('id')||'';
 if([...params.keys()].some(k=>k!=='id')||params.getAll('id').length!==1||!/^[1-9]\d{0,8}$/.test(id))return Response.json({error:'INVALID_ID'},{status:400,headers:{'Cache-Control':'no-store'}});
 const archived=await historicalDocument(Number(id));if(archived)return Response.json({seed:{id:archived.key,title:archived.name,sourceUrl:'https://bgm.tv/subject/'+id},...archived.related,updatedAt:archived.updatedAt},{headers:{'Cache-Control':'public,max-age=300'}});
 const catalog=await publicRows(),seed=catalog.items.find(a=>a.bgm===Number(id));
 if(!seed)return Response.json({error:'NOT_FOUND'},{status:404,headers:{'Cache-Control':'no-store'}});
 const historical=buildHistoricalPool(catalog.items,[],{},Date.now()).items;
 // Historical titles plus bounded contemporary public rows; no metadata-only cards.
 const historicalIds=new Set(historical.map(a=>a.bgm));
 const current=catalog.items.filter(a=>!historicalIds.has(a.bgm)&&a.date>=new Date(Date.UTC(new Date().getUTCFullYear(),Math.floor(new Date().getUTCMonth()/3)*3-3,1)).toISOString().slice(0,10)).slice(0,160);
 return Response.json({seed:{id:seed.key,title:seed.name,sourceUrl:`https://bgm.tv/subject/${seed.bgm}`},...relatedAnime(seed,[...historical,...current]),updatedAt:catalog.updatedAt},{headers:{'Cache-Control':'public, max-age=300'}});
}

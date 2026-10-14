/** Maintenance-only pagination. Caller owns the unchanged shared source budget. */
export const KITSU_RANK_REQUEST_LIMIT=50,KITSU_RANK_RAW_LIMIT=1000,KITSU_RANK_TV_TARGET=500;
const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const text=(value:unknown,limit:number)=>typeof value==='string'?value.slice(0,limit):'';
function compact(raw:any){
 if(!/^[1-9]\d{0,11}$/.test(String(raw.kitsu))||typeof raw.name!=='string'||!Number.isFinite(Date.parse(raw.at)))throw Error('Invalid Kitsu rank identity or timestamp');
 let source;try{source=new URL(raw.url)}catch{throw Error('Invalid Kitsu rank source')}
 if(source.protocol!=='https:'||source.hostname!=='kitsu.app'||source.username||source.password||!source.pathname.startsWith('/anime/'))throw Error('Invalid Kitsu rank source');
 let image='';try{const u=new URL(raw.image);if(u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=400)image=u.href}catch{}
 return{kitsu:String(raw.kitsu),mal:positive(raw.mal)?raw.mal:null,name:text(raw.name,180),originalName:text(raw.originalName,180),date:text(raw.date,10),format:text(raw.format,24),episodes:positive(raw.episodes)?raw.episodes:undefined,image,score:typeof raw.score==='number'&&Number.isFinite(raw.score)&&raw.score>0&&raw.score<=100?raw.score:null,count:Number.isSafeInteger(raw.count)&&raw.count>=0?raw.count:null,rank:positive(raw.rank)?raw.rank:null,url:source.href,at:raw.at};
}
export async function acquireKitsuRankSnapshot(fetchPage:(offset:number)=>Promise<any>,{now=Date.now}:{now?:()=>number}={}){
 const started=now(),items:ReturnType<typeof compact>[]=[],seen=new Set<string>();let offset=0,total:number|null=null,hasNext=true,tvTitles=0,requests=0,at:string|null=null;
 while(hasNext&&requests<KITSU_RANK_REQUEST_LIMIT&&offset<KITSU_RANK_RAW_LIMIT&&tvTitles<KITSU_RANK_TV_TARGET){
  if(now()-started>=100000)throw Error('Kitsu rank update time budget exceeded; prior snapshot retained');
  const page=await fetchPage(offset);requests++;
  if(!Array.isArray(page.items)||!Number.isSafeInteger(page.received)||page.received<0||page.received>20||page.items.length>page.received||typeof page.hasNext!=='boolean'||!Number.isSafeInteger(page.total)||page.total<0||!Number.isFinite(Date.parse(page.at))||page.hasNext&&page.received!==20||!page.received&&(!offset||page.hasNext))throw Error('Invalid Kitsu rank page; prior snapshot retained');
  for(const raw of page.items){const row=compact(raw);if(seen.has(row.kitsu))throw Error('Duplicate Kitsu rank identity across pages; prior snapshot retained');seen.add(row.kitsu);items.push(row);if(row.format.toLowerCase()==='tv'&&row.score!==null&&row.count>0&&row.rank)tvTitles++}
  offset+=page.received;total??=page.total;hasNext=page.hasNext;at=page.at;
 }
 if(!items.length)throw Error('Kitsu rank empty; prior snapshot retained');
 const result={items,total,received:offset,hasNext,at,scope:'Bounded Kitsu source-ranked candidates; TV target does not imply global rank completeness.',coverage:{rawLimit:KITSU_RANK_RAW_LIMIT,requestLimit:KITSU_RANK_REQUEST_LIMIT,requests,tvTarget:KITSU_RANK_TV_TARGET,tvTitles,sourceExhausted:!hasNext}};
 if(new TextEncoder().encode(JSON.stringify(result)).length>1200000)throw Error('Kitsu rank snapshot exceeds byte budget; prior snapshot retained');
 return result;
}

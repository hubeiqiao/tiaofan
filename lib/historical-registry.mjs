/** Public registry only. This module performs no I/O, imports no large data and reads no private lists. */
export const REGISTRY_SCHEMA = 1;
const text = (value, cap=250) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,cap) : '';
const positive = value => Number.isSafeInteger(Number(value)) && Number(value)>0 ? Number(value) : null;
export function fullDate(value){const date=text(value,32);return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date?date:null;}
export function historicalCutoff(now=Date.now()){const d=new Date(now);return new Date(Date.UTC(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)*3-3,1)).toISOString().slice(0,10);}
export function registryFormat(value){const v=text(value,40).toLowerCase();return ['tv','电视动画'].includes(v)?'TV':['movie','剧场版','电影'].includes(v)?'movie':['web','ona','网络动画'].includes(v)?'ONA':['ova','oad'].includes(v)?'OVA':'other';}
/** Match public discovery media; the explicitly admitted JOJO entry keeps its original ONA format. */
export function registryInMedia(row,media='all'){
 const format=registryFormat(row.format),series=format==='TV'||format==='ONA'&&row.bgm===639938;
 if(format==='ONA'&&!series)return false;
 return media==='all'||media==='series'&&series||media==='movie'&&format==='movie'||media==='other'&&['OVA','other'].includes(format);
}
export function publicUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const epoch=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
const dedupe=values=>[...new Set(values.filter(Boolean))];
function emptyDetails(){return {summary:null,image:null,tags:[],episodes:null,ratings:{},sourceKey:null,sourceAt:null};}
function cleanRating(value){if(!value||typeof value!=='object')return null;const url=publicUrl(value.url),at=epoch(value.at)?new Date(value.at).toISOString():null;if(!url||!at)return null;return{score:typeof value.score==='number'&&Number.isFinite(value.score)&&value.score>0&&value.count!==0?value.score:null,count:Number.isSafeInteger(value.count)&&value.count>=0?value.count:null,...(positive(value.rank)?{rank:value.rank}:{}),url,at};}
function mergeDetail(old,value,sourceKey,sourceAt){
 const prior=old||emptyDetails(),freshAt=epoch(sourceAt),priorAt=epoch(prior.sourceAt);
 const ratings={...prior.ratings};for(const [key,r]of Object.entries(value.rating||{})){if(!['bgm','mal','kitsu'].includes(key))continue;const clean=cleanRating(r);if(clean&&epoch(clean.at)>=epoch(ratings[key]?.at))ratings[key]=clean;}
 const fieldSources={...(prior.fieldSources||{})};for(const [field,ref]of Object.entries(fieldSources))if(typeof ref==='string')fieldSources[field]={key:ref,at:prior.sourceAt};
 const values={summary:text(value.summary,2400)||null,image:publicUrl(value.image)?.startsWith('https:')?publicUrl(value.image):null,tags:Array.isArray(value.tags)?dedupe(value.tags.map(s=>text(s,60))).slice(0,16):[],episodes:positive(value.episodes)};
 const result={...prior,ratings,fieldSources};for(const [field,v]of Object.entries(values)){const supplied=Array.isArray(v)?v.length>0:!!v;if(supplied&&freshAt>=epoch(fieldSources[field]?.at||prior.sourceAt)){result[field]=v;fieldSources[field]={key:sourceKey,at:sourceAt};}}
 if(freshAt>=priorAt){result.sourceKey=sourceKey;result.sourceAt=new Date(freshAt).toISOString();}return result;
}
/** All source timestamps are retrieval times, never a claim of first publication or a private favorite. */
export function buildHistoricalRegistry({metadata,aliases={},verifiedTitles={},snapshots=[],prior=null,now=Date.now()}){
 if(!metadata?.items||!metadata.meta?.retrievedAt)throw Error('Licensed metadata with provenance required');
 const sourceAt=new Date(metadata.meta.retrievedAt).toISOString(),sourceUrl=publicUrl(metadata.meta.snapshotUrl||metadata.meta.sourceUrl);if(!sourceUrl)throw Error('Metadata source URL required');
 const rows=new Map((prior?.schemaVersion===REGISTRY_SCHEMA?prior.items:[]).map(row=>[row.bgm,row]));
 const sources={...(prior?.sources||{}),metadata:{name:'bangumi-data',url:sourceUrl,at:sourceAt,license:'CC-BY-4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',attribution:'bangumi-data; filtered and normalized'}};
 const claims=new Map();
 for(const [id,m]of Object.entries(metadata.items)){const bgm=positive(id);if(!bgm)continue;const mal=positive(m.mal);if(mal){const c=claims.get(mal)||[];c.push({bgm,conflict:!!m.conflicts?.mal});claims.set(mal,c);}
  const priorRow=rows.get(bgm),primaryTitle=text(m.name)||text(verifiedTitles[id]?.nameCn)||text(verifiedTitles[id]?.originalName)||text(aliases[id]?.[0]);if(!primaryTitle)continue;
  const row={...(priorRow||{}),bgm,key:`bgm:${bgm}`,title:primaryTitle,originalTitle:text(verifiedTitles[id]?.originalName)||priorRow?.originalTitle||null,aliases:dedupe([...(aliases[id]||[]),...(priorRow?.aliases||[])] .map(s=>text(s))).slice(0,24),format:registryFormat(m.type),sourceFormat:text(m.type,40)||null,date:fullDate(m.metadataDate),dateSource:'metadata',homepage:publicUrl(m.homepage),end:epoch(m.end)?m.end:null,sourceKey:'metadata',sourceAt,details:priorRow?.details||null};
  // An exact public Bangumi subject date/platform supersedes a schedule-only metadata field.
  if(['bgm','bgm-archive'].includes(priorRow?.dateSource)){row.title=priorRow.title;row.originalTitle=priorRow.originalTitle;row.date=priorRow.date;row.dateSource=priorRow.dateSource;row.format=priorRow.format;row.sourceFormat=priorRow.sourceFormat;}
  rows.set(bgm,row);
 }
 const records=snapshots.filter(s=>s?.key==='rank:bgm'||s?.key==='rank:kitsu'||/^catalog:\d{4}:[0-3]$/.test(s?.key||'')).sort((a,b)=>a.updated_at-b.updated_at);
 for(const snapshot of records){const parsed=typeof snapshot.payload==='string'?JSON.parse(snapshot.payload):snapshot.payload;if(!Array.isArray(parsed?.items))throw Error('Invalid public snapshot');const at=new Date(snapshot.updated_at).toISOString();sources[snapshot.key]={name:snapshot.key,url:publicUrl(snapshot.source_url),at,license:snapshot.key==='rank:kitsu'?null:'CC-BY-SA-3.0',licenseUrl:snapshot.key==='rank:kitsu'?null:'https://creativecommons.org/licenses/by-sa/3.0/',attribution:snapshot.key==='rank:kitsu'?'Kitsu':'Bangumi wiki contributors; normalized public subject data'};
  for(const raw of parsed.items.slice(0,1000)){
   let bgm=positive(raw.bgm),value=raw;
   if(snapshot.key==='rank:kitsu'){const matches=claims.get(positive(raw.mal))||[];if(matches.length!==1||matches[0].conflict)continue;bgm=matches[0].bgm;value={...raw,summary:null,tags:[],image:raw.image,rating:{kitsu:{score:raw.score,count:raw.count,rank:raw.rank,url:raw.url,at:raw.at||at}}};}
   if(!bgm||!text(raw.name))continue;const old=rows.get(bgm),isBgm=snapshot.key!=='rank:kitsu';
   const row=old?{...old}:{bgm,key:`bgm:${bgm}`,title:text(raw.name),originalTitle:text(raw.originalName)||null,aliases:[],format:registryFormat(raw.format),sourceFormat:text(raw.format,40)||null,date:fullDate(raw.date),dateSource:isBgm?'bgm':'kitsu',homepage:null,sourceKey:snapshot.key,sourceAt:at,details:null};
   if(isBgm){row.title=text(raw.name)||row.title;row.originalTitle=text(raw.originalName)||row.originalTitle;row.date=fullDate(raw.date);row.dateSource='bgm';row.format=registryFormat(raw.format);row.sourceFormat=text(raw.format,40)||null;}
   row.details=mergeDetail(old?.details,value,snapshot.key,at);rows.set(bgm,row);
  }
 }
 const items=[...rows.values()].sort((a,b)=>a.bgm-b.bgm);return {schemaVersion:REGISTRY_SCHEMA,revision:null,generatedAt:new Date(now).toISOString(),sources,items};
}
export function registryCoverage(row){if(row.coverage)return row.coverage;const d=row.details;return{identity:true,date:!!row.date,originalTitle:!!row.originalTitle,summary:!!d?.summary,image:!!d?.image,tags:!!d?.tags?.length,episodes:!!d?.episodes,ratings:!!d&&Object.values(d.ratings).some(r=>r.score!==null),reviews:false,playback:false,relations:row.relations!==undefined};}
const normalize=s=>text(s,300).normalize('NFKC').toLocaleLowerCase().replace(/[\s·・:：—–\-]/g,'');
/** Query has stable canonical-ID keyset paging within one immutable revision. */
export function queryHistoricalRegistry(registry,{query='',q=null,offset=0,media='series',year=null,quarter=null,limit=24,cursor=null,coverage='any',includeUnknownDate=false,sort='id',minimumVotes=0}={},now=Date.now()){
 if(!['id','bgm','kitsu','mal'].includes(sort)||!Number.isSafeInteger(minimumVotes)||minimumVotes<0||minimumVotes>10000000)throw Error('Invalid registry sort or vote count');
 if(!['series','movie','other','all'].includes(media)||!['any','enriched','metadata-only'].includes(coverage))throw Error('Invalid registry filter');
 if(!Number.isSafeInteger(limit)||limit<1||limit>50||text(q===null?query:q,301).length>120)throw Error('Invalid registry limit or query');
 if(year!==null&&(!Number.isSafeInteger(year)||year<1900||year>2100)||quarter!==null&&![1,2,3,4].includes(quarter))throw Error('Invalid registry season');
 if(cursor&&sort!=='id')throw Error('Cursor requires ID ordering');
 if(cursor&&(cursor.revision!==registry.revision||!Number.isSafeInteger(cursor.afterId)||cursor.afterId<0))throw Error('REGISTRY_VERSION_CHANGED');
 if(!Number.isSafeInteger(offset)||offset<0||offset>20000)throw Error('Invalid offset');
 const cutoff=historicalCutoff(now),needle=normalize(q===null?query:q);
 const rows=registry.items.filter(row=>{if(row.hiddenReason||!registryInMedia(row,media))return false;const date=fullDate(row.date);if(!(date?date<cutoff:includeUnknownDate))return false;if(year!==null&&Number(date?.slice(0,4))!==year||quarter!==null&&Math.ceil(Number(date?.slice(5,7))/3)!==quarter)return false;const rating=(row.rating||row.details?.ratings||{})[sort==='id'?'bgm':sort];if(minimumVotes&&(rating?.count??0)<minimumVotes)return false;const c=registryCoverage(row);if(coverage==='enriched'&&!c.ratings&&!c.summary||coverage==='metadata-only'&&(c.ratings||c.summary||c.tags||c.episodes))return false;return !needle||[row.title,row.originalTitle,...row.aliases].some(s=>normalize(s).includes(needle));});
 if(sort!=='id')rows.sort((a,b)=>{const ar=(a.rating||a.details?.ratings||{})[sort],br=(b.rating||b.details?.ratings||{})[sort];return (br?.score??-1)-(ar?.score??-1)||(br?.count??-1)-(ar?.count??-1)||a.bgm-b.bgm});
 const selected=rows.filter(row=>!cursor||row.bgm>cursor.afterId).slice(cursor?0:offset,(cursor?0:offset)+limit+1),hasMore=selected.length>limit,items=selected.slice(0,limit).map(row=>({bgm:row.bgm,key:row.key||`bgm:${row.bgm}`,title:row.title,originalTitle:row.originalTitle,aliases:row.aliases||[],end:row.end||null,archiveEligible:row.archiveEligible===true,date:row.date,format:row.format,sourceFormat:row.sourceFormat,dateSource:row.dateSource,sourceUrl:`https://example.invalid/demo/subject/${row.bgm}`,sourceAt:row.detailSourceAt||row.details?.sourceAt||row.sourceAt,sourceKey:row.detailSourceKey||row.details?.sourceKey||row.sourceKey,coverage:registryCoverage(row),image:row.details?.image||null,summary:row.details?.summary||null,episodes:row.details?.episodes||null,ratings:row.details?.ratings||{}}));
 return{schemaVersion:registry.schemaVersion,revision:registry.revision,coverageSummary:registry.coverageSummary||null,cutoffDate:cutoff,total:rows.length,offset,nextOffset:hasMore?offset+items.length:null,items,nextCursor:hasMore&&sort==='id'?{revision:registry.revision,afterId:items.at(-1).bgm}:null,scope:'Known public historical catalog; per-title coverage distinguishes metadata from sourced detail. Not complete historical coverage.',sources:registry.sources};
}
/** Fixed daily enrichment selection: independent of user profiles, no external request performed here. */
export function planHistoricalEnrichment(registry,{now=Date.now(),lastAttemptAt=0,afterId=0,limit=12}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>12)throw Error('Enrichment cap exceeded');const day=86400000;if(lastAttemptAt>=Math.floor(now/day)*day)return{ids:[],nextAfterId:afterId,reason:'daily-guard'};
 const cutoff=historicalCutoff(now),due=registry.items.filter(r=>r.format==='TV'&&r.date&&r.date<cutoff&&(!(r.detailSourceAt||r.details?.sourceAt)||epoch(r.detailSourceAt||r.details?.sourceAt)<now-30*day)).sort((a,b)=>a.bgm-b.bgm),ordered=[...due.filter(r=>r.bgm>afterId),...due.filter(r=>r.bgm<=afterId)],selected=ordered.slice(0,limit);return{ids:selected.map(r=>r.bgm),nextAfterId:selected.at(-1)?.bgm||afterId,reason:selected.length?'due':'no-due-records'};
}

/** Compact recommendation input: only independently checked archive TV, never metadata-only guesses. */
export function compactRegistryCandidates(index,now=Date.now()){
 const cutoff=historicalCutoff(now);return index.items.filter(r=>!r.hiddenReason&&r.archiveEligible===true&&r.format==='TV'&&fullDate(r.date)&&r.date<cutoff).map(r=>({key:`bgm:${r.bgm}`,bgm:r.bgm,name:r.title,originalName:r.originalTitle||'',aliases:r.aliases||[],date:r.date,format:r.format,tags:r.tags||r.details?.tags||[],episodes:r.episodes||r.details?.episodes||undefined,rating:r.rating||r.details?.ratings||{},end:r.end||undefined,image:'',summary:''}));
}

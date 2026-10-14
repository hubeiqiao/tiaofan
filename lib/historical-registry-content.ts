import {compactRegistryCandidates,registryCoverage,registryInMedia,fullDate,historicalCutoff} from './historical-registry.mjs';
import {registryDetails} from './historical-registry-shards';
export async function historicalRegistry(){return (await import('@/data/historical-registry-runtime')).default;}
/** Exact-ID public lookup. One selected ID loads one small detail shard, without metadata-runtime. */
export async function registryLookup(id:number){
 if(!Number.isSafeInteger(id)||id<1)return null;
 const index=await historicalRegistry(),row=index.items.find((r:any)=>r.bgm===id);
 if(!row||row.hiddenReason||!registryInMedia(row,'all')||!fullDate(row.date)||row.date>=historicalCutoff())return null;
 const details=(await registryDetails(index,[id]))[id]||null;
 return{row,details,coverage:registryCoverage(row),sources:index.sources,revision:index.revision};
}
export async function registryAnime(id:number){
 const result=await registryLookup(id);if(!result)return null;const {row,details:d}=result;
 return{key:`bgm:${row.bgm}`,bgm:row.bgm,name:row.title,originalName:row.originalTitle||'',aliases:row.aliases||[],date:row.date||'',format:row.format,image:d?.image||'',summary:d?.summary||'',tags:d?.tags||[],episodes:d?.episodes||undefined,rating:d?.ratings||{},end:row.end||undefined,sourceLinks:[],registryCoverage:result.coverage,archiveEligible:row.archiveEligible===true,dateSource:row.dateSource,registryProvenance:{identity:{key:row.sourceKey,...result.sources[row.sourceKey],at:row.sourceAt},date:{key:row.dateSource==='bgm-archive'?'bangumi-archive':row.dateSource==='metadata'?'metadata':d?.sourceKey||row.sourceKey,at:row.dateSource==='bgm-archive'?result.sources['bangumi-archive']?.at:row.dateSource==='metadata'?row.sourceAt:d?.sourceAt||row.sourceAt},fields:d?.fieldSources||{},sources:result.sources},registrySourceUrl:result.sources['bangumi-archive']?.url||null,summaryLanguage:d?.summaryLanguage||null,relations:d?.relations||[],sourceAt:d?.sourceAt||row.sourceAt,fieldSources:d?.fieldSources||{},updatedAt:Date.parse(d?.sourceAt||row.sourceAt)||0};
}
export async function registryCandidateRows(now=Date.now()){return compactRegistryCandidates(await historicalRegistry(),now);}
export async function registryCandidateDetails(ids:number[]){return registryDetails(await historicalRegistry(),ids);}

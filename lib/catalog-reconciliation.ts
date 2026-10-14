import {exactSubjectEligible,normalizeCatalogSubject,type CatalogPeriod} from './catalog-subject';
import type {Anime} from './types';

export const CATALOG_RECHECK_LIMIT=8;
export type CatalogReconciliation={bgm:number;sourceUrl:string;checkedAt:string;searchFetchedAt:string;outcome:'retained'|'ineligible'|'not_found';reason:string};
export async function reconcileCatalog(previous:Anime[],current:Anime[],period:CatalogPeriod,searchFetchedAt:string){
 const present=new Set(current.map(a=>a.key)),missing=new Map<number,Anime>();
 for(const row of previous){
  if(present.has(row.key))continue;
  if(typeof row.bgm!=='number'||!Number.isSafeInteger(row.bgm)||!row.bgm||row.bgm<1||row.key!==`bgm:${row.bgm}`)throw Error('原目录身份异常，保留上次目录');
  missing.set(row.bgm,row);
 }
 if(missing.size>CATALOG_RECHECK_LIMIT)throw Error('来源分页缺失超过核对预算，保留上次目录');
 const items=[...current],reconciliations:CatalogReconciliation[]=[];
 // Sequential checks stop immediately on failure and never leave queued fetches
 // running after the maintenance wrapper releases its request budget and lock.
 for(const id of missing.keys()){
  const sourceUrl=`https://api.bgm.tv/v0/subjects/${id}`;
  const response=await fetch(sourceUrl,{headers:{'User-Agent':'TiaofanDemo/anime-discovery/2.0 (https://example.invalid)'},redirect:'error',signal:AbortSignal.timeout(12000)});
  if(response.status===404||response.status===410){reconciliations.push({bgm:id,sourceUrl,checkedAt:new Date().toISOString(),searchFetchedAt,outcome:'not_found',reason:'原站明确返回条目不可用（HTTP '+response.status+'）'});continue;}
  if(!response.ok)throw Error('缺失条目核对失败（'+response.status+'），保留上次目录');
  const subject:unknown=await response.json(),eligible=exactSubjectEligible(subject,id,period),checkedAt=new Date().toISOString();
  if(eligible)items.push(normalizeCatalogSubject(subject,checkedAt));
  reconciliations.push({bgm:id,sourceUrl,checkedAt,searchFetchedAt,outcome:eligible?'retained':'ineligible',reason:eligible?'分页检索未返回原有条目；精确条目响应仍符合本季度及内容筛选规则':'精确条目响应已不符合本季度或内容筛选规则'});
 }
 return {items,reconciliations};
}

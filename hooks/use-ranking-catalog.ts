'use client';
import {useEffect,useRef,useState} from 'react';
import type {Anime} from '@/lib/types';
export type RankingAnime=Anime&{sourceRank:number;displayPosition:number;sourceAt:string;mappingEligible?:boolean};
export type RankingCoverage={scope:string;completeSourceRanking:false;sourceTotal:number|null;collectedCandidates:number;rankedCandidates:number;matchingTitles:number;windowTitles:number;windowLimit:number;upstreamHasMore:boolean|null;sourceCandidateLimit:number|null;archiveAsOf:string|null;sourceDateRange:string[];snapshotAt:string|null;sourceUrl:string|null;cutoffDate:string|null;cacheStale?:boolean;cacheDegraded?:boolean;lastAttemptFailed?:boolean;lastSuccessfulAt?:string;lastAttemptAt?:string|null;retainedPreviousVersion?:boolean;dataState?:'fresh'|'stale'|'last-good'};
export type RankingState={items:RankingAnime[];total:number;nextOffset:number|null;revision:string;coverage:RankingCoverage|null;loading:boolean;error:string};
const empty:RankingState={items:[],total:0,nextOffset:0,revision:'',coverage:null,loading:false,error:''};
const pending:RankingState={...empty,loading:true};
type Options={active:boolean;source:'bgm'|'kitsu';query:string;media:string;minVotes:string;airing?:string;top?:250|500;limit:number;reload:number;enrichPage?:(items:RankingAnime[],signal:AbortSignal)=>Promise<RankingAnime[]>};
/** Fetch only demanded public pages; auth/private state never enters this cache. */
export function useRankingCatalog({active,source,query,media,minVotes,airing='all',top=500,limit,reload,enrichPage}:Options){
 const cache=useRef(new Map<string,RankingState>()),serial=useRef(0),enricher=useRef(enrichPage);enricher.current=enrichPage;
 const [state,setState]=useState<{key:string;value:RankingState}>({key:'',value:empty});
 const key=JSON.stringify([source,query.slice(0,120),media,minVotes,airing,top,reload]);
 useEffect(()=>{
  if(!active)return;
  const token=++serial.current,controller=new AbortController();let current=cache.current.get(key)||empty;
  const publish=(value:RankingState)=>{if(token!==serial.current||controller.signal.aborted)return;current=value;cache.current.set(key,value);if(cache.current.size>4)cache.current.delete(cache.current.keys().next().value!);setState({key,value})};
  const target=Math.min(top,Math.max(0,limit));publish({...current,loading:current.nextOffset!==null&&current.items.length<target,error:''});
  (async()=>{try{
   while(current.nextOffset!==null&&current.items.length<target&&!controller.signal.aborted){
    const params=new URLSearchParams({source,q:query.slice(0,120),media,minimumVotes:minVotes,airing,top:String(top),offset:String(current.nextOffset),limit:String(Math.min(24,target-current.items.length))});if(current.revision)params.set('version',current.revision);
    const response=await fetch('/api/rankings?'+params,{signal:controller.signal});if(!response.ok)throw Error(response.status===409?'RANKING_VERSION_CHANGED':'RANKING_UNAVAILABLE');
    const data=await response.json() as RankingState;
    if(!Array.isArray(data.items)||data.items.length>24||!Number.isSafeInteger(data.total)||data.total<0||data.total>top||typeof data.revision!=='string'||!data.revision||current.revision&&data.revision!==current.revision||data.nextOffset!==null&&(!Number.isSafeInteger(data.nextOffset)||data.nextOffset<=(current.nextOffset||0))||!data.items.length&&data.nextOffset!==null)throw Error('INVALID_RANKING_PAGE');
    if(controller.signal.aborted||token!==serial.current)return;
    let page=data.items;
    if(enricher.current){try{const enriched=await enricher.current(page,controller.signal);const identity=(row:RankingAnime)=>source==='kitsu'?row.kitsuId:String(row.bgm);const mapped=new Map(enriched.map(row=>[identity(row),row]));page=page.map(row=>{const extra=mapped.get(identity(row));return extra?{...extra,format:row.format,date:row.date,mappingEligible:row.mappingEligible,sourceRank:row.sourceRank,displayPosition:row.displayPosition,sourceAt:row.sourceAt,rating:{...extra.rating,[source]:row.rating[source]}}:row});}catch{if(controller.signal.aborted)return;/* Source-backed cards remain readable if optional enrichment fails. */}}
    if(controller.signal.aborted||token!==serial.current)return;
    const identity=(row:RankingAnime)=>source==='kitsu'&&row.kitsuId?'kitsu:'+row.kitsuId:row.key;
    const items=[...new Map([...current.items,...page].map(row=>[identity(row),row])).values()];
    publish({items,total:data.total,nextOffset:data.nextOffset,revision:data.revision,coverage:data.coverage,loading:data.nextOffset!==null&&items.length<target,error:''});
   }
   publish({...current,loading:false});
  }catch(error){publish({...current,loading:false,error:error instanceof Error&&error.message==='RANKING_VERSION_CHANGED'?'RANKING_VERSION_CHANGED':'RANKING_UNAVAILABLE'})}})();
  return()=>controller.abort();
 },[active,key,limit]);
 return state.key===key?state.value:cache.current.get(key)||(active?pending:empty);
}

'use client';
import {useEffect,useRef,useState} from 'react';
import type {Anime} from '@/lib/types';
export type HistoricalPageState={items:Anime[];total:number;nextOffset:number|null;revision:string;sources:Record<string,any>;loading:boolean;error:string};
type HistoricalQueryState=HistoricalPageState&{queryKey:string};
const empty:HistoricalQueryState={items:[],total:0,nextOffset:0,revision:'',sources:{},loading:false,error:'',queryKey:''};
const pending:HistoricalPageState={...empty,loading:true};
export function historicalRow(row:any):Anime{return{key:row.key,bgm:row.bgm,name:row.title,originalName:row.originalTitle||'',aliases:row.aliases||[],image:row.image||'',summary:row.summary||'',date:row.date||'',format:row.format||'TV',tags:row.tags||[],episodes:row.episodes||undefined,end:row.end||undefined,rating:row.ratings||{},sourceLinks:[{name:'Bangumi',url:row.sourceUrl,kind:'info'}]};}
/** Public-only pages stay in memory through auth rechecks; no private context is cached. */
export function useHistoricalCatalog({active,query,sort,minVotes,media='series',year=null,limit,reload}:{active:boolean;query:string;sort:string;minVotes:string;media?:string;year?:number|null;limit:number;reload:number}):HistoricalPageState{
 const cache=useRef(new Map<string,HistoricalQueryState>()),serial=useRef(0);const [state,setState]=useState(empty);
 const key=JSON.stringify([query.slice(0,120),sort,minVotes,media,year,reload]);
 useEffect(()=>{
  if(!active)return;
  const token=++serial.current,c=new AbortController();let current=cache.current.get(key)||empty;
  const publish=(value:HistoricalPageState)=>{
   if(token!==serial.current||c.signal.aborted)return;
   current={...value,queryKey:key};cache.current.set(key,current);
   if(cache.current.size>4)cache.current.delete(cache.current.keys().next().value!);
   setState(current);
  };
  publish({...current,loading:current.nextOffset!==null&&current.items.length<limit,error:''});
  (async()=>{
   try{
    while(current.nextOffset!==null&&current.items.length<limit&&!c.signal.aborted){
     const params=new URLSearchParams({q:query.slice(0,120),sort,minimumVotes:minVotes,media,offset:String(current.nextOffset),limit:'24'});
     if(year!==null)params.set('year',String(year));
     if(current.revision)params.set('version',current.revision);
     const response=await fetch('/api/historical-catalog?'+params,{signal:c.signal});
     if(!response.ok)throw Error(response.status===409?'CATALOG_CHANGED':'CATALOG_UNAVAILABLE');
     const data=await response.json() as {items:any[];total:number;nextOffset:number|null;revision:string;sources:Record<string,any>};
     if(!Array.isArray(data.items)||data.items.length>24||!Number.isSafeInteger(data.total)||data.total<0||typeof data.revision!=='string'||(current.revision&&data.revision!==current.revision)||(data.nextOffset!==null&&(!Number.isSafeInteger(data.nextOffset)||data.nextOffset<=(current.nextOffset||0))))throw Error('INVALID_CATALOG_PAGE');
     if(c.signal.aborted||token!==serial.current)return;
     const rows=[...new Map([...current.items,...data.items.map(historicalRow)].map(a=>[a.key,a])).values()];
     publish({items:rows,total:data.total,nextOffset:data.nextOffset,revision:data.revision,sources:data.sources,loading:data.nextOffset!==null&&rows.length<limit,error:''});
    }
    publish({...current,loading:false});
   }catch{publish({...current,loading:false,error:'CATALOG_UNAVAILABLE'})}
  })();
  return()=>c.abort();
 },[active,key,limit]);
 // A changed query must not expose the prior query's cards during the render before its effect runs.
 return state.queryKey===key?state:active?pending:empty;
}

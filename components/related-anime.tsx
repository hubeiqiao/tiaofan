'use client';
import {relationLabel} from '@/lib/relation-label';
import {useEffect,useState} from 'react';
import {useLocale} from '@/lib/i18n';
import {projectAnime,type EnglishRecord} from '@/lib/localized-content';
import type {Anime} from '@/lib/types';

type Relation={targetId:string;targetUrl:string;targetName?:string;relation:string;sourceRelation:string;sourceUrl:string;retrievedAt:string;sourceAsOf?:string;anime:Anime|null};
type RelatedPayload={relations?:Relation[]};
type Loaded={requestKey:string;relations:Relation[];records:Record<string,EnglishRecord>;error:boolean};
/** Public source facts only. The request never contains private saved state. */
export function RelatedAnime({id}:{id:number;saved?:Anime[];onDetail:(anime:Anime)=>void}){
 const {locale}=useLocale(),requestKey=id+':'+locale;
 const [loaded,setLoaded]=useState<Loaded|null>(null);
 const copy=(zh:string,en:string,ja:string)=>({zh,en,ja})[locale];
 useEffect(()=>{
  const controller=new AbortController();
  void(async()=>{
   try{
    const response=await fetch('/api/related?id='+id,{signal:controller.signal});if(!response.ok)throw Error();
    const data=await response.json() as RelatedPayload,relations=data.relations||[];
    let records:Record<string,EnglishRecord>={};
    if(locale!=='zh'){
     const ids=[...new Set(relations.map(row=>row.anime?.bgm).filter((value):value is number=>!!value))];
     if(ids.length){const translated=await fetch('/api/translations?lang='+locale+'&ids='+ids.join(','),{signal:controller.signal});if(translated.ok)records=((await translated.json()) as {items?:Record<string,EnglishRecord>}).items||{}}
    }
    if(!controller.signal.aborted)setLoaded({requestKey,relations,records,error:false});
   }catch{if(!controller.signal.aborted)setLoaded({requestKey,relations:[],records:{},error:true})}
  })();
  return()=>controller.abort();
 },[id,locale,requestKey]);
 // A new title/locale can never briefly show another request's relationships.
 if(!loaded||loaded.requestKey!==requestKey)return null;
 if(loaded.error)return <p className="fine-print">{copy('相关作品资料暂不可用。','Related-title evidence is temporarily unavailable.','関連作品の情報を現在取得できません。')}</p>;
 if(!loaded.relations.length)return null;
 const project=(a:Anime)=>projectAnime(a,loaded.records[String(a.bgm)],locale,false);
 return <section className="related-anime"><h3>{copy('有来源的作品关系','Sourced title relationships','出典付きの作品関係')}</h3><ul className="related-relations">{loaded.relations.map(relation=><li key={relation.targetId+':'+relation.sourceRelation}><a href={relation.targetUrl} target="_blank" rel="noreferrer">{relation.anime?project(relation.anime).name:relation.targetName||relation.targetId}</a><span>{relationLabel(relation.relation,locale)}</span><small>{relation.sourceAsOf?copy('档案截至：','Archive as of: ','アーカイブ基準日：'):copy('来源核对：','Checked: ','確認：')}{new Date(relation.sourceAsOf||relation.retrievedAt).toLocaleDateString(locale==='ja'?'ja-JP':locale==='en'?'en-US':'zh-CN',{timeZone:'UTC'})} · <a href={relation.sourceUrl} target="_blank" rel="noreferrer">Bangumi</a>{!relation.anime?' · '+copy('仅来源条目','Source listing only','出典へのリンクのみ'):''}</small></li>)}</ul><p className="fine-print">{copy('仅为已核对的少量关系，不是完整系列图或观看顺序。','A small verified relationship sample, not a complete franchise graph or watch order.','確認した関係の一部です。シリーズ全体の一覧や推奨視聴順ではありません。')}</p></section>;
}

import relations from '@/data/anime-relations.json';
import supplements from '@/data/recommendation-relation-evidence.json';
import {dateStatus,inDiscovery,inMedia} from './catalog';
import type {Anime} from './types';
import {sharedTagEvidence} from './source-tag-evidence';
export {sharedSourceTags,sharedTagEvidence,favoriteTagEvidence,savedTagEvidence} from './source-tag-evidence';
export function relatedAnime(seed:Anime,candidates:Anime[],options:{excludeKeys?:Iterable<string>;limit?:number;now?:number}={}){
 const excluded=new Set(options.excludeKeys||[]),now=options.now??Date.now(),today=new Date(now).toISOString().slice(0,10);
 const eligible=candidates.filter(a=>a.bgm&&a.bgm!==seed.bgm&&inDiscovery(a)&&inMedia(a,'series')&&dateStatus(a,today)==='aired'&&![a.key,a.mal?`mal:${a.mal}`:'',a.kitsuId?`kitsu:${a.kitsuId}`:''].some(k=>excluded.has(k)));
 const byId=new Map(eligible.map(a=>[a.bgm,a]));
 // Generic source-tag overlap is not sufficient recommendation evidence.
 // Keep the response shape stable, but never fill slots with weak tag matches.
 const items:Array<{anime:Anime;evidence:NonNullable<ReturnType<typeof sharedTagEvidence>>}>=[];
 const edges=([...relations.items,...supplements.items] as Array<{sourceId:number;targetId:number;type:number;relation:string;sourceRelation:string;targetName?:string;sourceUrl:string;retrievedAt:string}>).filter(r=>r.sourceId===seed.bgm&&r.type===2).slice(0,12).map(r=>({...r,targetId:`bgm:${r.targetId}`,targetUrl:`https://example.invalid/demo/subject/${r.targetId}`,anime:byId.get(r.targetId)||null,availability:byId.has(r.targetId)?'catalog':'source_only',stale:now-Date.parse(r.retrievedAt)>7*86400000}));
 return{items,relations:edges,abstained:true,abstentionReason:'INSUFFICIENT_RELEVANCE_EVIDENCE',scope:'共同标签不足以支持推荐，暂不展示相似推荐；有来源的作品关系单独展示，不代表偏好匹配或完整观看顺序。'};
}

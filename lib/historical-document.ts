import type {Anime} from './types';
import {relatedAnime} from './related-anime';
import {relationLabel} from './relation-label';
import {registryAnime,registryCandidateRows,registryCandidateDetails} from './historical-registry-content';
/** Historical exact-ID path: compact index + selected shards; never imports global metadata. */
export async function historicalDocument(id:number){
 const source=await registryAnime(id);if(!source)return null;const raw=source as Anime&typeof source;
 const links=await (await import('@/data/metadata-links-runtime')).metadataLinksFor(id)||{streams:[],sourceLinks:[]};
 const candidates=await registryCandidateRows(),related=relatedAnime(raw,candidates);
 const staticByTarget=new Map(related.relations.map(r=>[r.targetId,r]));
 const archive=(source.relations||[]).slice(0,12).flatMap((r:any)=>{const targetId='bgm:'+r.targetBgm;if(staticByTarget.has(targetId))return[];const target=candidates.find((a:Anime)=>a.bgm===r.targetBgm);if(!target)return[];return[{sourceId:id,targetId,type:2,relation:r.relation,sourceRelation:relationLabel(r.relation,'zh'),targetName:target.name,sourceUrl:source.registrySourceUrl||'https://github.com/bangumi/Archive',retrievedAt:(source as any).registryProvenance.sources['bangumi-archive']?.fetchedAt||r.sourceAt,sourceAsOf:r.sourceAt,targetUrl:'https://bgm.tv/subject/'+r.targetBgm,anime:target as Anime,availability:'catalog',stale:Date.now()-Date.parse(r.sourceAt)>7*86400000}]});
 const relations=[...related.relations,...archive].slice(0,12);const ids=[...new Set([...related.items.map(x=>x.anime.bgm!),...relations.map(r=>r.anime?.bgm).filter((id):id is number=>!!id)])];
 const details=await registryCandidateDetails(ids);
 const hydrate=(a:Anime)=>{const d=a.bgm?details[a.bgm]:null;return d?{...a,image:d.image||a.image,summary:d.summary||a.summary,rating:{...d.ratings,...a.rating}}:a};
 return{...raw,sourceLinks:[...new Map([...source.sourceLinks,...links.sourceLinks].map((link:any)=>[link.url,link])).values()] as Anime['sourceLinks'],streams:links.streams as Anime['streams'],playback:[],review:undefined,related:{...related,items:related.items.map(x=>({...x,anime:hydrate(x.anime)})),relations:relations.map(r=>({...r,anime:r.anime?hydrate(r.anime):null}))},updatedAt:source.updatedAt};
}

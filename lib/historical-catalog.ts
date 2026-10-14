/** Pure bounded read model. Its server callers own metadata; never import the full metadata registry into a client. */
import {trustedSeedIndex} from './anime-identity';
import {compareAnime,dateStatus,inDiscovery,inMedia} from './catalog';
import {kitsuEpisodeCount} from './kitsu-fields';
import type {Anime} from './types';
export const HISTORICAL_LIMIT=80;
export const HISTORICAL_SCOPE='已收录的历年高分电视作品子集，并非完整动画史或日本经典全集。';
export type HistoricalMeta={name?:string;mal?:string|number|null;metadataDate?:string;conflicts?:{mal?:unknown}};
export type KitsuRankRow={kitsu?:string;mal?:number|null;name?:string;originalName?:string;image?:string;date?:string;format?:string;episodes?:unknown;score?:number|null;count?:number|null;rank?:number;url?:string;at?:string};
const validId=(n:unknown)=>/^[1-9]\d{0,11}$/.test(String(n||''))&&Number.isSafeInteger(Number(n));
const validAnime=(a:Anime)=>!!a&&validId(a.bgm)&&a.key===`bgm:${a.bgm}`&&typeof a.name==='string'&&typeof a.format==='string'&&typeof a.date==='string'&&Array.isArray(a.tags);
const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n:null;
export function historicalCutoff(now=Date.now()){const d=new Date(now);return new Date(Date.UTC(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)*3-3,1)).toISOString().slice(0,10)}
export function inHistorical(a:Pick<Anime,'date'>,now=Date.now()){return dateStatus(a,new Date(now).toISOString().slice(0,10))==='aired'&&a.date<historicalCutoff(now)}
/** Cross-source ratings attach only through a unique, undisputed MAL -> BGM claim. */
export function trustedRankedRows(bgmInput:Anime[],kitsuInput:KitsuRankRow[],meta:Record<string,HistoricalMeta>):Anime[]{
 const bgm=bgmInput.slice(0,1000).filter(validAnime),kitsu=kitsuInput.slice(0,1000).filter(k=>validId(k.kitsu)&&validId(k.mal)&&typeof k.name==='string');
 const wanted=new Set(kitsu.map(k=>String(k.mal))),placeholders:Anime[]=[];
 for(const[id,m]of Object.entries(meta))if(validId(id)&&wanted.has(String(m.mal)))placeholders.push({key:`bgm:${id}`,bgm:Number(id),mal:Number(m.mal),name:m.name||kitsu.find(k=>String(k.mal)===String(m.mal))?.name||'',image:'',summary:'',tags:[],date:'',format:'',rating:{}});
 const sourceById=new Map(bgm.map(a=>[a.bgm,a]));
 const base=trustedSeedIndex([...placeholders,...bgm],meta),proposals:Anime[]=[];
 for(const k of kitsu){const a=base.byKey.get(`mal:${k.mal}`);if(!a?.bgm)continue;const source=sourceById.get(a.bgm);proposals.push({...a,kitsuId:String(k.kitsu),...(source?{}:{name:meta[String(a.bgm)]?.name||k.name!,originalName:k.originalName||k.name,image:k.image||'',date:k.date||'',format:k.format||'',episodes:kitsuEpisodeCount(k.episodes),metadataDate:meta[String(a.bgm)]?.metadataDate})})}
 const checked=trustedSeedIndex([...bgm,...proposals],meta),result:Anime[]=[];
 for(const a of checked.canonical.values()){
  if(!a.bgm)continue;const source=sourceById.get(a.bgm),k=a.kitsuId?kitsu.find(row=>String(row.kitsu)===a.kitsuId&&Number(row.mal)===a.mal):undefined;
  // Synthesized cards require a verified identity bridge; ambiguous Kitsu rows never become cards.
  if(!source&&!k)continue;
  const row={...a,rating:{...(source?.rating||{})}};
  if(k&&typeof k.url==='string'&&/^https:\/\/kitsu\.app\//.test(k.url))row.rating.kitsu={score:finite(k.score),count:finite(k.count),rank:typeof k.rank==='number'&&Number.isSafeInteger(k.rank)&&k.rank>0?k.rank:undefined,url:k.url,at:k.at};
  result.push(row);
 }
 return result;
}
export function buildHistoricalPool(bgmRows:Anime[],kitsuRows:KitsuRankRow[],meta:Record<string,HistoricalMeta>,now=Date.now()){
 const ranked=trustedRankedRows(bgmRows,kitsuRows,meta),tv=ranked.filter(a=>inDiscovery(a)&&inMedia(a,'series'));
 const eligible=tv.filter(a=>inHistorical(a,now)).sort((a,b)=>compareAnime(a,b,'bgm',new Date(now).toISOString().slice(0,10))||a.bgm!-b.bgm!);
 return{items:eligible.slice(0,HISTORICAL_LIMIT),total:eligible.length,truncated:eligible.length>HISTORICAL_LIMIT,unknownDateCount:tv.filter(a=>dateStatus(a)==='unknown').length,cutoffDate:historicalCutoff(now),scope:HISTORICAL_SCOPE};
}

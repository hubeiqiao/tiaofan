import {resolvePlatformLinks} from './curated-platforms';
import {watchListingsFor} from './watch-listings';
import {trustedRankedRows,type HistoricalMeta,type KitsuRankRow} from './historical-catalog';
import {trustedSeedIndex} from './anime-identity';
import {relatedAnime} from './related-anime';
import {historicalDocument} from './historical-document';
async function publicMetadata(){return(await import('@/data/metadata-runtime')).default}
import editorial from '@/data/editorial.json';
import reviews from '@/data/reviews.json';
import playback from '@/data/playback.json';
import {safeSnapshot,currentPeriods,catalogKey} from './snapshots';
import {withTitle} from './known-titles';
import {inCatalogSeason,inDiscovery,inMedia,compareAnime} from './catalog';
import type {Anime} from './types';
export const SEASONS=['winter','spring','summer','autumn'] as const;
export const SEASON_NAMES=['冬','春','夏','秋'];
export async function seasonContent(year:number,quarter:number){const snap=await safeSnapshot(catalogKey(year,quarter));if(!snap)return null;const rows:Anime[]=JSON.parse(snap.payload).items.map(withTitle);return{year,quarter,updatedAt:snap.updated_at,items:rows.filter(a=>inDiscovery(a)&&inMedia(a,'series')&&inCatalogSeason(a,year,quarter)).sort((a,b)=>compareAnime(a,b,'bgm'))};}
export async function publicRows(){
 const metadata=await publicMetadata(),p=currentPeriods();
 const snapshots=await Promise.all(['rank:bgm',catalogKey(p.previous.year,p.previous.quarter),catalogKey(p.current.year,p.current.quarter),'rank:kitsu'].map(safeSnapshot));
 // Rank first, current catalog last: source premiere/details win over stale ranked duplicates.
 const rows:Anime[]=snapshots.slice(0,3).flatMap(s=>s?JSON.parse(s.payload).items:[]);
 const kitsu:KitsuRankRow[]=snapshots[3]?JSON.parse(snapshots[3].payload).items:[];
 return{items:trustedRankedRows(rows,kitsu,metadata.items as Record<string,HistoricalMeta>).filter(inDiscovery).map(withTitle),updatedAt:Math.max(0,...snapshots.map(s=>s?.updated_at||0))};
}
export async function animeContent(id:number){const p=currentPeriods(),recent=await Promise.all([catalogKey(p.current.year,p.current.quarter),catalogKey(p.previous.year,p.previous.quarter),'rank:bgm'].map(safeSnapshot));const present=recent.some(s=>s&&JSON.parse(s.payload).items.some((a:Anime)=>a.bgm===id));if(!present){const historical=await historicalDocument(id);if(historical)return {...historical,watchListings:watchListingsFor(id)}}const metadata=await publicMetadata();const{items,updatedAt}=await publicRows();const raw=items.find(a=>a.bgm===id);if(!raw)return null;const [live,kitsu]=await Promise.all([safeSnapshot('metadata:seasonal'),safeSnapshot('kitsu:seasonal')]);const m=(metadata.items as Record<string,any>)[id]||{},fresh=live?JSON.parse(live.payload).items[id]||{}:{},e=(editorial.items as Record<string,any>)[id],r=(reviews.items as Record<string,any>)[id];const safeIdentity=trustedSeedIndex([raw],metadata.items as Record<string,HistoricalMeta>).byKey.get(`mal:${m.mal}`);const score=safeIdentity?.bgm===id&&m.mal&&!m.conflicts?.mal&&!['639938','551918'].includes(String(id))&&kitsu?JSON.parse(kitsu.payload).byMal[m.mal]:null;const rating={...raw.rating};if(score?.score!=null)rating.kitsu={score:score.score,count:score.count,rank:score.rank,url:score.url,at:score.at};return{...raw,rating,related:relatedAnime(raw,items),summary:e?.summary||raw.summary||'',editorial:e,review:r,playback:(playback.items as Record<string,any[]>)[id]||[],watchListings:watchListingsFor(id),...resolvePlatformLinks(id,m,fresh),updatedAt};}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c');}

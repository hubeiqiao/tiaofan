/** Server-only snapshot adapter: fixed read-only keys; no external fetches or client metadata dump. */
import {safeSnapshot,type Snapshot} from './snapshots';
import {buildHistoricalPool,type HistoricalMeta,type KitsuRankRow} from './historical-catalog';
import {withTitle} from './known-titles';
import type {Anime} from './types';
function items<T>(s:Snapshot|null):T[]{if(!s)return[];try{const data=JSON.parse(s.payload);return Array.isArray(data.items)?data.items.slice(0,1000):[]}catch{return[]}}
export async function historicalContent(now=Date.now()){
 const metadata=(await import('@/data/metadata-runtime')).default;
 const snapshots=await Promise.all(['rank:bgm','rank:kitsu'].map(safeSnapshot));
 const pool=buildHistoricalPool(items<Anime>(snapshots[0]),items<KitsuRankRow>(snapshots[1]),metadata.items as Record<string,HistoricalMeta>,now);
 const sources=snapshots.filter((s):s is Snapshot=>!!s).map(s=>({key:s.key,sourceUrl:s.source_url,updatedAt:new Date(s.updated_at).toISOString(),attemptedAt:new Date(s.attempted_at).toISOString(),stale:now-s.updated_at>12*3600000,lastAttemptFailed:!!s.last_error}));
 return{...pool,items:pool.items.map(withTitle),updatedAt:sources.length?Math.min(...snapshots.filter((s):s is Snapshot=>!!s).map(s=>s.updated_at)):0,sources,missingSources:['rank:bgm','rank:kitsu'].filter((_,i)=>!snapshots[i])};
}

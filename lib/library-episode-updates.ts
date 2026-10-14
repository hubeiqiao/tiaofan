import type {Anime} from './types';
import {recentEpisodeAdvance} from '@/lib/episode-updates';

/** Private membership is intersected only in memory with current public evidence. */
export function libraryEpisodeUpdateIds(saved:Anime[],publicRows:Anime[],status:string,now=Date.now()):Set<number>{
 if(status!=='ready'&&status!=='checking')return new Set();
 const ids=new Set(saved.filter(a=>Number.isSafeInteger(a.bgm)&&a.bgm!>0&&a.key==='bgm:'+a.bgm).map(a=>a.bgm!));
 return new Set(publicRows.filter(a=>a.bgm&&ids.has(a.bgm)&&a.key==='bgm:'+a.bgm&&recentEpisodeAdvance(a.watchListings,now)).map(a=>a.bgm!));
}

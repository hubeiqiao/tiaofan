import type {Anime} from './types';
import {isWatchlistState} from './types';
import type {PersonalArgs,PersonalMeta,PersonalSnapshots,SavedSignal} from './personal-recommendations';
import {trustedSeedIndex} from './anime-identity';
import {dateStatus,inCatalogSeason,inDiscovery,inMedia} from './catalog';
import {inHistorical} from './historical-catalog';
import {preferenceConstraints} from './preference-constraints';
import {sharedSourceTags,sharedTagEvidence} from './source-tag-evidence';
import {japaneseLanguageEligible,recommendationEntryStatus,recommendationSeriesKey,recommendationSeriesMembers,savedSeriesKeys} from './recommendation-series';

const generic=new Set(['战斗','冒险','剧情','青春','友情']);
export function meaningfulSharedTags(seed:Anime,candidate:Anime):string[]{const tags=sharedSourceTags(seed,candidate);return tags.length>=2&&tags.some(tag=>!generic.has(tag))?tags:[]}
/** Title markers are negative evidence only. Their absence never verifies entry order. */
export function explicitSequelTitle(anime:Anime){
 const compilation=/(?:总集篇|总集编|総集編|総集篇|recap|compilation)/i;
 if(anime.tags?.some(tag=>compilation.test(tag.normalize('NFKC'))))return true;
 return [anime.name,anime.originalName,...(anime.aliases||[])].filter((s):s is string=>typeof s==='string').some(raw=>{
  const title=raw.normalize('NFKC');if(compilation.test(title))return true;
  for(const match of title.matchAll(/第?\s*([0-9一二三四五六七八九十百]+)\s*[季期部]/g))if(!['1','一'].includes(match[1]))return true;
  return /(?:(?:season|part)\s*(?:[2-9]\d*|1\d+|ii\b|iii\b)|\b(?:2nd|3rd|[4-9]th|\d{2,}th)\s*(?:season|part)|(?:^|[^A-Za-z])(?:II|III|IV|V|VI|VII|VIII|IX|X)(?=$|[^A-Za-z]))/i.test(title);
 });
}

const aliases=(a:Anime)=>[a.key,a.bgm?`bgm:${a.bgm}`:'',a.mal?`mal:${a.mal}`:'',a.kitsuId?`kitsu:${a.kitsuId}`:'',...((a as Anime&{personalBlockedAliases?:string[]}).personalBlockedAliases||[])].filter(Boolean);
const rank=(a:Anime)=>{const r=a.rating?.bgm;return typeof r?.score==='number'&&Number.isFinite(r.score)?r.score:-1};
/** Public source comparison only. No model, network, private payload or browser persistence. */
export function prepareSourcePersonal(args:PersonalArgs,saved:SavedSignal[],snapshots:PersonalSnapshots,meta:Record<string,PersonalMeta>,now:number){
 if(saved.length>500)throw new RangeError('片单超过本次比较上限，暂不能完整排除已保存作品。');
 if(!Number.isFinite(now))throw new RangeError('Source comparison requires a finite time.');
 const all=[...(snapshots.history?.items||[]),...(snapshots.historical?.items||[]),...snapshots.previous.items,...snapshots.current.items];
 const identity=trustedSeedIndex(all,meta),savedKeys=new Set(saved.map(r=>r.anime_key)),blocked=savedSeriesKeys(saved,identity);
 for(const row of saved){const a=identity.byKey.get(row.anime_key);if(a)for(const key of aliases(a))savedKeys.add(key);for(const key of identity.claims.get(row.anime_key)||[])savedKeys.add(key)}
 const resolved=saved.filter(r=>isWatchlistState(r.state)).map(row=>({row,anime:identity.byKey.get(row.anime_key)})).filter((s):s is {row:SavedSignal;anime:Anime}=>!!s.anime).sort((a,b)=>Number(b.row.favorite===1)-Number(a.row.favorite===1)||b.row.updated_at-a.row.updated_at||a.anime.key.localeCompare(b.anime.key));
 const seenSeeds=new Set<string>(),signals=resolved.filter(s=>{if(seenSeeds.has(s.anime.key))return false;seenSeeds.add(s.anime.key);return true}).slice(0,60);
 const selected=(args.period==='historical'?snapshots.historical:snapshots[args.period])||{items:[],updatedAt:now};
 const d=new Date(now),p=new Date(Date.UTC(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)*3+(args.period==='previous'?-3:0),1)),today=d.toISOString().slice(0,10),c=preferenceConstraints(args.q),seen=new Set<number>();
 const candidates=selected.items.filter(a=>{
  if(!Number.isSafeInteger(a.bgm)||a.bgm!<1||a.key!==`bgm:${a.bgm}`||seen.has(a.bgm!)||!Array.isArray(a.tags))return false;seen.add(a.bgm!);
  const entry=recommendationEntryStatus(a.bgm!),end=meta[String(a.bgm)]?.end||a.end,ended=!!end&&Number.isFinite(Date.parse(end))&&Date.parse(end)<now;
  return !aliases(a).some(k=>savedKeys.has(k))&&!blocked.has(recommendationSeriesKey(a.bgm!))&&entry!=='known_non_entry'&&entry!=='conflict'&&!explicitSequelTitle(a)&&japaneseLanguageEligible(a,meta)&&inDiscovery(a)&&inMedia(a,args.media)&&(args.period==='historical'?inMedia(a,'series')&&inHistorical(a,now):inCatalogSeason(a,p.getUTCFullYear(),Math.floor(p.getUTCMonth()/3)))&&dateStatus(a,today)==='aired'&&((c.maximum===null&&c.minimum===null)||(typeof a.episodes==='number'&&a.episodes>0&&(c.maximum===null||a.episodes<=c.maximum)&&(c.minimum===null||a.episodes>=c.minimum)))&&(!c.ended||ended)&&(!c.excludeEnded||!!end&&Number.isFinite(Date.parse(end))&&!ended)&&!c.excluded.some(tag=>a.tags.includes(tag));
 });
 const ranked=candidates.map(anime=>{
  const evidence=signals.flatMap(({row,anime:seed})=>{const tags=meaningfulSharedTags(seed,anime);if(!tags.length)return [];const e=sharedTagEvidence(seed,anime)!;return [{...e,tags,seed:{...e.seed,state:row.state,favorite:row.favorite===1},signal:row.favorite===1?'explicit_favorite':'library_context'}]}).sort((a,b)=>Number(b.seed.favorite)-Number(a.seed.favorite)||b.tags.length-a.tags.length||a.seed.id.localeCompare(b.seed.id));
  return{anime,evidence,favoriteTags:evidence.filter(e=>e.seed.favorite).reduce((n,e)=>n+e.tags.length,0),totalTags:evidence.reduce((n,e)=>n+e.tags.length,0)};
 }).filter(x=>x.evidence.length).sort((a,b)=>b.favoriteTags-a.favoriteTags||b.totalTags-a.totalTags||rank(b.anime)-rank(a.anime)||a.anime.bgm!-b.anime.bgm!);
 const distinct=(rows:Anime[])=>{const groups=new Set<number>();return rows.filter(a=>{const group=recommendationSeriesKey(a.bgm!);if(groups.has(group))return false;groups.add(group);return true}).slice(0,6)};
 const chosen=distinct(ranked.map(x=>x.anime)),items=chosen.map(a=>({bgm:a.bgm!,entryStatus:recommendationEntryStatus(a.bgm!),evidence:ranked.find(x=>x.anime.bgm===a.bgm)!.evidence.slice(0,3)}));
 const discoveryCandidates=distinct([...candidates].sort((a,b)=>rank(b)-rank(a)||a.bgm!-b.bgm!));
 // A few public family aliases let the open screen remove a newly saved series immediately.
 const withFamily=(row:Anime):Anime=>{const members=new Set(recommendationSeriesMembers(row.bgm!));return {...row,recommendationFamilyKeys:[...new Set([...members].map(id=>`bgm:${id}`).concat(all.filter(a=>a.bgm&&members.has(a.bgm)).flatMap(aliases)))]}};
 return{items,candidates:chosen.map(withFamily),discoveryCandidates:discoveryCandidates.map(withFamily),candidatePoolCount:candidates.length,preselectedCount:chosen.length,sourceAt:new Date(selected.updatedAt).toISOString(),profileSourceAt:new Date(Math.min(...Object.values(snapshots).filter(Boolean).map(s=>s!.updatedAt))).toISOString(),profileUpdatedAt:saved.length?new Date(Math.max(...saved.map(r=>r.updated_at))).toISOString():null,profileSummary:{seedTitles:signals.map(({anime,row})=>({key:anime.key,title:anime.name,state:row.state,favorite:row.favorite===1})),matchedCount:resolved.length,unmatchedCount:saved.length-resolved.length,coldStart:signals.length===0},constraints:c};
}

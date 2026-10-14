/** Pure deterministic preselection. Callers own source reads and detail hydration. */
import {dateStatus,inDiscovery,inMedia} from './catalog';
import {inHistorical} from './historical-catalog';
import {sharedSourceTags} from './source-tag-evidence';
import {isWatchlistState,type Anime,type Rating} from './types';

export const HISTORICAL_PRESELECTION_LIMIT=80;
export const HISTORICAL_PROFILE_LIMIT=60;
export const HISTORICAL_SAVED_LIMIT=500;

/** Compact public rows need no synopsis, poster, reviews, or full metadata module. */
export type HistoricalPreselectionRow=Pick<Anime,'key'|'name'|'tags'|'date'|'format'> &
 Partial<Pick<Anime,'bgm'|'mal'|'kitsuId'|'episodes'|'end'|'rating'|'image'|'summary'>> &
 {personalBlockedAliases?:string[]};
export type HistoricalSavedSignal={anime_key:string;state:string;updated_at:number;favorite?:number};
export type HistoricalResolvedSignal={row:HistoricalSavedSignal;anime:HistoricalPreselectionRow};
export type HistoricalIdentity={
 byKey:ReadonlyMap<string,HistoricalPreselectionRow>;
 claims:ReadonlyMap<string,ReadonlySet<string>>;
};
export type HistoricalHardConstraints={maximum:number|null;minimum:number|null;ended:boolean;excludeEnded:boolean;excluded:readonly string[]};
export type HistoricalPreselectionReason={
 seedId:string;
 tags:string[];
 signal:'explicit_favorite'|'viewing_exposure'|'tentative_interest';
 status:string;
 favorite:boolean;
};
export type HistoricalPreselectionOptions<T extends HistoricalPreselectionRow>={
 rows:readonly T[];
 saved:readonly HistoricalSavedSignal[];
 /** Use trustedSeedIndex, including all registry identities and saved profile sources. */
 identity:HistoricalIdentity;
 constraints:HistoricalHardConstraints;
 metadata?:Readonly<Record<string,{end?:string}>>;
 now:number;
 media?:'series'|'movie'|'other'|'all';
};
export class HistoricalSavedLimitError extends Error{
 readonly status=422;
 constructor(){super('片单超过本次比较上限，暂不能完整排除已保存作品。');this.name='HistoricalSavedLimitError'}
}

const validKey=(key:string)=>/^(bgm|mal|kitsu):[1-9]\d{0,11}$/.test(key);
const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
const aliases=(a:HistoricalPreselectionRow,includeBlocked=false)=>[
 a.key,a.bgm?`bgm:${a.bgm}`:'',a.mal?`mal:${a.mal}`:'',a.kitsuId?`kitsu:${a.kitsuId}`:'',
 ...(includeBlocked?a.personalBlockedAliases||[]:[])
].filter(Boolean);
const stableText=(a:string,b:string)=>a<b?-1:a>b?1:0;
const tagAnime=(a:HistoricalPreselectionRow):Anime=>({...a,image:a.image||'',summary:a.summary||'',rating:a.rating||{}});
const validRow=(a:HistoricalPreselectionRow)=>!!a&&Number.isSafeInteger(a.bgm)&&a.bgm!>0&&a.key===`bgm:${a.bgm}`&&typeof a.name==='string'&&typeof a.format==='string'&&typeof a.date==='string'&&Array.isArray(a.tags);
function sourceRank(rating:Rating|undefined,scale:number){
 const score=rating?.score;
 const known=finite(score)&&score!>=0&&score!<=scale;
 return{score:known?score!:-1,count:known&&finite(rating?.count)&&rating!.count!>=0?rating!.count!:0};
}
function validEnd(value:unknown){
 // Accept the public metadata's ISO timestamps or dates, never relative/text dates.
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))return null;
 if(dateStatus({date:value.slice(0,10)},'9999-12-31')==='unknown')return null;
 const time=Date.parse(value);return Number.isFinite(time)?time:null;
}

/**
 * Exclude every saved key/claimed identity and apply hard constraints BEFORE cap 80.
 * Favorite overlap outranks exposure/interest. Done alone is never taste evidence.
 * BGM (0–10) and Kitsu (0–100) remain separate lexicographic tie-break fields.
 */
export function preselectHistoricalCandidates<T extends HistoricalPreselectionRow>(options:HistoricalPreselectionOptions<T>){
 const {rows,saved,identity,constraints:c,metadata={},now,media='series'}=options;
 if(saved.length>HISTORICAL_SAVED_LIMIT)throw new HistoricalSavedLimitError();
 if(!Number.isFinite(now))throw new RangeError('Historical preselection requires a finite source time.');
 const savedKeys=new Set(saved.map(row=>row.anime_key));
 for(const row of saved){
  const resolved=identity.byKey.get(row.anime_key);
  // Exact saved canonicals remain authoritative. A saved ambiguous alias excludes
  // every claimant, but an unsaved ambiguous alias cannot become taste evidence.
  if(resolved)for(const key of aliases(resolved))savedKeys.add(key);
  for(const key of identity.claims.get(row.anime_key)||[])savedKeys.add(key);
 }
 const matched=saved.filter(row=>validKey(row.anime_key)&&isWatchlistState(row.state))
  .map(row=>({row,anime:identity.byKey.get(row.anime_key)}))
  .filter((value):value is HistoricalResolvedSignal=>!!value.anime)
  .sort((a,b)=>Number(b.row.favorite===1)-Number(a.row.favorite===1)||(finite(b.row.updated_at)?b.row.updated_at:0)-(finite(a.row.updated_at)?a.row.updated_at:0)||stableText(a.anime.key,b.anime.key)||stableText(a.row.anime_key,b.row.anime_key));
 const profileSignals=matched.slice(0,HISTORICAL_PROFILE_LIMIT);
 // Multiple saved aliases cannot multiply a title's contribution to a rank.
 const seedKeys=new Set<string>();
 const seeds=profileSignals.filter(s=>{if(seedKeys.has(s.anime.key))return false;seedKeys.add(s.anime.key);return s.row.favorite===1||s.row.state==='watching'||s.row.state==='want'})
  .map(s=>({...s,anime:tagAnime(s.anime)}));
 const seen=new Set<number>(),today=new Date(now).toISOString().slice(0,10);
 const eligible=rows.filter(validRow).filter(a=>{
  if(seen.has(a.bgm!))return false;seen.add(a.bgm!);
  if(aliases(a,true).some(key=>savedKeys.has(key))||!inDiscovery(a)||!inMedia(a,media)||!inMedia(a,'series')||!inHistorical(a,now)||dateStatus(a,today)!=='aired')return false;
  if((c.maximum!==null||c.minimum!==null)&&(!finite(a.episodes)||a.episodes!<=0||(c.maximum!==null&&a.episodes!>c.maximum)||(c.minimum!==null&&a.episodes!<c.minimum)))return false;
  const end=validEnd(metadata[String(a.bgm)]?.end??a.end);
  if(c.ended&&(end===null||end>=now))return false;
  if(c.excludeEnded&&(end===null||end<now))return false;
  return !c.excluded.some(tag=>a.tags.includes(tag));
 });
 const ranked=eligible.map(row=>{
  const candidate=tagAnime(row),reasons:HistoricalPreselectionReason[]=[];
  let favoriteTags=0,favoriteSeeds=0,watchingTags=0,watchingSeeds=0,wantTags=0,wantSeeds=0;
  for(const seed of seeds){
   const tags=sharedSourceTags(seed.anime,candidate);if(!tags.length)continue;
   const favorite=seed.row.favorite===1,signal=favorite?'explicit_favorite':seed.row.state==='watching'?'viewing_exposure':'tentative_interest';
   reasons.push({seedId:seed.anime.key,tags,signal,status:seed.row.state,favorite});
   if(favorite){favoriteTags+=tags.length;favoriteSeeds++}else if(seed.row.state==='watching'){watchingTags+=tags.length;watchingSeeds++}else{wantTags+=tags.length;wantSeeds++}
  }
  const bgm=sourceRank(row.rating?.bgm,10),kitsu=sourceRank(row.rating?.kitsu,100);
  return{row,reasons,rank:[favoriteTags,favoriteSeeds,watchingTags,watchingSeeds,wantTags,wantSeeds,bgm.score,bgm.count,kitsu.score,kitsu.count]};
 });
 ranked.sort((a,b)=>{for(let i=0;i<a.rank.length;i++){const order=b.rank[i]-a.rank[i];if(order)return order}return a.row.bgm!-b.row.bgm!});
 const selected=ranked.slice(0,HISTORICAL_PRESELECTION_LIMIT);
 const reasons=Object.fromEntries(selected.map(({row,reasons})=>[row.key,
  (['explicit_favorite','viewing_exposure','tentative_interest'] as const).flatMap(signal=>reasons.filter(reason=>reason.signal===signal).sort((a,b)=>b.tags.length-a.tags.length||stableText(a.seedId,b.seedId)).slice(0,3))
 ]));
 return{
  selectedIds:selected.map(item=>item.row.bgm!),rows:selected.map(item=>item.row),
  eligiblePoolCount:eligible.length,preselectedCount:selected.length,truncated:eligible.length>selected.length,
  profileSignals,matchedSignalCount:matched.length,profileTruncated:matched.length>HISTORICAL_PROFILE_LIMIT,reasons,
 };
}

/** Pure public ranking projection. Source rank is never a filtered-list ordinal. */
import {fullDate,historicalCutoff,registryFormat} from './historical-registry.mjs';
export const RANKING_PAGE_SIZE=24;
const positive=value=>Number.isSafeInteger(value)&&value>0;
const normalized=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s·・:：—–\-]/g,'');
function inMedia(row,media){const f=registryFormat(row.format);if(f==='ONA'&&row.bgm!==639938)return false;return media==='all'||media==='series'&&(f==='TV'||row.bgm===639938)||media==='movie'&&f==='movie'||media==='other'&&['OVA','other'].includes(f);}
function validRating(r,source){if(!r||!positive(r.rank)||typeof r.score!=='number'||!Number.isFinite(r.score)||r.score<=0||r.score>(source==='kitsu'?100:10)||!positive(r.count)||!Number.isFinite(Date.parse(r.at)))return false;try{const url=new URL(r.url);return url.protocol==='https:'&&!url.username&&!url.password&&(source==='kitsu'?url.hostname==='kitsu.app':['bgm.tv','bangumi.tv','chii.in'].includes(url.hostname));}catch{return false;}}
export function queryRanking({source,registry,snapshot},{offset=0,limit=24,top=500,media='series',query='',minimumVotes=0,version=null,airing='all'}={},now=Date.now()){
 if(!['bgm','kitsu'].includes(source)||!Number.isSafeInteger(offset)||offset<0||offset>500||!Number.isSafeInteger(limit)||limit<1||limit>24||![250,500].includes(top)||!['series','movie','other','all'].includes(media)||typeof query!=='string'||query.length>120||!Number.isSafeInteger(minimumVotes)||minimumVotes<0||minimumVotes>10000000||!['all','aired','upcoming','unknown'].includes(airing))throw Error('INVALID_RANKING_QUERY');
 const cutoff=historicalCutoff(now),today=new Date(now).toISOString().slice(0,10);
 if(source==='bgm'&&(!registry?.revision||!Array.isArray(registry.items))||source==='kitsu'&&(!Number.isFinite(Date.parse(snapshot?.at))||!Array.isArray(snapshot?.items)))throw Error('RANKING_UNAVAILABLE');
 const revision=source==='bgm'?`bgm:${registry.revision}:${cutoff}`:`kitsu:${snapshot.at}${airing==='all'?'':':date:'+today}`;
 if(version&&version!==revision)throw Error('RANKING_VERSION_CHANGED');
 const raw=source==='bgm'?registry.items:snapshot.items;
 const malClaims=new Map();if(source==='kitsu')for(const row of raw){if(!positive(row.mal)||!/^[1-9]\d{0,11}$/.test(String(row.kitsu)))continue;const claims=malClaims.get(row.mal)||new Set();claims.add(String(row.kitsu));malClaims.set(row.mal,claims);}
 const candidates=raw.flatMap(row=>{
  if(source==='bgm'){
   if(row.hiddenReason||!fullDate(row.date)||row.date>=cutoff||!positive(row.bgm))return[];
   const rating=row.rating||row.details?.ratings||{};if(!validRating(rating.bgm,source))return[];
   return[{key:`bgm:${row.bgm}`,bgm:row.bgm,name:row.title,originalName:row.originalTitle||'',aliases:row.aliases||[],format:row.format,date:row.date,tags:row.tags||row.details?.tags||[],episodes:row.episodes||row.details?.episodes||undefined,end:row.end||undefined,rating:{...rating},image:'',summary:'',sourceRank:rating.bgm.rank,sourceAt:rating.bgm.at}];
  }
  const rating={score:row.score,count:row.count,rank:row.rank,url:row.url,at:row.at};if(!/^[1-9]\d{0,11}$/.test(String(row.kitsu))||!validRating(rating,source))return[];
  return[{key:`kitsu:${row.kitsu}`,mappingEligible:positive(row.mal)&&malClaims.get(row.mal)?.size===1,mal:positive(row.mal)?row.mal:undefined,kitsuId:String(row.kitsu),name:row.name,originalName:row.originalName||row.name,format:row.format||'',date:row.date||'',tags:[],episodes:positive(row.episodes)?row.episodes:undefined,rating:{kitsu:rating},image:row.image||'',summary:'',sourceRank:rating.rank,sourceAt:rating.at}];
 });
 const needle=normalized(query),matching=candidates.filter(row=>inMedia(row,media)&&row.rating[source].count>=minimumVotes&&(!needle||[row.name,row.originalName,...(row.aliases||[])].some(value=>normalized(value).includes(needle)))&&(airing==='all'||(fullDate(row.date)?row.date>today?'upcoming':'aired':'unknown')===airing)).sort((a,b)=>a.sourceRank-b.sourceRank||(a.bgm||Number(a.kitsuId))-(b.bgm||Number(b.kitsuId)));
 const total=Math.min(top,matching.length),items=matching.slice(offset,Math.min(offset+limit,total)).map((row,i)=>({...row,displayPosition:offset+i+1}));
 const dates=candidates.map(x=>x.sourceAt).sort();
 return{source,revision,items,total,nextOffset:offset+items.length<total?offset+items.length:null,coverage:{scope:source==='bgm'?'dated-collected-historical-ranking':'bounded-source-ranking-snapshot',completeSourceRanking:false,sourceTotal:source==='kitsu'&&Number.isSafeInteger(snapshot.total)?snapshot.total:null,collectedCandidates:source==='bgm'?candidates.length:raw.length,rankedCandidates:candidates.length,matchingTitles:matching.length,windowTitles:total,windowLimit:top,upstreamHasMore:source==='kitsu'?snapshot.hasNext===true:null,sourceCandidateLimit:source==='kitsu'?snapshot.coverage?.rawLimit||raw.length:null,archiveAsOf:source==='bgm'?registry.sources?.['bangumi-archive']?.at||null:null,sourceDateRange:dates.length?[dates[0],dates.at(-1)]:[],snapshotAt:source==='kitsu'?snapshot.at:registry.generatedAt||null,sourceUrl:source==='bgm'?registry.sources?.['bangumi-archive']?.url||null:'https://kitsu.app/api/edge/anime?sort=-averageRating',cutoffDate:source==='bgm'?cutoff:null}};
}
/** Hydrate only this page. Ranking fields cannot be overwritten by older detail. */
export async function hydrateRankingPage(page,loadDetails){
 if(page.items.length>RANKING_PAGE_SIZE)throw Error('RANKING_PAGE_TOO_LARGE');
 const ids=page.items.filter(row=>positive(row.bgm)).map(row=>row.bgm);if(!ids.length)return page;
 const details=await loadDetails(ids);
 return{...page,items:page.items.map(row=>{const d=details[row.bgm];return d?{...row,image:d.image||row.image,summary:d.summary||row.summary,tags:d.tags||row.tags,episodes:d.episodes||row.episodes}:row})};
}

import type {Stream,SourceLink} from './types';
import overlay from '@/data/curated-platforms.json';

type Link = Record<string,unknown> & {url:string};
type MetadataLinks = {streams?:Link[];sourceLinks?:Link[];[key:string]:unknown};
export type CuratedPlatform = Link & {bgm:number;state:'active'|'revoked';classification:string;observedAt:string;recheckAfter:string;expiresAt:string;identityScope:'exact-film';regions:string[]|null};
type Catalog = {items:Record<string,{name:string;originalName?:string;format:string;identityEvidence:string[]}>;links:CuratedPlatform[]};
const catalog = overlay as Catalog;
const EXPIRED_NOTE='复核已到期，仅保留历史作品资料；当前上线与可用性待重新确认。';
const canonical = (value:string) => {try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&!u.hash?u.href:null}catch{return null}};
export function curatedIdentity(id:string|number){return catalog.items[String(id)];}
/** The newest upstream array is authoritative. Only reviewed exact-ID overlay rows may be added. */
export function resolvePlatformLinks(id:string|number,base:MetadataLinks={},live:MetadataLinks={},now=Date.now(),data:Catalog=catalog){
 const rows=data.links.filter(row=>String(row.bgm)===String(id));
 const revoked=new Set(rows.filter(row=>row.state==='revoked').map(row=>canonical(row.url)));
 const active=rows.filter(row=>row.state==='active'&&row.identityScope==='exact-film'&&canonical(row.url)&&new URL(row.url).protocol==='https:'&&Number.isFinite(Date.parse(row.observedAt))&&Date.parse(row.observedAt)<=now&&Number.isFinite(Date.parse(row.expiresAt))&&Number.isFinite(Date.parse(row.recheckAfter))&&!revoked.has(canonical(row.url)));
 const prior=new Map((base.streams||[]).map(row=>[canonical(row.url),row]));
 const streams=new Map<string,Link>();
 for(const stream of live.streams ?? base.streams ?? []){
  const key=canonical(stream.url);if(!key||revoked.has(key))continue;
  // Enrich only links still present upstream; a live [] never resurrects stale base links.
  streams.set(key,{...prior.get(key),...stream});
 }
 const sourceLinks=new Map<string,Link>();
 for(const link of live.sourceLinks ?? base.sourceLinks ?? []){const key=canonical(link.url);if(key&&!revoked.has(key))sourceLinks.set(key,link);}
 for(const row of active){
  const key=canonical(row.url)!,expired=Date.parse(row.expiresAt)<=now;
  const link={name:row.name,url:row.url,regions:row.regions,scope:'film',note:expired?[row.note,EXPIRED_NOTE].filter(Boolean).join(' '):row.note,reviewStatus:expired?'expired':Date.parse(row.recheckAfter)<=now?'due':'current',provenance:'curated:exact-bgm:'+id,sourceUrl:row.sourceUrl,retrievedAt:row.observedAt,classification:row.classification,identityScope:row.identityScope,evidenceUrls:row.evidenceUrls,regionVerified:false,playbackVerified:false,userEntitlementVerified:false};
  if(!expired&&['official-title-offer','official-title-catalog-and-distribution-announcement','official-full-feature-title-listing'].includes(row.classification)){
   // Upstream region/access fields always win over an unknown curated storefront.
   const upstream=streams.get(key);streams.set(key,{...link,...upstream});
  }else if(!streams.has(key))sourceLinks.set(key,{...link,kind:'info',...(expired?{classification:'expired-curated-title-info'}:{})});
 }
 if(String(id)==='633836')for(const [key,link]of streams)streams.set(key,{...link,scope:'series',scopeLabel:'第四季整体作品页 · 请在平台内选择夺还篇（源站12–19集）'});
 if(String(id)==='639938')for(const [key,link]of streams)if(new URL(key).hostname.replace(/^www\./,'')==='netflix.com')streams.set(key,{...link,scope:'series',scopeLabel:'系列整体页面 · 请在平台内选择第二、第三赛段'});
 return {streams:[...streams.values()] as Stream[],sourceLinks:[...sourceLinks.values()] as SourceLink[]};
}

/** Read-only review queue. Dates remain the original public-page observations. */
export function curatedPlatformStatus(now=Date.now()){
 const entries=catalog.links.map(row=>({bgm:row.bgm,name:row.name,url:row.url,state:row.state,observedAt:row.observedAt,recheckAfter:row.recheckAfter,expiresAt:row.expiresAt,reviewDue:row.state==='active'&&Date.parse(row.recheckAfter)<=now,informationalOnly:row.state==='active'&&(Date.parse(row.expiresAt)<=now||!['official-title-offer','official-title-catalog-and-distribution-announcement','official-full-feature-title-listing'].includes(row.classification))}));
 return {automaticFetch:false,reviewMethod:'manual-public-title-page-review',dueCount:entries.filter(row=>row.reviewDue).length,expiredCount:entries.filter(row=>row.state==='active'&&Date.parse(row.expiresAt)<=now).length,nextReviewAt:entries.filter(row=>row.state==='active').map(row=>row.recheckAfter).sort()[0]||null,entries};
}

import {partScope,partEpisode,scopedRecord,scopedProgress} from './episode-scope.cjs';
import registry from '@/data/watch-sources.json';
import listingData from '@/data/watch-listings.json';
import type {WatchListing} from './types';
import {recentEpisodeAdvance} from './episode-updates';
const SIX_HOURS = 6 * 60 * 60 * 1000;
type Source = {id:string;bgm:number;provider:string;url:string;expectedTitle:string;refreshMode:'http'|'browser-required';priority?:number};
type ListingRecord = {id?:string;bgm?:number;sourceUrl?:string;sourceTitle?:string;verificationScope?:string;latestEpisode?:string;latestUrl?:string;episodes?:Array<{label:string;url:string;publishedAt?:string}>;lastSuccessAt?:string;attemptedAt?:string;status?:'available'|'failed';errorCode?:string|null;observationMethod?:'native-browser'|'public-html'};
const sources = registry.sources as Source[];
const records = listingData.items as Record<string,ListingRecord>;
const titleProgress = (listingData as {titleProgress?:Record<string,{highestEpisode?:number;advance?:WatchListing['episodeAdvance']}>}).titleProgress || {};
const parsed = (value?:string) => value ? Date.parse(value) : NaN;
function eligibility(source:Source, now:number) {
  if (source.refreshMode !== 'http') return null;
  const row = records[source.id];
  const last = Math.max(parsed(row?.lastSuccessAt) || 0,parsed(row?.attemptedAt) || 0);
  return last ? last + SIX_HOURS : 0;
}
function automaticQueue(now:number) {
  return sources.filter(source => source.refreshMode === 'http' && eligibility(source, now)! <= now).sort((a,b) =>
    (parsed(records[a.id]?.attemptedAt) || 0) - (parsed(records[b.id]?.attemptedAt) || 0) ||
    (a.priority || 0) - (b.priority || 0) || a.id.localeCompare(b.id));
}
function project(source:Source, now:number, queue:Source[]):WatchListing {
  const row = scopedRecord(source,records[source.id]) as ListingRecord | undefined, at = row?.lastSuccessAt || null, eligible = eligibility(source, now);
  const scope = partScope(source);
  const age = at ? Math.max(0, now - Date.parse(at)) : null;
  const position = queue.findIndex(target => target.id === source.id);
  const result:WatchListing = {
    id:source.id,provider:source.provider,sourceUrl:source.url,sourceTitle:source.expectedTitle,
    latestEpisode:row?.latestEpisode || null,latestUrl:row?.latestUrl || null,
    episodes:(row?.episodes || []).map(episode => ({label:episode.label,url:episode.url,...(scope ? {partEpisode:partEpisode(source,episode.label)!} : {}),...(episode.publishedAt ? {publishedAt:episode.publishedAt} : {})})),
    ...(scope ? {latestPartEpisode:row?.latestEpisode ? partEpisode(source,row.latestEpisode) : null,partEpisodeCount:scope.last-scope.first+1,partScopeNote:scope.note} : {}),
    listingCheckedAt:at,lastAttemptAt:row?.attemptedAt || null,
    listingAgeHours:age === null ? null : Math.round(age / 360_000) / 10,
    stale:age === null || age > SIX_HOURS,status:row?.status || 'awaiting_check',error:row?.errorCode || null,
    refreshMode:source.refreshMode,automaticRefresh:source.refreshMode === 'http',
    automaticRefreshLimit:source.refreshMode === 'http' ? 'bounded-source-batch' : 'browser-required',
    automaticCheckDue:eligible !== null && eligible <= now,
    nextAutomaticCheckEligibleAt:eligible ? new Date(eligible).toISOString() : null,
    automaticQueuePosition:position < 0 ? null : position + 1,
    verificationScope:'provider-episode-listing',observationMethod:row?.observationMethod || null,
  };
  const progress = scopedProgress(source,titleProgress[String(source.bgm)]), event = progress?.advance;
  // Only a receipt from this exact, registered title/provider may leave the
  // public snapshot. Existing listings without advancement history stay neutral.
  if (event && row?.id === source.id && row.bgm === source.bgm && row.sourceUrl === source.url && row.sourceTitle === source.expectedTitle && row.verificationScope === 'provider-episode-listing' && event.bgm === source.bgm && event.sourceId === source.id && progress?.highestEpisode === event.episode) {
    const candidate = {...result,episodeAdvance:event};
    if (recentEpisodeAdvance([candidate],now)) result.episodeAdvance = {bgm:event.bgm,sourceId:event.sourceId,episode:event.episode,previousEpisode:event.previousEpisode,observedAt:event.observedAt,verificationScope:event.verificationScope};
  }
  return result;
}
export function watchListingsFor(bgm:string|number, now=Date.now()):WatchListing[] {
  const queue = automaticQueue(now);
  return sources.filter(source => String(source.bgm) === String(bgm)).map(source => project(source, now, queue));
}
/** Read-only grouped resource index. Inputs only filter the bundled fixed-source registry. */
export function watchListingsIndex({bgm,query='',offset=0,limit=24,now=Date.now()}:{bgm?:string;query?:string;offset?:number;limit?:number;now?:number}={}) {
  const queue = automaticQueue(now), term = query.slice(0,80).normalize('NFKC').toLocaleLowerCase();
  const grouped = new Map<number,{bgm:number;title:string;sources:WatchListing[]}>();
  for (const source of sources) {
    if (bgm && String(source.bgm) !== bgm) continue;
    const item = grouped.get(source.bgm) || {bgm:source.bgm,title:source.expectedTitle,sources:[]};
    item.sources.push(project(source,now,queue));grouped.set(source.bgm,item);
  }
  const items = [...grouped.values()].filter(item => !term || item.sources.some(source => source.sourceTitle.normalize('NFKC').toLocaleLowerCase().includes(term))).sort((a,b) => {
    const checked = (item:typeof a) => Math.max(0,...item.sources.map(source => parsed(source.listingCheckedAt || undefined) || 0));
    return checked(b) - checked(a) || a.bgm - b.bgm;
  });
  const start = Number.isSafeInteger(offset) ? Math.max(0,Math.min(offset,items.length)) : 0;
  const size = Number.isSafeInteger(limit) ? Math.max(1,Math.min(limit,40)) : 24;
  return {total:items.length,offset:start,limit:size,items:items.slice(start,start+size),verificationScope:'provider-episode-listing',playbackVerifiedByListing:false};
}
export function watchListingsStatus(now=Date.now()) {
  const queue = automaticQueue(now), items = sources.map(source => ({...project(source,now,queue),bgm:source.bgm}));
  const automatic = sources.filter(source => source.refreshMode === 'http').length;
  return {
    scope:'Fixed known current/previous seasonal provider catalogue routes',sourceCount:sources.length,
    automaticSourceCount:automatic,browserRequiredSourceCount:sources.length-automatic,
    automaticBatchLimit:40,automaticRequestLimit:80,sharedMaintenanceRequestLimit:180,
    automaticConcurrency:2,automaticTimeLimitSeconds:120,
    freshnessTargetHours:6,minimumAttemptIntervalHours:6,automaticDueCount:queue.length,
    minimumFullSweepRuns:Math.ceil(automatic/40),fullSweepCadenceCapacityHours:Math.ceil(automatic/40)*6,
    coverageNote:'Six hours is an eligibility/freshness target, not a promise for every source. A full automatic sweep needs at least three scheduled runs; request limits, timeouts or failures can extend it. Browser-required sources are outside automatic coverage.',
    available:items.filter(source => source.listingCheckedAt).length,fresh:items.filter(source => !source.stale).length,
    automaticFresh:items.filter(source => source.refreshMode==='http'&&!source.stale).length,
    browserFresh:items.filter(source => source.refreshMode==='browser-required'&&!source.stale).length,
    browserAwaitingCheck:items.filter(source => source.refreshMode==='browser-required'&&source.status==='awaiting_check').length,
    // A completed task is not proof that every route was checked or succeeded.
    lastAutomaticSweep:(listingData as {lastAutomaticSweep?:{startedAt:string;finishedAt:string;checked:number;requests:number;succeeded:number;failed:number;queued:number;stopReason:string|null;concurrency:number}}).lastAutomaticSweep || null,
    failed:items.filter(source => source.status === 'failed').length,awaitingCheck:items.filter(source => source.status === 'awaiting_check').length,
    sources:items.map(({episodes,...source}) => source),
    playbackPolicy:'Listing checks do not verify playback, rights, region or completeness. Historical playback checks retain their original dates.',
  };
}

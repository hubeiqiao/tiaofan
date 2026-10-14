import type {WatchListing} from './types';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const positiveEpisode = (value:unknown):value is number => Number.isSafeInteger(value) && (value as number)>0 && (value as number)<=9999;
const integerLabel = (value:unknown):number|null => typeof value==='string' && /^\d{1,4}$/.test(value) && Number(value)>0 ? Number(value) : null;
export type RecentEpisodeAdvance = {episode:number;previousEpisode:number;observedAt:string};

/** A recent public directory advancement, never an unread or watched marker. */
export function recentEpisodeAdvance(listings:readonly WatchListing[]|null|undefined,now=Date.now()):RecentEpisodeAdvance|null {
 if(!Array.isArray(listings)||!Number.isFinite(now))return null;
 const found:NonNullable<WatchListing['episodeAdvance']>[]=[];
 for(const listing of listings){
  const event=listing?.episodeAdvance;
  if(!event||event.verificationScope!=='integer-episode-advance'||!Number.isSafeInteger(event.bgm)||event.bgm<=0||event.sourceId!==listing.id||!positiveEpisode(event.episode)||!positiveEpisode(event.previousEpisode)||event.episode<=event.previousEpisode)continue;
  const observed=typeof event.observedAt==='string'?Date.parse(event.observedAt):NaN;
  const checked=listing.listingCheckedAt?Date.parse(listing.listingCheckedAt):NaN;
  const latest=integerLabel(listing.latestEpisode);
  if(!Number.isFinite(observed)||observed>now||now-observed>=SEVEN_DAYS||!Number.isFinite(checked)||checked<observed||checked>now||latest===null||latest<event.episode||listing.verificationScope!=='provider-episode-listing'||!['native-browser','public-html'].includes(listing.observationMethod||''))continue;
  if(!Array.isArray(listing.episodes)||!listing.episodes.length||listing.episodes.some((item:WatchListing['episodes'][number])=>integerLabel(item.label)===null)||Math.max(...listing.episodes.map((item:WatchListing['episodes'][number])=>integerLabel(item.label)!))!==latest)continue;
  found.push(event);
 }
 if(!found.length||new Set(found.map(event=>event.bgm)).size!==1)return null;
 found.sort((a,b)=>b.episode-a.episode||Date.parse(a.observedAt)-Date.parse(b.observedAt));
 const {episode,previousEpisode,observedAt}=found[0];
 return {episode,previousEpisode,observedAt};
}

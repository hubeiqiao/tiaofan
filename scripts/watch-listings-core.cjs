// Pure, fixed-source listing validation. Listing observations never create playback proof.
// This pure .cjs entry point must remain callable by Node's CommonJS ingestion.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {partScope,partEpisode,scopedRecord,scopedProgress} = require('../lib/episode-scope.cjs');
const SIX_HOURS = 6 * 60 * 60 * 1000;
const MAX_SOURCES = 40, MAX_REQUESTS = 80, MAX_BYTES = 1_200_000;
const errorCodes = new Set(['network_unavailable', 'timeout', 'http_error', 'identity_mismatch', 'invalid_listing', 'dynamic_page', 'login_required', 'source_blocked', 'batch_stopped', 'request_budget', 'redirect_refused', 'not_due']);
const stamp = x => typeof x === 'string' ? Date.parse(x) : NaN;
const normalizeTitle = x => String(x || '').normalize('NFKC').replace(/\s*\[\d+(?:\.\d+)?\]\s*$/, '').replace(/\s+/g, '').trim();
function planDue(registry, state, now, limit = MAX_SOURCES) {
  if (!Number.isFinite(now) || !Number.isSafeInteger(limit) || limit < 0 || limit > 120) throw Error('Invalid refresh bounds');
  return registry.filter(target => {
    const row = state[target.id];
    const last = Math.max(stamp(row?.lastSuccessAt) || 0, stamp(row?.attemptedAt) || 0);
    return !last || now - last >= SIX_HOURS;
  }).sort((a, b) =>
    (stamp(state[a.id]?.attemptedAt) || 0) - (stamp(state[b.id]?.attemptedAt) || 0) ||
    (a.priority || 0) - (b.priority || 0) || a.id.localeCompare(b.id)
  ).slice(0, limit);
}
function safeEpisode(target, episode) {
  if (!episode || typeof episode.label !== 'string' || !/^\d{1,4}(?:\.\d)?$/.test(episode.label) || Number(episode.label) <= 0 || Number(episode.label) > 9999 || typeof episode.url !== 'string') return null;
  let url;
  try { url = new URL(episode.url); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
  const source = new URL(target.url);
  if (url.origin !== source.origin) return null;
  if (target.routeKind === 'anime1') {
    if (!/^\/\d+$/.test(url.pathname) || url.search) return null;
  } else if (target.routeKind === 'iyf') {
    if (url.pathname !== source.pathname || [...url.searchParams.keys()].join(',') !== 'id' || !/^[A-Za-z0-9]{1,64}$/.test(url.searchParams.get('id') || '')) return null;
  } else return null;
  const row = {label: episode.label, url: url.href};
  if (episode.publishedAt) {
    if (!Number.isFinite(stamp(episode.publishedAt))) return null;
    row.publishedAt = episode.publishedAt;
  }
  return row;
}
function applyObservation(registry, previous, observation, now) {
  const target = registry.find(row => row.id === observation?.id), at = stamp(observation?.observedAt);
  if (!Number.isFinite(now) || !target || observation.sourceUrl !== target.url || !Number.isFinite(at) || at > now + 60_000 || at < now - SIX_HOURS) throw Error('Invalid fixed-source receipt');
  if (previous && stamp(previous.attemptedAt) > at) throw Error('Older receipt cannot replace newer state');
  previous = scopedRecord(target, previous);
  // Only listing fields may survive. Arbitrary input fields, player tokens and proof flags do not.
  const retained = previous ? Object.fromEntries(['sourceTitle', 'episodes', 'latestEpisode', 'latestUrl', 'lastSuccessAt', 'verificationScope', 'observationMethod'].filter(key => Object.hasOwn(previous, key)).map(key => [key, previous[key]])) : {};
  const base = {...retained, id: target.id, bgm: target.bgm, provider: target.provider, sourceUrl: target.url, refreshMode: target.refreshMode || (target.routeKind === 'anime1' ? 'http' : 'browser-required'), attemptedAt: observation.observedAt};
  const failed = code => ({...base, status: 'failed', errorCode: errorCodes.has(code) ? code : 'invalid_listing'});
  if (observation.result !== 'listed') return failed(observation.errorCode);
  if (normalizeTitle(observation.sourceTitle) !== normalizeTitle(target.expectedTitle)) return failed('identity_mismatch');
  if (!Array.isArray(observation.episodes) || !observation.episodes.length || observation.episodes.length > 100) return failed('invalid_listing');
  let episodes = observation.episodes.map(episode => safeEpisode(target, episode));
  if (episodes.some(episode => !episode) || new Set(episodes.map(episode => Number(episode.label))).size !== episodes.length || new Set(episodes.map(episode => episode.url)).size !== episodes.length) return failed('invalid_listing');
  if (partScope(target)) episodes = episodes.filter(episode => partEpisode(target,episode.label) !== null);
  if (!episodes.length) return failed('invalid_listing');
  episodes.sort((a, b) => Number(b.label) - Number(a.label));
  if (previous?.latestEpisode && Number(episodes[0].label) < Number(previous.latestEpisode)) return failed('invalid_listing');
  return {...base, status: 'available', errorCode: null, sourceTitle: target.expectedTitle, episodes, latestEpisode: episodes[0].label, latestUrl: episodes[0].url, lastSuccessAt: observation.observedAt, verificationScope: 'provider-episode-listing', observationMethod: observation.observationMethod === 'native-browser' ? 'native-browser' : 'public-html'};
}
const integerEpisode = value => typeof value === 'string' && /^\d{1,4}$/.test(value) && Number(value) > 0 ? Number(value) : null;
const episodeNumber = value => Number.isSafeInteger(value) && value > 0 && value <= 9999;
// Last-good observations remain baselines; totals, playback and special labels do not.
function trustedIntegerListing(target, row, now) {
  row = scopedRecord(target,row);
  if (!row || row.id !== target.id || row.bgm !== target.bgm || row.sourceUrl !== target.url || normalizeTitle(row.sourceTitle) !== normalizeTitle(target.expectedTitle) || row.verificationScope !== 'provider-episode-listing' || !['native-browser','public-html'].includes(row.observationMethod) || !['available','failed'].includes(row.status)) return null;
  const at = stamp(row.lastSuccessAt), episode = integerEpisode(row.latestEpisode);
  if (!episode || !Number.isFinite(at) || at > now || !Array.isArray(row.episodes) || !row.episodes.length || row.episodes.length > 100) return null;
  if (row.episodes.some(item => !safeEpisode(target,item) || integerEpisode(item.label) === null)) return null;
  const maximum = Math.max(...row.episodes.map(item => integerEpisode(item.label)));
  if (maximum !== episode || !row.episodes.some(item => integerEpisode(item.label) === episode && item.url === row.latestUrl)) return null;
  return {episode:partEpisode(target,row.latestEpisode),at};
}
/** Public title high-water only. This does not inspect or update private watchlists. */
function updateEpisodeAdvances(registry, previous, items, now) {
  if (!Number.isFinite(now)) throw Error('Invalid advancement clock');
  const grouped = new Map();
  for (const target of registry) {
    if (!Number.isSafeInteger(target.bgm) || target.bgm <= 0) continue;
    const sources = grouped.get(target.bgm) || [];sources.push(target);grouped.set(target.bgm,sources);
  }
  const result = {};
  // Registry edits must not reset a title's historical ceiling. Keep only a
  // validated public ID/number pair for absent titles, never their old receipt.
  for (const [key,legacy] of Object.entries(previous?.titleProgress || {})) {
    const target = registry.find(row => String(row.bgm) === key && partScope(row));
    const stored = target ? scopedProgress(target,legacy) : legacy;
    if (/^[1-9]\d{0,8}$/.test(key) && episodeNumber(stored?.highestEpisode)) result[key] = {highestEpisode:stored.highestEpisode,...(target || stored.numbering==='part-local-v1'?{numbering:'part-local-v1'}:{})};
  }
  for (const [bgm,sources] of grouped) {
    const scoped = sources.find(partScope);
    const stored = scopedProgress(scoped || sources[0],previous?.titleProgress?.[bgm]);
    const before = new Map(sources.map(target => [target.id,trustedIntegerListing(target,previous?.items?.[target.id],now)]));
    const after = new Map(sources.map(target => [target.id,trustedIntegerListing(target,items?.[target.id],now)]));
    const baseline = Math.max(episodeNumber(stored?.highestEpisode) ? stored.highestEpisode : 0,...[...before.values()].map(row => row?.episode || 0));
    const highestEpisode = Math.max(baseline,...[...after.values()].map(row => row?.episode || 0));
    if (!highestEpisode) continue;
    const progress = {highestEpisode,...(scoped ? {numbering:'part-local-v1'} : {})};result[bgm] = progress;
    if (baseline && highestEpisode > baseline) {
      // First observation of any provider is discovery, not episode advancement.
      // Compare the entire batch to its unchanged, title-wide prior baseline.
      const candidates = sources.filter(target => {
        const old = before.get(target.id), next = after.get(target.id);
        return old && next && items[target.id].status === 'available' && next.episode === highestEpisode && next.episode > old.episode && next.at > old.at && next.at >= now-SIX_HOURS;
      }).sort((a,b) => after.get(a.id).at-after.get(b.id).at || a.id.localeCompare(b.id));
      if (candidates.length) {
        const target = candidates[0];
        progress.advance = {bgm,sourceId:target.id,episode:highestEpisode,previousEpisode:baseline,observedAt:items[target.id].lastSuccessAt,verificationScope:'integer-episode-advance'};
      }
    } else if (highestEpisode === baseline) {
      const event = stored?.advance, proof = event && after.get(event.sourceId), at = stamp(event?.observedAt);
      if (event?.bgm === bgm && event.verificationScope === 'integer-episode-advance' && episodeNumber(event.episode) && episodeNumber(event.previousEpisode) && event.episode === highestEpisode && event.previousEpisode < event.episode && Number.isFinite(at) && at <= now && proof && proof.episode >= event.episode && proof.at >= at) {
        progress.advance = {bgm,sourceId:event.sourceId,episode:event.episode,previousEpisode:event.previousEpisode,observedAt:event.observedAt,verificationScope:'integer-episode-advance'};
      }
    }
  }
  return result;
}
function decodeText(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, number) => {
    const code = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
    return code <= 0x10ffff ? String.fromCodePoint(code) : '\uFFFD';
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ({amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '})[name]).trim();
}
function parseAnime1(html, target, observedAt) {
  const fail = errorCode => ({id: target.id, result: 'failed', sourceUrl: target.url, observedAt, errorCode});
  if (typeof html !== 'string' || Buffer.byteLength(html) > MAX_BYTES) return fail('invalid_listing');
  if (/<title[^>]*>\s*(?:Just a moment|Access denied|Verify)/i.test(html)) return fail('source_blocked');
  if (/<title[^>]*>\s*(?:Log\s*In|Sign\s*In|登录|登入)(?:\s|<|[‹·—-])/i.test(html) && /<form\b[\s\S]*(?:type\s*=\s*["']password["']|Password|密码|密碼)/i.test(html)) return fail('login_required');
  const title = html.match(/<h1\b[^>]*class=["'][^"']*\bpage-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  // Explicit provider heading aliases only; episode titles retain exact matching.
  const headingTitles = [target.expectedTitle, ...(Array.isArray(target.headingAliases) ? target.headingAliases : [])];
  if (!title || !headingTitles.some(value => typeof value === 'string' && normalizeTitle(decodeText(title[1])) === normalizeTitle(value))) return fail('identity_mismatch');
  const cat = new URL(target.url).searchParams.get('cat');
  const articles = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)];
  if (!articles.length || articles.length > 100) return fail('invalid_listing');
  const episodes = [];
  for (const [, attrs, body] of articles) {
    const classes = attrs.match(/\bclass=["']([^"']+)["']/i)?.[1].split(/\s+/) || [];
    if (!classes.includes('category-' + cat)) return fail('identity_mismatch');
    const heading = body.match(/<h2\b[^>]*class=["'][^"']*\bentry-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i);
    if (!heading) return fail('invalid_listing');
    const text = decodeText(heading[2]), match = text.match(/^(.*?)\s*\[(\d{1,4}(?:\.\d)?)\]$/);
    if (!match || normalizeTitle(match[1]) !== normalizeTitle(target.expectedTitle)) return fail('identity_mismatch');
    const time = body.match(/<time\b[^>]*datetime=["']([^"']+)["']/i);
    const episode = {label: match[2], url: decodeText(heading[1]), ...(time ? {publishedAt: time[1]} : {})};
    const postId = attrs.match(/\bid=["']post-(\d+)["']/i)?.[1];
    if (!safeEpisode(target, episode) || !postId || new URL(episode.url).pathname !== '/' + postId) return fail('invalid_listing');
    episodes.push(episode);
  }
  return {id: target.id, result: 'listed', sourceUrl: target.url, sourceTitle: target.expectedTitle, observedAt, observationMethod: 'public-html', episodes};
}
module.exports = {SIX_HOURS, MAX_SOURCES, MAX_REQUESTS, MAX_BYTES, planDue, applyObservation, updateEpisodeAdvances, parseAnime1, safeEpisode, normalizeTitle};

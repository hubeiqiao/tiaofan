// Exact-part numbering is shared by ingestion, last-good projection and progress.
// Labels/URLs retain provider numbering. Only localEpisode is part-relative.
// CommonJS is shared by Node ingestion and the in-memory source loader.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const scopes = require('../data/watch-part-scopes.json');
function partScope(target) {
 const row = scopes[target.id];
 return row && row.bgm === target.bgm ? row : null;
}
function partEpisode(target, label) {
 if (typeof label !== 'string' || !/^\d{1,4}$/.test(label)) return null;
 const n = Number(label), scope = partScope(target);
 if (!Number.isSafeInteger(n) || n < 1) return null;
 return scope ? n >= scope.first && n <= scope.last ? n - scope.first + 1 : null : n;
}
function scopedRecord(target, row) {
 if (!row || !partScope(target)) return row;
 const filtered = (row.episodes || []).filter(episode => partEpisode(target, episode.label) !== null);
 const episodes = filtered.length === row.episodes?.length ? row.episodes : filtered;
 const latest = [...episodes].sort((a,b) => Number(b.label) - Number(a.label))[0];
 if (episodes.length === row.episodes?.length && latest?.label === row.latestEpisode && latest?.url === row.latestUrl) return row;
 return {...row,episodes,latestEpisode:latest?.label,latestUrl:latest?.url};
}
function scopedProgress(target, progress) {
 if (!progress || !partScope(target) || progress.numbering === 'part-local-v1') return progress;
 const convert = value => partEpisode(target,String(value));
 const highestEpisode = convert(progress.highestEpisode);
 if (!highestEpisode) return undefined;
 const result = {highestEpisode,numbering:'part-local-v1'};
 const event = progress.advance;
 if (event && convert(event.episode) && convert(event.previousEpisode)) result.advance = {...event,episode:convert(event.episode),previousEpisode:convert(event.previousEpisode)};
 return result;
}
module.exports = {partScope,partEpisode,scopedRecord,scopedProgress};

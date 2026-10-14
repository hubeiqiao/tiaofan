import {displayTitle} from './title-fallback';
import {kitsuEpisodeCount} from './kitsu-fields';
type Obj = Record<string, any>;
const numberIds = (s: string | null) => (s || '').split(',').filter(x => /^\d+$/.test(x)).slice(0, 20);
export async function fetchKitsu(req: Request) {
  const u = new URL(req.url), ids = numberIds(u.searchParams.get('ids')),
    directIds = numberIds(u.searchParams.get('kitsu_ids')), top = u.searchParams.get('top') === '1',
    offset = Math.max(0, Math.min(980, Number(u.searchParams.get('offset')) || 0));
  if (!ids.length && !directIds.length && !top) return Response.json({ items: [] });
  const fields = 'canonicalTitle,slug,averageRating,ratingFrequencies,ratingRank,startDate,episodeCount,posterImage,subtype,synopsis,titles,mappings,ageRating,nsfw';
  const url = top
    ? `https://kitsu.app/api/edge/anime?sort=-averageRating&page[limit]=20&page[offset]=${offset}&include=mappings&fields[anime]=${fields}`
    : directIds.length
      ? `https://kitsu.app/api/edge/anime?filter[id]=${directIds.join(',')}&include=mappings&page[limit]=20&fields[anime]=${fields}`
      : `https://kitsu.app/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${ids.join(',')}&include=item&page[limit]=20&fields[anime]=${fields}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(16000) });
    if (!r.ok) throw Error();
    const x = await r.json() as Obj, isAnime = top || directIds.length > 0;
    const anime = isAnime ? x.data : (x.included || []).filter((a: Obj) => a.type === 'anime');
    const mappings = isAnime ? (x.included || []).filter((m: Obj) => m.type === 'mappings') : x.data;
    if (!Array.isArray(anime) || !Array.isArray(mappings)) throw Error();
    const at = new Date().toISOString();
    const items = anime.filter((a: Obj) => a.attributes.nsfw !== true && a.attributes.ageRating !== 'R18' && !/^(?:delete|deleted|tombstone)(?:[-_]|$)/i.test(a.attributes.slug||'')).map((a: Obj) => {
      const attrs = a.attributes;
      const links = new Set((a.relationships?.mappings?.data || []).map((m: Obj) => m.id));
      const m = isAnime
        ? mappings.find((m: Obj) => links.has(m.id) && m.attributes.externalSite === 'myanimelist/anime')
        : mappings.find((m: Obj) => m.relationships?.item?.data?.id === a.id);
      return { kitsu: a.id, mal: Number(m?.attributes.externalId) || null, name:displayTitle(attrs.titles?.zh_cn,attrs.titles?.ja_jp||attrs.canonicalTitle,[],a.id),originalName:attrs.titles?.ja_jp||attrs.canonicalTitle||'',
        image: attrs.posterImage?.small || attrs.posterImage?.medium || '', date: attrs.startDate, format: attrs.subtype, episodes: kitsuEpisodeCount(attrs.episodeCount),
        score: Number(attrs.averageRating) > 0 ? Number(attrs.averageRating) : null,
        count: attrs.ratingFrequencies ? Object.values(attrs.ratingFrequencies).reduce((n: number, v: unknown) => n + Number(v), 0) : null,
        rank: attrs.ratingRank, url: `https://kitsu.app/anime/${encodeURIComponent(attrs.slug || a.id)}`, at };
    });
    return Response.json({ items, received: anime.length, total: x.meta?.count, hasNext: !!x.links?.next, at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Kitsu 评分暂时未能获取；没有使用其他平台的分数替代。' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

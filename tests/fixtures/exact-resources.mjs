// Fictional, test-only source records. Reserved domains are never fetched.
export const now = Date.parse('2026-10-16T17:00:00Z');
const observedAt = '2026-10-16T12:00:00Z';
const recheckAfter = '2026-10-30T00:00:00Z';
const expiresAt = '2026-11-15T00:00:00Z';
const note = '示例平台作品资料；播放、地区和权益未核验。';
const link = (bgm, suffix, classification = 'official-title-offer') => ({
  bgm, name: 'Fictional provider', url: `https://provider.example.invalid/title/${suffix}`,
  state: 'active', classification, identityScope: 'exact-film', observedAt,
  recheckAfter, expiresAt, regions: null, note,
  sourceUrl: `https://provider.example.invalid/title/${suffix}`,
  evidenceUrls: [`https://evidence.example.invalid/film/${bgm}`],
});
export const platformCatalog = {
  items: Object.fromEntries([900000101, 900000102, 900000103, 900000104].map(bgm => [bgm, {
    name: `Synthetic film ${bgm}`, originalName: `Fictional title ${bgm}`, format: 'movie',
    identityEvidence: [`https://evidence.example.invalid/film/${bgm}`],
  }])),
  links: [link(900000101, 'a'), link(900000101, 'a-second'), link(900000102, 'b'),
    link(900000103, 'c'), link(900000104, 'd', 'official-catalog-only')],
};
export const listingRegistry = [{
  id: 'example:part-a', bgm: 900000201, provider: 'Fictional A',
  url: 'https://episodes.example.invalid/category/part-a', expectedTitle: 'Synthetic season A',
  routeKind: 'anime1', refreshMode: 'http',
}, {
  id: 'example:part-b', bgm: 900000202, provider: 'Fictional B',
  url: 'https://video.example.invalid/series/part-b', expectedTitle: 'Synthetic season B',
  routeKind: 'iyf', refreshMode: 'browser-required',
}];
export const partScopes = {
  'example:part-a': {bgm: 900000201, first: 12, last: 19, note: '示例分篇目录；源站12–19集对应本篇1–8集。'},
  'example:part-b': {bgm: 900000202, first: 2, last: 12, note: 'Synthetic second part: provider 02–12, local 1–11.'},
};

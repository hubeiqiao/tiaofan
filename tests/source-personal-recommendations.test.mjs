import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';

// Every identity, relation, timestamp and source fact below is an original test
// fixture. Never load the production catalog, registry or metadata snapshots.
const now = Date.parse('2026-10-14T12:00:00Z');
const observedAt = '2026-10-01T00:00:00.000Z';
const anime = (id, extra = {}) => ({
  key: `bgm:${id}`, bgm: id, name: `Synthetic source title ${id}`,
  date: '2001-01-01', format: 'TV', image: '', summary: 'Original fictional test synopsis.',
  tags: ['热血', '冒险'], language: 'ja', episodes: 12,
  rating: {bgm: {score: 8, count: 20, at: observedAt}}, ...extra,
});
const seed = anime(910001);
const entry = anime(920001, {mal: 820001, kitsuId: '720001'});
const continuation = anime(920002, {mal: 820002, kitsuId: '720002'});
const later = anime(920003, {mal: 820003, kitsuId: '720003'});
const unrelated = anime(930001, {mal: 830001, kitsuId: '730001'});
const discoveryOnly = anime(940001, {mal: 840001, kitsuId: '740001', tags: ['音乐', '日常']});
const all = [seed, entry, continuation, later, unrelated, discoveryOnly];
const snapshot = (items, updatedAt) => ({items, updatedAt});
const snapshots = {
  historical: snapshot([entry, discoveryOnly], now - 120_000),
  history: snapshot([seed, entry, continuation, later, unrelated, discoveryOnly], now - 240_000),
  previous: snapshot([continuation], now - 180_000),
  current: snapshot([later], now - 60_000),
};
const metadata = Object.fromEntries(all.map(row => [String(row.bgm), {
  language: 'ja', mal: row.mal, end: '2001-03-31', metadataDate: observedAt,
}]));
// Metadata alone does not invent a snapshot alias for a graph-only member.
metadata['920004'] = {language: 'ja', mal: 820004, metadataDate: observedAt};
const catalog = {
  languages: Object.fromEntries(all.map(row => [String(row.bgm), 'ja'])),
  sources: {fixture: {url: 'https://example.invalid/synthetic-relations'}},
  edges: [
    [920001, 920002, 'sequel', 'fixture', observedAt],
    [920002, 920003, 'sequel', 'fixture', observedAt],
    [920003, 920004, 'sequel', 'fixture', observedAt],
    [920001, 930001, 'side_story', 'fixture', observedAt],
  ],
  entryEvidence: [],
};
const overrides = {'@/data/recommendation-catalog-runtime': {default: catalog, __esModule: true}};
const {prepareSourcePersonal} = loadSourceModule('lib/source-personal-recommendations.ts', overrides);
const {recommendationSeriesMembers} = loadSourceModule('lib/recommendation-series.ts', overrides);
const {remainingRecommendations} = loadSourceModule('lib/recommendation-retention.ts');

test('returned candidates carry only source-known family aliases for immediate post-save exclusion', () => {
  const saved = [{anime_key: seed.key, state: 'watching', favorite: 1, updated_at: now - 30_000}];
  const before = JSON.stringify({snapshots, metadata, catalog, saved});
  const args = {period: 'historical', media: 'series', q: '', lang: 'zh'};
  const plan = prepareSourcePersonal(args, saved, snapshots, metadata, now);
  assert.deepEqual(plan.candidates.map(row => row.key), [entry.key], 'A real nonempty synthetic match exercises the projection');
  assert.deepEqual(plan.discoveryCandidates.map(row => row.key), [entry.key, discoveryOnly.key], 'Public discoveries receive the same projection');
  assert.deepEqual(recommendationSeriesMembers(entry.bgm), [920001, 920002, 920003, 920004]);

  const familyAliases = [
    'bgm:920001', 'bgm:920002', 'bgm:920003', 'bgm:920004',
    'mal:820001', 'kitsu:720001', 'mal:820002', 'kitsu:720002', 'mal:820003', 'kitsu:720003',
  ];
  for (const row of [...plan.candidates, ...plan.discoveryCandidates]) {
    const expected = row.bgm === entry.bgm ? familyAliases : ['bgm:940001', 'mal:840001', 'kitsu:740001'];
    assert.deepEqual([...row.recommendationFamilyKeys].sort(), [...expected].sort(), 'Only known graph members and their snapshot aliases are projected');
    assert.equal(new Set(row.recommendationFamilyKeys).size, row.recommendationFamilyKeys.length, 'Repeated snapshot rows cannot duplicate aliases');
    for (const key of expected) {
      assert.equal(remainingRecommendations([row], [{key}]).length, 0, `Saving ${key} removes this candidate immediately`);
    }
    for (const key of [unrelated.key, 'mal:830001', 'kitsu:730001', 'mal:820004', 'bgm:999999']) {
      assert.deepEqual(remainingRecommendations([row], [{key}]), [row], 'Unrelated, metadata-only or unknown aliases do not remove a candidate');
    }
    const {recommendationFamilyKeys, ...facts} = row;
    const original = all.find(source => source.key === row.key);
    assert.notEqual(row, original, 'Projection creates a new card rather than changing a source object');
    assert.deepEqual(facts, original, 'Release dates, ratings and all other source facts are preserved exactly');
  }
  assert.equal(plan.sourceAt, new Date(snapshots.historical.updatedAt).toISOString());
  assert.equal(plan.profileSourceAt, new Date(snapshots.history.updatedAt).toISOString());
  assert.equal(plan.profileUpdatedAt, new Date(saved[0].updated_at).toISOString());
  assert.equal(JSON.stringify({snapshots, metadata, catalog, saved}), before, 'Family projection never alters source records, source timestamps, the relation graph or saved state');
});

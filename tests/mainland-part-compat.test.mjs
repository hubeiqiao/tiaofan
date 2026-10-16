// Synthetic compatibility coverage for the shared source helpers and localized UI.
// No gateway policy, provider inventory or network access is required.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadSourceModule} from './component-test-loader.mjs';
import {listingRegistry, partScopes} from './fixtures/exact-resources.mjs';

const [partA, source] = listingRegistry;
const overrides = {'../data/watch-part-scopes.json': partScopes};
const {partScope, partEpisode, scopedRecord, scopedProgress} = loadSourceModule('lib/episode-scope.cjs', overrides);
const {recentEpisodeAdvance} = loadSourceModule('lib/episode-updates.ts');
const {WatchListingSection} = loadSourceModule('components/watch-resources.tsx');
const {translateKnownText} = loadSourceModule('lib/localization.ts');
const at = '2026-10-16T12:00:00Z', now = Date.parse(at) + 60_000;
const episode = label => ({label, url: `${source.url}?id=episode${label}`, publishedAt: at});
const event = {bgm: source.bgm, sourceId: source.id, episode: 5, previousEpisode: 4, observedAt: at, verificationScope: 'integer-episode-advance'};
const raw = {
  id: source.id, bgm: source.bgm, sourceUrl: source.url, sourceTitle: source.expectedTitle,
  verificationScope: 'provider-episode-listing', latestEpisode: '05', latestUrl: episode('05').url,
  episodes: ['01', '02', '03', '04', '05'].map(episode), lastSuccessAt: at, attemptedAt: at,
  status: 'available', observationMethod: 'native-browser',
};
const freeze = value => {
  if (value && typeof value === 'object') {Object.freeze(value); Object.values(value).forEach(freeze);}
  return value;
};
function fixture(target = source, row = raw, progress = {highestEpisode: 5, advance: {...event, bgm: target.bgm, sourceId: target.id}}) {
  return loadSourceModule('lib/watch-listings.ts', {
    ...overrides,
    '@/data/watch-sources.json': {sources: [target]},
    '@/data/watch-listings.json': {
      items: {[target.id]: row},
      titleProgress: {[target.bgm]: progress},
    },
  }).watchListingsFor(target.bgm, now)[0];
}

test('exact synthetic mappings enforce both boundaries and reject non-integer labels', () => {
  assert.equal(partScope({...source, bgm: 900000999}), null);
  assert.equal(partScope({...source, id: 'example:unmapped'}), null);
  for (const [target, before, first, last, after, count] of [[source, '01', '02', '12', '13', 11], [partA, '11', '12', '19', '20', 8]]) {
    assert.equal(partEpisode(target, before), null);
    assert.equal(partEpisode(target, first), 1);
    assert.equal(partEpisode(target, last), count);
    assert.equal(partEpisode(target, after), null);
    for (const label of ['Special 05', '5.5', '', '0']) assert.equal(partEpisode(target, label), null);
  }
});

test('frozen last-good projection retains ordering, URLs and observation dates without mutation', () => {
  const row = freeze(structuredClone(raw)), before = JSON.stringify(row);
  const scoped = scopedRecord(source, row);
  assert.deepEqual(scoped.episodes.map(item => item.label), ['02', '03', '04', '05']);
  assert.deepEqual(scoped.episodes, row.episodes.slice(1));
  assert.equal(scoped.latestEpisode, '05');
  assert.equal(scoped.latestUrl, row.latestUrl);
  assert.equal(scoped.lastSuccessAt, at);
  assert.equal(scoped.attemptedAt, at);
  assert.equal(JSON.stringify(row), before);
  const reversed = freeze({...raw, episodes: [...raw.episodes].reverse()});
  assert.deepEqual(scopedRecord(source, reversed).episodes.map(item => item.label), ['05', '04', '03', '02']);
});

test('successful projected listings expose part-local advancement alongside unchanged provider labels', () => {
  const got = fixture();
  assert.equal(got.latestEpisode, '05');
  assert.equal(got.latestPartEpisode, 4);
  assert.equal(got.partEpisodeCount, 11);
  assert.equal(got.latestUrl, raw.latestUrl);
  assert.equal(got.listingCheckedAt, at);
  assert.deepEqual(got.episodes.map(item => item.partEpisode), [1, 2, 3, 4]);
  assert.deepEqual(got.episodes.map(item => item.url), raw.episodes.slice(1).map(item => item.url));
  assert.deepEqual(recentEpisodeAdvance([got], now), {episode: 4, previousEpisode: 3, observedAt: at});
});

test('part migration is idempotent and never invents an advance across a part boundary', () => {
  const original = freeze({highestEpisode: 5, advance: {...event}});
  const part = scopedProgress(source, original);
  assert.equal(part.highestEpisode, 4);
  assert.deepEqual(part.advance, {...event, episode: 4, previousEpisode: 3});
  assert.equal(scopedProgress(source, part), part);
  assert.equal(original.highestEpisode, 5);
  assert.equal(scopedProgress(source, {highestEpisode: 1, advance: event}), undefined);
  assert.deepEqual(scopedProgress(source, {highestEpisode: 2, advance: {...event, episode: 2, previousEpisode: 1}}), {highestEpisode: 1, numbering: 'part-local-v1'});
});

test('unmapped and legacy responses without new part fields retain cumulative advancement', () => {
  const unmapped = {...source, id: 'example:unmapped', bgm: 900000999};
  const got = fixture(unmapped, {...raw, id: unmapped.id, bgm: unmapped.bgm});
  assert.equal(got.latestEpisode, '05');
  for (const key of ['latestPartEpisode', 'partEpisodeCount', 'partScopeNote']) assert.equal(Object.hasOwn(got, key), false);
  assert.equal(got.episodes.length, 5);
  assert(got.episodes.every(item => !Object.hasOwn(item, 'partEpisode')));
  assert.deepEqual(recentEpisodeAdvance([got], now), {episode: 5, previousEpisode: 4, observedAt: at});
  const legacy = {...got, id: source.id, episodeAdvance: event};
  assert.deepEqual(recentEpisodeAdvance([legacy], now), {episode: 5, previousEpisode: 4, observedAt: at});
});

test('identity failure without a last-good observation stays empty despite a configured part scope', () => {
  const row = {...raw, id: partA.id, bgm: partA.bgm, sourceUrl: partA.url, sourceTitle: partA.expectedTitle,
    episodes: [], latestEpisode: undefined, latestUrl: undefined, lastSuccessAt: undefined, status: 'failed', errorCode: 'identity_mismatch'};
  const got = fixture(partA, row, {highestEpisode: 19, advance: {...event, bgm: partA.bgm, sourceId: partA.id, episode: 19, previousEpisode: 18}});
  assert.equal(got.status, 'failed');
  assert.equal(got.error, 'identity_mismatch');
  assert.equal(got.listingCheckedAt, null);
  assert.equal(got.latestEpisode, null);
  assert.equal(got.latestPartEpisode, null);
  assert.equal(got.partEpisodeCount, 8);
  assert.deepEqual(got.episodes, []);
  assert.equal(got.episodeAdvance, undefined);
  assert.equal(recentEpisodeAdvance([got], now), null);
});

test('zh/en/ja rendering keeps provider labels and links alongside translated part-local counts', () => {
  const row = {...raw, id: partA.id, bgm: partA.bgm, sourceUrl: partA.url, sourceTitle: partA.expectedTitle,
    latestEpisode: '19', latestUrl: `${partA.url}?episode=19`,
    episodes: ['12', '19'].map(label => ({label, url: `${partA.url}?episode=${label}`, publishedAt: at}))};
  const got = fixture(partA, row);
  const labels = {zh: '最近列出：第 19 集', en: 'Last listed: episode 19', ja: '最終確認：第19話'};
  for (const locale of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(React.createElement(WatchListingSection, {listings: [got], locale}));
    assert(html.includes('8/8'), locale);
    assert(html.includes(`href="${got.latestUrl}"`), locale);
    assert(html.includes(labels[locale]), locale);
    assert(html.includes('2026-10-16 12:00 UTC'), locale);
    assert(html.includes(translateKnownText(locale, got.partScopeNote)), locale);
    if (locale !== 'zh') assert(!html.includes(got.partScopeNote), `${locale} translates the authored source note`);
  }
});

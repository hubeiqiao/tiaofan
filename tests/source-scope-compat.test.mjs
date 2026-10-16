// Public source-layer contracts only. Gateway-specific field filtering is out of scope.
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
import {listingRegistry, partScopes, platformCatalog, now} from './fixtures/exact-resources.mjs';

const snapshots = {DAY: 86_400_000, safeSnapshot: async () => null, snapshotInfo: () => null};

test('metadata and grouped directory preserve exact-part fields and the same dated advancement', async () => {
  const source = listingRegistry[1], at = new Date(now - 60_000).toISOString();
  const episodes = ['01', '02', '03', '04', '05'].map(label => ({label, url: `${source.url}?episode=${label}`}));
  const row = {id: source.id, bgm: source.bgm, sourceUrl: source.url, sourceTitle: source.expectedTitle,
    verificationScope: 'provider-episode-listing', latestEpisode: '05', latestUrl: episodes[4].url,
    episodes, lastSuccessAt: at, attemptedAt: at, status: 'available', observationMethod: 'native-browser'};
  const event = {bgm: source.bgm, sourceId: source.id, episode: 5, previousEpisode: 4, observedAt: at, verificationScope: 'integer-episode-advance'};
  const overrides = {
    '../data/watch-part-scopes.json': partScopes,
    '@/data/watch-sources.json': {sources: [source]},
    '@/data/watch-listings.json': {items: {[source.id]: row}, titleProgress: {[source.bgm]: {highestEpisode: 5, advance: event}}},
    '@/lib/snapshots': snapshots,
  };
  const {GET: directoryResponse} = loadSourceModule('app/api/watch-listings/route.ts', overrides);
  const {metadataResponse} = loadSourceModule('lib/metadata-response.ts', overrides);
  const originalNow = Date.now;
  Date.now = () => now;
  try {
    const directoryHttp = await directoryResponse(new Request(`https://demo.example.invalid/api/watch-listings?bgm=${source.bgm}`));
    const directory = await directoryHttp.json();
    assert.equal(directoryHttp.headers.get('cache-control'), 'no-store');
    const response = await metadataResponse(new Request(`https://demo.example.invalid/api/metadata?ids=${source.bgm}`), {items: {[source.bgm]: {name: source.expectedTitle}}, meta: {}});
    const metadata = (await response.json()).items[source.bgm];
    assert.deepEqual(metadata.watchListings, directory.items[0].sources);
    const got = metadata.watchListings[0];
    assert.equal(got.latestEpisode, '05');
    assert.equal(got.latestUrl, row.latestUrl);
    assert.equal(got.listingCheckedAt, at);
    assert.deepEqual(got.episodes.map(item => item.url), episodes.slice(1).map(item => item.url));
    assert.equal(got.latestPartEpisode, 4);
    assert.equal(got.partEpisodeCount, 11);
    assert.equal(got.partScopeNote, partScopes[source.id].note);
    assert.deepEqual(got.episodes.map(item => item.partEpisode), [1, 2, 3, 4]);
    assert.deepEqual(got.episodeAdvance, {...event, episode: 4, previousEpisode: 3});
    assert.equal(directory.playbackVerifiedByListing, false);
    assert.deepEqual(metadata.playback, []);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {Date.now = originalNow;}
});

test('informational metadata links retain fictional evidence dates and never assert playback or access', async () => {
  const catalogOnly = platformCatalog.links.find(row => row.classification === 'official-catalog-only');
  const {metadataResponse} = loadSourceModule('lib/metadata-response.ts', {
    '@/data/curated-platforms.json': platformCatalog, '@/lib/snapshots': snapshots,
  });
  const originalNow = Date.now;
  Date.now = () => now;
  try {
    const response = await metadataResponse(new Request(`https://demo.example.invalid/api/metadata?ids=${catalogOnly.bgm}`), {items: {}, meta: {}});
    const got = (await response.json()).items[catalogOnly.bgm];
    assert.deepEqual(got.streams, []);
    assert.deepEqual(got.playback, []);
    assert.deepEqual(got.identityEvidence, platformCatalog.items[catalogOnly.bgm].identityEvidence);
    const info = got.sourceLinks[0];
    assert.equal(info.kind, 'info');
    assert.equal(info.classification, catalogOnly.classification);
    assert.equal(info.url, catalogOnly.url);
    assert.equal(info.retrievedAt, catalogOnly.observedAt);
    assert.equal(info.regions, null);
    for (const flag of ['playbackVerified', 'regionVerified', 'userEntitlementVerified']) assert.equal(info[flag], false);
  } finally {Date.now = originalNow;}
});

test('read-only review status preserves original dates while demo scheduling remains disabled', async () => {
  const {GET} = loadSourceModule('app/api/update-status/route.ts', {'@/data/curated-platforms.json': platformCatalog});
  const originalNow = Date.now, dueAt = Date.parse(platformCatalog.links[0].recheckAfter);
  Date.now = () => dueAt;
  try {
    const response = await GET(), body = await response.json(), status = body.curatedPlatforms;
    assert.equal(body.demo, true);
    assert.equal(body.method, 'synthetic_fixtures');
    assert.deepEqual(body.jobs, []);
    assert.deepEqual(body.onDemandSources, []);
    assert.equal(body.cadence, null);
    assert.equal(status.automaticFetch, false);
    assert.equal(status.dueCount, platformCatalog.links.length);
    assert.equal(status.expiredCount, 0);
    assert.equal(status.nextReviewAt, platformCatalog.links[0].recheckAfter);
    assert.equal(status.entries.length, platformCatalog.links.length);
    for (const [index, entry] of status.entries.entries()) {
      const input = platformCatalog.links[index];
      assert.equal(entry.observedAt, input.observedAt);
      assert.equal(entry.recheckAfter, input.recheckAfter);
      assert.equal(entry.expiresAt, input.expiresAt);
      assert.equal(entry.reviewDue, true);
      assert.equal(entry.informationalOnly, input.classification === 'official-catalog-only');
    }
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {Date.now = originalNow;}
});

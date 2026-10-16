import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
import {listingRegistry as registry,partScopes} from './fixtures/exact-resources.mjs';
const overrides={'../data/watch-part-scopes.json':partScopes};
const core=loadSourceModule('scripts/watch-listings-core.cjs',overrides),scope=loadSourceModule('lib/episode-scope.cjs',overrides);
const [partA,partB]=registry;
const now=Date.parse('2026-10-16T16:00:00Z'),at=t=>new Date(t).toISOString();
const episodes=(source,nums)=>nums.map(n=>({label:String(n).padStart(2,'0'),url:source===partA?'https://episodes.example.invalid/'+(30000+n):source.url+'?id=episode'+n}));
const row=(source,nums,t=now)=>core.applyObservation(registry,null,{id:source.id,sourceUrl:source.url,sourceTitle:source.expectedTitle,result:'listed',observedAt:at(t),episodes:episodes(source,nums)},t);
test('exact part ingestion keeps original provider labels and excludes other parts after strict validation',()=>{
 const a=row(partA,[11,12,13,19,20]);assert.deepEqual(a.episodes.map(x=>x.label),['19','13','12']);assert.equal(a.latestEpisode,'19');
 const b=row(partB,[1,2,3,4,5]);assert.deepEqual(b.episodes.map(x=>x.label),['05','04','03','02']);assert.equal(scope.partEpisode(partB,'05'),4);
 assert.equal(row(partA,[1,11]).status,'failed');
 const invalid=core.applyObservation(registry,null,{id:partA.id,sourceUrl:partA.url,sourceTitle:partA.expectedTitle,result:'listed',observedAt:at(now),episodes:[...episodes(partA,[12]),{label:'01',url:'https://evil.invalid/1'}]},now);assert.equal(invalid.status,'failed','Out-of-part entries still undergo URL validation');
});
test('failed retained rows and public projection filter other parts without renewing dates or failure status',()=>{
 const previous={...row(partA,[12,19],now-3600000),episodes:episodes(partA,[1,11,12,19]),status:'failed',errorCode:'identity_mismatch'};
 const failed=core.applyObservation(registry,previous,{id:partA.id,sourceUrl:partA.url,result:'failed',errorCode:'identity_mismatch',observedAt:at(now)},now);
 assert.equal(failed.lastSuccessAt,previous.lastSuccessAt);assert.equal(failed.status,'failed');assert.deepEqual(failed.episodes.map(x=>x.label),['12','19']);
 const mod=loadSourceModule('lib/watch-listings.ts',{...overrides,'@/data/watch-sources.json':{sources:[partA]},'@/data/watch-listings.json':{items:{[partA.id]:previous}}});
 const view=mod.watchListingsFor(partA.bgm,now)[0];assert.equal(view.latestEpisode,'19');assert.equal(view.latestPartEpisode,8);assert.equal(view.partEpisodeCount,8);assert.equal(view.status,'failed');assert.deepEqual(view.episodes.map(x=>x.partEpisode),[1,8]);assert.equal(view.episodeAdvance,undefined);
});
test('legacy high-water and dated advancement migrate once without creating or renewing an event',()=>{
 const old=row(partB,[1,2,3,4,5],now-3600000);const previous={items:{[partB.id]:old},titleProgress:{[partB.bgm]:{highestEpisode:5,advance:{bgm:partB.bgm,sourceId:partB.id,episode:5,previousEpisode:4,observedAt:old.lastSuccessAt,verificationScope:'integer-episode-advance'}}}};
 const once=core.updateEpisodeAdvances([partB],previous,previous.items,now);assert.equal(once[partB.bgm].highestEpisode,4);assert.equal(once[partB.bgm].advance.episode,4);assert.equal(once[partB.bgm].advance.observedAt,old.lastSuccessAt);assert.equal(once[partB.bgm].numbering,'part-local-v1');assert.deepEqual(core.updateEpisodeAdvances([partB],{...previous,titleProgress:once},previous.items,now),once);
 const next=row(partB,[6]);const advancement=core.updateEpisodeAdvances([partB],{...previous,titleProgress:once},{[partB.id]:next},now);assert.equal(advancement[partB.bgm].advance.episode,5);assert.equal(advancement[partB.bgm].advance.previousEpisode,4);
 const noEvent=core.updateEpisodeAdvances([partA],{items:{[partA.id]:row(partA,[19],now-3600000)},titleProgress:{[partA.bgm]:{highestEpisode:19}}},{[partA.id]:row(partA,[19],now-3600000)},now);assert.deepEqual(noEvent[partA.bgm],{highestEpisode:8,numbering:'part-local-v1'});
});
test('part rules never leak to other Bangumi identities sharing a provider route',()=>{assert.equal(scope.partScope({...partA,bgm:900000999}),null);assert.equal(scope.partEpisode({...partA,bgm:900000999},'11'),11)});

test('a migrated local baseline survives source removal and later reintroduction without renumbering twice',()=>{const previous={items:{},titleProgress:{[partB.bgm]:{highestEpisode:4,numbering:'part-local-v1'}}};const absent=core.updateEpisodeAdvances([],previous,{},now);assert.deepEqual(absent,previous.titleProgress);assert.deepEqual(core.updateEpisodeAdvances([partB],{items:{},titleProgress:absent},{},now),absent)});

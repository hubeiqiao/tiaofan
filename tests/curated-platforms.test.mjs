import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSourceModule} from './component-test-loader.mjs';
import {platformCatalog as data,now} from './fixtures/exact-resources.mjs';
const load=(path,overrides={})=>loadSourceModule(path,{'@/data/curated-platforms.json':data,...overrides});
const {resolvePlatformLinks,curatedIdentity}=load('lib/curated-platforms.ts');
const candidate=data.links.find(r=>r.bgm===900000101),old={name:'old',url:'https://example.org/old',regions:['US']};
test('active exact film overlay survives empty live streams without resurrecting removed base links',()=>{
 const r=resolvePlatformLinks(900000101,{streams:[old]},{streams:[]},now);assert.deepEqual(r.streams.map(x=>x.url),data.links.filter(x=>x.bgm===900000101).map(x=>x.url));assert.equal(r.streams[0].playbackVerified,false);assert.equal(r.streams[0].regionVerified,false);assert.equal(r.streams[0].regions,null);assert.equal(curatedIdentity(900000101).format,'movie');assert.equal(resolvePlatformLinks(900000999,{}, {},now).streams.length,0);
});
test('canonical duplicate URLs collapse and latest upstream restrictions win over overlay unknown region',()=>{
 const upstream={name:'Fictional provider',url:candidate.url,regions:['JP'],availability:'subscription-only',regionScope:'JP only'};
 const r=resolvePlatformLinks(900000101,{streams:[{...upstream,regions:['US']}]},{streams:[upstream,upstream]},now,{...data,links:[candidate]});assert.equal(r.streams.length,1);assert.deepEqual(r.streams[0].regions,['JP']);assert.equal(r.streams[0].availability,'subscription-only');assert.equal(r.streams[0].regionScope,'JP only');
});
test('explicit revocation wins; expiry retains only informational last-good links',()=>{
 const revoked={...data,links:[candidate,{...candidate,state:'revoked'}]};assert.deepEqual(resolvePlatformLinks(900000101,{streams:[candidate]}, {},now,revoked).streams,[]);
 const expired=resolvePlatformLinks(900000101,{}, {},Date.parse(candidate.expiresAt));assert.deepEqual(expired.streams,[]);assert.equal(expired.sourceLinks.length,2);assert(expired.sourceLinks.every(x=>x.kind==='info'&&x.reviewStatus==='expired'));assert.equal(expired.sourceLinks[0].retrievedAt,candidate.observedAt);
});
test('catalog-only and forthcoming entries are informational, never stream or playback records',()=>{
 const informational={...data,links:[{...candidate,classification:'official-catalog-only'},{...candidate,url:'https://example.org/future',classification:'official-forthcoming-title'}]};const r=resolvePlatformLinks(900000101,{}, {},now,informational);assert.deepEqual(r.streams,[]);assert.equal(r.sourceLinks.length,2);assert(r.sourceLinks.every(x=>x.kind==='info'));
});
test('overlay cannot merge films, seasons or parts by title or provider',()=>{
 assert.equal(resolvePlatformLinks(900000102,{}, {},now).streams.length,1);assert.notEqual(resolvePlatformLinks(900000102,{}, {},now).streams[0].url,candidate.url);assert.equal(resolvePlatformLinks(900000105,{}, {},now).streams.length,0);
});
test('helpers retain synthetic runtime inputs and do not mutate source snapshots',()=>{
 const paths=['data/playback.json','data/metadata.json','data/source-snapshots.json'];const before=paths.map(name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
 const original=JSON.stringify(data);resolvePlatformLinks(900000101,{}, {},now);assert.equal(JSON.stringify(data),original);
 assert.deepEqual(paths.map(name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8')),before);
 const defaults=loadSourceModule('lib/curated-platforms.ts');assert.equal(defaults.curatedIdentity(900000101),undefined);assert.deepEqual(defaults.resolvePlatformLinks(900000101,{}, {},now),{streams:[],sourceLinks:[]});assert.deepEqual(defaults.curatedPlatformStatus(now).entries,[]);
});
test('metadata API selects overlay-only films and keeps informative TV-VOD out of stream counts',async()=>{
 const {metadataResponse}=load('lib/metadata-response.ts',{'@/lib/snapshots':{DAY:86400000,safeSnapshot:async()=>null,snapshotInfo:()=>null}});
 const actualNow=Date.now;Date.now=()=>now;
 try{const result=await(await metadataResponse(new Request('https://example.test/api/metadata?ids=900000101,900000102,900000103,900000104'),{items:{},meta:{}})).json();assert.deepEqual(Object.keys(result.items).sort(),['900000101','900000102','900000103','900000104']);assert.equal(result.items['900000101'].streams.length,2);assert.equal(result.items['900000104'].streams.length,0);assert.equal(result.items['900000104'].sourceLinks[0].kind,'info');assert.equal(result.items['900000101'].mal,undefined);assert.deepEqual(result.items['900000101'].playback,[]);}finally{Date.now=actualNow}
});

test('review queue surfaces due dates without making requests or renewing observations',()=>{const {curatedPlatformStatus}=load('lib/curated-platforms.ts');const due=curatedPlatformStatus(Date.parse('2026-10-30T00:00:00Z'));assert.equal(due.dueCount,data.links.length);assert.equal(due.automaticFetch,false);assert.equal(due.entries[0].observedAt,data.links[0].observedAt);assert.equal(curatedPlatformStatus(Date.parse('2026-11-15T00:00:00Z')).expiredCount,data.links.length)});

test('all new platform and part notes have exact English and Japanese translations',()=>{const {translateKnownText}=loadSourceModule('lib/localization.ts');const scopes=JSON.parse(fs.readFileSync(new URL('../data/watch-part-scopes.json',import.meta.url)));for(const note of [...data.links.map(x=>x.note),...Object.values(scopes).map(x=>x.note),resolvePlatformLinks(633836,{streams:[old]}, {},now).streams[0].scopeLabel])for(const locale of ['en','ja'])assert.notEqual(translateKnownText(locale,note),note)});

test('localized fictional source notes and expired review labels have English and Japanese copies',()=>{const {translateKnownText}=loadSourceModule('lib/localization.ts');for(const locale of ['en','ja']){const expired=resolvePlatformLinks(900000101,{}, {},Date.parse(data.links[0].expiresAt)).sourceLinks[0];assert.notEqual(translateKnownText(locale,expired.note),expired.note);assert.notEqual(translateKnownText(locale,data.links[0].note),data.links[0].note);}});

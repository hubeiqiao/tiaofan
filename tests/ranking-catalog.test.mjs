import test from 'node:test';
import assert from 'node:assert/strict';
import {registry as archive} from './fixtures/registry.mjs';
const rank = await import('../lib/ranking-catalog.mjs').catch(()=>null);

const at='2026-10-12T01:00:00Z',now=Date.parse(at);
const kitsu=(id,format='TV')=>({kitsu:String(id),mal:id,name:'Title '+id,originalName:'Original '+id,date:'2020-01-01',format,score:90-id/100,count:100,rank:id,url:'https://kitsu.app/anime/'+id,at,image:'https://media.kitsu.app/'+id+'.jpg'});
test('archive ranking exposes 500 synthetic TV entries in source-rank order and pages only 24',()=>{
 assert.ok(rank,'Ranking module must exist');
 const first=rank.queryRanking({source:'bgm',registry:archive},{limit:24},now);
 assert.equal(first.total,500);assert.equal(first.items.length,24);assert.equal(first.nextOffset,24);assert.equal(first.coverage.matchingTitles,600);assert.equal(first.coverage.archiveAsOf,'2026-10-01T00:00:00Z');assert.equal(first.coverage.sourceTotal,null);
 const all=[];for(let offset=0;offset<500;offset+=24){const p=rank.queryRanking({source:'bgm',registry:archive},{offset,version:first.revision},now);all.push(...p.items)}
 assert.equal(all.length,500);assert.equal(new Set(all.map(x=>x.key)).size,500);assert.equal(all[499].sourceRank,500);assert.equal(all[499].displayPosition,500);assert(all.every((x,i)=>!i||x.sourceRank>=all[i-1].sourceRank));assert(all.every(x=>x.rating.bgm.score>0&&x.rating.bgm.at&&x.rating.bgm.url));assert.equal(first.items[0].summary,'');
});
test('filters and top250 operate on entire rank pool, not just loaded page',()=>{
 assert.ok(rank);const p=rank.queryRanking({source:'bgm',registry:archive},{minimumVotes:1000,top:250,query:'',offset:240},now);assert.equal(p.total,250);assert.equal(p.items.length,10);assert.equal(p.nextOffset,null);assert(p.items.every(x=>x.rating.bgm.count>=1000));
 const find=rank.queryRanking({source:'bgm',registry:archive},{query:'Fixture title 500'},now);assert.equal(find.items[0].bgm,900100500);assert.equal(find.items[0].sourceRank,500);
 assert.throws(()=>rank.queryRanking({source:'bgm',registry:archive},{version:'wrong'},now),/RANKING_VERSION_CHANGED/);
 for(const opts of [{limit:25},{top:1000},{offset:-1},{minimumVotes:-1},{media:'network'}])assert.throws(()=>rank.queryRanking({source:'bgm',registry:archive},opts,now));
});
test('Kitsu source total, collected pool, filtered count, rank and local position stay separate',()=>{
 assert.ok(rank);const snapshot={at,items:Array.from({length:20},(_,i)=>kitsu(i+1,i<12?'TV':'movie')),total:22497,hasNext:true};
 const p=rank.queryRanking({source:'kitsu',snapshot},{},now);assert.equal(p.total,12);assert.equal(p.coverage.sourceTotal,22497);assert.equal(p.coverage.collectedCandidates,20);assert.equal(p.coverage.matchingTitles,12);assert.equal(p.coverage.upstreamHasMore,true);assert.equal(p.nextOffset,null);assert(p.items.every(x=>x.rating.kitsu&&!x.rating.bgm&&!x.rating.mal));
 const missing=rank.queryRanking({source:'kitsu',snapshot:{...snapshot,items:[{...kitsu(1),score:null},{...kitsu(2),rank:null},kitsu(3,'ONA'),kitsu(4)]}},{},now);assert.deepEqual(missing.items.map(x=>x.sourceRank),[4]);
});
test('hydration requests details for only selected page and preserves ranking evidence',async()=>{
 assert.ok(rank);const p=rank.queryRanking({source:'bgm',registry:archive},{offset:24},now);let ids;
 const hydrated=await rank.hydrateRankingPage(p,async selected=>{ids=selected;return Object.fromEntries(selected.map(id=>[id,{summary:'Summary '+id,image:'https://example.org/'+id+'.jpg',ratings:{bgm:{score:1}}}]))});
 assert.equal(ids.length,24);assert.deepEqual(ids,p.items.map(x=>x.bgm));assert.equal(hydrated.items[0].sourceRank,p.items[0].sourceRank);assert.deepEqual(hydrated.items[0].rating,p.items[0].rating);assert(hydrated.items[0].summary.startsWith('Summary'));
});
test('ambiguous shared MAL ids cannot collapse distinct Kitsu source titles',()=>{const snapshot={at,total:2,hasNext:false,items:[{...kitsu(1),mal:99},{...kitsu(2),mal:99}]};const p=rank.queryRanking({source:'kitsu',snapshot},{},now);assert.equal(new Set(p.items.map(x=>x.key)).size,2);assert.deepEqual(p.items.map(x=>x.key),['kitsu:1','kitsu:2'])});
test('Kitsu date-sensitive page revisions reject midnight membership changes',()=>{const snapshot={at,items:[{...kitsu(1),date:'2026-10-13'},kitsu(2),kitsu(3)],total:3,hasNext:false};const before=rank.queryRanking({source:'kitsu',snapshot},{airing:'aired',limit:1},Date.parse('2026-10-12T23:59:00Z'));assert.equal(before.total,2);assert.equal(before.items[0].kitsuId,'2');assert.throws(()=>rank.queryRanking({source:'kitsu',snapshot},{airing:'aired',limit:1,offset:1,version:before.revision},Date.parse('2026-10-13T00:01:00Z')),/RANKING_VERSION_CHANGED/);const after=rank.queryRanking({source:'kitsu',snapshot},{airing:'aired',limit:1},Date.parse('2026-10-13T00:01:00Z'));assert.equal(after.total,3);assert.equal(after.items[0].kitsuId,'1');assert.notEqual(after.revision,before.revision);const unfilteredBefore=rank.queryRanking({source:'kitsu',snapshot},{airing:'all'},Date.parse('2026-10-12T23:59:00Z')),unfilteredAfter=rank.queryRanking({source:'kitsu',snapshot},{airing:'all'},Date.parse('2026-10-13T00:01:00Z'));assert.equal(unfilteredBefore.revision,unfilteredAfter.revision)});
test('Kitsu mapping eligibility considers all source pages before filters, without dropping MAL or rank',()=>{const items=Array.from({length:49},(_,i)=>kitsu(i+1));items[0].mal=999;items[48].mal=999;items[2].mal=null;const snapshot={at,total:49,hasNext:false,items};const first=rank.queryRanking({source:'kitsu',snapshot},{limit:24},now),last=rank.queryRanking({source:'kitsu',snapshot},{offset:48},now);assert.equal(first.items[0].mappingEligible,false);assert.equal(first.items[1].mappingEligible,true);assert.equal(first.items[2].mappingEligible,false);assert.equal(last.items[0].mappingEligible,false);assert.equal(last.items[0].mal,999);assert.equal(last.items[0].sourceRank,49);assert.equal(first.total,49);const filtered=rank.queryRanking({source:'kitsu',snapshot},{query:'Title49'},now);assert.equal(filtered.items[0].mappingEligible,false);assert.equal(filtered.items[0].mal,999)});

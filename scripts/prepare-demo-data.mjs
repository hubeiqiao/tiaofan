import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

/** Creates only original fictional fixtures. Never downloads third-party data.
 * Dates move with the quarter so a fresh clone remains browsable. IDs retain the
 * application's numeric wire format; they are NOT actual Bangumi identifiers.
 * No ratings, reviews, playback claims, provider mappings or personal records. */
const root=fileURLToPath(new URL('../data/',import.meta.url));mkdirSync(root,{recursive:true});
const write=(name,value)=>writeFileSync(path.join(root,name+'.json'),JSON.stringify(value,null,2)+'\n');
const now=new Date(),year=now.getUTCFullYear(),quarter=Math.floor(now.getUTCMonth()/3);
const start=(q)=>new Date(Date.UTC(year,(quarter+q)*3,1)).toISOString().slice(0,10);
const at=start(0)+'T00:00:00.000Z',stamp=Date.parse(at);
const meta={source:'Original synthetic demo fixtures',sourceUrl:'https://example.invalid/demo-data',snapshotUrl:'https://example.invalid/demo-data',retrievedAt:at,generatedAt:at,synthetic:true,license:'UNLICENSED',attribution:'Fictional examples authored for this source demo; not third-party catalog data.',notes:['Numeric IDs are local synthetic fixtures, not real Bangumi IDs.','Dates are illustrative and generated for the current quarter.','No real ratings, reviews, posters, stream listings or playback verification are included.']};
const definitions=[
 [900000001,'示例：纸飞机观测站','Demo: Paper Plane Observatory','デモ：紙飛行機観測所','TV',start(0),['日常','科幻']],
 [900000002,'示例：月光修理部','Demo: Moonlight Workshop','デモ：月あかり工房','TV',start(0),['奇幻','治愈']],
 [900000003,'示例：没有地图的星期天','Demo: Sunday Without a Map','デモ：地図のない日曜日','TV',start(0),['冒险','喜剧']],
 [900000004,'示例：玻璃花园短篇','Demo: Glass Garden Short','デモ：ガラスの庭の短編','movie',start(0),['日常']],
 [900000005,'示例：邮差与星河','Demo: The Post and the Stars','デモ：星空の郵便','TV',start(-1),['冒险','治愈']],
 [900000006,'示例：旧书店的午后','Demo: An Afternoon in a Bookshop','デモ：古本屋の午後','TV',start(-4),['日常','治愈']],
];
const summary='这是为界面测试创作的虚构资料，并非真实动画。日期、标签与集数均为示例；没有真实评分、评论或观看记录。';
const enSummary='An original fictional record for interface testing, not a real anime. Dates, genres and episode counts are illustrative. No real ratings, reviews or viewing records are included.';
const jaSummary='画面テスト用に作成した架空の作品です。日付・ジャンル・話数は例示で、実際の評価、レビュー、視聴記録は含まれません。';
const rows=definitions.map(([bgm,name,en,ja,format,date,tags])=>({key:'bgm:'+bgm,bgm,name,originalName:ja,aliases:[name,en,ja],image:'/demo-poster.svg',summary,tags,date,format,rating:{},episodes:format==='movie'?1:12,language:'ja',streams:[],sourceLinks:[],synthetic:true}));
const items=Object.fromEntries(rows.map(row=>[row.bgm,{name:row.name,type:row.format,metadataDate:row.date,language:'ja',streams:[],sourceLinks:[],synthetic:true}]));
write('metadata',{meta,items});write('metadata-provenance',meta);
write('verified-titles',{meta,items:Object.fromEntries(rows.map(row=>[row.bgm,{originalName:row.originalName,nameCn:row.name,sourceUrl:meta.sourceUrl,synthetic:true}]))});
write('search-aliases',Object.fromEntries(definitions.map(([id,zh,en,ja])=>[id,[zh,en,ja]])));
for(const [lang,text,index] of [['english',enSummary,2],['japanese',jaSummary,3]])write(lang+'-content',{meta:{...meta,language:lang==='english'?'en':'ja'},items:Object.fromEntries(definitions.map(d=>[d[0],{summary:text,watchPoints:[],originalName:d[index],name:d[index],sourceUrl:meta.sourceUrl}]))});
for(const name of ['editorial','reviews','review-coverage','japanese-review-coverage','playback'])write(name,{meta,checkedAt:null,items:{}});
for(const name of ['archived-homepages','japanese-coverage-reasons','japanese-source-notes'])write(name,{});
for(const name of ['anime-relations','recommendation-relation-evidence'])write(name,{scope:'Synthetic demo; no real relation evidence bundled.',items:[]});
write('recommendation-entry-evidence',{schemaVersion:1,scope:'No verified entry evidence in the demo.',items:[]});
write('watch-sources',{version:1,scope:'No live providers configured in this demo.',sources:[]});
write('watch-listings',{version:1,generatedAt:at,synthetic:true,items:{},titleProgress:{},lastAutomaticSweep:null});
const pack=(key,payload)=>({key,payload:JSON.stringify({...payload,synthetic:true,at}),previous_payload:null,source_url:meta.sourceUrl,updated_at:stamp,attempted_at:stamp,last_error:null});
const prev=new Date(Date.UTC(year,(quarter-1)*3,1));
const catalog=(records)=>({items:records,sourceTotal:records.length,scope:'SYNTHETIC DEMO: fictional examples, no community ratings.'});
write('source-snapshots',{generatedAt:at,synthetic:true,snapshots:[pack(`catalog:${year}:${quarter}`,catalog(rows.slice(0,4))),pack(`catalog:${prev.getUTCFullYear()}:${Math.floor(prev.getUTCMonth()/3)}`,catalog(rows.slice(4,5))),pack('rank:bgm',catalog(rows)),pack('rank:kitsu',{items:[],total:0,hasNext:false}),pack('kitsu:seasonal',{byMal:{}}),pack('metadata:seasonal',{items,license:'UNLICENSED',note:meta.attribution}),pack('discussions',{items:[],scope:'No discussion samples in the demo.'})],jobs:[]});
const sources={demo:{name:meta.source,url:meta.sourceUrl,at,license:'UNLICENSED',attribution:meta.attribution}};
write('historical-registry',{schemaVersion:1,revision:'synthetic-demo-v1-'+start(0),generatedAt:at,synthetic:true,sources,items:rows.map(row=>({bgm:row.bgm,key:row.key,title:row.name,originalTitle:row.originalName,aliases:[],date:row.date,format:row.format,sourceFormat:row.format,dateSource:'demo',sourceKey:'demo',sourceAt:at,archiveEligible:false,details:{summary:row.summary,image:'/demo-poster.svg',tags:row.tags,episodes:row.episodes,ratings:{},sourceKey:'demo',sourceAt:at}}))});
write('historical-status',{sourceUrl:meta.sourceUrl,asOf:at,fetchedAt:null,revision:'synthetic-demo-v1',browsableTV:1,archiveVerifiedTV:0,withRatings:0,withSynopses:1,typedRelations:0,metadataOnlyTV:0,archiveAutoRefresh:false,scope:'Synthetic examples, not a verified archive.',license:'UNLICENSED',attribution:meta.attribution,synthetic:true});
// Eliminate stale generated shards when the fixture set gets smaller.
for(const directory of ['historical-registry-shards','metadata-link-shards'])rmSync(path.join(root,directory),{recursive:true,force:true});
console.log('Prepared 6 synthetic records; no network reads, ratings or private data.');

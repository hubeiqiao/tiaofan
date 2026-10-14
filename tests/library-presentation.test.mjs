import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
const {librarySeason,librarySeasonOrder,librarySignalKey,publicPresentation,visibleDetail}=loadSourceModule('lib/library-presentation.ts');
const {parseBrowseState,readBrowseState,saveBrowseState,BROWSE_STATE_KEY}=loadSourceModule('lib/browse-state.ts');
const anime=(id,date='2026-10-01',more={})=>({key:'bgm:'+id,bgm:id,name:'Title '+id,date,format:'TV',tags:[],rating:{},...more});
const today='2026-10-09';
test('library separates source seasons, explicit continuing membership, future and unknown without losing records',()=>{
 const rows=[anime(1),anime(2,'2007-04-01',{metadataDate:'2007-03-31'}),anime(639938,'2026-09-25'),anime(3,'2026-12-01'),anime(4,''),anime(5,'2026-02-30'),anime(6,'2010-01-01')];
 const keys=new Set(['bgm:6']);const grouped=librarySeasonOrder.flatMap(group=>rows.filter(a=>librarySeason(a,2026,3,keys,today)===group));
 assert.equal(grouped.length,rows.length);assert.equal(new Set(grouped.map(a=>a.key)).size,rows.length);
 assert.deepEqual(rows.map(a=>librarySeason(a,2026,3,keys,today)),['current','previous','current','upcoming','unknown','unknown','current']);
 assert.equal(rows[1].date,'2007-04-01');
});
test('library grouping and public detail projection never change independent status and favorite',()=>{
 const row=anime(1,'2026-09-01',{state:'watching',favorite:true});const original=JSON.stringify(row);
 librarySeason(row,2026,3,new Set(),today);const display=publicPresentation(row);
 assert.equal(JSON.stringify(row),original);assert.equal(display.state,undefined);assert.equal(display.favorite,undefined);
 assert.equal(librarySignalKey([row]),librarySignalKey([{...row,rating:{bgm:{score:9}}}]));
 assert.notEqual(librarySignalKey([row]),librarySignalKey([{...row,favorite:false}]));
});
test('public detail survives same-account and guest revalidation while private detail masks immediately',()=>{
 const row=anime(1);for(const status of ['ready','guest','loading','error'])assert.equal(visibleDetail(row,undefined,false,2,3,status).key,row.key);
 assert.equal(visibleDetail(row,undefined,true,2,2,'loading'),null);
 assert.equal(visibleDetail(row,undefined,true,2,2,'error'),null);
 assert.equal(visibleDetail(row,undefined,true,2,3,'ready'),null);
 assert.equal(visibleDetail(row,undefined,true,2,2,'ready').key,row.key);
});
const state={version:1,historicalMode:'all',view:'historical',sort:'mal',rankSource:'bgm',query:'JOJO',day:'all',minVotes:'0',media:'series',airing:'aired',language:'all',limit:72,scroll:2300};
test('public browse whitelist round-trips without private rows, flags, account context or model results',()=>{
 let value='';const storage={getItem:k=>k===BROWSE_STATE_KEY?value:null,setItem:(k,v)=>{assert.equal(k,BROWSE_STATE_KEY);value=v}};
 saveBrowseState(storage,{...state,items:[{private:true}],favorite:true,context:'private',personalResult:{secret:1},token:'private'});
 assert.deepEqual(readBrowseState(storage),{...state,airing:'all'});assert.doesNotMatch(value,/private|favorite|context|personalResult|token/);
 assert.equal(readBrowseState(storage,'?anime=1'),null);assert.equal(readBrowseState(storage,'','#catalog'),null);
});
test('corrupt, obsolete, excessive, invalid browse snapshots and inaccessible storage fail safely',()=>{
 for(const value of ['',null,'[','x'.repeat(2500),JSON.stringify({...state,version:0}),JSON.stringify({...state,limit:20001}),JSON.stringify({...state,view:'secret'}),JSON.stringify({...state,scroll:-1}),JSON.stringify({...state,query:'x'.repeat(161)})])assert.equal(parseBrowseState(value),null);
 assert.equal(readBrowseState({getItem(){throw Error('denied')}}),null);
 assert.doesNotThrow(()=>saveBrowseState({setItem(){throw Error('denied')}},state));
});

test('full historical browsing remains persistable beyond one thousand loaded cards',()=>{const value={version:1,view:'historical',sort:'bgm',rankSource:'bgm',query:'',day:'all',minVotes:'0',media:'series',airing:'all',language:'all',limit:5280,scroll:650000,historicalMode:'all'};assert.equal(parseBrowseState(JSON.stringify(value)).limit,5280);assert.equal(parseBrowseState(JSON.stringify({...value,limit:20001})),null);});

test('new-document return persists only public detail identity/tab and filter disclosure, never detail payload',()=>{const source={...state,filtersOpen:true,publicDetail:{id:876,tab:'reviews',name:'do not persist',state:'watching',favorite:true}};const clean=parseBrowseState(JSON.stringify(source));assert.deepEqual(clean.publicDetail,{id:876,tab:'reviews'});assert.equal(clean.filtersOpen,true);for(const publicDetail of [{id:-1,tab:'story'},{id:876,tab:'secret'},{id:'876',tab:'story'},{id:1000000000,tab:'story'}])assert.equal(parseBrowseState(JSON.stringify({...state,publicDetail})).publicDetail,undefined);assert.doesNotMatch(JSON.stringify(clean),/do not persist|watching|favorite/)});

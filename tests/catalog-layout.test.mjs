import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';

// Removing validation, offset preservation, or generation guards breaks these tests.
const layout = loadSourceModule('lib/catalog-layout.ts');
const card = (key, top, bottom, extra = {}) => ({isConnected:true, getAttribute:()=>key,getBoundingClientRect:()=>({top,bottom,width:200,height:bottom-top}),...extra});
const root = cards => ({isConnected:true,querySelectorAll:()=>cards});

test('public preference stores only version and a supported layout', () => {
 let saved;const storage={getItem:()=>saved??null,setItem:(key,value)=>{assert.equal(key,layout.CATALOG_LAYOUT_STORAGE_KEY);saved=value}};
 assert.equal(layout.readCatalogLayout(storage),null);
 assert.equal(layout.saveCatalogLayout(storage,'list'),true);
 assert.deepEqual(JSON.parse(saved),{version:1,layout:'list'});
 assert.equal(layout.readCatalogLayout(storage),'list');
 for(const value of ['grid','null','{}','{"version":2,"layout":"grid"}','{"version":1,"layout":"tiles"}','{"version":1,"layout":"list","query":"private"}']){saved=value;assert.equal(layout.readCatalogLayout(storage),null)}
 assert.equal(layout.saveCatalogLayout(storage,'invalid'),false);
 assert.equal(layout.readCatalogLayout({getItem(){throw Error('blocked')}}),null);
 assert.equal(layout.saveCatalogLayout({setItem(){throw Error('quota')}},'grid'),false);
});
test('first visible card captures key and relative viewport offset, including partial cards', () => {
 const cards=[card('above',-250,-1),card('first',-20,160),card('second',190,380)];
 assert.deepEqual(layout.captureCatalogAnchor(root(cards),700),{key:'first',offset:-20});
 assert.deepEqual(layout.captureCatalogAnchor(root(cards),700,180),{key:'second',offset:190});
 assert.equal(layout.captureCatalogAnchor(root([card('below',720,900)]),700),null);
 assert.equal(layout.captureCatalogAnchor(null,700),null);
 assert.equal(layout.captureCatalogAnchor(root([card('hidden',0,0)]),700),null);
});
test('restore uses exact key matching and relative delta, never moves focus or a missing target', () => {
 const scroll=[];const anchor={key:'odd"]key',offset:-20};
 assert.equal(layout.restoreCatalogAnchor(root([card(anchor.key,350,550)]),anchor,delta=>scroll.push(delta)),true);
 assert.deepEqual(scroll,[370]);
 assert.equal(layout.restoreCatalogAnchor(root([card('other',350,550)]),anchor,delta=>scroll.push(delta)),false);
 assert.equal(layout.restoreCatalogAnchor({...root([card(anchor.key,350,550)]),isConnected:false},anchor,()=>assert.fail('disconnected')),false);
 assert.equal(layout.restoreCatalogAnchor(root([card(anchor.key,350,550,{isConnected:false})]),anchor,()=>assert.fail('disconnected')),false);
 assert.equal(layout.restoreCatalogAnchor(null,anchor,()=>assert.fail('unmounted')),false);
});
function coordination(){
 let id=0;const frames=new Map(),busy=[],applied=[];
 const coordinator=layout.createCatalogLayoutCoordinator({requestFrame(fn){frames.set(++id,fn);return id},cancelFrame(id){frames.delete(id)},onTransition:next=>busy.push(next)});
 return {coordinator,frames,busy,applied,apply:anchor=>applied.push(anchor),flush(){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn()}};
}
test('coordinator preserves original anchor across rapid committed toggles and ignores stale callbacks', () => {
 const s=coordination(),anchor={key:'bgm:5',offset:80};
 s.coordinator.begin('current',()=>anchor);const oldCleanup=s.coordinator.restore('current',s.apply);const stale=[...s.frames.values()][0];
 s.coordinator.begin('current',()=>assert.fail('capture must not replace original pending anchor'));
 s.coordinator.restore('current',s.apply);oldCleanup();stale();assert.deepEqual(s.applied,[]);
 s.flush();assert.deepEqual(s.applied,[anchor]);assert.equal(s.coordinator.isTransitioning(),true);
 s.flush();assert.equal(s.coordinator.isTransitioning(),false);assert.deepEqual(s.busy,[true,false]);
});
test('context changes, unmount cancellation, and late callbacks cannot restore retired content', () => {
 for(const ending of ['context','cancel']){
  const s=coordination();s.coordinator.begin('current',()=>({key:'bgm:5',offset:80}));s.coordinator.restore('current',s.apply);const stale=[...s.frames.values()][0];
  if(ending==='context')s.coordinator.restore('different-query',s.apply);else s.coordinator.cancel();
  stale();s.flush();assert.deepEqual(s.applied,[]);assert.equal(s.coordinator.isTransitioning(),false);
 }
});
test('cleanup retains an anchor for effect replay; missing anchors still release transition', () => {
 const s=coordination();s.coordinator.begin('current',()=>({key:'a',offset:0}));const cleanup=s.coordinator.restore('current',s.apply);cleanup();s.flush();assert.deepEqual(s.applied,[]);
 s.coordinator.restore('current',s.apply);s.flush();s.flush();assert.equal(s.applied.length,1);
 s.coordinator.begin('current',()=>null);s.coordinator.restore('current',()=>assert.fail('no anchor'));s.flush();s.flush();assert.equal(s.coordinator.isTransitioning(),false);
});
test('prepared anchor precedes radio focus scrolling and is consumed by only one change', () => {
 const s=coordination(),original={key:'deep-card',offset:72};const expire=s.coordinator.prepare('current',()=>original);
 assert.equal(s.coordinator.isTransitioning(),false);assert.deepEqual(s.busy,[]);
 s.coordinator.begin('current',()=>({key:'top-card',offset:120}));expire();s.coordinator.restore('current',s.apply);s.flush();s.flush();assert.deepEqual(s.applied,[original]);
 s.coordinator.begin('current',()=>({key:'new-card',offset:10}));s.coordinator.restore('current',s.apply);s.flush();s.flush();assert.deepEqual(s.applied.at(-1),{key:'new-card',offset:10});
});
test('prepared anchor expiration, newer inputs, and context cancellation are bounded to the input event', () => {
 const s=coordination(),old={key:'private-a',offset:72},latest={key:'public-b',offset:30};
 const expireOld=s.coordinator.prepare('a',()=>old);s.coordinator.prepare('a',()=>latest);expireOld();s.coordinator.begin('a',()=>assert.fail('new event anchor retained'));s.coordinator.restore('a',s.apply);s.flush();s.flush();assert.deepEqual(s.applied,[latest]);
 const expire=s.coordinator.prepare('a',()=>old);expire();assert.equal(s.coordinator.isTransitioning(),false);s.coordinator.begin('a',()=>latest);s.coordinator.restore('a',s.apply);s.flush();s.flush();assert.deepEqual(s.applied.at(-1),latest);
 s.coordinator.prepare('a',()=>old);s.coordinator.restore('b',s.apply);s.coordinator.begin('b',()=>latest);s.coordinator.restore('b',s.apply);s.flush();s.flush();assert.deepEqual(s.applied.at(-1),latest);
 s.coordinator.prepare('a',()=>old);s.coordinator.cancel();s.coordinator.begin('a',()=>latest);s.coordinator.restore('a',s.apply);s.flush();s.flush();assert.deepEqual(s.applied.at(-1),latest);
});

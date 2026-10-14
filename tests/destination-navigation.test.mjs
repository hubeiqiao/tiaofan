import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';

const {createDestinationNavigation}=loadSourceModule('lib/destination-navigation.ts');

// A deterministic DOM/observer clock. The coordinator is production code;
// browser layout, Radix, and real input dispatch remain native acceptance gates.
function fixture() {
 let locked=true,connected=true,present=true,reading=true,top=6500,scrollY=0,id=0;
 const frames=new Map(),listeners=new Map(),changes=new Set(),holds=[],landings=[],focus=[];
 const target={get isConnected(){return connected},scrollIntoView(options){scrollY=top-140;landings.push({top,options})}};
 const nav=createDestinationNavigation({
  getTarget:()=>present?target:null,
  isLocked:()=>locked,
  isReadingTarget:()=>reading,
  focusTarget:node=>{assert.equal(node,target);focus.push({preventScroll:true})},
  onHoldChange:value=>holds.push(value),
  requestFrame:fn=>{frames.set(++id,fn);return id},cancelFrame:id=>frames.delete(id),
  observeChanges:fn=>{changes.add(fn);return()=>changes.delete(fn)},
  listen(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);return()=>listeners.get(type).delete(fn)},
 });
 return {nav,frames,listeners,changes,holds,landings,focus,target,
  get scrollY(){return scrollY},get top(){return top},set top(value){top=value},
  set locked(value){locked=value},set connected(value){connected=value},set present(value){present=value},set reading(value){reading=value},
  change(){for(const fn of [...changes])fn()},
  flush(){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn()},
  emit(type,extra={}){for(const fn of [...(listeners.get(type)||[])])fn({type,isTrusted:true,defaultPrevented:false,deltaY:1,...extra})},
  listenerCount(){return [...listeners.values()].reduce((n,set)=>n+set.size,0)},
 };
}

test('destination hold synchronously blocks observer setup and queued paging before and after close',()=>{
 const f=fixture();let limit=24,observerSetups=0;
 const setup=()=>{if(!f.nav.isHeld())observerSetups++};
 const queuedIntersection=()=>{if(!f.nav.isHeld())limit=Math.min(limit+24,80)};
 f.nav.begin();assert.equal(f.nav.isHeld(),true);setup();queuedIntersection();
 assert.equal(limit,24,'A callback queued before begin must not append above the destination');
 assert.equal(observerSetups,0);assert.equal(f.nav.close(),true);queuedIntersection();
 assert.equal(limit,24);f.locked=false;f.change();f.flush();queuedIntersection();
 assert.equal(limit,24,'Landing itself cannot re-arm an already intersecting sentinel');
 f.emit('wheel');f.flush();queuedIntersection();assert.equal(limit,24,'Reading a visible destination must not append above it');
 f.reading=false;f.emit('scroll');f.flush();assert.equal(f.nav.isHeld(),false);setup();queuedIntersection();
 assert.equal(limit,48,'Scrolling out of the reading area restores the existing 24-card paging step');
 assert.equal(observerSetups,1);assert.deepEqual(f.holds,[true,false]);
});

test('close waits for actual scroll-lock release and lands once at current geometry',()=>{
 const f=fixture();f.nav.begin();f.nav.close();
 for(let i=0;i<20;i++){f.change();f.flush()}
 assert.deepEqual(f.landings,[],'Elapsed frames cannot manufacture a successful unlock');
 assert.deepEqual(f.focus,[]);assert.equal(f.frames.size,0,'No per-frame polling while the body is locked');
 f.top+=1092;f.locked=false;f.change();assert.equal(f.frames.size,1);
 f.top+=200;f.flush();
 assert.deepEqual(f.landings,[{top:7792,options:{block:'start',behavior:'instant'}}]);
 assert.equal(f.top-f.scrollY,140);assert.deepEqual(f.focus,[{preventScroll:true}]);
 f.change();f.nav.close();f.flush();assert.equal(f.landings.length,1);assert.equal(f.focus.length,1);
 assert.equal(f.nav.isHeld(),true);f.nav.cancel();
});

test('close after a fully released lock still uses a frame and rechecks a new lock before landing',()=>{
 const f=fixture();f.locked=false;f.nav.begin();f.nav.close();assert.equal(f.frames.size,1);
 f.locked=true;f.flush();assert.deepEqual(f.landings,[]);assert.equal(f.nav.isHeld(),true);
 f.locked=false;f.change();f.flush();assert.equal(f.landings.length,1);f.nav.cancel();
});

test('programmatic scroll and synthetic or non-scrolling input do not release the destination',()=>{
 const f=fixture();f.nav.begin();
 for(const [type,extra] of [
  ['scroll',{}],['wheel',{isTrusted:false}],['wheel',{deltaX:0,deltaY:0}],['touchmove',{isTrusted:false}],
  ['keydown',{key:'ArrowDown',isTrusted:false}],['keydown',{key:'ArrowDown',altKey:true}],
  ['keydown',{key:'PageDown',ctrlKey:true}],['keydown',{key:'End',metaKey:true}],
  ['keydown',{key:'ArrowDown',defaultPrevented:true}],['keydown',{key:'Tab'}],['keydown',{key:'Escape'}],
  ['keydown',{key:'ArrowDown',target:{closest:()=>({})}}],
  ['keydown',{key:' ',target:{closest:selector=>selector.includes('button')?{}:null}}],
 ]){f.emit(type,extra);assert.equal(f.nav.isHeld(),true,JSON.stringify({type,...extra}))}
 f.nav.cancel();
});

test('trusted touchmove and page-scroll keys release listeners and prevent a queued landing',()=>{
 for(const [type,key] of [['touchmove'],...['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ','Spacebar'].map(key=>['keydown',key])]){
  const f=fixture();f.locked=false;f.nav.begin();f.nav.close();const stale=[...f.frames.values()][0];
  f.emit(type,{key});assert.equal(f.nav.isHeld(),false,`${type} ${key}`);stale();f.flush();
  assert.deepEqual(f.landings,[]);assert.equal(f.listenerCount(),0);assert.equal(f.changes.size,0);assert.equal(f.frames.size,0);
 }
});

test('manual Load more, new view, or unmount cancel once without later focus theft',()=>{
 const f=fixture();f.locked=false;f.nav.begin();f.nav.close();const stale=[...f.frames.values()][0];
 f.nav.cancel();f.nav.cancel();stale();f.change();f.flush();
 assert.deepEqual(f.holds,[true,false]);assert.deepEqual(f.landings,[]);assert.deepEqual(f.focus,[]);
 assert.equal(f.listenerCount(),0);assert.equal(f.changes.size,0);assert.equal(f.nav.close(),false);
});

test('missing or disconnected destinations never leave automatic paging held',()=>{
 for(const mode of ['missing-at-begin','missing-before-close','disconnected-while-locked','removed-after-land']){
  const f=fixture();if(mode==='missing-at-begin')f.present=false;f.nav.begin();
  if(mode==='missing-before-close')f.present=false;
  f.nav.close();if(mode==='disconnected-while-locked')f.connected=false;
  if(mode==='removed-after-land'){f.locked=false;f.change();f.flush();assert.equal(f.nav.isHeld(),true);f.present=false}
  f.change();f.flush();assert.equal(f.nav.isHeld(),false,mode);assert.equal(f.listenerCount(),0);assert.equal(f.changes.size,0);
 }
});

test('rapid replacement keeps one listener set and rejects callbacks from the prior destination',()=>{
 const f=fixture();f.locked=false;f.nav.begin();f.nav.close();const stale=[...f.frames.values()][0],oldChange=[...f.changes][0];
 f.nav.begin();assert.equal(f.listenerCount(),3);assert.equal(f.changes.size,1);stale();oldChange();
 assert.deepEqual(f.landings,[]);assert.equal(f.frames.size,0,'Old close cannot commit the replacement before its own close');
 f.nav.close();f.flush();assert.equal(f.landings.length,1);f.nav.cancel();assert.equal(f.listenerCount(),0);
});

test('target disappearance between unlock and frame cancels without scrolling or focusing',()=>{
 const f=fixture();f.locked=false;f.nav.begin();f.nav.close();f.present=false;f.flush();
 assert.equal(f.nav.isHeld(),false);assert.deepEqual(f.landings,[]);assert.deepEqual(f.focus,[]);assert.equal(f.listenerCount(),0);
});

test('visible destination remains held across gestures until real scroll intent has left its reading area',()=>{
 const f=fixture();f.locked=false;f.nav.begin();f.nav.close();f.flush();
 f.reading=false;f.emit('scroll');f.change();f.flush();
 assert.equal(f.nav.isHeld(),true,'Programmatic movement alone cannot re-arm automatic paging');
 f.reading=true;f.emit('touchmove');f.flush();assert.equal(f.nav.isHeld(),true);assert.equal(f.listenerCount(),4);
 f.emit('keydown',{key:'PageDown'});f.emit('scroll');f.flush();assert.equal(f.nav.isHeld(),true);
 f.reading=false;f.emit('scroll');f.flush();assert.equal(f.nav.isHeld(),false);assert.equal(f.listenerCount(),0);
 assert.equal(f.landings.length,1,'The hold never anchors the page against user scrolling');
});

test('browser defaults are lazy and release listeners only after trusted scrolling leaves the visible target',()=>{
 const saved={window:globalThis.window,document:globalThis.document,MutationObserver:globalThis.MutationObserver};
 delete globalThis.window;delete globalThis.document;delete globalThis.MutationObserver;
 let locked=true,callback,observations=0,disconnects=0,scrolls=0,focusOptions,rect={top:140,bottom:740};
 const frames=new Map(),listeners=new Map();let id=0;
 const target={isConnected:true,scrollIntoView(){scrolls++},focus(options){focusOptions=options},getBoundingClientRect:()=>rect};
 const nav=createDestinationNavigation({getTarget:()=>target});
 assert.equal(nav.isHeld(),false,'Creating the coordinator during SSR must not read browser globals');
 try{
  const body={hasAttribute:name=>{assert.equal(name,'data-scroll-locked');return locked}};
  globalThis.document={body};
  globalThis.window={innerHeight:844,requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),addEventListener(type,fn,options){assert.equal(options.passive,true);listeners.set(type,fn)},removeEventListener(type,fn){assert.equal(listeners.get(type),fn);listeners.delete(type)}};
  globalThis.MutationObserver=class{constructor(fn){callback=fn}observe(node,options){assert.equal(node,body);assert.deepEqual(options,{attributes:true,attributeFilter:['data-scroll-locked'],childList:true,subtree:true});observations++}disconnect(){disconnects++}};
  assert.equal(observations,0);assert.equal(listeners.size,0);nav.begin();nav.close();
  assert.equal(observations,1);assert.equal(listeners.size,3);assert.equal(frames.size,0);
  locked=false;callback();const batch=[...frames.values()];frames.clear();for(const fn of batch)fn();
  assert.equal(scrolls,1);assert.deepEqual(focusOptions,{preventScroll:true});
  const flush=()=>{const batch=[...frames.values()];frames.clear();for(const fn of batch)fn()};
  listeners.get('wheel')({type:'wheel',isTrusted:true,deltaY:100});flush();assert.equal(nav.isHeld(),true);assert.equal(listeners.size,4);
  rect={top:-700,bottom:-100};listeners.get('scroll')({type:'scroll'});flush();
  assert.equal(nav.isHeld(),false);assert.equal(disconnects,1);assert.equal(listeners.size,0);assert.equal(frames.size,0);
 }finally{nav.cancel();Object.assign(globalThis,saved)}
});

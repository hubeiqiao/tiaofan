import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
const {createRecommendationNavigation}=loadSourceModule('lib/recommendation-navigation.ts');
function setup(initial='/en'){
 const entries=[{url:initial,state:{route:'home'}}];let index=0,queued=0,child=false;const events=[];
 const history={get state(){return entries[index].state},pushState(state,title,url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url){entries[index]={url,state}},back(){queued++}};
 const location=()=>{const url=new URL(entries[index].url,'https://example.invalid');return {pathname:url.pathname,search:url.search,hash:url.hash}};
 const c=createRecommendationNavigation({history,location,token:'opaque',enter:capture=>events.push(['enter',capture]),leave:restore=>events.push(['leave',restore]),dismissChild:()=>{if(!child)return false;child=false;return true}});
 return {c,entries,events,history,get queued(){return queued},get url(){return entries[index].url},child(){child=true},back(){index=Math.max(0,index-1);if(queued)queued--;c.pop()},forward(){index=Math.min(entries.length-1,index+1);c.pop()}};
}
test('entry has its own URL and history marker, without library/model content; repeat clicks are idempotent',()=>{const x=setup();x.c.start();x.c.show();x.c.show();assert.equal(x.url,'/en#recommendations');assert.equal(x.entries.length,2);assert.deepEqual(x.history.state,{route:'home',animeRecommendations:'opaque'});assert.deepEqual(x.events,[['enter',true]]);assert.equal(x.c.isOpen(),true)});
test('Back and Forward enter only the recommendation destination, never My list or private payloads',()=>{const x=setup();x.c.show();x.back();assert.equal(x.c.isOpen(),false);assert.deepEqual(x.events.at(-1),['leave',true]);x.forward();assert.equal(x.c.isOpen(),true);assert.deepEqual(x.events.at(-1),['enter',false]);assert.equal(x.entries.length,2)});
test('explicit return consumes only its own history slot and restores the prior context once',()=>{const x=setup();x.c.show();x.c.leave();x.c.leave();assert.equal(x.queued,1);assert.equal(x.c.isOpen(),false);x.back();assert.equal(x.events.filter(x=>x[0]==='leave').length,1);assert.equal(x.url,'/en')});
test('new destination navigation closes without restoring an unrelated previous scroll',()=>{const x=setup();x.c.show();x.c.leave(false);assert.deepEqual(x.events.at(-1),['leave',false]);x.back();assert.equal(x.c.isOpen(),false)});
test('close followed by immediate reopen waits for the queued back before claiming one fresh slot',()=>{const x=setup();x.c.show();x.c.leave();x.c.show();x.c.show();assert.equal(x.queued,1);x.back();assert.equal(x.c.isOpen(),true);assert.equal(x.url,'/en#recommendations');assert.equal(x.entries.length,2);assert.deepEqual(x.events.at(-1),['enter',false])});
test('direct entry and reload use the existing slot; return safely falls back to the same public route',()=>{for(const path of ['/zh','/en','/ja']){const x=setup(path+'#recommendations');x.c.start();assert.equal(x.c.isOpen(),true);assert.equal(x.entries.length,1);x.c.leave();assert.equal(x.queued,0);assert.equal(x.url,path);assert.deepEqual(x.history.state,{route:'home'})}});
test('Back dismisses an auth/source child first, then returns from recommendations',()=>{const x=setup();x.c.show();x.child();x.back();assert.equal(x.c.isOpen(),true);assert.equal(x.url,'/en#recommendations');assert.equal(x.events.some(x=>x[0]==='leave'),false);x.back();assert.equal(x.c.isOpen(),false)});
test('reader same-URL entries do not reopen recommendations or capture its scroll as the origin',()=>{const x=setup();x.c.show();x.history.pushState({...x.history.state,animeReader:{slot:'reader',owner:'reader'}},'',x.url);x.c.pop();x.back();assert.deepEqual(x.events,[['enter',true]]);assert.equal(x.c.isOpen(),true);x.back();assert.equal(x.c.isOpen(),false)});

const {createReaderHistory}=loadSourceModule('lib/reader-history.ts');
test('real reader and destination controllers close the nested detail before returning, in either listener order',()=>{
 for(const reverse of [false,true]){
  const entries=[{url:'/en',state:{route:'home'}}];let index=0,queued=0,detailClosed=0;const events=[];
  const history={get state(){return entries[index].state},pushState(state,title,url=entries[index].url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url=entries[index].url){entries[index]={url,state}},back(){queued++}};
  const location=()=>new URL(entries[index].url,'https://example.invalid');
  const destination=createRecommendationNavigation({history,location,token:'destination',enter:capture=>events.push(['enter',capture]),leave:restore=>events.push(['leave',restore]),dismissChild:()=>false});
  const reader=createReaderHistory({history,token:'reader',close:()=>detailClosed++,dismissChild:()=>false});
  const back=()=>{index--;queued=Math.max(0,queued-1);for(const controller of reverse?[reader,destination]:[destination,reader])controller.pop();destination.pop()};
  destination.show();reader.sync(true);assert.equal(entries.length,3);back();assert.equal(detailClosed,1);assert.equal(destination.isOpen(),true);assert.deepEqual(events,[['enter',true]]);back();assert.equal(destination.isOpen(),false);assert.deepEqual(events.at(-1),['leave',true]);assert.equal(detailClosed,1);
 }
});
test('explicit detail close consumes the reader slot, then recommendation return consumes its separate slot',()=>{
 const entries=[{url:'/ja',state:{route:'home'}}];let index=0,queued=0,closed=0;
 const history={get state(){return entries[index].state},pushState(state,title,url=entries[index].url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url=entries[index].url){entries[index]={url,state}},back(){queued++}};
 const destination=createRecommendationNavigation({history,location:()=>new URL(entries[index].url,'https://example.invalid'),token:'destination',enter(){},leave(){},dismissChild:()=>false});
 const reader=createReaderHistory({history,token:'reader',close:()=>closed++,dismissChild:()=>false});
 const pop=()=>{index--;queued--;destination.pop();reader.pop();destination.pop()};
 destination.show();reader.sync(true);reader.sync(false);assert.equal(queued,1);pop();assert.equal(destination.isOpen(),true);assert.equal(closed,0);destination.leave();assert.equal(queued,1);pop();assert.equal(entries[index].url,'/ja');assert.equal(destination.isOpen(),false);
});

test('destination hook tolerates denied session storage and restores scroll/focus on return',()=>{
 const prior={window:globalThis.window,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 let effect,open=false;const frames=new Map(),listeners=new Map(),restored=[],focus=[];let frameId=0;const history={state:{},pushState(state,title,url){this.state=state;window.location.hash=new URL(url,'https://example.invalid').hash},replaceState(){},back(){}};
 const opener={isConnected:true,focus:()=>focus.push('opener')};
 globalThis.window={history,location:{pathname:'/en',search:'',hash:''},scrollY:417,scrollTo(){},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 globalThis.document={activeElement:opener,getElementById:()=>({focus:()=>focus.push('title')}),querySelector:()=>opener};
 globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const react={useRef:value=>({current:value}),useState:()=>[open,value=>{open=value}],useEffect:fn=>{effect=fn}};
 const {useRecommendationDestination}=loadSourceModule('hooks/use-recommendation-destination.ts',{react});let cleanup;
 try{const hook=useRecommendationDestination({getReturnScroll(){throw Error('SecurityError')},restore:top=>restored.push(top),onLeave(){},dismissChild:()=>false});cleanup=effect();hook.show();assert.equal(open,true);for(const fn of frames.values())fn();frames.clear();hook.leave();for(const fn of frames.values())fn();assert.deepEqual(restored,[417]);assert.deepEqual(focus,['title','opener']);assert.equal(open,false)}finally{cleanup?.();Object.assign(globalThis,prior)}
});

test('an inert reader slot reached by Forward never replaces the next recommendation destination',()=>{
 const {createReaderHistory}=loadSourceModule('lib/reader-history.ts');
 for(const reverse of [false,true]){
  const entries=[{url:'/en',state:{route:'home'}}];let index=0,queued=0,closed=0;
  const history={get state(){return entries[index].state},pushState(state,title,url=entries[index].url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url=entries[index].url){entries[index]={url,state}},back(){queued++}};
  const destination=createRecommendationNavigation({history,location:()=>new URL(entries[index].url,'https://example.invalid'),token:'destination',enter(){},leave(){},dismissChild:()=>false});
  const reader=createReaderHistory({history,token:'reader',close:()=>closed++,dismissChild:()=>false});
  const pop=()=>{for(const c of reverse?[reader,destination]:[destination,reader])c.pop()};
  reader.sync(true);index--;pop();index++;pop();assert.equal(history.state.animeReader.owner,null);
  destination.show();assert.equal(history.state.animeReader,undefined);const destinationIndex=index;
  reader.sync(true);assert.equal(index,destinationIndex+1,'detail owns its own new slot');
  reader.sync(false);assert.equal(queued,1);index--;queued--;pop();assert.equal(destination.isOpen(),true);assert.equal(index,destinationIndex);assert.equal(closed,1);
  destination.leave();assert.equal(queued,1);index--;pop();assert.equal(destination.isOpen(),false);
 }
});

test('explicit recommendation Return skips the inert child slot reached by Forward exactly once',()=>{
 const {createReaderHistory}=loadSourceModule('lib/reader-history.ts');
 for(const reverse of [false,true]){
 const entries=[{url:'/ja',state:{route:'home'}}];let index=0,queued=0,closed=0,left=0;
 const history={get state(){return entries[index].state},pushState(state,title,url=entries[index].url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url=entries[index].url){entries[index]={url,state}},back(){queued++}};
 const destination=createRecommendationNavigation({history,location:()=>new URL(entries[index].url,'https://example.invalid'),token:'destination',enter(){},leave(){left++},dismissChild:()=>false});
 const reader=createReaderHistory({history,token:'reader',close:()=>closed++,dismissChild:()=>false});
 const pop=()=>{for(const c of reverse?[reader,destination]:[destination,reader])c.pop()};
 destination.show();reader.sync(true);index--;pop();index++;pop();assert.equal(history.state.animeReader.owner,null);
 destination.leave();assert.equal(queued,1);index--;queued--;pop();assert.equal(queued,1);assert.equal(destination.isOpen(),false);index--;queued--;pop();destination.pop();
 assert.equal(entries[index].url,'/ja');assert.equal(queued,0);assert.equal(destination.isOpen(),false);assert.equal(left,1);assert.equal(closed,1);
 }
});


test('immediate reopen during inert-child Return drains the old owner before one fresh destination',()=>{
 const entries=[{url:'/en',state:{route:'home'}},{url:'/en#recommendations',state:{animeRecommendations:'destination'}},{url:'/en#recommendations',state:{animeRecommendations:'destination',animeReader:{slot:'r',owner:null}}}];let index=2,queued=0;const captures=[];
 const history={get state(){return entries[index].state},pushState(state,title,url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url){entries[index]={url,state}},back(){queued++}};
 const c=createRecommendationNavigation({history,location:()=>new URL(entries[index].url,'https://example.invalid'),token:'destination',enter:capture=>captures.push(capture),leave(){},dismissChild:()=>false});c.start();c.leave();c.show();index--;queued--;c.pop();assert.equal(queued,1);index--;queued--;c.pop();assert.equal(entries.length,2);assert.equal(index,1);assert.equal(c.isOpen(),true);assert.deepEqual(captures,[true,false,false]);assert.equal(history.state.animeReader,undefined);
});


test('reload with an old destination token strips the inert reader on fallback return',()=>{
 const {createReaderHistory}=loadSourceModule('lib/reader-history.ts');const entries=[{url:'/en#recommendations',state:{animeRecommendations:'old'}},{url:'/en#recommendations',state:{animeRecommendations:'old',animeReader:{slot:'old-reader',owner:null}}}];let index=1,queued=0;
 const history={get state(){return entries[index].state},pushState(state,title,url=entries[index].url){entries.splice(++index);entries.push({url,state})},replaceState(state,title,url=entries[index].url){entries[index]={url,state}},back(){queued++}};
 const destination=createRecommendationNavigation({history,location:()=>new URL(entries[index].url,'https://example.invalid'),token:'new',enter(){},leave(){},dismissChild:()=>false});const reader=createReaderHistory({history,token:'new-reader',close(){},dismissChild:()=>false});
 destination.start();destination.leave();assert.equal(entries[index].url,'/en');assert.equal(history.state.animeReader,undefined);reader.sync(true);assert.equal(index,2);reader.sync(false);index--;queued--;destination.pop();reader.pop();assert.equal(entries[index].url,'/en');assert.equal(destination.isOpen(),false);assert.equal(queued,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.env.CATALOG_SOURCE_ROOT || process.env.GALLERY_REPOSITORY || process.cwd());
const require = createRequire(path.join(root, 'package.json'));
const React = require('react');
const {loadSourceModule} = await import(pathToFileURL(path.join(root, 'tests/component-test-loader.mjs')));
// Load browser-aware component libraries before this pure effect harness installs its minimal document stub.
loadSourceModule('components/anime-home.tsx');
// Expand only this hook-free presentation boundary; hooked descendants stay opaque.
const walk = (n, p) => Array.isArray(n) ? n.flatMap(x => walk(x, p)) : React.isValidElement(n) ? [...(p(n) ? [n] : []), ...walk(n.type?.name === 'LibraryAiringSections' ? n.type(n.props) : n.props.children, p), ...walk(n.props.trigger, p)] : [];
const byClass = (n, c) => walk(n, x => String(x.props.className || '').split(' ').includes(c))[0];
const title = {key: 'bgm:1', bgm: 1, name: 'Synthetic saved title', date: '2001-01-01', format: 'TV', image: 'https://example.invalid/synthetic-poster.jpg', summary: 'Synthetic saved-library fixture', tags: [], rating: {}, favorite: true, state: 'watching'};
function harness(options = {}) {
  const input = {...title, ...(options.anime || {})}, english = options.english || {1: {summary: title.summary}};
  const mutations = [];
  let slots = [], cursor = 0, dirty = false, effects = [], tree, firstCurrent = true, recommendationEffect;
  let state = {epoch: 1, identityEpoch: 1, status: 'ready', signedIn: true, context: 'a'.repeat(64), items: [input], ...options.session};
  const node = {scrollTop: 0, scrollHeight: 2200, getBoundingClientRect: () => ({top: 60}), querySelector(selector) {assert.equal(selector, '.detail-tabs'); return {getBoundingClientRect: () => ({top: 180})};}};
  const frames = new Map(); let next = 0;
  const old = {document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame};
  const opener = {isConnected: true, focusCalls: 0, focus() {this.focusCalls++;document.activeElement=this;}};
  globalThis.document = {activeElement: opener, querySelector(selector) {assert.equal(selector, '.anime-dialog .detail-scroll'); return node;}};
  globalThis.requestAnimationFrame = fn => {frames.set(++next, fn); return next;};
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const react = {...React,
    useRef(v) {const i = cursor++; return (slots[i] ??= {value: {current: v}}).value;},
    useState(v) {const i = cursor++; if (!slots[i]) {let value = typeof v === 'function' ? v() : v; if (value === 'current' && firstCurrent) {value = options.view || 'mine'; firstCurrent = false;} slots[i] = {value};} return [slots[i].value, n => {const value = typeof n === 'function' ? n(slots[i].value) : n; if (!Object.is(value, slots[i].value)) {slots[i].value = value; dirty = true;}}];},
    useMemo(fn) {cursor++; return fn();}, useCallback(fn) {cursor++; return fn;}, useLayoutEffect() {cursor++;},
    useEffect(fn, deps) {if(String(fn).includes('personalSession.current.select'))recommendationEffect=fn; const i = cursor++, old = slots[i], selected = /if \(!active\)|if\(!active\)|setPersonalRows\(\[\]\)|lastWatchSignals.current/.test(fn.toString()) || options.autoRecommendations && /personalSession.current.select|setSaving\(''\)/.test(fn.toString()); if (selected && (!old || deps.some((v, j) => v !== old.deps[j]))) effects.push(() => {old?.cleanup?.(); slots[i] = {deps, cleanup: fn()};});},
  };
  const i18n = loadSourceModule('lib/i18n.tsx');
  const Home = loadSourceModule('components/anime-home.tsx', {react,
    '@/hooks/use-recommendation-destination': {useRecommendationDestination: options => {const [open,setOpen]=react.useState(false),active=react.useRef(open);active.current=open;return {open,show(){active.current=true;setOpen(true)},leave(){active.current=false;options.onLeave();setOpen(false)},isOpen:()=>active.current,returnScroll:()=>0};}},
    '@/lib/i18n': {...i18n, useLocale: () => ({locale: options.locale || 'en', t: x => x, translateKnown: x => x, intlLocale: 'en-US'})},
    '@/components/theme-controls': {useTheme: () => ({resolved: 'light'}), ThemeToggle: () => null},
    '@/hooks/use-library-session': {useLibrarySession: () => ({...state, beginMutation: () => 42, finishMutation: (...args) => mutations.push(args), setWatch(update, epoch) {if (options.autoRecommendations && epoch === state.epoch) {state = {...state, items: typeof update === 'function' ? update(state.items) : update};dirty = true;}}, refresh() {}, isCurrent: epoch => epoch === state.epoch && state.status === 'ready', isIdentityCurrent: identity => identity === state.identityEpoch && state.status === 'ready'})},
    '@/hooks/use-historical-catalog': {useHistoricalCatalog: () => ({items: [], total: 0, nextOffset: 0, revision: '', sources: {}, loading: false, error: ''})},
  }).default;
  const h = {
    render(update = {}) {state = {...state, ...update}; let turns = 0; do {dirty = false; cursor = 0; effects = []; const entry = Home({initialLocale: 'en', initialSeed: {items: options.rows || [], discovery: options.discoveryRows || [], english, identityMeta: {}, spotlights: [], at: ''}}).props.children; tree = entry.type(entry.props); const scroller = byClass(tree, 'detail-scroll'); if (scroller) scroller.props.ref.current = node; for (const effect of effects) effect(); assert(++turns < 10);} while (dirty); return tree;},
    setLocale(locale) {options.locale=locale;this.render();},
    get tree() {return tree;}, mutations, node, opener,
    openRecommendations() {walk(tree,n=>n.type?.name==='GalleryChrome')[0].props.onRecommendations();this.render();},
    runRecommendationEffect() {assert.equal(typeof recommendationEffect,'function');return recommendationEffect();},
    flush() {for (const fn of frames.values()) fn(); frames.clear();},
    close() {for (const s of slots) s?.cleanup?.(); Object.assign(globalThis, old);},
  };
  h.render(); return h;
}

// Fictional fixtures only. The production-dependent detail tests are intentionally absent.
const nextTurn = () => new Promise(resolve => setImmediate(resolve));
const recommendationPicks = tree => walk(tree,n=>n.type?.name==='PersonalPicks');
const syntheticCandidate = id => ({key:`bgm:${id}`,bgm:id,name:`Synthetic public source ${id}`,date:'2001-01-01',format:'TV',image:'',summary:'Public fixture synopsis.',tags:[],rating:{},recommendationFamilyKeys:[`bgm:${id}`]});
function recommendationResponse(rows, discoveryItems=[]) {return {context:'a'.repeat(64),mode:'source-evidence',period:'historical',items:rows.map(row=>({bgm:row.bgm,evidence:[{code:'SHARED_SOURCE_TAGS',tags:['a','b'],seed:{id:title.key,title:title.name,favorite:true,state:'watching'}}]})),candidateItems:rows,discoveryItems,constraintsNote:'Source comparison returned no matches.'};}

test('confirmed recommendation Save keeps other candidates while refreshing; failed refresh preserves cards and Retry',async()=>{
 const a=syntheticCandidate(900001),b=syntheticCandidate(900002),sameFamily={...syntheticCandidate(900003),recommendationFamilyKeys:['bgm:900001','bgm:900003']};
 const oldFetch=globalThis.fetch,requests=[];let failRefresh;
 globalThis.fetch=async(url,options)=>{requests.push(url);if(url==='/api/watchlist')return Response.json({context:'a'.repeat(64),item:{...a,state:'want'}});if(requests.filter(x=>x==='/api/personal-recommendations').length===1)return Response.json(recommendationResponse([a,b,sameFamily]));return new Promise((resolve,reject)=>{failRefresh=reject});};
 const h=harness({view:'current',autoRecommendations:true});
 try{
  h.openRecommendations();await nextTurn();h.render();assert.equal(recommendationPicks(h.tree)[0].props.items.length,3);
  await recommendationPicks(h.tree)[0].props.onSave(a);h.render();
  const retained=recommendationPicks(h.tree)[0];assert(retained,'Save must not replace every remaining card with a skeleton');assert.deepEqual(retained.props.items.map(x=>x.key),[b.key],'Saved title and its known family leave immediately');assert.deepEqual(retained.props.results,[],'Old private matching evidence is hidden while the changed library is recomputed');assert(!byClass(h.tree,'recommendation-skeletons'));assert.equal(requests.filter(x=>x==='/api/personal-recommendations').length,2);
  failRefresh(Error('Synthetic refresh failure'));await nextTurn();h.render();assert.equal(recommendationPicks(h.tree)[0].props.items[0].key,b.key);assert(walk(h.tree,n=>n.props.role==='alert').length);assert(!byClass(h.tree,'recommendation-skeletons'));assert.equal(requests.filter(x=>x==='/api/personal-recommendations').length,2,'A settled failure does not create an automatic retry loop');
 }finally{h.close();globalThis.fetch=oldFetch;}
});

test('the final saved candidate produces an explicit empty state while the refresh is pending and after no results',async()=>{
 const a=syntheticCandidate(900001),oldFetch=globalThis.fetch;let count=0,finish;
 globalThis.fetch=async(url)=>url==='/api/watchlist'?Response.json({context:'a'.repeat(64),item:{...a,state:'want'}}):++count===1?Response.json(recommendationResponse([a])):new Promise(resolve=>{finish=resolve});
 const h=harness({view:'current',autoRecommendations:true});
 try{h.openRecommendations();await nextTurn();h.render();await recommendationPicks(h.tree)[0].props.onSave(a);h.render();assert.equal(recommendationPicks(h.tree).length,0);assert(byClass(h.tree,'recommendation-empty'),'The last saved item leaves an explicit empty message');assert(!byClass(h.tree,'recommendation-skeletons'));finish(Response.json(recommendationResponse([])));await nextTurn();h.render();assert(byClass(h.tree,'recommendation-empty'));}finally{h.close();globalThis.fetch=oldFetch;}
});


test('first Save from an empty signed-in list keeps public current-season discoveries honestly labeled',async()=>{
 const a=syntheticCandidate(900001),b=syntheticCandidate(900002),oldFetch=globalThis.fetch;let finish;
 globalThis.fetch=async(url)=>url==='/api/watchlist'?Response.json({context:'a'.repeat(64),item:{...a,state:'want'}}):new Promise(resolve=>{finish=resolve});
 const h=harness({view:'current',autoRecommendations:true,session:{items:[]},discoveryRows:[a,b]});
 try{h.openRecommendations();assert.equal(recommendationPicks(h.tree)[0].props.mode,'discovery');await recommendationPicks(h.tree)[0].props.onSave(a);h.render();assert.equal(recommendationPicks(h.tree)[0].props.mode,'discovery');assert.deepEqual(recommendationPicks(h.tree)[0].props.items.map(x=>x.key),[b.key]);assert(byClass(h.tree,'recommendation-retained-public'));assert(!byClass(h.tree,'recommendation-skeletons'));finish(Response.json(recommendationResponse([],[])));await nextTurn();h.render();assert.equal(recommendationPicks(h.tree).length,0);assert(byClass(h.tree,'recommendation-empty'));}finally{h.close();globalThis.fetch=oldFetch;}
});

for(const failure of ['network','timeout'])test(`pending and ${failure} Save keeps candidates and does not start a speculative refresh`,async()=>{
 const a=syntheticCandidate(900001),b=syntheticCandidate(900002),oldFetch=globalThis.fetch;let failSave,count=0;
 globalThis.fetch=async(url)=>url==='/api/watchlist'?new Promise((resolve,reject)=>{failSave=reject}):(count++,Response.json(recommendationResponse([a,b])));
 const h=harness({view:'current',autoRecommendations:true});
 try{h.openRecommendations();await nextTurn();h.render();const saving=recommendationPicks(h.tree)[0].props.onSave(a);h.render();assert.equal(recommendationPicks(h.tree)[0].props.items.length,2);assert.equal(recommendationPicks(h.tree)[0].props.savingKey,a.key);failSave(failure==='timeout'?new DOMException('Timed out','TimeoutError'):Error('Connection failed'));await saving;h.render();assert.equal(recommendationPicks(h.tree)[0].props.items.length,2);assert.equal(count,1);assert.deepEqual(h.mutations.at(-1),[42,true]);}finally{h.close();globalThis.fetch=oldFetch;}
});

test('a newer Save aborts the prior refresh and its late response cannot restore saved candidates',async()=>{
 const a=syntheticCandidate(900001),b=syntheticCandidate(900002),c=syntheticCandidate(900003),oldFetch=globalThis.fetch,refreshes=[];let calls=0;
 globalThis.fetch=async(url,options)=>{if(url==='/api/watchlist')return Response.json({context:'a'.repeat(64),item:{...JSON.parse(options.body).anime,state:'want'}});if(++calls===1)return Response.json(recommendationResponse([a,b,c]));return new Promise(resolve=>{refreshes.push({resolve,signal:options.signal})});};
 const h=harness({view:'current',autoRecommendations:true});
 try{h.openRecommendations();await nextTurn();h.render();await recommendationPicks(h.tree)[0].props.onSave(a);h.render();await recommendationPicks(h.tree)[0].props.onSave(b);h.render();assert.equal(refreshes.length,2);assert.equal(refreshes[0].signal.aborted,true);refreshes[0].resolve(Response.json(recommendationResponse([a,b,c])));await nextTurn();h.render();assert.deepEqual(recommendationPicks(h.tree)[0].props.items.map(x=>x.key),[c.key]);assert(byClass(h.tree,'recommendation-loading'),'The obsolete request cannot settle the newer request');refreshes[1].resolve(Response.json(recommendationResponse([c])));await nextTurn();h.render();assert.deepEqual(recommendationPicks(h.tree)[0].props.items.map(x=>x.key),[c.key]);assert(!byClass(h.tree,'recommendation-loading'));}finally{h.close();globalThis.fetch=oldFetch;}
});

for(const transition of ['favorite','state','checking','loading','error','guest','identity','context','locale','period'])test(`recommendation retention preserves the ${transition} boundary`,async()=>{
 const a=syntheticCandidate(900001),oldFetch=globalThis.fetch,pending=[];let calls=0;
 globalThis.fetch=async(url,options)=>++calls===1?Response.json(recommendationResponse([a])):new Promise(resolve=>{pending.push(resolve)});
 const h=harness({view:'current',autoRecommendations:true});
 try{h.openRecommendations();await nextTurn();h.render();assert(recommendationPicks(h.tree).length);
  if(transition==='favorite'||transition==='state')h.render({items:[{...title,...(transition==='favorite'?{favorite:false}:{state:'done'})}]});
  else if(transition==='identity')h.render({identityEpoch:2,epoch:2,context:'b'.repeat(64),items:[{...title,key:'bgm:8',bgm:8}]});
  else if(transition==='context')h.render({context:'b'.repeat(64)});
  else if(transition==='locale')h.setLocale('ja');
  else if(transition==='period'){walk(h.tree,n=>n.props.className==='personal-period')[0].props.onChange('current');h.render();}
  else h.render({status:transition,...(transition==='checking'?{}:{signedIn:false,context:null,items:[]})});
  const picks=recommendationPicks(h.tree);
  if(['favorite','state','checking'].includes(transition)){assert.equal(picks[0].props.items[0].key,a.key);if(transition==='checking')assert.equal(picks[0].props.readOnly,true);else assert.deepEqual(picks[0].props.results,[]);}
  else assert.equal(picks.length,0,'A previous private candidate cannot cross verification, account or request-scope boundaries');
  for(const resolve of pending)resolve(Response.json(recommendationResponse([])));await nextTurn();h.render();
  if(['identity','context','locale','period'].includes(transition))assert.equal(recommendationPicks(h.tree).length,0);
 }finally{h.close();globalThis.fetch=oldFetch;}
});

test('changing locale during a pending recommendation replaces the request instead of leaving an empty destination',async()=>{
 const oldFetch=globalThis.fetch,requests=[];
 globalThis.fetch=async(url,options)=>new Promise(resolve=>requests.push({resolve,signal:options.signal}));
 const h=harness({view:'current',autoRecommendations:true});
 try{h.openRecommendations();assert.equal(requests.length,1);h.setLocale('ja');assert.equal(requests.length,2,'A new request scope must replace the old in-flight controller');assert.equal(requests[0].signal.aborted,true);}finally{for(const r of requests)r.resolve(Response.json(recommendationResponse([])));await nextTurn();h.render();h.close();globalThis.fetch=oldFetch;}
});


test('removing the final library item retires private matches and leaves only labeled public discovery',async()=>{
 const a=syntheticCandidate(900001),b=syntheticCandidate(900002),oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>Response.json(recommendationResponse([a]));
 const h=harness({view:'current',autoRecommendations:true,discoveryRows:[b]});
 try{h.openRecommendations();await nextTurn();h.render();assert.equal(recommendationPicks(h.tree)[0].props.items[0].key,a.key);h.render({items:[]});const picks=recommendationPicks(h.tree);assert.equal(picks.length,1);assert.equal(picks[0].props.mode,'discovery');assert.deepEqual(picks[0].props.items.map(x=>x.key),[b.key]);assert.equal(picks[0].props.results,undefined);assert(!byClass(h.tree,'recommendation-loading'));}finally{h.close();globalThis.fetch=oldFetch;}
});

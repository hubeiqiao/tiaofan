import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSourceModule} from './component-test-loader.mjs';
const root=new URL('../',import.meta.url);
const json=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const noStorage={env:new Proxy({}, {get(){throw Error('Demo must not access runtime bindings')}})};
const load=path=>loadSourceModule(path,{'cloudflare:workers':noStorage});
const forged={ 'oai-authenticated-user-id':'attacker', 'oai-authenticated-user-email':'attacker@example.invalid',Authorization:'Bearer not-a-credential',Cookie:'session=attacker','content-type':'application/json'};

test('synthetic catalog has no real scores, provider mappings, reviews or playback claims',()=>{
 const metadata=json('data/metadata.json');assert.equal(metadata.meta.synthetic,true);assert.equal(Object.keys(metadata.items).length,6);
 for(const snapshot of json('data/source-snapshots.json').snapshots){const payload=JSON.parse(snapshot.payload);assert.equal(payload.synthetic,true);for(const row of Array.isArray(payload.items)?payload.items:[]){assert(row.bgm>=900000001&&row.bgm<=900000006);assert.match(row.name,/^示例/);assert.deepEqual(row.rating,{});assert.equal(row.image,'/demo-poster.svg');assert.equal(row.mal,undefined)}}
 for(const file of ['reviews','playback','watch-listings'])assert.deepEqual(json('data/'+file+'.json').items,{});
 assert.equal(json('data/watch-sources.json').sources.length,0);
});
test('authentication is unconditionally unavailable and identity headers cannot select an account',async()=>{
 const auth=load('app/chatgpt-auth.ts');assert.equal(await auth.getChatGPTUser(),null);await assert.rejects(auth.requireChatGPTUser('/'),/unavailable/);
 const session=await load('app/api/session/route.ts').GET(new Request('http://localhost/api/session',{headers:forged}));assert.deepEqual(await session.json(),{signedIn:false,authenticationAvailable:false,demo:true});
 const route=load('app/api/watchlist/route.ts');assert.equal((await route.GET()).status,401);assert.equal((await route.POST(new Request('http://localhost/api/watchlist',{method:'POST',headers:forged,body:JSON.stringify({userId:'attacker',key:'bgm:900000001'})}))).status,401);
});
test('private MCP ignores forged user identity and returns unauthorized before touching bindings',async()=>{
 const route=load('app/mcp/route.ts');const response=await route.POST(new Request('http://localhost/mcp',{method:'POST',headers:{...forged,'mcp-protocol-version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_my_watchlist',arguments:{}}})}));assert.equal(response.status,401);assert.equal((await response.json()).error.code,-32001);
});
test('snapshot persistence and AI routes remain disabled even with runtime secrets or bindings',async()=>{
 const snapshots=load('lib/snapshots.ts');assert.throws(()=>snapshots.snapshotDb(),/disabled/);await assert.rejects(snapshots.saveSnapshot('x',{},'https://example.invalid'),/disabled/);
 for(const path of ['app/api/recommend/route.ts','app/api/personal-recommendations/route.ts']){const route=load(path);for(const method of ['GET','POST']){const response=await route[method](new Request('http://localhost/api/recommend',{method,headers:forged}));assert.equal(response.status,503);assert.equal((await response.json()).configured,false)}}
});
test('poster resolution never emits third-party network requests',()=>{const {posterSources}=load('lib/poster-image.ts');for(const image of ['',undefined,'https://example.com/foreign.jpg','javascript:alert(1)'])assert.deepEqual(posterSources(image,900000001),['/demo-poster.svg'])});
test('production host identity and generated art are absent from executable app files',()=>{
 const files=['app/chatgpt-auth.ts','vite.config.ts','build/worker.ts','components/site-footer.tsx','lib/site-brand.ts'];
 for(const file of files){const text=readFileSync(new URL(file,root),'utf8');assert.doesNotMatch(text,/hubeiqiao|joe-hu|anime-compass|\.openai\/hosting|mockAuth|oai-authenticated-user-email/)}
});

test('demo UI has no dead platform sign-in links or misleading data licenses',()=>{const home=readFileSync(new URL('components/anime-home.tsx',root),'utf8'),document=readFileSync(new URL('lib/public-documents.tsx',root),'utf8');assert.doesNotMatch(home,/signin-with-chatgpt|Sign in to keep saved titles/);assert.doesNotMatch(document,/Bangumi CC BY-SA 3.0 · bangumi-data CC BY 4.0/)});

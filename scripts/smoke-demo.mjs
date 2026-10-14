import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:5173';
const forged={'oai-authenticated-user-id':'demo-forged-user','oai-authenticated-user-email':'forged@example.invalid',Authorization:'Bearer intentionally-invalid',Cookie:'session=forged'};
const request=(pathname,options={})=>fetch(new URL(pathname,base),{...options,signal:AbortSignal.timeout(30000)});
const results=[];
for(const path of ['/en','/zh','/ja','/en/ai','/en/anime/900000001','/en/anime/900000006']){
 const response=await request(path);assert.equal(response.status,200,path);const html=await response.text();assert.match(html,/Synthetic demo/,path);assert.doesNotMatch(html,/joe-hu\.chatgpt\.site|hubeiqiao\.com|\/author\/|\/social\//,path);results.push(path);
}
const current=new Date(),year=current.getUTCFullYear(),quarter=Math.floor(current.getUTCMonth()/3);
const catalog=await request(`/api/catalog?year=${year}&quarter=${quarter}`);assert.equal(catalog.status,200);const records=await catalog.json();assert.equal(records.synthetic,true);assert.equal(records.items.length,4);for(const item of records.items){assert(item.bgm>=900000001);assert.deepEqual(item.rating,{})}results.push('synthetic catalog');
for(const headers of [{},forged]){
 const session=await(await request('/api/session',{headers})).json();assert.equal(session.signedIn,false);assert.equal(session.authenticationAvailable,false);
 const list=await request('/api/watchlist',{headers});assert.equal(list.status,401);
 const save=await request('/api/watchlist',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({key:'bgm:900000001',userId:'demo-forged-user'})});assert.equal(save.status,401);
 const mcp=await request('/mcp',{method:'POST',headers:{...headers,'Content-Type':'application/json','mcp-protocol-version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_my_watchlist',arguments:{}}})});assert.equal(mcp.status,401);results.push(Object.keys(headers).length?'forged identity rejected':'anonymous private reads/writes rejected');
}
const publicMcp=await request('/mcp',{method:'POST',headers:{'Content-Type':'application/json','mcp-protocol-version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'search_anime',arguments:{period:'current',limit:10}}})});assert.equal(publicMcp.status,200);const publicData=await publicMcp.json();assert.equal(publicData.result.isError,false);assert(publicData.result.structuredContent.items.length>0);assert(publicData.result.structuredContent.items.every(row=>row.id.startsWith('bgm:90000000')));results.push('public MCP synthetic records');
for(const path of ['/api/recommend','/api/personal-recommendations']){const response=await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,503);assert.equal((await response.json()).configured,false)}results.push('AI routes unavailable');
const ratings=await(await request(`/api/ratings?year=${year}&quarter=${quarter}`)).json();assert.deepEqual(ratings.items,[]);assert.equal(ratings.demo,true);results.push('live ratings unavailable');
const status=await(await request('/api/update-status')).json();assert.equal(status.method,'synthetic_fixtures');assert.deepEqual(status.jobs,[]);results.push('no automated update claims');
const robots=await(await request('/robots.txt')).text();assert.match(robots,/Disallow: \//);results.push('crawler exclusion');
console.log(JSON.stringify({status:'PASS',base,checks:results},null,2));

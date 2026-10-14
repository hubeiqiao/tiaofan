import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {loadSourceModule} from './component-test-loader.mjs';
const language=loadSourceModule('lib/language-preference.ts'),brand=loadSourceModule('lib/site-brand.ts');
test('browser language quality, regional tags and unsupported fallback are deterministic',()=>{
 for(const [header,wanted]of [['zh-TW,ja;q=0.8,en;q=0.4','zh'],['ja-JP,en-US;q=0.9','ja'],['zh-Hant-HK;q=0.3,en-CA;q=0.8','en'],['en;q=0,ja;q=0.1','ja'],['zh;q=9,ja;q=-1,en;q=0','en'],['fr,de;q=0.5,*;q=1','en'],['ja;q=broken,zh;q=0.2','zh'],['ja;q=0.9,zh;q=0.9','ja'],['','en']])assert.equal(language.preferredLanguage(header),wanted,header);
});
test('only supported manual cookie wins; old manual localStorage remains higher priority than browser',()=>{
 assert.equal(language.chooseEntryLanguage('tiaofan-language=ja','en','zh-CN'),'ja');
 assert.equal(language.chooseEntryLanguage('tiaofan-language=invalid','zh','ja-JP'),'zh');
 assert.equal(language.chooseEntryLanguage(null,'en','zh-TW'),'en');
 assert.equal(language.chooseEntryLanguage(null,null,null,['ja-JP','en-US']),'ja');
 assert.equal(language.languageCookie('tiaofan-language=en-us'),null);
});
test('neutral root bootstrap preserves legacy choice, query/hash and migrates without choosing a new manual preference',()=>{
 for(const [cookie,legacy,header,navigatorLanguages,wanted,migrated]of [['','ja','zh-CN',['en-US'],'ja',true],['tiaofan-language=en','ja','zh-CN',['ja'],'en',false],['',null,'ja-JP',['en'],'ja',false],['',null,null,['zh-Hant-TW'],'zh',false],['',null,'fr',['ja'],'en',false],['tiaofan-language=ja=garbage','en','ja',['ja'],'en',true],['tiaofan-language=invalid; tiaofan-language=ja','en','ja',['ja'],'en',true],['tiaofan-language=en; tiaofan-language=ja','ja','ja',['ja'],'en',false]]){
  let target;const document={cookie};const context={document,localStorage:{getItem:()=>legacy},navigator:{languages:navigatorLanguages},location:{protocol:'https:',search:'?q=JOJO',hash:'#detail',replace:value=>{target=value}}};vm.runInNewContext(language.entryLanguageScript(header),context);
  assert.equal(target,'/'+wanted+'?q=JOJO#detail');assert.equal(document.cookie.includes('Max-Age'),migrated);
 }
});
test('explicit home locale paths and Chinese legacy deep links remain authoritative',()=>{
 for(const locale of ['zh','en','ja']){assert.equal(brand.localePath('/zh',locale),'/'+locale);assert.equal(brand.homeMetadata(locale).alternates.canonical,brand.SITE_ORIGIN+'/'+locale)}
 assert.equal(brand.localePath('/ja/anime/51','zh'),'/anime/51');assert.equal(brand.localeAlternates('/zh').languages['x-default'],brand.SITE_ORIGIN+'/');
 assert.equal(brand.localeAlternates('/en').languages['zh-Hans'],brand.SITE_ORIGIN+'/zh');assert.equal(language.languageEntryTarget('ja','?sort=bgm','#a'),'/ja?sort=bgm#a');
});
test('middleware varies only the root negotiation; explicit locale routes never follow preference cookie',()=>{
 const response=(location,status=200)=>({status,headers:new Headers(),location});const {middleware}=loadSourceModule('middleware.ts',{'next/server':{NextResponse:{next:()=>response(null),redirect:(url,status)=>response(String(url),status)}}});
 for(const path of ['/en','/ja','/zh','/anime/51','/season/2026/autumn']){const r=middleware(new Request('https://example.invalid'+path,{headers:{cookie:'tiaofan-language=en','accept-language':'ja'}}));assert.equal(r.status,200);assert.equal(r.location,null)}
 const r=middleware(new Request('https://example.invalid/?q=JOJO',{headers:{cookie:'tiaofan-language=ja'}}));assert.equal(r.status,307);assert.equal(r.location,'https://example.invalid/ja?q=JOJO');assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('vary'),/Cookie, Accept-Language/);
 const legacy=middleware(new Request('https://example.invalid/',{headers:{'accept-language':'en'}}));assert.equal(legacy.status,200);assert.match(legacy.headers.get('cache-control'),/no-store/);
});

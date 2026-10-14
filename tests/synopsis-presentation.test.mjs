import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {loadSourceModule} from './component-test-loader.mjs';
const api=fs.existsSync('lib/synopsis-presentation.ts')?loadSourceModule('lib/synopsis-presentation.ts'):{};
test('missing-source placeholders are omitted from compact content in all languages',()=>{
 assert.equal(typeof api.genuineSynopsis,'function');
 for(const value of ['',null,'This catalogue snapshot does not include a synopsis. See the linked source for details.','このカタログの取得時点の情報には、あらすじが含まれていません。','剧情简介尚未收录。可打开官方页面了解故事，再决定是否加入想看。','来源尚未提供具体剧情简介。'])assert.equal(api.genuineSynopsis(value),'');
});
test('genuine synopsis text is retained while markup is removed',()=>{
 assert.equal(typeof api.genuineSynopsis,'function');
 for(const value of ['A young musician returns home.','少年は故郷へ帰る。','少年重返故乡。'])assert.equal(api.genuineSynopsis('<p>'+value+'</p>'),value);
 assert.equal(api.genuineSynopsis('No one remembers the old town.'),'No one remembers the old town.');
});
test('reading fallback is short and localised, never a save instruction',()=>{
 assert.equal(typeof api.readingSynopsis,'function');
 for(const [locale,expected] of [['en','Synopsis not available yet.'],['zh','暂无剧情简介。'],['ja','あらすじは未掲載です。']]){assert.equal(api.readingSynopsis('',locale),expected);assert.equal(api.readingSynopsis('A real story.',locale),'A real story.');}
});
test('existing localized-content missing and pending messages never become story previews',()=>{
 for(const [locale,values] of [['en',['An English synopsis is not yet available. Refer to the linked original source.','Loading English synopsis…']],['ja',['日本語のあらすじはまだありません。リンク先の出典をご確認ください。','日本語のあらすじを読み込み中…']]])for(const value of values){assert.equal(api.genuineSynopsis(value),'');assert.equal(api.readingSynopsis(value,locale),locale==='en'?'Synopsis not available yet.':'あらすじは未掲載です。');}
});

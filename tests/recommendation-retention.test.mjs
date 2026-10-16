import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSourceModule} from './component-test-loader.mjs';
const {remainingRecommendations}=loadSourceModule('lib/recommendation-retention.ts');
const row=(key,extra={})=>({key,name:key,...extra});
test('retention excludes exact source aliases and every projected family member, without changing order or payloads',()=>{
 const a=row('bgm:101',{bgm:101,mal:501,kitsuId:'601'}),b=row('bgm:102',{bgm:102,recommendationFamilyKeys:['bgm:102','bgm:103','mal:503','kitsu:603']}),c=row('bgm:104',{bgm:104,name:'same text is not identity'});
 for(const saved of [row('bgm:103'),row('mal:503'),row('kitsu:603')]){const rows=[a,b,c],before=JSON.stringify(rows);assert.deepEqual(remainingRecommendations(rows,[saved]),[a,c]);assert.equal(JSON.stringify(rows),before);}
 for(const saved of [row('bgm:101'),row('mal:501'),row('kitsu:601')])assert.deepEqual(remainingRecommendations([a,b,c],[saved]),[b,c]);
 assert.deepEqual(remainingRecommendations([a,b,c],[row('bgm:999',{name:c.name})]),[a,b,c],'Title similarity never invents a family');
 assert.deepEqual(remainingRecommendations([a,b,c],[a,b,c]),[]);
});
test('desktop utilities anchor themselves while mobile keeps its explicit grid cell',()=>{
 const css=readFileSync(new URL('../app/gallery-shell.css',import.meta.url),'utf8');
 assert.match(css,/\.gallery-header-utilities\{display:flex;[^}]*margin-left:auto;[^}]*flex:none\}/);
 assert.match(css,/@media\(max-width:700px\)\{[\s\S]*?\.gallery-header-utilities\{grid-column:3;grid-row:1;gap:4px;margin-left:0\}/);
 assert.match(css,/@media\(min-width:701px\) and \(max-width:1000px\)\{[^\n]*\.gallery-header-utilities\{margin-left:auto\}/);
});

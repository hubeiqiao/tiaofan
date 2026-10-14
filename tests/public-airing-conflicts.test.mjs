import test from 'node:test';import assert from 'node:assert/strict';
import {publicAiringConflict} from '../lib/public-airing-conflicts.mjs';
const row={bgm:900000001,key:'bgm:900000001',end:'2020-01-01T00:00:00Z'};
const proof={bgm:row.bgm,disputedEnd:row.end,observedAt:'2020-02-01T00:00:00Z',sourceUrl:'https://example.invalid/fixture',publishedAt:'2020-02-01',title:'Synthetic test receipt'};
test('no external conflict evidence is bundled by default',()=>assert.equal(publicAiringConflict(row,Date.now()),null));
test('only matching identity, disputed value and observed date use an explicit receipt',()=>{assert.equal(publicAiringConflict(row,Date.now(),[proof]),proof);assert.equal(publicAiringConflict({...row,bgm:2},Date.now(),[proof]),null);assert.equal(publicAiringConflict({...row,end:'2020-01-02'},Date.now(),[proof]),null);assert.equal(publicAiringConflict(row,0,[proof]),null)});

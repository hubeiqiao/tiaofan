import test from 'node:test';
import assert from 'node:assert/strict';
import {queryHistoricalRegistry,compactRegistryCandidates} from '../lib/historical-registry.mjs';
import {loadSourceModule} from './component-test-loader.mjs';
const index=loadSourceModule('data/historical-registry-runtime.ts').default;
test('demo history is fictional and has no verified archive eligibility',()=>{const result=queryHistoricalRegistry(index,{limit:24});assert.equal(result.items.length,1);assert.equal(result.items[0].bgm,900000006);assert.equal(result.items[0].archiveEligible,false);assert.deepEqual(result.items[0].ratings,{});assert.equal(compactRegistryCandidates(index).length,0)});
test('history input validation and revision isolation are retained',()=>{assert.throws(()=>queryHistoricalRegistry(index,{limit:51}));assert.throws(()=>queryHistoricalRegistry(index,{offset:-1}));assert.throws(()=>queryHistoricalRegistry(index,{cursor:{revision:'wrong',afterId:1}}),/REGISTRY_VERSION_CHANGED/);assert.equal(queryHistoricalRegistry(index,{q:'not present'}).total,0)});

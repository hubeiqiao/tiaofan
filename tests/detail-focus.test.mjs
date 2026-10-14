import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
const {restoreDetailFocus}=loadSourceModule('lib/detail-focus.ts');
function scenario(run){
 const old=globalThis.document,calls=[];
 const node=(name,overrides={})=>({name,isConnected:true,tabIndex:0,hasAttribute:()=>false,closest:()=>null,getClientRects:()=>[{}],focus(options){calls.push([name,options]);document.activeElement=this},...overrides});
 const opener=node('poster'),first=node('source'),last=node('close'),middle=node('save'),hidden=node('hidden',{getClientRects:()=>[]}),disabled=node('disabled',{hasAttribute:()=>true}),fallback=node('search');
 globalThis.document={activeElement:first,querySelector:selector=>{assert(['.gallery-search input','.gallery-library-entry'].includes(selector));return fallback}};
 const event=(extra={})=>({key:'Tab',altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,defaultPrevented:false,currentTarget:{querySelectorAll:()=>[first,hidden,middle,disabled,last]},preventDefault(){this.defaultPrevented=true},...extra});
 try{run({opener,first,last,middle,calls,event,fallback})}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old}
}
test('closing restores the connected opener without page scrolling',()=>scenario(s=>{
 assert.equal(restoreDetailFocus(s.opener),true);assert.equal(document.activeElement,s.opener);assert.deepEqual(s.calls,[['poster',{preventScroll:true}]]);
}));
test('a removed opener restores a connected catalog control without page scrolling',()=>scenario(s=>{
 restoreDetailFocus({...s.opener,isConnected:false});assert.deepEqual(s.calls,[['search',{preventScroll:true}]]);
}));

test('a connected but no-op, disabled or pane-local opener uses a durable catalog fallback',()=>scenario(s=>{
 for(const opener of [{...s.opener,focus(){}},{...s.opener,hasAttribute:()=>true},{...s.opener,closest:()=>({})}]){
  document.activeElement=s.last;assert.equal(restoreDetailFocus(opener),true);assert.equal(document.activeElement,s.fallback);
 }
 assert.deepEqual(s.calls.map(x=>x[0]),['search','search','search']);
}));

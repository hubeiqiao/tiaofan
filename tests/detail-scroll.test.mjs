import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
const {createDetailScrollCoordinator}=loadSourceModule('lib/detail-scroll.ts');
function harness(){
 let viewport='1559:900',readable=true,node,serial=0;const frames=new Map(),position={current:{top:0,height:0}};
 function make(max=493,width=500){let top=0;return{isConnected:true,clientWidth:width,clientHeight:679,get scrollHeight(){return this.clientHeight+max},get scrollTop(){return top},set scrollTop(value){top=Math.min(Math.max(0,value),max)},setMax(value){max=value;top=Math.min(top,max)}}}
 node=make();const coordinator=createDetailScrollCoordinator(position,{getNode:()=>node,canRead:()=>readable,viewport:()=>viewport,requestFrame:fn=>{frames.set(++serial,fn);return serial},cancelFrame:id=>frames.delete(id)});
 const h={coordinator,position,frames,make,get node(){return node},set node(value){node=value},set viewport(value){viewport=value},set readable(value){readable=value},tick(){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn()},settle(){let count=0;while(frames.size){h.tick();assert(++count<12)}}};
 coordinator.restore();h.settle();node.scrollTop=493;coordinator.record(node);assert.equal(position.current.top,493);return h;
}
test('native493→398→266 intermediate clamps never replace the desired reading offset',()=>{
 const h=harness(),old=h.node;h.viewport='390:844';old.setMax(398);h.coordinator.record(old);h.tick();assert.equal(h.position.current.top,493);
 old.isConnected=false;h.node=h.make(266,390);h.coordinator.record(old);h.tick();assert.equal(h.position.current.top,493);
 h.node.setMax(646);h.settle();assert.equal(h.node.scrollTop,493);assert.equal(h.position.current.top,493);
 h.viewport='1559:900';h.node=h.make(493,500);h.coordinator.restore();h.settle();assert.equal(h.node.scrollTop,493);assert.equal(h.position.current.top,493);
});
test('a genuinely shorter layout clamps only the DOM assignment and later recovers the intended offset',()=>{
 const h=harness();h.viewport='390:844';h.node.setMax(200);h.coordinator.restore();h.settle();assert.equal(h.node.scrollTop,200);h.coordinator.record(h.node);assert.equal(h.position.current.top,493);
 h.viewport='1559:900';h.node.setMax(700);h.coordinator.restore();h.settle();assert.equal(h.node.scrollTop,493);
});
test('genuine user scrolling cancels pending restoration and becomes authoritative',()=>{
 const h=harness();h.coordinator.restore();h.node.scrollTop=120;h.coordinator.accept(h.node);h.settle();assert.equal(h.position.current.top,120);assert.equal(h.node.scrollTop,120);
 h.node.scrollTop=160;h.coordinator.record(h.node);assert.equal(h.position.current.top,160);
});
test('rapid reversal and late callbacks cannot apply a stale target after reset',()=>{
 const h=harness();h.coordinator.restore();const stale=[...h.frames.values()];h.coordinator.reset();h.node.scrollTop=0;for(const fn of stale)fn();assert.equal(h.node.scrollTop,0);assert.equal(h.position.current.top,0);
 h.coordinator.restore();h.settle();h.node.scrollTop=80;h.coordinator.record(h.node);assert.equal(h.position.current.top,80);
});
test('masked and detached nodes never overwrite readable height or reading intent',()=>{
 const h=harness(),saved={...h.position.current},old=h.node;h.coordinator.restore();h.readable=false;h.node=h.make(3000);old.isConnected=false;h.coordinator.record(old);h.coordinator.record(h.node);h.settle();assert.deepEqual(h.position.current,saved);
 h.readable=true;h.node=h.make();h.coordinator.restore();h.settle();assert.equal(h.node.scrollTop,493);
});
test('settled geometry changes request a restore without treating browser anchoring as user intent',()=>{
 const h=harness();h.node.setMax(100);h.coordinator.record(h.node);assert.equal(h.position.current.top,493);h.node.setMax(700);h.settle();assert.equal(h.node.scrollTop,493);assert.equal(h.coordinator.geometryChanged(),false);
 h.node.clientWidth=480;assert.equal(h.coordinator.geometryChanged(),true);
});
test('an input that produces no scroll does not consume a retained clamped intent',()=>{
 const h=harness();h.viewport='390:844';h.node.setMax(200);h.coordinator.restore();h.settle();h.coordinator.startInput(h.node);h.coordinator.record(h.node);assert.equal(h.position.current.top,493);
 h.viewport='1559:900';h.node.setMax(700);h.coordinator.restore();h.settle();assert.equal(h.node.scrollTop,493);
 h.coordinator.startInput(h.node);h.node.scrollTop=120;h.coordinator.record(h.node);assert.equal(h.position.current.top,120);
});

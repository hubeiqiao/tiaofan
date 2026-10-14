import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSourceModule} from './component-test-loader.mjs';
const {createScrollRestorationCoordinator}=loadSourceModule('lib/scroll-restoration.ts');
function setup(){
 let id=0,allowed=true;const frames=new Map(),applied=[];
 const coordinator=createScrollRestorationCoordinator({requestFrame(fn){frames.set(++id,fn);return id},cancelFrame(id){frames.delete(id)},scrollTo(top){if(!allowed)return false;applied.push(top)}});
 return{coordinator,applied,frames,set allowed(value){allowed=value},flush(){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn()}};
}
test('effect cleanup cancels a frame without losing the target; rerender restores exactly once',()=>{
 const s=setup();s.coordinator.setTarget(2300);const cleanup=s.coordinator.restoreWhen(true);cleanup();assert.equal(s.coordinator.pendingTarget(),2300);assert.equal(s.frames.size,0);
 s.coordinator.restoreWhen(true);s.flush();assert.deepEqual(s.applied,[2300]);assert.equal(s.coordinator.isPending(),false);s.coordinator.restoreWhen(true);s.flush();assert.deepEqual(s.applied,[2300]);
});
test('persistence keeps the desired scroll while content is loading or a frame is pending',()=>{
 const s=setup();s.coordinator.setTarget(2300);s.coordinator.restoreWhen(false);assert.equal(s.coordinator.persistedScroll(0),2300);assert.equal(s.frames.size,0);
 s.coordinator.restoreWhen(true);assert.equal(s.coordinator.persistedScroll(500),2300);s.flush();assert.equal(s.coordinator.persistedScroll(2400),2400);
});
test('new target replaces pending frame; old effect cleanup cannot cancel the new frame',()=>{
 const s=setup();s.coordinator.setTarget(2300);const oldCleanup=s.coordinator.restoreWhen(true);s.coordinator.setTarget(4000);s.coordinator.restoreWhen(true);oldCleanup();s.flush();assert.deepEqual(s.applied,[4000]);
});
test('a clamped scroll retains the target for a later content-ready effect',()=>{
 const s=setup();s.coordinator.setTarget(4000);s.allowed=false;s.coordinator.restoreWhen(true);s.flush();assert.equal(s.coordinator.pendingTarget(),4000);assert.equal(s.coordinator.persistedScroll(10),4000);
 s.allowed=true;s.coordinator.restoreWhen(true);s.flush();assert.deepEqual(s.applied,[4000]);assert.equal(s.coordinator.isPending(),false);
});
test('explicit cancellation for navigation or changed identity discards the old target',()=>{
 const s=setup();s.coordinator.setTarget(4000);s.coordinator.restoreWhen(true);s.coordinator.cancel();s.flush();assert.deepEqual(s.applied,[]);assert.equal(s.coordinator.isPending(),false);assert.equal(s.coordinator.persistedScroll(10),10);
});
test('a stale callback delivered despite cancellation cannot apply an obsolete target',()=>{
 const s=setup();s.coordinator.setTarget(4000);s.coordinator.restoreWhen(true);const stale=[...s.frames.values()][0];s.coordinator.setTarget(2000);stale();assert.deepEqual(s.applied,[]);assert.equal(s.coordinator.pendingTarget(),2000);
});

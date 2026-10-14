import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadSourceModule} from './component-test-loader.mjs';
const {createReaderSwipe}=loadSourceModule('lib/reader-swipe.ts');
function setup(){let closed=0;return {c:createReaderSwipe(()=>closed++),get closed(){return closed}}}
test('intentional single-finger right swipe closes once on the mobile title strip',()=>{const x=setup();x.c.begin(75,80,100,390,1,true);x.c.move(140,84,1);assert.equal(x.c.end(190,87,500,0),true);x.c.end(200,87,550,0);assert.equal(x.closed,1)});
test('screen edges, desktop, interactive controls and multitouch never claim a swipe',()=>{for(const args of [[8,80,100,390,1,true],[382,80,100,390,1,true],[75,80,100,900,1,true],[75,80,100,390,1,false],[75,80,100,390,2,true]]){const x=setup();x.c.begin(...args);assert.equal(x.c.end(220,80,300,0),false);assert.equal(x.closed,0)}});
test('vertical scrolling, left swipe, slow drag, cancellation, short drag and pinch are inert',()=>{for(const kind of ['vertical','left','slow','cancel','short','pinch','diagonal']){const x=setup();x.c.begin(75,80,100,390,1,true);if(kind==='vertical')x.c.move(78,120,1);if(kind==='left')x.c.move(55,80,1);if(kind==='cancel')x.c.cancel();if(kind==='pinch')x.c.move(90,80,2);assert.equal(x.c.end(kind==='short'?110:200,kind==='diagonal'?125:80,kind==='slow'?1000:300,0),false,kind);assert.equal(x.closed,0)}});
test('gesture hook has no browser interception and is attached only to the title bar',()=>{const hook=fs.readFileSync('hooks/use-reader-swipe.ts','utf8'),home=fs.readFileSync('components/anime-home.tsx','utf8');assert.doesNotMatch(hook,/preventDefault|stopPropagation|setPointerCapture|addEventListener/);assert.match(home,/<div className="detail-sheet-bar" \{\.\.\.readerSwipe\}>/);assert.match(home,/useReaderSwipe\(!!selection&&!loginOpen&&!infoOpen&&!shareOpen/)});
test('reading scroll containment is vertical only; horizontal cards retain their own behavior',()=>{for(const file of ['app/mobile.css','app/gallery-surfaces.css']){const css=fs.readFileSync(file,'utf8'),rule=css.match(/(?:\.anime-dialog )?\.detail-scroll\s*\{([^}]+)\}/)?.[1];assert.match(rule,/overscroll-behavior-x:\s*auto/);assert.match(rule,/overscroll-behavior-y:\s*contain/);assert.doesNotMatch(rule,/overscroll-behavior:\s*contain/)}});

test('reversal and text selection cancel the actual touch hook; handler events remain unprevented',()=>{
 const previous=globalThis.window;let selection='',closed=0;globalThis.window={innerWidth:390,getSelection:()=>({toString:()=>selection})};
 const react={useRef:value=>({current:value}),useEffect:fn=>fn()};
 const {useReaderSwipe}=loadSourceModule('hooks/use-reader-swipe.ts',{react});
 try{const h=useReaderSwipe(true,()=>closed++);const e=(x,type='move')=>({target:{closest:()=>false},touches:type==='end'?[]:[{clientX:x,clientY:75}],changedTouches:[{clientX:x,clientY:75}],timeStamp:type==='end'?400:100,preventDefault(){throw Error('Never intercept native input')}});
 h.onTouchStart(e(90));h.onTouchMove(e(150));h.onTouchMove(e(120));h.onTouchEnd(e(210,'end'));assert.equal(closed,0);
 h.onTouchStart(e(90));selection='Selected title';h.onTouchEnd(e(210,'end'));assert.equal(closed,0);selection='';
 h.onTouchStart(e(90));h.onTouchMove(e(150));h.onTouchEnd(e(210,'end'));assert.equal(closed,1);
 }finally{globalThis.window=previous}
});

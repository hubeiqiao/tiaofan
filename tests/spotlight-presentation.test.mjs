import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
const source=fs.readFileSync('components/anime-home.tsx','utf8');
const section=source.slice(source.indexOf('{showSpotlights&&<section id="gallery-spotlights"'),source.indexOf('{showSpotlights&&<section id="gallery-spotlights"')+7000).split('</section>')[0];
test('Worth a look uses the shared bounded poster fallback and keeps exact content and dated evidence',()=>{
 assert.match(section,/<AnimePoster image=\{s.image\} bgm=\{s.bgm\}/);
 assert.doesNotMatch(section,/<img\b/);
 for(const field of ['s.title','s.text','s.sourceAt','s.reviewAt','s.sourceUrl','openSpotlight(s.bgm)'])assert(section.includes(field),field);
 assert.match(source,/visibleSpotlights\(spotlights,watch,libraryStatus,items,cache.current\)/);
});
test('Worth a look captions and quiet actions have readable owned geometry',()=>{
 const css=postcss.parse(fs.readFileSync('app/gallery-shell.css','utf8'));
 const declarations=selector=>{const out={};css.walkRules(rule=>{if(rule.selectors.includes(selector))rule.walkDecls(d=>out[d.prop]=d.value)});return out};
 const title=declarations('.reference-app .spotlight-card h3');assert(parseFloat(title['font-size'])>=17);assert(parseFloat(title['font-weight'])>=600);
 const date=declarations('.reference-app .spotlight-card footer small');assert(parseFloat(date['font-size'])>=12);
 for(const selector of ['.reference-app .spotlight-card footer button','.reference-app .spotlight-card footer a']){const d=declarations(selector);assert.equal(d.display,'inline-flex');assert.equal(d['align-items'],'center');assert(parseFloat(d['min-height'])>=44);assert.equal(d['white-space'],'nowrap');}
 const art=declarations('.reference-app .spotlight-art');assert.equal(art['flex-shrink'],'0');assert.equal(art.overflow,'hidden');
});
test('recommendation destination keeps one compact heading, guarded refresh and cards before its method disclosure',()=>{
 const block=source.slice(source.indexOf('id="recommendation-destination"')).split('</section>')[0];
 assert.match(block,/<header className="recommendation-toolbar"><h1 id="recommendation-title"/);
 assert.equal((block.match(/<h1\b/g)||[]).length,1);
 assert.doesNotMatch(block,/personal-prompt|personalResult\.profileSummary\?\.seedTitles|Your next chapter|Match score, not a community rating/);
 assert.match(block,/canReadLibrary&&watch\.length>0&&<div className="recommendation-controls">/);
 assert.match(block,/<Button variant="secondary" aria-label=\{[^}]+\} onClick=\{\(\)=>void personalRecommend\(true\)\} disabled=\{personalBusy\|\|libraryStatus!=='ready'\}/);
 assert.match(block,/aria-label=\{locale==='ja'\?'おすすめを更新':locale==='en'\?'Refresh recommendations':'刷新推荐'\}/);
 assert.match(block,/locale==='en'\?'Refresh':'刷新推荐'/);
 assert.match(block,/paused=\{!canReadLibrary\} readOnly=\{libraryStatus!=='ready'\}/);
 assert.match(block,/items=\{remainingPersonal\.map\(project\)\} results=\{currentPersonalEvidence\?personalResult\.items\|\|\[\]:\[\]\}/,'Library changes retain only filtered stories and suppress stale private matching evidence');
 assert.match(source,/const personalVisible=canReadLibrary&&watch\.length>0&&personalEpoch===libraryIdentityEpoch&&personalResultBoundary\.current===recommendationBoundary/);
 assert.match(block,/<PersonalPicks mode="discovery"/);
 assert.match(block,/readOnly=\{libraryStatus!=='ready'&&libraryStatus!=='guest'\} onDetail=\{a=>openDetail\(a,'story','public'\)\} onSave=\{a=>save\(a\)\}/);
 assert.match(block,/recommendation-loading" role="status"/);assert.match(block,/recommendation-skeletons" aria-hidden="true"/);
 const method=block.indexOf('<details className="recommendation-method system-disclosure">');
 assert(method>block.lastIndexOf('<PersonalPicks'),'Optional method and privacy details stay below the actual cards');
 assert.match(block,/Saved or finished does not mean liked/);assert.match(block,/private notes/);
 const css=postcss.parse(fs.readFileSync('app/gallery-shell.css','utf8'));
 const declarations=selector=>{const out={};css.walkRules(rule=>{if(rule.selectors.includes(selector))rule.walkDecls(d=>out[d.prop]=d.value)});return out};
 const toolbar=declarations('.recommendation-destination .recommendation-toolbar');assert.equal(toolbar.display,'flex');assert.equal(toolbar['flex-wrap'],'wrap');
 const controls=declarations('.recommendation-destination .recommendation-controls');assert.equal(controls.display,'grid');assert.equal(controls['grid-template-columns'],'minmax(0,1fr) minmax(0,1fr)');assert.equal(controls.width,'100%');
 const targets=declarations('.recommendation-destination .recommendation-controls :is(button,.select__trigger)');assert(parseFloat(targets['min-height'])>=44);
});

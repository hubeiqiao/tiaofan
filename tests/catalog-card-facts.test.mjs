import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const stagedRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = process.env.CATALOG_SOURCE_ROOT || stagedRoot;
const require = createRequire(path.join(sourceRoot, 'package.json'));
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const postcss = require('postcss');
const {loadSourceModule} = await import(pathToFileURL(path.join(sourceRoot, 'tests/component-test-loader.mjs')));
const {CatalogCardFacts, catalogCardFacts, catalogPremiereYear} = loadSourceModule(
  path.join(sourceRoot, 'components/catalog-card-facts.tsx'),
  {'react/jsx-runtime': require('react/jsx-runtime')},
);
const anime = {key: 'bgm:1', bgm: 1, name: 'A source title', image: '', summary: '', tags: ['Popular', 'Currently airing'], date: '2026-10-01', format: 'TV', episodes: 12, rating: {}};
const facts = (patch = {}, locale = 'en', formatLabel) => catalogCardFacts({anime: {...anime, ...patch}, locale, formatLabel});

test('known facts keep format, listed episode count, and source premiere year order in all locales', () => {
  for (const [locale, labels] of [['zh', ['电视动画', '12集', '2026']], ['en', ['TV anime', '12 eps', '2026']], ['ja', ['TVアニメ', '12話', '2026']]]) {
    assert.deepEqual(facts({}, locale).map(f => f.kind), ['format', 'episodes', 'year']);
    assert.deepEqual(facts({}, locale).map(f => f.label), labels);
    const html = renderToStaticMarkup(React.createElement(CatalogCardFacts, {anime, locale}));
    assert.match(html, /class="catalog-card-facts"/);
    assert.equal((html.match(/class="catalog-fact-description sr-only"/g) || []).length, 2);
    assert.doesNotMatch(html, /<span[^>]+aria-label=/);
    assert.equal((html.match(/class="catalog-fact-separator" aria-hidden="true"/g) || []).length, 2);
    assert.doesNotMatch(html, /Popular|Currently airing|完结|完結|全12|completed|broadcast|<button|<a\b/i);
  }
  assert.equal(facts({episodes: 1})[1].label, '1 ep');
  assert.equal(facts({episodes: 1200})[1].label, '1,200 eps');
});

test('optional caller localization applies only to a recognized source format', () => {
  assert.equal(facts({}, 'en', 'TV series')[0].label, 'TV series');
  assert.equal(facts({format: ' ona '}, 'ja')[0].label, 'Webアニメ');
  assert.equal(facts({format: 'MOVIE'}, 'zh')[0].label, '剧场版');
  assert.equal(facts({format: 'TV'}, 'en', '   ')[0].label, 'TV anime');
  for (const format of ['', 'other', 'Unknown', 'Currently airing', 'constructor', '__proto__', null]) {
    assert.equal(facts({format}, 'en', 'Raw fallback claim').some(f => f.kind === 'format'), false, String(format));
  }
});

test('episode totals require exact positive safe integers and never infer viewing progress', () => {
  for (const episodes of [undefined, null, 0, -1, 12.5, NaN, Infinity, '12', Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(facts({episodes}).some(f => f.kind === 'episodes'), false, String(episodes));
  }
  const result = facts({episodes: 12, end: '2026-01-01', state: 'done', otherStatus: 'airing'});
  assert.equal(result[1].description, 'Listed episodes: 12');
  assert.deepEqual(result, facts());
});

test('year extraction respects known source precision and rejects malformed calendar dates', () => {
  for (const value of ['2026', '2026-10', '2026-10-01', '2026-Q4', '2026-q1', ' 2026-10-01 ']) assert.equal(catalogPremiereYear(value), '2026', value);
  assert.equal(catalogPremiereYear('2024-02-29'), '2024');
  for (const value of ['', null, undefined, 2026, '0000', '2026-00', '2026-13', '2026-02-29', '2026-04-31', '2026-10-00', '2026-10-32', '2026-Q5', '2026-unconfirmed', 'Expected 2026', '2026-1-1', '2026-10-01junk']) assert.equal(catalogPremiereYear(value), null, String(value));
});

test('a wholly unknown record has no empty placeholder or fabricated facts row', () => {
  const unknown = {...anime, format: 'unknown', episodes: 0, date: 'unknown'};
  assert.deepEqual(catalogCardFacts({anime: unknown, locale: 'en'}), []);
  assert.equal(renderToStaticMarkup(React.createElement(CatalogCardFacts, {anime: unknown, locale: 'en'})), '');
});

const css = fs.readFileSync(path.join(sourceRoot,'app/gallery-shell.css'),'utf8');
const rootCSS=postcss.parse(css);
const normalize=value=>value.replace(/\s+/g,' ').replace(/\s*,\s*/g,',').replace(/:\s+/g,':').trim();
const evidenceCSS=postcss.parse(fs.readFileSync(path.join(sourceRoot,'app/rating-evidence.css'),'utf8'));
const surfaces=postcss.parse(fs.readFileSync(path.join(sourceRoot,'app/gallery-surfaces.css'),'utf8'));
function declaration(selector,property,media,tree=rootCSS){let found;tree.walkRules(rule=>{if(normalize(rule.selector)!==normalize(selector)||normalize(media||'')!==normalize(rule.parent.type==='atrule'?rule.parent.params:''))return;rule.walkDecls(property,d=>found=d.value)});return found}
test('gallery has four/five/six desktop columns, three tablet and two phone columns, with an explicit one-column List',()=>{
 const grid='.reference-app .poster-grid,.reference-app .library-shelf-grid';
 assert.equal(declaration(grid,'grid-template-columns'),'repeat(4,minmax(0,1fr))');
 assert.equal(declaration(grid,'grid-template-columns','(min-width:1280px)'),'repeat(5,minmax(0,1fr))');
 assert.equal(declaration(grid,'grid-template-columns','(min-width:1680px)'),'repeat(6,minmax(0,1fr))');
 assert.equal(declaration(grid,'grid-template-columns','(max-width:1023px) and (min-width:701px)'),'repeat(3,minmax(0,1fr))');
 assert.equal(declaration(grid,'gap'),'28px 20px');
 assert.equal(declaration(grid,'grid-template-columns','(max-width:700px)'),'repeat(2,minmax(0,1fr))');
 assert.equal(declaration(grid,'gap','(max-width:700px)'),'24px 12px');
 assert.equal(declaration('.reference-app [data-catalog-layout=list] .poster-grid,.reference-app [data-catalog-layout=list] .library-shelf-grid','grid-template-columns'),'1fr');
 assert.equal(declaration('.reference-app .poster-frame','aspect-ratio'),'2/3');
});
test('known metadata stays close to an uncluttered two-line title with explicit score/count styles',()=>{
 assert.ok(['17px','18px'].includes(declaration('.reference-app .poster-copy h2','font-size')),'Card titles retain the approved readable hierarchy');
 assert.equal(declaration('.reference-app .poster-copy h2','font-size','(max-width:700px)'),'16px');
 assert.equal(declaration('.reference-app .poster-copy h2>a,.reference-app .poster-copy h2>button','-webkit-line-clamp'),'2');
 assert.equal(declaration('.reference-app .catalog-card-facts','display'),'flex');
 assert.equal(declaration('.reference-app .catalog-card-facts','flex-wrap'),'wrap');
 assert.match(declaration('.rating-evidence .rating-evidence-score','color',undefined,evidenceCSS),/^var\(--tf-text(?:,|\))/);
 assert.match(declaration('.rating-evidence .rating-evidence-context','color',undefined,evidenceCSS),/^var\(--tf-muted(?:,|\))/);
 assert.equal(declaration('.rating-evidence .rating-evidence-qualification','display',undefined,evidenceCSS),'inline');
 for(const selector of ['.rating-evidence .rating-evidence-count','.rating-evidence .rating-evidence-qualification'])assert.ok(parseFloat(declaration(selector,'font-size',undefined,evidenceCSS))>=13,'Evidence remains readable: '+selector);
});
test('neutral Save/source/layout targets stay 44px and saved List retains Watch/Reviews',()=>{
 for(const [selector,property] of [['.reference-app .bookmark-toggle','width'],['.reference-app .bookmark-toggle','height'],['.reference-app .catalog-card-actions button','min-height'],['.reference-app .watchlist-actions>button','min-width'],['.gallery-view-control .catalog-layout-button','min-width'],['.gallery-view-control .catalog-layout-button','min-height']])assert.equal(declaration(selector,property),'44px',selector+' '+property);
 assert.equal(declaration('.reference-app .watchlist-actions .library-manage-button','min-height'),'44px');
 assert.equal(declaration('.score-chips>.rating-chip','min-height',undefined,surfaces),'44px');
 assert.equal(declaration('.catalog-score-summary','min-height',undefined,surfaces),'44px');
 assert.equal(declaration('.reference-app [data-catalog-layout=list] .poster-actions','display'),'flex');
 assert.equal(declaration('.reference-app .poster-card','background'),'var(--tf-material-bg)');assert.equal(declaration('.reference-app .poster-card','border'),'1px solid var(--tf-material-line)');
 assert.doesNotMatch(css,/\.bookmark-toggle[^{}]*\{[^}]*opacity:\s*0/);
});

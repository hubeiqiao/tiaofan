import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadSourceModule} from './component-test-loader.mjs';

const source = readFileSync(new URL('../components/anime-home.tsx', import.meta.url), 'utf8');
const invalidation = source.match(/ useEffect\(\(\)=>\{if\(libraryStatus!=='ready'\)return;if\(lastWatchSignals\.current[\s\S]*?\},\[watchSignals,libraryStatus\]\);/)?.[0];
const onLeave = source.match(/onLeave:(\(\)=>\{[\s\S]*?\}),dismissChild:/)?.[1];
const clearIdentity = source.match(/useEffect\((\(\)=>\{personalSession\.current\.clear\(\);[\s\S]*?\}),\[libraryIdentityEpoch\]\);/)?.[1];
const start = source.indexOf(' const personalKey=');
const end = source.indexOf(' const personalVisible=', start);
assert.ok(invalidation, 'Find the actual saved-signal invalidation effect');
assert.ok(onLeave, 'Find the actual recommendation destination leave callback');
assert.ok(clearIdentity, 'Find the actual account-identity invalidation callback');
assert.ok(start >= 0 && end > start, 'Find the actual recommendation request and auto-entry effects');

// Execute the current production effects and request function, rather than
// copying their logic. Only React scheduling, requests, and timers are simulated.
const lifecycle = ts.transpileModule(
  `${invalidation}\n${source.slice(start, end)}\nreturn {personalRecommend,onLeave:${onLeave},clearIdentity:${clearIdentity}};`,
  {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}},
).outputText;
const {createRecommendationSession} = loadSourceModule('lib/recommendation-session.ts');
const context = 'synthetic-account-context';
const scopeKey = signals => JSON.stringify([1, context, signals, 'historical', 'en']);

function createHarness({previousSignals, signals, inFlight = false, cached = null}) {
  const state = {busy: inFlight, error: '', result: null, rows: [], epoch: -1, open: true, identity: 1, context, libraryEpoch: 1};
  const requests = [];
  const dependencies = [];
  const timers = new Map();
  let timerSerial = 0;
  const previousController = inFlight ? new AbortController() : null;
  const personalRequest = {current: previousController};
  const personalRequestKey = {current: scopeKey(previousSignals)};
  const lastWatchSignals = {current: previousSignals};
  const personalResultSignals = {current: ''};
  const personalResultBoundary = {current: ''};
  const personalScopeRef = {current: scopeKey(previousSignals)};
  const session = createRecommendationSession();
  session.select(JSON.stringify([1, context, previousSignals]));
  session.attempt(scopeKey(previousSignals));
  if (cached) session.remember(scopeKey(previousSignals), cached);

  function render() {
    let effectIndex = 0;
    const effects = [];
    // Render-local values stay unchanged while queued effects update state,
    // reproducing React's stale-render busy value in the first regression.
    const environment = {
      watchSignals: signals,
      libraryStatus: 'ready',
      lastWatchSignals,
      personalRequest,personalRequestKey,
      personalScopeRef,
      setPersonalResult(value) { state.result = value; },
      setPersonalRows(value) { state.rows = value; },
      setPersonalBusy(value) { state.busy = value; },
      personalPeriod: 'historical',
      locale: 'en',
      libraryIdentityEpoch: state.identity,
      libraryContext: state.context,
      personalSession: {current: session},
      recommendationDestination: {isOpen: () => state.open},
      signedIn: true,
      watch: [{key: 'bgm:900000101', state: 'watching'}],
      personalBusy: state.busy,
      libraryEpoch: state.libraryEpoch,
      isLibraryCurrent: epoch => epoch === state.libraryEpoch,
      setPersonalError(value) { state.error = value; },
      personalExpanded: state.open,
      personalResultSignals,personalResultBoundary,
      setPersonalEpoch(value) { state.epoch = value; },
      setSavedOptionsOpen() {},
      setShareOpen() {},
      setShareDraft() {},
      selectionPrivate: {current: false},
      setActive() {},
      mineEnriched: {current: ''},
      setPublicAiringEvidence() {},
      createPublicAiringEvidence: identityEpoch => ({identityEpoch}),
      rejectChangedContext() { return Error('Unexpected account change in test'); },
      fetch(url, options) {
        assert.equal(url, '/api/personal-recommendations');
        assert.equal(options.method, 'POST');
        let reject;
        const promise = new Promise((_resolve, fail) => { reject = fail; });
        requests.push({url, options, reject});
        return promise;
      },
      setTimeout(callback) {
        const id = ++timerSerial;
        timers.set(id, callback);
        return id;
      },
      clearTimeout(id) { timers.delete(id); },
      useEffect(callback, nextDependencies) {
        const index = effectIndex++;
        const prior = dependencies[index];
        if (!prior || !nextDependencies.every((value, i) => Object.is(value, prior[i]))) {
          dependencies[index] = [...nextDependencies];
          effects.push(callback);
        }
      },
    };
    const callbacks = new Function(...Object.keys(environment), lifecycle)(...Object.values(environment));
    // Flush the whole effect pass before a subsequent render sees state updates.
    for (const callback of effects) callback();
    return callbacks;
  }

  return {state, requests, timers, session, previousController, personalRequest, render};
}

test('actual Home effects replace an aborted request exactly once after saved signals change', async () => {
  const harness = createHarness({previousSignals: 'old-signals', signals: 'new-signals', inFlight: true});
  harness.render();
  const callbacks = harness.render();

  assert.equal(harness.previousController.signal.aborted, true);
  assert.equal(harness.requests.length, 1, 'A stale busy render must not strand the new library boundary');
  assert.equal(harness.state.busy, true);
  assert.equal(harness.session.hasAttempted(scopeKey('new-signals')), true);
  assert.equal(harness.session.hasAttempted(scopeKey('old-signals')), false);
  assert.notEqual(harness.personalRequest.current, harness.previousController);

  await callbacks.personalRecommend(true);
  assert.equal(harness.requests.length, 1, 'The live controller still blocks duplicate refresh requests');

  // Settle the automatic request without real network or timer activity.
  harness.personalRequest.current.abort();
  harness.requests[0].reject(new DOMException('Test cleanup', 'AbortError'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(harness.timers.size, 0);
});

test('actual Home effects preserve a failed explicit refresh instead of silently restoring cached success', async () => {
  const cached = {data: {version: 'previous-success'}, rows: [{key: 'bgm:900000102'}]};
  const harness = createHarness({previousSignals: 'same-signals', signals: 'same-signals', cached});
  const callbacks = harness.render();
  assert.equal(harness.state.result, cached.data);
  assert.equal(harness.requests.length, 0);

  const pending = callbacks.personalRecommend(true);
  harness.render();
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.state.busy, true);
  assert.equal(harness.state.result, cached.data);

  harness.requests[0].reject(Error('NETWORK_FAIL'));
  await pending;
  harness.render();
  harness.render();

  assert.equal(harness.state.busy, false);
  assert.equal(harness.state.error, 'NETWORK_FAIL', 'Settling busy must not clear a real refresh failure');
  assert.equal(harness.state.result, cached.data, 'A failed refresh retains the same safe candidates, while its error stays visible');
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.session.read(scopeKey('same-signals')), undefined, 'Explicit refresh invalidates the prior cached response');
  assert.equal(harness.timers.size, 0);
});

test('actual leave and return preserve a failed-refresh error until explicit retry, and account change clears it', async () => {
  const cached = {data: {version: 'previous-success'}, rows: [{key: 'bgm:900000102'}]};
  const harness = createHarness({previousSignals: 'same-signals', signals: 'same-signals', cached});
  let callbacks = harness.render();
  const failedRefresh = callbacks.personalRecommend(true);
  harness.render();
  harness.requests[0].reject(Error('NETWORK_FAIL'));
  await failedRefresh;
  callbacks = harness.render();
  assert.equal(harness.state.error, 'NETWORK_FAIL');
  assert.equal(harness.personalRequest.current, null);

  callbacks.onLeave();
  harness.state.open = false;
  harness.render();
  assert.equal(harness.state.error, 'NETWORK_FAIL', 'Leaving must retain the error needed for Retry on return');
  assert.equal(harness.session.hasAttempted(scopeKey('same-signals')), true);

  harness.state.open = true;
  callbacks = harness.render();
  harness.render();
  assert.equal(harness.state.error, 'NETWORK_FAIL', 'Reentry must retain the generic error and Retry state');
  assert.equal(harness.state.result, cached.data);
  assert.equal(harness.requests.length, 1, 'Navigation alone must not repeat a settled failed request');

  const explicitRetry = callbacks.personalRecommend(true);
  harness.render();
  assert.equal(harness.requests.length, 2, 'Explicit Retry is allowed to start a fresh request');
  assert.equal(harness.state.error, '');
  harness.requests[1].reject(Error('RETRY_FAIL'));
  await explicitRetry;
  callbacks = harness.render();
  assert.equal(harness.state.error, 'RETRY_FAIL');

  callbacks.onLeave();
  harness.state.open = false;
  harness.render();
  harness.state.identity = 2;
  harness.state.context = 'different-synthetic-account-context';
  harness.state.libraryEpoch = 2;
  callbacks = harness.render();
  callbacks.clearIdentity();
  assert.equal(harness.state.error, '', 'The actual account-boundary callback still clears the prior error');
  assert.equal(harness.state.result, null);
  assert.equal(harness.session.hasAttempted(scopeKey('same-signals')), false);
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.timers.size, 0);
});

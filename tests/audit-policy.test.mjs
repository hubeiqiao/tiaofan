import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateAudit } from '../scripts/audit-policy.mjs';
const report = rows => ({ auditReportVersion: 2, vulnerabilities: rows });
const cause = (name, id, severity = 'high') => ({ name, severity, url: `https://github.com/advisories/${id}` });
test('current full report accepts only the two documented residual roots', () => {
 const output = evaluateAudit(JSON.parse(readFileSync(new URL('../docs/audit/audit-full.json', import.meta.url), 'utf8')));
 assert.equal(output.ok, true); assert.equal(output.accepted.length, 2); assert.deepEqual(output.failures, []);
});
test('a new critical in a development dependency fails', () => {
 const output = evaluateAudit(report({ vinext: { severity: 'critical', via: [cause('vinext', 'GHSA-new1-new2-new3', 'critical')] } }));
 assert.equal(output.ok, false); assert.match(output.failures.join(), /GHSA-new1/);
});
test('a high transitive chain must resolve to an allowed advisory', () => {
 assert.equal(evaluateAudit(report({ tool: { severity: 'high', via: ['missing-package'] } })).ok, false);
});
test('an allowlisted identifier on a different package does not pass', () => {
 assert.equal(evaluateAudit(report({ other: { severity: 'high', via: [cause('other', 'GHSA-vfj7-8cjw-p6xm')] } })).ok, false);
});
test('failed or unsupported audit results fail closed', () => {
 for (const input of [null, {}, { error: { message: 'offline' } }, { auditReportVersion: 99, vulnerabilities: {} }]) assert.equal(evaluateAudit(input).ok, false);
});
test('new moderate-only findings remain visible warnings', () => {
 const output = evaluateAudit(report({ tool: { severity: 'moderate', via: [cause('tool', 'GHSA-mod1-mod2-mod3', 'moderate')] } }));
 assert.equal(output.ok, true); assert.equal(output.warnings.length, 1);
});

test('an accepted advisory whose severity rises is rejected', () => {
 assert.equal(evaluateAudit(report({ braces: { severity: 'critical', via: [cause('braces', 'GHSA-vfj7-8cjw-p6xm', 'critical')] } })).ok, false);
});

import { spawnSync } from 'node:child_process';
import { evaluateAudit } from './audit-policy.mjs';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['audit', '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, shell: false });
let report;
try { if (result.error || ![0, 1].includes(result.status)) throw new Error('Audit command failed'); report = JSON.parse(result.stdout); }
catch { console.error('Dependency audit did not produce a usable report. No exception was applied.'); process.exit(1); }
const evaluation = evaluateAudit(report);
console.log(JSON.stringify({ ...evaluation, counts: report.metadata?.vulnerabilities ?? null, scope: 'All dependencies, including runtime-bearing development dependencies. The two named residual exceptions remain documented risks.' }, null, 2));
process.exitCode = evaluation.ok ? 0 : 1;

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// This is a conservative release-hygiene check, not a secret-scanner guarantee.
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const skipped = new Set(['node_modules', '.git', 'dist', '.next', '.vinext', '.wrangler', '.vite-cache', 'coverage']);
const prohibited = new Set(['.openai', '.sites-runtime', '.agents', '.codex', '.aws', 'sources', 'qa', 'recovery', 'archives']);
const patterns = [
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['OpenAI project key', /\bsk-proj-[A-Za-z0-9_-]{25,}\b/g],
  ['hosting project identifier', /\bappgprj_[a-f0-9]{16,}\b/g],
  ['private attachment reference', /\b(?:sediment:\/\/file_|codex:\/\/threads\/)/g],
  ['local execution path', /\/(?:workspace\/scratch|Users|home\/agent)\/[A-Za-z0-9._/-]+/g],
];
const findings = [];
let count = 0;
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    if (skipped.has(entry.name) || entry.name.endsWith('.tsbuildinfo') || entry.name === 'next-env.d.ts') continue;
    if (prohibited.has(entry.name) || /^\.env(?:\.|$)/.test(entry.name) && entry.name !== '.env.example' || /^\.dev\.vars/.test(entry.name) || /\.(?:pem|p12|pfx|sqlite|sqlite3|db|log|har|tgz|zip)$/.test(entry.name)) {
      findings.push({ file: relative, reason: 'Excluded private/runtime/archive path' });
      continue;
    }
    if (entry.isSymbolicLink()) { findings.push({ file: relative, reason: 'Publishable source must not contain symlinks' }); continue; }
    if (entry.isDirectory()) { walk(absolute); continue; }
    if (!entry.isFile()) continue;
    count++;
    if (fs.statSync(absolute).size > 2_000_000) findings.push({ file: relative, reason: 'Unexpected file over 2 MB; review dataset/media content' });
    if (/\.(?:woff2?|png|jpe?g|webp|gif|mp4|ico)$/.test(entry.name)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    for (const [reason, expression] of patterns) {
      expression.lastIndex = 0;
      for (const match of text.matchAll(expression)) {
        findings.push({ file: relative, line: text.slice(0, match.index).split('\n').length, reason });
      }
    }
  }
}
walk(root);
if (findings.length) {
  console.error(JSON.stringify({ ok: false, checkedFiles: count, findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, checkedFiles: count, scope: 'Source hygiene patterns only; excludes build/runtime/dependency directories and does not establish complete security or rights clearance.' }, null, 2));
}

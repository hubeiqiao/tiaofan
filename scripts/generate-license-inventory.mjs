#!/usr/bin/env node
// Reads only package.json/package-lock.json and writes the requested inventory.
// Usage: node generate-license-inventory.mjs <project-root> <output-json>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [rootArg, outputArg] = process.argv.slice(2);
if (!rootArg || !outputArg) throw new Error('Usage: node generate-license-inventory.mjs <project-root> <output-json>');
const root = path.resolve(rootArg);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lockBytes = fs.readFileSync(path.join(root, 'package-lock.json'));
const lock = JSON.parse(lockBytes);
const packages = Object.entries(lock.packages ?? {}).filter(([key]) => key).sort(([a], [b]) => a.localeCompare(b)).map(([packagePath, item]) => {
  const name = packagePath.split('node_modules/').at(-1);
  const record = {path: packagePath, name, version: item.version ?? null, declaredLicense: item.license ?? null, dev: item.dev ?? false, optional: item.optional ?? false};
  if (packagePath === `node_modules/${name}`) {
    if (name in (manifest.dependencies ?? {})) record.directDependency = 'runtime';
    else if (name in (manifest.devDependencies ?? {})) record.directDependency = 'development';
  }
  return record;
});
const counts = {};
for (const item of packages) counts[item.declaredLicense ?? 'MISSING'] = (counts[item.declaredLicense ?? 'MISSING'] ?? 0) + 1;
const has = (name, version) => packages.some(item => item.name === name && item.version === version);
const exceptions = [];
const heroui = ['@heroui/react', '@heroui/styles'].filter(name => has(name, '3.2.6'));
if (heroui.length) exceptions.push({packages: heroui.map(name => `${name}@3.2.6`), declaredLicense: 'MIT', distributedLicenseFile: 'Apache-2.0', action: 'Retain exact shipped notices and describe the metadata mismatch.', source: 'https://raw.githubusercontent.com/heroui-inc/heroui/v3.2.6/LICENSE'});
if (has('lucide-react', '1.31.0')) exceptions.push({packages: ['lucide-react@1.31.0'], declaredLicense: 'ISC', distributedLicenseFile: 'ISC plus MIT for Feather-derived icons', action: 'Retain the entire LICENSE, including Feather attribution.', source: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE'});
const inventory = {
  generatedAt: new Date().toISOString(),
  scope: 'Lockfile metadata inventory for a source-only distribution; not a complete file-level license or security audit.',
  lockfile: 'package-lock.json',
  lockfileSha256: crypto.createHash('sha256').update(lockBytes).digest('hex'),
  lockfileVersion: lock.lockfileVersion,
  packageEntries: packages.length,
  declaredLicenseCounts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  verifiedExceptions: exceptions,
  distributionNotes: [
    'No node_modules or built artifacts should be included in this source-only release.',
    'Some lockfile entries are optional platform variants and may not be installed or shipped.',
    'This list does not certify the absence of vulnerabilities; run the separate security-validation workflow.',
    'Review actual license files and update notices for any changed package version.',
    'New bundles, binaries, WASM, containers and releases require review of actually distributed components.'
  ],
  packages
};
fs.writeFileSync(path.resolve(outputArg), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Wrote ${packages.length} package records for lockfile ${inventory.lockfileSha256}`);

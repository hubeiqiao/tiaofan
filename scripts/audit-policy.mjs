/** Narrow, documented exceptions for upstream development-tool advisories.
 * These exceptions are not a zero-vulnerability claim. Reassess before exposing
 * build tools or publishing compiled distributions. */
const accepted = new Map([
  ['GHSA-vfj7-8cjw-p6xm', { name: 'braces', severity: 'high' }],
  ['GHSA-67mh-4wv8-2f99', { name: 'esbuild', severity: 'moderate' }],
]);
export function evaluateAudit(report) {
  if (!report || report.error || report.auditReportVersion !== 2 || !report.vulnerabilities || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
    return { ok: false, failures: ['Missing, failed or unsupported npm audit report'], accepted: [], warnings: [] };
  }
  const entries = report.vulnerabilities;
  const failures = new Set(), exceptions = new Set(), warnings = new Set();
  function roots(name, seen = new Set()) {
    const row = entries[name];
    if (!row || seen.has(name) || !Array.isArray(row.via)) return [{ unresolved: name }];
    const next = new Set(seen); next.add(name);
    return row.via.flatMap(value => typeof value === 'string' ? roots(value, next) : value && typeof value === 'object' ? [value] : [{ unresolved: name }]);
  }
  for (const [name, row] of Object.entries(entries)) {
    if (!row || !['info', 'low', 'moderate', 'high', 'critical'].includes(row.severity)) { failures.add(`Invalid vulnerability metadata: ${name}`); continue; }
    const strict = row.severity === 'high' || row.severity === 'critical';
    const causes = roots(name);
    if (strict && !causes.length) failures.add(`No advisory cause available: ${name}`);
    for (const cause of causes) {
      let id = '';
      try { const url = new URL(cause.url); if (url.hostname === 'github.com') id = url.pathname.split('/').at(-1); } catch {}
      if (accepted.has(id) && accepted.get(id).name === cause.name && accepted.get(id).severity === cause.severity) { exceptions.add(`${id} (${cause.name})`); continue; }
      const message = cause.unresolved ? `Unresolved audit chain: ${cause.unresolved}` : `${id || 'Unrecognized advisory'} (${cause.name || name})`;
      if (strict || cause.severity === 'high' || cause.severity === 'critical') failures.add(message);
      else warnings.add(message);
    }
  }
  return { ok: failures.size === 0, failures: [...failures].sort(), accepted: [...exceptions].sort(), warnings: [...warnings].sort() };
}

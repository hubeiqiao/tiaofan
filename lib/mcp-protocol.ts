// MCP 2026-07-28 protocol adapter; product tools and Sites identity stay separate.
// Sources: /specification/2026-07-28/{basic/index,basic/versioning,
// basic/transports/streamable-http,server/discover} at modelcontextprotocol.io.
export const MODERN_MCP_VERSION = '2026-07-28';
export const LEGACY_MCP_VERSIONS = ['2025-06-18', '2025-03-26'] as const;
export const SUPPORTED_MCP_VERSIONS = [MODERN_MCP_VERSION, ...LEGACY_MCP_VERSIONS];
export const MCP_SERVER_INFO = { name: 'tiaofan-source-demo', title: 'Tiaofan Synthetic Demo', version: '0.1.0' };
export const MCP_SERVER_CAPABILITIES = { tools: { listChanged: false } };
export const MCP_SERVER_INSTRUCTIONS = 'SYNTHETIC DEMO ONLY. All titles, IDs, dates and genres are fictional interface fixtures, not real anime evidence. No community ratings, reviews, posters, viewing records or live source updates are included. Private watchlists and authentication are disabled and always fail closed. Never present these fixtures as real-world facts.';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
type ProtocolFailure = { code: number; message: string; data?: { requested: string; supported: string[] } };
type ProtocolCheck = { version: string; modern: boolean; error?: undefined } | { error: ProtocolFailure; version?: undefined; modern?: undefined };
const invalid = (): ProtocolCheck => ({ error: { code: -32602, message: 'Missing or invalid per-request protocol metadata.' } });
const mismatch = (): ProtocolCheck => ({ error: { code: -32020, message: 'Required MCP headers are missing or do not match the request body.' } });
function decodeName(value: string | null): string | null {
  if (value === null || value.length > 1024 || !/^[\x20-\x7e]*$/.test(value)) return null;
  if (!value.startsWith('=?base64?')) return value;
  if (!value.endsWith('?=')) return null;
  const encoded = value.slice(9, -2);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(encoded), x => x.charCodeAt(0))); } catch { return null; }
}
export function validateMcpProtocol(requestHeaders: Headers, message: { method: string; params?: unknown }): ProtocolCheck {
  const headerVersion = requestHeaders.get('mcp-protocol-version') || '';
  const params = record(message.params) ? message.params : {};
  const meta = record(params._meta) ? params._meta : null;
  const bodyVersion = meta?.['io.modelcontextprotocol/protocolVersion'];
  const modern = headerVersion === MODERN_MCP_VERSION || bodyVersion === MODERN_MCP_VERSION;
  // Metadata cannot provide an authenticated user; only validate protocol information.
  if (modern) {
    if (!meta || typeof bodyVersion !== 'string' || !record(meta['io.modelcontextprotocol/clientCapabilities'])) return invalid();
    const info = meta['io.modelcontextprotocol/clientInfo'];
    if (info !== undefined && (!record(info) || typeof info.name !== 'string' || !info.name || info.name.length > 200 || typeof info.version !== 'string' || info.version.length > 100)) return invalid();
    if (!headerVersion || headerVersion !== bodyVersion || requestHeaders.get('mcp-method') !== message.method) return mismatch();
    if (message.method === 'tools/call' && (typeof params.name !== 'string' || decodeName(requestHeaders.get('mcp-name')) !== params.name)) return mismatch();
    // No x-mcp-header fields are advertised by this Site's tools.
  } else if (typeof bodyVersion === 'string' && headerVersion && bodyVersion !== headerVersion) {
    return mismatch();
  }
  const version = typeof bodyVersion === 'string' ? bodyVersion : headerVersion || '2025-03-26';
  if (version.length > 100) return invalid();
  if (!SUPPORTED_MCP_VERSIONS.includes(version)) return { error: { code: -32022, message: 'Unsupported MCP protocol version.', data: { requested: version, supported: [...SUPPORTED_MCP_VERSIONS] } } };
  return { version, modern: version === MODERN_MCP_VERSION };
}
export function modernMcpResult(result: Record<string, unknown>) {
  return { ...result, resultType: 'complete', _meta: { 'io.modelcontextprotocol/serverInfo': MCP_SERVER_INFO } };
}
export function mcpDiscoveryResult() {
  return modernMcpResult({ supportedVersions: [...SUPPORTED_MCP_VERSIONS], capabilities: MCP_SERVER_CAPABILITIES, instructions: MCP_SERVER_INSTRUCTIONS, ttlMs: 60_000, cacheScope: 'public' });
}

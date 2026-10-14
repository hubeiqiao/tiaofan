import { z, ZodError } from 'zod';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { callMcpTool, MCP_TOOLS, McpAuthenticationError, McpInputError } from '@/lib/mcp-tools';
import { SITE_ORIGIN } from '@/lib/site-brand';
import { admitMcpCall } from '@/lib/mcp-rate-limit';
import { validateMcpProtocol, modernMcpResult, mcpDiscoveryResult, LEGACY_MCP_VERSIONS, MCP_SERVER_INFO, MCP_SERVER_CAPABILITIES, MCP_SERVER_INSTRUCTIONS } from '@/lib/mcp-protocol';

export const dynamic = 'force-dynamic';
const PROTOCOL = '2025-06-18';
const VERSIONS: Set<string> = new Set(LEGACY_MCP_VERSIONS);
const MAX_BODY = 16 * 1024;
const MAX_RESULT = 48 * 1024;
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Authorization, Cookie' };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const rpcError = (id: unknown, code: number, message: string, status = 400, extra: Record<string, string> = {}, data?: unknown, omitUnknownId = false) => Response.json({ jsonrpc: '2.0', ...(id == null && omitUnknownId ? {} : { id: id ?? null }), error: { code, message, ...(data === undefined ? {} : { data }) } }, { status, headers: { ...headers, ...extra } });
const rpcResult = (id: unknown, result: unknown) => Response.json({ jsonrpc: '2.0', id, result }, { headers });
const validOrigin = (req: Request) => !req.headers.has('origin') || req.headers.get('origin') === SITE_ORIGIN;
async function readBoundedBody(req: Request) {
  if (Number(req.headers.get('content-length')) > MAX_BODY) throw new RangeError('Too large');
  const reader = req.body?.getReader(); if (!reader) return '';
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > MAX_BODY) { await reader.cancel(); throw new RangeError('Too large'); } chunks.push(next.value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
const initialize = z.object({ protocolVersion: z.string().min(1).max(100), capabilities: z.record(z.unknown()), clientInfo: z.object({ name: z.string().min(1).max(200), version: z.string().max(100) }).passthrough(), _meta: z.record(z.unknown()).optional() }).passthrough();
const call = z.object({ name: z.string().min(1).max(100), arguments: z.record(z.unknown()).optional(), _meta: z.record(z.unknown()).optional() }).strict();
const list = z.object({ cursor: z.string().optional(), _meta: z.record(z.unknown()).optional() }).strict();
export async function POST(req: Request) {
  // Legacy JSON-RPC requires id:null when a request ID cannot be recovered.
  // Modern MCP permits the ID to be omitted for those malformed requests.
  const error = (id: unknown, code: number, message: string, status = 400, extra: Record<string, string> = {}, data?: unknown) => rpcError(id, code, message, status, extra, data, req.headers.get('mcp-protocol-version') === '2026-07-28');
  if (!validOrigin(req)) return error(null, -32003, 'Origin not allowed.', 403);
  if (req.headers.get('sec-fetch-site') === 'cross-site') return error(null, -32003, 'Cross-site browser request not allowed.', 403);

  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') || '')) return error(null, -32600, 'Use application/json.', 415);
  const accept = req.headers.get('accept');
  if (accept && !accept.includes('application/json') && !accept.includes('*/*')) return error(null, -32600, 'Accept application/json responses.', 406);
  let value: unknown;
  try { value = JSON.parse(await readBoundedBody(req)); } catch (e) { return e instanceof RangeError ? error(null, -32600, 'Request is too large.', 413) : error(null, -32700, 'Invalid JSON.'); }
  if (!object(value) || value.jsonrpc !== '2.0' || typeof value.method !== 'string' || value.method.length > 100 || (value.params !== undefined && !object(value.params))) return error(null, -32600, 'Invalid JSON-RPC request.');
  const hasId = Object.hasOwn(value, 'id');
  if (hasId && !(typeof value.id === 'string' && value.id.length <= 128 || typeof value.id === 'number' && Number.isSafeInteger(value.id))) return error(null, -32600, 'Invalid request ID.');
  const protocol = validateMcpProtocol(req.headers, { method: value.method, params: value.params });
  if (protocol.error) return error(hasId ? value.id : null, protocol.error.code, protocol.error.message, 400, {}, protocol.error.data);
  const { version, modern } = protocol;
  if (!hasId) {
    if (modern) return error(null, -32600, 'Unsupported notification.', 400);
    if (!['notifications/initialized', 'notifications/cancelled'].includes(value.method)) return error(null, -32600, 'Unsupported notification.');
    return new Response(null, { status: 202, headers });
  }
  const id = value.id;
  const result = (data: Record<string, unknown>) => rpcResult(id, modern ? modernMcpResult(data) : data);
  try {
    switch (value.method) {
      case 'server/discover': {
        z.object({ _meta: z.record(z.unknown()).optional() }).strict().parse(value.params || {});
        return rpcResult(id, mcpDiscoveryResult());
      }
      case 'initialize': {
        if (modern) return error(id, -32601, 'Use server/discover for this protocol version.', 404);
        const p = initialize.parse(value.params);
        return result({ protocolVersion: VERSIONS.has(p.protocolVersion) ? p.protocolVersion : PROTOCOL, capabilities: MCP_SERVER_CAPABILITIES, serverInfo: MCP_SERVER_INFO, instructions: MCP_SERVER_INSTRUCTIONS });
      }
      case 'ping': if (modern) z.object({ _meta: z.record(z.unknown()) }).strict().parse(value.params); return result({});
      case 'tools/list': { const p = list.parse(value.params || {}); if (p.cursor) throw new McpInputError('No further discovery pages'); return result({ tools: MCP_TOOLS, ...(modern ? { ttlMs: 60_000, cacheScope: 'public' } : {}) }); }
      case 'tools/call': {
        const p = call.parse(value.params);
        // The source demo always returns null. Never authorize via identity headers,
        // userId arguments, cookies or arbitrary Authorization token strings.
        const resolvedUser = await getChatGPTUser();
        const user = resolvedUser && resolvedUser.userId.trim() && resolvedUser.userId.length <= 512 ? resolvedUser : null;
        if (p.name === 'get_my_watchlist' && !user) throw new McpAuthenticationError('Site sign-in required');
        const quota = admitMcpCall(user?.userId || null);
        if (!quota.allowed) return error(id, modern ? 4290 : -32029, 'Tool call limit reached. Please retry after the indicated delay.', 429, { 'Retry-After': String(quota.retryAfter) });
        const data = await callMcpTool(p.name, p.arguments || {}, async () => user);
        const text = JSON.stringify(data);
        if (new TextEncoder().encode(text).length > MAX_RESULT) return result({ content: [{ type: 'text', text: 'Result too large. Use a smaller limit.' }], isError: true });
        return result({ content: [{ type: 'text', text }], ...(version === '2025-03-26' ? {} : { structuredContent: data }), isError: 'error' in data });
      }
      default: return error(id, -32601, 'Method not found.', modern ? 404 : 200);
    }
  } catch (e) {
    if (e instanceof McpAuthenticationError) return error(id, modern ? 4010 : -32001, 'Private watchlists are disabled in the source demo.', 401, { 'WWW-Authenticate': 'Bearer' });
    if (e instanceof ZodError || e instanceof McpInputError) return error(id, -32602, 'Invalid tool name or arguments. Use tools/list for the supported schema.', modern ? 400 : 200);
    // Never reflect exceptions, database errors, credentials, identities or raw records.
    return result({ content: [{ type: 'text', text: 'The saved source is temporarily unavailable. Please retry later.' }], isError: true });
  }
}
export async function GET(req: Request) {
  if (!validOrigin(req)) return rpcError(null, -32003, 'Origin not allowed.', 403, {}, undefined, req.headers.get('mcp-protocol-version') === '2026-07-28');
  return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
}

/** In-isolate admission control only. No storage writes, credentials or client IPs.
 * This bounds each live Worker isolate, not a distributed site-wide quota. */
const WINDOW_MS = 60_000;
const GLOBAL_LIMIT = 120;
const ANONYMOUS_LIMIT = 60;
const USER_LIMIT = 40;
const MAX_IDENTITIES = 128;
let window = -1;
let globalCount = 0;
const identities = new Map<string, number>();
export function admitMcpCall(userId: string | null, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const currentWindow = Math.floor(now / WINDOW_MS);
  if (currentWindow !== window) {
    window = currentWindow;
    globalCount = 0;
    identities.clear();
  }
  // A single fixed anonymous bucket cannot be rotated using spoofed IP/user headers.
  const key = userId ? `user:${userId}` : 'anonymous';
  const count = identities.get(key) || 0;
  const retryAfter = Math.max(1, Math.ceil(((currentWindow + 1) * WINDOW_MS - now) / 1000));
  if (globalCount >= GLOBAL_LIMIT || count >= (userId ? USER_LIMIT : ANONYMOUS_LIMIT) || (!identities.has(key) && identities.size >= MAX_IDENTITIES)) return { allowed: false, retryAfter };
  globalCount++;
  identities.set(key, count + 1);
  return { allowed: true, retryAfter: 0 };
}

// Admin security layer for editor.html — used by login/logout/session/audit/
// publish/delete/pending/review. Nothing here is exposed to the browser.
//
//  • Login issues a short-lived, HMAC-signed session in an HttpOnly,
//    Secure, SameSite=Strict cookie — the admin password is never stored in
//    (or readable by) the browser after the login request.
//  • Every admin request must carry the cookie AND pass CSRF checks.
//  • Failed logins are rate-limited per IP and every security-relevant
//    action is written to an audit log (viewable in the editor).
//
// Optional KV: bind a namespace as ADMIN_STATE (or reuse SUBMISSIONS) to get
// persistent lockouts, instant logout (session revocation) and the audit log.
// Without KV everything still works, with weaker lockout and no revocation.

const enc = new TextEncoder();

export const COOKIE_NAME = "ss_admin";
export const SESSION_TTL_SEC = 4 * 60 * 60; // 4 hours, then log in again
export const CSRF_HEADER_VALUE = "SoulScriptEditor";

export function stateKV(env) {
  return env.ADMIN_STATE || env.SUBMISSIONS || null;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

// ---------- constant-time compare (hash first so length doesn't leak) ----------
async function sha256(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(s == null ? "" : s))));
}
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function hex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function adminConfigured(env) {
  return !!(env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.SESSION_SECRET);
}
export const NOT_CONFIGURED =
  "Server isn't configured — ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET must all be set.";

// ---------- session tokens ----------
// Signed with a key derived from SESSION_SECRET with its own label, so a
// contributor token can never be accepted as an admin token (or vice versa).
async function signingKey(env) {
  const base = await crypto.subtle.importKey(
    "raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const derived = await crypto.subtle.sign("HMAC", base, enc.encode("soul-and-script/admin-session/v1"));
  return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function sign(env, payloadB64) {
  const key = await signingKey(env);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64))));
}
const b64u = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

// Changing ADMIN_PASSWORD or ADMIN_USERNAME instantly invalidates every session.
async function credentialFingerprint(env) {
  return hex((await sha256(`${env.ADMIN_USERNAME}\u0000${env.ADMIN_PASSWORD}\u0000${env.SESSION_SECRET}`)).slice(0, 8));
}

export async function createAdminSession(env) {
  const now = Math.floor(Date.now() / 1000);
  const jti = hex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = { u: env.ADMIN_USERNAME, j: jti, i: now, e: now + SESSION_TTL_SEC, f: await credentialFingerprint(env) };
  const payloadB64 = b64u(JSON.stringify(payload));
  const token = `${payloadB64}.${await sign(env, payloadB64)}`;
  const kv = stateKV(env);
  if (kv) {
    try { await kv.put(`admsess:${jti}`, "1", { expirationTtl: SESSION_TTL_SEC + 60 }); } catch (e) {}
  }
  return { token, jti, expiresAt: payload.e };
}

export async function verifyAdminToken(env, token) {
  if (!adminConfigured(env) || typeof token !== "string" || token.length > 2000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!(await safeEqual(sig, await sign(env, payloadB64)))) return null;
  let p;
  try { p = JSON.parse(unb64u(payloadB64)); } catch (e) { return null; }
  if (!p || typeof p !== "object") return null;
  if (!p.e || Date.now() / 1000 > p.e) return null;
  if (!(await safeEqual(p.u, env.ADMIN_USERNAME))) return null;
  if (!(await safeEqual(p.f, await credentialFingerprint(env)))) return null;
  const kv = stateKV(env);
  if (kv) {
    let alive = null;
    try { alive = await kv.get(`admsess:${p.j}`); } catch (e) { alive = "1"; } // KV hiccup: don't lock the admin out
    if (!alive) return null; // logged out / revoked
  }
  return { user: p.u, jti: p.j, expiresAt: p.e };
}

export async function revokeAdminSession(env, jti) {
  const kv = stateKV(env);
  if (kv && jti) { try { await kv.delete(`admsess:${jti}`); } catch (e) {} }
}

// ---------- cookies ----------
export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}
export function sessionCookie(token, maxAge = SESSION_TTL_SEC) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${maxAge}`;
}
export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;
}

// ---------- CSRF / request provenance ----------
// A browser only sends a cross-site request with our custom header if the
// site was allowed by CORS (it never is), and SameSite=Strict already keeps
// the cookie off cross-site requests. We check Origin and Fetch-Metadata too.
export function csrfProblem(request) {
  if (request.headers.get("X-Requested-With") !== CSRF_HEADER_VALUE) return "Blocked: missing request header.";
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return "Blocked: request came from another site.";
  const sfs = request.headers.get("Sec-Fetch-Site");
  if (sfs && sfs !== "same-origin") return "Blocked: request came from another site.";
  const ct = request.headers.get("Content-Type") || "";
  if (!ct.toLowerCase().includes("application/json")) return "Blocked: unexpected content type.";
  return "";
}

// Returns { user, jti, expiresAt, ip } on success, or a ready-made Response.
export async function requireAdmin(context) {
  const { request, env } = context;
  if (!adminConfigured(env)) return jsonResponse({ ok: false, error: NOT_CONFIGURED }, 500);
  const csrf = csrfProblem(request);
  if (csrf) return jsonResponse({ ok: false, error: csrf }, 403);
  const session = await verifyAdminToken(env, getCookie(request, COOKIE_NAME));
  if (!session) {
    return jsonResponse({ ok: false, code: "auth", error: "Your session has expired — please log in again." }, 401);
  }
  return { ...session, ip: clientIp(request) };
}

// ---------- client IP + rate limiting ----------
export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}
export function maskIp(ip) {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + ":…";
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.x` : ip;
}

const memory = new Map(); // per-isolate fallback when no KV is bound

async function readBucket(env, key) {
  const kv = stateKV(env);
  if (kv) {
    try { const raw = await kv.get(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  const m = memory.get(key);
  return m && m.exp > Date.now() ? m.val : null;
}
async function writeBucket(env, key, val, ttlSec) {
  const kv = stateKV(env);
  if (kv) {
    try { await kv.put(key, JSON.stringify(val), { expirationTtl: Math.max(60, Math.ceil(ttlSec)) }); } catch (e) {}
    return;
  }
  memory.set(key, { val, exp: Date.now() + ttlSec * 1000 });
}

// Is this id currently locked out of this bucket?
export async function rateLimitCheck(env, bucket, id, limit, windowSec) {
  const rec = await readBucket(env, `rl:${bucket}:${id}`);
  if (rec && rec.n >= limit) {
    const retryAfter = Math.max(1, Math.ceil(windowSec - (Date.now() - rec.t) / 1000));
    return { blocked: true, retryAfter };
  }
  return { blocked: false, retryAfter: 0 };
}
export async function rateLimitHit(env, bucket, id, windowSec) {
  const key = `rl:${bucket}:${id}`;
  const rec = (await readBucket(env, key)) || { n: 0, t: Date.now() };
  rec.n += 1;
  await writeBucket(env, key, rec, windowSec - (Date.now() - rec.t) / 1000);
}
export async function rateLimitClear(env, bucket, id) {
  const kv = stateKV(env);
  if (kv) { try { await kv.delete(`rl:${bucket}:${id}`); } catch (e) {} }
  memory.delete(`rl:${bucket}:${id}`);
}

// ---------- audit log ----------
export async function audit(env, request, evt, detail = {}) {
  const rec = { t: Date.now(), evt, ip: maskIp(clientIp(request)), ...detail };
  try { console.log(JSON.stringify({ audit: rec })); } catch (e) {}
  const kv = stateKV(env);
  if (!kv) return;
  try {
    const key = `audit:${String(9999999999999 - rec.t).padStart(13, "0")}-${hex(crypto.getRandomValues(new Uint8Array(3)))}`;
    await kv.put(key, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 45 });
  } catch (e) {}
}
export async function listAudit(env, limit = 40) {
  const kv = stateKV(env);
  if (!kv) return { available: false, items: [] };
  const list = await kv.list({ prefix: "audit:", limit });
  const items = [];
  for (const k of list.keys) {
    try { const raw = await kv.get(k.name); if (raw) items.push(JSON.parse(raw)); } catch (e) {}
  }
  return { available: true, items };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

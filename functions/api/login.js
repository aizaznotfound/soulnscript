// Cloudflare Pages Function — POST /api/login
// Checks the admin username/password (secrets in Cloudflare Pages →
// Settings → Environment variables) and, if correct, starts a session in an
// HttpOnly cookie. The password is never stored in the browser.
//
// Protection: constant-time comparison, a lockout after 5 wrong attempts
// from one IP (15 minutes), a small delay on every failure, and an audit
// log entry for every attempt.

import {
  adminConfigured, NOT_CONFIGURED, csrfProblem, clientIp, safeEqual, jsonResponse,
  createAdminSession, sessionCookie, rateLimitCheck, rateLimitHit, rateLimitClear,
  audit, sleep, SESSION_TTL_SEC
} from "../_lib/admin.js";

const MAX_ATTEMPTS = 5;
const WINDOW_SEC = 15 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!adminConfigured(env)) return jsonResponse({ ok: false, error: NOT_CONFIGURED }, 500);

  const csrf = csrfProblem(request);
  if (csrf) return jsonResponse({ ok: false, error: csrf }, 403);

  const ip = clientIp(request);
  const rl = await rateLimitCheck(env, "login", ip, MAX_ATTEMPTS, WINDOW_SEC);
  if (rl.blocked) {
    await audit(env, request, "login_locked");
    const mins = Math.ceil(rl.retryAfter / 60);
    return jsonResponse(
      { ok: false, locked: true, retryAfter: rl.retryAfter, error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
      429, { "Retry-After": String(rl.retryAfter) }
    );
  }

  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ ok: false, error: "Bad request." }, 400); }
  const username = String((body && body.username) || "").slice(0, 200);
  const password = String((body && body.password) || "").slice(0, 500);

  // Always run both comparisons (no early exit) so timing reveals nothing.
  const [userOk, passOk] = await Promise.all([safeEqual(username, env.ADMIN_USERNAME), safeEqual(password, env.ADMIN_PASSWORD)]);
  if (!(userOk && passOk)) {
    await rateLimitHit(env, "login", ip, WINDOW_SEC);
    await audit(env, request, "login_fail");
    await sleep(350 + Math.floor(Math.random() * 250));
    return jsonResponse({ ok: false, error: "Incorrect username or password." }, 401);
  }

  await rateLimitClear(env, "login", ip);
  const session = await createAdminSession(env);
  await audit(env, request, "login_ok");
  const warning = env.ADMIN_PASSWORD.length < 12
    ? "Your admin password is shorter than 12 characters. Please change ADMIN_PASSWORD in Cloudflare to a longer one (a 4-word passphrase is ideal)."
    : "";
  return jsonResponse(
    { ok: true, username: env.ADMIN_USERNAME, expiresAt: session.expiresAt, warning },
    200, { "Set-Cookie": sessionCookie(session.token, SESSION_TTL_SEC) }
  );
}

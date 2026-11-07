// Cloudflare Pages Function — POST /api/contributor-login
// Logs a contributor in and issues a signed session token (not a
// database session — just an HMAC-signed string the browser holds onto).

import { verifyPassword, createSessionToken, json } from "../_lib/auth.js";
import { rateLimitCheck, rateLimitHit, rateLimitClear, clientIp } from "../_lib/admin.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CONTRIBUTORS) {
    return json({ ok: false, error: "Server isn't configured — the CONTRIBUTORS KV namespace isn't bound." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }

  const username = (body.username || "").trim();
  const password = body.password || "";
  if (!username || !password) {
    return json({ ok: false, error: "Please enter your username and password." }, 400);
  }

  // 8 wrong attempts per IP+username per 15 minutes, then a temporary lockout.
  const rlId = `${clientIp(request)}:${username.toLowerCase().slice(0, 40)}`;
  const rl = await rateLimitCheck(env, "clogin", rlId, 8, 900);
  if (rl.blocked) {
    return json({ ok: false, error: `Too many attempts. Please try again in ${Math.ceil(rl.retryAfter / 60)} minute(s).` }, 429);
  }

  const raw = await env.CONTRIBUTORS.get(username.toLowerCase());
  if (!raw) {
    await rateLimitHit(env, "clogin", rlId, 900);
    return json({ ok: false, error: "Incorrect username or password." }, 401);
  }
  const record = JSON.parse(raw);
  const valid = await verifyPassword(password, record.salt, record.hash);
  if (!valid) {
    await rateLimitHit(env, "clogin", rlId, 900);
    return json({ ok: false, error: "Incorrect username or password." }, 401);
  }
  await rateLimitClear(env, "clogin", rlId);

  let token;
  try {
    token = await createSessionToken(env, record.username);
  } catch (e) {
    return json({ ok: false, error: e.message || "Server isn't configured — SESSION_SECRET is missing." }, 500);
  }
  return json({ ok: true, username: record.username, token });
}

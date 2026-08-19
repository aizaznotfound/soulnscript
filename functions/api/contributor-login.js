// Cloudflare Pages Function — POST /api/contributor-login
// Logs a contributor in and issues a signed session token (not a
// database session — just an HMAC-signed string the browser holds onto).

import { verifyPassword, createSessionToken, json } from "../_lib/auth.js";

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

  const raw = await env.CONTRIBUTORS.get(username.toLowerCase());
  if (!raw) {
    return json({ ok: false, error: "Incorrect username or password." }, 401);
  }
  const record = JSON.parse(raw);
  const valid = await verifyPassword(password, record.salt, record.hash);
  if (!valid) {
    return json({ ok: false, error: "Incorrect username or password." }, 401);
  }

  let token;
  try {
    token = await createSessionToken(env, record.username);
  } catch (e) {
    return json({ ok: false, error: e.message || "Server isn't configured — SESSION_SECRET is missing." }, 500);
  }
  return json({ ok: true, username: record.username, token });
}

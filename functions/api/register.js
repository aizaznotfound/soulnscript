// Cloudflare Pages Function — POST /api/register
// Lets any reader create a contributor account: username, email, WhatsApp
// number, and a password. No admin approval needed to sign up — accounts
// are self-serve. Approval only happens per-article, not per-account.
//
// Requires a KV namespace bound as CONTRIBUTORS (Settings → Functions →
// KV namespace bindings) and a SESSION_SECRET environment variable.

import { hashPassword, isValidUsername, isValidEmail, json } from "../_lib/auth.js";

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
  const email = (body.email || "").trim();
  const whatsapp = (body.whatsapp || "").trim();
  const password = body.password || "";

  if (!isValidUsername(username)) {
    return json({ ok: false, error: "Username must be 3-24 characters: letters, numbers, dots, dashes, underscores." }, 400);
  }
  if (!isValidEmail(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }
  if (!whatsapp || whatsapp.replace(/[^0-9]/g, "").length < 7) {
    return json({ ok: false, error: "Please enter a valid WhatsApp number, with country code." }, 400);
  }
  if (!password || password.length < 8) {
    return json({ ok: false, error: "Password must be at least 8 characters." }, 400);
  }

  const key = username.toLowerCase();

  try {
    const existing = await env.CONTRIBUTORS.get(key);
    if (existing) {
      return json({ ok: false, error: "That username is already taken. Please choose another." }, 409);
    }

    const { hash, salt } = await hashPassword(password);
    const record = {
      username,
      email,
      whatsapp,
      hash,
      salt,
      createdAt: new Date().toISOString()
    };
    await env.CONTRIBUTORS.put(key, JSON.stringify(record));

    return json({ ok: true, username });
  } catch (e) {
    return json({ ok: false, error: "Couldn't save your account — the storage isn't set up correctly (" + (e.message || "unknown error") + ")." }, 500);
  }
}

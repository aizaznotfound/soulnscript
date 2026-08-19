// Cloudflare Pages Function — POST /api/pending
// Admin-only: lists all pending contributor submissions for review inside
// editor.html. Uses the same ADMIN_USERNAME/ADMIN_PASSWORD as the rest of
// the staff tool — no separate admin login needed.

import { json } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SUBMISSIONS) {
    return json({ ok: false, error: "Server isn't configured — the SUBMISSIONS KV namespace isn't bound." }, 500);
  }
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Server isn't configured — ADMIN_USERNAME / ADMIN_PASSWORD are missing." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }

  if (body.username !== env.ADMIN_USERNAME || body.password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Incorrect username or password." }, 401);
  }

  const list = await env.SUBMISSIONS.list();
  const items = [];
  for (const key of list.keys) {
    const raw = await env.SUBMISSIONS.get(key.name);
    if (!raw) continue;
    const sub = JSON.parse(raw);
    if ((body.status || "pending") === "all" || sub.status === (body.status || "pending")) {
      items.push(sub);
    }
  }
  items.sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));

  return json({ ok: true, items });
}

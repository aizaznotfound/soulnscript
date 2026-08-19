// Cloudflare Pages Function — POST /api/my-submissions
// Returns the logged-in contributor's own submissions (pending, approved,
// rejected) so write.html can show them their status. Never returns
// other contributors' drafts.

import { verifySessionToken, json } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SUBMISSIONS) {
    return json({ ok: false, error: "Server isn't configured — the SUBMISSIONS KV namespace isn't bound." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }

  const session = await verifySessionToken(env, body.token);
  if (!session) {
    return json({ ok: false, error: "Your session has expired — please log in again." }, 401);
  }

  const list = await env.SUBMISSIONS.list();
  const items = [];
  for (const key of list.keys) {
    const raw = await env.SUBMISSIONS.get(key.name);
    if (!raw) continue;
    const sub = JSON.parse(raw);
    if (sub.author && sub.author.username === session.username) {
      items.push({
        id: sub.id,
        title: sub.title,
        status: sub.status,
        submittedAt: sub.submittedAt,
        reviewNote: sub.reviewNote || ""
      });
    }
  }
  items.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  return json({ ok: true, items });
}

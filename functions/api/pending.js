// Cloudflare Pages Function — POST /api/pending
// Admin-only: lists contributor submissions for review inside editor.html.
import { requireAdmin, jsonResponse as json, stateKV } from "../_lib/admin.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const gate = await requireAdmin(context);
  if (gate instanceof Response) return gate;
  if (!env.SUBMISSIONS) {
    return json({ ok: false, error: "Server isn't configured — the SUBMISSIONS KV namespace isn't bound." }, 500);
  }
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const wanted = (body && body.status) || "pending";

  const list = await env.SUBMISSIONS.list({ prefix: "sub_" }); // only real submissions, never session/audit keys
  const items = [];
  for (const key of list.keys) {
    const raw = await env.SUBMISSIONS.get(key.name);
    if (!raw) continue;
    let sub; try { sub = JSON.parse(raw); } catch (e) { continue; }
    if (wanted === "all" || sub.status === wanted) items.push(sub);
  }
  items.sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
  return json({ ok: true, items });
}

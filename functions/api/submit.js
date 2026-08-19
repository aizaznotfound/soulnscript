// Cloudflare Pages Function — POST /api/submit
// A logged-in contributor submits a draft article. It is NOT published —
// it's saved as a pending submission for an admin to review in editor.html.
// Requires a KV namespace bound as SUBMISSIONS.

import { verifySessionToken, json } from "../_lib/auth.js";
import { sanitizeCategory } from "../_lib/sanitize.js";

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

  const { title, deck, category, tags, blocks, leadImage } = body || {};
  if (!title || !title.trim()) {
    return json({ ok: false, error: "Please add a headline." }, 400);
  }
  if (title.trim().length > 200) {
    return json({ ok: false, error: "That headline's a little long — please keep it under 200 characters." }, 400);
  }
  if (deck && deck.length > 400) {
    return json({ ok: false, error: "That summary's a little long — please keep it under 400 characters." }, 400);
  }
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return json({ ok: false, error: "Please write something in the article body." }, 400);
  }
  if (blocks.length > 200) {
    return json({ ok: false, error: "That article has an unusual number of blocks — please split it up or get in touch." }, 400);
  }

  // Look up the contributor's contact details to attach to the submission
  // so the admin can see who wrote it without a second lookup.
  let contact = { email: "", whatsapp: "" };
  if (env.CONTRIBUTORS) {
    const raw = await env.CONTRIBUTORS.get(session.username.toLowerCase());
    if (raw) {
      const rec = JSON.parse(raw);
      contact = { email: rec.email, whatsapp: rec.whatsapp };
    }
  }

  const slugBase = slugify(title) || `story-${Date.now().toString(36)}`;
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const record = {
    id,
    slug: slugBase,
    title: title.trim(),
    deck: (deck || "").trim(),
    category: sanitizeCategory(category),
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 8).map((t) => t.trim().slice(0, 40)) : [],
    blocks, // array of { type: "paragraph"|"heading"|"image", html?, text?, base64?, filename?, caption? }
            // paragraph blocks carry sanitized inline HTML (bold/italic/links) in `html`;
            // heading/image blocks are plain text/files as before.
    leadImage: leadImage || null, // { base64, filename } or null
    author: {
      username: session.username,
      email: contact.email,
      whatsapp: contact.whatsapp
    },
    status: "pending",
    submittedAt: new Date().toISOString()
  };

  await env.SUBMISSIONS.put(id, JSON.stringify(record));

  return json({ ok: true, id });
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

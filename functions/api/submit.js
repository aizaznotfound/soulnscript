// Cloudflare Pages Function — POST /api/submit
// A logged-in contributor submits a draft article. It is NOT published —
// it's saved as a pending submission for an admin to review in editor.html.
// Requires a KV namespace bound as SUBMISSIONS.

import { verifySessionToken, json } from "../_lib/auth.js";
import { sanitizeCategory, sanitizeInlineHtml } from "../_lib/sanitize.js";
import { validateImageUpload, requestTooLarge } from "../_lib/validate.js";
import { rateLimitCheck, rateLimitHit, clientIp } from "../_lib/admin.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SUBMISSIONS) {
    return json({ ok: false, error: "Server isn't configured — the SUBMISSIONS KV namespace isn't bound." }, 500);
  }

  if (requestTooLarge(request)) {
    return json({ ok: false, error: "That submission is too large — please use smaller images." }, 413);
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

  // ---- Rebuild blocks from a strict allow-list. Nothing the browser sent is
  // stored as-is: image bytes are verified, filenames are replaced, text is
  // length-limited and HTML is sanitized. (editor.html shows these to staff.)
  const cleanBlocks = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") return json({ ok: false, error: "One of the blocks in your article is invalid." }, 400);
    if (b.type === "heading" || b.type === "paragraph") {
      const out = { type: b.type };
      if (typeof b.text === "string") out.text = b.text.slice(0, 20000);
      if (b.type === "paragraph" && typeof b.html === "string") out.html = sanitizeInlineHtml(b.html).slice(0, 40000);
      if (!out.text && !out.html) continue;
      cleanBlocks.push(out);
    } else if (b.type === "image") {
      const v = validateImageUpload(b);
      if (!v.ok) return json({ ok: false, error: `One of your inline images was rejected: ${v.error}` }, 400);
      cleanBlocks.push({ type: "image", base64: b.base64, filename: `image.${v.ext}`, caption: typeof b.caption === "string" ? b.caption.slice(0, 300) : "" });
    } else {
      return json({ ok: false, error: "One of the blocks in your article has an unknown type." }, 400);
    }
  }
  if (!cleanBlocks.length) return json({ ok: false, error: "Your article is empty." }, 400);
  let cleanLead = null;
  if (leadImage && leadImage.base64) {
    const v = validateImageUpload(leadImage);
    if (!v.ok) return json({ ok: false, error: `Your lead image was rejected: ${v.error}` }, 400);
    cleanLead = { base64: leadImage.base64, filename: `lead.${v.ext}`, caption: typeof leadImage.caption === "string" ? leadImage.caption.slice(0, 300) : "" };
  }

  // Throttle spam: at most 10 submissions per hour per IP.
  const ip = clientIp(request);
  if ((await rateLimitCheck(env, "submit", ip, 10, 3600)).blocked) {
    return json({ ok: false, error: "You're submitting too quickly — please try again later." }, 429);
  }
  await rateLimitHit(env, "submit", ip, 3600);

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
    blocks: cleanBlocks, // array of { type: "paragraph"|"heading"|"image", html?, text?, base64?, filename?, caption? }
            // paragraph blocks carry sanitized inline HTML (bold/italic/links) in `html`;
            // heading/image blocks are plain text/files as before.
    leadImage: cleanLead, // { base64, filename, caption } or null
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

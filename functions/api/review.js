// Cloudflare Pages Function — POST /api/review
// Admin-only. action:"approve" turns a pending submission into a real
// published article (same GitHub write path as publish.js). action:"reject"
// just marks it rejected, with an optional note the contributor can see.

import { requireAdmin, jsonResponse as json, audit } from "../_lib/admin.js";
import { validateImageUpload, assertSafeContent } from "../_lib/validate.js";
import { ghGetSha, ghPutFile, utf8ToBase64 } from "../_lib/github.js";
import { escapeHtml, sanitizeInlineHtml, sanitizeCategory, isValidSlug } from "../_lib/sanitize.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const gate = await requireAdmin(context);
  if (gate instanceof Response) return gate;
  if (!env.SUBMISSIONS) {
    return json({ ok: false, error: "Server isn't configured — the SUBMISSIONS KV namespace isn't bound." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }

  const { id, action } = body;
  // Only real submissions — never session, rate-limit or audit keys in a shared KV.
  if (typeof id !== "string" || !/^sub_[A-Za-z0-9_]+$/.test(id)) return json({ ok: false, error: "Missing or invalid submission id." }, 400);
  if (action !== "approve" && action !== "reject") {
    return json({ ok: false, error: "Unknown action." }, 400);
  }

  const raw = await env.SUBMISSIONS.get(id);
  if (!raw) return json({ ok: false, error: "Submission not found — it may have already been reviewed." }, 404);
  const sub = JSON.parse(raw);

  if (action === "reject") {
    sub.status = "rejected";
    sub.reviewNote = body.reviewNote || "";
    sub.reviewedAt = new Date().toISOString();
    await env.SUBMISSIONS.put(id, JSON.stringify(sub));
    await audit(env, request, "reject", { id });
    return json({ ok: true, status: "rejected" });
  }

  // ---- action === "approve" ----
  if (!env.GH_TOKEN || !env.GH_OWNER || !env.GH_REPO || !env.GH_BRANCH) {
    return json({ ok: false, error: "Server isn't configured — GH_TOKEN / GH_OWNER / GH_REPO / GH_BRANCH are missing." }, 500);
  }

  try {
    let slug = body.slugOverride || sub.slug;
    if (!isValidSlug(slug)) {
      return json({ ok: false, error: "That slug can only contain lowercase letters, numbers, and single hyphens." }, 400);
    }
    let existingSha = await ghGetSha(env, `content/posts/${slug}.json`);
    if (existingSha && !body.confirmOverwrite) {
      // Auto-dedupe rather than block the admin on a collision they didn't cause.
      slug = `${slug}-${Date.now().toString(36)}`;
      existingSha = null;
    }

    // ---- Lead image ----
    let leadImagePath = "";
    if (sub.leadImage && sub.leadImage.base64 && sub.leadImage.filename) {
      // The type comes from the file's real bytes, never from its filename.
      const v = validateImageUpload(sub.leadImage);
      if (!v.ok) return json({ ok: false, error: `The lead image isn't usable: ${v.error} Decline this submission or ask the writer to re-upload.` }, 400);
      leadImagePath = `images/${slug}.${v.ext}`;
      await ghPutFile(env, leadImagePath, sub.leadImage.base64, `Add lead image for ${sub.title}`, await ghGetSha(env, leadImagePath));
    }

    // ---- Body blocks -> body array (plain paragraphs, or raw HTML for headings/images) ----
    // Paragraph blocks may carry a `html` field (sanitized inline formatting —
    // bold/italic/links — produced by write.html's rich text toolbar). That
    // field is re-sanitized here too, since this is the real security
    // boundary: it protects against a submission posted straight to
    // /api/submit, bypassing the browser (and its own sanitizing) entirely.
    // Older pending submissions saved before formatting existed only have a
    // plain `text` field — those are still supported and fully escaped.
    const body_ = [];
    let imgCount = 0;
    for (const block of sub.blocks || []) {
      if (block.type === "heading" && block.text) {
        body_.push(`<h3>${escapeHtml(block.text)}</h3>`);
      } else if (block.type === "image" && block.base64 && block.filename) {
        imgCount++;
        const v = validateImageUpload(block);
        if (!v.ok) return json({ ok: false, error: `An inline image isn't usable: ${v.error} Decline this submission or ask the writer to re-upload.` }, 400);
        const path = `images/${slug}-${imgCount}.${v.ext}`;
        await ghPutFile(env, path, block.base64, `Add inline image for ${sub.title}`, await ghGetSha(env, path));
        const cap = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
        body_.push(`<figure><img src="${path}" alt="${escapeHtml(block.caption || sub.title)}">${cap}</figure>`);
      } else if (typeof block.html === "string" && block.html) {
        const clean = sanitizeInlineHtml(block.html);
        if (clean.trim()) body_.push(clean);
      } else if (block.text) {
        body_.push(escapeHtml(block.text));
      }
    }

    const data = {
      slug,
      category: sanitizeCategory(body.category || sub.category),
      featured: !!body.featured,
      title: sub.title,
      deck: sub.deck,
      author: sub.author.username,
      date: body.date || new Date().toISOString().slice(0, 10),
      readTime: estimateReadTime(sub.blocks),
      image: leadImagePath || "",
      imageCaption: (sub.leadImage && sub.leadImage.caption) || "",
      tags: sub.tags || [],
      body: body_
    };

    try { assertSafeContent(data); } catch (e) { return json({ ok: false, error: e.message }, 400); }

    const contentB64 = utf8ToBase64(JSON.stringify(data, null, 2));
    await ghPutFile(env, `content/posts/${slug}.json`, contentB64, `Publish (contributor): ${sub.title}`, existingSha);

    sub.status = "approved";
    sub.reviewedAt = new Date().toISOString();
    sub.publishedSlug = slug;
    await env.SUBMISSIONS.put(id, JSON.stringify(sub));

    await audit(env, request, "approve", { id, slug });
    return json({ ok: true, status: "approved", slug });
  } catch (e) {
    return json({ ok: false, error: e.message || "Something went wrong while publishing." }, 500);
  }
}

function estimateReadTime(blocks) {
  const words = (blocks || [])
    .map((b) => b.text || (b.html ? b.html.replace(/<[^>]+>/g, " ") : ""))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

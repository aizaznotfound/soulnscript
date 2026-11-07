// Cloudflare Pages Function — POST /api/publish
// Admin-only (session cookie + CSRF checks). Validates everything, then
// writes files to GitHub using a token stored ONLY as a server-side
// environment variable (never sent to the browser).
//
// Required environment variables (Cloudflare Pages → Settings → Environment variables):
//   ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET — the login (see login.js)
//   GH_TOKEN   — GitHub fine-grained token (Contents: Read and write, this repo only)
//   GH_OWNER   — GitHub username/org      GH_REPO — repo name      GH_BRANCH — e.g. main

import { ghGetSha, ghPutFile, utf8ToBase64 } from "../_lib/github.js";
import { sanitizeCategory, isValidSlug } from "../_lib/sanitize.js";
import { requireAdmin, jsonResponse as json, audit } from "../_lib/admin.js";
import { validateImageUpload, assertSafeContent, assertSafeUrls, requestTooLarge } from "../_lib/validate.js";

const TYPES = ["post", "video", "photo", "team", "event"];

export async function onRequestPost(context) {
  const { request, env } = context;

  const gate = await requireAdmin(context);
  if (gate instanceof Response) return gate;
  if (requestTooLarge(request)) return json({ ok: false, error: "That upload is too large." }, 413);

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request body." }, 400); }
  const { type, data, image, confirmOverwrite } = body || {};

  if (!env.GH_TOKEN || !env.GH_OWNER || !env.GH_REPO || !env.GH_BRANCH) {
    return json({ ok: false, error: "Server isn't configured — GH_TOKEN / GH_OWNER / GH_REPO / GH_BRANCH are missing." }, 500);
  }
  if (!TYPES.includes(type)) return json({ ok: false, error: "Unknown content type." }, 400);
  if (!data || typeof data !== "object" || Array.isArray(data) || !data.slug) {
    return json({ ok: false, error: "Missing content data or slug." }, 400);
  }
  if (!isValidSlug(data.slug)) {
    return json({ ok: false, error: "Slug can only contain lowercase letters, numbers, and single hyphens (e.g. my-article-title)." }, 400);
  }
  if (type === "post") data.category = sanitizeCategory(data.category);

  const hasUpload = image && image.base64;
  if (type === "photo" && !hasUpload && !data.image) {
    return json({ ok: false, error: "A photo post needs an actual photo — upload one or paste an image URL." }, 400);
  }
  if (type === "event" && !data.date) return json({ ok: false, error: "An event needs a date." }, 400);

  // ---- Validate the image upload by its real bytes (not its filename) ----
  let upload = null;
  if (hasUpload && type !== "video") {
    upload = validateImageUpload(image);
    if (!upload.ok) return json({ ok: false, error: upload.error }, 400);
    // The upload replaces whatever image reference the form sent.
    if (type === "team") data.photo = `images/${data.slug}.${upload.ext}`;
    else data.image = `images/${data.slug}.${upload.ext}`;
  }

  // ---- Scan the content itself ----
  try {
    if (JSON.stringify(data).length > 400000) throw new Error("That content is too large.");
    assertSafeContent(data);
    assertSafeUrls(data);
  } catch (e) {
    await audit(env, request, "publish_blocked", { type, slug: data.slug, why: String(e.message).slice(0, 120) });
    return json({ ok: false, error: e.message }, 400);
  }

  const folder = type === "post" ? "content/posts" : type === "video" ? "content/videos" : type === "photo" ? "content/photos" : type === "event" ? "content/events" : "content/team";
  const jsonPath = `${folder}/${data.slug}.json`;

  try {
    const existingSha = await ghGetSha(env, jsonPath);
    if (existingSha && !confirmOverwrite) {
      return json({ ok: false, exists: true, error: `A ${type} with the slug "${data.slug}" already exists.` }, 409);
    }
    if (upload) {
      const imagePath = type === "team" ? data.photo : data.image;
      await ghPutFile(env, imagePath, image.base64, `Add image for ${data.title || data.name || data.slug}`, await ghGetSha(env, imagePath));
    }
    const contentB64 = utf8ToBase64(JSON.stringify(data, null, 2));
    await ghPutFile(env, jsonPath, contentB64, `Publish ${type}: ${data.title || data.name || data.slug}`, existingSha);
    await audit(env, request, "publish", { type, slug: data.slug, overwrite: !!existingSha });
    return json({ ok: true, path: jsonPath });
  } catch (e) {
    return json({ ok: false, error: e.message || "Something went wrong while publishing." }, 500);
  }
}

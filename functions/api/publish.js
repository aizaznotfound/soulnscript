// Cloudflare Pages Function — POST /api/publish
// Validates the username/password, then writes files to GitHub using a
// token stored ONLY as a server-side environment variable (never sent to
// the browser). This is what makes it safe to gate with a simple
// username/password instead of a GitHub token in the browser.
//
// Required environment variables (set in Cloudflare Pages → Settings →
// Environment variables):
//   ADMIN_USERNAME   — the login username
//   ADMIN_PASSWORD   — the login password
//   GH_TOKEN         — a GitHub fine-grained personal access token
//                      (Contents: Read and write, scoped to this repo only)
//   GH_OWNER         — GitHub username/org, e.g. aizaznotfound
//   GH_REPO          — repo name, e.g. gkmctimes
//   GH_BRANCH        — branch to commit to, e.g. main

import { json } from "../_lib/auth.js";
import { ghGetSha, ghPutFile, utf8ToBase64 } from "../_lib/github.js";
import { sanitizeCategory, isValidSlug } from "../_lib/sanitize.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }

  const { username, password, type, data, image, confirmOverwrite } = body || {};

  // ---- Auth check ----
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Server isn't configured — ADMIN_USERNAME / ADMIN_PASSWORD are missing." }, 500);
  }
  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Incorrect username or password." }, 401);
  }

  if (!env.GH_TOKEN || !env.GH_OWNER || !env.GH_REPO || !env.GH_BRANCH) {
    return json({ ok: false, error: "Server isn't configured — GH_TOKEN / GH_OWNER / GH_REPO / GH_BRANCH are missing." }, 500);
  }
  if (type !== "post" && type !== "video" && type !== "photo" && type !== "team" && type !== "event") {
    return json({ ok: false, error: "Unknown content type." }, 400);
  }
  if (!data || !data.slug) {
    return json({ ok: false, error: "Missing content data or slug." }, 400);
  }
  if (!isValidSlug(data.slug)) {
    return json({ ok: false, error: "Slug can only contain lowercase letters, numbers, and single hyphens (e.g. my-article-title)." }, 400);
  }
  if (type === "post") {
    data.category = sanitizeCategory(data.category);
  }
  if (type === "photo" && !(image && image.base64 && image.filename) && !data.image) {
    return json({ ok: false, error: "A photo post needs an actual photo — upload one or paste an image URL." }, 400);
  }
  if (type === "event" && !data.date) {
    return json({ ok: false, error: "An event needs a date." }, 400);
  }

  const folder = type === "post" ? "content/posts" : type === "video" ? "content/videos" : type === "photo" ? "content/photos" : type === "event" ? "content/events" : "content/team";
  const jsonPath = `${folder}/${data.slug}.json`;

  try {
    // ---- Check for an existing file with this slug ----
    const existingSha = await ghGetSha(env, jsonPath);
    if (existingSha && !confirmOverwrite) {
      return json({ ok: false, exists: true, error: `A ${type} with the slug "${data.slug}" already exists.` }, 409);
    }

    // ---- Upload image first (posts, photos, events, and team member avatars) ----
    if ((type === "post" || type === "photo" || type === "team" || type === "event") && image && image.base64 && image.filename) {
      const ext = (image.filename.split(".").pop() || "jpg").toLowerCase();
      const imagePath = `images/${data.slug}.${ext}`;
      const imgSha = await ghGetSha(env, imagePath);
      await ghPutFile(env, imagePath, image.base64, `Add image for ${data.title || data.name || data.slug}`, imgSha);
      if (type === "team") {
        data.photo = imagePath;
      } else {
        data.image = imagePath;
      }
    }

    // ---- Write the JSON content file ----
    const contentB64 = utf8ToBase64(JSON.stringify(data, null, 2));
    await ghPutFile(env, jsonPath, contentB64, `Publish ${type}: ${data.title || data.slug}`, existingSha);

    return json({ ok: true, path: jsonPath });
  } catch (e) {
    return json({ ok: false, error: e.message || "Something went wrong while publishing." }, 500);
  }
}

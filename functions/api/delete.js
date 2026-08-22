// Cloudflare Pages Function — POST /api/delete
// Deletes a post or video from GitHub, along with every locally-hosted
// image referenced anywhere inside it (cover photo *and* any inline photos
// added to the body) — not just the cover photo. Uses the same server-side
// GH_TOKEN as publish.js — never exposed to the browser.

import { json } from "../_lib/auth.js";
import { ghGetFile, ghDeleteFile } from "../_lib/github.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }

  const { username, password, type, slug } = body || {};

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
  if (!slug) {
    return json({ ok: false, error: "Missing slug." }, 400);
  }

  const folder = type === "post" ? "content/posts" : type === "video" ? "content/videos" : type === "photo" ? "content/photos" : type === "event" ? "content/events" : "content/team";
  const jsonPath = `${folder}/${slug}.json`;

  try {
    const file = await ghGetFile(env, jsonPath);
    if (!file) {
      return json({ ok: false, error: `Couldn't find a ${type} with the slug "${slug}".` }, 404);
    }

    // Find and remove every locally-hosted image referenced anywhere in
    // this item — the cover photo *and* any inline photos in the body
    // (e.g. images/my-slug-1.jpg, images/my-slug-2.jpg from the writer's
    // inline "Add Photo" button). We scan the raw JSON text rather than
    // just the `image` field so nothing gets missed, regardless of where
    // in the structure it's referenced. External URLs (picsum.photos,
    // YouTube thumbnails, etc.) are naturally skipped since they don't
    // match this repo-relative pattern.
    let imagesRemoved = 0;
    const imagesFailed = [];
    try {
      const rawText = b64ToUtf8(file.content);
      const localImagePaths = findLocalImagePaths(rawText);
      for (const imgPath of localImagePaths) {
        try {
          const imgFile = await ghGetFile(env, imgPath);
          if (imgFile) {
            await ghDeleteFile(env, imgPath, imgFile.sha, `Remove image for deleted ${type}: ${slug}`);
            imagesRemoved++;
          }
        } catch (e) {
          // Don't let one failed image delete block the others or the article itself.
          imagesFailed.push(imgPath);
        }
      }
    } catch (e) {
      // If we can't parse/scan for images, don't block deleting the article itself.
    }

    await ghDeleteFile(env, jsonPath, file.sha, `Delete ${type}: ${slug}`);

    return json({ ok: true, imagesRemoved, imagesFailed });
  } catch (e) {
    return json({ ok: false, error: e.message || "Something went wrong while deleting." }, 500);
  }
}

// Matches repo-relative image paths like "images/my-slug.jpg" or
// "images/my-slug-2.png" wherever they appear in the JSON text — whether
// in the top-level `image` field or embedded inside a body HTML string
// like <img src="images/my-slug-1.jpg">. Returns unique paths only.
function findLocalImagePaths(rawText) {
  const matches = rawText.match(/images\/[A-Za-z0-9._-]+\.(?:jpe?g|png|gif|webp)/gi) || [];
  return [...new Set(matches)];
}

function b64ToUtf8(b64) {
  // GitHub returns base64 content with embedded newlines — strip them first.
  const clean = b64.replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

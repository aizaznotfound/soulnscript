#!/usr/bin/env node
/* =========================================================
   SOUL & SCRIPT — CONTENT BUILDER
   ---------------------------------------------------------
   This script runs automatically every time Cloudflare Pages
   builds your site (Build command: node build-content.js).

   It reads every article file in content/posts/ and every
   video file in content/videos/ and combines them into a
   single js/content.js — which is what the website actually
   reads from.

   You should never need to open or edit this file. To
   publish, use editor.html and upload the one small file it
   gives you into content/posts/ (or content/videos/) on
   GitHub. See README.md for the full walkthrough.
   ========================================================= */

const fs = require("fs");
const path = require("path");

function loadFolder(folder) {
  const dir = path.join(__dirname, folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => {
      const filePath = path.join(dir, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!data.slug) {
          console.error(`⚠️  Skipping ${folder}/${f} — missing "slug" field.`);
          return null;
        }
        return data;
      } catch (e) {
        console.error(`⚠️  Skipping ${folder}/${f} — invalid JSON (${e.message}).`);
        return null;
      }
    })
    .filter(Boolean);
}

function dedupeBySlug(items, label) {
  const seen = new Map();
  for (const item of items) {
    if (seen.has(item.slug)) {
      console.error(`⚠️  Duplicate slug "${item.slug}" found in ${label} — keeping the first one found.`);
      continue;
    }
    seen.set(item.slug, item);
  }
  return [...seen.values()];
}

let posts = loadFolder("content/posts");
let videos = loadFolder("content/videos");
let photos = loadFolder("content/photos");
let team = loadFolder("content/team");
let events = loadFolder("content/events");

posts = dedupeBySlug(posts, "content/posts").sort((a, b) => new Date(b.date) - new Date(a.date));
videos = dedupeBySlug(videos, "content/videos").sort((a, b) => new Date(b.date) - new Date(a.date));
photos = dedupeBySlug(photos, "content/photos").sort((a, b) => new Date(b.date) - new Date(a.date));
team = dedupeBySlug(team, "content/team").sort((a, b) => (a.order || 0) - (b.order || 0));
events = dedupeBySlug(events, "content/events").sort((a, b) => new Date(a.date) - new Date(b.date));

const output = `/* =========================================================
   SOUL & SCRIPT — CONTENT FILE (AUTO-GENERATED — DO NOT EDIT)
   ---------------------------------------------------------
   This file is rebuilt automatically by build-content.js from
   every file in content/posts/, content/videos/,
   content/photos/, content/team/, and content/events/ each
   time you push to GitHub. Any changes made directly to this
   file will be overwritten on the next deploy.

   To publish something new, use editor.html — see README.md.
   ========================================================= */

const POSTS = ${JSON.stringify(posts, null, 2)};

const VIDEOS = ${JSON.stringify(videos, null, 2)};

const PHOTOS = ${JSON.stringify(photos, null, 2)};

const TEAM = ${JSON.stringify(team, null, 2)};

const EVENTS = ${JSON.stringify(events, null, 2)};

// Expose globally for main.js
window.POSTS = POSTS;
window.VIDEOS = VIDEOS;
window.PHOTOS = PHOTOS;
window.TEAM = TEAM;
window.EVENTS = EVENTS;
`;

fs.mkdirSync(path.join(__dirname, "js"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "js", "content.js"), output);

console.log(`✅ Built js/content.js — ${posts.length} article(s), ${videos.length} video(s), ${photos.length} photo(s), ${team.length} team member(s), ${events.length} event(s).`);

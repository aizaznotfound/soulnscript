// Shared HTML sanitization for user-submitted rich text.
//
// This runs in the Cloudflare Workers runtime, which has no DOM/DOMParser,
// so it's a small hand-rolled allowlist tokenizer rather than a general
// HTML sanitizer library. It only needs to understand the tiny set of
// inline tags the contributor writing tool (write.html) and staff editor
// (editor.html) can produce: <strong>, <em>, <a>, <br>. Everything else —
// scripts, styles, event handler attributes, unknown tags, stray angle
// brackets — is either dropped or escaped, never passed through as-is.
//
// The browser-side twin of this function is sanitizeInlineHTML() in
// js/main.js, which cleans up formatting as someone types/pastes. This
// server-side copy is what actually matters for security: it's the last
// line of defense against a submission sent straight to /api/submit
// without going through the browser at all.

const ALLOWED_TAGS = new Set(["strong", "em", "b", "i", "a", "br"]);

export function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function sanitizeInlineHtml(input) {
  if (typeof input !== "string" || !input) return "";
  let out = "";
  let i = 0;
  const len = input.length;
  const openStack = [];

  while (i < len) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      out += escapeHtml(input.slice(i));
      break;
    }
    out += escapeHtml(input.slice(i, lt));

    const gt = input.indexOf(">", lt);
    if (gt === -1) {
      // Stray "<" with no closing bracket — treat the rest as plain text.
      out += escapeHtml(input.slice(lt));
      break;
    }

    const raw = input.slice(lt + 1, gt);
    i = gt + 1;

    const closing = raw.startsWith("/");
    const body = (closing ? raw.slice(1) : raw).trim();
    const nameMatch = body.match(/^([a-zA-Z0-9]+)/);
    if (!nameMatch) continue; // malformed tag — drop silently

    const tagName = nameMatch[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) continue; // strip any disallowed tag entirely

    const normalized = tagName === "b" ? "strong" : tagName === "i" ? "em" : tagName;

    if (normalized === "br") { out += "<br>"; continue; }

    if (closing) {
      const idx = openStack.lastIndexOf(normalized);
      if (idx === -1) continue; // stray closing tag — drop
      while (openStack.length > idx) out += `</${openStack.pop()}>`;
      continue;
    }

    if (normalized === "a") {
      const hrefMatch = body.match(/href\s*=\s*"([^"]*)"/i) || body.match(/href\s*=\s*'([^']*)'/i);
      const href = sanitizeHref(hrefMatch ? hrefMatch[1] : "");
      if (!href) continue; // no safe destination — not worth keeping as a link
      out += `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`;
      openStack.push("a");
      continue;
    }

    out += `<${normalized}>`;
    openStack.push(normalized);
  }

  while (openStack.length) out += `</${openStack.pop()}>`;
  return out;
}

function sanitizeHref(href) {
  href = (href || "").trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(href)) return href;
  return "";
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const ALLOWED_CATEGORIES = new Set(["news", "campus", "academics", "events", "opinion"]);

export function sanitizeCategory(cat) {
  return ALLOWED_CATEGORIES.has(cat) ? cat : "campus";
}

// Slugs become GitHub file paths (content/posts/{slug}.json, images/{slug}.jpg),
// so this isn't just cosmetic — an unvalidated slug containing "/" or ".."
// could write outside the intended folder. Lowercase letters, numbers, and
// single hyphens only, matching exactly what write.html/editor.html's own
// slugify() already produces.
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug) {
  return typeof slug === "string" && slug.length > 0 && slug.length <= 120 && SLUG_RE.test(slug);
}

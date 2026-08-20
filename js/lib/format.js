/* =========================================================
   SOUL & SCRIPT — js/lib/format.js
   Category labels, date formatting, HTML escaping, image MIME
   lookup. Depends on nothing. Loaded first.
   ========================================================= */

const CATEGORY_LABELS = {
  news: "Prose & Picture Stories",
  campus: "Poetry",
  academics: "Philosophy & Reflections",
  events: "Session Recaps",
  opinion: "Reader Reflections"
};

function formatDate(iso){
  const d = new Date(iso + "T00:00:00");
  if(isNaN(d.getTime())) return iso || "";
  const locale = window.SS_LANG === "ur" ? "ur-PK" : "en-US";
  return d.toLocaleDateString(locale, { day:"numeric", month:"long", year:"numeric" });
}

/* ---------- Escaping & sanitizing ----------
   Every piece of content that ends up on the site — titles, decks, author
   names, tags, captions — is stored as plain text and only ever escaped
   right here, at the point it's inserted into innerHTML. That's the one
   rule to keep in mind if you're adding a new template below: if you're
   dropping a content field into a string that becomes innerHTML, wrap it
   in escapeHtml() first. Article *body* paragraphs are the one exception —
   they're allowed to carry a small set of safe formatting tags (bold,
   italic, links), so they're sanitized once at write time instead (see
   functions/_lib/sanitize.js on the server, and sanitizeInlineHTML() below
   for the editor tools) and rendered as-is. */
function escapeHtml(str){
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const MIME_BY_EXT = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml"
};
function mimeFromFilename(filename){
  const ext = String(filename || "").split(".").pop().toLowerCase();
  return MIME_BY_EXT[ext] || "image/jpeg";
}


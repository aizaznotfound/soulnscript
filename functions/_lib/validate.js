// Upload + content validation used by publish.js, review.js and submit.js.
// The browser is never trusted: file type is decided from the file's own
// bytes (not its name), and content is scanned before it can reach GitHub.

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB per image
export const MAX_REQUEST_BYTES = 16 * 1024 * 1024; // whole request

const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Sniff the real image type from the first bytes. SVG is deliberately NOT
// allowed (it can contain scripts); neither is anything that isn't an image.
export function sniffImageExt(base64) {
  let head;
  try { head = atob(base64.slice(0, 32)); } catch (e) { return null; }
  const b = Array.from(head, (c) => c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) return "gif";
  if (head.slice(0, 4) === "RIFF" && head.slice(8, 12) === "WEBP") return "webp";
  return null;
}

// -> { ok:true, ext, bytes } | { ok:false, error }
export function validateImageUpload(img, maxBytes = MAX_IMAGE_BYTES) {
  if (!img || typeof img.base64 !== "string" || !img.base64) return { ok: false, error: "No image data." };
  const b64 = img.base64;
  if (b64.length > Math.ceil((maxBytes * 4) / 3) + 8) {
    return { ok: false, error: `That image is too large (max ${Math.round(maxBytes / 1048576)} MB).` };
  }
  if (!B64_RE.test(b64)) return { ok: false, error: "That image isn't valid image data." };
  const ext = sniffImageExt(b64);
  if (!ext) return { ok: false, error: "Only real JPG, PNG, GIF or WebP images are allowed." };
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  return { ok: true, ext, bytes };
}

// ---------- content scanning ----------
const DANGEROUS = [
  /<\s*(script|iframe|object|embed|link|meta|style|base|form|svg)\b/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i
];
const EVENT_ATTR = /\son[a-z]+\s*=/i;
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Throws an Error with a human message if anything looks like an attack.
export function assertSafeContent(value, path = "data", depth = 0) {
  if (depth > 12) throw new Error("Content is nested too deeply.");
  if (typeof value === "string") {
    if (value.length > 200000) throw new Error(`${path} is too long.`);
    for (const re of DANGEROUS) if (re.test(value)) throw new Error(`${path} contains disallowed HTML or script.`);
    if (value.includes("<") && EVENT_ATTR.test(value)) throw new Error(`${path} contains an inline event handler.`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 2000) throw new Error(`${path} has too many items.`);
    value.forEach((v, i) => assertSafeContent(v, `${path}[${i}]`, depth + 1));
    return;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      if (BAD_KEYS.has(k)) throw new Error("Content contains a forbidden key.");
      assertSafeContent(value[k], `${path}.${k}`, depth + 1);
    }
  }
}

// A URL field (image, photo, thumbnail, link) must be http(s), a mail/tel
// link (links only) or one of our own /images/... paths. Empty is fine.
export function safeUrlProblem(value, { allowMail = false } = {}) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return "must be text";
  if (/^images\/[A-Za-z0-9._-]+$/.test(value)) return "";
  if (/^https?:\/\/[^\s<>"']+$/i.test(value)) return "";
  if (allowMail && /^(mailto:|tel:)[^\s<>"']+$/i.test(value)) return "";
  return "must start with https:// (or be an uploaded image)";
}
const URL_FIELDS = { image: false, photo: false, thumbnail: false, link: true };
export function assertSafeUrls(data) {
  for (const [field, allowMail] of Object.entries(URL_FIELDS)) {
    if (field in data) {
      const p = safeUrlProblem(data[field], { allowMail });
      if (p) throw new Error(`The “${field}” link ${p}.`);
    }
  }
}

export function requestTooLarge(request, max = MAX_REQUEST_BYTES) {
  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  return len > max;
}

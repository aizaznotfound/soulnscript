// Shared helpers for the contributor account system.
// Used by register.js, contributor-login.js, submit.js, my-submissions.js,
// pending.js and review.js. Nothing here is exposed to the browser directly.

const encoder = new TextEncoder();

// ---- Password hashing (PBKDF2-SHA256, per-account random salt) ----

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export async function verifyPassword(password, saltHex, hashHex) {
  const { hash } = await hashPassword(password, saltHex);
  return timingSafeEqual(hash, hashHex);
}

// ---- Session tokens (HMAC-signed, stateless) ----
// token = base64url(username) + "." + expiryEpochSeconds + "." + hexHmac

export async function createSessionToken(env, username, days = 30) {
  if (!env.SESSION_SECRET) throw new Error("Server isn't configured — SESSION_SECRET is missing.");
  const expiry = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  const payload = `${b64url(username)}.${expiry}`;
  const sig = await hmac(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(env, token) {
  if (!env.SESSION_SECRET || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uPart, expPart, sig] = parts;
  const payload = `${uPart}.${expPart}`;
  const expected = await hmac(env.SESSION_SECRET, payload);
  if (!timingSafeEqual(sig, expected)) return null;
  const expiry = parseInt(expPart, 10);
  if (!expiry || Date.now() / 1000 > expiry) return null;
  try {
    return { username: atob(uPart.replace(/-/g, "+").replace(/_/g, "/")) };
  } catch (e) {
    return null;
  }
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

function b64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function isValidUsername(u) {
  return typeof u === "string" && /^[a-z0-9_.-]{3,24}$/i.test(u);
}

export function isValidEmail(e) {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

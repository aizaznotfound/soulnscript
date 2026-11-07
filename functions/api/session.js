// Cloudflare Pages Function — POST /api/session
// Tells editor.html whether the visitor's cookie is a valid admin session.
import { csrfProblem, getCookie, COOKIE_NAME, verifyAdminToken, jsonResponse, adminConfigured, NOT_CONFIGURED, stateKV } from "../_lib/admin.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!adminConfigured(env)) return jsonResponse({ ok: false, error: NOT_CONFIGURED }, 500);
  const csrf = csrfProblem(request);
  if (csrf) return jsonResponse({ ok: false, error: csrf }, 403);
  const s = await verifyAdminToken(env, getCookie(request, COOKIE_NAME));
  if (!s) return jsonResponse({ ok: true, loggedIn: false });
  return jsonResponse({ ok: true, loggedIn: true, username: s.user, expiresAt: s.expiresAt, hardened: !!stateKV(env) });
}

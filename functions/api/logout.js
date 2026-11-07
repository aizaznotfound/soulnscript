// Cloudflare Pages Function — POST /api/logout
// Ends the session: clears the cookie and (with KV bound) revokes the token
// so it can't be reused even if someone copied it.
import { csrfProblem, getCookie, COOKIE_NAME, verifyAdminToken, revokeAdminSession, clearCookie, jsonResponse, audit } from "../_lib/admin.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const csrf = csrfProblem(request);
  if (csrf) return jsonResponse({ ok: false, error: csrf }, 403);
  const s = await verifyAdminToken(env, getCookie(request, COOKIE_NAME));
  if (s) {
    await revokeAdminSession(env, s.jti);
    await audit(env, request, "logout");
  }
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}

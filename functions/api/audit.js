// Cloudflare Pages Function — POST /api/audit
// Admin-only: the most recent security events (logins, failed attempts,
// publishes, deletes, approvals) for the "Security log" panel in editor.html.
import { requireAdmin, listAudit, jsonResponse } from "../_lib/admin.js";

export async function onRequestPost(context) {
  const gate = await requireAdmin(context);
  if (gate instanceof Response) return gate;
  const { available, items } = await listAudit(context.env, 40);
  return jsonResponse({ ok: true, available, items });
}

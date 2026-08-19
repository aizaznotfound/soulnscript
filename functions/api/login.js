// Cloudflare Pages Function — POST /api/login
// Checks the submitted username/password against secrets set in the
// Cloudflare Pages dashboard (Settings → Environment variables).
// Nothing here is ever sent to the browser except "ok: true/false".

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { username, password } = body || {};

    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
      return json({ ok: false, error: "Server isn't configured yet — ADMIN_USERNAME / ADMIN_PASSWORD environment variables are missing." }, 500);
    }

    const valid = username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD;
    if (!valid) {
      return json({ ok: false, error: "Incorrect username or password." }, 401);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "Bad request." }, 400);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

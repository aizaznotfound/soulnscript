// Shared GitHub Contents API helpers (same approach as publish.js / delete.js).

export async function ghGetSha(env, path) {
  const res = await fetch(
    `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodePath(path)}?ref=${encodeURIComponent(env.GH_BRANCH)}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "gkmc-times-editor"
      }
    }
  );
  if (res.status === 200) {
    const data = await res.json();
    return data.sha;
  }
  return null;
}

// Like ghGetSha, but returns the full file record (including its base64
// content) rather than just the sha — used by delete.js to inspect a post's
// current image path before removing it.
export async function ghGetFile(env, path) {
  const res = await fetch(
    `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodePath(path)}?ref=${encodeURIComponent(env.GH_BRANCH)}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "gkmc-times-editor"
      }
    }
  );
  if (res.status === 200) return res.json();
  return null;
}

export async function ghDeleteFile(env, path, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodePath(path)}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${env.GH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "gkmc-times-editor"
      },
      body: JSON.stringify({ message, sha, branch: env.GH_BRANCH })
    }
  );
  if (!res.ok) {
    let msg = `GitHub error (status ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) msg = err.message;
    } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function ghPutFile(env, path, base64Content, message, sha) {
  const reqBody = { message, content: base64Content, branch: env.GH_BRANCH };
  if (sha) reqBody.sha = sha;
  const res = await fetch(
    `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodePath(path)}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "gkmc-times-editor"
      },
      body: JSON.stringify(reqBody)
    }
  );
  if (!res.ok) {
    let msg = `GitHub error (status ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) msg = err.message;
    } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

export function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/* =========================================================
   SOUL & SCRIPT — js/render/article-page.js
   Single article/video/photo detail page renderer, not-found
   state, tag helpers, related-stories strip.
   ========================================================= */

/* ---------- Article / video detail page ---------- */
function renderArticleDetail(){
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const videoSlug = params.get("video");
  const photoSlug = params.get("photo");
  const head = document.getElementById("article-head");
  const body = document.getElementById("article-body");
  const mostRead = document.getElementById("most-read-mount");

  if(videoSlug){
    const v = findVideo(videoSlug);
    if(!v){ renderNotFound(head, body); return; }
    document.title = v.title + " — Soul & Script";
    head.innerHTML = `
      <span class="tag-pill video">Video</span>
      <h1>${escapeHtml(v.title)}</h1>
      <p class="deck">${escapeHtml(v.deck)}</p>
      <div class="byline">${escapeHtml(v.author)} · ${formatDate(v.date)}</div>`;
    body.innerHTML = `
      <div style="position:relative;padding-top:56.25%;margin-bottom:24px;border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 14px 32px rgba(30,26,46,.14);">
        <iframe src="https://www.youtube.com/embed/${encodeURIComponent(v.youtubeId)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <p>${escapeHtml(v.deck)}</p>
      <div class="share-bar-mount"></div>`;
    wireShareBar(body.querySelector(".share-bar-mount"), v.title);
    if(mostRead) renderMostRead("most-read-mount", null);
    return;
  }

  if(photoSlug){
    const p = findPhoto(photoSlug);
    if(!p){ renderNotFound(head, body); return; }
    document.title = p.title + " — Soul & Script";
    head.innerHTML = `
      <span class="tag-pill">Photo</span>
      <h1>${escapeHtml(p.title)}</h1>
      ${p.caption ? `<p class="deck">${escapeHtml(p.caption)}</p>` : ""}
      <div class="byline">${escapeHtml(p.author)} · ${formatDate(p.date)}</div>`;
    body.innerHTML = `
      <figure style="margin:0 0 24px;">
        <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width:100%; border-radius: var(--radius-lg); box-shadow: 0 14px 32px rgba(30,26,46,.14); display:block;">
      </figure>
      <div class="share-bar-mount"></div>
      <div class="article-tags">${articleTagsHTML(p.tags)}</div>`;
    wireShareBar(body.querySelector(".share-bar-mount"), p.title);
    if(mostRead) renderMostRead("most-read-mount", null);
    return;
  }

  const post = findPost(slug);
  if(!post){ renderNotFound(head, body); return; }

  document.title = post.title + " — Soul & Script";
  head.innerHTML = `
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="deck">${escapeHtml(post.deck)}</p>
    <div class="byline-block">
      <div class="avatar">${escapeHtml((post.author || "?").charAt(0))}</div>
      <div>
        <div class="byline" style="margin:0;">${escapeHtml(post.author)}</div>
        <div class="byline" style="margin:0;opacity:.7;">${formatDate(post.date)} · ${escapeHtml(post.readTime)}</div>
      </div>
    </div>`;

  const figure = post.image ? `
    <figure>
      <img src="${post.image}" alt="${escapeHtml(post.title)}">
      ${post.imageCaption ? `<figcaption>${escapeHtml(post.imageCaption)}</figcaption>` : ""}
    </figure>` : "";

  // Body items are normally plain paragraph text (which may itself contain
  // safe inline formatting like <strong>/<em>/<a> — see sanitizeInlineHTML).
  // An item that is an entire block-level element on its own — "<h3>...",
  // "<figure>...", etc., as produced by the heading/photo tools — is
  // inserted as-is instead of being wrapped in a <p>. This only matches
  // known block tags, specifically so an inline-formatted paragraph that
  // happens to *start* with "<strong>" doesn't get mistaken for one.
  const RAW_BLOCK_RE = /^\s*<(h[1-6]|figure|blockquote|ul|ol|div|table)[\s>]/i;
  let dropCapUsed = false;
  const paragraphs = post.body.map((p) => {
    const isRawBlock = typeof p === "string" && RAW_BLOCK_RE.test(p);
    if (isRawBlock) return p;
    const cls = !dropCapUsed ? ' class="drop-cap"' : '';
    dropCapUsed = true;
    return `<p${cls}>${p}</p>`;
  }).join("");

  body.innerHTML = `
    ${figure}
    ${paragraphs}
    <div class="share-bar-mount"></div>
    <div class="article-tags">${articleTagsHTML(post.tags)}</div>`;
  wireShareBar(body.querySelector(".share-bar-mount"), post.title);

  if(mostRead) renderMostRead("most-read-mount", post.slug);
  renderRelated("related-mount", post);
}

function renderNotFound(head, body){
  document.title = "Story not found — Soul & Script";
  if(head) head.innerHTML = `<h1>Story Not Found</h1><p class="deck">This story may have been moved or unpublished.</p>`;
  if(body) body.innerHTML = `<div class="empty-state">Try heading back to the <a href="index.html">homepage</a> or browsing <a href="news.html">Writing</a>.</div>`;
}

/* ---------- Tags ---------- */
function allTags(){
  const counts = {};
  window.POSTS.forEach(p => (p.tags || []).forEach(t => {
    counts[t] = (counts[t] || 0) + 1;
  }));
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([tag,count]) => ({tag,count}));
}

function postsByTag(tag){
  return allPostsSorted().filter(p => (p.tags||[]).some(t => t.toLowerCase() === tag.toLowerCase()));
}

function tagCloudHTML(limit){
  const tags = allTags().slice(0, limit || 12);
  if(!tags.length) return "";
  return tags.map(t => `<a href="tag.html?tag=${encodeURIComponent(t.tag)}">${escapeHtml(t.tag)}<span class="count">${t.count}</span></a>`).join("");
}

function articleTagsHTML(tags){
  return (tags||[]).map(t => `<a href="tag.html?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join("");
}

/* ---------- Related stories ---------- */
function renderRelated(mountId, post){
  const el = document.getElementById(mountId);
  if(!el) return;
  let related = allPostsSorted().filter(p => p.slug !== post.slug && p.category === post.category);
  if(related.length < 3){
    const extra = allPostsSorted().filter(p => p.slug !== post.slug && p.category !== post.category);
    related = related.concat(extra).slice(0,3);
  } else {
    related = related.slice(0,3);
  }
  if(!related.length){ el.closest("section")?.remove(); return; }
  el.innerHTML = related.map(cardHTML).join("");
}


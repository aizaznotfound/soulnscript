/* =========================================================
   SOUL & SCRIPT — bilingual article/video/photo renderer
   ========================================================= */

function renderArticleDetail(){
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const videoSlug = params.get("video");
  const photoSlug = params.get("photo");
  const head = document.getElementById("article-head");
  const body = document.getElementById("article-body");
  const mostRead = document.getElementById("most-read-mount");

  if(videoSlug){
    const video = findVideo(videoSlug);
    if(!video){ renderNotFound(head, body); return; }
    const title = ssField(video, "title");
    const deck = ssField(video, "deck") || ssUi("ui.videoDescription");
    document.title = title + " — Soul & Script";
    head.innerHTML = `<span class="tag-pill video">${escapeHtml(ssUi("ui.video"))}</span><h1>${escapeHtml(title)}</h1><p class="deck">${escapeHtml(deck)}</p><div class="byline">${escapeHtml(ssField(video, "author"))} · ${formatDate(video.date)}</div>`;
    body.innerHTML = `<div style="position:relative;padding-top:56.25%;margin-bottom:24px;border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 14px 32px rgba(30,26,46,.14);"><iframe src="https://www.youtube.com/embed/${encodeURIComponent(video.youtubeId)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div><p>${escapeHtml(deck)}</p><div class="share-bar-mount"></div>`;
    wireShareBar(body.querySelector(".share-bar-mount"), title);
    if(mostRead) renderMostRead("most-read-mount", null);
    return;
  }

  if(photoSlug){
    const photo = findPhoto(photoSlug);
    if(!photo){ renderNotFound(head, body); return; }
    const title = ssField(photo, "title");
    const caption = ssField(photo, "caption");
    document.title = title + " — Soul & Script";
    head.innerHTML = `<span class="tag-pill">${escapeHtml(ssUi("ui.photo"))}</span><h1>${escapeHtml(title)}</h1>${caption ? `<p class="deck">${escapeHtml(caption)}</p>` : ""}<div class="byline">${escapeHtml(ssField(photo, "author"))} · ${formatDate(photo.date)}</div>`;
    body.innerHTML = `<figure style="margin:0 0 24px;"><img src="${photo.image}" alt="${escapeHtml(title)}" style="width:100%; border-radius:var(--radius-lg); box-shadow:0 14px 32px rgba(30,26,46,.14); display:block;"></figure><div class="share-bar-mount"></div><div class="article-tags">${articleTagsHTML(ssListField(photo, "tags"))}</div>`;
    wireShareBar(body.querySelector(".share-bar-mount"), title);
    if(mostRead) renderMostRead("most-read-mount", null);
    return;
  }

  const post = findPost(slug);
  if(!post){ renderNotFound(head, body); return; }
  const title = ssField(post, "title");
  const deck = ssField(post, "deck");
  document.title = title + " — Soul & Script";
  const author = ssField(post, "author");
  head.innerHTML = `<span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(ssCategory(post.category))}</span><h1>${escapeHtml(title)}</h1><p class="deck">${escapeHtml(deck)}</p><div class="byline-block"><div class="avatar">${escapeHtml((author || "?").charAt(0))}</div><div><div class="byline" style="margin:0;">${escapeHtml(author)}</div><div class="byline" style="margin:0;opacity:.7;">${formatDate(post.date)} · ${escapeHtml(ssField(post, "readTime"))}</div></div></div>`;

  const imageCaption = ssField(post, "imageCaption");
  const figure = post.image ? `<figure><img src="${post.image}" alt="${escapeHtml(title)}">${imageCaption ? `<figcaption>${escapeHtml(imageCaption)}</figcaption>` : ""}</figure>` : "";
  const rawBlockRe = /^\s*<(h[1-6]|figure|blockquote|ul|ol|div|table)[\s>]/i;
  let dropCapUsed = false;
  const paragraphs = ssListField(post, "body").map((paragraph) => {
    const isRawBlock = typeof paragraph === "string" && rawBlockRe.test(paragraph);
    if(isRawBlock) return paragraph;
    const cls = !dropCapUsed ? ' class="drop-cap"' : '';
    dropCapUsed = true;
    return `<p${cls}>${paragraph}</p>`;
  }).join("");

  body.innerHTML = `${figure}${paragraphs}<div class="share-bar-mount"></div><div class="article-tags">${articleTagsHTML(ssListField(post, "tags"))}</div>`;
  wireShareBar(body.querySelector(".share-bar-mount"), title);
  if(mostRead) renderMostRead("most-read-mount", post.slug);
  renderRelated("related-mount", post);
}

function renderNotFound(head, body){
  document.title = ssUi("ui.storyNotFound") + " — Soul & Script";
  if(head) head.innerHTML = `<h1>${escapeHtml(ssUi("ui.storyNotFound"))}</h1><p class="deck">${escapeHtml(ssUi("ui.storyNotFoundDescription"))}</p>`;
  if(body) body.innerHTML = `<div class="empty-state">${escapeHtml(ssUi("ui.tryHomeWriting"))}</div>`;
}

function allTags(){
  const counts = {};
  window.POSTS.forEach(post => ssListField(post, "tags").forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }));
  return Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([tag,count]) => ({tag,count}));
}

function postsByTag(tag){
  return allPostsSorted().filter(post => ssListField(post, "tags").some(item => item.toLowerCase() === tag.toLowerCase()));
}

function tagCloudHTML(limit){
  const tags = allTags().slice(0, limit || 12);
  if(!tags.length) return "";
  return tags.map(item => `<a href="tag.html?tag=${encodeURIComponent(item.tag)}">${escapeHtml(item.tag)}<span class="count">${item.count}</span></a>`).join("");
}

function articleTagsHTML(tags){
  return (tags || []).map(tag => `<a href="tag.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join("");
}

function renderRelated(mountId, post){
  const el = document.getElementById(mountId);
  if(!el) return;
  let related = allPostsSorted().filter(item => item.slug !== post.slug && item.category === post.category);
  if(related.length < 3){
    const extra = allPostsSorted().filter(item => item.slug !== post.slug && item.category !== post.category);
    related = related.concat(extra).slice(0,3);
  } else related = related.slice(0,3);
  if(!related.length){ el.closest("section")?.remove(); return; }
  el.innerHTML = related.map(cardHTML).join("");
}

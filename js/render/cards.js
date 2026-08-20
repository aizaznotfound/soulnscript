/* =========================================================
   SOUL & SCRIPT — js/render/cards.js
   Shared content card factories with bilingual field selection.
   ========================================================= */

function pulseRuleSVG(thin){
  return `<svg class="pulse-rule${thin ? ' thin' : ''}" viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,11 L520,11 C538,11 542,2 558,2 C574,2 578,20 594,20 C610,20 614,11 632,11 L1200,11" />
  </svg>`;
}
function mountPulseRules(){
  document.querySelectorAll(".pulse-rule-mount").forEach(el => {
    el.innerHTML = pulseRuleSVG(el.dataset.thin === "true");
  });
}

function cardHTML(post){
  const title = escapeHtml(ssField(post, "title"));
  const deck = escapeHtml(ssField(post, "deck"));
  const author = escapeHtml(ssField(post, "author"));
  const thumb = post.image ? `<a href="article.html?slug=${post.slug}"><img src="${post.image}" alt="${title}" loading="lazy"></a>` : "";
  return `
  <article class="card${post.image ? "" : " no-image"}">
    ${thumb}
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(ssCategory(post.category))}</span>
    <h3><a href="article.html?slug=${post.slug}">${title}</a></h3>
    <p>${deck}</p>
    <div class="meta">${author} · ${formatDate(post.date)}</div>
  </article>`;
}

function sideCardHTML(post){
  const title = escapeHtml(ssField(post, "title"));
  const deck = escapeHtml(ssField(post, "deck"));
  const author = escapeHtml(ssField(post, "author"));
  return `
  <div class="side-card">
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(ssCategory(post.category))}</span>
    <h3><a href="article.html?slug=${post.slug}">${title}</a></h3>
    <p class="deck-sm">${deck}</p>
    <div class="meta byline">${author} · ${formatDate(post.date)}</div>
  </div>`;
}

function heroHTML(post){
  const title = escapeHtml(ssField(post, "title"));
  const deck = escapeHtml(ssField(post, "deck"));
  const author = escapeHtml(ssField(post, "author"));
  const media = post.image ? `
  <div class="hero-media">
    <img src="${post.image}" alt="${title}">
    ${post.imageCaption ? `<figcaption>${escapeHtml(ssField(post, "imageCaption"))}</figcaption>` : ""}
  </div>` : "";
  return `
  ${media}
  <div class="hero-copy${post.image ? "" : " full-width"}">
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(ssCategory(post.category))}</span>
    <h1 class="headline"><a href="article.html?slug=${post.slug}">${title}</a></h1>
    <p class="deck">${deck}</p>
    <div class="byline">${author} · ${formatDate(post.date)} · ${escapeHtml(ssField(post, "readTime"))}</div>
  </div>`;
}

function videoCardHTML(video){
  const title = escapeHtml(ssField(video, "title"));
  const deck = escapeHtml(ssField(video, "deck"));
  const author = escapeHtml(ssField(video, "author"));
  return `
  <article class="card video-card">
    <a href="article.html?video=${video.slug}">
      <div class="thumb">
        <img src="${video.thumbnail}" alt="${title}" loading="lazy">
        <div class="play"><span>${escapeHtml(ssUi("ui.play"))}</span></div>
      </div>
    </a>
    <span class="tag-pill video">${escapeHtml(ssUi("ui.video"))}</span>
    <h3><a href="article.html?video=${video.slug}">${title}</a></h3>
    <p>${deck}</p>
    <div class="meta">${author} · ${formatDate(video.date)}</div>
  </article>`;
}

function photoCardHTML(photo){
  const title = escapeHtml(ssField(photo, "title"));
  return `
  <a class="photo-tile" href="article.html?photo=${photo.slug}">
    <img src="${photo.image}" alt="${title}" loading="lazy">
    <div class="pt-body">
      <h4>${title}</h4>
      <div class="meta">${formatDate(photo.date)}</div>
    </div>
  </a>`;
}

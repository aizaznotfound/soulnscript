/* =========================================================
   SOUL & SCRIPT — js/render/cards.js
   Pulse-rule SVG mount + every card/hero/tile template:
   cardHTML, sideCardHTML, heroHTML, videoCardHTML, photoCardHTML.
   ========================================================= */

/* ---------- Pulse-rule signature SVG (ECG line) ---------- */
function pulseRuleSVG(thin){
  // A gentle pen-flourish swash across the rule line (replaces the old EKG-style
  // spike that made sense for a medical-college paper but not for an arts hub).
  return `<svg class="pulse-rule${thin ? ' thin' : ''}" viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,11 L520,11 C538,11 542,2 558,2 C574,2 578,20 594,20 C610,20 614,11 632,11 L1200,11" />
  </svg>`;
}
function mountPulseRules(){
  document.querySelectorAll(".pulse-rule-mount").forEach(el => {
    el.innerHTML = pulseRuleSVG(el.dataset.thin === "true");
  });
}

/* ---------- Card / hero templates ---------- */
function cardHTML(post){
  const title = escapeHtml(post.title), deck = escapeHtml(post.deck), author = escapeHtml(post.author);
  const thumb = post.image ? `<a href="article.html?slug=${post.slug}"><img src="${post.image}" alt="${title}" loading="lazy"></a>` : "";
  return `
  <article class="card${post.image ? "" : " no-image"}">
    ${thumb}
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
    <h3><a href="article.html?slug=${post.slug}">${title}</a></h3>
    <p>${deck}</p>
    <div class="meta">${author} · ${formatDate(post.date)}</div>
  </article>`;
}

function sideCardHTML(post){
  const title = escapeHtml(post.title), deck = escapeHtml(post.deck), author = escapeHtml(post.author);
  return `
  <div class="side-card">
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
    <h3><a href="article.html?slug=${post.slug}">${title}</a></h3>
    <p class="deck-sm">${deck}</p>
    <div class="meta byline">${author} · ${formatDate(post.date)}</div>
  </div>`;
}

function heroHTML(post){
  const title = escapeHtml(post.title), deck = escapeHtml(post.deck), author = escapeHtml(post.author);
  const media = post.image ? `
  <div class="hero-media">
    <img src="${post.image}" alt="${title}">
    ${post.imageCaption ? `<figcaption>${escapeHtml(post.imageCaption)}</figcaption>` : ""}
  </div>` : "";
  return `
  ${media}
  <div class="hero-copy${post.image ? "" : " full-width"}">
    <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
    <h1 class="headline"><a href="article.html?slug=${post.slug}">${title}</a></h1>
    <p class="deck">${deck}</p>
    <div class="byline">${author} · ${formatDate(post.date)} · ${escapeHtml(post.readTime)}</div>
  </div>`;
}

function videoCardHTML(v){
  const title = escapeHtml(v.title), deck = escapeHtml(v.deck), author = escapeHtml(v.author);
  return `
  <article class="card video-card">
    <a href="article.html?video=${v.slug}">
      <div class="thumb">
        <img src="${v.thumbnail}" alt="${title}" loading="lazy">
        <div class="play"><span>Play</span></div>
      </div>
    </a>
    <span class="tag-pill video">Video</span>
    <h3><a href="article.html?video=${v.slug}">${title}</a></h3>
    <p>${deck}</p>
    <div class="meta">${author} · ${formatDate(v.date)}</div>
  </article>`;
}

/* ---------- Photo post card (gallery grid) ---------- */
function photoCardHTML(p){
  const title = escapeHtml(p.title);
  return `
  <a class="photo-tile" href="article.html?photo=${p.slug}">
    <img src="${p.image}" alt="${title}" loading="lazy">
    <div class="pt-body">
      <h4>${title}</h4>
      <div class="meta">${formatDate(p.date)}</div>
    </div>
  </a>`;
}


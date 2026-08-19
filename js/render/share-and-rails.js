/* =========================================================
   SOUL & SCRIPT — js/render/share-and-rails.js
   Share bar (Facebook/X/WhatsApp/Copy Link), compact strip rows,
   Editor's Picks + photo rail cards, mega-menu content builder.
   ========================================================= */

/* ---------- Share bar ----------
   Built without any inline onclick/attribute interpolation — the title is
   only ever handed to addEventListener closures, never dropped into an
   HTML string, so there's no attribute-escaping tightrope to walk. */
function shareBarMarkup(){
  return `
  <div class="share-bar">
    <span class="label">Share:</span>
    <a href="#" class="share-fb">Facebook</a>
    <a href="#" class="share-x">X / Twitter</a>
    <a href="#" class="share-wa">WhatsApp</a>
    <button type="button" class="share-copy">Copy Link</button>
  </div>`;
}
function wireShareBar(mount, title){
  if(!mount) return;
  mount.innerHTML = shareBarMarkup();
  const pageUrl = () => location.href;
  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");
  const fb = mount.querySelector(".share-fb");
  const x = mount.querySelector(".share-x");
  const wa = mount.querySelector(".share-wa");
  const copyBtn = mount.querySelector(".share-copy");
  if(fb) fb.addEventListener("click", (e) => { e.preventDefault(); open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageUrl())); });
  if(x) x.addEventListener("click", (e) => { e.preventDefault(); open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(title || "") + "&url=" + encodeURIComponent(pageUrl())); });
  if(wa) wa.addEventListener("click", (e) => { e.preventDefault(); open("https://wa.me/?text=" + encodeURIComponent((title || "") + " " + pageUrl())); });
  if(copyBtn) copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(pageUrl()).then(() => {
      const original = "Copy Link";
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = original; }, 1500);
    });
  });
}

/* ---------- Strip row (compact category list) ---------- */
function stripRowHTML(post){
  const title = escapeHtml(post.title);
  const thumb = post.image ? `<a href="article.html?slug=${post.slug}"><img src="${post.image}" alt="${title}" loading="lazy"></a>` : "";
  return `
  <div class="strip-row${post.image ? "" : " no-image"}">
    ${thumb}
    <div class="sr-body">
      <h4><a href="article.html?slug=${post.slug}">${title}</a></h4>
      <div class="meta">${formatDate(post.date)}</div>
    </div>
  </div>`;
}

/* ---------- Editor's Picks rail card ---------- */
function railCardHTML(post){
  const thumb = post.image ? `<img src="${post.image}" alt="${escapeHtml(post.title)}" loading="lazy">` : "";
  return `
  <a class="rail-card${post.image ? "" : " no-image"}" href="article.html?slug=${post.slug}">
    ${thumb}
    <div class="rc-body">
      <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}" style="font-size:10.5px;">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
      <h4>${escapeHtml(post.title)}</h4>
      <div class="meta" style="font-family:var(--utility); font-size:11px; color:var(--steel); text-transform:uppercase;">${formatDate(post.date)}</div>
    </div>
  </a>`;
}

/* ---------- Photo post rail card (homepage "Campus in Pictures") ---------- */
function photoRailCardHTML(p){
  return `
  <a class="rail-card photo-rail-card" href="article.html?photo=${p.slug}">
    <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy">
    <div class="rc-body">
      <h4>${escapeHtml(p.title)}</h4>
      <div class="meta" style="font-family:var(--utility); font-size:11px; color:var(--steel); text-transform:uppercase;">${formatDate(p.date)}</div>
    </div>
  </a>`;
}

/* ---------- Mega-menu content ---------- */
function megaStoryHTML(post){
  return `<div class="mega-story"><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a><div class="meta">${formatDate(post.date)}</div></div>`;
}

function mountMegaMenus(){
  const newsMega = document.getElementById("mega-news");
  if(newsMega){
    const latest = postsByCategory("news").concat(postsByCategory("campus")).concat(postsByCategory("academics")).concat(postsByCategory("events"));
    const sorted = latest.sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,3);
    newsMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links">
          <h6>Sections</h6>
          <ul>
            <li><a href="news.html">All Writing</a></li>
            <li><a href="news.html?cat=news">Prose &amp; Picture Stories</a></li>
            <li><a href="news.html?cat=campus">Poetry</a></li>
            <li><a href="news.html?cat=academics">Philosophy &amp; Reflections</a></li>
            <li><a href="news.html?cat=events">Session Recaps</a></li>
            <li><a href="opinions.html">Reader Reflections</a></li>
          </ul>
        </div>
        <div class="mega-stories">
          <h6>Latest</h6>
          ${sorted.map(megaStoryHTML).join("")}
        </div>
      </div>`;
  }
  const opMega = document.getElementById("mega-opinions");
  if(opMega){
    const sorted = postsByCategory("opinion").slice(0,3);
    opMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links">
          <h6>Reflections</h6>
          <ul><li><a href="opinions.html">All Reflections</a></li></ul>
        </div>
        <div class="mega-stories">
          <h6>Recent Pieces</h6>
          ${sorted.length ? sorted.map(megaStoryHTML).join("") : '<p style="font-family:var(--utility); font-size:13px; color:var(--steel);">Nothing here yet.</p>'}
        </div>
      </div>`;
  }
  const vidMega = document.getElementById("mega-videos");
  if(vidMega){
    const sorted = [...window.VIDEOS].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,3);
    vidMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links">
          <h6>Films &amp; Talks</h6>
          <ul><li><a href="videos.html">All Films &amp; Talks</a></li></ul>
        </div>
        <div class="mega-stories">
          <h6>Latest Uploads</h6>
          ${sorted.map(v => `<div class="mega-story"><a href="article.html?video=${v.slug}">${escapeHtml(v.title)}</a><div class="meta">${formatDate(v.date)}</div></div>`).join("")}
        </div>
      </div>`;
  }
  const photoMega = document.getElementById("mega-photos");
  if(photoMega){
    const sorted = allPhotosSorted().slice(0,3);
    photoMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links">
          <h6>Gallery</h6>
          <ul><li><a href="photos.html">All Gallery</a></li></ul>
        </div>
        <div class="mega-stories">
          <h6>Latest Additions</h6>
          ${sorted.length ? sorted.map(p => `<div class="mega-story"><a href="article.html?photo=${p.slug}">${escapeHtml(p.title)}</a><div class="meta">${formatDate(p.date)}</div></div>`).join("") : '<p style="font-family:var(--utility); font-size:13px; color:var(--steel);">No pieces yet.</p>'}
        </div>
      </div>`;
  }
}


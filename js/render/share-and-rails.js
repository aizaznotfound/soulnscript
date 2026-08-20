/* =========================================================
   SOUL & SCRIPT — js/render/share-and-rails.js
   Bilingual share bar, strips, rails, and mega-menu content.
   ========================================================= */

function shareBarMarkup(){
  return `
  <div class="share-bar">
    <span class="label">${escapeHtml(ssUi("ui.share"))}</span>
    <a href="#" class="share-fb">${escapeHtml(ssUi("ui.facebook"))}</a>
    <a href="#" class="share-x">${escapeHtml(ssUi("ui.twitter"))}</a>
    <a href="#" class="share-wa">${escapeHtml(ssUi("ui.whatsapp"))}</a>
    <button type="button" class="share-copy">${escapeHtml(ssUi("ui.copyLink"))}</button>
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
      copyBtn.textContent = ssUi("ui.copied");
      setTimeout(() => { copyBtn.textContent = ssUi("ui.copyLink"); }, 1500);
    });
  });
}

function stripRowHTML(post){
  const title = escapeHtml(ssField(post, "title"));
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

function railCardHTML(post){
  const title = escapeHtml(ssField(post, "title"));
  const thumb = post.image ? `<img src="${post.image}" alt="${title}" loading="lazy">` : "";
  return `
  <a class="rail-card${post.image ? "" : " no-image"}" href="article.html?slug=${post.slug}">
    ${thumb}
    <div class="rc-body">
      <span class="tag-pill ${post.category === 'opinion' ? 'opinion' : ''}" style="font-size:10.5px;">${escapeHtml(ssCategory(post.category))}</span>
      <h4>${title}</h4>
      <div class="meta">${formatDate(post.date)}</div>
    </div>
  </a>`;
}

function photoRailCardHTML(photo){
  const title = escapeHtml(ssField(photo, "title"));
  return `
  <a class="rail-card photo-rail-card" href="article.html?photo=${photo.slug}">
    <img src="${photo.image}" alt="${title}" loading="lazy">
    <div class="rc-body">
      <h4>${title}</h4>
      <div class="meta">${formatDate(photo.date)}</div>
    </div>
  </a>`;
}

function megaStoryHTML(post){
  return `<div class="mega-story"><a href="article.html?slug=${post.slug}">${escapeHtml(ssField(post, "title"))}</a><div class="meta">${formatDate(post.date)}</div></div>`;
}

function mountMegaMenus(){
  const newsMega = document.getElementById("mega-news");
  if(newsMega){
    const latest = postsByCategory("news").concat(postsByCategory("campus")).concat(postsByCategory("academics")).concat(postsByCategory("events"));
    const sorted = latest.sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,3);
    newsMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links">
          <h6>${escapeHtml(ssUi("nav.writing"))}</h6>
          <ul>
            <li><a href="news.html">${escapeHtml(ssUi("writing.everything"))}</a></li>
            <li><a href="news.html?cat=news">${escapeHtml(ssUi("writing.prose"))}</a></li>
            <li><a href="news.html?cat=campus">${escapeHtml(ssUi("writing.poetry"))}</a></li>
            <li><a href="news.html?cat=academics">${escapeHtml(ssUi("writing.philosophy"))}</a></li>
            <li><a href="news.html?cat=events">${escapeHtml(ssUi("writing.recaps"))}</a></li>
            <li><a href="opinions.html">${escapeHtml(ssUi("nav.manifesto"))}</a></li>
          </ul>
        </div>
        <div class="mega-stories">
          <h6>${escapeHtml(ssUi("ui.readMore"))}</h6>
          ${sorted.map(megaStoryHTML).join("")}
        </div>
      </div>`;
  }
  const vidMega = document.getElementById("mega-videos");
  if(vidMega){
    const sorted = [...window.VIDEOS].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,3);
    vidMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links"><h6>${escapeHtml(ssUi("nav.films"))}</h6><ul><li><a href="videos.html">${escapeHtml(ssUi("ui.allFilms"))}</a></li></ul></div>
        <div class="mega-stories"><h6>${escapeHtml(ssUi("ui.readMore"))}</h6>${sorted.map(v => `<div class="mega-story"><a href="article.html?video=${v.slug}">${escapeHtml(ssField(v, "title"))}</a><div class="meta">${formatDate(v.date)}</div></div>`).join("")}</div>
      </div>`;
  }
  const photoMega = document.getElementById("mega-photos");
  if(photoMega){
    const sorted = allPhotosSorted().slice(0,3);
    photoMega.innerHTML = `
      <div class="mega-cols">
        <div class="mega-links"><h6>${escapeHtml(ssUi("nav.gallery"))}</h6><ul><li><a href="photos.html">${escapeHtml(ssUi("ui.allGallery"))}</a></li></ul></div>
        <div class="mega-stories"><h6>${escapeHtml(ssUi("ui.readMore"))}</h6>${sorted.length ? sorted.map(p => `<div class="mega-story"><a href="article.html?photo=${p.slug}">${escapeHtml(ssField(p, "title"))}</a><div class="meta">${formatDate(p.date)}</div></div>`).join("") : `<p>${escapeHtml(ssUi("ui.noPhotos"))}</p>`}</div>
      </div>`;
  }
}

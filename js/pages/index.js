/* =========================================================
   SOUL & SCRIPT — js/pages/index.js
   Homepage: hero plate, the four doors, one block per room,
   events strip. Everything is driven by window.POSTS/PHOTOS/
   VIDEOS/EVENTS from js/content.js.
   ========================================================= */
(function(){
  const $ = (id) => document.getElementById(id);
  const empty = (msg) => `<div class="empty-state">${escapeHtml(msg || ssUi("ui.noStories"))}</div>`;
  const posts = allPostsSorted();
  const photos = allPhotosSorted();

  /* ----- Hero plate: newest artwork, else the lead story's image ----- */
  const plate = $("hero-plate");
  const leadPost = posts.find(p => p.featured && p.image) || posts.find(p => p.image);
  const heroItem = photos[0]
    ? { img: photos[0].image, title: ssField(photos[0], "title"), sub: `${ssUi("room.art.name")} · ${formatDate(photos[0].date)}`, href: `article.html?photo=${photos[0].slug}` }
    : leadPost
      ? { img: leadPost.image, title: ssField(leadPost, "title"), sub: `${ssCategory(leadPost.category)} · ${formatDate(leadPost.date)}`, href: `article.html?slug=${leadPost.slug}` }
      : null;
  if(plate){
    if(heroItem){
      plate.innerHTML = `<a href="${heroItem.href}"><div class="plate-frame"><img src="${heroItem.img}" alt="${escapeHtml(heroItem.title)}"></div>
        <figcaption class="plaque"><b>${escapeHtml(heroItem.title)}</b>${escapeHtml(heroItem.sub)}</figcaption></a>`;
    } else { plate.remove(); document.querySelector(".hero").style.gridTemplateColumns = "1fr"; }
  }

  /* ----- The four doors ----- */
  $("doors").innerHTML = ROOM_ORDER.map(k => {
    const first = roomItems(k)[0];
    const latest = first ? ssField(first, "title") : "";
    return `
    <a class="door room-${k}" href="${ROOMS[k].page}">
      <div class="top"><div class="num">${ROOMS[k].num}</div>${roomIconSVG(k)}</div>
      <div>
        <h3>${escapeHtml(ssUi(`room.${k}.name`))}</h3>
        <p class="d">${escapeHtml(ssUi(`room.${k}.desc`))}</p>
        ${latest ? `<div class="latest"><b>${escapeHtml(ssUi("home.latest"))}</b>${escapeHtml(latest)}</div>` : ""}
        <div class="go"><span>${pieceCount(k)}</span><span>→</span></div>
      </div>
    </a>`;
  }).join("");

  /* ----- I · Literature ----- */
  const lit = postsInRoom("lit");
  if(!lit.length){ $("home-lit").innerHTML = empty(); }
  else {
    const lead = lit.find(p => p.featured) || lit[0];
    const rest = lit.filter(p => p.slug !== lead.slug).slice(0, 3);
    $("home-lit").innerHTML = `
    <div class="lit-grid">
      <article class="lit-lead">
        ${lead.image ? `<a href="article.html?slug=${lead.slug}"><img src="${lead.image}" alt="${escapeHtml(ssField(lead, "title"))}"></a>` : ""}
        <span class="tag-pill">${escapeHtml(ssCategory(lead.category))}</span>
        <h3><a href="article.html?slug=${lead.slug}">${escapeHtml(ssField(lead, "title"))}</a></h3>
        <p class="deck">${escapeHtml(ssField(lead, "deck"))}</p>
        <div class="meta">${escapeHtml(ssField(lead, "author"))} · ${formatDate(lead.date)}</div>
      </article>
      <ul class="reading">${rest.map(readingItemHTML).join("")}</ul>
    </div>`;
  }

  /* ----- II · Art ----- */
  $("home-art").innerHTML = photos.length >= 3
    ? `<div class="salon">${photos.slice(0, 3).map(plateHTML).join("")}</div>`
    : photos.length ? `<div class="plates">${photos.map(plateHTML).join("")}</div>` : empty(ssUi("ui.noPhotos"));

  /* ----- III · Philosophy ----- */
  const phil = postsInRoom("phil").slice(0, 3);
  $("home-phil").innerHTML = phil.length ? `<ul class="thoughts">${phil.map(thoughtHTML).join("")}</ul>` : empty();

  /* ----- IV · Cinema ----- */
  const films = roomItems("cin");
  $("home-cin").innerHTML = screenHTML(films[0]) +
    (films.length > 1 ? `<div class="reel">${films.slice(1, 4).map(videoCardHTML).join("")}</div>` : "");

  /* ----- Stats ribbon ----- */
  const stats = $("home-stats");
  if(stats){
    const films = roomItems("cin").length;
    const nums = [[posts.length, "stat.written"], [photos.length, "stat.artworks"], [allVoices().length, "stat.voices"],
                  films ? [films, "stat.films"] : [ROOM_ORDER.length, "stat.rooms"]];
    stats.innerHTML = nums.map(([n, k]) => `<li><b>${n}</b><span>${escapeHtml(ssUi(k))}</span></li>`).join("");
  }

  /* ----- Fresh across the house + voices ----- */
  const fresh = $("home-fresh");
  if(fresh) fresh.innerHTML = `<ul>${houseFeed().slice(0, 6).map(ledgerRowHTML).join("")}</ul>`;
  const vs = $("home-voices");
  if(vs) vs.innerHTML = allVoices().slice(0, 10).map(v =>
    `<a href="voices.html#${v.slug}">${avatarHTML(v.name)}<span>${escapeHtml(v.name)} <small>${v.pieces.length}</small></span></a>`).join("");

  /* ----- Events strip ----- */
  const active = activeEventsSorted();
  $("home-events-body").innerHTML = active.length
    ? active.slice(0, 2).map(e => `<p><b>${escapeHtml(ssUi("home.eventsOpen"))}:</b> ${escapeHtml(ssField(e, "title"))} — ${formatDate(e.date)}</p>`).join("")
    : `<p>${escapeHtml(ssUi("home.eventsNone"))}</p>`;
})();

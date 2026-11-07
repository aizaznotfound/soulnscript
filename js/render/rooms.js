/* =========================================================
   SOUL & SCRIPT — js/render/rooms.js
   The four rooms (Literature, Art, Philosophy, Cinema):
   which content belongs to which room, and how each room
   draws its pieces. Loaded after cards.js.
   ========================================================= */

const ROOMS = {
  lit:  { num: "I",   page: "literature.html", cats: ["news", "campus"] },
  art:  { num: "II",  page: "art.html" },
  phil: { num: "III", page: "philosophy.html", cats: ["academics", "opinion"] },
  cin:  { num: "IV",  page: "cinema.html" }
};
const ROOM_ORDER = ["lit", "art", "phil", "cin"];

function roomOfCategory(cat){
  if(ROOMS.lit.cats.includes(cat)) return "lit";
  if(ROOMS.phil.cats.includes(cat)) return "phil";
  return "events";
}
function postsInRoom(key){
  const cats = (ROOMS[key] && ROOMS[key].cats) || [];
  return allPostsSorted().filter(p => cats.includes(p.category));
}
function roomItems(key){
  if(key === "art") return allPhotosSorted();
  if(key === "cin") return [...(window.VIDEOS || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  return postsInRoom(key);
}
function pieceCount(key){
  const n = roomItems(key).length;
  if(!n) return ssUi("ui.soon");
  return `${n} ${ssUi(n === 1 ? "ui.piece" : "ui.pieces")}`;
}

/* Framed artwork with a museum-style caption plaque */
function plateHTML(photo){
  const title = escapeHtml(ssField(photo, "title"));
  return `
  <a class="plate" href="article.html?photo=${photo.slug}">
    <div class="plate-frame"><img src="${escapeHtml(photo.image)}" alt="${title}" loading="lazy"></div>
    <div class="plaque"><b>${title}</b>${escapeHtml(ssField(photo, "author"))} · ${formatDate(photo.date)}</div>
  </a>`;
}

/* One line in a reading list */
function readingItemHTML(post){
  const title = escapeHtml(ssField(post, "title"));
  return `
  <li>
    <span class="tag-pill">${escapeHtml(ssCategory(post.category))}</span>
    <h4><a href="article.html?slug=${post.slug}">${title}</a></h4>
    <p>${escapeHtml(ssField(post, "deck"))}</p>
    <div class="meta">${escapeHtml(ssField(post, "author"))} · ${formatDate(post.date)}</div>
  </li>`;
}

/* A numbered argument in the Philosophy room */
function thoughtHTML(post, i){
  const title = escapeHtml(ssField(post, "title"));
  return `
  <li>
    <div class="n">${String(i + 1).padStart(2, "0")}</div>
    <div>
      <span class="tag-pill ${post.category === "opinion" ? "opinion" : ""}">${escapeHtml(ssCategory(post.category))}</span>
      <h4><a href="article.html?slug=${post.slug}">${title}</a></h4>
      <p>${escapeHtml(ssField(post, "deck"))}</p>
    </div>
    <div class="meta">${escapeHtml(ssField(post, "author"))}<br>${formatDate(post.date)}</div>
  </li>`;
}

/* Cinema screen: the newest film, or an invitation when there are none */
function screenHTML(video){
  if(!video){
    return `
    <div class="screen"><div class="in">
      <h3>${escapeHtml(ssUi("cinema.emptyTitle"))}</h3>
      <p>${escapeHtml(ssUi("cinema.emptyBody"))}</p>
      <a class="btn sm" href="contribute.html">${escapeHtml(ssUi("cinema.emptyCta"))}</a>
    </div></div>`;
  }
  const title = escapeHtml(ssField(video, "title"));
  return `
  <a class="screen" href="article.html?video=${video.slug}">
    <img src="${escapeHtml(video.thumbnail)}" alt="">
    <div class="in"><h3>${title}</h3><p>${escapeHtml(ssField(video, "deck"))}</p><span class="btn sm">${escapeHtml(ssUi("ui.play"))}</span></div>
  </a>`;
}

/* ---------- v3 helpers: pages per room, voices, everything-in-one-feed ---------- */
const ROOM_PAGE = { lit: "literature.html", art: "art.html", phil: "philosophy.html", cin: "cinema.html", events: "session-notes.html" };
function roomName(key){ return key === "events" ? ssUi("explore.sessions") : ssUi(`room.${key}.name`); }

function authorName(raw){
  let s = String(raw || "").trim();
  s = s.split(/\s+[-–—]\s+/)[0];
  s = s.replace(/\s+(?:\d+(?:st|nd|rd|th)\b|final\b|MBBS|BDS|GKMC|SMC|BKMC|KMC|student\b).*$/i, "");
  return s.trim() || String(raw || "").trim();
}
function voiceSlug(name){
  return String(name).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "");
}
function pieceHref(kind, item){
  return kind === "photo" ? `article.html?photo=${item.slug}` : kind === "video" ? `article.html?video=${item.slug}` : `article.html?slug=${item.slug}`;
}
/* Every piece in the house as one normalised, newest-first list */
function houseFeed(){
  const out = [];
  allPostsSorted().forEach(p => out.push({ kind: "post", room: roomOfCategory(p.category), item: p }));
  allPhotosSorted().forEach(p => out.push({ kind: "photo", room: "art", item: p }));
  (window.VIDEOS || []).forEach(v => out.push({ kind: "video", room: "cin", item: v }));
  return out.sort((a, b) => new Date(b.item.date) - new Date(a.item.date));
}
function allVoices(){
  const map = new Map();
  houseFeed().forEach(({ kind, room, item }) => {
    const raw = ssField(item, "author"); if(!raw) return;
    const name = authorName(raw), k = voiceSlug(name) || name;
    if(!map.has(k)) map.set(k, { slug: k, name, affil: "", pieces: [], rooms: new Set() });
    const v = map.get(k);
    v.pieces.push({ kind, room, item }); v.rooms.add(room);
    if(raw !== name && raw.length > v.affil.length) v.affil = raw;
  });
  return [...map.values()].sort((a, b) => b.pieces.length - a.pieces.length || a.name.localeCompare(b.name));
}
function avatarHTML(name){ return `<div class="avatar" aria-hidden="true">${escapeHtml((name || "?").trim().charAt(0))}</div>`; }

/* One row of the ledger (Library + home) */
function ledgerRowHTML(entry){
  const { kind, room, item } = entry;
  const label = kind === "post" ? ssCategory(item.category) : roomName(room);
  return `
  <li class="room-${room}">
    <time datetime="${item.date}">${formatDate(item.date)}</time>
    <div>
      <h4><a href="${pieceHref(kind, item)}">${escapeHtml(ssField(item, "title"))}</a></h4>
      ${kind === "post" ? `<p>${escapeHtml(ssField(item, "deck"))}</p>` : ""}
      <div class="meta">${escapeHtml(ssField(item, "author"))}${item.readTime ? " · " + escapeHtml(ssField(item, "readTime")) : ""}</div>
    </div>
    <span class="chip room-${room}">${escapeHtml(label)}</span>
  </li>`;
}

/* Line icons for the four rooms (24x24, inherit colour) */
const ROOM_ICONS = {
  lit:  '<path d="M3 5.5C5.5 4.5 8.5 4.5 12 6c3.5-1.5 6.5-1.5 9-.5V19c-2.5-1-5.5-1-9 .5-3.5-1.5-6.5-1.5-9-.5z"/><path d="M12 6v13.5"/>',
  art:  '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
  phil: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  cin:  '<path d="M3 10h18v10H3z"/><path d="M3 10l2-5h16l-2 5M8 5l-2 5M13 5l-2 5M18 5l-2 5"/>'
};
function roomIconSVG(key){
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ROOM_ICONS[key] || ""}</svg>`;
}

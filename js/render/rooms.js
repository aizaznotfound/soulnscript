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
    <div class="plate-frame"><img src="${photo.image}" alt="${title}" loading="lazy"></div>
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
    <img src="${video.thumbnail}" alt="">
    <div class="in"><h3>${title}</h3><p>${escapeHtml(ssField(video, "deck"))}</p><span class="btn sm">${escapeHtml(ssUi("ui.play"))}</span></div>
  </a>`;
}

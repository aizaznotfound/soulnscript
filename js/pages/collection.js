/* =========================================================
   SOUL & SCRIPT — js/pages/collection.js
   One script for the five "house" pages. <body data-collection=…>
     library  — every written piece (ledger, filter, sort, search)
     floor    — Open Floor: reader reflections & opinions
     sessions — Session Notes: recaps as a timeline
     wall     — The Wall: every artwork + lightbox
     voices   — contributors directory
   ========================================================= */
(function(){
  const kind = document.body.dataset.collection;
  const mount = document.getElementById("room-list");
  const filterRow = document.getElementById("room-filters");
  const input = document.getElementById("room-search");
  const sortSel = document.getElementById("room-sort");
  const countEl = document.getElementById("room-count");
  if(!mount) return;

  let cat = "all", query = "", sort = "new";
  const hay = (it) => [ssField(it, "title"), ssField(it, "deck") || ssField(it, "caption"), ssField(it, "author"), ssListField(it, "tags").join(" ")].join(" ").toLowerCase();
  const byDate = (a, b) => new Date(b.date) - new Date(a.date);
  const sorter = (list) => [...list].sort(sort === "old" ? (a, b) => -byDate(a, b) : sort === "az" ? (a, b) => ssField(a, "title").localeCompare(ssField(b, "title")) : byDate);
  const setCount = (n) => { if(countEl) countEl.textContent = `${n} ${ssUi(n === 1 ? "ui.piece" : "ui.pieces")}`; };
  const empty = (msg) => `<div class="empty-state">${escapeHtml(msg)}</div>`;
  const invite = (t, b, c) => `<div class="invite"><h2>${escapeHtml(ssUi(t))}</h2><p>${escapeHtml(ssUi(b))}</p><a class="btn" href="contribute.html">${escapeHtml(ssUi(c))}</a></div>`;

  let base = [], draw;

  /* ---------------- Library ---------------- */
  if(kind === "library"){
    base = allPostsSorted();
    const cats = ["news", "campus", "academics", "opinion", "events"];
    const want = new URLSearchParams(location.search).get("cat"); if(cats.includes(want)) cat = want;
    draw = () => {
      let list = base.filter(p => (cat === "all" || p.category === cat) && (!query || hay(p).includes(query)));
      list = sorter(list); setCount(list.length);
      mount.className = "ledger";
      mount.innerHTML = list.length ? `<ul>${list.map(p => ledgerRowHTML({ kind: "post", room: roomOfCategory(p.category), item: p })).join("")}</ul>` : empty(query ? ssUi("ui.noSearchResults") : ssUi("ui.noStories"));
    };
    buildFilters(["all", ...cats], (c) => c === "all" ? ssUi("filter.all") : ssCategory(c));
  }

  /* ---------------- Open Floor ---------------- */
  if(kind === "floor"){
    base = allPostsSorted().filter(p => p.category === "opinion");
    draw = () => {
      const list = sorter(base.filter(p => !query || hay(p).includes(query))); setCount(list.length);
      if(!base.length){ mount.className = "listing"; mount.innerHTML = invite("floor.inviteTitle", "floor.inviteBody", "floor.cta"); return; }
      mount.className = "says";
      mount.innerHTML = list.map(p => `
        <article class="say"><blockquote><a href="article.html?slug=${p.slug}">${escapeHtml(ssField(p, "deck") || ssField(p, "title"))}</a></blockquote>
        <footer><b>${escapeHtml(ssField(p, "title"))}</b>${escapeHtml(ssField(p, "author"))} · ${formatDate(p.date)}</footer></article>`).join("") || empty(ssUi("ui.noSearchResults"));
    };
  }

  /* ---------------- Session Notes ---------------- */
  if(kind === "sessions"){
    base = allPostsSorted().filter(p => p.category === "events");
    draw = () => {
      const list = sorter(base.filter(p => !query || hay(p).includes(query))); setCount(list.length);
      mount.className = "timeline";
      if(!list.length){ mount.innerHTML = empty(query ? ssUi("ui.noSearchResults") : ssUi("ui.noStories")); return; }
      mount.innerHTML = `<ul>${list.map(p => {
        const d = new Date(p.date + "T00:00:00");
        const mon = d.toLocaleDateString(window.SS_LANG === "ur" ? "ur-PK" : "en-GB", { month: "short" });
        return `<li><div class="when">${mon}<b>${d.getDate()}</b>${d.getFullYear()}</div>
          <div><h3><a href="article.html?slug=${p.slug}">${escapeHtml(ssField(p, "title"))}</a></h3>
          <p>${escapeHtml(ssField(p, "deck"))}</p>
          ${p.image ? `<a href="article.html?slug=${p.slug}"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"></a>` : ""}
          <div class="meta" style="margin-top:12px">${escapeHtml(ssField(p, "author"))}</div></div></li>`;
      }).join("")}</ul>`;
    };
  }

  /* ---------------- The Wall + lightbox ---------------- */
  if(kind === "wall"){
    base = allPhotosSorted();
    let shown = [], current = 0, box;
    const show = (i) => {
      current = (i + shown.length) % shown.length; const p = shown[current];
      box.querySelector("img").src = p.image; box.querySelector("img").alt = ssField(p, "title");
      box.querySelector(".t").textContent = ssField(p, "title");
      box.querySelector(".s").textContent = `${ssField(p, "author")} · ${formatDate(p.date)}`;
      box.querySelector(".open-link").href = `article.html?photo=${p.slug}`;
    };
    const closeBox = () => box.classList.remove("open");
    const ensureBox = () => {
      if(box) return;
      box = document.createElement("div"); box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      box.innerHTML = `<button class="x" type="button">${escapeHtml(ssUi("search.close"))} ✕</button>
        <div class="stage"><img alt=""></div>
        <div class="bar"><div><b class="t"></b><span class="s"></span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="pv" type="button">←</button><button class="nx" type="button">→</button><a class="open-link" href="#">${escapeHtml(ssUi("wall.open"))}</a></div></div>`;
      document.body.appendChild(box);
      box.querySelector(".x").onclick = closeBox;
      box.querySelector(".pv").onclick = () => show(current - 1);
      box.querySelector(".nx").onclick = () => show(current + 1);
      box.addEventListener("click", (e) => { if(e.target === box || e.target.classList.contains("stage")) closeBox(); });
      document.addEventListener("keydown", (e) => {
        if(!box.classList.contains("open")) return;
        if(e.key === "Escape") closeBox();
        if(e.key === "ArrowRight") show(current + 1);
        if(e.key === "ArrowLeft") show(current - 1);
      });
    };
    draw = () => {
      shown = sorter(base.filter(p => !query || hay(p).includes(query))); setCount(shown.length);
      mount.className = "wall";
      mount.innerHTML = shown.length ? shown.map((p, i) => `
        <button class="tile" type="button" data-i="${i}"><div class="plate-frame"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(ssField(p, "title"))}" loading="lazy"></div>
        <span class="cap">${escapeHtml(ssField(p, "title"))}</span></button>`).join("") : empty(query ? ssUi("ui.noSearchResults") : ssUi("ui.noPhotos"));
    };
    mount.addEventListener("click", (e) => {
      const t = e.target.closest(".tile"); if(!t) return;
      ensureBox(); show(+t.dataset.i); box.classList.add("open"); box.querySelector(".x").focus();
    });
  }

  /* ---------------- Voices ---------------- */
  if(kind === "voices"){
    const voices = allVoices(); setCount(voices.length);
    if(countEl) countEl.textContent = String(voices.length);
    draw = () => {
      const list = voices.filter(v => !query || (v.name + " " + v.affil).toLowerCase().includes(query));
      mount.className = "voices";
      mount.innerHTML = list.map(v => `
        <article class="voice" id="${v.slug}">
          <div class="top">${avatarHTML(v.name)}<div><h3>${escapeHtml(v.name)}</h3>${v.affil ? `<div class="aff">${escapeHtml(v.affil.replace(v.name, "").replace(/^[\s\-–—,]+/, "") || v.affil)}</div>` : ""}</div></div>
          <div class="chips">${[...v.rooms].map(r => `<span class="chip room-${r}">${escapeHtml(roomName(r))}</span>`).join("")}<span class="chip">${v.pieces.length} ${escapeHtml(ssUi(v.pieces.length === 1 ? "ui.piece" : "ui.pieces"))}</span></div>
          <ul>${v.pieces.slice(0, 3).map(pc => `<li><a href="${pieceHref(pc.kind, pc.item)}">${escapeHtml(ssField(pc.item, "title"))}</a><small>${formatDate(pc.item.date)}</small></li>`).join("")}</ul>
        </article>`).join("") || empty(ssUi("search.none"));
    };
  }

  function buildFilters(keys, label){
    if(!filterRow) return;
    filterRow.innerHTML = keys.map(c => `<button type="button" data-filter="${c}" class="${c === cat ? "active" : ""}">${escapeHtml(label(c))}</button>`).join("");
    filterRow.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-filter]"); if(!b) return;
      cat = b.dataset.filter; filterRow.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b)); draw();
    });
  }
  if(filterRow && !filterRow.children.length) filterRow.remove();
  if(input) input.addEventListener("input", () => { query = input.value.trim().toLowerCase(); draw(); });
  if(sortSel) sortSel.addEventListener("change", () => { sort = sortSel.value; draw(); });
  if(draw) draw();
  if(kind === "voices" && location.hash){ const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if(el) el.scrollIntoView(); }
})();

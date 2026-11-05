/* =========================================================
   SOUL & SCRIPT — js/search.js
   Site-wide search overlay. Opens from the header button or
   the "/" key; searches pieces, artworks, films, events and
   voices straight from window.POSTS/PHOTOS/VIDEOS/EVENTS.
   ========================================================= */
(function(){
  if(typeof houseFeed !== "function") return;
  let box, input, list, index;

  function build(){
    index = houseFeed().map(({ kind, room, item }) => ({
      title: ssField(item, "title"), href: pieceHref(kind, item), room,
      kind: kind === "post" ? ssCategory(item.category) : roomName(room),
      sub: ssField(item, "author"),
      hay: [ssField(item, "title"), ssField(item, "deck"), ssField(item, "caption"), ssField(item, "author"), ssListField(item, "tags").join(" ")].join(" ").toLowerCase()
    }));
    (window.EVENTS || []).forEach(e => index.push({ title: ssField(e, "title"), href: "events.html", room: "events", kind: ssUi("nav.events"), sub: "", hay: (ssField(e, "title") + " " + ssField(e, "description")).toLowerCase() }));
    allVoices().forEach(v => index.push({ title: v.name, href: `voices.html#${v.slug}`, room: "voice", kind: ssUi("explore.voices"), sub: `${v.pieces.length} ${ssUi("voices.pieces")}`, hay: v.name.toLowerCase() }));

    box = document.createElement("div");
    box.className = "searchbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = `<div class="panel"><input type="search" autocomplete="off" placeholder="${escapeHtml(ssUi("search.placeholder"))}" aria-label="${escapeHtml(ssUi("search.open"))}"><ul></ul><div class="hint">${escapeHtml(ssUi("search.hint"))}</div></div>`;
    document.body.appendChild(box);
    input = box.querySelector("input"); list = box.querySelector("ul");
    box.addEventListener("click", (e) => { if(e.target === box) close(); });
    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => { if(e.key === "ArrowDown"){ const a = list.querySelector("a"); if(a){ e.preventDefault(); a.focus(); } } });
    list.addEventListener("keydown", (e) => {
      const a = document.activeElement;
      if(e.key === "ArrowDown" && a.closest("li").nextElementSibling){ e.preventDefault(); a.closest("li").nextElementSibling.querySelector("a").focus(); }
      if(e.key === "ArrowUp"){ e.preventDefault(); const p = a.closest("li").previousElementSibling; (p ? p.querySelector("a") : input).focus(); }
    });
  }
  function run(){
    const q = input.value.trim().toLowerCase();
    if(!q){ list.innerHTML = ""; return; }
    const hits = index.map(x => ({ x, s: x.title.toLowerCase().startsWith(q) ? 3 : x.title.toLowerCase().includes(q) ? 2 : x.hay.includes(q) ? 1 : 0 }))
      .filter(h => h.s).sort((a, b) => b.s - a.s).slice(0, 8);
    list.innerHTML = hits.length
      ? hits.map(({ x }) => `<li class="room-${x.room}"><a href="${x.href}"><span><b>${escapeHtml(x.title)}</b>${x.sub ? `<small>${escapeHtml(x.sub)}</small>` : ""}</span><span class="kind">${escapeHtml(x.kind)}</span></a></li>`).join("")
      : `<li class="none">${escapeHtml(ssUi("search.none"))}</li>`;
  }
  function open(){ if(!box) build(); box.classList.add("open"); input.value = ""; list.innerHTML = ""; input.focus(); }
  function close(){ if(box) box.classList.remove("open"); }

  document.addEventListener("DOMContentLoaded", () => {
    const tools = document.querySelector(".site-nav .nav-tools");
    if(tools){
      const b = document.createElement("button");
      b.type = "button"; b.className = "icon-btn"; b.setAttribute("aria-label", ssUi("search.open"));
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
      b.addEventListener("click", open);
      tools.insertBefore(b, tools.firstChild);
    }
  });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
    if(e.key === "/" && !typing){ e.preventDefault(); open(); }
    if(e.key === "Escape") close();
  });
})();

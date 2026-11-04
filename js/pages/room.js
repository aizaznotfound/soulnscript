/* =========================================================
   SOUL & SCRIPT — js/pages/room.js
   Shared script for literature.html, art.html, philosophy.html
   and cinema.html. <body data-room="lit|art|phil|cin"> picks
   which room's pieces to list; filters + search are built here.
   ========================================================= */
(function(){
  const key = document.body.dataset.room;
  const room = ROOMS[key];
  const mount = document.getElementById("room-list");
  const filterRow = document.getElementById("room-filters");
  const input = document.getElementById("room-search");
  if(!room || !mount) return;

  const items = roomItems(key);
  const cats = room.cats || [];
  let cat = "all", query = "";
  const wanted = new URLSearchParams(location.search).get("cat");
  if(wanted && cats.includes(wanted)) cat = wanted;

  const text = (it) => [ssField(it, "title"), ssField(it, "deck") || ssField(it, "caption"), ssListField(it, "tags").join(" ")].join(" ").toLowerCase();

  function draw(){
    let list = items;
    if(cat !== "all") list = list.filter(p => p.category === cat);
    if(query) list = list.filter(p => text(p).includes(query));

    if(!list.length){
      mount.className = "listing";
      mount.innerHTML = (key === "cin" && !items.length)
        ? screenHTML(null)
        : `<div class="empty-state">${escapeHtml(query ? ssUi("ui.noSearchResults") : (key === "art" ? ssUi("ui.noPhotos") : ssUi("ui.noStories")))}</div>`;
      return;
    }
    if(key === "lit"){ mount.className = "grid"; mount.innerHTML = list.map(cardHTML).join(""); }
    else if(key === "phil"){ mount.className = "thoughts"; mount.innerHTML = list.map(thoughtHTML).join(""); }
    else if(key === "art"){ mount.className = "plates"; mount.innerHTML = list.map(plateHTML).join(""); }
    else { mount.className = "grid"; mount.innerHTML = list.map(videoCardHTML).join(""); }
  }

  if(filterRow){
    if(cats.length){
      filterRow.innerHTML = ["all", ...cats].map(c =>
        `<button type="button" data-filter="${c}" class="${c === cat ? "active" : ""}">${escapeHtml(c === "all" ? ssUi("filter.all") : ssCategory(c))}</button>`).join("");
      filterRow.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-filter]"); if(!b) return;
        cat = b.dataset.filter;
        filterRow.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        draw();
      });
    } else filterRow.remove();
  }
  if(input){
    input.addEventListener("input", () => { query = input.value.trim().toLowerCase(); draw(); });
  }
  draw();
})();

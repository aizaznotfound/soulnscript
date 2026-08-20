/* =========================================================
   SOUL & SCRIPT — sections, filters, search
   ========================================================= */

function renderTicker(mountId){
  const el = document.getElementById(mountId);
  if(!el) return;
  const latest = allPostsSorted().slice(0,6);
  el.innerHTML = latest.map(p => `<a href="article.html?slug=${p.slug}">${escapeHtml(ssField(p, "title"))}</a>`).join(" &nbsp;•&nbsp; ");
}

function renderMostRead(mountId, excludeSlug){
  const el = document.getElementById(mountId);
  if(!el) return;
  const items = allPostsSorted().filter(p => p.slug !== excludeSlug).slice(0,5);
  el.innerHTML = `<h4>${escapeHtml(ssUi("ui.communityFavorites"))}</h4><ol>${items.map(p => `<li><a href="article.html?slug=${p.slug}">${escapeHtml(ssField(p, "title"))}</a></li>`).join("")}</ol>`;
}

function renderList(mountId, posts, emptyMsg){
  const el = document.getElementById(mountId);
  if(!el) return;
  if(!posts.length){
    el.innerHTML = `<div class="empty-state">${escapeHtml(emptyMsg || ssUi("ui.noStories"))}</div>`;
    return;
  }
  el.innerHTML = posts.map(cardHTML).join("");
}

function initFilters(filterRowId, listMountId, baseline){
  const row = document.getElementById(filterRowId);
  if(!row) return;
  row.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if(!btn) return;
    row.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.filter;
    const posts = cat === "all" ? baseline : baseline.filter(p => p.category === cat);
    renderList(listMountId, posts);
  });
}

function initSearch(inputId, listMountId, baseline){
  const input = document.getElementById(inputId);
  if(!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const filtered = !q ? baseline : baseline.filter(p => {
      const title = String(ssField(p, "title")).toLowerCase();
      const deck = String(ssField(p, "deck")).toLowerCase();
      const tags = ssListField(p, "tags").join(" ").toLowerCase();
      return title.includes(q) || deck.includes(q) || tags.includes(q);
    });
    renderList(listMountId, filtered, ssUi("ui.noSearchResults"));
  });
}

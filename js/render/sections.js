/* =========================================================
   SOUL & SCRIPT — js/render/sections.js
   Ticker, Most Read sidebar, generic list renderer, category
   filter buttons, live search (news.html).
   ========================================================= */

/* ---------- Ticker ---------- */
function renderTicker(mountId){
  const el = document.getElementById(mountId);
  if(!el) return;
  const latest = allPostsSorted().slice(0,6);
  el.innerHTML = latest.map(p =>
    `<a href="article.html?slug=${p.slug}">${escapeHtml(p.title)}</a>`
  ).join(" &nbsp;•&nbsp; ");
}

/* ---------- Most Read sidebar ---------- */
function renderMostRead(mountId, excludeSlug){
  const el = document.getElementById(mountId);
  if(!el) return;
  const items = allPostsSorted().filter(p => p.slug !== excludeSlug).slice(0,5);
  el.innerHTML = `<h4>Community Favorites</h4><ol>${
    items.map(p => `<li><a href="article.html?slug=${p.slug}">${escapeHtml(p.title)}</a></li>`).join("")
  }</ol>`;
}

/* ---------- Generic list renderer with optional filter buttons ---------- */
function renderList(mountId, posts, emptyMsg){
  const el = document.getElementById(mountId);
  if(!el) return;
  if(!posts.length){
    el.innerHTML = `<div class="empty-state">${emptyMsg || "No stories in this category yet. Check back soon."}</div>`;
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

/* ---------- Search (news page) ---------- */
function initSearch(inputId, listMountId, baseline){
  const input = document.getElementById(inputId);
  if(!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const filtered = !q ? baseline : baseline.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.deck.toLowerCase().includes(q) ||
      (p.tags || []).join(" ").toLowerCase().includes(q)
    );
    renderList(listMountId, filtered, "No stories match your search.");
  });
}


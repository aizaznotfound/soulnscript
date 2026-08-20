/* =========================================================
   SOUL & SCRIPT — js/pages/index.js
   Homepage-only rendering: hero/grid, Editor's Picks rail, category strips, mega-menu data.
   Page-specific script for index.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  const sorted = allPostsSorted();

  if(!sorted.length){
    document.getElementById("front-grid-mount").innerHTML = `<p class="empty-state">${escapeHtml(ssUi("ui.noStories"))}</p>`;
    document.getElementById("picks-rail").innerHTML = "";
  } else {
    const lead = sorted.find(p => p.featured) || sorted[0];
    const rest = sorted.filter(p => p.slug !== lead.slug);

    // Top mixed-size grid: 1 big lead + up to 2 medium (gracefully handles fewer posts)
    const mediums = rest.slice(0, 2);
    document.getElementById("front-grid-mount").innerHTML = `
      <article class="big${lead.image ? "" : " no-image"}">
        ${lead.image ? `<a href="article.html?slug=${lead.slug}"><img src="${lead.image}" alt="${escapeHtml(ssField(lead, "title"))}"></a>` : ""}
        <span class="tag-pill ${lead.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(ssCategory(lead.category))}</span>
        <h2><a href="article.html?slug=${lead.slug}">${escapeHtml(ssField(lead, "title"))}</a></h2>
        <p class="deck-sm">${escapeHtml(ssField(lead, "deck"))}</p>
        <div class="byline">${escapeHtml(ssField(lead, "author"))} · ${formatDate(lead.date)}</div>
      </article>
      ${mediums.map(p => `
      <article class="medium${p.image ? "" : " no-image"}">
        ${p.image ? `<a href="article.html?slug=${p.slug}"><img src="${p.image}" alt="${escapeHtml(ssField(p, "title"))}"></a>` : ""}
        <span class="tag-pill ${p.category === 'opinion' ? 'opinion' : ''}">${escapeHtml(ssCategory(p.category))}</span>
        <h3><a href="article.html?slug=${p.slug}">${escapeHtml(ssField(p, "title"))}</a></h3>
        <p class="deck-sm">${escapeHtml(ssField(p, "deck"))}</p>
        <div class="byline">${formatDate(p.date)}</div>
      </article>`).join("")}
    `;

    // Editor's Picks rail — next few after the top three
    document.getElementById("picks-rail").innerHTML =
      rest.slice(2, 9).map(railCardHTML).join("") || sorted.slice(0,6).map(railCardHTML).join("");

    renderMostRead("most-read-mount", lead.slug);
  }

  // Category strips
  document.getElementById("strip-campus").innerHTML =
    postsByCategory("campus").slice(0,3).map(stripRowHTML).join("") || `<p class="empty-state">${escapeHtml(ssUi("ui.noStories"))}</p>`;
  document.getElementById("strip-academics").innerHTML =
    postsByCategory("academics").slice(0,3).map(stripRowHTML).join("") || `<p class="empty-state">${escapeHtml(ssUi("ui.noStories"))}</p>`;

  renderList("home-opinions-grid", postsByCategory("opinion").slice(0,2));

  document.getElementById("home-videos-grid").innerHTML =
    window.VIDEOS.slice(0,2).map(videoCardHTML).join("");

  const homePhotos = allPhotosSorted().slice(0,8);
  document.getElementById("home-photos-rail").innerHTML = homePhotos.length
    ? homePhotos.map(photoRailCardHTML).join("")
    : `<p class="empty-state">${escapeHtml(ssUi("ui.noPhotos"))}</p>`;

  document.getElementById("home-tag-cloud").innerHTML = tagCloudHTML(10);

  document.getElementById("newsletter-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletter-email").value;
    window.location.href = `mailto:soulnscript26@gmail.com?subject=${encodeURIComponent("Newsletter signup")}&body=${encodeURIComponent("Please add this address to the Soul & Script newsletter list: " + email)}`;
  });

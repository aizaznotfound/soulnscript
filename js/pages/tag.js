/* =========================================================
   SOUL & SCRIPT — js/pages/tag.js
   Tag detail page — stories filtered by one tag.
   Page-specific script for tag.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  document.getElementById("tag-cloud-mount").innerHTML = tagCloudHTML(30);

  const tag = new URLSearchParams(window.location.search).get("tag");
  if(tag){
    const safeTag = escapeHtml(tag);
    document.getElementById("page-header").innerHTML = `<h1>${escapeHtml(ssUi("page.tagTitle"))}: ${safeTag}</h1><p>${escapeHtml(ssUi("page.tagDescription"))}</p>`;
    const matches = postsByTag(tag);
    renderList("tag-grid", matches, `${ssUi("ui.noStories")} ${safeTag}`);
  } else {
    renderList("tag-grid", allPostsSorted().slice(0,6));
  }

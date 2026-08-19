/* =========================================================
   SOUL & SCRIPT — js/pages/news.js
   News listing page — filters + live search wiring.
   Page-specific script for news.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  const nonOpinion = allPostsSorted().filter(p => p.category !== "opinion");
  const urlCat = new URLSearchParams(window.location.search).get("cat");

  renderList("news-grid", urlCat ? nonOpinion.filter(p => p.category === urlCat) : nonOpinion);
  initFilters("news-filters", "news-grid", nonOpinion);
  initSearch("news-search", "news-grid", nonOpinion);

  if(urlCat){
    document.querySelectorAll('#news-filters button').forEach(b => {
      b.classList.toggle("active", b.dataset.filter === urlCat);
    });
  }

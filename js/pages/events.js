/* =========================================================
   SOUL & SCRIPT — js/pages/events.js
   Renders the Active Events grid from real content now (used
   to be hand-curated HTML with no CMS access at all), plus the
   session-recap posts (category: events) into Past Events —
   unchanged from before.
   Page-specific script for events.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

(function () {
  const active = activeEventsSorted();
  const activeGrid = document.getElementById("active-events-grid");
  const activeEmpty = document.getElementById("active-events-empty");
  if (activeGrid) {
    activeGrid.innerHTML = active.map((e) => eventCardHTML(e, true)).join("");
    if (activeEmpty) activeEmpty.style.display = active.length ? "none" : "block";
  }
})();

renderList("events-grid", postsByCategory("events"), ssUi("ui.noRecaps"));

/* =========================================================
   SOUL & SCRIPT — js/pages/opinions.js
   Opinions listing page.
   Page-specific script for opinions.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  renderList("opinions-grid", postsByCategory("opinion"), ssUi("ui.noOpinions"));

/* =========================================================
   SOUL & SCRIPT — js/pages/events.js
   Renders session-recap posts (category: events) into the
   Session Recaps section. The Active Events section above it
   is curated by hand in events.html for now.
   Page-specific script for events.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

renderList("events-grid", postsByCategory("events"), "No session recaps published yet.");

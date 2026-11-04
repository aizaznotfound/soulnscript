/* =========================================================
   SOUL & SCRIPT — js/bootstrap.js
   Footer year + shared nav behaviour. Loaded last of the
   shared scripts, right before any page-specific script.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("footer-year");
  if(yearEl) yearEl.textContent = new Date().getFullYear();
  markActiveNav();
  initMobileNav();
});

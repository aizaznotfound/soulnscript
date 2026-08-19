/* =========================================================
   SOUL & SCRIPT — js/bootstrap.js
   Fills in the date/year/ticker chrome and boots up the shared
   page behaviors on DOMContentLoaded. Loaded LAST of the shared
   scripts, right before any page-specific script.
   ========================================================= */

function fillChrome(){
  const dateEl = document.getElementById("utility-date");
  if(dateEl){
    dateEl.textContent = new Date().toLocaleDateString("en-US", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  }
  const yearEl = document.getElementById("footer-year");
  if(yearEl){ yearEl.textContent = new Date().getFullYear(); }
  renderTicker("ticker-mount");
}

document.addEventListener("DOMContentLoaded", () => {
  mountPulseRules();
  markActiveNav();
  fillChrome();
  mountMegaMenus();
  initMobileNav();
});

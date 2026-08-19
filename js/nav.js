/* =========================================================
   SOUL & SCRIPT — js/nav.js
   Active nav-link highlighting + mobile burger/mega-menu
   accordion behavior and sticky-ticker height sync.
   ========================================================= */

/* ---------- Nav active state ---------- */
function markActiveNav(){
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a[data-page]").forEach(a => {
    if(a.dataset.page === page) a.classList.add("active");
  });
}

/* ---------- Mobile nav: burger toggle + mega-menu accordion ---------- */
/* Keeps the sticky ticker/"Latest" bar pinned directly under the nav instead
   of letting it (and the headlines after it) scroll up underneath the nav.
   Nav height isn't constant (it grows on mobile when the menu opens), so we
   measure it and expose it as --nav-h for the ticker's sticky "top" offset. */
function syncNavHeight(){
  const nav = document.querySelector(".nav");
  if(!nav) return;
  document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
}

function initMobileNav(){
  const burger = document.getElementById("nav-burger");
  const menu = document.getElementById("nav-menu");
  if(burger && menu){
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      syncNavHeight();
    });
  }
  document.querySelectorAll(".mega-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const li = btn.closest("li.has-mega");
      if(!li) return;
      const isOpen = li.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      syncNavHeight();
    });
  });
  // Collapse the mobile menu automatically if the viewport is widened past the breakpoint
  window.addEventListener("resize", () => {
    if(window.innerWidth > 780 && menu){
      menu.classList.remove("open");
      if(burger) burger.setAttribute("aria-expanded", "false");
    }
    syncNavHeight();
  });
  syncNavHeight();
}


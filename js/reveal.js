/* =========================================================
   THE SOUL & SCRIPT — js/reveal.js
   Adds the .reveal class to card-like content once it's in the
   DOM (content is rendered dynamically by js/render/*.js, so this
   runs after a short delay + re-scans on scroll-mount), then uses
   IntersectionObserver to fade/rise each one into view once.
   Loaded on EVERY page, last of all shared scripts.
   ========================================================= */

(function(){
  var SELECTORS = ".card, .side-card, .hero-card, .video-card, .photo-card, .team-card, .mega-story, .strip-row, .rail .hero-card";

  var io = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })
    : null;

  function tag(){
    document.querySelectorAll(SELECTORS).forEach(function(el){
      if(el.dataset.revealed) return;
      el.dataset.revealed = "1";
      el.classList.add("reveal");
      if(io){ io.observe(el); }
      else { el.classList.add("is-visible"); }
    });
  }

  tag();
  // Content renders async (fetch-free but still post-DOMContentLoaded via render*() calls),
  // so re-scan a few times shortly after load to catch anything mounted just after us.
  [80, 250, 600, 1200].forEach(function(ms){ setTimeout(tag, ms); });
})();

/* =========================================================
   THE SOUL & SCRIPT — js/reveal.js
   Adds the .reveal class to card-like content once it's in the
   DOM (content is rendered dynamically by js/render/*.js, so this
   runs after a short delay + re-scans on scroll-mount), then uses
   IntersectionObserver to fade/rise each one into view once.
   Loaded on EVERY page, last of all shared scripts.
   ========================================================= */

(function(){
  // The art-gallery motion controller owns reveals on the redesigned public pages.
  // Keep this legacy observer only for contributor/editor utility pages.
  if(document.body.classList.contains("art-page")) return;
  var SELECTORS = ".card, .side-card, .hero-card, .video-card, .photo-card, .team-card, .mega-story, .strip-row, .rail .hero-card, .team-group, .strip-head";

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

/* ---------- Scroll progress bar + condensed nav + back-to-top ----------
   Small, self-contained scroll UI: a reading-progress bar under the nav,
   a slightly more compact nav once you've scrolled past the masthead, and
   a floating back-to-top button that appears after one screen of scroll. */
(function(){
  // Skip on distraction-free tools without the standard site chrome
  // (write.html's composer has its own sticky bottom toolbar already).
  if(!document.querySelector(".masthead")) return;

  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);

  var nav = document.querySelector(".nav");

  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "back-to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = "↑";
  toTop.addEventListener("click", function(){
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.body.appendChild(toTop);

  var ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      progress.style.width = pct + "%";
      if(nav) nav.classList.toggle("is-condensed", scrollTop > 80);
      toTop.classList.toggle("show", scrollTop > 600);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

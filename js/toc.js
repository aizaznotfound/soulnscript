/* =========================================================
   SOUL & SCRIPT — js/toc.js
   Builds a sticky "On this page" contents list for long
   pages (the manifesto). Reads the headings inside the
   first .article-body and wraps it in a two-column layout.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector("main .article-body");
  if(!body) return;
  const heads = [...body.querySelectorAll("h2, h3")];
  if(heads.length < 3) return;
  const toc = document.createElement("nav");
  toc.className = "toc"; toc.setAttribute("aria-label", "Contents");
  const items = heads.map((h, i) => {
    h.id = h.id || "sec-" + (i + 1);
    const key = h.getAttribute("data-i18n");
    return `<li><a href="#${h.id}"${key ? ` data-i18n="${key}"` : ""}>${h.textContent}</a></li>`;
  }).join("");
  toc.innerHTML = `<h5 data-i18n="toc.title">On this page</h5><ul>${items}</ul>`;
  const wrap = document.createElement("div");
  wrap.className = "doc-layout";
  body.parentNode.insertBefore(wrap, body);
  wrap.append(toc, body);
  if(typeof ssApplyTranslations === "function") ssApplyTranslations();
});

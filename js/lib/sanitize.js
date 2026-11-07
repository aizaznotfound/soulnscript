/* =========================================================
   SOUL & SCRIPT — js/lib/sanitize.js
   Client-side allowlist HTML cleaner (bold/italic/link only)
   used by the writing tools. Server-side twin lives at
   functions/_lib/sanitize.js.
   ========================================================= */

/* Allowlist inline-HTML cleaner used by the writing tools (write.html and
   editor.html) so pasted content — from Word, Google Docs, another site,
   anywhere — can never carry more than bold/italic/links into a story.
   This is the client-side half of the sanitizer; functions/_lib/sanitize.js
   is the server-side half that actually enforces the boundary, since this
   one can be bypassed by anyone who skips the browser entirely. */
const RTE_INLINE_TAGS = new Set(["STRONG","EM","A","BR"]);
function sanitizeInlineHTML(html){
  // DOMParser builds an inert document: images don't load and no handler can
  // fire while we inspect it (a detached <div>.innerHTML is NOT safe).
  const src = new DOMParser().parseFromString("<body>" + (html == null ? "" : html) + "</body>", "text/html").body;
  const frag = document.createDocumentFragment();
  rteAppendClean(src, frag);
  const out = document.createElement("div");
  out.appendChild(frag);
  return out.innerHTML;
}
function rteAppendClean(sourceParent, targetParent){
  Array.from(sourceParent.childNodes).forEach(node => {
    if(node.nodeType === Node.TEXT_NODE){
      targetParent.appendChild(document.createTextNode(node.textContent));
      return;
    }
    if(node.nodeType !== Node.ELEMENT_NODE) return;
    let tag = node.tagName;
    if(tag === "B") tag = "STRONG";
    if(tag === "I") tag = "EM";
    if(tag === "BR"){ targetParent.appendChild(document.createElement("br")); return; }
    if(!RTE_INLINE_TAGS.has(tag)){
      // Not an allowed tag (a stray <div>, <span style>, <font>, etc. from a
      // paste) — drop the wrapper but keep whatever text/formatting is inside it.
      rteAppendClean(node, targetParent);
      return;
    }
    if(tag === "A"){
      let href = (node.getAttribute("href") || "").trim();
      const safe = /^https?:\/\//i.test(href) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(href);
      if(!safe){ rteAppendClean(node, targetParent); return; }
      const a = document.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      rteAppendClean(node, a);
      targetParent.appendChild(a);
      return;
    }
    const clean = document.createElement(tag);
    rteAppendClean(node, clean);
    targetParent.appendChild(clean);
  });
}



/* Cleaner for stored *block* HTML (headings, figures, quotes, lists).
   Allow-list only: no attributes except a safe <img src>/<a href>; scripts,
   styles, iframes and anything unknown are removed. Used when an article is
   displayed, so even content that slipped past the server can't run code. */
const BLOCK_ALLOWED = new Set(["H1","H2","H3","H4","H5","H6","P","BLOCKQUOTE","UL","OL","LI","FIGURE","FIGCAPTION","DIV","SPAN","STRONG","EM","U","BR","A","IMG"]);
const BLOCK_DROP = new Set(["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","NOSCRIPT","TEMPLATE","SVG","MATH","LINK","META","FORM","INPUT","BUTTON","TEXTAREA","SELECT"]);
function sanitizeBlockHTML(html){
  const src = new DOMParser().parseFromString("<body>" + (html == null ? "" : html) + "</body>", "text/html").body;
  const out = document.createElement("div");
  blockClean(src, out);
  return out.innerHTML;
}
function blockClean(from, to){
  Array.from(from.childNodes).forEach(node => {
    if(node.nodeType === Node.TEXT_NODE){ to.appendChild(document.createTextNode(node.textContent)); return; }
    if(node.nodeType !== Node.ELEMENT_NODE) return;
    let tag = node.tagName;
    if(BLOCK_DROP.has(tag)) return;
    if(tag === "B") tag = "STRONG";
    if(tag === "I") tag = "EM";
    if(!BLOCK_ALLOWED.has(tag)){ blockClean(node, to); return; }
    if(tag === "BR"){ to.appendChild(document.createElement("br")); return; }
    if(tag === "IMG"){
      const srcAttr = (node.getAttribute("src") || "").trim();
      if(!/^images\/[A-Za-z0-9._-]+$/.test(srcAttr) && !/^https?:\/\/[^\s"'<>]+$/i.test(srcAttr)) return;
      const img = document.createElement("img");
      img.setAttribute("src", srcAttr);
      img.setAttribute("alt", node.getAttribute("alt") || "");
      img.setAttribute("loading", "lazy");
      to.appendChild(img);
      return;
    }
    if(tag === "A"){
      const href = (node.getAttribute("href") || "").trim();
      if(!(/^https?:\/\//i.test(href) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(href))){ blockClean(node, to); return; }
      const a = document.createElement("a");
      a.setAttribute("href", href); a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer");
      blockClean(node, a); to.appendChild(a);
      return;
    }
    const clean = document.createElement(tag);
    blockClean(node, clean);
    to.appendChild(clean);
  });
}

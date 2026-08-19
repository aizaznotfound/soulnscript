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
  const src = document.createElement("div");
  src.innerHTML = html == null ? "" : html;
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


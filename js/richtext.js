/* =========================================================
   SOUL & SCRIPT — js/richtext.js
   Shared rich-text composer (Bold/Italic/Link toolbar + floating
   selection bubble) used by write.html and editor.html.
   ========================================================= */

/* ---------- Rich text composer (shared by write.html & editor.html) ----------
   Wires up Bold / Italic / Link formatting on a contenteditable element —
   both a fixed toolbar and an optional floating "bubble" menu that appears
   above selected text, the way Medium/X's article composer does. No
   markdown symbols ever touch the screen: clicking Bold makes the letters
   bold immediately, the same way a word processor works.

   opts:
     buttons: { bold, italic, link }  — fixed toolbar button elements (optional)
     bubble:  { root, bold, italic, link } — floating bubble elements (optional)
     onChange: fn — called after any formatting change, e.g. to trigger autosave
*/
function initRichText(editorEl, opts){
  opts = opts || {};
  const allButtons = [];
  if(opts.buttons) Object.values(opts.buttons).forEach(b => b && allButtons.push(b));
  if(opts.bubble) ["bold","italic","link"].forEach(k => opts.bubble[k] && allButtons.push(opts.bubble[k]));

  // Buttons must never steal focus away from the editor — otherwise the
  // browser collapses the text selection before the click handler even
  // runs, and there'd be nothing left to bold/italicize/link.
  allButtons.forEach(btn => btn.addEventListener("mousedown", (e) => e.preventDefault()));

  function notifyChange(){ if(typeof opts.onChange === "function") opts.onChange(); }

  function applyBold(){ editorEl.focus(); document.execCommand("bold"); notifyChange(); updateActiveStates(); }
  function applyItalic(){ editorEl.focus(); document.execCommand("italic"); notifyChange(); updateActiveStates(); }
  function applyLink(){
    editorEl.focus();
    const sel = window.getSelection();
    if(!sel || sel.isCollapsed || sel.rangeCount === 0 || !editorEl.contains(sel.anchorNode)){
      return; // nothing selected to link
    }
    const already = document.queryCommandState("createLink") || nearestLink(sel);
    let url = prompt(already ? "Update this link's URL — leave blank to remove it:" : "Add a link — paste the URL:", already ? (nearestLink(sel)?.href || "https://") : "https://");
    if(url === null) return;
    url = url.trim();
    if(!url){ document.execCommand("unlink"); notifyChange(); return; }
    if(!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = "https://" + url;
    document.execCommand("createLink", false, url);
    const link = nearestLink(window.getSelection());
    if(link){ link.setAttribute("target", "_blank"); link.setAttribute("rel", "noopener noreferrer"); }
    notifyChange();
    updateActiveStates();
  }
  function nearestLink(sel){
    if(!sel || !sel.anchorNode) return null;
    const node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    return node && node.closest ? node.closest("a") : null;
  }

  function updateActiveStates(){
    let bold = false, italic = false;
    try{ bold = document.queryCommandState("bold"); italic = document.queryCommandState("italic"); }catch(e){}
    if(opts.buttons){
      if(opts.buttons.bold) opts.buttons.bold.classList.toggle("active", bold);
      if(opts.buttons.italic) opts.buttons.italic.classList.toggle("active", italic);
    }
    if(opts.bubble){
      if(opts.bubble.bold) opts.bubble.bold.classList.toggle("active", bold);
      if(opts.bubble.italic) opts.bubble.italic.classList.toggle("active", italic);
    }
  }

  if(opts.buttons){
    if(opts.buttons.bold) opts.buttons.bold.addEventListener("click", applyBold);
    if(opts.buttons.italic) opts.buttons.italic.addEventListener("click", applyItalic);
    if(opts.buttons.link) opts.buttons.link.addEventListener("click", applyLink);
  }
  if(opts.bubble){
    if(opts.bubble.bold) opts.bubble.bold.addEventListener("click", applyBold);
    if(opts.bubble.italic) opts.bubble.italic.addEventListener("click", applyItalic);
    if(opts.bubble.link) opts.bubble.link.addEventListener("click", applyLink);
  }

  editorEl.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if(!mod) return;
    const k = e.key.toLowerCase();
    if(k === "b"){ e.preventDefault(); applyBold(); }
    else if(k === "i"){ e.preventDefault(); applyItalic(); }
    else if(k === "k"){ e.preventDefault(); applyLink(); }
  });
  editorEl.addEventListener("keyup", updateActiveStates);
  editorEl.addEventListener("mouseup", updateActiveStates);

  // Sanitize anything pasted in — Word/Docs/webpage cruft never gets past
  // the same bold/italic/link allowlist a normal typed edit would.
  editorEl.addEventListener("paste", (e) => {
    e.preventDefault();
    const clipboard = e.clipboardData || window.clipboardData;
    if(!clipboard) return;
    const html = clipboard.getData("text/html");
    const text = clipboard.getData("text/plain");
    if(html){
      const clean = sanitizeInlineHTML(html);
      document.execCommand("insertHTML", false, clean || escapeHtml(text).replace(/\n/g, "<br>"));
    } else {
      document.execCommand("insertText", false, text);
    }
    notifyChange();
  });

  // Urdu / RTL toggle — CSS (unicode-bidi:plaintext) already auto-detects
  // direction per line, but a short line, a line that opens with a number,
  // or an empty new paragraph has no strong character for the browser to
  // guess from, which is exactly where typing Urdu used to feel "buggy"
  // (caret jumping, new text landing on the wrong side). This button lets
  // a writer lock the field to Urdu explicitly: proper dir/lang, the
  // Nastaliq font, and right-aligned typing, no guessing required.
  if(opts.langToggle){
    const btn = opts.langToggle;
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      editorEl.focus();
      const isUrdu = editorEl.classList.toggle("lang-ur");
      editorEl.setAttribute("dir", isUrdu ? "rtl" : "auto");
      editorEl.setAttribute("lang", isUrdu ? "ur" : "en");
      btn.classList.toggle("active", isUrdu);
      btn.setAttribute("aria-pressed", isUrdu ? "true" : "false");
      notifyChange();
    });
  }

  // Floating bubble toolbar — appears above the current selection.
  if(opts.bubble && opts.bubble.root){
    const bubble = opts.bubble.root;
    function positionBubble(){
      const sel = window.getSelection();
      if(!sel || sel.isCollapsed || sel.rangeCount === 0 || !editorEl.contains(sel.anchorNode) || !editorEl.contains(sel.focusNode)){
        bubble.classList.remove("show");
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if(!rect || (!rect.width && !rect.height)){ bubble.classList.remove("show"); return; }
      bubble.classList.add("show");
      const bubbleRect = bubble.getBoundingClientRect();
      let top = rect.top + window.scrollY - bubbleRect.height - 10;
      let left = rect.left + window.scrollX + (rect.width / 2) - (bubbleRect.width / 2);
      left = Math.max(8, Math.min(left, window.scrollX + document.documentElement.clientWidth - bubbleRect.width - 8));
      if(top < window.scrollY + 4) top = rect.bottom + window.scrollY + 10;
      bubble.style.top = `${top}px`;
      bubble.style.left = `${left}px`;
      updateActiveStates();
    }
    document.addEventListener("selectionchange", positionBubble);
    window.addEventListener("scroll", () => bubble.classList.remove("show"), { passive: true });
  }
}

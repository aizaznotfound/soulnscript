/* =========================================================
   SOUL & SCRIPT — js/pages/write.js
   Simplified block-by-block writing tool for logged-in contributors.
   Page-specific script for write.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  const TOKEN_KEY = "gkmc_contributor_session_v1";

  function getSession(){
    try{ return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); }
    catch(e){ return null; }
  }

  const session = getSession();
  const isAuthenticated = !!(session && session.token);
  if(!isAuthenticated){
    window.location.href = "contribute.html";
  }

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "contribute.html";
  });

  function showStatus(elId, type, html){
    const el = document.getElementById(elId);
    el.className = "publish-status show " + type;
    el.innerHTML = html;
  }

  // escapeHtml() and sanitizeInlineHTML() come from js/main.js.

  function fileToDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the image file."));
      reader.readAsDataURL(file);
    });
  }

  /* ============ Elements ============ */
  const titleEl = document.getElementById("a-title");
  const deckEl = document.getElementById("a-deck");
  const editor = document.getElementById("editor");
  const countsEl = document.getElementById("writer-counts");
  const draftIndicator = document.getElementById("draft-indicator");
  const composerHint = document.getElementById("composer-hint");
  const leadImageInput = document.getElementById("a-lead-image");
  const leadPreviewImg = document.getElementById("a-lead-preview-img");
  const dropzoneText = document.getElementById("dropzone-text");
  const dropzone = document.getElementById("lead-dropzone");
  const dropzoneRemoveWrap = document.getElementById("dropzone-remove");
  const dropzoneRemoveBtn = document.getElementById("dropzone-remove-btn");
  const inlinePhotoInput = document.getElementById("inline-photo-input");
  const detailsToggle = document.getElementById("details-toggle");
  const detailsPanel = document.getElementById("details-panel");

  let selectedCategory = "campus";
  let tags = [];
  let leadImageData = null; // { dataUrl, filename }

  /* ============ Title auto-grow ============ */
  function autoGrow(el){ el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  titleEl.addEventListener("input", () => { autoGrow(titleEl); scheduleAutosave(); });
  titleEl.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){ e.preventDefault(); editor.focus(); }
  });

  /* ============ Details drawer ============ */
  detailsToggle.addEventListener("click", () => {
    const open = !detailsPanel.hidden;
    detailsPanel.hidden = open;
    detailsToggle.textContent = open ? "+ Add a summary, category, topics or photo" : "− Hide these extra details";
  });

  /* ============ Category chips ============ */
  document.getElementById("category-chips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if(!btn) return;
    document.querySelectorAll("#category-chips .chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    selectedCategory = btn.dataset.value;
    scheduleAutosave();
  });

  /* ============ Tags ============ */
  const tagEntry = document.getElementById("tag-entry");
  const tagWrap = document.getElementById("tag-input-wrap");

  function renderTags(){
    tagWrap.querySelectorAll(".tag-chip").forEach(el => el.remove());
    tags.forEach((t, i) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `${escapeHtml(t)} <button type="button" data-i="${i}">✕</button>`;
      tagWrap.insertBefore(chip, tagEntry);
    });
  }
  tagWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-i]");
    if(!btn) return;
    tags.splice(Number(btn.dataset.i), 1);
    renderTags();
    scheduleAutosave();
  });
  tagEntry.addEventListener("keydown", (e) => {
    if((e.key === "Enter" || e.key === ",") && tagEntry.value.trim()){
      e.preventDefault();
      const val = tagEntry.value.trim().replace(/,$/, "");
      if(val && !tags.includes(val) && tags.length < 6) tags.push(val);
      tagEntry.value = "";
      renderTags();
      scheduleAutosave();
    } else if(e.key === "Backspace" && !tagEntry.value && tags.length){
      tags.pop();
      renderTags();
      scheduleAutosave();
    }
  });

  /* ============ Cover / lead photo ============ */
  function setLeadImage(dataUrl, filename){
    leadImageData = { dataUrl, filename };
    leadPreviewImg.src = dataUrl;
    leadPreviewImg.style.display = "block";
    dropzoneText.style.display = "none";
    dropzoneRemoveWrap.style.display = "block";
  }
  function clearLeadImage(){
    leadImageData = null;
    leadPreviewImg.src = "";
    leadPreviewImg.style.display = "none";
    dropzoneText.style.display = "block";
    dropzoneRemoveWrap.style.display = "none";
    leadImageInput.value = "";
  }
  leadImageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const dataUrl = await fileToDataURL(file);
    setLeadImage(dataUrl, file.name);
    scheduleAutosave();
  });
  dropzoneRemoveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    clearLeadImage();
    scheduleAutosave();
  });
  ["dragover", "dragenter"].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  }));
  ["dragleave", "drop"].forEach(evt => dropzone.addEventListener(evt, () => {
    dropzone.classList.remove("drag-over");
  }));
  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if(file && file.type.startsWith("image/")){
      const dataUrl = await fileToDataURL(file);
      setLeadImage(dataUrl, file.name);
      scheduleAutosave();
    }
  });

  /* ============ Writer editor ============ */
  try{ document.execCommand("defaultParagraphSeparator", false, "p"); }catch(e){}

  let savedRange = null;
  function saveSelection(){
    const sel = window.getSelection();
    if(sel.rangeCount > 0 && editor.contains(sel.anchorNode)){
      savedRange = sel.getRangeAt(0);
    }
  }
  function restoreSelection(){
    const sel = window.getSelection();
    sel.removeAllRanges();
    if(savedRange){
      sel.addRange(savedRange);
    } else {
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.addRange(range);
    }
  }

  const headingBtn = document.getElementById("btn-heading");
  headingBtn.addEventListener("mousedown", (e) => e.preventDefault()); // keep the caret/selection intact
  headingBtn.addEventListener("click", () => {
    editor.focus();
    const current = document.queryCommandValue("formatBlock");
    const isHeading = current && current.toLowerCase() === "h3";
    document.execCommand("formatBlock", false, isHeading ? "P" : "H3");
    headingBtn.classList.toggle("active", !isHeading);
    scheduleAutosave();
  });
  editor.addEventListener("keyup", () => {
    const current = document.queryCommandValue("formatBlock");
    headingBtn.classList.toggle("active", !!current && current.toLowerCase() === "h3");
  });
  editor.addEventListener("mouseup", () => {
    const current = document.queryCommandValue("formatBlock");
    headingBtn.classList.toggle("active", !!current && current.toLowerCase() === "h3");
  });

  document.getElementById("btn-photo").addEventListener("mousedown", (e) => e.preventDefault());
  document.getElementById("btn-photo").addEventListener("click", () => {
    saveSelection();
    inlinePhotoInput.click();
  });

  // Bold / Italic / Link — a fixed toolbar row plus a floating bubble that
  // appears above selected text, the way Medium/X's article composer does.
  initRichText(editor, {
    buttons: {
      bold: document.getElementById("btn-bold"),
      italic: document.getElementById("btn-italic"),
      link: document.getElementById("btn-link")
    },
    bubble: {
      root: document.getElementById("format-bubble"),
      bold: document.getElementById("bubble-bold"),
      italic: document.getElementById("bubble-italic"),
      link: document.getElementById("bubble-link")
    },
    langToggle: document.getElementById("btn-lang"),
    onChange: () => { updateCounts(); scheduleAutosave(); }
  });
  inlinePhotoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const dataUrl = await fileToDataURL(file);
    restoreSelection();
    const html = `<figure class="writer-figure" contenteditable="false">` +
      `<button type="button" class="figure-remove" onclick="this.closest('figure').remove(); scheduleAutosave();" title="Remove photo">✕</button>` +
      `<img src="${dataUrl}" data-filename="${escapeHtml(file.name)}">` +
      `<figcaption contenteditable="true" data-placeholder="Add a caption (optional)"></figcaption>` +
      `</figure><p><br></p>`;
    document.execCommand("insertHTML", false, html);
    inlinePhotoInput.value = "";
    updateCounts();
    scheduleAutosave();
  });

  function updateCounts(){
    const text = editor.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const mins = Math.max(1, Math.round(words / 200));
    countsEl.textContent = `${words} word${words === 1 ? "" : "s"} · ${mins} min read`;
  }
  editor.addEventListener("input", () => {
    updateCounts();
    scheduleAutosave();
    if(composerHint) { composerHint.style.display = "none"; }
  });
  deckEl.addEventListener("input", () => { autoGrow(deckEl); scheduleAutosave(); });

  /* ============ Autosave draft ============ */
  const DRAFT_KEY = "gkmc_draft_v2_" + (session ? session.username : "anon");
  let autosaveTimer = null;

  function scheduleAutosave(){
    draftIndicator.textContent = "Saving…";
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraft, 700);
  }

  function saveDraft(){
    try{
      const draft = {
        title: titleEl.value,
        deck: deckEl.value,
        category: selectedCategory,
        tags,
        leadImage: leadImageData,
        editorHtml: editor.innerHTML,
        savedAt: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      draftIndicator.textContent = "Saved";
    }catch(e){
      draftIndicator.textContent = "Couldn't save draft (storage may be full)";
    }
  }

  function loadDraft(){
    let draft;
    try{ draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }catch(e){ draft = null; }
    if(!draft) return;

    titleEl.value = draft.title || "";
    autoGrow(titleEl);
    deckEl.value = draft.deck || "";
    autoGrow(deckEl);
    if(draft.category){
      selectedCategory = draft.category;
      document.querySelectorAll("#category-chips .chip").forEach(c => {
        c.classList.toggle("active", c.dataset.value === draft.category);
      });
    }
    if(Array.isArray(draft.tags)){ tags = draft.tags; renderTags(); }
    if(draft.leadImage && draft.leadImage.dataUrl){ setLeadImage(draft.leadImage.dataUrl, draft.leadImage.filename); }
    if(draft.editorHtml){ editor.innerHTML = draft.editorHtml; updateCounts(); }

    if((draft.title && draft.title.trim()) || (draft.editorHtml && editor.innerText.trim())){
      if(composerHint) composerHint.style.display = "none";
      draftIndicator.textContent = "Restored your last draft";
    }
  }

  function clearDraft(){
    localStorage.removeItem(DRAFT_KEY);
  }

  loadDraft();

  /* ============ Extracting blocks for submission ============
     Paragraph blocks carry sanitized inline HTML (bold/italic/links) in
     `html`, not just plain text — that's what lets formatting survive the
     trip through review and out to the published article. The sanitizer
     (sanitizeInlineHTML, from main.js) only ever allows <strong>/<em>/<a>/
     <br>; the server re-sanitizes the same way on approval, since this
     client-side pass alone isn't a real security boundary. */
  function extractBlocks(){
    const blocks = [];
    Array.from(editor.childNodes).forEach(node => {
      if(node.nodeType === Node.TEXT_NODE){
        const t = node.textContent.trim();
        if(t) blocks.push({ type: "paragraph", html: escapeHtml(t) });
        return;
      }
      if(node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if(tag === "h1" || tag === "h2" || tag === "h3"){
        const t = node.textContent.trim();
        if(t) blocks.push({ type: "heading", text: t });
      } else if(tag === "figure"){
        const img = node.querySelector("img");
        const cap = node.querySelector("figcaption");
        if(img && img.src.startsWith("data:")){
          const commaIdx = img.src.indexOf(",");
          const base64 = img.src.slice(commaIdx + 1);
          blocks.push({
            type: "image",
            base64,
            filename: img.dataset.filename || "photo.jpg",
            caption: cap ? cap.textContent.trim() : ""
          });
        }
      } else {
        const t = node.textContent.trim();
        if(t) blocks.push({ type: "paragraph", html: sanitizeInlineHTML(node.innerHTML) });
      }
    });
    return blocks;
  }

  /* ============ Submit ============ */
  document.getElementById("submit-btn").addEventListener("click", submitArticle);

  async function submitArticle(){
    const title = titleEl.value.trim();
    const deck = deckEl.value.trim();
    const blocks = extractBlocks();

    if(!title){
      showStatus("submit-status", "error", "⚠ Please add a title before submitting.");
      titleEl.focus();
      return;
    }
    if(!blocks.length){
      showStatus("submit-status", "error", "⚠ Please write something before submitting.");
      editor.focus();
      return;
    }

    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    showStatus("submit-status", "working", "Submitting for review…");

    try{
      let leadImage = null;
      if(leadImageData){
        const commaIdx = leadImageData.dataUrl.indexOf(",");
        leadImage = { base64: leadImageData.dataUrl.slice(commaIdx + 1), filename: leadImageData.filename };
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.token, title, deck, category: selectedCategory, tags, blocks, leadImage
        })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Couldn't submit your article.");

      showStatus("submit-status", "success", "✅ Submitted! An editor will review it soon — tap 📋 above to check its status.");

      clearDraft();
      titleEl.value = "";
      autoGrow(titleEl);
      deckEl.value = "";
      autoGrow(deckEl);
      tags = [];
      renderTags();
      clearLeadImage();
      editor.innerHTML = "";
      updateCounts();
      draftIndicator.textContent = "";
      if(composerHint) composerHint.style.display = "block";
      loadMySubmissions();
    } catch(e){
      showStatus("submit-status", "error", "⚠ " + e.message);
    } finally {
      btn.disabled = false;
    }
  }

  /* ============ My submissions (overlay) ============ */
  const STATUS_LABELS = {
    pending: "⏳ Waiting for review",
    approved: "✅ Published",
    rejected: "✎ Needs changes"
  };

  function formatDateSafe(str){
    try{ return formatDate(str); }catch(e){ return str; }
  }

  const submissionsPanel = document.getElementById("submissions-panel");
  document.getElementById("submissions-btn").addEventListener("click", () => {
    submissionsPanel.hidden = false;
    loadMySubmissions();
  });
  document.getElementById("submissions-close").addEventListener("click", () => {
    submissionsPanel.hidden = true;
  });
  submissionsPanel.addEventListener("click", (e) => {
    if(e.target === submissionsPanel) submissionsPanel.hidden = true;
  });

  async function loadMySubmissions(){
    const list = document.getElementById("my-submissions-list");
    const badge = document.getElementById("submissions-badge");
    list.innerHTML = `<div class="manage-empty">Loading…</div>`;
    try{
      const res = await fetch("/api/my-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Couldn't load your submissions.");

      const pendingCount = data.items.filter(it => it.status === "pending").length;
      if(pendingCount){ badge.style.display = "flex"; badge.textContent = pendingCount; }
      else { badge.style.display = "none"; }

      if(!data.items.length){
        list.innerHTML = `<div class="manage-empty">You haven't submitted anything yet — write your first story!</div>`;
        return;
      }
      list.innerHTML = data.items.map(it => `
        <div class="submission-item">
          <div class="submission-item-head">
            <strong>${escapeHtml(it.title)}</strong>
            <span class="status-badge friendly ${it.status}">${STATUS_LABELS[it.status] || it.status}</span>
          </div>
          <div class="submission-meta">Submitted ${formatDateSafe(it.submittedAt.slice(0,10))}</div>
          ${it.reviewNote ? `<div class="submission-note">Editor's note: ${escapeHtml(it.reviewNote)}</div>` : ""}
        </div>`).join("");
    } catch(e){
      list.innerHTML = `<div class="manage-empty">⚠ ${escapeHtml(e.message)}</div>`;
    }
  }

  updateCounts();
  if(isAuthenticated) loadMySubmissions();

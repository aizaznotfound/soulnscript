/* =========================================================
   SOUL & SCRIPT — js/pages/editor.js
   Staff publishing tool — content form, live preview, GitHub upload/manage, contributor submissions review.
   Page-specific script for editor.html. Loaded last, after all
   shared js/lib, js/render, js/nav.js, js/richtext.js, js/bootstrap.js.
   ========================================================= */

  let downloadLog = [];
  const AUTH_KEY = "gkmc_editor_auth_v1";


/* =========================================================================
   Bilingual fields · safer publishing · drafts · approval options
   ========================================================================= */

// ---- Urdu companion fields (the site reads <field>_ur when a reader picks اردو) ----
const UR_FIELDS = {
  post:  [["p-title-ur","title_ur"],["p-deck-ur","deck_ur"],["p-author-ur","author_ur"],["p-readtime-ur","readTime_ur"],["p-caption-ur","imageCaption_ur"]],
  video: [["v-title-ur","title_ur"],["v-deck-ur","deck_ur"],["v-author-ur","author_ur"]],
  photo: [["ph-title-ur","title_ur"],["ph-caption-ur","caption_ur"],["ph-author-ur","author_ur"]],
  event: [["ev-title-ur","title_ur"],["ev-description-ur","description_ur"],["ev-location-ur","location_ur"]],
  team:  [["tm-name-ur","name_ur"],["tm-role-ur","role_ur"],["tm-bio-ur","bio_ur"]]
};
const UR_BLOCKS = { post: "p-ur-block", video: "v-ur-block", photo: "ph-ur-block", event: "ev-ur-block", team: "tm-ur-block" };
function readUrdu(type){
  const out = {};
  UR_FIELDS[type].forEach(([id, key]) => { const v = (document.getElementById(id).value || "").trim(); if(v) out[key] = v; });
  return out;
}
function fillUrdu(type, item){
  let any = false;
  UR_FIELDS[type].forEach(([id, key]) => { const v = (item && item[key]) || ""; document.getElementById(id).value = v; if(v) any = true; });
  if(type === "post" && item && item.body_ur && item.body_ur.length) any = true;
  document.getElementById(UR_BLOCKS[type]).open = any;
}

// ---- Fields the form models, per type. Anything else in a saved file is carried over on re-publish ----
const MODELED = {
  post:  ["slug","category","featured","title","deck","author","date","readTime","image","imageCaption","tags","body","body_ur"],
  video: ["slug","title","deck","author","date","youtubeId","thumbnail","tags"],
  photo: ["slug","title","caption","author","date","tags","image"],
  event: ["slug","title","description","date","time","location","link","endDate","status","image"],
  team:  ["slug","name","role","team","order","bio","photo"]
};
const editingOriginal = { post: null, video: null, photo: null, event: null, team: null };
function withExtras(type, data){
  const orig = editingOriginal[type];
  if(!orig || orig.slug !== data.slug) return data;           // new item, or the slug was changed on purpose
  const merged = { ...orig };
  MODELED[type].forEach(k => delete merged[k]);               // the form owns these (so clearing a field really clears it)
  UR_FIELDS[type].forEach(([, k]) => delete merged[k]);
  return Object.assign(merged, data);
}
function afterEdit(type, item){
  editingOriginal[type] = item;
  fillUrdu(type, item);
  if(type === "post"){
    document.getElementById("p-body-ur-editor").innerHTML = bodyArrayToEditorHTML(item.body_ur);
    updateUrCounts();
  }
  if(type === "video"){
    document.getElementById("v-tags").value = (item.tags || []).join(", ");
    const isAuto = !item.thumbnail || /img\.youtube\.com\/vi\/[^/]+\/(maxres|hq)default\.jpg$/.test(item.thumbnail);
    document.getElementById("v-thumb").value = isAuto ? "" : item.thumbnail;
  }
}

// ---- YouTube helpers ----
function parseYouTubeId(input){
  const s = String(input || "").trim();
  if(!s) return "";
  if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try{
    const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
    if(u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0].slice(0, 11);
    const v = u.searchParams.get("v"); if(v) return v.slice(0, 11);
    const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/); if(m) return m[1];
  }catch(e){}
  return "";
}
function imageLoads(url, ms){
  return new Promise(resolve => {
    const img = new Image(); const t = setTimeout(() => resolve(false), ms || 4000);
    img.onload = () => { clearTimeout(t); resolve(img.naturalWidth > 200); };
    img.onerror = () => { clearTimeout(t); resolve(false); };
    img.src = url;
  });
}
async function pickYouTubeThumb(id){
  const hd = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  return (await imageLoads(hd)) ? hd : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
document.getElementById("v-youtube").addEventListener("change", (e) => {
  const id = parseYouTubeId(e.target.value);
  if(id) e.target.value = id;
  renderVideoPreview();
});
["v-tags","v-thumb","v-youtube"].forEach(id => document.getElementById(id).addEventListener("input", renderVideoPreview));

// ---- Validation before anything is published ----
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const val = (id) => (document.getElementById(id).value || "").trim();
function slugProblem(slug, titleFieldName){
  if(!slug) return `The ${titleFieldName} has no English letters — type an English URL slug (letters, numbers, hyphens) in the slug box.`;
  if(!SLUG_RE.test(slug)) return "The URL slug can only contain lowercase letters, numbers and single hyphens (e.g. my-article-title).";
  return "";
}
const PUBLISH_CFG = {
  post: { status: "p-status", read: () => readPostForm(), check(){
    if(!val("p-title")) return "Add a headline first.";
    const sp = slugProblem(val("p-slug") || slugify(val("p-title")), "headline"); if(sp) return sp;
    if(!val("p-deck")) return "Add a subheading (deck) — it shows under the headline and on cards.";
    if(!val("p-author")) return "Add the author’s name.";
    if(!extractStaffBody().length) return "The story body is empty.";
    return ""; } },
  video: { status: "v-status", read: () => readVideoForm(), check(){
    if(!val("v-title")) return "Add a video title first.";
    const sp = slugProblem(val("v-slug") || slugify(val("v-title")), "title"); if(sp) return sp;
    if(!val("v-deck")) return "Add a short description.";
    if(!parseYouTubeId(val("v-youtube"))) return "That doesn’t look like a YouTube link or ID. Paste the full link from the address bar or the Share button.";
    return ""; } },
  photo: { status: "ph-status", read: () => readPhotoForm(), check(){
    if(!val("ph-title")) return "Add a title first.";
    const sp = slugProblem(val("ph-slug") || slugify(val("ph-title")), "title"); if(sp) return sp;
    if(!val("ph-author")) return "Add the artist / photographer’s name.";
    if(!document.getElementById("ph-image-file").files[0] && !val("ph-image")) return "An art piece needs an image — upload one or paste an image URL.";
    return ""; } },
  event: { status: "ev-status-msg", read: () => readEventForm(), check(){
    if(!val("ev-title")) return "Add a title first.";
    const sp = slugProblem(val("ev-slug") || slugify(val("ev-title")), "title"); if(sp) return sp;
    if(!val("ev-date")) return "Add a start date.";
    if(val("ev-end-date") && val("ev-end-date") < val("ev-date")) return "The end date is before the start date.";
    return ""; } },
  team: { status: "tm-status", read: () => readTeamForm(), check(){
    if(!val("tm-name")) return "Add the member’s name first.";
    const sp = slugProblem(val("tm-slug") || slugify(val("tm-name")), "name"); if(sp) return sp;
    if(!val("tm-role")) return "Add the member’s role.";
    return ""; } }
};
function prepare(type){
  const c = PUBLISH_CFG[type];
  const problem = c.check();
  if(problem){ showStatus(c.status, "error", "⚠ " + problem); return null; }
  return withExtras(type, c.read());
}

// ---- "Where will this appear?" hint for the writing categories ----
const WHERE = {
  news: "Appears in the Literature room, The Library and “Fresh across the house”.",
  campus: "Appears in the Literature room and The Library.",
  academics: "Appears in the Philosophy room and The Library.",
  opinion: "Appears on The Open Floor, in the Philosophy room, and in The Library.",
  events: "Appears in Session Notes and The Library."
};
function updateWhere(){ document.getElementById("p-where").textContent = WHERE[document.getElementById("p-category").value] || ""; }
document.getElementById("p-category").addEventListener("change", updateWhere);
updateWhere();

// ---- Urdu story-body editor ----
const urBody = document.getElementById("p-body-ur-editor");
function updateUrCounts(){
  const words = (urBody.innerText || "").trim().split(/\s+/).filter(Boolean).length;
  document.getElementById("pu-counts").textContent = `${words} word${words === 1 ? "" : "s"}`;
}
document.getElementById("pu-heading").addEventListener("mousedown", (e) => e.preventDefault());
document.getElementById("pu-heading").addEventListener("click", () => {
  urBody.focus();
  const cur = (document.queryCommandValue("formatBlock") || "").toLowerCase();
  document.execCommand("formatBlock", false, cur === "h3" ? "p" : "h3");
  updateUrCounts(); renderPreview();
});
initRichText(urBody, {
  buttons: { bold: document.getElementById("pu-bold"), italic: document.getElementById("pu-italic"), link: document.getElementById("pu-link") },
  onChange: () => { updateUrCounts(); }
});
urBody.addEventListener("input", updateUrCounts);

// ---- Draft autosave (this browser only) ----
const DRAFT_KEY = (t) => "ss_editor_draft_v2_" + t;
const DRAFT_FORMS = { post: "post-form", video: "video-form", photo: "photo-form", event: "event-form", team: "team-form" };
const DRAFT_RTE = { post: ["p-body-editor", "p-body-ur-editor"] };
const DRAFT_TITLE = { post: "p-title", video: "v-title", photo: "ph-title", event: "ev-title", team: "tm-name" };
const DRAFT_LABEL = { post: "Writing", video: "Video", photo: "Art piece", event: "Event", team: "Team member" };
let draftTimer = null;
function collectDraft(type){
  const data = {};
  document.getElementById(DRAFT_FORMS[type]).querySelectorAll("input, select, textarea").forEach(el => {
    if(!el.id || el.type === "file" || el.type === "button") return;
    data[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  (DRAFT_RTE[type] || []).forEach(id => { data["#" + id] = document.getElementById(id).innerHTML; });
  return data;
}
function saveDraft(type){
  if(!val(DRAFT_TITLE[type])) return;                      // nothing worth saving yet
  try{ localStorage.setItem(DRAFT_KEY(type), JSON.stringify({ t: Date.now(), data: collectDraft(type) })); }catch(e){}
}
function clearDraft(type){ try{ localStorage.removeItem(DRAFT_KEY(type)); }catch(e){} showDraftBanner(); }
function restoreDraft(type){
  let rec; try{ rec = JSON.parse(localStorage.getItem(DRAFT_KEY(type)) || "null"); }catch(e){}
  if(!rec) return;
  setMode(type);
  Object.entries(rec.data).forEach(([id, v]) => {
    if(id[0] === "#"){ document.getElementById(id.slice(1)).innerHTML = v; return; }
    const el = document.getElementById(id); if(!el) return;
    if(el.type === "checkbox") el.checked = !!v; else el.value = v;
    if(/-slug$/.test(id) && v) el.dataset.manual = "true";
  });
  document.getElementById(DRAFT_FORMS[type]).querySelectorAll("input, select, textarea").forEach(el => el.dispatchEvent(new Event("input", { bubbles: true })));
  updatePbCounts(); updateUrCounts(); updateWhere(); renderPreview();
  const blk = document.getElementById(UR_BLOCKS[type]);
  blk.open = UR_FIELDS[type].some(([id]) => val(id)) || (type === "post" && !!(urBody.innerText || "").trim());
  document.getElementById("draft-banner").style.display = "none";
  showDraftBanner();
}
function discardDraft(type){ clearDraft(type); }
function showDraftBanner(){
  const bar = document.getElementById("draft-banner");
  const items = Object.keys(DRAFT_FORMS).map(t => {
    try{ const r = JSON.parse(localStorage.getItem(DRAFT_KEY(t)) || "null"); return r ? { t, r } : null; }catch(e){ return null; }
  }).filter(Boolean);
  if(!items.length){ bar.style.display = "none"; bar.innerHTML = ""; return; }
  bar.style.display = "block";
  bar.innerHTML = items.map(({ t, r }) => `
    <div class="draft-banner-row">
      <span>📝 Unsaved <strong>${DRAFT_LABEL[t]}</strong> draft — “${escapeHtml((r.data[DRAFT_TITLE[t]] || "").slice(0, 60))}” · ${new Date(r.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
      <span><button type="button" class="btn-secondary" onclick="restoreDraft('${t}')">Restore</button>
      <button type="button" class="btn-secondary" onclick="discardDraft('${t}')">Discard</button></span>
    </div>`).join("");
}
document.addEventListener("input", (e) => {
  const form = e.target.closest && e.target.closest("form"); if(!form) return;
  const type = Object.keys(DRAFT_FORMS).find(t => DRAFT_FORMS[t] === form.id); if(!type) return;
  clearTimeout(draftTimer); draftTimer = setTimeout(() => saveDraft(type), 700);
});
showDraftBanner();

// ---- Contributor submissions: choose category / date / slug / featured before approving ----
const PEND_CATS = [["news","Prose & picture stories → Literature"],["campus","Poetry → Literature"],["academics","Reflection / essay → Philosophy"],["opinion","Reader reflection → The Open Floor"],["events","Session recap → Session Notes"]];
function renderPending(){
  const list = document.getElementById("pending-list");
  if(!pendingItems.length){
    list.innerHTML = `<div class="manage-empty">No submissions waiting for review.</div>`;
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  list.innerHTML = pendingItems.map(sub => `
    <div class="pending-review-item">
      <div class="pending-review-head">
        <div>
          <h4>${escapeHtml(sub.title)}</h4>
          <div class="submission-meta">By ${escapeHtml(sub.author.username)} (${escapeHtml(sub.author.email)}, ${escapeHtml(sub.author.whatsapp)}) · submitted as ${escapeHtml(CATEGORY_LABELS && CATEGORY_LABELS[sub.category] || sub.category)}</div>
        </div>
      </div>
      <p style="font-family:var(--body); font-style:italic; margin:8px 0;">${escapeHtml(sub.deck)}</p>
      <div class="pending-review-body">${blockPreviewHTML(sub)}</div>
      <div class="pending-options">
        <label>Publish under
          <select id="pend-cat-${sub.id}">${PEND_CATS.map(([v, l]) => `<option value="${v}"${v === sub.category ? " selected" : ""}>${escapeHtml(l)}</option>`).join("")}</select></label>
        <label>Publish date <input type="date" id="pend-date-${sub.id}" value="${today}"></label>
        <label>URL slug <input type="text" id="pend-slug-${sub.id}" value="${escapeHtml(sub.slug || slugify(sub.title))}"></label>
        <label class="pend-check"><input type="checkbox" id="pend-feat-${sub.id}"> Feature on the homepage</label>
      </div>
      <div class="pending-review-actions">
        <button type="button" class="btn-approve" onclick="approveSubmission('${sub.id}')">✅ Approve &amp; Publish</button>
        <button type="button" class="btn-reject" onclick="rejectSubmission('${sub.id}')">✕ Decline</button>
      </div>
    </div>`).join("");
}

async function approveSubmission(id){
  const auth = requireAuth("pending-status");
  if(!auth) return;
  const slug = val("pend-slug-" + id);
  if(!SLUG_RE.test(slug)){ showStatus("pending-status", "error", "⚠ The URL slug can only contain lowercase letters, numbers and single hyphens."); return; }
  if(!confirm("Publish this article to the live site?")) return;
  showStatus("pending-status", "working", "Publishing…");
  try{
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: auth.username, password: auth.password, id, action: "approve",
        category: val("pend-cat-" + id), date: val("pend-date-" + id), slugOverride: slug,
        featured: document.getElementById("pend-feat-" + id).checked
      })
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "Couldn't publish this article.");
    showStatus("pending-status", "success", "✅ Published. Your site will rebuild within about a minute.");
    loadPending();
  } catch(e){
    showStatus("pending-status", "error", "⚠ " + e.message);
  }
}

  document.getElementById("p-date").valueAsDate = new Date();
  document.getElementById("v-date").valueAsDate = new Date();
  document.getElementById("ev-date").valueAsDate = new Date();

  function slugify(str){
    return str.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* ============ Login handling ============ */
  function getAuth(){
    try{ return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); }
    catch(e){ return null; }
  }
  function setLoginStatusPill(loggedIn){
    const pill = document.getElementById("login-status-pill");
    if(loggedIn){
      pill.textContent = "Logged in";
      pill.classList.remove("disconnected");
      pill.classList.add("connected");
    } else {
      pill.textContent = "Not logged in";
      pill.classList.remove("connected");
      pill.classList.add("disconnected");
    }
  }
  function loadAuthIntoForm(){
    const auth = getAuth();
    if(auth && auth.username){
      document.getElementById("login-username").value = auth.username;
      document.getElementById("login-password").value = auth.password;
      setLoginStatusPill(true);
    } else {
      setLoginStatusPill(false);
    }
  }
  function showStatus(elId, type, html){
    const el = document.getElementById(elId);
    el.className = "publish-status show " + type;
    el.innerHTML = html;
  }
  function hideStatus(elId){
    document.getElementById(elId).className = "publish-status";
  }

  async function doLogin(){
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    if(!username || !password){
      showStatus("login-status", "error", "Please enter both a username and password.");
      return;
    }
    showStatus("login-status", "working", "Checking…");
    try{
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if(data.ok){
        localStorage.setItem(AUTH_KEY, JSON.stringify({ username, password }));
        setLoginStatusPill(true);
        showStatus("login-status", "success", "✅ Logged in. You can publish now.");
      } else {
        setLoginStatusPill(false);
        showStatus("login-status", "error", data.error || "Incorrect username or password.");
      }
    } catch(e){
      showStatus("login-status", "error", "Couldn't reach the server. Check your internet connection and try again.");
    }
  }

  function doLogout(){
    localStorage.removeItem(AUTH_KEY);
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    setLoginStatusPill(false);
    hideStatus("login-status");
  }

  document.getElementById("login-panel-toggle").addEventListener("click", () => {
    const body = document.getElementById("login-panel-body");
    body.style.display = body.style.display === "none" ? "block" : "none";
  });

  loadAuthIntoForm();

  function requireAuth(statusElId){
    const auth = getAuth();
    if(!auth || !auth.username || !auth.password){
      showStatus(statusElId, "error", "⚠ Please log in first — open the <strong>Staff Login</strong> panel above.");
      document.getElementById("login-panel-body").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
      return null;
    }
    return auth;
  }

  /* ============ File helpers ============ */
  function fileToBase64(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read the image file."));
      reader.readAsDataURL(file);
    });
  }

  async function callPublishApi(payload){
    const r = await callPublishApiRaw(payload);
    if(r && r.data && r.data.ok) clearDraft(payload.type);
    return r;
  }

  async function callPublishApiRaw(payload){
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data;
    try{ data = await res.json(); } catch(e){ data = { ok:false, error:"Unexpected server response." }; }
    return { status: res.status, data };
  }

  /* ============ Editor tabs ============ */
  function setMode(mode){
    document.querySelectorAll(".editor-tabs button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    document.getElementById("post-shell").style.display = mode === "post" ? "grid" : "none";
    document.getElementById("video-shell").style.display = mode === "video" ? "grid" : "none";
    document.getElementById("photo-shell").style.display = mode === "photo" ? "grid" : "none";
    document.getElementById("event-shell").style.display = mode === "event" ? "grid" : "none";
    document.getElementById("team-shell").style.display = mode === "team" ? "grid" : "none";
  }

  function setImageMode(mode){
    document.querySelectorAll("#post-shell .image-input-toggle button").forEach(b => b.classList.toggle("active", b.dataset.imgmode === mode));
    document.getElementById("p-image-upload-wrap").style.display = mode === "upload" ? "block" : "none";
    document.getElementById("p-image-url-wrap").style.display = mode === "url" ? "block" : "none";
  }

  function setPhotoImageMode(mode){
    document.querySelectorAll("#photo-shell .image-input-toggle button").forEach(b => b.classList.toggle("active", b.dataset.imgmode === mode));
    document.getElementById("ph-image-upload-wrap").style.display = mode === "upload" ? "block" : "none";
    document.getElementById("ph-image-url-wrap").style.display = mode === "url" ? "block" : "none";
  }

  function setTeamImageMode(mode){
    document.querySelectorAll("#team-shell .image-input-toggle button").forEach(b => b.classList.toggle("active", b.dataset.imgmode === mode));
    document.getElementById("tm-image-upload-wrap").style.display = mode === "upload" ? "block" : "none";
    document.getElementById("tm-image-url-wrap").style.display = mode === "url" ? "block" : "none";
  }

  function setEventImageMode(mode){
    document.querySelectorAll("#event-shell .image-input-toggle button").forEach(b => b.classList.toggle("active", b.dataset.imgmode === mode));
    document.getElementById("ev-image-upload-wrap").style.display = mode === "upload" ? "block" : "none";
    document.getElementById("ev-image-url-wrap").style.display = mode === "url" ? "block" : "none";
  }

  document.getElementById("p-image-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const wrap = document.getElementById("p-image-preview");
    const img = document.getElementById("p-image-preview-img");
    if(file){
      img.src = URL.createObjectURL(file);
      wrap.style.display = "block";
    } else {
      wrap.style.display = "none";
    }
    renderPreview();
  });

  document.getElementById("tm-image-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const wrap = document.getElementById("tm-image-preview");
    const img = document.getElementById("tm-image-preview-img");
    if(file){
      img.src = URL.createObjectURL(file);
      wrap.style.display = "block";
    } else {
      wrap.style.display = "none";
    }
    renderTeamPreview();
  });

  document.getElementById("ph-image-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const wrap = document.getElementById("ph-image-preview");
    const img = document.getElementById("ph-image-preview-img");
    if(file){
      img.src = URL.createObjectURL(file);
      wrap.style.display = "block";
    } else {
      wrap.style.display = "none";
    }
    renderPhotoPreview();
  });

  document.getElementById("ev-image-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const wrap = document.getElementById("ev-image-preview");
    const img = document.getElementById("ev-image-preview-img");
    if(file){
      img.src = URL.createObjectURL(file);
      wrap.style.display = "block";
    } else {
      wrap.style.display = "none";
    }
    renderEventPreview();
  });

  // Auto-slug from title as the user types
  document.getElementById("p-title").addEventListener("input", (e) => {
    if(!document.getElementById("p-slug").dataset.manual){
      document.getElementById("p-slug").value = slugify(e.target.value);
    }
  });
  document.getElementById("p-slug").addEventListener("input", (e) => { e.target.dataset.manual = "true"; });

  document.getElementById("v-title").addEventListener("input", (e) => {
    if(!document.getElementById("v-slug").dataset.manual){
      document.getElementById("v-slug").value = slugify(e.target.value);
    }
  });
  document.getElementById("v-slug").addEventListener("input", (e) => { e.target.dataset.manual = "true"; });

  document.getElementById("ph-title").addEventListener("input", (e) => {
    if(!document.getElementById("ph-slug").dataset.manual){
      document.getElementById("ph-slug").value = slugify(e.target.value);
    }
    renderPhotoPreview();
  });
  document.getElementById("ph-slug").addEventListener("input", (e) => { e.target.dataset.manual = "true"; });
  ["ph-caption","ph-author","ph-date","ph-image","ph-tags"].forEach(id => {
    document.getElementById(id).addEventListener("input", renderPhotoPreview);
  });

  document.getElementById("ev-title").addEventListener("input", (e) => {
    if(!document.getElementById("ev-slug").dataset.manual){
      document.getElementById("ev-slug").value = slugify(e.target.value);
    }
    renderEventPreview();
  });
  document.getElementById("ev-slug").addEventListener("input", (e) => { e.target.dataset.manual = "true"; });
  ["ev-description","ev-date","ev-end-date","ev-time","ev-location","ev-status","ev-link","ev-image"].forEach(id => {
    document.getElementById(id).addEventListener("input", renderEventPreview);
  });

  /* ============ Live preview for event form ============ */
  function renderEventPreview(){
    const mount = document.getElementById("event-preview-mount");
    if(!mount) return;
    const title = document.getElementById("ev-title").value.trim() || "Your Event Title Here";
    const description = document.getElementById("ev-description").value.trim();
    const date = document.getElementById("ev-date").value;
    const endDate = document.getElementById("ev-end-date").value;
    const time = document.getElementById("ev-time").value.trim();
    const location = document.getElementById("ev-location").value.trim();
    const statusField = document.getElementById("ev-status").value;
    const link = document.getElementById("ev-link").value.trim();
    const uploadFile = document.getElementById("ev-image-file").files[0];
    const imgSrc = uploadFile ? document.getElementById("ev-image-preview-img").src : (document.getElementById("ev-image").value || "");

    const previewEvent = {
      title, description, date: date || new Date().toISOString().slice(0,10),
      endDate: endDate || null, time, location,
      status: statusField === "auto" ? null : statusField,
      link, image: imgSrc
    };
    const active = date ? isEventActive(previewEvent) : true;
    mount.innerHTML = eventCardHTML(previewEvent, active);
  }

  /* ============ Live preview for photo form ============ */
  function renderPhotoPreview(){
    const mount = document.getElementById("photo-preview-mount");
    if(!mount) return;
    const title = document.getElementById("ph-title").value.trim() || "Your Title Here";
    const caption = document.getElementById("ph-caption").value.trim();
    const author = document.getElementById("ph-author").value.trim() || "Soul & Script Media Team";
    const date = document.getElementById("ph-date").value || new Date().toISOString().slice(0,10);
    const uploadFile = document.getElementById("ph-image-file").files[0];
    const imgSrc = uploadFile ? document.getElementById("ph-image-preview-img").src : (document.getElementById("ph-image").value || "");
    mount.innerHTML = `
      <span class="tag-pill">Photo</span>
      <h1 style="font-size:1.5rem; margin:10px 0 6px;">${escapeHtml(title)}</h1>
      ${caption ? `<p class="deck" style="font-size:.95rem;">${escapeHtml(caption)}</p>` : ""}
      <div class="byline" style="margin-bottom:14px;">${escapeHtml(author)} · ${formatDate(date)}</div>
      ${imgSrc ? `<img src="${imgSrc}" style="width:100%; border:1px solid var(--rule); border-radius:var(--radius-md);" alt="">` : `<div class="empty-state">No photo added yet.</div>`}
    `;
  }

  /* ============ Live preview for post form ============ */
  const PREVIEW_RAW_BLOCK_RE = /^\s*<(h[1-6]|figure|blockquote|ul|ol|div|table)[\s>]/i;

  // Pulls paragraph/heading blocks straight out of the contenteditable body
  // field. Paragraphs keep their sanitized inline formatting (bold/italic/
  // links); this is the same allowlist sanitizeInlineHTML() enforces on
  // write.html, so pasted content can't smuggle anything else in here either.
  function extractStaffBody(){ return extractBody(document.getElementById("p-body-editor")); }

  function extractBody(editorEl){
    const body = [];
    if(!editorEl) return body;
    Array.from(editorEl.childNodes).forEach(node => {
      if(node.nodeType === Node.TEXT_NODE){
        const t = node.textContent.trim();
        if(t) body.push(escapeHtml(t));
        return;
      }
      if(node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if(tag === "h1" || tag === "h2" || tag === "h3"){
        const t = node.textContent.trim();
        if(t) body.push(`<h3>${escapeHtml(t)}</h3>`);
      } else {
        const t = node.textContent.trim();
        if(t) body.push(sanitizeInlineHTML(node.innerHTML));
      }
    });
    return body;
  }

  // The inverse of extractStaffBody() — turns a saved body[] array back into
  // editable content when opening an existing article. Raw block strings
  // (headings) become real elements the moment they're assigned via
  // innerHTML; everything else is already sanitized HTML, so it's safe to
  // drop straight in.
  function bodyArrayToEditorHTML(body){
    return (body || []).map(p => {
      if(typeof p !== "string" || !p) return "";
      return PREVIEW_RAW_BLOCK_RE.test(p) ? p : `<p>${p}</p>`;
    }).join("");
  }

  function updatePbCounts(){
    const editorEl = document.getElementById("p-body-editor");
    const words = (editorEl.innerText || "").trim().split(/\s+/).filter(Boolean).length;
    document.getElementById("pb-counts").textContent = `${words} word${words === 1 ? "" : "s"}`;
  }

  function readPostForm(){
    const title = document.getElementById("p-title").value || "Your Headline Here";
    const slug = document.getElementById("p-slug").value || slugify(title) || "untitled";
    const deck = document.getElementById("p-deck").value || "Your subheading will appear here.";
    const author = document.getElementById("p-author").value || "Author Name";
    const date = document.getElementById("p-date").value || new Date().toISOString().slice(0,10);
    const readTime = document.getElementById("p-readtime").value || "3 min read";
    const category = document.getElementById("p-category").value;
    const uploadFile = document.getElementById("p-image-file").files[0];
    let image;
    if(uploadFile){
      image = document.getElementById("p-image-preview-img").src || "";
    } else {
      image = document.getElementById("p-image").value || "";
    }
    const imageCaption = document.getElementById("p-caption").value;
    const tags = document.getElementById("p-tags").value.split(",").map(t => t.trim()).filter(Boolean);
    const featured = document.getElementById("p-featured").checked;
    const body = extractStaffBody();
    const out = { slug, category, featured, title, deck, author, date, readTime, image, imageCaption, tags, body: body.length ? body : ["Your story body will appear here."], ...readUrdu("post") };
    const bodyUr = extractBody(document.getElementById("p-body-ur-editor"));
    if(bodyUr.length) out.body_ur = bodyUr;
    return out;
  }

  function renderPreview(){
    const post = readPostForm();
    let dropCapUsed = false;
    const bodyHtml = post.body.map((p) => {
      if(PREVIEW_RAW_BLOCK_RE.test(p)) return p;
      const cls = !dropCapUsed ? ' class="drop-cap"' : '';
      dropCapUsed = true;
      return `<p${cls}>${p}</p>`;
    }).join("");
    document.getElementById("preview-mount").innerHTML = `
      ${cardHTML(post)}
      <div style="margin-top:24px; border-top:2px solid var(--rule-strong); padding-top:16px;">
        <h2 style="font-family:var(--display); font-size:1.4rem; margin:0 0 8px;">${escapeHtml(post.title)}</h2>
        <p style="font-style:italic; color:var(--ink-soft);">${escapeHtml(post.deck)}</p>
        <div class="byline">${escapeHtml(post.author)} · ${formatDate(post.date)} · ${escapeHtml(post.readTime)}</div>
        <div class="article-body" style="max-width:none; padding:0; margin-top:14px; font-size:.95rem;">${bodyHtml}</div>
      </div>`;
  }

  const bodyEditor = document.getElementById("p-body-editor");
  const staffHeadingBtn = document.getElementById("pb-heading");
  staffHeadingBtn.addEventListener("mousedown", (e) => e.preventDefault());
  staffHeadingBtn.addEventListener("click", () => {
    bodyEditor.focus();
    const current = document.queryCommandValue("formatBlock");
    const isHeading = current && current.toLowerCase() === "h3";
    document.execCommand("formatBlock", false, isHeading ? "P" : "H3");
    staffHeadingBtn.classList.toggle("active", !isHeading);
    updatePbCounts();
    renderPreview();
  });
  function updateStaffHeadingState(){
    const current = document.queryCommandValue("formatBlock");
    staffHeadingBtn.classList.toggle("active", !!current && current.toLowerCase() === "h3");
  }
  bodyEditor.addEventListener("keyup", updateStaffHeadingState);
  bodyEditor.addEventListener("mouseup", updateStaffHeadingState);
  bodyEditor.addEventListener("input", () => { updatePbCounts(); renderPreview(); });

  initRichText(bodyEditor, {
    buttons: {
      bold: document.getElementById("pb-bold"),
      italic: document.getElementById("pb-italic"),
      link: document.getElementById("pb-link")
    },
    bubble: {
      root: document.getElementById("format-bubble-staff"),
      bold: document.getElementById("pb-bubble-bold"),
      italic: document.getElementById("pb-bubble-italic"),
      link: document.getElementById("pb-bubble-link")
    },
    langToggle: document.getElementById("pb-lang"),
    onChange: () => { updatePbCounts(); renderPreview(); }
  });

  ["p-category","p-title","p-slug","p-deck","p-author","p-date","p-readtime","p-image","p-caption","p-tags","p-featured"]
    .forEach(id => document.getElementById(id).addEventListener("input", renderPreview));
  renderPreview();

  function readVideoForm(){
    const title = document.getElementById("v-title").value || "Your Video Title";
    const slug = document.getElementById("v-slug").value || slugify(title) || "untitled-video";
    const deck = document.getElementById("v-deck").value || "Your video description will appear here.";
    const author = document.getElementById("v-author").value || "Soul & Script Media Team";
    const date = document.getElementById("v-date").value || new Date().toISOString().slice(0,10);
    const youtubeId = parseYouTubeId(document.getElementById("v-youtube").value) || "dQw4w9WgXcQ";
    const customThumb = (document.getElementById("v-thumb").value || "").trim();
    const thumbnail = customThumb || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    const tags = document.getElementById("v-tags").value.split(",").map(t => t.trim()).filter(Boolean);
    return { slug, title, deck, author, date, youtubeId, thumbnail, tags, ...readUrdu("video") };
  }

  function renderVideoPreview(){
    const v = readVideoForm();
    document.getElementById("video-preview-mount").innerHTML = videoCardHTML(v);
  }
  ["v-title","v-slug","v-deck","v-author","v-date","v-youtube"]
    .forEach(id => document.getElementById(id).addEventListener("input", renderVideoPreview));
  renderVideoPreview();

  function readTeamForm(){
    const name = document.getElementById("tm-name").value || "New Member";
    const slug = document.getElementById("tm-slug").value || slugify(name) || "new-member";
    const role = document.getElementById("tm-role").value || "";
    const team = document.getElementById("tm-team").value || "founders";
    const order = parseInt(document.getElementById("tm-order").value, 10) || 10;
    const bio = document.getElementById("tm-bio").value || "";
    const uploadFile = document.getElementById("tm-image-file").files[0];
    const photo = uploadFile
      ? (document.getElementById("tm-image-preview-img").src || "")
      : (document.getElementById("tm-photo").value || "");
    return { slug, name, role, team, order, bio, photo, ...readUrdu("team") };
  }

  function renderTeamPreview(){
    const m = readTeamForm();
    document.getElementById("team-preview-mount").innerHTML = `<div class="team-grid" style="grid-template-columns:1fr;">${teamMemberCardHTML(m)}</div>`;
  }
  ["tm-name","tm-slug","tm-role","tm-team","tm-order","tm-bio","tm-photo"]
    .forEach(id => document.getElementById(id).addEventListener("input", renderTeamPreview));
  document.getElementById("tm-name").addEventListener("input", (e) => {
    if(!document.getElementById("tm-slug").dataset.manual){
      document.getElementById("tm-slug").value = slugify(e.target.value);
    }
  });
  document.getElementById("tm-slug").addEventListener("input", (e) => { e.target.dataset.manual = "true"; });
  renderTeamPreview();

  function refreshDraftList(){
    const el = document.getElementById("draft-items");
    if(!downloadLog.length){
      el.innerHTML = `<p style="font-family:var(--body); font-size:.9rem; color:var(--steel);">Nothing published yet this session — fill the form above and hit Publish (or Download).</p>`;
      return;
    }
    el.innerHTML = downloadLog.map(it => `
      <div class="draft-item">
        <span>${escapeHtml(it.icon)} ${escapeHtml(it.title)} <span style="opacity:.6; font-family:var(--utility); font-size:12px;">→ ${escapeHtml(it.detail)}</span></span>
      </div>`).join("");
  }
  refreshDraftList();

  function downloadJSON(data, filename){
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadPost(){
    const post = readPostForm();
    const warn = document.getElementById("p-warning");
    if(!document.getElementById("p-title").value.trim()){ warn.style.display="block"; warn.textContent = "Please add a headline first."; return; }
    if(!post.slug){ warn.style.display="block"; warn.textContent = "Please add a headline or slug first."; return; }
    warn.style.display="none";
    downloadJSON(post, `${post.slug}.json`);
    downloadLog.unshift({ icon: "📰", title: post.title, detail: `downloaded content/posts/${post.slug}.json` });
    refreshDraftList();
  }

  function downloadVideo(){
    const v = readVideoForm();
    const warn = document.getElementById("v-warning");
    if(!document.getElementById("v-title").value.trim()){ warn.style.display="block"; warn.textContent = "Please add a video title first."; return; }
    warn.style.display="none";
    downloadJSON(v, `${v.slug}.json`);
    downloadLog.unshift({ icon: "🎬", title: v.title, detail: `downloaded content/videos/${v.slug}.json` });
    refreshDraftList();
  }

  function readPhotoForm(){
    const title = document.getElementById("ph-title").value || "Untitled Photo";
    const slug = document.getElementById("ph-slug").value || slugify(title) || "untitled-photo";
    const caption = document.getElementById("ph-caption").value || "";
    const author = document.getElementById("ph-author").value || "Soul & Script Media Team";
    const date = document.getElementById("ph-date").value || new Date().toISOString().slice(0,10);
    const tags = document.getElementById("ph-tags").value.split(",").map(t => t.trim()).filter(Boolean);
    const uploadFile = document.getElementById("ph-image-file").files[0];
    const image = uploadFile
      ? (document.getElementById("ph-image-preview-img").src || "")
      : (document.getElementById("ph-image").value || "");
    return { slug, title, caption, author, date, tags, image, ...readUrdu("photo") };
  }

  function readEventForm(){
    const title = document.getElementById("ev-title").value || "Untitled Event";
    const slug = document.getElementById("ev-slug").value || slugify(title) || "untitled-event";
    const description = document.getElementById("ev-description").value || "";
    const date = document.getElementById("ev-date").value || new Date().toISOString().slice(0,10);
    const endDate = document.getElementById("ev-end-date").value || null;
    const time = document.getElementById("ev-time").value || "";
    const location = document.getElementById("ev-location").value || "";
    const statusField = document.getElementById("ev-status").value;
    const status = statusField === "auto" ? null : statusField;
    const link = document.getElementById("ev-link").value || "";
    const uploadFile = document.getElementById("ev-image-file").files[0];
    const image = uploadFile
      ? (document.getElementById("ev-image-preview-img").src || "")
      : (document.getElementById("ev-image").value || "");
    const event = { slug, title, description, date, time, location, link };
    if(endDate) event.endDate = endDate;
    if(status) event.status = status;
    if(image) event.image = image;
    Object.assign(event, readUrdu("event"));
    return event;
  }

  function downloadPhoto(){
    const p = readPhotoForm();
    const warn = document.getElementById("ph-warning");
    if(!document.getElementById("ph-title").value.trim()){ warn.style.display="block"; warn.textContent = "Please add a title first."; return; }
    warn.style.display="none";
    downloadJSON(p, `${p.slug}.json`);
    downloadLog.unshift({ icon: "📸", title: p.title, detail: `downloaded content/photos/${p.slug}.json` });
    refreshDraftList();
  }

  function downloadEvent(){
    const ev = readEventForm();
    const warn = document.getElementById("ev-warning");
    if(!document.getElementById("ev-title").value.trim()){ warn.style.display="block"; warn.textContent = "Please add a title first."; return; }
    if(!document.getElementById("ev-date").value){ warn.style.display="block"; warn.textContent = "Please add a start date first."; return; }
    warn.style.display="none";
    downloadJSON(ev, `${ev.slug}.json`);
    downloadLog.unshift({ icon: "📅", title: ev.title, detail: `downloaded content/events/${ev.slug}.json` });
    refreshDraftList();
  }

  function downloadTeamMember(){
    const m = readTeamForm();
    const warn = document.getElementById("tm-warning");
    if(!document.getElementById("tm-name").value.trim()){ warn.style.display="block"; warn.textContent = "Please add a name first."; return; }
    warn.style.display="none";
    downloadJSON(m, `${m.slug}.json`);
    downloadLog.unshift({ icon: "👤", title: m.name, detail: `downloaded content/team/${m.slug}.json` });
    refreshDraftList();
  }

  /* ============ One-click publish (via /api/publish) ============ */
  async function publishPost(){
    const auth = requireAuth("p-status");
    if(!auth) return;

    if(!document.getElementById("p-title").value.trim()){
      showStatus("p-status", "error", "Please add a headline first.");
      return;
    }
    const post = prepare("post"); if(!post) return;
    if(!post.slug){
      showStatus("p-status", "error", "Please add a headline or slug first.");
      return;
    }

    const btn = document.getElementById("p-publish-btn");
    btn.disabled = true;
    showStatus("p-status", "working", "Publishing…");

    try{
      const uploadFile = document.getElementById("p-image-file").files[0];
      let image = null;
      if(uploadFile){
        const base64 = await fileToBase64(uploadFile);
        image = { filename: uploadFile.name, base64 };
      } else {
        // Not uploading a file — send the plain URL/placeholder as-is
        post.image = post.image;
      }

      let { status, data } = await callPublishApi({
        username: auth.username, password: auth.password,
        type: "post", data: post, image
      });

      if(status === 409 && data.exists){
        const proceed = confirm(`An article with the slug "${post.slug}" already exists. Publishing will overwrite it. Continue?`);
        if(!proceed){ btn.disabled = false; hideStatus("p-status"); return; }
        showStatus("p-status", "working", "Overwriting…");
        ({ status, data } = await callPublishApi({
          username: auth.username, password: auth.password,
          type: "post", data: post, image, confirmOverwrite: true
        }));
      }

      if(!data.ok){
        throw new Error(data.error || "Publish failed.");
      }

      showStatus("p-status", "success", `✅ Published! Your site will rebuild within about a minute — check your homepage shortly.`);
      downloadLog.unshift({ icon: "📰", title: post.title, detail: "published live" });
      refreshDraftList();
      allPosts = allPosts.filter(p => p.slug !== post.slug);
      allPosts.push(post);
      renderManageList();
    } catch(e){
      showStatus("p-status", "error", `⚠ Publish failed: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  }

  async function publishVideo(){
    const auth = requireAuth("v-status");
    if(!auth) return;

    if(!document.getElementById("v-title").value.trim()){
      showStatus("v-status", "error", "Please add a video title first.");
      return;
    }
    const v = prepare("video"); if(!v) return;
    if(!document.getElementById("v-thumb").value.trim()) v.thumbnail = await pickYouTubeThumb(v.youtubeId);

    const btn = document.getElementById("v-publish-btn");
    btn.disabled = true;
    showStatus("v-status", "working", "Publishing…");

    try{
      let { status, data } = await callPublishApi({
        username: auth.username, password: auth.password,
        type: "video", data: v
      });

      if(status === 409 && data.exists){
        const proceed = confirm(`A video with the slug "${v.slug}" already exists. Publishing will overwrite it. Continue?`);
        if(!proceed){ btn.disabled = false; hideStatus("v-status"); return; }
        showStatus("v-status", "working", "Overwriting…");
        ({ status, data } = await callPublishApi({
          username: auth.username, password: auth.password,
          type: "video", data: v, confirmOverwrite: true
        }));
      }

      if(!data.ok){
        throw new Error(data.error || "Publish failed.");
      }

      showStatus("v-status", "success", `✅ Published! Your site will rebuild within about a minute — check your homepage shortly.`);
      downloadLog.unshift({ icon: "🎬", title: v.title, detail: "published live" });
      refreshDraftList();
      allVideos = allVideos.filter(x => x.slug !== v.slug);
      allVideos.push(v);
      renderManageList();
    } catch(e){
      showStatus("v-status", "error", `⚠ Publish failed: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  }

  async function publishPhoto(){
    const auth = requireAuth("ph-status");
    if(!auth) return;

    if(!document.getElementById("ph-title").value.trim()){
      showStatus("ph-status", "error", "Please add a title first.");
      return;
    }
    const uploadFile = document.getElementById("ph-image-file").files[0];
    const p = prepare("photo"); if(!p) return;
    if(!uploadFile && !p.image){
      showStatus("ph-status", "error", "Please add a photo — upload one or paste an image URL.");
      return;
    }
    if(!p.slug){
      showStatus("ph-status", "error", "Please add a title or slug first.");
      return;
    }

    const btn = document.getElementById("ph-publish-btn");
    btn.disabled = true;
    showStatus("ph-status", "working", "Publishing…");

    try{
      let image = null;
      if(uploadFile){
        const base64 = await fileToBase64(uploadFile);
        image = { filename: uploadFile.name, base64 };
      }

      let { status, data } = await callPublishApi({
        username: auth.username, password: auth.password,
        type: "photo", data: p, image
      });

      if(status === 409 && data.exists){
        const proceed = confirm(`A photo with the slug "${p.slug}" already exists. Publishing will overwrite it. Continue?`);
        if(!proceed){ btn.disabled = false; hideStatus("ph-status"); return; }
        showStatus("ph-status", "working", "Overwriting…");
        ({ status, data } = await callPublishApi({
          username: auth.username, password: auth.password,
          type: "photo", data: p, image, confirmOverwrite: true
        }));
      }

      if(!data.ok){
        throw new Error(data.error || "Publish failed.");
      }

      showStatus("ph-status", "success", `✅ Published! Your site will rebuild within about a minute — check your homepage shortly.`);
      downloadLog.unshift({ icon: "📸", title: p.title, detail: "published live" });
      refreshDraftList();
      allPhotos = allPhotos.filter(x => x.slug !== p.slug);
      allPhotos.push(p);
      renderManageList();
    } catch(e){
      showStatus("ph-status", "error", `⚠ Publish failed: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  }

  async function publishEvent(){
    const auth = requireAuth("ev-status-msg");
    if(!auth) return;

    if(!document.getElementById("ev-title").value.trim()){
      showStatus("ev-status-msg", "error", "Please add a title first.");
      return;
    }
    if(!document.getElementById("ev-date").value){
      showStatus("ev-status-msg", "error", "Please add a start date first.");
      return;
    }
    const uploadFile = document.getElementById("ev-image-file").files[0];
    const ev = prepare("event"); if(!ev) return;
    if(!ev.slug){
      showStatus("ev-status-msg", "error", "Please add a title or slug first.");
      return;
    }

    const btn = document.getElementById("ev-publish-btn");
    btn.disabled = true;
    showStatus("ev-status-msg", "working", "Publishing…");

    try{
      let image = null;
      if(uploadFile){
        const base64 = await fileToBase64(uploadFile);
        image = { filename: uploadFile.name, base64 };
      }

      let { status, data } = await callPublishApi({
        username: auth.username, password: auth.password,
        type: "event", data: ev, image
      });

      if(status === 409 && data.exists){
        const proceed = confirm(`An event with the slug "${ev.slug}" already exists. Publishing will overwrite it. Continue?`);
        if(!proceed){ btn.disabled = false; hideStatus("ev-status-msg"); return; }
        showStatus("ev-status-msg", "working", "Overwriting…");
        ({ status, data } = await callPublishApi({
          username: auth.username, password: auth.password,
          type: "event", data: ev, image, confirmOverwrite: true
        }));
      }

      if(!data.ok){
        throw new Error(data.error || "Publish failed.");
      }

      showStatus("ev-status-msg", "success", `✅ Published! Your site will rebuild within about a minute — check the Events page shortly.`);
      downloadLog.unshift({ icon: "📅", title: ev.title, detail: "published live" });
      refreshDraftList();
      allEvents = allEvents.filter(x => x.slug !== ev.slug);
      allEvents.push(ev);
      renderManageList();
    } catch(e){
      showStatus("ev-status-msg", "error", `⚠ Publish failed: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  }

  async function publishTeamMember(){
    const auth = requireAuth("tm-status");
    if(!auth) return;

    if(!document.getElementById("tm-name").value.trim()){
      showStatus("tm-status", "error", "Please add a name first.");
      return;
    }
    const uploadFile = document.getElementById("tm-image-file").files[0];
    const m = prepare("team"); if(!m) return;

    const btn = document.getElementById("tm-publish-btn");
    btn.disabled = true;
    showStatus("tm-status", "working", "Publishing…");

    try{
      let image = null;
      if(uploadFile){
        const base64 = await fileToBase64(uploadFile);
        image = { filename: uploadFile.name, base64 };
      }

      let { status, data } = await callPublishApi({
        username: auth.username, password: auth.password,
        type: "team", data: m, image
      });

      if(status === 409 && data.exists){
        const proceed = confirm(`A team member with the slug "${m.slug}" already exists. Publishing will overwrite it. Continue?`);
        if(!proceed){ btn.disabled = false; hideStatus("tm-status"); return; }
        showStatus("tm-status", "working", "Overwriting…");
        ({ status, data } = await callPublishApi({
          username: auth.username, password: auth.password,
          type: "team", data: m, image, confirmOverwrite: true
        }));
      }

      if(!data.ok){
        throw new Error(data.error || "Publish failed.");
      }

      showStatus("tm-status", "success", `✅ Published! Your site will rebuild within about a minute — check the Team page shortly.`);
      downloadLog.unshift({ icon: "👤", title: m.name, detail: "published live" });
      refreshDraftList();
      allTeam = allTeam.filter(x => x.slug !== m.slug);
      allTeam.push(m);
      renderManageList();
    } catch(e){
      showStatus("tm-status", "error", `⚠ Publish failed: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  }
  /* ============ Manage existing content (edit / delete) ============ */
  let allPosts = Array.isArray(window.POSTS) ? window.POSTS.slice() : [];
  let allVideos = Array.isArray(window.VIDEOS) ? window.VIDEOS.slice() : [];
  let allPhotos = Array.isArray(window.PHOTOS) ? window.PHOTOS.slice() : [];
  let allTeam = Array.isArray(window.TEAM) ? window.TEAM.slice() : [];
  let allEvents = Array.isArray(window.EVENTS) ? window.EVENTS.slice() : [];

  document.getElementById("manage-panel-toggle").addEventListener("click", () => {
    const body = document.getElementById("manage-panel-body");
    body.style.display = body.style.display === "none" ? "block" : "none";
  });

  document.getElementById("pending-panel-toggle").addEventListener("click", () => {
    const body = document.getElementById("pending-panel-body");
    body.style.display = body.style.display === "none" ? "block" : "none";
  });

  // escapeHtml(), sanitizeInlineHTML(), mimeFromFilename(), and initRichText()
  // all come from js/main.js.

  function renderManageList(){
    const q = document.getElementById("manage-search").value.trim().toLowerCase();
    const items = [
      ...allPosts.map(p => ({ ...p, _kind: "post" })),
      ...allVideos.map(v => ({ ...v, _kind: "video" })),
      ...allPhotos.map(p => ({ ...p, _kind: "photo" })),
      ...allEvents.map(e => ({ ...e, _kind: "event" })),
      ...allTeam.map(m => ({ ...m, _kind: "team" }))
    ].filter(it => !q || (it.title || it.name || "").toLowerCase().includes(q))
     .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    document.getElementById("manage-count-pill").textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

    const list = document.getElementById("manage-list");
    if(!items.length){
      list.innerHTML = `<div class="manage-empty">Nothing found. Publish something above, or try a different search.</div>`;
      return;
    }
    const ICONS = { video: "🎬", photo: "📸", post: "📰", team: "👤", event: "📅" };
    const EDIT_FN = { video: "editVideo", photo: "editPhoto", post: "editPost", team: "editTeamMember", event: "editEvent" };
    const DELETE_FN = { video: "confirmDeleteVideo", photo: "confirmDeletePhoto", post: "confirmDeletePost", team: "confirmDeleteTeamMember", event: "confirmDeleteEvent" };
    const META = { video: "Video", photo: "Photo", event: "Event" };
    list.innerHTML = items.map(it => `
      <div class="manage-item">
        <div class="manage-item-info">
          <span class="manage-item-title">${ICONS[it._kind]} ${escapeHtml(it.title || it.name)}</span>
          <span class="manage-item-meta">${it._kind === "team" ? escapeHtml(it.role || TEAM_LABELS[it.team] || "") : (META[it._kind] || (CATEGORY_LABELS && CATEGORY_LABELS[it.category] || it.category || "")) + " · " + formatDate(it.date)}</span>
        </div>
        <div class="manage-item-actions">
          <button type="button" class="edit-btn" onclick="${EDIT_FN[it._kind]}('${it.slug}')">Edit</button>
          <button type="button" class="delete-btn" onclick="${DELETE_FN[it._kind]}('${it.slug}')">Delete</button>
        </div>
      </div>`).join("");
  }

  function findPost(slug){ return allPosts.find(p => p.slug === slug); }
  function findVideo(slug){ return allVideos.find(v => v.slug === slug); }
  function findPhoto(slug){ return allPhotos.find(p => p.slug === slug); }
  function findTeamMember(slug){ return allTeam.find(m => m.slug === slug); }
  function findEvent(slug){ return allEvents.find(e => e.slug === slug); }

  function editTeamMember(slug){
    const m = findTeamMember(slug);
    if(!m) return;
    afterEdit("team", m);
    setMode("team");
    document.getElementById("tm-name").value = m.name || "";
    document.getElementById("tm-slug").value = m.slug || "";
    document.getElementById("tm-slug").dataset.manual = "true";
    document.getElementById("tm-role").value = m.role || "";
    document.getElementById("tm-team").value = m.team || "founders";
    document.getElementById("tm-order").value = m.order || 10;
    document.getElementById("tm-bio").value = m.bio || "";
    setTeamImageMode("url");
    document.getElementById("tm-photo").value = m.photo || "";
    document.getElementById("tm-image-file").value = "";
    document.getElementById("tm-image-preview").style.display = "none";
    renderTeamPreview();
    showStatus("tm-status", "working", `Editing "${escapeHtml(m.name)}" — change what you like, then hit Publish to save.`);
    window.scrollTo({ top: document.getElementById("team-form").getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  }

  async function confirmDeleteTeamMember(slug){
    const m = findTeamMember(slug);
    if(!m) return;
    if(!confirm(`Remove "${m.name}" from the team permanently? This can't be undone from here.`)) return;
    const auth = requireAuth("manage-status");
    if(!auth) return;
    showStatus("manage-status", "working", `Removing "${escapeHtml(m.name)}"…`);
    try{
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, type: "team", slug })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Delete failed.");
      allTeam = allTeam.filter(x => x.slug !== slug);
      renderManageList();
      showStatus("manage-status", "success", `✅ Removed "${escapeHtml(m.name)}" from the team. Your site will update within about a minute.`);
      downloadLog.unshift({ icon: "🗑️", title: m.name, detail: "removed from team" });
      refreshDraftList();
    } catch(e){
      showStatus("manage-status", "error", `⚠ Remove failed: ${e.message}`);
    }
  }


  function editPost(slug){
    const post = findPost(slug);
    if(!post) return;
    afterEdit("post", post);
    setMode("post");
    document.getElementById("p-category").value = post.category || "news";
    document.getElementById("p-title").value = post.title || "";
    document.getElementById("p-slug").value = post.slug || "";
    document.getElementById("p-slug").dataset.manual = "true";
    document.getElementById("p-deck").value = post.deck || "";
    document.getElementById("p-author").value = post.author || "";
    document.getElementById("p-date").value = post.date || "";
    document.getElementById("p-readtime").value = post.readTime || "3 min read";
    setImageMode("url");
    document.getElementById("p-image").value = post.image || "";
    document.getElementById("p-image-file").value = "";
    document.getElementById("p-image-preview").style.display = "none";
    document.getElementById("p-caption").value = post.imageCaption || "";
    document.getElementById("p-tags").value = (post.tags || []).join(", ");
    document.getElementById("p-featured").checked = !!post.featured;
    document.getElementById("p-body-editor").innerHTML = bodyArrayToEditorHTML(post.body);
    updatePbCounts();
    renderPreview();
    showStatus("p-status", "working", `Editing "${escapeHtml(post.title)}" — change what you like, then hit Publish to save (or attach a new image to replace the current one).`);
    window.scrollTo({ top: document.getElementById("post-form").getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  }

  function editVideo(slug){
    const v = findVideo(slug);
    if(!v) return;
    afterEdit("video", v);
    setMode("video");
    document.getElementById("v-title").value = v.title || "";
    document.getElementById("v-slug").value = v.slug || "";
    document.getElementById("v-slug").dataset.manual = "true";
    document.getElementById("v-deck").value = v.deck || "";
    document.getElementById("v-author").value = v.author || "Soul & Script Media Team";
    document.getElementById("v-date").value = v.date || "";
    document.getElementById("v-youtube").value = v.youtubeId || "";
    renderVideoPreview();
    showStatus("v-status", "working", `Editing "${escapeHtml(v.title)}" — change what you like, then hit Publish to save.`);
    window.scrollTo({ top: document.getElementById("video-form").getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  }

  function editPhoto(slug){
    const p = findPhoto(slug);
    if(!p) return;
    afterEdit("photo", p);
    setMode("photo");
    document.getElementById("ph-title").value = p.title || "";
    document.getElementById("ph-slug").value = p.slug || "";
    document.getElementById("ph-slug").dataset.manual = "true";
    document.getElementById("ph-caption").value = p.caption || "";
    document.getElementById("ph-author").value = p.author || "Soul & Script Media Team";
    document.getElementById("ph-date").value = p.date || "";
    document.getElementById("ph-tags").value = (p.tags || []).join(", ");
    setPhotoImageMode("url");
    document.getElementById("ph-image").value = p.image || "";
    document.getElementById("ph-image-file").value = "";
    document.getElementById("ph-image-preview").style.display = "none";
    renderPhotoPreview();
    showStatus("ph-status", "working", `Editing "${escapeHtml(p.title)}" — change what you like, then hit Publish to save (or attach a new photo to replace the current one).`);
    window.scrollTo({ top: document.getElementById("photo-form").getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  }

  function editEvent(slug){
    const ev = findEvent(slug);
    if(!ev) return;
    afterEdit("event", ev);
    setMode("event");
    document.getElementById("ev-title").value = ev.title || "";
    document.getElementById("ev-slug").value = ev.slug || "";
    document.getElementById("ev-slug").dataset.manual = "true";
    document.getElementById("ev-description").value = ev.description || "";
    document.getElementById("ev-date").value = ev.date || "";
    document.getElementById("ev-end-date").value = ev.endDate || "";
    document.getElementById("ev-time").value = ev.time || "";
    document.getElementById("ev-location").value = ev.location || "";
    document.getElementById("ev-status").value = ev.status === "active" || ev.status === "past" ? ev.status : "auto";
    document.getElementById("ev-link").value = ev.link || "";
    setEventImageMode("url");
    document.getElementById("ev-image").value = ev.image || "";
    document.getElementById("ev-image-file").value = "";
    document.getElementById("ev-image-preview").style.display = "none";
    renderEventPreview();
    showStatus("ev-status-msg", "working", `Editing "${escapeHtml(ev.title)}" — change what you like, then hit Publish to save.`);
    window.scrollTo({ top: document.getElementById("event-form").getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  }

  async function confirmDeletePost(slug){
    const post = findPost(slug);
    if(!post) return;
    if(!confirm(`Delete "${post.title}" permanently? This can't be undone from here.`)) return;
    const auth = requireAuth("manage-status");
    if(!auth) return;
    showStatus("manage-status", "working", `Deleting "${escapeHtml(post.title)}"…`);
    try{
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, type: "post", slug })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Delete failed.");
      allPosts = allPosts.filter(p => p.slug !== slug);
      renderManageList();
      const imgNote = data.imagesRemoved ? ` (and ${data.imagesRemoved} photo${data.imagesRemoved === 1 ? "" : "s"} used in it)` : "";
      showStatus("manage-status", "success", `✅ Deleted "${escapeHtml(post.title)}"${imgNote}. Your site will update within about a minute.`);
      downloadLog.unshift({ icon: "🗑️", title: post.title, detail: "deleted" });
      refreshDraftList();
    } catch(e){
      showStatus("manage-status", "error", `⚠ Delete failed: ${e.message}`);
    }
  }

  async function confirmDeleteVideo(slug){
    const v = findVideo(slug);
    if(!v) return;
    if(!confirm(`Delete video "${v.title}" permanently? This can't be undone from here.`)) return;
    const auth = requireAuth("manage-status");
    if(!auth) return;
    showStatus("manage-status", "working", `Deleting "${escapeHtml(v.title)}"…`);
    try{
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, type: "video", slug })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Delete failed.");
      allVideos = allVideos.filter(v => v.slug !== slug);
      renderManageList();
      const imgNote = data.imagesRemoved ? ` (and ${data.imagesRemoved} file${data.imagesRemoved === 1 ? "" : "s"} used in it)` : "";
      showStatus("manage-status", "success", `✅ Deleted "${escapeHtml(v.title)}"${imgNote}. Your site will update within about a minute.`);
      downloadLog.unshift({ icon: "🗑️", title: v.title, detail: "deleted" });
      refreshDraftList();
    } catch(e){
      showStatus("manage-status", "error", `⚠ Delete failed: ${e.message}`);
    }
  }

  async function confirmDeletePhoto(slug){
    const p = findPhoto(slug);
    if(!p) return;
    if(!confirm(`Delete photo "${p.title}" permanently? This can't be undone from here.`)) return;
    const auth = requireAuth("manage-status");
    if(!auth) return;
    showStatus("manage-status", "working", `Deleting "${escapeHtml(p.title)}"…`);
    try{
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, type: "photo", slug })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Delete failed.");
      allPhotos = allPhotos.filter(x => x.slug !== slug);
      renderManageList();
      const imgNote = data.imagesRemoved ? ` (and ${data.imagesRemoved} file${data.imagesRemoved === 1 ? "" : "s"} used in it)` : "";
      showStatus("manage-status", "success", `✅ Deleted "${escapeHtml(p.title)}"${imgNote}. Your site will update within about a minute.`);
      downloadLog.unshift({ icon: "🗑️", title: p.title, detail: "deleted" });
      refreshDraftList();
    } catch(e){
      showStatus("manage-status", "error", `⚠ Delete failed: ${e.message}`);
    }
  }

  async function confirmDeleteEvent(slug){
    const ev = findEvent(slug);
    if(!ev) return;
    if(!confirm(`Delete event "${ev.title}" permanently? This can't be undone from here.`)) return;
    const auth = requireAuth("manage-status");
    if(!auth) return;
    showStatus("manage-status", "working", `Deleting "${escapeHtml(ev.title)}"…`);
    try{
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, type: "event", slug })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Delete failed.");
      allEvents = allEvents.filter(x => x.slug !== slug);
      renderManageList();
      const imgNote = data.imagesRemoved ? ` (and ${data.imagesRemoved} file${data.imagesRemoved === 1 ? "" : "s"} used in it)` : "";
      showStatus("manage-status", "success", `✅ Deleted "${escapeHtml(ev.title)}"${imgNote}. Your site will update within about a minute.`);
      downloadLog.unshift({ icon: "🗑️", title: ev.title, detail: "deleted" });
      refreshDraftList();
    } catch(e){
      showStatus("manage-status", "error", `⚠ Delete failed: ${e.message}`);
    }
  }

  renderManageList();

  /* ============ Contributor submissions (pending review) ============ */
  let pendingItems = [];

  function blockPreviewHTML(sub){
    return (sub.blocks || []).map(b => {
      if(b.type === "heading") return `<h4 style="margin:0 0 8px;">${escapeHtml(b.text)}</h4>`;
      if(b.type === "image") return `<img src="data:${mimeFromFilename(b.filename)};base64,${b.base64}" alt="">${b.caption ? `<p style="font-size:.8em;opacity:.7;">${escapeHtml(b.caption)}</p>` : ""}`;
      if(typeof b.html === "string" && b.html) return `<p>${sanitizeInlineHTML(b.html)}</p>`;
      return `<p>${escapeHtml(b.text)}</p>`;
    }).join("");
  }

  async function loadPending(){
    const auth = requireAuth("pending-status");
    if(!auth) return;
    showStatus("pending-status", "working", "Loading submissions…");
    try{
      const res = await fetch("/api/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, status: "pending" })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Couldn't load submissions.");
      pendingItems = data.items;
      document.getElementById("pending-count-pill").textContent = `${pendingItems.length} pending`;
      document.getElementById("pending-count-pill").classList.toggle("connected", pendingItems.length > 0);
      document.getElementById("pending-count-pill").classList.toggle("disconnected", pendingItems.length === 0);
      renderPending();
      hideStatus("pending-status");
    } catch(e){
      showStatus("pending-status", "error", "⚠ " + e.message);
    }
  }

      async function rejectSubmission(id){
    const auth = requireAuth("pending-status");
    if(!auth) return;
    const reviewNote = prompt("Optional note for the contributor (they'll see this):", "") || "";
    showStatus("pending-status", "working", "Declining…");
    try{
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password, id, action: "reject", reviewNote })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Couldn't decline this submission.");
      showStatus("pending-status", "success", "Declined.");
      loadPending();
    } catch(e){
      showStatus("pending-status", "error", "⚠ " + e.message);
    }
  }

  loadPending();

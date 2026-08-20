/*
  Soul & Script — Poster Studio
  Reads window.POSTS only. It never writes to content, calls publishing APIs,
  or changes the CMS pipeline.
*/
(function () {
  "use strict";

  const WIDTH = 1080;
  const HEIGHT = 1350;
  const canvas = document.getElementById("poster-canvas");
  const ctx = canvas.getContext("2d");
  const postSelect = document.getElementById("poster-post-select");
  const paletteSelect = document.getElementById("poster-palette");
  const showImageInput = document.getElementById("poster-show-image");
  const selectionMeta = document.getElementById("poster-selection-meta");
  const status = document.getElementById("poster-status");
  const pageIndicator = document.getElementById("poster-page-indicator");
  const previousPageButton = document.getElementById("poster-prev");
  const nextPageButton = document.getElementById("poster-next");
  const imageCache = new Map();
  const categoryLabelsUr = {
    news: "نثری اور تصویری کہانیاں",
    campus: "شاعری",
    academics: "فلسفہ اور تاثرات",
    events: "نشستوں کے خلاصے",
    opinion: "قارئین کے تاثرات"
  };
  const themes = {
    plum: {
      ink: "#211b25", paper: "#e9e0d5", light: "#f7f1e9", accent: "#dc7657", soft: "#bfaeea", dark: "#3a1934", label: "#f7f1e9"
    },
    lilac: {
      ink: "#211b25", paper: "#d8cbed", light: "#f7f1e9", accent: "#5a2c49", soft: "#dc7657", dark: "#2d2140", label: "#f7f1e9"
    },
    sage: {
      ink: "#211b25", paper: "#b9d7cb", light: "#f7f1e9", accent: "#5a2c49", soft: "#efd373", dark: "#173934", label: "#f7f1e9"
    },
    night: {
      ink: "#f7f1e9", paper: "#100d16", light: "#f7f1e9", accent: "#efd373", soft: "#dc7657", dark: "#21172b", label: "#100d16"
    }
  };
  const state = {
    language: readLanguage(),
    palette: "plum",
    showImage: true,
    post: null,
    image: null,
    imageFailed: false,
    pages: [],
    currentPage: 0
  };

  function readLanguage() {
    try {
      const saved = localStorage.getItem("soulnscript-language");
      return saved === "ur" ? "ur" : "en";
    } catch (_error) {
      return "en";
    }
  }

  function field(post, key) {
    if (!post) return "";
    if (state.language === "ur" && post[`${key}_ur`]) return post[`${key}_ur`];
    return post[key] == null ? "" : post[key];
  }

  function titleFor(post) {
    return field(post, "title") || "Untitled story";
  }

  function deckFor(post) {
    const deck = field(post, "deck");
    if (deck) return deck;
    const first = Array.isArray(post.body) ? post.body[0] : "";
    return stripMarkup(first).slice(0, 220);
  }

  function categoryFor(post) {
    if (!post) return "";
    if (state.language === "ur") return categoryLabelsUr[post.category] || post.category || "";
    return (window.CATEGORY_LABELS && window.CATEGORY_LABELS[post.category]) || post.category || "";
  }

  function authorFor(post) {
    return field(post, "author") || "Soul & Script";
  }

  function formatPosterDate(date) {
    if (!date) return "";
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(state.language === "ur" ? "ur-PK" : "en-US", {
      day: "numeric", month: "long", year: "numeric"
    });
  }

  function stripMarkup(value) {
    const node = document.createElement("div");
    node.innerHTML = String(value || "");
    return (node.textContent || node.innerText || "").replace(/\s+/g, " ").trim();
  }

  function slugify(value) {
    return String(value || "soul-and-script-poster")
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "soul-and-script-poster";
  }

  function postsSorted() {
    return [...(window.POSTS || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderPostOptions() {
    const currentSlug = state.post && state.post.slug;
    postSelect.replaceChildren();
    postsSorted().forEach((post) => {
      const option = document.createElement("option");
      option.value = post.slug;
      option.textContent = `${titleFor(post)} — ${authorFor(post)}`;
      postSelect.appendChild(option);
    });
    if (!postSelect.options.length) {
      const option = document.createElement("option");
      option.textContent = "No published posts found";
      option.value = "";
      postSelect.appendChild(option);
    }
    postSelect.value = currentSlug || postSelect.options[0].value;
  }

  function selectPost(slug) {
    state.post = (window.POSTS || []).find((post) => post.slug === slug) || postsSorted()[0] || null;
    state.image = null;
    state.imageFailed = false;
    updateSelectionMeta();
    renderPoster();
    loadArtwork();
  }

  function updateSelectionMeta() {
    if (!state.post) {
      selectionMeta.textContent = "No published posts available.";
      return;
    }
    const details = [categoryFor(state.post), authorFor(state.post), formatPosterDate(state.post.date)].filter(Boolean);
    const pageCount = state.pages.length || 1;
    selectionMeta.textContent = `${details.join(" · ")} · ${pageCount} poster pages`;
  }

  function loadArtwork() {
    if (!state.post || !state.showImage || !state.post.image) return;
    const src = state.post.image;
    if (imageCache.has(src)) {
      state.image = imageCache.get(src);
      renderPoster();
      return;
    }
    const image = new Image();
    image.onload = function () {
      imageCache.set(src, image);
      if (state.post && state.post.image === src) {
        state.image = image;
        state.imageFailed = false;
        renderPoster();
      }
    };
    image.onerror = function () {
      if (state.post && state.post.image === src) {
        state.image = null;
        state.imageFailed = true;
        renderPoster();
      }
    };
    image.src = src;
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawCoverImage(image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawAbstractBackdrop(theme) {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, theme.dark);
    gradient.addColorStop(.56, theme.dark);
    gradient.addColorStop(1, theme.ink);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const blobs = [
      { x: 70, y: 120, r: 310, color: theme.accent, alpha: .8 },
      { x: 920, y: 180, r: 220, color: theme.soft, alpha: .82 },
      { x: 780, y: 1120, r: 360, color: theme.accent, alpha: .4 },
      { x: 190, y: 1020, r: 180, color: theme.soft, alpha: .28 }
    ];
    blobs.forEach((blob, index) => {
      ctx.save();
      ctx.globalAlpha = blob.alpha;
      ctx.filter = index === 2 ? "blur(24px)" : "blur(8px)";
      ctx.fillStyle = blob.color;
      ctx.beginPath();
      ctx.ellipse(blob.x, blob.y, blob.r * (index % 2 ? .72 : 1), blob.r * (index % 2 ? 1 : .72), index * .42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.save();
    ctx.globalAlpha = .16;
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.bezierCurveTo(50, 890, 300, 620, 560, 760);
    ctx.bezierCurveTo(790, 884, 880, 520, 1110, 430);
    ctx.stroke();
    ctx.restore();
  }

  function drawImageBackdrop(theme) {
    drawCoverImage(state.image, 0, 0, WIDTH, HEIGHT);
    const overlay = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    overlay.addColorStop(0, `${theme.dark}ee`);
    overlay.addColorStop(.45, `${theme.dark}b8`);
    overlay.addColorStop(1, `${theme.ink}f2`);
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = `${theme.accent}33`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function wrapLines(text, maxWidth, font) {
    ctx.font = font;
    const paragraphs = String(text || "").split(/\n+/);
    const lines = [];
    paragraphs.forEach((paragraph) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return;
      let line = "";
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
        else {
          lines.push(line);
          line = word;
        }
      });
      if (line) lines.push(line);
    });
    return lines;
  }

  function fitTitle(title, maxWidth, maxLines) {
    for (let size = 94; size >= 54; size -= 2) {
      const font = `${state.language === "ur" ? 600 : 700} ${size}px ${state.language === "ur" ? '"Noto Nastaliq Urdu"' : '"Bodoni Moda"'}, serif`;
      const lines = wrapLines(title, maxWidth, font);
      if (lines.length <= maxLines) return { font, lines, lineHeight: size * (state.language === "ur" ? 1.5 : 1.02) };
    }
    const font = `${state.language === "ur" ? 600 : 700} 54px ${state.language === "ur" ? '"Noto Nastaliq Urdu"' : '"Bodoni Moda"'}, serif`;
    return { font, lines: wrapLines(title, maxWidth, font), lineHeight: state.language === "ur" ? 81 : 55 };
  }

  function drawLines(lines, x, y, lineHeight, color, align) {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }

  function bodyParagraphs(post) {
    const localizedBody = field(post, "body");
    const source = Array.isArray(localizedBody) ? localizedBody : (Array.isArray(post && post.body) ? post.body : []);
    return source.map(stripMarkup).map((paragraph) => paragraph.trim()).filter(Boolean);
  }

  function bodyFont() {
    return state.language === "ur"
      ? '400 25px "Noto Nastaliq Urdu", serif'
      : '400 29px "DM Sans", sans-serif';
  }

  function bodyLineHeight() {
    return state.language === "ur" ? 52 : 43;
  }

  function paginateBody(post) {
    const paragraphs = bodyParagraphs(post);
    if (!paragraphs.length) return [[]];
    const margin = 92;
    const maxWidth = WIDTH - margin * 2;
    const font = bodyFont();
    const allLines = [];
    paragraphs.forEach((paragraph) => {
      wrapLines(paragraph, maxWidth, font).forEach((line) => allLines.push(line));
      allLines.push("");
    });
    while (allLines[allLines.length - 1] === "") allLines.pop();
    const maxLines = state.language === "ur" ? 18 : 22;
    const pages = [];
    for (let index = 0; index < allLines.length; index += maxLines) {
      pages.push(allLines.slice(index, index + maxLines));
    }
    return pages.length ? pages : [[]];
  }

  function buildPosterPages() {
    if (!state.post) {
      state.pages = [];
      return;
    }
    state.pages = [{ type: "cover" }, ...paginateBody(state.post).map((lines) => ({ type: "body", lines }))];
    state.currentPage = Math.max(0, Math.min(state.currentPage, state.pages.length - 1));
  }

  function updatePageControls() {
    const total = Math.max(1, state.pages.length);
    const current = Math.min(total, state.currentPage + 1);
    pageIndicator.textContent = `Page ${current} / ${total}`;
    previousPageButton.disabled = state.currentPage <= 0;
    nextPageButton.disabled = state.currentPage >= total - 1;
  }

  function drawCoverPage() {
    if (!state.post) {
      ctx.fillStyle = "#211b25";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#f7f1e9";
      ctx.font = "700 48px Bodoni Moda, serif";
      ctx.fillText("No post selected", 80, 180);
      return;
    }
    const theme = themes[state.palette] || themes.plum;
    if (state.showImage && state.image) drawImageBackdrop(theme);
    else drawAbstractBackdrop(theme);

    const margin = 82;
    const right = WIDTH - margin;
    const align = state.language === "ur" ? "right" : "left";
    const textX = state.language === "ur" ? right : margin;
    const title = titleFor(state.post);
    const deck = deckFor(state.post);
    const category = categoryFor(state.post).toUpperCase();
    const author = authorFor(state.post);
    const date = formatPosterDate(state.post.date);
    const titleFit = fitTitle(title, WIDTH - margin * 2, 4);
    const textColor = theme.light;

    ctx.save();
    ctx.direction = state.language === "ur" ? "rtl" : "ltr";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = align;
    ctx.fillStyle = theme.accent;
    roundRect(ctx, margin, 76, 330, 42, 21);
    ctx.fill();
    ctx.fillStyle = theme.label;
    ctx.font = "700 16px DM Sans, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(category || "SOUL & SCRIPT", margin + 165, 103);
    ctx.fillStyle = textColor;
    ctx.font = "600 18px DM Sans, Arial, sans-serif";
    ctx.textAlign = align;
    ctx.fillText("SOUL & SCRIPT / STORY SIGNAL", textX, 175);
    const titleTop = state.language === "ur" ? 282 : 300;
    ctx.font = titleFit.font;
    drawLines(titleFit.lines, textX, titleTop, titleFit.lineHeight, textColor, align);
    const deckTop = titleTop + titleFit.lines.length * titleFit.lineHeight + (state.language === "ur" ? 54 : 38);
    const deckFont = `${state.language === "ur" ? 400 : 400} ${state.language === "ur" ? 27 : 30}px ${state.language === "ur" ? '"Noto Nastaliq Urdu"' : '"DM Sans"'}, sans-serif`;
    const deckLines = wrapLines(deck, WIDTH - margin * 2, deckFont).slice(0, 5);
    ctx.font = deckFont;
    drawLines(deckLines, textX, deckTop, state.language === "ur" ? 51 : 42, "rgba(247,241,233,.88)", align);
    ctx.strokeStyle = `${theme.light}66`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, 1030);
    ctx.lineTo(right, 1030);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.font = "700 18px DM Sans, Arial, sans-serif";
    ctx.textAlign = align;
    ctx.fillText(author, textX, 1088);
    ctx.fillStyle = "rgba(247,241,233,.74)";
    ctx.font = "500 17px DM Sans, Arial, sans-serif";
    ctx.fillText(date, textX, 1122);
    ctx.textAlign = state.language === "ur" ? "left" : "right";
    ctx.fillStyle = theme.light;
    ctx.font = "600 20px DM Sans, Arial, sans-serif";
    ctx.fillText("SOUL & SCRIPT", state.language === "ur" ? margin : right, 1254);
    ctx.fillStyle = theme.accent;
    ctx.font = "700 26px Bodoni Moda, serif";
    ctx.fillText("&", state.language === "ur" ? margin + 155 : right - 155, 1255);
    ctx.restore();
  }

  function drawBodyPage(page) {
    const theme = themes[state.palette] || themes.plum;
    const margin = 92;
    const right = WIDTH - margin;
    const align = state.language === "ur" ? "right" : "left";
    const textX = state.language === "ur" ? right : margin;
    const pageNumber = state.currentPage;
    ctx.fillStyle = theme.light;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    wash.addColorStop(0, `${theme.soft}38`);
    wash.addColorStop(.48, "rgba(247,241,233,0)");
    wash.addColorStop(1, `${theme.accent}20`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = .2;
    ctx.beginPath();
    ctx.ellipse(state.language === "ur" ? 150 : 930, 120, 180, 90, -.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.direction = state.language === "ur" ? "rtl" : "ltr";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = align;
    ctx.fillStyle = theme.accent;
    ctx.font = "700 17px DM Sans, Arial, sans-serif";
    ctx.fillText("SOUL & SCRIPT / CONTINUATION", textX, 88);
    ctx.fillStyle = theme.ink;
    ctx.font = `${state.language === "ur" ? 600 : 600} ${state.language === "ur" ? 29 : 32}px ${state.language === "ur" ? '"Noto Nastaliq Urdu"' : '"Bodoni Moda"'}, serif`;
    ctx.fillText(titleFor(state.post), textX, 151);
    ctx.fillStyle = theme.ink;
    ctx.font = "500 16px DM Sans, Arial, sans-serif";
    ctx.fillText(`${authorFor(state.post)} · ${formatPosterDate(state.post.date)}`, textX, 190);
    ctx.strokeStyle = `${theme.ink}38`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, 225);
    ctx.lineTo(right, 225);
    ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.font = bodyFont();
    drawLines(page.lines, textX, state.language === "ur" ? 294 : 282, bodyLineHeight(), theme.ink, align);
    ctx.strokeStyle = `${theme.ink}38`;
    ctx.beginPath();
    ctx.moveTo(margin, 1230);
    ctx.lineTo(right, 1230);
    ctx.stroke();
    ctx.font = "700 15px DM Sans, Arial, sans-serif";
    ctx.fillStyle = theme.accent;
    ctx.textAlign = state.language === "ur" ? "left" : "right";
    ctx.fillText(`PAGE ${pageNumber} / ${state.pages.length - 1}`, state.language === "ur" ? margin : right, 1272);
    ctx.fillStyle = theme.ink;
    ctx.fillText("SOUL & SCRIPT", state.language === "ur" ? right : margin, 1272);
    ctx.restore();
  }

  function drawCurrentPage() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const page = state.pages[state.currentPage];
    if (!page || page.type === "cover") drawCoverPage();
    else drawBodyPage(page);
    updatePageControls();
  }

  function renderPoster() {
    if (!ctx) return;
    buildPosterPages();
    drawCurrentPage();
    updateSelectionMeta();
  }

  function setLanguage(language) {
    state.language = language === "ur" ? "ur" : "en";
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ur" ? "rtl" : "ltr";
    document.querySelectorAll("[data-poster-language]").forEach((button) => {
      const active = button.dataset.posterLanguage === state.language;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderPostOptions();
    updateSelectionMeta();
    renderPoster();
  }

  function canvasBlob() {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function downloadBlob(blob, filename) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function downloadPoster() {
    if (!state.post || !state.pages.length) return;
    const originalPage = state.currentPage;
    const baseName = slugify(titleFor(state.post));
    status.textContent = `Preparing ${state.pages.length} poster pages…`;
    for (let index = 0; index < state.pages.length; index += 1) {
      state.currentPage = index;
      drawCurrentPage();
      const blob = await canvasBlob();
      downloadBlob(blob, `${baseName}-soul-and-script-page-${index + 1}-of-${state.pages.length}.png`);
      await wait(120);
    }
    state.currentPage = originalPage;
    drawCurrentPage();
    status.textContent = `${state.pages.length} PNG pages downloaded — ready to share as a set.`;
  }

  async function copyPoster() {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      status.textContent = "Image copy is not supported here. Use Download PNG instead.";
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        status.textContent = "Poster copied to your clipboard.";
      } catch (_error) {
        status.textContent = "Clipboard permission was unavailable. Use Download PNG instead.";
      }
    }, "image/png");
  }

  postSelect.addEventListener("change", (event) => selectPost(event.target.value));
  paletteSelect.addEventListener("change", (event) => {
    state.palette = event.target.value;
    renderPoster();
  });
  showImageInput.addEventListener("change", (event) => {
    state.showImage = event.target.checked;
    renderPoster();
    loadArtwork();
  });
  document.querySelectorAll("[data-poster-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.posterLanguage));
  });
  previousPageButton.addEventListener("click", () => {
    if (state.currentPage <= 0) return;
    state.currentPage -= 1;
    drawCurrentPage();
  });
  nextPageButton.addEventListener("click", () => {
    if (state.currentPage >= state.pages.length - 1) return;
    state.currentPage += 1;
    drawCurrentPage();
  });
  document.getElementById("poster-download").addEventListener("click", downloadPoster);
  document.getElementById("poster-copy").addEventListener("click", copyPoster);

  renderPostOptions();
  setLanguage(state.language);
  selectPost(postSelect.value);
})();


/*
  Soul & Script — Poster Studio
  Reads window.POSTS only. It never writes to content, calls publishing APIs,
  or changes the CMS pipeline.
*/
(function () {
  "use strict";

  const WIDTH = 1080;
  const HEIGHT = 1350;
  // Nastaliq is the correct traditional face for Urdu display/body text;
  // Naskh Arabic is kept as an intermediate fallback before the generic serif.
  const URDU_FONT = '"Noto Nastaliq Urdu", "Noto Naskh Arabic", serif';
  const URDU_WEIGHTS = [400, 500, 600, 700];
  let urduFontsLoaded = null;

  // document.fonts.ready only resolves for fonts the page already triggered a
  // fetch for. Canvas text doesn't trigger that on its own, so without this,
  // ctx.fillText() can silently fall back to the browser's generic serif —
  // which doesn't shape Urdu letterforms correctly — especially the first
  // time a poster is drawn or right after switching the language toggle.
  function loadUrduFonts() {
    if (urduFontsLoaded) return urduFontsLoaded;
    if (!(window.FontFace && document.fonts)) return Promise.resolve();
    const specs = [];
    URDU_WEIGHTS.forEach((w) => {
      specs.push(`${w} 32px "Noto Nastaliq Urdu"`);
      specs.push(`${w} 32px "Noto Naskh Arabic"`);
    });
    urduFontsLoaded = Promise.all(
      specs.map((spec) => document.fonts.load(spec).catch(() => null))
    );
    return urduFontsLoaded;
  }
  // Reuse the site's real, already-loaded type system (base.css) instead of
  // "Bodoni Moda" / "DM Sans", which were never imported anywhere and were
  // silently falling back to the browser default serif/sans on every draw.
  const DISPLAY_FONT = '"Playfair Display", Georgia, serif';
  const BODY_FONT_FAMILY = '"PT Serif", Georgia, serif';
  const LABEL_FONT_FAMILY = '"Barlow Condensed", Arial, sans-serif';
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
  // Every theme uses ONE consistent role model — dark canvas, light text —
  // applied identically on the cover AND every continuation page. The old
  // themes flipped "ink"/"light" per-theme (the "night" palette had near-white
  // text on a near-white body-page background — invisible), which was the
  // root cause of the contrast complaints. All pairs below are WCAG AAA
  // (7:1+) for body text against their background.
  const themes = {
    amberdusk: {
      bg: "#241726", bg2: "#33202f", surface: "#33202f",
      text: "#FBF3E7", textMuted: "rgba(251,243,231,.74)",
      accent: "#F2895D", accentText: "#241726", label: "Amber Dusk"
    },
    sageink: {
      bg: "#122420", bg2: "#1B342C", surface: "#1B342C",
      text: "#F6F1E1", textMuted: "rgba(246,241,225,.74)",
      accent: "#E7B75C", accentText: "#122420", label: "Sage & Ink"
    },
    indigonight: {
      bg: "#12172B", bg2: "#1C2440", surface: "#1C2440",
      text: "#F5F1E6", textMuted: "rgba(245,241,230,.74)",
      accent: "#FFC773", accentText: "#12172B", label: "Indigo Night"
    },
    rosewood: {
      bg: "#2A1420", bg2: "#38192A", surface: "#38192A",
      text: "#FBEFE4", textMuted: "rgba(251,239,228,.74)",
      accent: "#F2B04C", accentText: "#2A1420", label: "Rosewood"
    }
  };
  const state = {
    language: readLanguage(),
    palette: "amberdusk",
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

  function posterUi(key) {
    const labels = {
      storySignal: ["SOUL & SCRIPT / STORY SIGNAL", "SOUL & SCRIPT / تحریری جھلک"],
      continuation: ["SOUL & SCRIPT / CONTINUATION", "SOUL & SCRIPT / جاری تحریر"],
      page: ["PAGE", "صفحہ"]
    };
    return (labels[key] || [key, key])[state.language === "ur" ? 1 : 0];
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

  // Shared editorial backdrop: a deep two-tone field with a single soft
  // arc of accent light (not scattered pastel blobs) and fine paper-grain
  // texture. Reused, unscrimmed, by both the image and abstract cover
  // paths so the two modes feel like one family instead of two designs.
  function drawEditorialField(theme) {
    const field = ctx.createLinearGradient(0, 0, WIDTH * 0.25, HEIGHT);
    field.addColorStop(0, theme.bg2);
    field.addColorStop(1, theme.bg);
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.filter = "blur(70px)";
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.ellipse(WIDTH * 0.86, HEIGHT * 0.1, 300, 260, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-40, HEIGHT * 0.62);
    ctx.bezierCurveTo(WIDTH * 0.28, HEIGHT * 0.5, WIDTH * 0.5, HEIGHT * 0.72, WIDTH * 0.78, HEIGHT * 0.56);
    ctx.bezierCurveTo(WIDTH * 0.92, HEIGHT * 0.48, WIDTH * 1.0, HEIGHT * 0.5, WIDTH + 40, HEIGHT * 0.42);
    ctx.stroke();
    ctx.restore();

    grain(theme);
  }

  // Fine dot-grain texture keeps flat gradients from looking like a plain
  // digital wash — a very cheap "printed paper" cue at poster resolution.
  function grain(theme) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = theme.text;
    for (let y = 0; y < HEIGHT; y += 5) {
      for (let x = (y % 10 === 0) ? 0 : 2; x < WIDTH; x += 5) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  }

  function drawAbstractBackdrop(theme) {
    drawEditorialField(theme);
  }

  // Guaranteed-contrast scrim: the top stays close to the photo so it still
  // reads as a photograph, but by the text zone (~38% down) the scrim is at
  // 90%+ opacity of the theme's own bg color, so title/deck/footer text has
  // the same measured contrast ratio as the no-image abstract mode — no
  // "hope the photo is dark enough there" guessing.
  function drawImageBackdrop(theme) {
    drawCoverImage(state.image, 0, 0, WIDTH, HEIGHT);
    const scrim = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    scrim.addColorStop(0, `${theme.bg}55`);
    scrim.addColorStop(0.34, `${theme.bg}82`);
    scrim.addColorStop(0.58, `${theme.bg}E8`);
    scrim.addColorStop(1, `${theme.bg}F7`);
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    grain(theme);
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
    const start = state.language === "ur" ? 88 : 84;
    const end = state.language === "ur" ? 50 : 46;
    for (let size = start; size >= end; size -= 2) {
      const font = state.language === "ur"
        ? `600 ${size}px ${URDU_FONT}`
        : `700 ${size}px ${DISPLAY_FONT}`;
      const lines = wrapLines(title, maxWidth, font);
      if (lines.length <= maxLines) return { font, lines, lineHeight: size * (state.language === "ur" ? 1.28 : 1.08) };
    }
    const font = state.language === "ur" ? `600 ${end}px ${URDU_FONT}` : `700 ${end}px ${DISPLAY_FONT}`;
    return { font, lines: wrapLines(title, maxWidth, font), lineHeight: state.language === "ur" ? 64 : 52 };
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
      ? `400 31px ${URDU_FONT}`
      : `400 30px ${BODY_FONT_FAMILY}`;
  }

  function bodyLineHeight() {
    return state.language === "ur" ? 53 : 43;
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

  // Small branded wordmark, drawn identically on every page (cover + all
  // continuation slides) so a multi-page carousel reads as one connected
  // set when swiped through on Instagram, not a cover with orphaned pages.
  function drawWordmark(theme, x, y, scale, forceAlign) {
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = forceAlign || "left";
    ctx.textBaseline = "alphabetic";
    const soulFont = `700 ${Math.round(22 * scale)}px ${DISPLAY_FONT}`;
    const ampFont = `italic 500 ${Math.round(22 * scale)}px ${DISPLAY_FONT}`;
    ctx.font = soulFont;
    const soulW = ctx.measureText("Soul ").width;
    ctx.font = ampFont;
    const ampW = ctx.measureText("& ").width;
    let cursorX = x;
    if (forceAlign === "right") {
      ctx.font = soulFont;
      const scriptW = ctx.measureText("Script").width;
      cursorX = x - scriptW - ampW - soulW;
    }
    ctx.fillStyle = theme.text;
    ctx.font = soulFont;
    ctx.textAlign = "left";
    ctx.fillText("Soul ", cursorX, y);
    cursorX += soulW;
    ctx.fillStyle = theme.accent;
    ctx.font = ampFont;
    ctx.fillText("& ", cursorX, y);
    cursorX += ampW;
    ctx.fillStyle = theme.text;
    ctx.font = soulFont;
    ctx.fillText("Script", cursorX, y);
    ctx.restore();
  }

  // Instagram carousels show no native progress indicator on the image
  // itself — this draws one, so a multi-page post signals "there's more"
  // even as a static screenshot in someone's camera roll.
  function drawProgressDots(theme, centerX, y, total, activeIndex) {
    if (total <= 1) return;
    const spacing = 20;
    const startX = centerX - ((total - 1) * spacing) / 2;
    ctx.save();
    for (let i = 0; i < total; i += 1) {
      ctx.beginPath();
      ctx.fillStyle = i === activeIndex ? theme.accent : `${theme.text}3D`;
      const r = i === activeIndex ? 5 : 4;
      ctx.arc(startX + i * spacing, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCoverPage() {
    const theme = themes[state.palette] || themes.amberdusk;
    if (!state.post) {
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = theme.text;
      ctx.font = `700 44px ${DISPLAY_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText("No post selected", 80, 180);
      return;
    }
    if (state.showImage && state.image) drawImageBackdrop(theme);
    else drawAbstractBackdrop(theme);

    const margin = 82;
    const right = WIDTH - margin;
    const isUr = state.language === "ur";
    const align = isUr ? "right" : "left";
    const textX = isUr ? right : margin;
    const title = titleFor(state.post);
    const deck = deckFor(state.post);
    const category = categoryFor(state.post).toUpperCase();
    const author = authorFor(state.post);
    const date = formatPosterDate(state.post.date);
    const titleFit = fitTitle(title, WIDTH - margin * 2, 4);

    ctx.save();
    ctx.direction = isUr ? "rtl" : "ltr";
    if ("fontKerning" in ctx) ctx.fontKerning = "normal";
    ctx.textBaseline = "alphabetic";

    // masthead, top corner opposite the reading direction so it never
    // collides with the category pill
    drawWordmark(theme, isUr ? margin : right, 70, 0.86, isUr ? "left" : "right");

    // category pill — accentText on accent fill is the one place that pairing
    // matters most (it's the first thing the eye lands on), and it's the
    // highest-contrast pair in every theme (see palette definitions above)
    ctx.font = `700 14px ${LABEL_FONT_FAMILY}`;
    const pillLabel = (category || "SOUL & SCRIPT").toUpperCase();
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.06em";
    const pillTextWidth = ctx.measureText(pillLabel).width;
    const pillWidth = pillTextWidth + 48;
    ctx.fillStyle = theme.accent;
    roundRect(ctx, textX2(isUr, textX, pillWidth, margin, right), 72, pillWidth, 38, 19);
    ctx.fill();
    ctx.fillStyle = theme.accentText;
    ctx.textAlign = "center";
    ctx.fillText(pillLabel, pillCenterX(isUr, textX, pillWidth, margin, right), 96);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    // title
    const titleTop = isUr ? 300 : 470;
    ctx.font = titleFit.font;
    drawLines(titleFit.lines, textX, titleTop, titleFit.lineHeight, theme.text, align);

    // deck / dek — one accent rule above it as a quiet section break
    const deckTop = titleTop + titleFit.lines.length * titleFit.lineHeight + (isUr ? 54 : 46);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isUr) { ctx.moveTo(right, deckTop - 28); ctx.lineTo(right - 56, deckTop - 28); }
    else { ctx.moveTo(margin, deckTop - 28); ctx.lineTo(margin + 56, deckTop - 28); }
    ctx.stroke();

    const deckFont = isUr ? `400 28px ${URDU_FONT}` : `italic 400 28px ${BODY_FONT_FAMILY}`;
    const deckLines = wrapLines(deck, WIDTH - margin * 2, deckFont).slice(0, 4);
    ctx.font = deckFont;
    drawLines(deckLines, textX, deckTop, isUr ? 48 : 40, theme.textMuted, align);

    // footer: accent rule, author / date, progress dots
    const footerRuleY = 1168;
    ctx.strokeStyle = `${theme.text}30`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(margin, footerRuleY);
    ctx.lineTo(right, footerRuleY);
    ctx.stroke();

    ctx.fillStyle = theme.text;
    ctx.font = `700 19px ${LABEL_FONT_FAMILY}`;
    ctx.textAlign = align;
    ctx.fillText(author, textX, footerRuleY + 44);
    ctx.fillStyle = theme.textMuted;
    ctx.font = `500 16px ${LABEL_FONT_FAMILY}`;
    ctx.fillText(date, textX, footerRuleY + 74);

    drawProgressDots(theme, WIDTH / 2, footerRuleY + 60, state.pages.length, 0);

    ctx.restore();
  }

  // Small helpers so the category pill can anchor from the correct edge in
  // both LTR and RTL without duplicating the position math twice above.
  function textX2(isUr, textX, pillWidth, margin, right) {
    return isUr ? right - pillWidth : margin;
  }
  function pillCenterX(isUr, textX, pillWidth, margin, right) {
    return (isUr ? right - pillWidth : margin) + pillWidth / 2;
  }

  function drawBodyPage(page) {
    const theme = themes[state.palette] || themes.amberdusk;
    const margin = 92;
    const right = WIDTH - margin;
    const isUr = state.language === "ur";
    const align = isUr ? "right" : "left";
    const textX = isUr ? right : margin;
    const pageNumber = state.currentPage;

    // Same dark field as the cover (not a flip to a light page) so the
    // carousel reads as one continuous piece rather than two designs stitched
    // together — this consistency is also what eliminates the old
    // "light ink on light background" contrast bug entirely.
    drawEditorialField(theme);

    ctx.save();
    ctx.direction = isUr ? "rtl" : "ltr";
    if ("fontKerning" in ctx) ctx.fontKerning = "normal";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = align;

    drawWordmark(theme, isUr ? right : margin, 74, 0.62, align);
    ctx.fillStyle = theme.accent;
    ctx.font = `700 15px ${LABEL_FONT_FAMILY}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.05em";
    ctx.fillText(posterUi("continuation"), textX, 128);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    ctx.fillStyle = theme.text;
    ctx.font = isUr ? `600 30px ${URDU_FONT}` : `700 30px ${DISPLAY_FONT}`;
    ctx.fillText(titleFor(state.post), textX, 176);

    ctx.strokeStyle = `${theme.text}26`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(margin, 210);
    ctx.lineTo(right, 210);
    ctx.stroke();

    // oversized quote-mark opener on the first continuation page only — a
    // small editorial flourish that costs nothing and reads as "designed".
    // Anchored to a fixed corner regardless of language so it never
    // competes with the top-right accent glow from drawEditorialField().
    if (pageNumber === 1) {
      ctx.fillStyle = `${theme.accent}70`;
      ctx.font = `700 120px ${DISPLAY_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText("“", margin - 6, 330);
    }

    ctx.fillStyle = theme.text;
    ctx.font = bodyFont();
    ctx.textAlign = align;
    drawLines(page.lines, textX, isUr ? 300 : 296, bodyLineHeight(), theme.text, align);

    ctx.strokeStyle = `${theme.text}26`;
    ctx.beginPath();
    ctx.moveTo(margin, 1232);
    ctx.lineTo(right, 1232);
    ctx.stroke();

    ctx.font = `700 14px ${LABEL_FONT_FAMILY}`;
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = isUr ? "left" : "right";
    ctx.fillText(`${posterUi("page")} ${pageNumber} / ${state.pages.length - 1}`, isUr ? margin : right, 1272);

    drawProgressDots(theme, WIDTH / 2, 1266, state.pages.length, pageNumber);

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
    if (state.language === "ur") {
      // Draw once immediately so the UI doesn't feel stuck, then redraw
      // once the Urdu webfont is confirmed loaded (this second draw is the
      // one that actually matters — the first may still be in fallback serif).
      renderPoster();
      loadUrduFonts().then(renderPoster);
    } else {
      renderPoster();
    }
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

  async function initializePosterStudio() {
    renderPostOptions();
    selectPost(postSelect.value);
    if (state.language === "ur") await loadUrduFonts();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    setLanguage(state.language);
    renderPoster();
  }

  initializePosterStudio();
})();

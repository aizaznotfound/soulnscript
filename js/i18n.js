/* =========================================================
   SOUL & SCRIPT — bilingual runtime
   English/Urdu UI strings, content field selection, persistent
   language preference, and document direction/language state.
   ========================================================= */

const SS_LANG_KEY = "soulnscript-language";
const SS_DEFAULT_LANGUAGE = "en";
const SS_TRANSLATIONS = {
  en: {
    "nav.home": "Home", "nav.writing": "Writing", "nav.films": "Films & Talks", "nav.gallery": "Gallery",
    "nav.events": "Events", "nav.team": "Team", "nav.manifesto": "Manifesto", "nav.contact": "Contact",
    "nav.share": "Share Your Work ↗", "nav.showWriting": "Show Writing submenu", "nav.showFilms": "Show Films & Talks submenu",
    "nav.showGallery": "Show Gallery submenu", "nav.switchToUrdu": "Switch to Urdu", "nav.switchToEnglish": "Switch to English",
    "nav.urduLabel": "اردو", "nav.englishLabel": "English", "nav.contactSubmissions": "Contact & Submissions",
    "ui.explore": "Explore", "ui.about": "About", "ui.reach": "Reach us", "ui.readMore": "Read More ↗",
    "ui.allReflections": "All reflections ↗", "ui.allFilms": "All films ↗", "ui.allGallery": "All gallery ↗",
    "ui.enterArchive": "Enter the archive ↗", "ui.more": "More ↗", "ui.startPiece": "Start a piece ↗",
    "ui.communityFavorites": "Community Favorites", "ui.keepSignal": "Keep the signal", "ui.trendingTags": "Trending tags",
    "ui.whyWeExist": "Why we exist", "ui.readManifesto": "Read the manifesto ↗", "ui.backFrontPage": "Back to the Front Page", "ui.join": "Join", "ui.play": "Play",
    "ui.share": "Share:", "ui.facebook": "Facebook", "ui.twitter": "X / Twitter", "ui.whatsapp": "WhatsApp",
    "ui.copyLink": "Copy Link", "ui.copied": "Copied!", "ui.video": "Video", "ui.photo": "Photo", "ui.emailPlaceholder": "you@example.com", "ui.joinWhatsApp": "Join our WhatsApp",
    "ui.storyNotFound": "Story Not Found", "ui.storyNotFoundDescription": "This story may have been moved or unpublished.",
    "ui.tryHomeWriting": "Try heading back to the homepage or browsing Writing.",
    "ui.noStories": "No stories in this category yet. Check back soon.", "ui.noSearchResults": "No stories match your search.",
    "ui.noVideos": "No videos published yet.", "ui.noPhotos": "No photos published yet.",
    "ui.noOpinions": "No opinion pieces published yet.", "ui.noRecaps": "No session recaps published yet.",
    "ui.noTeam": "Our team roster isn't published yet — check back soon.", "ui.member": "member", "ui.members": "members",
    "category.news": "Prose & Picture Stories", "category.campus": "Poetry", "category.academics": "Philosophy & Reflections",
    "category.events": "Session Recaps", "category.opinion": "Reader Reflections",
    "home.kicker": "A living archive of human making", "home.heroTitle": "Make room<br>for wonder.",
    "home.heroDescription": "Stories, images, ideas, and gatherings from a creative collective that believes every voice can become a form.",
    "home.contributeKicker": "Open to every reader, writer, and artist", "home.contributeTitle": "Bring the unfinished thing.",
    "home.contributeDescription": "Share your writing, art, or ideas with Soul & Script. We are interested in the spark before it becomes polished.",
    "home.curated": "Curated signals", "home.poetry": "Poetry", "home.philosophy": "Philosophy & Reflections",
    "home.reflections": "Reflections", "home.films": "Films & Talks", "home.fromGallery": "From the gallery",
    "home.newsletterDescription": "A quiet roundup of new writing, images, and gatherings. No noise.",
    "writing.kicker": "On the page", "writing.title": "Writing.",
    "writing.description": "Poetry, prose, picture stories, philosophy, and everything in between — written by the Soul & Script community.",
    "writing.searchPlaceholder": "Search the archive by title, topic, or tag…", "writing.everything": "Everything",
    "writing.prose": "Prose & Stories", "writing.poetry": "Poetry", "writing.philosophy": "Philosophy", "writing.recaps": "Session Recaps",
    "gallery.kicker": "The visual archive", "gallery.title": "Gallery.",
    "gallery.description": "Photography, painting, sketches, and the strange little frames that make a day worth remembering.",
    "article.orbit": "Stay in the orbit", "article.videoDescription": "Watch this film or talk from the Soul & Script archive.",
    "team.founders": "Founders & Co-Founders", "team.editorial": "Editorial Board", "team.media": "Media Team",
    "team.promotion": "Promotional Team", "team.judges": "Judges", "team.communication": "Communication Team", "team.finance": "Finance Team",
    "nav.toggleMenu": "Toggle menu", "shell.est": "Est. 2026 · A home for every art", "shell.tagline": "An independent space for work that refuses to sit still.",
    "footer.description": "A creative collective for readers, writers, thinkers, painters, and artists of every kind.", "footer.editorial": "Editorial Access",
    "page.reflections": "Reflections", "page.reflectionsDescription": "Reader opinions, personal essays, and thoughtful responses from the Soul & Script community.",
    "page.tagTitle": "Browse by Tag", "page.tagDescription": "Follow a topic across every section — news, opinions, and video.",
    "page.teamTitle": "The Team", "page.teamDescription": "The people who keep Soul & Script running — from the stage to the spreadsheet.",
    "page.videosTitle": "Films & Talks", "page.videosDescription": "Short films, videography, and movie-talk recordings from the Soul & Script community.",
    "page.aboutTitle": "About Soul & Script", "page.contactTitle": "Contact & Submissions", "page.contactDescription": "Pitch a piece, ask about an event, share a tip, or find out how to join the team.", "page.eventsTitle": "Events", "page.eventsDescription": "Active competitions where members can participate and win exclusive prizes, plus recaps of sessions we've already run.",
    "events.activeTitle": "Active Events", "events.activeDescription": "Competitions and calls for participation that are currently open.", "events.pastTitle": "Past Events", "events.pastDescription": "Open mic sessions, book sessions, and movie talks we have already held.",
    "page.notFoundDescription": "The page you are looking for has moved, disappeared, or was never here."
  },
  ur: {
    "nav.home": "صفحۂ اول", "nav.writing": "تحریریں", "nav.films": "فلمز اور گفتگو", "nav.gallery": "گیلری",
    "nav.events": "تقریبات", "nav.team": "ٹیم", "nav.manifesto": "منشور", "nav.contact": "رابطہ",
    "nav.share": "اپنا کام شیئر کریں ↗", "nav.showWriting": "تحریروں کا ذیلی مینو دکھائیں", "nav.showFilms": "فلمز اور گفتگو کا ذیلی مینو دکھائیں",
    "nav.showGallery": "گیلری کا ذیلی مینو دکھائیں", "nav.switchToUrdu": "اردو منتخب کریں", "nav.switchToEnglish": "انگریزی منتخب کریں",
    "nav.urduLabel": "اردو", "nav.englishLabel": "English", "nav.contactSubmissions": "رابطہ اور گذارشات",
    "ui.explore": "دریافت کریں", "ui.about": "تعارف", "ui.reach": "رابطہ کریں", "ui.readMore": "مزید پڑھیں ↗",
    "ui.allReflections": "تمام تاثرات ↗", "ui.allFilms": "تمام فلمیں ↗", "ui.allGallery": "تمام گیلری ↗",
    "ui.enterArchive": "آرکائیو میں جائیں ↗", "ui.more": "مزید ↗", "ui.startPiece": "اپنی تحریر شروع کریں ↗",
    "ui.communityFavorites": "قارئین کی پسند", "ui.keepSignal": "تازہ کاری حاصل کریں", "ui.trendingTags": "مقبول موضوعات",
    "ui.whyWeExist": "ہم کیوں موجود ہیں", "ui.readManifesto": "ہمارا منشور پڑھیں ↗", "ui.backFrontPage": "صفحۂ اول پر واپس جائیں", "ui.join": "شامل ہوں", "ui.play": "چلائیں",
    "ui.share": "شیئر کریں:", "ui.facebook": "فیس بک", "ui.twitter": "ایکس / ٹوئٹر", "ui.whatsapp": "واٹس ایپ",
    "ui.copyLink": "لنک کاپی کریں", "ui.copied": "کاپی ہو گیا!", "ui.video": "ویڈیو", "ui.photo": "تصویر", "ui.emailPlaceholder": "آپ کا ای میل", "ui.joinWhatsApp": "واٹس ایپ میں شامل ہوں",
    "ui.storyNotFound": "تحریر نہیں ملی", "ui.storyNotFoundDescription": "یہ تحریر منتقل یا غیر شائع ہو سکتی ہے۔",
    "ui.tryHomeWriting": "صفحۂ اول پر واپس جائیں یا تحریریں دیکھیں۔",
    "ui.noStories": "اس زمرے میں ابھی کوئی تحریر نہیں۔ جلد واپس آئیں۔", "ui.noSearchResults": "آپ کی تلاش سے کوئی تحریر نہیں ملی۔",
    "ui.noVideos": "ابھی کوئی ویڈیو شائع نہیں ہوئی۔", "ui.noPhotos": "ابھی کوئی تصویر شائع نہیں ہوئی۔",
    "ui.noOpinions": "ابھی کوئی تاثرات شائع نہیں ہوئے۔", "ui.noRecaps": "ابھی کوئی نشست کا خلاصہ شائع نہیں ہوا۔",
    "ui.noTeam": "ٹیم کی فہرست ابھی شائع نہیں ہوئی — جلد واپس آئیں۔", "ui.member": "رکن", "ui.members": "ارکان",
    "category.news": "نثری اور تصویری کہانیاں", "category.campus": "شاعری", "category.academics": "فلسفہ اور تاثرات",
    "category.events": "نشستوں کے خلاصے", "category.opinion": "قارئین کے تاثرات",
    "home.kicker": "تخلیق کا زندہ آرکائیو", "home.heroTitle": "حیرت کے لیے<br>جگہ بنائیں۔",
    "home.heroDescription": "کہانیاں، تصاویر، خیالات اور محفلیں — ایک ایسی تخلیقی برادری سے جہاں ہر آواز ایک فن بن سکتی ہے۔",
    "home.contributeKicker": "ہر قاری، لکھاری اور فنکار کے لیے کھلا", "home.contributeTitle": "ادھورا خیال بھی لے آئیں۔",
    "home.contributeDescription": "اپنی تحریر، فن یا خیال Soul & Script کے ساتھ شیئر کریں۔ ہمیں اس چنگاری میں دلچسپی ہے جو مکمل ہونے سے پہلے جنم لیتی ہے۔",
    "home.curated": "منتخب اشارے", "home.poetry": "شاعری", "home.philosophy": "فلسفہ اور تاثرات",
    "home.reflections": "تاثرات", "home.films": "فلمز اور گفتگو", "home.fromGallery": "گیلری سے",
    "home.newsletterDescription": "نئی تحریروں، تصاویر اور محفلوں کی مختصر خبر۔ کوئی شور نہیں۔",
    "writing.kicker": "صفحے پر", "writing.title": "تحریریں۔",
    "writing.description": "شاعری، نثر، تصویری کہانیاں، فلسفہ اور اس کے درمیان سب کچھ — Soul & Script کی برادری کے قلم سے۔",
    "writing.searchPlaceholder": "عنوان، موضوع یا ٹیگ سے آرکائیو تلاش کریں…", "writing.everything": "سب کچھ",
    "writing.prose": "نثر اور کہانیاں", "writing.poetry": "شاعری", "writing.philosophy": "فلسفہ", "writing.recaps": "نشستوں کے خلاصے",
    "gallery.kicker": "بصری آرکائیو", "gallery.title": "گیلری۔",
    "gallery.description": "فوٹوگرافی، مصوری، خاکے اور وہ منفرد مناظر جو ایک دن کو یادگار بنا دیتے ہیں۔",
    "article.orbit": "اسی دائرے میں رہیں", "article.videoDescription": "Soul & Script کے آرکائیو سے یہ فلم یا گفتگو دیکھیں۔",
    "team.founders": "بانی اور شریک بانی", "team.editorial": "ادارتی بورڈ", "team.media": "میڈیا ٹیم",
    "team.promotion": "تشہیری ٹیم", "team.judges": "منصفین", "team.communication": "رابطہ ٹیم", "team.finance": "مالیاتی ٹیم",
    "nav.toggleMenu": "مینو کھولیں", "shell.est": "قیام: ۲۰۲۶ · ہر فن کے لیے ایک گھر", "shell.tagline": "ایسے کام کے لیے آزاد جگہ جو ٹھہرنا نہیں چاہتا۔",
    "footer.description": "قارئین، لکھاریوں، مفکرین، مصوروں اور ہر نوع کے فنکاروں کی تخلیقی برادری۔", "footer.editorial": "ادارتی رسائی",
    "page.reflections": "تاثرات", "page.reflectionsDescription": "Soul & Script کی برادری کے قارئین کے خیالات، ذاتی مضامین اور سنجیدہ جوابات۔",
    "page.tagTitle": "ٹیگ کے ذریعے دیکھیں", "page.tagDescription": "ہر حصے — خبروں، تاثرات اور ویڈیوز — میں ایک موضوع کا تعاقب کریں۔",
    "page.teamTitle": "ٹیم", "page.teamDescription": "وہ لوگ جو اسٹیج سے اسپریڈشیٹ تک Soul & Script کو چلاتے ہیں۔",
    "page.videosTitle": "فلمز اور گفتگو", "page.videosDescription": "Soul & Script کی برادری کی مختصر فلمیں، ویڈیوگرافی اور فلمی گفتگو۔",
    "page.aboutTitle": "Soul & Script کے بارے میں", "page.contactTitle": "رابطہ اور گذارشات", "page.contactDescription": "اپنی تحریر پیش کریں، تقریب کے بارے میں پوچھیں، کوئی اطلاع دیں یا ٹیم میں شامل ہونے کا طریقہ جانیں۔", "page.eventsTitle": "تقریبات", "page.eventsDescription": "فعال مقابلے جہاں ارکان حصہ لے کر خصوصی انعامات جیت سکتے ہیں، اور ان نشستوں کے خلاصے جو ہم پہلے منعقد کر چکے ہیں۔",
    "events.activeTitle": "فعال تقریبات", "events.activeDescription": "وہ مقابلے اور شرکت کی دعوتیں جو اس وقت جاری ہیں۔", "events.pastTitle": "گزشتہ تقریبات", "events.pastDescription": "وہ اوپن مائک نشستیں، کتابی نشستیں اور فلمی گفتگو جو ہم پہلے منعقد کر چکے ہیں۔",
    "page.notFoundDescription": "آپ جس صفحے کو تلاش کر رہے ہیں وہ منتقل ہو چکا ہے، غائب ہے یا یہاں کبھی تھا ہی نہیں۔"
  }
};

function ssGetLanguage() {
  try {
    const saved = localStorage.getItem(SS_LANG_KEY);
    return saved === "ur" || saved === "en" ? saved : SS_DEFAULT_LANGUAGE;
  } catch (_error) {
    return SS_DEFAULT_LANGUAGE;
  }
}

function ssUi(key) {
  const lang = window.SS_LANG || ssGetLanguage();
  return (SS_TRANSLATIONS[lang] && SS_TRANSLATIONS[lang][key]) || SS_TRANSLATIONS.en[key] || key;
}

function ssField(item, key) {
  if (!item) return "";
  const lang = window.SS_LANG || ssGetLanguage();
  const localized = item[`${key}_${lang}`];
  if (localized !== undefined && localized !== null && localized !== "") return localized;
  return item[key] !== undefined && item[key] !== null ? item[key] : "";
}

function ssListField(item, key) {
  const value = ssField(item, key);
  return Array.isArray(value) ? value : [];
}

function ssCategory(category) {
  return ssUi(`category.${category}`) || category || "";
}

function ssSetDocumentLanguage() {
  const lang = window.SS_LANG || ssGetLanguage();
  document.documentElement.lang = lang === "ur" ? "ur" : "en";
  document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  document.documentElement.dataset.lang = lang;
  if (document.body) {
    document.body.classList.toggle("lang-ur", lang === "ur");
    document.body.classList.toggle("lang-en", lang === "en");
  }
}

function ssApplyTranslations(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = ssUi(node.dataset.i18n);
    if (node.dataset.i18nHtml === "true") node.innerHTML = value;
    else node.textContent = value;
  });
  scope.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", ssUi(node.dataset.i18nPlaceholder));
  });
  scope.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", ssUi(node.dataset.i18nAria));
  });
  scope.querySelectorAll("[data-lang-label]").forEach((node) => {
    node.textContent = ssUi(window.SS_LANG === "ur" ? "nav.englishLabel" : "nav.urduLabel");
  });
  scope.querySelectorAll("[data-lang-toggle]").forEach((node) => {
    node.setAttribute("aria-label", ssUi(window.SS_LANG === "ur" ? "nav.switchToEnglish" : "nav.switchToUrdu"));
    node.setAttribute("aria-pressed", window.SS_LANG === "ur" ? "true" : "false");
  });
}

function ssSwitchLanguage() {
  const next = (window.SS_LANG || ssGetLanguage()) === "ur" ? "en" : "ur";
  try { localStorage.setItem(SS_LANG_KEY, next); } catch (_error) { /* continue with the current navigation */ }
  window.location.reload();
}

function ssInitLanguage() {
  window.SS_LANG = ssGetLanguage();
  ssSetDocumentLanguage();
  ssApplyTranslations(document);
  document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
    button.addEventListener("click", ssSwitchLanguage);
  });
}

window.SS_LANG = ssGetLanguage();
window.ssUi = ssUi;
window.ssField = ssField;
window.ssListField = ssListField;
window.ssCategory = ssCategory;
window.ssApplyTranslations = ssApplyTranslations;
window.ssSwitchLanguage = ssSwitchLanguage;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ssInitLanguage);
else ssInitLanguage();

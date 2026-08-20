/* =========================================================
   SOUL & SCRIPT — atelier motion layer
   Native IntersectionObserver + requestAnimationFrame motion.
   No content or CMS assumptions; works with English and Urdu text.
   ========================================================= */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const html = document.documentElement;
  const INTERNAL_LINK_RE = /^(?:https?:\/\/[^/]+)?\/(?:[^:#?]+)?(?:[?#].*)?$|^(?![a-z]+:)[^#].*\.html(?:[?#].*)?$/i;

  const markVisible = (node) => {
    node.classList.add('is-visible');
    if (node.classList.contains('writing-reveal')) node.setAttribute('data-revealed', 'true');
  };

  const splitWords = (node) => {
    if (!node || node.dataset.wordReveal === 'true' || node.querySelector('br')) return;
    const text = node.textContent.trim();
    // Keep Arabic-script text as one isolated bidi run; splitting Urdu words into spans
    // can visually reorder particles such as نے, مجھے, and دیا؟.
    if (!text || text.length > 220 || /[\u0600-\u06FF]/u.test(text)) return;
    node.dataset.wordReveal = 'true';
    node.setAttribute('aria-label', text);
    node.textContent = '';
    text.split(/(\s+)/u).forEach((part, index) => {
      if (/^\s+$/u.test(part)) {
        node.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement('span');
      word.className = 'atelier-word';
      word.setAttribute('aria-hidden', 'true');
      word.style.setProperty('--word-delay', `${Math.min(index / 2, 9) * 45}ms`);
      word.textContent = part;
      node.appendChild(word);
    });
  };

  const prepareTextReveals = () => {
    document.querySelectorAll('.page-hero h1, .front-grid h2, .front-grid h3, .section-head h2, .strip-head h3, .article-head h1, .article-body h2, .article-body h3, .team-group h3').forEach((heading) => {
      const targets = heading.querySelectorAll('a');
      if (targets.length) targets.forEach(splitWords);
      else splitWords(heading);
    });
    document.querySelectorAll('.writing-reveal').forEach(splitWords);
  };

  const reveal = () => {
    prepareTextReveals();
    const nodes = [...document.querySelectorAll('.front-grid > *, .contribute-banner, .section-head, .strip-head, .grid > *, .rail-card, .most-read, .newsletter-box, .side-card, .article-body, .article-head, .related-grid > *, .photo-tile, .team-group, .page-hero')];
    nodes.forEach((node, index) => {
      if (node.dataset.atelierReveal === 'true') return;
      node.dataset.atelierReveal = 'true';
      node.classList.add('art-reveal');
      const variant = node.matches('.photo-tile, .card > a') ? 'wipe' : node.matches('.section-head, .strip-head, .page-hero') ? 'slide-left' : index % 3 === 1 ? 'rise-rotate' : 'rise';
      node.dataset.motion = variant;
      node.style.setProperty('--reveal-delay', `${Math.min(index % 9, 8) * 55}ms`);
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(markVisible);
      document.querySelectorAll('[data-word-reveal="true"]').forEach((node) => { node.classList.add('writing-reveal', 'is-visible'); });
      document.querySelectorAll('.atelier-word').forEach((word) => { word.style.setProperty('--word-delay', '0ms'); });
      return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        markVisible(entry.target);
        instance.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach((node) => observer.observe(node));

    const textObserver = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        markVisible(entry.target);
        instance.unobserve(entry.target);
      });
    }, { threshold: .35, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('[data-word-reveal="true"]').forEach((node) => {
      node.classList.add('writing-reveal');
      textObserver.observe(node);
    });
  };

  const parallax = () => {
    if (reduceMotion) return;
    const images = [...document.querySelectorAll('.hero-home img, .front-grid img, .photo-tile img, .article-body figure img, .card img')];
    if (!images.length) return;
    let ticking = false;
    const update = () => {
      const viewport = window.innerHeight;
      images.forEach((image) => {
        const rect = image.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewport) return;
        const amount = Math.max(-6, Math.min(6, (rect.top + rect.height / 2 - viewport / 2) / 100));
        image.style.setProperty('--parallax-y', `${amount}px`);
        image.classList.add('parallax-image');
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  };

  const philosophyMode = () => {
    if (!body.classList.contains('art-page-writing')) return;
    const filters = document.querySelectorAll('#news-filters button[data-filter]');
    const setMode = (value) => body.classList.toggle('is-philosophy', value === 'academics');
    setMode(new URLSearchParams(window.location.search).get('cat'));
    filters.forEach((filter) => filter.addEventListener('click', () => setMode(filter.dataset.filter)));
  };

  const navTint = () => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  const pageTransitions = () => {
    if (reduceMotion) return;
    requestAnimationFrame(() => html.classList.add('atelier-ready'));
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link || event.defaultPrevented || link.target === '_blank' || link.hasAttribute('download')) return;
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || !INTERNAL_LINK_RE.test(href)) return;
      let destination;
      try { destination = new URL(href, window.location.href); } catch (_error) { return; }
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      event.preventDefault();
      body.classList.add('atelier-leaving');
      window.setTimeout(() => { window.location.href = destination.href; }, 260);
    });
    window.addEventListener('pageshow', () => body.classList.remove('atelier-leaving'));
  };

  const init = () => {
    reveal();
    parallax();
    philosophyMode();
    navTint();
    pageTransitions();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

const themeToggle = document.querySelector('.theme-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollBehavior = () => reducedMotion.matches ? 'auto' : 'smooth';

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  themeToggle.setAttribute('aria-pressed', String(isDark));
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#0f1923' : '#ece8e1';
}
setTheme(document.documentElement.dataset.theme);
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  try { localStorage.setItem('homepage-theme', next); } catch (_) { /* Theme works without storage. */ }
});

// Use the document top instead of the sticky profile panel as the scroll target.
document.querySelectorAll('[data-back-to-top]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior() });
    const profile = document.querySelector('.profile-panel');
    if (profile) profile.scrollTop = 0;
    document.querySelector('.site-header .brand')?.focus({ preventScroll: true });
  });
});

document.querySelectorAll('.project-gallery').forEach(gallery => {
  const strip = gallery.querySelector('.project-strip');
  const slides = [...strip.querySelectorAll('.project-slide')];
  const prev = gallery.querySelector('.gallery-arrow-left');
  const next = gallery.querySelector('.gallery-arrow-right');
  const updateArrows = () => {
    prev.disabled = strip.scrollLeft <= 2;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
  };
  [prev, next].forEach((button, index) => {
    button.addEventListener('click', () => {
      const start = strip.getBoundingClientRect().left;
      const nearest = slides.reduce((best, slide, i) =>
        Math.abs(slide.getBoundingClientRect().left - start) < Math.abs(slides[best].getBoundingClientRect().left - start) ? i : best, 0);
      const target = slides[Math.max(0, Math.min(slides.length - 1, nearest + (index ? 1 : -1)))];
      strip.scrollBy({ left: target.getBoundingClientRect().left - start, behavior: scrollBehavior() });
    });
  });
  strip.addEventListener('scroll', updateArrows, { passive: true });
  new ResizeObserver(updateArrows).observe(strip);
  updateArrows();
});

const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxCaption = document.querySelector('.lightbox-caption');
const closeButton = document.querySelector('.lightbox-close');
let activeSlides = [];
let activeIndex = 0;
let opener = null;
function showSlide(index) {
  activeIndex = (index + activeSlides.length) % activeSlides.length;
  const img = activeSlides[activeIndex].querySelector('img');
  lightboxImage.src = img.currentSrc || img.src;
  lightboxImage.alt = img.alt;
  lightboxCaption.textContent = img.alt;
  document.querySelector('.lightbox-counter').textContent = `${activeIndex + 1} / ${activeSlides.length}`;
}
function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove('lightbox-open');
  document.querySelector('main').inert = false;
  document.querySelector('.site-header').inert = false;
  lightboxImage.removeAttribute('src');
  opener?.focus({ preventScroll: true });
}
document.querySelectorAll('.project-slide').forEach(slide => {
  slide.addEventListener('click', () => {
    opener = slide;
    activeSlides = [...slide.closest('.project-strip').querySelectorAll('.project-slide')];
    showSlide(activeSlides.indexOf(slide));
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    document.querySelector('main').inert = true;
    document.querySelector('.site-header').inert = true;
    closeButton.focus({ preventScroll: true });
  });
});
closeButton?.addEventListener('click', closeLightbox);
document.querySelector('.lightbox-prev')?.addEventListener('click', () => showSlide(activeIndex - 1));
document.querySelector('.lightbox-next')?.addEventListener('click', () => showSlide(activeIndex + 1));
lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', event => {
  if (!lightbox || lightbox.hidden) return;
  if (['Escape', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) event.preventDefault();
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') showSlide(activeIndex - 1);
  if (event.key === 'ArrowRight') showSlide(activeIndex + 1);
  if (event.key === 'Tab') {
    const buttons = [...lightbox.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }
});

// Publication filters keep the complete research list available without navigation.
const filterButtons = [...document.querySelectorAll('.filter-button')];
filterButtons.forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  filterButtons.forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('.publication').forEach(article => {
    article.hidden = filter !== 'all' && article.dataset.status !== filter;
  });
  document.querySelectorAll('.publication-group').forEach(group => {
    group.hidden = ![...group.querySelectorAll('.publication')].some(article => !article.hidden);
  });
}));

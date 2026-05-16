const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-content");
const themeToggle = document.querySelector(".theme-toggle");
const navLinks = document.querySelectorAll(".site-nav .nav-link");
const tabNavLinks = document.querySelectorAll("[data-tab-target]");
const contactWidget = document.querySelector(".contact-widget");
const contactWidgetToggle = document.querySelector(".contact-widget-toggle");
const galleryArrows = document.querySelectorAll(".gallery-arrow");
const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");
const storedTheme = localStorage.getItem("theme");
let activeSlides = [];
let activeSlideIndex = 0;

const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;

  if (!themeToggle) return;

  const isLight = theme === "light";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark mode" : "Switch to light mode"
  );
  themeToggle.setAttribute("aria-pressed", String(isLight));
};

setTheme(storedTheme || "dark");

themeToggle?.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "dark";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  setTheme(nextTheme);
});

const activateTab = (target, sourceButton) => {
  if (!target) return;

  if (sourceButton) {
    sourceButton.classList.remove("is-popping");
    void sourceButton.offsetWidth;
    sourceButton.classList.add("is-popping");
  }

  tabButtons.forEach((item) => {
    const selected = item.dataset.tab === target;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tab === target);
  });

  navLinks.forEach((item) => {
    item.classList.toggle("active", item.dataset.tabTarget === target);
  });
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab, button);
  });

  button.addEventListener("animationend", () => {
    button.classList.remove("is-popping");
  });
});

tabNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    activateTab(link.dataset.tabTarget);
    document.querySelector(".tab-panels")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

contactWidgetToggle?.addEventListener("click", () => {
  const isOpen = contactWidget?.classList.toggle("open") || false;
  contactWidgetToggle.setAttribute("aria-expanded", String(isOpen));
});

galleryArrows.forEach((arrow) => {
  arrow.addEventListener("click", () => {
    const strip = arrow.parentElement?.querySelector(".project-strip");
    if (!strip) return;

    const direction = arrow.classList.contains("gallery-arrow-left") ? -1 : 1;
    strip.scrollBy({
      left: direction * strip.clientWidth * 0.72,
      behavior: "smooth",
    });
  });
});

const showLightboxSlide = (index) => {
  if (!lightbox || !lightboxImage || !lightboxCaption || activeSlides.length === 0) return;

  activeSlideIndex = (index + activeSlides.length) % activeSlides.length;
  const image = activeSlides[activeSlideIndex].querySelector("img");
  if (!image) return;

  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = `${image.alt} · ${activeSlideIndex + 1}/${activeSlides.length}`;
};

const openLightbox = (slide) => {
  const strip = slide.closest(".project-strip");
  if (!strip || !lightbox) return;

  activeSlides = Array.from(strip.querySelectorAll(".project-slide"));
  activeSlideIndex = activeSlides.indexOf(slide);
  showLightboxSlide(activeSlideIndex);
  lightbox.classList.add("open");
  document.body.classList.add("lightbox-open");
};

const closeLightbox = () => {
  if (!lightbox) return;

  lightbox.classList.remove("open");
  document.body.classList.remove("lightbox-open");
  if (lightboxImage) lightboxImage.src = "";
};

document.querySelectorAll(".project-slide").forEach((slide) => {
  slide.addEventListener("click", () => openLightbox(slide));
});

lightboxPrev?.addEventListener("click", () => showLightboxSlide(activeSlideIndex - 1));
lightboxNext?.addEventListener("click", () => showLightboxSlide(activeSlideIndex + 1));
lightboxClose?.addEventListener("click", closeLightbox);

lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (!lightbox?.classList.contains("open")) return;

  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") showLightboxSlide(activeSlideIndex - 1);
  if (event.key === "ArrowRight") showLightboxSlide(activeSlideIndex + 1);
});

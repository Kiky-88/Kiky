const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-content");
const themeToggle = document.querySelector(".theme-toggle");
const navLinks = document.querySelectorAll(".site-nav .nav-link");
const tabNavLinks = document.querySelectorAll("[data-tab-target]");
const homeLinks = document.querySelectorAll("[data-nav-home]");
const storedTheme = localStorage.getItem("theme");

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

homeLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navLinks.forEach((item) => {
      item.classList.toggle("active", item.hasAttribute("data-nav-home"));
    });
    document.querySelector("#home")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

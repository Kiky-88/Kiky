const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-content");
const themeToggle = document.querySelector(".theme-toggle");
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

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.tab;

    button.classList.remove("is-popping");
    void button.offsetWidth;
    button.classList.add("is-popping");

    tabButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
    });

    tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tab === target);
    });
  });

  button.addEventListener("animationend", () => {
    button.classList.remove("is-popping");
  });
});

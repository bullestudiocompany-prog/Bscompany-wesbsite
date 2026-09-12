(function () {
  const savedTheme = localStorage.getItem("bscompany-theme") || "light";

  document.documentElement.setAttribute("data-theme", savedTheme);

  document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = themeToggle?.querySelector(".theme-icon");

    function updateTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);

      if (themeIcon) {
        themeIcon.textContent = theme === "black" ? "☾" : "☀";
      }

      localStorage.setItem("bscompany-theme", theme);
    }

    updateTheme(savedTheme);

    themeToggle?.addEventListener("click", () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme");

      updateTheme(currentTheme === "black" ? "light" : "black");
    });
  });
})();

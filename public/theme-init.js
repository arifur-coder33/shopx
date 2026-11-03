(() => {
  try {
    const savedTheme = localStorage.getItem("theme");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
})();

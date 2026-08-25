(() => {
  const storageKey = "motor-asphalte-document-theme";
  const root = document.documentElement;

  const readSavedTheme = () => {
    try {
      const theme = window.localStorage.getItem(storageKey);
      return theme === "dark" || theme === "light" ? theme : null;
    } catch {
      return null;
    }
  };

  const saveTheme = (theme) => {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // The document remains usable if local storage is unavailable.
    }
  };

  const savedTheme = readSavedTheme();
  const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = savedTheme ?? (systemPrefersDark ? "dark" : "light");

  const button = document.createElement("button");
  button.id = "theme-toggle";
  button.type = "button";
  document.body.prepend(button);

  const updateButton = () => {
    const darkModeEnabled = root.dataset.theme === "dark";
    button.textContent = darkModeEnabled ? "☀ Mode clair" : "☾ Mode sombre";
    button.setAttribute("aria-pressed", String(darkModeEnabled));
    button.setAttribute(
      "aria-label",
      darkModeEnabled ? "Activer le mode clair" : "Activer le mode sombre"
    );
  };

  button.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    saveTheme(root.dataset.theme);
    updateButton();
  });

  updateButton();
})();

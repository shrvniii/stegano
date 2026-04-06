/**
 * theme.js — Dark / Light mode toggle
 * Default: Light (warm cream). Toggle adds dark-mode class.
 * Reads preference from localStorage and applies on load.
 */
(function () {
  const STORAGE_KEY = 'steg-theme';
  const DARK_CLASS  = 'dark-mode';

  function applyTheme(isDark) {
    document.body.classList.toggle(DARK_CLASS, isDark);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? 'Light' : 'Dark';
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Default to light mode (warm cream); user can toggle to dark
    const isDark = saved ? saved === 'dark' : false;
    applyTheme(isDark);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const isDark = !document.body.classList.contains(DARK_CLASS);
        applyTheme(isDark);
        localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
      });
    }
  }

  // Run immediately so there's no flash
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

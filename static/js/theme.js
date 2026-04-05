/**
 * theme.js — Dark / Light mode toggle
 * Reads preference from localStorage and applies on load.
 */
(function () {
  const STORAGE_KEY = 'steg-theme';
  const LIGHT_CLASS = 'light-mode';

  function applyTheme(isLight) {
    document.body.classList.toggle(LIGHT_CLASS, isLight);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isLight ? '🌙' : '☀️';
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const preferLight = saved ? saved === 'light' : false; // Dark mode is default
    applyTheme(preferLight);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const isLight = !document.body.classList.contains(LIGHT_CLASS);
        applyTheme(isLight);
        localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
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

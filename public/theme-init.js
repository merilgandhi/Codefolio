// This blocking, same-origin script runs before React to avoid a theme flash.
// It remains compatible with the production policy that disallows inline scripts.
(() => {
  let preference = null;
  try {
    const saved = localStorage.getItem('codefolio-theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    /* Theme switching still works when storage is unavailable. */
  }
  const dark = preference
    ? preference === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.themePreference = preference || 'system';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#141218' : '#f8f7fa');
})();

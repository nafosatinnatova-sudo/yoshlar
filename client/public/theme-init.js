// Applies the saved or system color theme before the first paint (no flash of the wrong theme).
// Must stay tiny, dependency-free and synchronous. Mirrors src/context/ThemeContext.tsx.
(function () {
  var root = document.documentElement;
  var dark = false;
  try {
    var saved = window.localStorage.getItem('ssp_theme');
    if (saved === 'dark') dark = true;
    else if (saved !== 'light') dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    try {
      dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e2) {
      dark = false;
    }
  }
  if (dark) root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = dark ? 'dark' : 'light';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#020617' : '#ffffff');
})();

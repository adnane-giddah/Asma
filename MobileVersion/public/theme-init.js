(function () {
  var settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('asma:settings:v1') || '{}') || {};
  } catch (e) {}
  var root = document.documentElement;
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : prefersDark ? 'dark' : 'light';
  var lang = settings.lang === 'ar' || settings.lang === 'en' ? settings.lang : (navigator.language || '').slice(0, 2) === 'ar' ? 'ar' : 'en';
  root.setAttribute('data-theme', theme);
  root.setAttribute('lang', lang);
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
})();

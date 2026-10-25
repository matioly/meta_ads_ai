// Set initial route before first paint; no API calls or navigation changes.
(() => {
  const requested = new URLSearchParams(window.location.search).get('view');
  const allowed = ['overview', 'campaigns', 'media', 'integrations'];
  document.documentElement.dataset.initialView = allowed.includes(requested) ? requested : 'overview';
})();

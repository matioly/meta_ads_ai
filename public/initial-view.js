// Set initial route before first paint; no API calls or navigation changes.
(() => {
  const route = window.location.pathname;
  const requested = route === '/campaigns.html' ? 'campaigns'
    : route === '/integrations.html' ? 'integrations'
      : new URLSearchParams(window.location.search).get('view');
  const allowed = ['overview', 'campaigns', 'media', 'integrations'];
  document.documentElement.dataset.initialView = allowed.includes(requested) ? requested : 'overview';
})();

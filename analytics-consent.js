(() => {
  'use strict';

  if (!['www.heidewitzka.io', 'heidewitzka.io'].includes(location.hostname)) return;

  const storageKey = 'heidewitzka.analyticsConsent.v1';
  let consent;
  try {
    consent = localStorage.getItem(storageKey);
  } catch {
    // Keep the choice for this page if storage is unavailable.
  }

  function loadAnalytics() {
    if (document.getElementById('heidewitzka-gtm')) return;

    const dataLayer = window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.id = 'heidewitzka-gtm';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-PL8BVP9T';
    document.head.append(script);
  }

  const panel = document.createElement('section');
  panel.className = 'hw-analytics-consent';
  panel.setAttribute('aria-labelledby', 'hw-analytics-consent-title');
  panel.hidden = true;
  panel.innerHTML = `
    <h2 id="hw-analytics-consent-title">Optionale Webanalyse</h2>
    <p>Mit Ihrer Zustimmung nutzen wir Google Analytics, um Aufrufe und Interaktionen auf dieser Website auszuwerten. Ihre Auswahl können Sie jederzeit über „Analyse-Einstellungen“ ändern. <a href="/datenschutz#webanalyse">Datenschutz</a></p>
    <div class="hw-analytics-consent-actions">
      <button type="button" data-analytics-choice="denied">Ablehnen</button>
      <button type="button" data-analytics-choice="granted">Analyse erlauben</button>
    </div>`;
  document.body.append(panel);

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'hw-analytics-settings';
  settings.textContent = 'Analyse-Einstellungen';
  settings.setAttribute('aria-expanded', 'false');
  (document.querySelector('footer') || document.body).append(settings);

  function showPanel(show) {
    panel.hidden = !show;
    settings.setAttribute('aria-expanded', String(show));
  }

  settings.addEventListener('click', () => {
    showPanel(panel.hidden);
    if (!panel.hidden) panel.querySelector('button').focus();
  });

  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && consent) {
      showPanel(false);
      settings.focus();
    }
  });

  panel.addEventListener('click', event => {
    const choice = event.target.closest('button[data-analytics-choice]')?.dataset.analyticsChoice;
    if (!choice) return;

    const previous = consent;
    consent = choice;
    let persisted = false;
    try {
      localStorage.setItem(storageKey, consent);
      persisted = true;
    } catch {
      // The current page can still honor the choice.
    }

    showPanel(false);
    settings.focus();

    if (consent === 'granted') loadAnalytics();
    if (previous === 'granted' && consent === 'denied') {
      window['ga-disable-G-F984PSQRND'] = true;
      if (persisted) location.reload();
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === storageKey && consent === 'granted' && event.newValue !== 'granted') {
      window['ga-disable-G-F984PSQRND'] = true;
      location.reload();
    }
  });

  if (consent === 'granted') loadAnalytics();
  else if (consent !== 'denied') showPanel(true);
})();

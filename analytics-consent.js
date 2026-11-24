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


  // Shared public-page navigation, independent of analytics consent.
  function mountPageTools() {
    const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    if (['/', '/index', '/startseite-test'].includes(path) || /^\/(intern|api)(\/|$)/.test(path)) return;
    const header = document.querySelector('.nav-wrap');
    if (!header || document.querySelector('.hw-page-tools')) return;
    const heading = document.querySelector('main h1, h1');
    const labels = {'/kampagnen':'Kampagnenmanagement','/ai':'KI im Marketing','/insights':'Blog','/shop':'Leistungen & Preise','/kampagnen/google-ads':'Google Ads','/kampagnen/chatgpt-ads':'ChatGPT Ads','/kampagnen/meta-ads':'Meta Ads','/kampagnen/netflix-ads':'Netflix Ads','/kampagnen/linkedin':'LinkedIn','/kampagnen/pinterest':'Pinterest','/kampagnen/display':'Display'};
    const title = labels[path] || heading?.textContent.trim() || document.title.split('|')[0].trim();
    const items = [{name:'Startseite',path:'/'}];
    const parent = path.startsWith('/kampagnen/') ? '/kampagnen' : path.startsWith('/ai/') ? '/ai' : document.querySelector('.article-hero, .article-content') ? '/insights' : /^\/(google-ads-audit|meta-ads-audit|tracking-check|strategie-sparring|second-opinion-agenturreport)$/.test(path) ? '/shop' : null;
    if (parent && parent !== path) items.push({name:labels[parent],path:parent});
    items.push({name:title,path});
    const bar = document.createElement('div');
    bar.className = 'hw-page-tools';
    const inner = document.createElement('div'); inner.className = 'wrap hw-page-tools-inner';
    const nav = document.createElement('div'); nav.setAttribute('role','navigation'); nav.setAttribute('aria-label','Brotkrümelnavigation'); nav.className='hw-crumbs';
    items.forEach((item,i) => {
      if(i){const sep=document.createElement('span');sep.textContent='/';sep.setAttribute('aria-hidden','true');nav.append(sep);}
      const el=document.createElement(i===items.length-1?'span':'a');el.textContent=item.name;
      if(i===items.length-1)el.setAttribute('aria-current','page');else el.href=item.path;
      nav.append(el);
    });
    const actions=document.createElement('div');actions.className='hw-ai-read';
    const url='https://www.heidewitzka.io'+path;
    const prompt='Lies die folgende öffentliche Seite der Heidewitzka GmbH. Fasse die zentralen Aussagen zusammen und beantworte meine Fragen anhand der Seiteninhalte. Falls du die Seite nicht abrufen kannst, weise darauf hin: '+url;
    for(const [provider,label,base,mark] of [['claude','Claude','https://claude.ai/new?q=','✳'],['chatgpt','ChatGPT','https://chatgpt.com/?q=','']]){
      const a=document.createElement('a');a.href=base+encodeURIComponent(prompt);a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Mit '+label+' lesen (neuer Tab)');
      const icon=document.createElement('span');icon.className='hw-ai-mark hw-ai-'+provider;icon.setAttribute('aria-hidden','true');
      if(provider==='chatgpt'){const img=document.createElement('img');img.src='/assets/chatgpt-ads-icon.png';img.alt='';icon.append(img);}else icon.textContent=mark;
      const copy=document.createElement('span');copy.textContent='Mit '+label+' lesen';a.append(icon,copy);
      a.addEventListener('click',()=>{if(consent==='granted') (window.dataLayer=window.dataLayer||[]).push({event:'ai_read_click',ai_provider:provider,page_path:path});});
      actions.append(a);
    }
    inner.append(nav,actions);bar.append(inner);header.after(bar);
    if(!Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some(s=>s.textContent.includes('BreadcrumbList'))){
      const schema=document.createElement('script');schema.type='application/ld+json';schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:'https://www.heidewitzka.io'+item.path}))});document.head.append(schema);
    }
  }
  mountPageTools();

  if (consent === 'granted') loadAnalytics();
  else if (consent !== 'denied') showPanel(true);
})();

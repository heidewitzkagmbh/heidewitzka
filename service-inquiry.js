(() => {
  const labels = {
    'google-ads-audit':'Google Ads Audit', 'meta-ads-audit':'Meta Ads Audit',
    'tracking-reparatur':'Tracking-Check', 'tracking-setup':'Tracking-Aufbau',
    'neue-kampagnen':'Kampagnenaufbau', 'strategie-sparring':'Strategie-Sparring',
    'marketing-stunde':'Individuelle Unterstützung', 'kampagnen-update':'Kampagnen-Update',
    'google-ai-optionen':'Plattform-KI', 'pmax-optimierung':'Performance Max Optimierung',
    'remarketing':'Remarketing', 'produktfeed':'Produktfeed', 'reporting-dashboard':'Reporting & Dashboard',
    'kanalstrategie':'Kanalstrategie', 'multikanalstrategie':'Multikanalstrategie',
    'chatgpt-ads-aufbau':'ChatGPT Ads – Kampagnenaufbau', 'chatgpt-ads-betreuung':'ChatGPT Ads – Betreuung',
    'ki-sichtbarkeit-strategie':'Strategie für KI-Sichtbarkeit',
    'google-ads':'Google Ads & Microsoft Ads', 'meta-ads':'Meta & Instagram Ads',
    'linkedin':'LinkedIn Ads', 'pinterest':'Pinterest Ads',
    'performance-radar':'Performance Radar', 'growth-navigator':'Growth Navigator',
    'campaign-lab':'Campaign Lab', 'kampagnenkonzept':'Individuelles Kampagnenkonzept'
  };
  const key = new URLSearchParams(location.search).get('service');
  if (!Object.prototype.hasOwnProperty.call(labels, key)) return;
  const topic = document.getElementById('topic');
  const message = document.getElementById('message');
  if (!topic || !message) return;
  const option = document.createElement('option');
  option.value = option.textContent = labels[key];
  topic.appendChild(option);
  topic.value = labels[key];
  if (!message.value) message.value = 'Ich interessiere mich für '+labels[key]+'.\n\nUnsere aktuelle Situation:\n\nUnser Ziel:\n\nGewünschter Zeitraum:\n';
})();

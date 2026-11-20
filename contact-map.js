(() => {
  const stage = document.getElementById('contact-map-stage');
  const load = document.getElementById('map-load');
  const revoke = document.getElementById('map-revoke');
  const notice = document.getElementById('map-notice');
  if (!stage || !load || !revoke || !notice) return;

  load.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.title = 'Standort Heidewitzka – Rudolfplatz 3, Köln';
    frame.referrerPolicy = 'no-referrer';
    frame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=6.9340%2C50.9340%2C6.9450%2C50.9405&layer=mapnik';
    stage.replaceChildren(frame);
    revoke.hidden = false;
    revoke.focus();
  });
  revoke.addEventListener('click', () => {
    stage.replaceChildren(notice);
    revoke.hidden = true;
    load.focus();
  });
})();

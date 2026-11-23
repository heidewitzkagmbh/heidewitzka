(function () {
  const section = document.getElementById('audit-buchung');
  const form = document.getElementById('audit-booking-form');
  const status = document.getElementById('audit-booking-status');
  const select = document.getElementById('audit-slot');
  const submit = form.querySelector('button');
  const endpoint = '/api/audit-booking';
  const date = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Berlin'
  });
  const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

  function displayOffer(data) {
    const price = document.getElementById('audit-price');
    const detail = document.createElement('span');
    detail.textContent = money.format(data.total / 100) + ' inkl. MwSt.';
    price.replaceChildren(document.createTextNode(money.format(data.net / 100) + ' netto '), detail);
    document.getElementById('audit-scope').textContent =
      'Für ein Google-Ads-Konto mit bis zu 15 aktiven Kampagnen. Sie erhalten die Ergebnisse in der Regel innerhalb von fünf Werktagen ab Kick-off und vorliegender Kontofreigabe.';
    const action = document.getElementById('audit-primary');
    action.href = '#audit-buchung';
    action.textContent = 'Audit buchen & Termin wählen';
  }

  async function loadSlots() {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Availability unavailable');
    const data = await response.json();
    if (!data.enabled) return;
    document.getElementById('audit-test').hidden = data.mode !== 'test';
    section.hidden = false;
    select.replaceChildren(new Option('Termin auswählen', ''));
    for (const slot of data.slots) select.add(new Option(date.format(new Date(slot.start)) + ' Uhr', slot.start));
    submit.disabled = data.slots.length === 0;
    status.textContent = data.slots.length ? '' : 'Aktuell sind alle online buchbaren Termine vergeben.';
    displayOffer(data.price);
  }

  async function showConfirmation(session) {
    section.hidden = false;
    form.hidden = true;
    document.getElementById('audit-booking-intro').hidden = true;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await fetch(endpoint + '?session=' + encodeURIComponent(session));
      if (!response.ok) throw new Error('Confirmation unavailable');
      const booking = await response.json();
      if (booking.status === 'confirmed') {
        status.textContent = 'Ihr Kick-off ist gebucht für ' + date.format(new Date(booking.start)) +
          ' Uhr. Die Einladung kommt per E-Mail. Bitte laden Sie vor dem Termin ' + booking.accessEmail +
          ' mit „Nur lesen“ in Ihr Google-Ads-Konto ein.';
        const current = new URL(location.href);
        current.searchParams.delete('checkout');
        history.replaceState(null, '', current);
        return;
      }
      if (booking.status === 'expired') {
        status.textContent = 'Die Terminreservierung ist abgelaufen. Bitte wählen Sie einen neuen Termin.';
        return;
      }
      status.textContent = booking.status === 'paid'
        ? 'Die Zahlung ist bestätigt. Ihre Kalendereinladung wird vorbereitet.'
        : 'Ihre Buchung wird geprüft.';
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    status.textContent += ' Sie können die Seite später neu laden, um den Status zu prüfen.';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    status.textContent = 'Der Termin wird geprüft …';
    const fields = new FormData(form);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: fields.get('start'), email: fields.get('email').trim(),
          campaigns: Number(fields.get('campaigns')), business: fields.has('business')
        })
      });
      const result = await response.json();
      if (response.ok && result.url) {
        const checkout = new URL(result.url);
        if (checkout.origin !== 'https://checkout.stripe.com') throw new Error('Unexpected Checkout URL');
        location.assign(checkout);
        return;
      }
      if (result.error === 'slot') {
        await loadSlots();
        status.textContent = 'Dieser Termin ist inzwischen belegt. Bitte wählen Sie einen anderen.';
        return;
      }
      status.textContent = result.error === 'scope'
        ? 'Für ein Konto mit mehr als 15 aktiven Kampagnen nutzen Sie bitte die individuelle Anfrage.'
        : 'Die Zahlung konnte nicht gestartet werden. Bitte versuchen Sie es erneut oder fragen Sie das Audit individuell an.';
    } catch {
      status.textContent = 'Die Zahlung konnte nicht gestartet werden. Bitte versuchen Sie es erneut oder fragen Sie das Audit individuell an.';
    }
    submit.disabled = false;
  });

  const session = new URLSearchParams(location.search).get('checkout');
  if (session) {
    showConfirmation(session).catch(() => {
      status.textContent = 'Der Buchungsstatus ist gerade nicht verfügbar. Bitte laden Sie die Seite später erneut. Bei Fragen helfen wir Ihnen weiter.';
    });
  } else {
    loadSlots().catch(() => { section.hidden = true; });
  }
})();

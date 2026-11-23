(() => {
  const endpoint = '/api/lp-contact';
  const form = document.getElementById('lp-contact-form');
  const interest = form.elements.namedItem('interest');

  function track(event) {
    (window.dataLayer ||= []).push({ event });
  }

  for (const link of document.querySelectorAll('[data-interest]')) {
    link.addEventListener('click', () => { interest.value = link.dataset.interest; });
  }

  const booking = document.getElementById('lp-calendly');
  const load = document.getElementById('lp-calendly-load');
  load.addEventListener('click', () => {
    load.disabled = true;
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.onload = () => {
      try {
        window.Calendly.initInlineWidget({ url: booking.dataset.url, parentElement: booking });
        document.getElementById('lp-calendly-intro').hidden = true;
      } catch {
        load.disabled = false;
      }
    };
    script.onerror = () => { load.disabled = false; };
    document.head.append(script);
  });

  const trackedBookings = new Set();
  window.addEventListener('message', ({ origin, source, data }) => {
    const iframe = booking.querySelector('iframe');
    if (origin !== 'https://calendly.com' || !iframe || source !== iframe.contentWindow ||
        data?.event !== 'calendly.event_scheduled') return;

    const id = data.payload?.invitee?.uri || data.payload?.event?.uri || 'booking';
    if (trackedBookings.has(id)) return;
    trackedBookings.add(id);
    track('lp_booking_complete');
  });

  const callbackForm = document.getElementById('lp-callback-form');
  let online = false;

  function wireForm(requestForm, status, isCallback) {
    const submit = requestForm.querySelector('button[type="submit"]');
    let lastPayload;
    let requestId;

    requestForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      const data = Object.fromEntries(new FormData(requestForm));

      if (isCallback && !online) {
        const subject = 'Rückrufanfrage über die ChatGPT-Ads-Landingpage';
        const body = ['Name: ' + data.name, 'Telefonnummer: ' + data.phone, 'Unternehmen: ' + data.company].join('\n');
        window.location.href = 'mailto:hallo@heidewitzka.io?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        return;
      }

      const payload = JSON.stringify(data);
      if (payload !== lastPayload) {
        requestId = crypto.randomUUID();
        lastPayload = payload;
      }
      submit.disabled = true;
      status.textContent = 'Ihre Anfrage wird gesendet …';
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
          body: payload
        });
        if (!response.ok || (await response.json()).sent !== true) throw new Error('Versand fehlgeschlagen');
        track(isCallback ? 'lp_callback_submit' : 'lp_form_submit');
        status.textContent = isCallback ? 'Vielen Dank, Ihre Rückrufanfrage wurde gesendet.' : 'Vielen Dank, Ihre Anfrage wurde gesendet.';
        requestForm.reset();
        lastPayload = undefined;
      } catch {
        status.textContent = 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie uns an hallo@heidewitzka.io.';
      } finally {
        submit.disabled = false;
      }
    });

    return () => {
      submit.disabled = !online && !isCallback;
      if (!online && isCallback) {
        submit.textContent = 'Rückruf per E-Mail vorbereiten';
        status.textContent = 'Ihr E-Mail-Programm öffnet sich mit den ausgefüllten Angaben.';
      } else if (!online) {
        status.textContent = 'Der Onlineversand ist aktuell nicht verfügbar. Schreiben Sie uns direkt per E-Mail.';
      } else {
        status.textContent = '';
      }
    };
  }

  const updateCallback = wireForm(callbackForm, document.getElementById('lp-callback-status'), true);
  const updateWritten = wireForm(form, document.getElementById('lp-form-status'), false);

  fetch(endpoint)
    .then(response => response.ok ? response.json() : null)
    .then(result => { online = result?.available === true; })
    .catch(() => {})
    .finally(() => {
      updateCallback();
      updateWritten();
    });
})();

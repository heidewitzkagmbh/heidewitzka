(() => {
  const endpoint = '/api/lp-contact';
  const form = document.getElementById('lp-contact-form');
  const submit = form.querySelector('button[type="submit"]');
  const status = document.getElementById('lp-form-status');
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

  async function enableForm() {
    try {
      const response = await fetch(endpoint);
      if (response.ok && (await response.json()).available === true) {
        submit.disabled = false;
        status.textContent = '';
        return;
      }
    } catch {
      // The email link remains usable when the service is unreachable.
    }
    status.textContent = 'Der Onlineversand ist aktuell nicht verfügbar. Schreiben Sie uns direkt per E-Mail.';
  }

  let lastPayload;
  let requestId;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const payload = JSON.stringify(Object.fromEntries(new FormData(form)));
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
      track('lp_form_submit');
      status.textContent = 'Vielen Dank, Ihre Anfrage wurde gesendet.';
      form.reset();
      lastPayload = undefined;
    } catch {
      status.textContent = 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie uns per E-Mail.';
    } finally {
      submit.disabled = false;
    }
  });
  enableForm();
})();

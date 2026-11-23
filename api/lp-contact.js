const interests = {
  pilot: 'ChatGPT Ads 60-Tage-Pilot',
  stunde: 'Unterstützung pro Stunde',
  betreuung: 'Laufende Betreuung',
  sonstiges: 'Andere Frage zu ChatGPT Ads'
};

module.exports = async function handler(req, res) {
  const send = (status, result) => {
    res.statusCode = status;
    return res.end(JSON.stringify(result));
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LP_CONTACT_FROM;
  if (req.method === 'GET') return send(200, { available: Boolean(key && from) });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(405, { sent: false });
  }

  const origins = ['https://www.heidewitzka.io', 'https://heidewitzka.io'];
  if (process.env.VERCEL_URL) origins.push('https://' + process.env.VERCEL_URL);
  if (!origins.includes(req.headers.origin)) return send(403, { sent: false });
  if (!key || !from) return send(503, { sent: false });
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(415, { sent: false });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.fax) return send(400, { sent: false });
  const read = (field, limit) => typeof body[field] === 'string' && body[field].length <= limit ? body[field].trim() : '';
  const name = read('name', 120);
  const email = read('email', 254);
  const id = req.headers['idempotency-key'];
  const callback = body.source === 'callback';
  if (!name || (!callback && !/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(email)) ||
      typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return send(400, { sent: false });

  const message = read('message', 3000);
  let subject;
  let details;
  if (callback) {
    const phone = read('phone', 40);
    const company = read('company', 180);
    if (!company || !/^[+0-9() .\/-]+$/.test(phone) || phone.replace(/\D/g, '').length < 5) return send(400, { sent: false });
    subject = 'Rückrufanfrage über die ChatGPT-Ads-Landingpage';
    details = ['Telefonnummer: ' + phone, 'Unternehmen: ' + company];
  } else if (body.source === 'contact') {
    const topic = read('topic', 180);
    if (!topic || !message) return send(400, { sent: false });
    const allowedPreferences = ['Telefonat vereinbaren', 'Kurze Rückmeldung und Einschätzung per E-Mail'];
    const preferences = Array.isArray(body['reply-preference'])
      ? allowedPreferences.filter(value => body['reply-preference'].includes(value))
      : [];
    subject = 'Projektanfrage über die Kontaktseite';
    details = [
      'Thema: ' + topic,
      'Unternehmen: ' + read('company', 180),
      'Gewünschte Rückmeldung: ' + preferences.join(', ')
    ];
  } else {
    const website = read('website', 250);
    const interest = read('interest', 20);
    if (body.privacy !== 'on' || !/^https?:\/\/[^\s]+$/i.test(website) ||
        !Object.hasOwn(interests, interest)) return send(400, { sent: false });
    subject = 'Website-Anfrage: ' + interests[interest];
    details = ['Interesse: ' + interests[interest], 'Website: ' + website, 'Branche: ' + read('branche', 100)];
  }
  const deliveryDetails = callback ? details : ['E-Mail: ' + email, ...details, 'Mediabudget: ' + read('budget', 100), '', message];
  const text = ['Name: ' + name, ...deliveryDetails].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'lp-contact/' + id
      },
      body: JSON.stringify({ from, to: ['hallo@heidewitzka.io'], reply_to: callback ? undefined : email, subject, text }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok || !(await response.json()).id) return send(502, { sent: false });
    return send(200, { sent: true });
  } catch {
    return send(502, { sent: false });
  }
};

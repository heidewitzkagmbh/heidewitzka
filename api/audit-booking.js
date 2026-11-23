const { randomUUID } = require('node:crypto');
const { bookingMode, siteOrigin, schedule, blockedDates } = require('./_booking/audit-config');
const { availableSlots, database, stripe, updateBooking } = require('./_booking/audit-services');
const { listAuditSlots } = require('./_booking/audit-availability');

function calendarPreview() {
  const [first] = listAuditSlots({
    ...schedule, now: new Date(), busy: [], reservations: [], blockedDates: blockedDates()
  });
  return { start: first?.start ?? null };
}

async function offer() {
  const [price, tax] = await Promise.all([
    stripe('prices/' + encodeURIComponent(process.env.AUDIT_STRIPE_PRICE)),
    stripe('tax_rates/' + encodeURIComponent(process.env.AUDIT_STRIPE_TAX_RATE))
  ]);
  if (!price.active || price.type !== 'one_time' || price.currency !== 'eur' ||
      price.unit_amount !== 95000 || price.tax_behavior === 'inclusive' ||
      !tax.active || tax.inclusive || tax.country !== 'DE' || tax.percentage !== 19) {
    throw new Error('Invalid Audit price or tax configuration');
  }
  return { net: price.unit_amount, total: Math.round(price.unit_amount * (1 + tax.percentage / 100)) };
}

async function releaseExpiredSessions() {
  const stale = await database('audit_bookings', {
    status: 'eq.held',
    select: 'stripe_session',
    checkout_expires_at: 'lt.' + new Date().toISOString(),
    limit: '8'
  });
  await Promise.all(stale.map(async row => {
    const session = await stripe('checkout/sessions/' + row.stripe_session);
    if (session.status === 'expired') await updateBooking(session.id, ['held'], 'expired');
  }));
}

async function startCheckout(body, origin, mode, send) {
  if (!body || typeof body !== 'object' || typeof body.start !== 'string' ||
      typeof body.email !== 'string' || body.email.length > 254 ||
      !/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(body.email) ||
      body.business !== true || !Number.isInteger(body.campaigns) || body.campaigns < 1) return send(400, { error: 'invalid' });
  if (body.campaigns > 15) return send(422, { error: 'scope' });

  await releaseExpiredSessions();
  const [slots, price] = await Promise.all([availableSlots(), offer()]);
  const slot = slots.find(candidate => candidate.start === body.start);
  if (!slot) return send(409, { error: 'slot' });

  const id = randomUUID();
  const expires = Math.floor(Date.now() / 1000) + 35 * 60;
  const session = await stripe('checkout/sessions', {
    mode: 'payment',
    locale: 'de',
    'adaptive_pricing[enabled]': 'false',
    'payment_method_types[0]': 'card',
    'line_items[0][price]': process.env.AUDIT_STRIPE_PRICE,
    'line_items[0][tax_rates][0]': process.env.AUDIT_STRIPE_TAX_RATE,
    'line_items[0][quantity]': '1',
    'consent_collection[terms_of_service]': 'required',
    billing_address_collection: 'required',
    customer_email: body.email,
    'name_collection[business][enabled]': 'true',
    'name_collection[business][optional]': 'false',
    client_reference_id: id,
    'invoice_creation[enabled]': 'true',
    'metadata[product]': 'google-ads-audit',
    'metadata[campaigns]': String(body.campaigns),
    expires_at: String(expires),
    success_url: origin + '/google-ads-audit?checkout={CHECKOUT_SESSION_ID}#audit-buchung',
    cancel_url: origin + '/google-ads-audit#audit-buchung'
  });
  if (session.livemode !== (mode === 'live') || session.amount_total !== price.total || !session.url) {
    await stripe('checkout/sessions/' + session.id + '/expire', {});
    throw new Error('Stripe created an unexpected session');
  }

  const reserved = await database('rpc/reserve_audit', {}, {
    method: 'POST',
    body: {
      p_id: id, p_session: session.id, p_start: slot.start, p_end: slot.end,
      p_expires: new Date(expires * 1000).toISOString(),
      p_buffer: schedule.bufferMinutes, p_capacity: schedule.weeklyCapacity
    }
  });
  if (!reserved) {
    await stripe('checkout/sessions/' + session.id + '/expire', {});
    return send(409, { error: 'slot' });
  }
  return send(200, { url: session.url });
}

module.exports = async function handler(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(405, { error: 'method' });
  }
  const mode = bookingMode();
  if (!mode) {
    if (req.method === 'POST') return send(503, { enabled: false });
    return send(200, { enabled: false, preview: calendarPreview() });
  }
  const origin = siteOrigin();

  try {
    if (req.method === 'POST') {
      if (req.headers.origin !== origin && !(mode === 'live' && req.headers.origin === 'https://heidewitzka.io')) {
        return send(403, { error: 'origin' });
      }
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) return send(415, { error: 'type' });
      return await startCheckout(req.body, origin, mode, send);
    }

    const session = new URL(req.url, origin).searchParams.get('session');
    if (session !== null) {
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(session) || session.length > 255) return send(400, { error: 'invalid' });
      const [booking] = await database('audit_bookings', {
        stripe_session: 'eq.' + session,
        select: 'status,starts_at'
      });
      if (!booking) return send(404, { error: 'unknown' });
      return send(200, {
        status: booking.status,
        start: ['paid', 'confirmed'].includes(booking.status) ? booking.starts_at : undefined,
        accessEmail: booking.status === 'confirmed' ? process.env.AUDIT_ADS_ACCESS_EMAIL : undefined
      });
    }

    await releaseExpiredSessions();
    const [price, slots] = await Promise.all([offer(), availableSlots()]);
    return send(200, { enabled: true, mode, price, slots });
  } catch (error) {
    console.error('Audit booking provider unavailable', { method: req.method, status: error.status });
    return send(503, { error: 'unavailable' });
  }
};

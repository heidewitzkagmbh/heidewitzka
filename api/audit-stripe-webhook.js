const { createHmac, timingSafeEqual } = require('node:crypto');
const { bookingMode } = require('./_booking/audit-config');
const { confirmBooking, updateBooking } = require('./_booking/audit-services');

function verifiedEvent(raw, header) {
  const fields = header.split(',').map(field => field.trim());
  const timestamp = fields.find(field => /^t=\d+$/.test(field))?.slice(2);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return null;
  const expected = createHmac('sha256', process.env.AUDIT_STRIPE_WEBHOOK_SECRET)
    .update(timestamp + '.').update(raw).digest();
  const valid = fields.some(field => /^v1=[a-f0-9]{64}$/i.test(field) &&
    timingSafeEqual(expected, Buffer.from(field.slice(3), 'hex')));
  if (!valid) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const mode = bookingMode();
  if (req.method !== 'POST' || !mode) {
    res.statusCode = mode ? 405 : 503;
    return res.end();
  }
  const header = req.headers['stripe-signature'];
  if (typeof header !== 'string') {
    res.statusCode = 400;
    return res.end();
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024) {
        res.statusCode = 413;
        return res.end();
      }
      chunks.push(chunk);
    }
    const event = verifiedEvent(Buffer.concat(chunks), header);
    if (!event || event.livemode !== (mode === 'live')) {
      res.statusCode = 400;
      return res.end();
    }
    const session = event.data?.object;
    if (session?.metadata?.product === 'google-ads-audit' && /^cs_(test|live)_[A-Za-z0-9]+$/.test(session.id)) {
      if (event.type === 'checkout.session.completed') await confirmBooking(session);
      if (event.type === 'checkout.session.expired') await updateBooking(session.id, ['held'], 'expired');
    }
    res.statusCode = 200;
  } catch (error) {
    console.error('Audit webhook fulfillment failed', { status: error.status });
    res.statusCode = 500;
  }
  return res.end();
};

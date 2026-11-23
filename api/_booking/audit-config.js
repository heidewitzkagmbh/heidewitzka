const schedule = {
  daysAhead: 42,
  kickoffMinutes: 30,
  slotStepMinutes: 30,
  bufferMinutes: 15,
  weeklyCapacity: 2,
  windowsByWeekday: {
    2: [[600, 720], [840, 960]],
    4: [[600, 720], [840, 960]]
  }
};

const required = [
  'AUDIT_SUPABASE_URL', 'AUDIT_SUPABASE_SERVICE_KEY',
  'AUDIT_STRIPE_KEY', 'AUDIT_STRIPE_WEBHOOK_SECRET', 'AUDIT_STRIPE_PRICE', 'AUDIT_STRIPE_TAX_RATE',
  'AUDIT_GOOGLE_CLIENT_ID', 'AUDIT_GOOGLE_CLIENT_SECRET', 'AUDIT_GOOGLE_REFRESH_TOKEN',
  'AUDIT_GOOGLE_CALENDAR_ID', 'AUDIT_ADS_ACCESS_EMAIL'
];

function bookingMode() {
  const mode = process.env.AUDIT_BOOKING_MODE;
  const stripePrefix = mode === 'live' ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/;
  if (!['test', 'live'].includes(mode) || !stripePrefix.test(process.env.AUDIT_STRIPE_KEY ?? '')) return null;
  const production = process.env.VERCEL_ENV === 'production';
  if (production !== (mode === 'live')) return null;
  return required.every(key => process.env[key]) ? mode : null;
}

function siteOrigin() {
  if (bookingMode() === 'test' && process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  return 'https://www.heidewitzka.io';
}

module.exports = { bookingMode, siteOrigin, schedule };

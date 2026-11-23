const { schedule, blockedDates } = require('./audit-config');
const { listAuditSlots } = require('./audit-availability');

async function providerRequest(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    const error = new Error('Booking provider request failed');
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function stripe(path, data) {
  return providerRequest('https://api.stripe.com/v1/' + path, {
    method: data ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + process.env.AUDIT_STRIPE_KEY },
    body: data ? new URLSearchParams(data) : undefined
  });
}

function database(path, query, { method = 'GET', body } = {}) {
  const base = new URL('/rest/v1/' + path, process.env.AUDIT_SUPABASE_URL);
  base.search = new URLSearchParams(query).toString();
  const key = process.env.AUDIT_SUPABASE_SERVICE_KEY;
  return providerRequest(base, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function googleToken() {
  const result = await providerRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.AUDIT_GOOGLE_CLIENT_ID,
      client_secret: process.env.AUDIT_GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.AUDIT_GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  return result.access_token;
}

async function calendarRequest(path, data) {
  return providerRequest('https://www.googleapis.com/calendar/v3/' + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + await googleToken(),
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });
}

async function freeBusy(now, until) {
  const ids = [...new Set([
    process.env.AUDIT_GOOGLE_CALENDAR_ID,
    ...(process.env.AUDIT_GOOGLE_BUSY_CALENDARS ?? '').split(',').map(id => id.trim()).filter(Boolean)
  ])];
  const result = await calendarRequest('freeBusy', {
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    items: ids.map(id => ({ id }))
  });
  return ids.flatMap(id => {
    const calendar = result.calendars?.[id];
    if (calendar?.errors?.length || !Array.isArray(calendar?.busy)) throw new Error('Calendar availability unavailable');
    return calendar.busy;
  });
}

async function availableSlots(now = new Date()) {
  const until = new Date(now.getTime() + (schedule.daysAhead + 1) * 86_400_000);
  const [busy, bookings] = await Promise.all([
    freeBusy(now, until),
    database('audit_bookings', {
      status: 'in.(held,paid,confirmed)',
      select: 'starts_at,ends_at',
      starts_at: 'gte.' + new Date(now.getTime() - 7 * 86_400_000).toISOString(),
      and: '(starts_at.lt.' + until.toISOString() + ')'
    })
  ]);
  return listAuditSlots({
    ...schedule, now, busy,
    blockedDates: blockedDates(),
    reservations: bookings.map(row => ({ start: row.starts_at, end: row.ends_at }))
  });
}

function updateBooking(session, previous, status) {
  return database('audit_bookings', { stripe_session: 'eq.' + session, status: 'in.(' + previous.join(',') + ')' }, {
    method: 'PATCH',
    body: { status }
  });
}

async function confirmBooking(session) {
  if (session.payment_status !== 'paid' || session.mode !== 'payment' || session.amount_total !== 113050 ||
      session.currency !== 'eur' || session.metadata?.product !== 'google-ads-audit') return;
  const rows = await updateBooking(session.id, ['held', 'paid'], 'paid');
  const booking = rows[0];
  if (!booking) return;
  const email = session.customer_details?.email;
  if (!email) throw new Error('Paid booking is missing its attendee');
  const calendar = encodeURIComponent(process.env.AUDIT_GOOGLE_CALENDAR_ID);
  const eventId = booking.id.replace(/-/g, '');
  try {
    await calendarRequest('calendars/' + calendar + '/events?sendUpdates=all&conferenceDataVersion=1', {
      id: eventId,
      summary: 'Google Ads Audit | Kick-off mit Tim Vogt',
      start: { dateTime: booking.starts_at, timeZone: 'Europe/Berlin' },
      end: { dateTime: booking.ends_at, timeZone: 'Europe/Berlin' },
      attendees: [{ email }],
      conferenceData: { createRequest: { requestId: eventId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      description: 'Bitte laden Sie vor dem Termin ' + process.env.AUDIT_ADS_ACCESS_EMAIL +
        ' in Ihrem Google-Ads-Konto mit der Rolle „Nur lesen“ ein. Im Kick-off klären wir Ihre Ziele und die wichtigsten Fragen zum Konto.'
    });
  } catch (error) {
    if (error.status !== 409) throw error; // The stable event ID also handles Stripe retries.
  }
  await updateBooking(session.id, ['paid'], 'confirmed');
}

module.exports = { availableSlots, confirmBooking, database, stripe, updateBooking };

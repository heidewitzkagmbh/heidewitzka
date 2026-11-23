const timezone = 'Europe/Berlin';
const dateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone });
const offsetFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: timezone,
  timeZoneName: 'longOffset'
});
const minute = 60_000;
const day = 24 * 60 * minute;
const minimumNoticeWeekdays = 5;

function isoWeek(date) {
  const thursday = new Date(date);
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1)) / day + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function milliseconds(interval) {
  const start = Date.parse(interval.start);
  const end = Date.parse(interval.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RangeError('Invalid booking or calendar interval');
  }
  return { start, end };
}

// Windows use Berlin wall time in minutes from midnight (for example 10:00 is 600).
// Pass Google FreeBusy intervals and active reservations across all audit packages.
function listAuditSlots({
  now,
  daysAhead,
  kickoffMinutes,
  slotStepMinutes,
  bufferMinutes,
  weeklyCapacity,
  windowsByWeekday,
  busy,
  reservations,
  blockedDates = []
}) {
  const today = Date.parse(`${dateFormatter.format(now)}T00:00:00Z`);
  const buffer = bufferMinutes * minute;
  const blocked = new Set(blockedDates);
  const reservedByWeek = new Map();
  const conflicts = [...busy, ...reservations].map(milliseconds);

  for (const reservation of reservations) {
    const localDate = dateFormatter.format(new Date(reservation.start));
    const week = isoWeek(Date.parse(`${localDate}T00:00:00Z`));
    reservedByWeek.set(week, (reservedByWeek.get(week) ?? 0) + 1);
  }

  const slots = [];
  let noticeDaysRemaining = minimumNoticeWeekdays;
  // Count full weekdays after today's Berlin date, even if no booking window is configured.
  for (let index = 1; index < daysAhead; index += 1) {
    const date = new Date(today + index * day);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    if (noticeDaysRemaining > 0) {
      noticeDaysRemaining -= 1;
      continue;
    }
    const label = date.toISOString().slice(0, 10);
    const week = isoWeek(date);
    const windows = windowsByWeekday[weekday] ?? [];
    if (!windows.length || blocked.has(label) || (reservedByWeek.get(week) ?? 0) >= weeklyCapacity) continue;

    // Berlin's offset changes overnight. Audit windows are during business hours.
    const noon = date.getTime() + 12 * 60 * minute;
    const zoneName = offsetFormatter.formatToParts(noon).find(part => part.type === 'timeZoneName').value;
    const localMidnight = Date.parse(`${label}T00:00:00${zoneName.slice(3)}`);
    for (const [opens, closes] of windows) {
      for (let startMinute = opens; startMinute + kickoffMinutes <= closes; startMinute += slotStepMinutes) {
        const start = localMidnight + startMinute * minute;
        const end = start + kickoffMinutes * minute;
        if (conflicts.some(interval => start - buffer < interval.end && end + buffer > interval.start)) continue;
        slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
      }
    }
  }
  return slots;
}

module.exports = { listAuditSlots };

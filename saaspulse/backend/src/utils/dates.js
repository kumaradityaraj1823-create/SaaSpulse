const env = require('../config/env');

/** "YYYY-MM" for a date, in the reporting time zone */
function monthKey(date, tz = env.reportingTz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  return `${y}-${m}`;
}

/** The last `count` month keys ending with the current month, oldest first */
function lastMonthKeys(count, now = new Date()) {
  const [y, m] = monthKey(now).split('-').map(Number);
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 15));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** Parse "YYYY-MM-DD" (or any Date-parsable string) into a Date; returns null if invalid */
function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const s = value.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = ymd ? new Date(Date.UTC(+ymd[1], +ymd[2] - 1, +ymd[3], 6, 30)) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = { monthKey, lastMonthKeys, parseDate };

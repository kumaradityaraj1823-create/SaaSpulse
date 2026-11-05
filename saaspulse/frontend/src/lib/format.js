const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');

/** ₹4,30,595 */
export const formatINR = (n) => (n == null || Number.isNaN(n) ? '—' : inr.format(Math.round(n)));

/** ₹4.3L, ₹1.2Cr, ₹950 — Indian short scale for axes and tight spaces */
export function formatINRCompact(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const trim = (v) => v.toFixed(digits).replace(/\.0+$/, '');
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export const formatNumber = (n) => (n == null ? '—' : num.format(n));

export const formatPct = (n, digits = 1) => (n == null || Number.isNaN(n) ? '—' : `${Number(n).toFixed(digits).replace(/\.0$/, '')}%`);

export function formatSignedINR(n) {
  if (n == null) return '—';
  if (n === 0) return formatINR(0);
  return `${n > 0 ? '+' : '−'}${formatINR(Math.abs(n))}`;
}

export function formatDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', opts);
}

export function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d, { day: 'numeric', month: 'short' });
}

export const toInputDate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

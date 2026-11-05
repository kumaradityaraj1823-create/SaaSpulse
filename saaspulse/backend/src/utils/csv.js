/** Minimal RFC 4180 CSV writer */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(','));
  return [header, ...body].join('\n') + '\n';
}

module.exports = { toCsv };

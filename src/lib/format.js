/* Small formatting helpers (no React, no storage). */

export function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return Math.round(b / 1024) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Returns 'pdf' | 'docx' | 'image' | null (unsupported)
export function typeOf(filename) {
  const ext = String(filename).split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (['png', 'jpg', 'jpeg'].indexOf(ext) !== -1) return 'image';
  return null;
}

export function daysUntil(ts) {
  return Math.ceil((ts - Date.now()) / 86400000);
}

// <input type="date"> value ("YYYY-MM-DD") -> end-of-day timestamp
export function endOfDay(dateStr) {
  return new Date(dateStr + 'T23:59:59').getTime();
}

// timestamp -> "YYYY-MM-DD" for <input type="date">
export function toDateInput(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

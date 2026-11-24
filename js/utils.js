// Small shared helpers: safe HTML templating, formatting, icons, query params.

class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Safe(String(s ?? ''));
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Tagged template that HTML-escapes every interpolation unless it is wrapped with raw() / produced by html``.
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      if (v instanceof Safe) out += v.s;
      else if (Array.isArray(v)) out += v.map((x) => (x instanceof Safe ? x.s : esc(x))).join('');
      else if (v === false || v == null) out += '';
      else out += esc(v);
    }
  });
  return new Safe(out);
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function render(el, safe) { el.innerHTML = safe instanceof Safe ? safe.s : esc(safe); }
export const param = (name) => new URLSearchParams(location.search).get(name);
export const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || '');
export function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

export const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const initials = (name) => (String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase();

const DEFAULT_TZ = 'Asia/Kolkata';
const safeTz = (tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch { return DEFAULT_TZ; } };
export function fmtDate(iso, tz = DEFAULT_TZ) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: safeTz(tz) }).format(new Date(iso));
}
export function fmtTime(iso, tz = DEFAULT_TZ) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: safeTz(tz) }).format(new Date(iso));
}
export function fmtDateTime(iso, tz = DEFAULT_TZ) { return iso ? `${fmtDate(iso, tz)}, ${fmtTime(iso, tz)}` : '—'; }
export function fmtWeekday(iso, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: safeTz(tz) }).format(new Date(iso));
}
export function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return fmtDate(iso);
}
export function minutesToLabel(min) {
  const h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}
export const timeLabel = (t) => { const [h, m] = String(t || '00:00').split(':').map(Number); return minutesToLabel(h * 60 + m); };
// yyyy-mm-dd for a Date using local calendar parts (not UTC)
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// "today" in a given IANA timezone as yyyy-mm-dd
export function todayIn(tz = DEFAULT_TZ) { return new Intl.DateTimeFormat('en-CA', { timeZone: safeTz(tz) }).format(new Date()); }
export function addDays(ymdStr, n) { const d = new Date(`${ymdStr}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d); }

const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a7 7 0 0 0-3-5.7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  pool: '<path d="M2 18c2 0 2-1.5 5-1.5S9 18 12 18s2-1.5 5-1.5S19 18 22 18M7 14V6a2 2 0 0 1 4 0M13 14V6a2 2 0 0 1 4 0M7 9h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  map: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
};
export function icon(name, size = 18) {
  return raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`);
}

// Role → landing page after sign-in
export const HOME = { tenant: 'tenant-dashboard.html', manager: 'manager-dashboard.html', admin: 'admin/admin-dashboard.html' };
export const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest control', 'Cleaning', 'Security', 'Other'];
export const PRIORITIES = ['low', 'medium', 'high', 'emergency'];

export function friendlyError(err) {
  const msg = (err && (err.message || err.error_description)) || String(err || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Network problem. Check your connection and try again.';
  if (/JWT expired|invalid.*token/i.test(msg)) return 'Your session has expired. Please sign in again.';
  if (/permission denied|row-level security/i.test(msg)) return "You don't have permission to do that.";
  if (/no_exclusive_overlap|exclusion constraint/i.test(msg)) return 'That slot was just reserved by someone else. Please choose another.';
  return msg || 'Something went wrong.';
}

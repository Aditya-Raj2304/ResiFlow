// Frontend-only "database": seeded demo data kept in localStorage, with the same business rules the
// original SQL enforced (ownership checks, status transitions, booking conflicts, capacity).
// DEMO ONLY: credentials and data live in the browser. Nothing here is secure or shared between users.

const KEY = 'resiflow-demo-v1', SESSION = 'resiflow-session', VERSION = 1;
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('resiflow-demo') : null;
const listeners = new Set();
let memory = null; // fallback if localStorage is unavailable

// ----------------------------------------------------------------- seed data
const id = (a, b) => `${a}0000000-0000-4000-8000-00000000000${b}`;
export const DEMO_ACCOUNTS = [
  { role: 'admin', email: 'admin@resiflow.com', password: 'Admin@123', name: 'Anita Sharma' },
  { role: 'manager', email: 'manager@resiflow.com', password: 'Manager@123', name: 'Rohit Kumar' },
  { role: 'tenant', email: 'tenant@resiflow.com', password: 'Tenant@123', name: 'Priya Singh' },
  { role: 'tenant', email: 'tenant2@resiflow.com', password: 'Tenant@123', name: 'Amit Verma' },
];
function seed() {
  const now = Date.now(), H = 3600e3, iso = (h) => new Date(now + h * H).toISOString();
  const day = (offsetDays, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); d.setHours(h, m, 0, 0); return d; };
  const [admin, mgr, t1, t2] = [id(0, 1), id(0, 2), id(0, 3), id(0, 4)];
  const [p1, p2] = [id(1, 1), id(1, 2)], [pool, gym, hall] = [id(2, 1), id(2, 2), id(2, 3)], [r1, r2, r3] = [id(3, 1), id(3, 2), id(3, 3)];
  const u = (uid, a, phone) => ({ id: uid, full_name: a.name, email: a.email, phone, role: a.role, password: a.password, created_at: iso(-24 * 120) });
  return {
    version: VERSION,
    users: [u(admin, DEMO_ACCOUNTS[0], '+91 98765 43210'), u(mgr, DEMO_ACCOUNTS[1], '+91 98765 43211'), u(t1, DEMO_ACCOUNTS[2], '+91 98765 43212'), u(t2, DEMO_ACCOUNTS[3], '+91 98765 43213')],
    properties: [
      { id: p1, name: 'Lakeview Residency', address_line: '14 Kanke Road', city: 'Ranchi', state: 'Jharkhand', postal_code: '834008', timezone: 'Asia/Kolkata', manager_id: mgr, description: 'Modern apartments near the lake with a rooftop pool, gym and a community hall.', unit_count: 48, year_built: 2019, image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=900', created_at: iso(-9999) },
      { id: p2, name: 'Hillcrest Heights', address_line: '22 Bistupur Main Road', city: 'Jamshedpur', state: 'Jharkhand', postal_code: '831001', timezone: 'Asia/Kolkata', manager_id: mgr, description: 'Quiet low-rise homes with landscaped gardens.', unit_count: 24, year_built: 2016, image_url: 'https://images.unsplash.com/photo-1600494448850-6013c64ba722?auto=format&fit=crop&q=80&w=900', created_at: iso(-9000) },
    ],
    tenancies: [
      { id: id(4, 1), property_id: p1, tenant_id: t1, unit: '5C', start_date: iso(-24 * 120).slice(0, 10), end_date: null, is_active: true },
      { id: id(4, 2), property_id: p1, tenant_id: t2, unit: '7A', start_date: iso(-24 * 60).slice(0, 10), end_date: null, is_active: true },
    ],
    amenities: [
      { id: pool, property_id: p1, name: 'Rooftop Pool', description: 'Infinity pool with city views.', capacity: 6, booking_mode: 'exclusive', slot_duration_minutes: 120, opening_time: '06:00', closing_time: '22:00', is_active: true, booking_rules: 'Max 6 guests. Shower before entering. Children must be accompanied.', image_url: null },
      { id: gym, property_id: p1, name: 'Fitness Studio', description: 'Cardio and free weights.', capacity: 8, booking_mode: 'capacity', slot_duration_minutes: 60, opening_time: '05:00', closing_time: '23:00', is_active: true, booking_rules: 'Up to 8 residents per hour. Wipe down equipment after use.', image_url: null },
      { id: hall, property_id: p1, name: 'Community Hall', description: 'Hall for gatherings of up to 40 guests.', capacity: 40, booking_mode: 'exclusive', slot_duration_minutes: 240, opening_time: '09:00', closing_time: '21:00', is_active: true, booking_rules: 'Book at least a day ahead. Leave the hall clean.', image_url: null },
    ],
    requests: [
      { id: r1, property_id: p1, created_by: t1, assigned_to: null, title: 'Leaking kitchen faucet', description: 'The kitchen faucet drips constantly since last week.', category: 'Plumbing', priority: 'medium', status: 'pending', resolution_notes: null, created_at: iso(-30), updated_at: iso(-30), resolved_at: null },
      { id: r2, property_id: p1, created_by: t1, assigned_to: mgr, title: 'AC not cooling bedroom', description: 'Bedroom AC runs but the room stays warm.', category: 'HVAC', priority: 'high', status: 'in_progress', resolution_notes: null, created_at: iso(-52), updated_at: iso(-20), resolved_at: null },
      { id: r3, property_id: p1, created_by: t2, assigned_to: mgr, title: 'Broken hallway light', description: 'Hallway light on the 7th floor flickers and is now out.', category: 'Electrical', priority: 'low', status: 'completed', resolution_notes: 'Replaced the bulb and the faulty starter.', created_at: iso(-100), updated_at: iso(-70), resolved_at: iso(-70) },
    ],
    history: [
      { id: id(5, 1), request_id: r1, changed_by: t1, old_status: null, new_status: 'pending', note: 'Request submitted.', created_at: iso(-30) },
      { id: id(5, 2), request_id: r2, changed_by: t1, old_status: null, new_status: 'pending', note: 'Request submitted.', created_at: iso(-52) },
      { id: id(5, 3), request_id: r2, changed_by: mgr, old_status: 'pending', new_status: 'in_progress', note: 'Technician visit scheduled for tomorrow.', created_at: iso(-20) },
      { id: id(5, 4), request_id: r3, changed_by: t2, old_status: null, new_status: 'pending', note: 'Request submitted.', created_at: iso(-100) },
      { id: id(5, 5), request_id: r3, changed_by: mgr, old_status: 'pending', new_status: 'in_progress', note: 'Work started.', created_at: iso(-80) },
      { id: id(5, 6), request_id: r3, changed_by: mgr, old_status: 'in_progress', new_status: 'completed', note: 'Completed.', created_at: iso(-70) },
    ],
    attachments: [],
    bookings: [
      { id: id(6, 1), amenity_id: pool, property_id: p1, booked_by: t1, start_at: day(1, 10).toISOString(), end_at: day(1, 12).toISOString(), status: 'confirmed', participants: 4, is_exclusive: true, created_at: iso(-3) },
      { id: id(6, 2), amenity_id: gym, property_id: p1, booked_by: t2, start_at: day(1, 18).toISOString(), end_at: day(1, 19).toISOString(), status: 'confirmed', participants: 3, is_exclusive: false, created_at: iso(-2) },
    ],
    notifications: [
      { id: id(7, 1), user_id: mgr, title: 'New maintenance request', message: 'Leaking kitchen faucet at Lakeview Residency', type: 'maintenance', related_entity_type: 'maintenance_request', related_entity_id: r1, is_read: false, created_at: iso(-30) },
      { id: id(7, 2), user_id: t1, title: 'Request in progress', message: 'AC not cooling bedroom is now being worked on.', type: 'maintenance', related_entity_type: 'maintenance_request', related_entity_id: r2, is_read: false, created_at: iso(-20) },
    ],
  };
}

// --------------------------------------------------------------- persistence
function load() {
  if (memory) return memory;
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s.version === VERSION) return (memory = s); } } catch { /* fall through to seed */ }
  memory = seed(); persist(); return memory;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* storage full/unavailable: stay in memory */ } }
export const db = () => load();
export function commit() { persist(); listeners.forEach((f) => f()); bc?.postMessage('change'); }
bc && (bc.onmessage = () => { memory = null; listeners.forEach((f) => f()); });
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function resetDemo() { memory = seed(); persist(); try { localStorage.removeItem(SESSION); } catch { /* ignore */ } commit(); }

// -------------------------------------------------------------------- session
export function sessionUserId() { try { return localStorage.getItem(SESSION); } catch { return null; } }
export function setSession(uid) { try { uid ? localStorage.setItem(SESSION, uid) : localStorage.removeItem(SESSION); } catch { /* ignore */ } }
export const publicUser = ({ password, ...rest }) => rest;
export function me() { const u = db().users.find((x) => x.id === sessionUserId()); if (!u) throw new Error('Please sign in.'); return u; }

// ------------------------------------------------------------ access ("RLS")
export const isManagerOf = (u, propertyId) => !!db().properties.find((p) => p.id === propertyId && p.manager_id === u.id);
export const isTenantOf = (u, propertyId) => db().tenancies.some((t) => t.property_id === propertyId && t.tenant_id === u.id && t.is_active && (!t.end_date || t.end_date >= new Date().toISOString().slice(0, 10)));
export const canAccessProperty = (u, pid) => u.role === 'admin' || isManagerOf(u, pid) || isTenantOf(u, pid);
export const byId = (list, v) => list.find((x) => x.id === v) || null;
const pick = (u, keys) => (u ? Object.fromEntries(keys.map((k) => [k, u[k]])) : null);
export const person = (uid, keys = ['id', 'full_name', 'email', 'phone']) => pick(byId(db().users, uid), keys);

export function notify(userId, title, message, type, entityType, entityId) {
  db().notifications.unshift({ id: crypto.randomUUID(), user_id: userId, title, message, type, related_entity_type: entityType || null, related_entity_id: entityId || null, is_read: false, created_at: new Date().toISOString() });
}
export const paginate = (rows, page, pageSize) => ({ rows: rows.slice(page * pageSize, page * pageSize + pageSize), total: rows.length });

// ------------------------------------------------------------------ timezone
function offsetMs(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
}
// local wall-clock (date 'yyyy-mm-dd' + minutes after midnight) in tz → UTC ms
export function zonedToUtc(date, minutes, tz) {
  const [y, m, d] = date.split('-').map(Number); const guess = Date.UTC(y, m - 1, d, 0, minutes);
  let t = guess - offsetMs(guess, tz); t = guess - offsetMs(t, tz); return t;
}
export const toMinutes = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };

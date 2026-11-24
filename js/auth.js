// Frontend-only demo authentication against the local store (see store.js). Not secure by design.
import { db, commit, setSession, sessionUserId, publicUser, me } from './store.js';

const PENDING = 'resiflow-reset-email';
export async function signIn(email, password) {
  const u = db().users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!u || u.password !== password) throw new Error('Incorrect email or password.');
  setSession(u.id); return { user: { id: u.id } };
}
// Public registration always creates a tenant.
export async function signUp({ email, password, fullName, phone }) {
  const e = email.trim().toLowerCase();
  if (db().users.some((u) => u.email.toLowerCase() === e)) throw new Error('An account with this email already exists.');
  const u = { id: crypto.randomUUID(), full_name: fullName.trim(), email: e, phone: (phone || '').trim() || null, role: 'tenant', password, created_at: new Date().toISOString() };
  db().users.push(u); commit(); setSession(u.id);
  return { session: { user: { id: u.id } } };
}
export async function signOut() { setSession(null); location.replace('login.html'); }
export async function sendReset(email) {
  const u = db().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (u) { try { sessionStorage.setItem(PENDING, u.id); } catch { /* ignore */ } }
}
export const pendingReset = () => { try { return sessionStorage.getItem(PENDING); } catch { return null; } };
export async function updatePassword(password, userId) {
  const u = db().users.find((x) => x.id === (userId || sessionUserId())); if (!u) throw new Error('No account to update.');
  u.password = password; commit();
}
export async function getSession() { const id = sessionUserId(); return id && db().users.some((u) => u.id === id) ? { user: { id } } : null; }
export async function fetchProfile(userId) {
  const u = db().users.find((x) => x.id === userId); if (!u) throw new Error('Account not found.'); return publicUser(u);
}
export { me };

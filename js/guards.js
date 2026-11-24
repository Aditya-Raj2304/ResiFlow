// Route guards are a UX convenience. Real authorization is enforced by PostgreSQL RLS + RPCs.
import { getSession, fetchProfile } from './auth.js';
import { HOME, html, render } from './utils.js';
import { IS_CONFIGURED } from './config.js';
import { relPath } from './routes.js';

function setupNotice() {
  const root = document.getElementById('app') || document.body;
  render(root, html`<div style="max-width:560px;margin:15vh auto;padding:24px"><div class="alert warn"><b>Supabase isn't configured yet.</b>
    <p class="small" style="margin-top:6px">Open <code>js/config.js</code> and set <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> (see README → Supabase setup).</p></div></div>`);
}

// roles: [] = any signed-in user. Returns { user, profile } or redirects (never resolves on redirect).
export async function requireAuth(roles = []) {
  if (!IS_CONFIGURED) { setupNotice(); return new Promise(() => {}); }
  const session = await getSession();
  if (!session) {
    location.replace(`login.html?next=${encodeURIComponent(relPath())}`);
    return new Promise(() => {});
  }
  let profile;
  try { profile = await fetchProfile(session.user.id); } catch {
    render(document.getElementById('app') || document.body, html`<div class="state"><h3>Couldn't load your account</h3><p>Please sign in again.</p><a class="btn" href="login.html">Sign in</a></div>`);
    return new Promise(() => {});
  }
  if (roles.length && !roles.includes(profile.role)) { location.replace(HOME[profile.role] || 'login.html'); return new Promise(() => {}); }
  return { user: session.user, profile };
}
// For login/signup pages: send already-signed-in users to their dashboard.
export async function redirectIfAuthed() {
  if (!IS_CONFIGURED) return;
  const session = await getSession(); if (!session) return;
  try { const p = await fetchProfile(session.user.id); location.replace(HOME[p.role] || HOME.tenant); } catch { /* stay on page */ }
}

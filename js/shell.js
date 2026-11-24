// App shell: role-based sidebar, topbar (live indicator, notifications bell, theme), mobile drawer.
import { unreadCount } from './data/notifications.js';
import { signOut } from './auth.js';
import { subscribe } from './realtime.js';
import { html, raw, render, $, icon, initials, HOME } from './utils.js';
import { ROUTES, fileOf } from './routes.js';
import { APP_NAME } from './config.js';

// [route key, label, icon, related route keys that keep this item highlighted]
const NAV = {
  tenant: [['home', 'Dashboard', 'home'], ['property', 'My property', 'building'], ['amenities', 'Amenities', 'pool', ['book']],
    ['bookings', 'My bookings', 'calendar'], ['maintenance', 'Maintenance', 'wrench', ['request']], ['createRequest', 'New request', 'plus']],
  manager: [['home', 'Dashboard', 'home'], ['properties', 'Properties', 'building', ['propertyDetail']], ['maintenance', 'Maintenance', 'wrench', ['request']],
    ['amenities', 'Amenities', 'pool'], ['bookings', 'Bookings', 'calendar'], ['schedule', 'Schedule', 'clock'], ['tenants', 'Tenants', 'users']],
  admin: [['home', 'Dashboard', 'home'], ['users', 'Users', 'users'], ['properties', 'Properties', 'building', ['propertyDetail']], ['amenities', 'Amenities', 'pool'],
    ['bookings', 'Bookings', 'calendar'], ['maintenance', 'Maintenance', 'wrench', ['request']], ['reports', 'Reports', 'chart']],
};

function theme() { try { return localStorage.getItem('resiflow-theme') || 'dark'; } catch { return 'dark'; } }
export function applyTheme() { document.documentElement.dataset.theme = theme(); }
applyTheme();

let unreadOff = null;
function refreshUnread(userId) {
  const n = unreadCount(userId);
  document.querySelectorAll('[data-unread]').forEach((el) => { el.textContent = n > 99 ? '99+' : n; el.hidden = n === 0; });
}

// Replaces #app with the shell and returns the #view element for page content.
export function mountShell({ profile, user, active, title }) {
  const current = location.pathname.split('/').pop() || 'index.html';
  const rt = ROUTES[profile.role] || ROUTES.tenant;
  const isActive = (key, rel = []) => [key, ...rel].some((k) => rt[k] && fileOf(rt[k]) === current);
  const links = (NAV[profile.role] || []).map(([key, label, ic, rel]) =>
    html`<a href="${rt[key]}" class="${isActive(key, rel) ? 'active' : ''}" ${isActive(key, rel) ? raw('aria-current="page"') : ''}>${icon(ic)}${label}</a>`);
  render($('#app'), html`
    <div class="shell">
      <aside class="sidebar" id="sidebar" aria-label="Main navigation">
        <a class="brand" href="${HOME[profile.role]}"><span class="brand-mark">${icon('building', 18)}</span>${APP_NAME}</a>
        <nav class="nav">${links}
          <div class="nav-label">Account</div>
          <a href="${rt.notifications}" class="${isActive('notifications') ? 'active' : ''}">${icon('bell')}Notifications<span class="count" data-unread hidden>0</span></a>
          <a href="${rt.profile}" class="${isActive('profile') ? 'active' : ''}">${icon('user')}Profile</a>
        </nav>
        <div class="side-foot"><span class="avatar">${initials(profile.full_name)}</span>
          <div class="who truncate">${profile.full_name || 'Account'}<small>${profile.role}</small></div>
          <button class="icon-btn" id="logout" title="Sign out" aria-label="Sign out" style="background:transparent;border-color:rgba(255,255,255,.15);color:#cbd5e1">${icon('logout')}</button></div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menu" aria-label="Open menu">${icon('menu')}</button>
          <div class="grow"><strong class="truncate" style="font-family:var(--font-head)">${title || ''}</strong></div>
          <span class="small muted row" style="gap:6px" title="Realtime connection"><span class="live-dot off" id="live"></span><span id="live-text" class="xs">Connecting…</span></span>
          <button class="icon-btn" id="theme" aria-label="Toggle dark mode">${icon(theme() === 'dark' ? 'sun' : 'moon')}</button>
          <a class="icon-btn bell" href="${rt.notifications}" aria-label="Notifications">${icon('bell')}<span class="dot" data-unread hidden>0</span></a>
        </header>
        <main class="content" id="view" tabindex="-1"></main>
      </div>
    </div>`);
  const sb = $('#sidebar'), scrim = $('#scrim');
  const toggle = (open) => { sb.classList.toggle('open', open); scrim.classList.toggle('open', open); };
  $('#menu').addEventListener('click', () => toggle(true)); scrim.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  $('#logout').addEventListener('click', signOut);
  $('#theme').addEventListener('click', () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('resiflow-theme', next); } catch { /* storage unavailable: theme just won't persist */ }
    applyTheme(); render($('#theme'), icon(next === 'dark' ? 'sun' : 'moon'));
  });
  window.addEventListener('rt-status', (e) => {
    const ok = e.detail === 'SUBSCRIBED';
    $('#live')?.classList.toggle('off', !ok);
    const t = $('#live-text'); if (t) t.textContent = ok ? 'Live' : e.detail === 'CLOSED' ? 'Offline' : 'Connecting…';
  });
  refreshUnread(user.id);
  unreadOff?.(); unreadOff = subscribe([], () => refreshUnread(user.id));
  return $('#view');
}

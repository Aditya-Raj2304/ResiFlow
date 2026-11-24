// UI building blocks: toasts, dialogs, states, badges, pagination.
import { html, raw, esc, $, icon, titleCase } from './utils.js';

export function toast(message, type = 'info', ms = 4500) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.append(box); }
  const t = document.createElement('div'); t.className = `toast ${type}`; t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.textContent = message; box.append(t); setTimeout(() => t.remove(), ms);
}

// Generic modal. content is a Safe html; returns { el, close }. Esc / backdrop click closes.
export function openDialog({ title, body, footer = '', onClose }) {
  const prev = document.activeElement;
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="dialog-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="dialog-body">${body}</div>${footer ? `<div class="dialog-foot">${footer}</div>` : ''}</div>`;
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey); document.body.append(ov);
  (ov.querySelector('input,select,textarea,button.btn') || ov.querySelector('button'))?.focus();
  return { el: ov, close };
}

// Promise-based confirmation. resolves true / false.
export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let done = false; const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const d = openDialog({
      title, body: `<p>${esc(message)}</p>`, onClose: () => finish(false),
      footer: `<button class="btn secondary" data-close>Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(confirmLabel)}</button>`,
    });
    d.el.querySelector('[data-ok]').addEventListener('click', () => { finish(true); d.close(); });
  });
}

// Run an async action with a busy button; shows an error toast on failure (never fakes success).
export async function withBusy(btn, fn) {
  if (btn?.getAttribute('aria-busy') === 'true') return;
  const label = btn?.innerHTML; if (btn) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${btn.dataset.busy || 'Working…'}`; }
  try { return await fn(); } finally { if (btn) { btn.removeAttribute('aria-busy'); btn.disabled = false; btn.innerHTML = label; } }
}

export const loadingState = (rows = 3) => html`<div class="card-pad" aria-busy="true" aria-label="Loading">${[...Array(rows)].map(() => html`<div class="skeleton sk-line"></div>`)}</div>`;
export const emptyState = ({ title, text = '', action = '', ico = 'clipboard' }) =>
  html`<div class="state"><div class="state-icon">${icon(ico, 24)}</div><h3>${title}</h3><p>${text}</p>${raw(action)}</div>`;
export const errorState = (message, retryLabel = 'Try again') =>
  html`<div class="state" role="alert"><div class="state-icon" style="background:var(--rose-soft);color:var(--rose)">${icon('alert', 24)}</div><h3>Couldn't load this</h3><p>${message}</p><button class="btn secondary" data-retry>${retryLabel}</button></div>`;

export const statusBadge = (s) => html`<span class="badge ${s}">${titleCase(s)}</span>`;
export const priorityBadge = (p) => html`<span class="badge ${p}">${titleCase(p)}</span>`;

// Pagination footer. Buttons carry data-page.
export function pager({ page, pageSize, total }) {
  const pages = Math.max(1, Math.ceil(total / pageSize)); if (total <= pageSize) return html`<div class="pager"><span>${total} result${total === 1 ? '' : 's'}</span></div>`;
  const from = page * pageSize + 1, to = Math.min(total, (page + 1) * pageSize);
  return html`<div class="pager"><span>${from}–${to} of ${total}</span><span class="row">
    <button class="btn secondary sm" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>Previous</button>
    <span class="small">Page ${page + 1} / ${pages}</span>
    <button class="btn secondary sm" data-page="${page + 1}" ${page + 1 >= pages ? 'disabled' : ''}>Next</button></span></div>`;
}

export const pageHead = (title, subtitle = '', actions = '') =>
  html`<div class="page-head"><div><h1>${title}</h1>${subtitle ? html`<p>${subtitle}</p>` : ''}</div><div class="row wrap">${raw(actions)}</div></div>`;

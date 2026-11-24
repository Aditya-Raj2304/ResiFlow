// Page bootstrap helpers shared by every authenticated page.
import { requireAuth } from './guards.js';
import { mountShell } from './shell.js';
import { render, friendlyError } from './utils.js';
import { loadingState, errorState } from './ui.js';
import { setRole } from './routes.js';

// Allowed roles come from <body data-roles="manager,admin"> when present (so one module can serve several PRD pages).
export async function boot({ roles = [], title = '', active } = {}) {
  const attr = document.body.dataset.roles;
  const ctx = await requireAuth(attr ? attr.split(',') : roles);
  setRole(ctx.profile.role);
  const view = mountShell({ ...ctx, active, title });
  return { ...ctx, view };
}
// Show loading → run fn → on failure render an error state with a working Retry. Returns true on success.
export async function load(target, fn, { skeleton = true } = {}) {
  if (skeleton) render(target, loadingState());
  try { await fn(); return true; } catch (e) {
    console.error(e);
    render(target, errorState(friendlyError(e)));
    target.querySelector('[data-retry]')?.addEventListener('click', () => load(target, fn, { skeleton }));
    return false;
  }
}

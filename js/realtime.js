// "Realtime" for the frontend-only demo: changes made in any tab are broadcast to every open tab.
import { onChange } from './store.js';
export function subscribe(_specs, handler, { debounceMs = 150 } = {}) {
  let t; const off = onChange(() => { clearTimeout(t); t = setTimeout(handler, debounceMs); });
  setTimeout(() => window.dispatchEvent(new CustomEvent('rt-status', { detail: 'SUBSCRIBED' })), 50);
  window.addEventListener('pagehide', off, { once: true });
  return () => { clearTimeout(t); off(); };
}

// Client-side validation is a convenience only. The database enforces the real rules.
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
export const isPhone = (v) => !v || /^[+]?[\d\s().-]{7,18}$/.test(String(v).trim());
export function passwordScore(pw) {
  let s = 0; const v = String(pw || '');
  if (v.length >= 8) s++; if (v.length >= 12) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(s, 4);
}
export function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.';
  return '';
}
export function setFieldError(form, name, msg) {
  const input = form.elements[name]; if (!input) return;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  const slot = form.querySelector(`[data-error-for="${name}"]`); if (slot) slot.textContent = msg || '';
}
export function clearErrors(form) { [...form.elements].forEach((el) => el.name && setFieldError(form, el.name, '')); }
// rules: { field: (value, formData) => 'error message' | '' }. Returns true when valid.
export function validateForm(form, rules) {
  clearErrors(form); let ok = true; let first = null;
  for (const [name, rule] of Object.entries(rules)) {
    const el = form.elements[name]; if (!el) continue;
    const msg = rule(typeof el.value === 'string' ? el.value.trim() : el.value, form);
    if (msg) { setFieldError(form, name, msg); ok = false; first = first || el; }
  }
  if (first) first.focus();
  return ok;
}

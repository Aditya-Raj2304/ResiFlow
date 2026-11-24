import { signUp } from "../auth.js";
import { redirectIfAuthed } from "../guards.js";
import {
  isEmail,
  isPhone,
  passwordScore,
  validatePassword,
  validateForm,
} from "../validation.js";
import { withBusy } from "../ui.js";
import { $, HOME } from "../utils.js";
import { IS_CONFIGURED } from "../config.js";
import "../shell.js";

redirectIfAuthed();
const form = $("#signup-form"),
  err = $("#form-error");
if (!IS_CONFIGURED) {
  err.textContent =
    "Supabase is not configured yet. Edit js/config.js (see README).";
  err.hidden = false;
}
const meter = $("#pw-meter i");
const colors = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#16a34a"];
form.elements.password.addEventListener("input", (e) => {
  const s = passwordScore(e.target.value);
  meter.style.width = `${(s / 4) * 100}%`;
  meter.style.background = colors[s];
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  if (
    !validateForm(form, {
      fullName: (v) => (v.length >= 2 ? "" : "Enter your full name."),
      email: (v) => (isEmail(v) ? "" : "Enter a valid email address."),
      phone: (v) => (isPhone(v) ? "" : "Enter a valid phone number."),
      password: (v) => validatePassword(v),
      confirm: (v, f) =>
        v === f.elements.password.value ? "" : "Passwords do not match.",
    })
  )
    return;
  await withBusy($("#submit"), async () => {
    try {
      // No role is sent: every public account is created as a tenant by a database trigger.
      const data = await signUp({
        email: form.elements.email.value,
        password: form.elements.password.value,
        fullName: form.elements.fullName.value,
        phone: form.elements.phone.value,
      });
      if (data.session) {
        location.replace(HOME.tenant);
        return;
      }
      form.hidden = true;
      $("#done").hidden = false;
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
});

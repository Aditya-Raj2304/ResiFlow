import { signIn } from "../auth.js";
import { redirectIfAuthed } from "../guards.js";
import { isEmail } from "../validation.js";
import { validateForm } from "../validation.js";
import { withBusy } from "../ui.js";
import { $, HOME } from "../utils.js";
import { fetchProfile } from "../auth.js";
import { SHOW_DEMO_LOGINS, IS_CONFIGURED } from "../config.js";
import { resetDemo } from "../store.js";
import "../shell.js";

redirectIfAuthed();
const form = $("#login-form"),
  err = $("#form-error");
if (!IS_CONFIGURED) {
  err.textContent =
    "Supabase is not configured yet. Edit js/config.js (see README).";
  err.hidden = false;
}
if (SHOW_DEMO_LOGINS) {
  $("#demo").hidden = false;
  $("#reset-demo").addEventListener("click", () => {
    resetDemo();
    err.textContent = "Demo data reset to defaults.";
    err.hidden = false;
  });
  $("#demo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-email]");
    if (!b) return;
    form.elements.email.value = b.dataset.email;
    form.elements.password.value = b.dataset.password;
  });
}
$("#toggle-pw").addEventListener("click", (e) => {
  const i = form.elements.password;
  const show = i.type === "password";
  i.type = show ? "text" : "password";
  e.target.textContent = show ? "Hide" : "Show";
});
const safeNext = (n) =>
  /^(?:admin\/)?[\w-]+\.html(\?[\w=&%-]*)?$/.test(n || "") ? n : null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  if (
    !validateForm(form, {
      email: (v) => (isEmail(v) ? "" : "Enter a valid email address."),
      password: (v) => (v ? "" : "Enter your password."),
    })
  )
    return;
  await withBusy($("#submit"), async () => {
    try {
      const { user } = await signIn(
        form.elements.email.value,
        form.elements.password.value,
      );
      const profile = await fetchProfile(user.id);
      const next = safeNext(new URLSearchParams(location.search).get("next"));
      location.replace(next || HOME[profile.role] || HOME.tenant);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
});

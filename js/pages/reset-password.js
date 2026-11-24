// Demo flow: no email is sent. forgot-password.html remembers the account, this page sets the new password.
import { pendingReset, updatePassword } from "../auth.js";
import { validatePassword, validateForm } from "../validation.js";
import { withBusy } from "../ui.js";
import { $ } from "../utils.js";
import "../shell.js";

const form = $("#form"),
  err = $("#form-error"),
  wait = $("#waiting");
const uid = pendingReset();
if (uid) {
  wait.hidden = true;
  form.hidden = false;
} else
  wait.innerHTML =
    '<div class="alert error">No reset in progress. <a href="forgot-password.html">Start again</a>.</div>';
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  if (
    !validateForm(form, {
      password: (v) => validatePassword(v),
      confirm: (v, f) =>
        v === f.elements.password.value ? "" : "Passwords do not match.",
    })
  )
    return;
  await withBusy($("#submit"), async () => {
    try {
      await updatePassword(form.elements.password.value, uid);
      try {
        sessionStorage.removeItem("resiflow-reset-email");
      } catch {
        /* ignore */
      }
      form.hidden = true;
      $("#done").hidden = false;
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
});

import { sendReset } from "../auth.js";
import { isEmail, validateForm } from "../validation.js";
import { withBusy } from "../ui.js";
import { $ } from "../utils.js";
import "../shell.js";

const form = $("#form"),
  err = $("#form-error");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  if (
    !validateForm(form, {
      email: (v) => (isEmail(v) ? "" : "Enter a valid email address."),
    })
  )
    return;
  await withBusy($("#submit"), async () => {
    try {
      await sendReset(form.elements.email.value);
      form.hidden = true;
      $("#done").hidden = false;
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
});

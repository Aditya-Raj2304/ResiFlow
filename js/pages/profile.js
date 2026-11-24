import { boot } from "../page.js";
import { updateMyProfile } from "../data/profiles.js";
import { updatePassword } from "../auth.js";
import { isPhone, validatePassword, validateForm } from "../validation.js";
import {
  html,
  render,
  $,
  titleCase,
  fmtDate,
  friendlyError,
} from "../utils.js";
import { pageHead, toast, withBusy } from "../ui.js";
import { personCell } from "../views.js";

const { profile, user, view } = await boot({ roles: [], title: "Profile" });
render(
  view,
  html`${pageHead("Profile", "Manage your personal details")}
    <div class="grid cols-2" style="align-items:start">
      <form id="pf" class="card card-pad stack" novalidate>
        <h2>Personal details</h2>
        <div class="field">
          <label for="fullName">Full name</label
          ><input
            class="input"
            id="fullName"
            name="fullName"
            value="${profile.full_name}"
          />
          <div class="field-error" data-error-for="fullName"></div>
        </div>
        <div class="field">
          <label for="email">Email</label
          ><input
            class="input"
            id="email"
            value="${profile.email}"
            disabled
          /><span class="hint">Email can't be changed here.</span>
        </div>
        <div class="field">
          <label for="phone">Phone</label
          ><input
            class="input"
            id="phone"
            name="phone"
            value="${profile.phone || ""}"
            placeholder="+91 98765 43210"
          />
          <div class="field-error" data-error-for="phone"></div>
        </div>
        <div class="field">
          <span class="label">Role</span>
          <div>
            <span class="badge plain">${titleCase(profile.role)}</span>
            <span class="xs muted">Roles are managed by an administrator.</span>
          </div>
        </div>
        <button class="btn" data-busy="Saving…">Save changes</button>
      </form>
      <form id="pw" class="card card-pad stack" novalidate>
        <h2>Change password</h2>
        <div class="field">
          <label for="password">New password</label
          ><input
            class="input"
            type="password"
            id="password"
            name="password"
            autocomplete="new-password"
          />
          <div class="field-error" data-error-for="password"></div>
        </div>
        <div class="field">
          <label for="confirm">Confirm password</label
          ><input
            class="input"
            type="password"
            id="confirm"
            name="confirm"
            autocomplete="new-password"
          />
          <div class="field-error" data-error-for="confirm"></div>
        </div>
        <button class="btn secondary" data-busy="Updating…">
          Update password
        </button>
        <p class="xs muted">Member since ${fmtDate(profile.created_at)}</p>
      </form>
    </div>`,
);
$("#pf").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  if (
    !validateForm(f, {
      fullName: (v) => (v.length >= 2 ? "" : "Enter your name."),
      phone: (v) => (isPhone(v) ? "" : "Enter a valid phone number."),
    })
  )
    return;
  await withBusy(f.querySelector("button"), async () => {
    try {
      await updateMyProfile(user.id, {
        full_name: f.elements.fullName.value,
        phone: f.elements.phone.value,
      });
      toast("Profile saved.", "success");
    } catch (ex) {
      toast(friendlyError(ex), "error");
    }
  });
});
$("#pw").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  if (
    !validateForm(f, {
      password: validatePassword,
      confirm: (v, fm) =>
        v === fm.elements.password.value ? "" : "Passwords do not match.",
    })
  )
    return;
  await withBusy(f.querySelector("button"), async () => {
    try {
      await updatePassword(f.elements.password.value);
      f.reset();
      toast("Password updated.", "success");
    } catch (ex) {
      toast(friendlyError(ex), "error");
    }
  });
});

import { boot, load } from "../page.js";
import { listUsers, changeRole } from "../data/profiles.js";
import {
  html,
  raw,
  render,
  $,
  debounce,
  titleCase,
  fmtDate,
  friendlyError,
} from "../utils.js";
import {
  pageHead,
  emptyState,
  pager,
  openDialog,
  toast,
  withBusy,
} from "../ui.js";
import { personCell } from "../views.js";

const { user, view } = await boot({ roles: ["admin"], title: "Users" });
const f = { search: "", role: "" };
let page = 0,
  rows = [];
render(
  view,
  html`${pageHead("Users", "Accounts and roles")}
    <div class="alert info small" style="margin-bottom:16px">
      New users register themselves as tenants. To create a manager or admin,
      ask them to sign up, then change their role here. Roles are enforced by
      the database.
    </div>
    <div class="toolbar">
      <input
        class="input search"
        id="search"
        type="search"
        placeholder="Search name or email…"
        aria-label="Search"
      /><select class="input" id="role" aria-label="Role">
        <option value="">All roles</option>
        ${["tenant", "manager", "admin"].map(
          (r) => html`<option value="${r}">${titleCase(r)}</option>`,
        )}
      </select>
    </div>
    <section class="card" id="list"></section>`,
);
async function draw() {
  const res = await listUsers({ ...f, page });
  rows = res.rows;
  render(
    $("#list"),
    res.rows.length
      ? html`<div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${res.rows.map(
                  (u) =>
                    html`<tr>
                      <td>
                        ${personCell(u.full_name || "(no name)", u.email)}
                      </td>
                      <td>${u.phone || "—"}</td>
                      <td>
                        <span class="badge plain">${titleCase(u.role)}</span>
                      </td>
                      <td>${fmtDate(u.created_at)}</td>
                      <td style="text-align:right">
                        ${u.id === user.id
                          ? html`<span class="xs muted">You</span>`
                          : html`<button
                              class="btn secondary sm"
                              data-role="${u.id}"
                            >
                              Change role
                            </button>`}
                      </td>
                    </tr>`,
                )}
              </tbody>
            </table>
          </div>
          ${pager({ page, pageSize: 10, total: res.total })}`
      : emptyState({
          title: "No users found",
          text: "Try a different search or role filter.",
          ico: "users",
        }),
  );
}
const refresh = (s = true) => load($("#list"), draw, { skeleton: s });
$("#search").addEventListener(
  "input",
  debounce((e) => {
    f.search = e.target.value.trim();
    page = 0;
    refresh();
  }, 300),
);
$("#role").addEventListener("change", (e) => {
  f.role = e.target.value;
  page = 0;
  refresh();
});
view.addEventListener("click", (e) => {
  const p = e.target.closest("[data-page]");
  if (p) {
    page = Number(p.dataset.page);
    return refresh();
  }
  const b = e.target.closest("[data-role]");
  if (!b) return;
  const u = rows.find((x) => x.id === b.dataset.role);
  const d = openDialog({
    title: `Change role — ${u.full_name || u.email}`,
    body: `<div class="field"><label for="nr">New role</label><select class="input" id="nr">${["tenant", "manager", "admin"].map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${titleCase(r)}</option>`).join("")}</select></div><p class="small muted" style="margin-top:10px">Managers can be assigned to properties; admins have full access.</p>`,
    footer:
      '<button class="btn secondary" data-close>Cancel</button><button class="btn" id="ok" data-busy="Saving…">Update role</button>',
  });
  $("#ok", d.el).addEventListener("click", (ev) =>
    withBusy(ev.currentTarget, async () => {
      try {
        await changeRole(u.id, $("#nr", d.el).value);
        toast("Role updated.", "success");
        d.close();
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    }),
  );
});
await refresh();

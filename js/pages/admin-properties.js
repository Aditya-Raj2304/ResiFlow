import { boot, load } from "../page.js";
import {
  listProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  listAllTenancies,
  associateTenant,
  removeTenant,
} from "../data/properties.js";
import { listManagers, listUsers } from "../data/profiles.js";
import { html, raw, render, $, friendlyError, todayIn } from "../utils.js";
import {
  pageHead,
  emptyState,
  openDialog,
  confirmDialog,
  toast,
  withBusy,
} from "../ui.js";
import { validateForm } from "../validation.js";
import { R } from "../routes.js";
import { propertyCard, personCell } from "../views.js";

const { view } = await boot({ roles: ["admin"], title: "Properties" });
let props = [],
  managers = [],
  links = [];
const TZ = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

function propertyDialog(p) {
  const v = p || { timezone: "Asia/Kolkata", unit_count: 1 };
  const fld = (n, l, extra = "") =>
    html`<div class="field">
      <label for="${n}">${l}</label
      ><input
        class="input"
        id="${n}"
        name="${n}"
        value="${v[n] ?? ""}"
        ${raw(extra)}
      />
      <div class="field-error" data-error-for="${n}"></div>
    </div>`;
  const d = openDialog({
    title: p ? `Edit ${p.name}` : "Add property",
    footer:
      '<button class="btn secondary" data-close>Cancel</button><button class="btn" id="save" data-busy="Saving…">Save</button>',
    body: html`<form id="pf" class="form-grid" novalidate>
      <div class="full">${fld("name", "Property name")}</div>
      <div class="full">${fld("address_line", "Address")}</div>
      ${fld("city", "City")}${fld("state", "State")}${fld(
        "postal_code",
        "Postal code",
      )}
      <div class="field">
        <label for="timezone">Timezone</label
        ><select class="input" id="timezone" name="timezone">
          ${TZ.map(
            (z) =>
              html`<option ${z === v.timezone ? raw("selected") : ""}>
                ${z}
              </option>`,
          )}
        </select>
      </div>
      ${fld("unit_count", "Units", 'type="number" min="1"')}${fld(
        "year_built",
        "Year built",
        'type="number" min="1800" max="2200"',
      )}
      <div class="field full">
        <label for="manager_id">Manager</label
        ><select class="input" id="manager_id" name="manager_id">
          <option value="">Unassigned</option>
          ${managers.map(
            (m) =>
              html`<option
                value="${m.id}"
                ${m.id === v.manager_id ? raw("selected") : ""}
              >
                ${m.full_name || m.email}
              </option>`,
          )}
        </select>
      </div>
      <div class="field full">
        <label for="image_url">Image URL (optional)</label
        ><input
          class="input"
          id="image_url"
          name="image_url"
          type="url"
          value="${v.image_url || ""}"
        />
      </div>
      <div class="field full">
        <label for="description">Description</label
        ><textarea
          class="input"
          id="description"
          name="description"
          style="min-height:70px"
        >
${v.description || ""}</textarea
        >
      </div>
    </form>`.toString(),
  });
  const f = $("#pf", d.el);
  $("#save", d.el).addEventListener("click", (e) => {
    const req = (m) => (x) => (x ? "" : m);
    if (
      !validateForm(f, {
        name: req("Name is required."),
        address_line: req("Address is required."),
        city: req("City is required."),
        state: req("State is required."),
        postal_code: req("Postal code is required."),
        unit_count: (x) => (Number(x) >= 1 ? "" : "At least 1 unit."),
      })
    )
      return;
    withBusy(e.currentTarget, async () => {
      try {
        const vals = Object.fromEntries(new FormData(f));
        if (p) await updateProperty(p.id, vals);
        else await createProperty(vals);
        toast("Property saved.", "success");
        d.close();
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    });
  });
}
async function tenantsDialog(p) {
  const mine = () => links.filter((l) => l.property_id === p.id);
  const { rows: tenants } = await listUsers({ role: "tenant", pageSize: 200 });
  const d = openDialog({
    title: `Tenants — ${p.name}`,
    body: '<div id="tl"></div>',
  });
  const paint = () =>
    render(
      $("#tl", d.el),
      html`<div class="field">
          <label>Link a tenant</label>
          <div class="row wrap">
            <select class="input" id="tsel" style="flex:2;min-width:160px">
              <option value="">Choose tenant…</option>
              ${tenants.map(
                (t) =>
                  html`<option value="${t.id}">
                    ${t.full_name || t.email}
                  </option>`,
              )}</select
            ><input
              class="input"
              id="unit"
              placeholder="Unit"
              style="flex:1;min-width:80px"
            /><button class="btn" id="link" data-busy="Linking…">Link</button>
          </div>
          <span class="hint"
            >Linking moves the tenant from any previous property.</span
          >
        </div>
        <div style="margin-top:16px">
          ${mine().length
            ? mine().map(
                (l) =>
                  html`<div
                    class="list-item"
                    style="padding-left:0;padding-right:0"
                  >
                    ${personCell(l.tenant?.full_name, l.tenant?.email)}<span
                      class="badge plain"
                      style="margin-left:auto"
                      >Unit ${l.unit || "—"}</span
                    ><button class="btn secondary sm" data-unlink="${l.id}">
                      Remove
                    </button>
                  </div>`,
              )
            : html`<p class="muted small">No tenants linked yet.</p>`}
        </div>`,
    );
  paint();
  d.el.addEventListener("click", async (e) => {
    const reload = async () => {
      links = await listAllTenancies();
      paint();
      await refresh(false);
    };
    if (e.target.closest("#link")) {
      const t = $("#tsel", d.el).value;
      if (!t) return toast("Choose a tenant first.", "error");
      await withBusy(e.target.closest("#link"), async () => {
        try {
          await associateTenant(
            p.id,
            t,
            $("#unit", d.el).value,
            todayIn(p.timezone),
          );
          toast("Tenant linked.", "success");
          await reload();
        } catch (ex) {
          toast(friendlyError(ex), "error");
        }
      });
    }
    const u = e.target.closest("[data-unlink]");
    if (u) {
      try {
        await removeTenant(u.dataset.unlink);
        toast("Tenant removed.", "success");
        await reload();
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    }
  });
}
async function draw() {
  [props, managers, links] = await Promise.all([
    listProperties(),
    listManagers(),
    listAllTenancies(),
  ]);
  render(
    view,
    html`${pageHead(
      "Properties",
      "Manage properties, managers and tenants",
      '<button class="btn" id="add">Add property</button>',
    )}
    ${props.length
      ? html`<div class="grid cols-3">
          ${props.map(
            (p) =>
              html`<div class="stack-sm">
                ${propertyCard(p, `${R("propertyDetail")}?id=${p.id}`)}
                <div class="row">
                  <span class="small muted grow"
                    >${links.filter((l) => l.property_id === p.id).length}
                    tenants</span
                  ><button class="btn secondary sm" data-tenants="${p.id}">
                    Tenants</button
                  ><button class="btn secondary sm" data-edit="${p.id}">
                    Edit</button
                  ><button
                    class="btn ghost sm"
                    data-del="${p.id}"
                    style="color:var(--rose)"
                  >
                    Delete
                  </button>
                </div>
              </div>`,
          )}
        </div>`
      : html`<div class="card">
          ${emptyState({
            title: "No properties yet",
            text: "Add your first property to get started.",
            action: '<button class="btn" id="add2">Add property</button>',
            ico: "building",
          })}
        </div>`}`,
  );
}
const refresh = (s = true) => load(view, draw, { skeleton: s });
view.addEventListener("click", async (e) => {
  if (e.target.closest("#add, #add2")) return propertyDialog(null);
  const ed = e.target.closest("[data-edit]");
  if (ed) return propertyDialog(props.find((p) => p.id === ed.dataset.edit));
  const tn = e.target.closest("[data-tenants]");
  if (tn) return tenantsDialog(props.find((p) => p.id === tn.dataset.tenants));
  const del = e.target.closest("[data-del]");
  if (del) {
    const p = props.find((x) => x.id === del.dataset.del);
    if (
      await confirmDialog({
        title: `Delete ${p.name}?`,
        message:
          "This permanently removes the property and ALL its amenities, bookings, requests and tenant links.",
        confirmLabel: "Delete property",
        danger: true,
      })
    ) {
      try {
        await deleteProperty(p.id);
        toast("Property deleted.", "success");
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    }
  }
});
await refresh();

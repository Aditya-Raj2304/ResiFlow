// Managers create/edit/toggle amenities of their properties; admins can edit/toggle any (RLS enforced).
import { boot, load } from "../page.js";
import {
  listAmenities,
  createAmenity,
  updateAmenity,
  setAmenityActive,
} from "../data/amenities.js";
import { listProperties } from "../data/properties.js";
import { subscribe } from "../realtime.js";
import {
  html,
  raw,
  render,
  $,
  icon,
  timeLabel,
  friendlyError,
} from "../utils.js";
import { pageHead, emptyState, openDialog, toast, withBusy } from "../ui.js";
import { validateForm } from "../validation.js";

const { profile, view } = await boot({
  roles: ["manager", "admin"],
  title: "Amenities",
});
const isManager = profile.role === "manager";
let props = [],
  list = [];

function formDialog(a) {
  const edit = !!a;
  const v = a || {
    booking_mode: "exclusive",
    slot_duration_minutes: 60,
    capacity: 1,
    opening_time: "08:00",
    closing_time: "22:00",
    is_active: true,
  };
  const body = html`<form id="af" class="form-grid" novalidate>
    ${!edit
      ? html`<div class="field full">
          <label for="property">Property</label
          ><select class="input" id="property" name="property">
            ${props.map(
              (p) => html`<option value="${p.id}">${p.name}</option>`,
            )}
          </select>
        </div>`
      : ""}
    <div class="field full">
      <label for="name">Name</label
      ><input class="input" id="name" name="name" value="${v.name || ""}" />
      <div class="field-error" data-error-for="name"></div>
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
    <div class="field">
      <label for="booking_mode">Booking mode</label
      ><select class="input" id="booking_mode" name="booking_mode">
        <option
          value="exclusive"
          ${v.booking_mode === "exclusive" ? raw("selected") : ""}
        >
          Exclusive (one booking per slot)
        </option>
        <option
          value="capacity"
          ${v.booking_mode === "capacity" ? raw("selected") : ""}
        >
          Shared (capacity per slot)
        </option>
      </select>
    </div>
    <div class="field">
      <label for="capacity">Capacity</label
      ><input
        class="input"
        id="capacity"
        name="capacity"
        type="number"
        min="1"
        value="${v.capacity}"
      />
      <div class="field-error" data-error-for="capacity"></div>
    </div>
    <div class="field">
      <label for="slot_duration_minutes">Slot length (minutes)</label
      ><input
        class="input"
        id="slot_duration_minutes"
        name="slot_duration_minutes"
        type="number"
        min="15"
        max="720"
        step="15"
        value="${v.slot_duration_minutes}"
      />
      <div class="field-error" data-error-for="slot_duration_minutes"></div>
    </div>
    <div class="field">
      <label>&nbsp;</label
      ><label class="check"
        ><span class="switch"
          ><input
            type="checkbox"
            name="is_active"
            ${v.is_active ? raw("checked") : ""} /><span></span
        ></span>
        Active</label
      >
    </div>
    <div class="field">
      <label for="opening_time">Opens</label
      ><input
        class="input"
        id="opening_time"
        name="opening_time"
        type="time"
        value="${String(v.opening_time).slice(0, 5)}"
      />
    </div>
    <div class="field">
      <label for="closing_time">Closes</label
      ><input
        class="input"
        id="closing_time"
        name="closing_time"
        type="time"
        value="${String(v.closing_time).slice(0, 5)}"
      />
      <div class="field-error" data-error-for="closing_time"></div>
    </div>
    <div class="field full">
      <label for="booking_rules">Booking rules</label
      ><textarea
        class="input"
        id="booking_rules"
        name="booking_rules"
        style="min-height:70px"
      >
${v.booking_rules || ""}</textarea
      >
    </div>
  </form>`;
  const d = openDialog({
    title: edit ? `Edit ${a.name}` : "Add amenity",
    body: body.toString(),
    footer:
      '<button class="btn secondary" data-close>Cancel</button><button class="btn" id="save" data-busy="Saving…">Save</button>',
  });
  const f = $("#af", d.el);
  $("#save", d.el).addEventListener("click", async (e) => {
    const ok = validateForm(f, {
      name: (x) => (x ? "" : "Name is required."),
      capacity: (x) => (Number(x) >= 1 ? "" : "Capacity must be at least 1."),
      slot_duration_minutes: (x) =>
        Number(x) >= 15 && Number(x) <= 720
          ? ""
          : "Between 15 and 720 minutes.",
      closing_time: (x, fm) =>
        x > fm.elements.opening_time.value
          ? ""
          : "Closing time must be after opening time.",
    });
    if (!ok) return;
    const vals = Object.fromEntries(new FormData(f));
    vals.is_active = f.elements.is_active.checked;
    await withBusy(e.currentTarget, async () => {
      try {
        if (edit) await updateAmenity(a.id, vals);
        else await createAmenity(vals.property, vals);
        toast("Amenity saved.", "success");
        d.close();
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    });
  });
}
async function draw() {
  [props, list] = await Promise.all([listProperties(), listAmenities()]);
  render(
    view,
    html`${pageHead(
      "Amenities",
      isManager
        ? "Manage bookable facilities"
        : "All amenities across properties",
      isManager && props.length
        ? '<button class="btn" id="add">Add amenity</button>'
        : "",
    )}
    ${list.length
      ? html`<div class="grid cols-3">
          ${list.map(
            (a) =>
              html`<article class="card card-pad stack-sm">
                <div class="row between">
                  <h3>${a.name}</h3>
                  <label class="switch" title="Toggle active"
                    ><input
                      type="checkbox"
                      data-toggle="${a.id}"
                      ${a.is_active ? raw("checked") : ""}
                      aria-label="Active" /><span></span
                  ></label>
                </div>
                <div class="xs muted">${a.property?.name}</div>
                <p class="small muted">${a.description}</p>
                <div class="small">
                  ${icon("clock", 14)} ${timeLabel(a.opening_time)} –
                  ${timeLabel(a.closing_time)} · ${a.slot_duration_minutes} min
                </div>
                <div class="small muted">
                  ${a.booking_mode === "exclusive" ? "Exclusive" : "Shared"} ·
                  capacity ${a.capacity}
                </div>
                <div class="row" style="margin-top:auto">
                  <span class="badge ${a.is_active ? "active" : "inactive"}"
                    >${a.is_active ? "Active" : "Inactive"}</span
                  ><button
                    class="btn secondary sm"
                    style="margin-left:auto"
                    data-edit="${a.id}"
                  >
                    Edit
                  </button>
                </div>
              </article>`,
          )}
        </div>`
      : html`<div class="card">
          ${emptyState({
            title: "No amenities yet",
            text: isManager
              ? "Add the first amenity residents can book."
              : "Managers add amenities to their properties.",
            action: isManager && props.length ? "" : "",
            ico: "pool",
          })}
        </div>`}`,
  );
}
const refresh = (skeleton = true) => load(view, draw, { skeleton });
view.addEventListener("click", (e) => {
  if (e.target.closest("#add")) return formDialog(null);
  const ed = e.target.closest("[data-edit]");
  if (ed) formDialog(list.find((a) => a.id === ed.dataset.edit));
});
view.addEventListener("change", async (e) => {
  const t = e.target.closest("[data-toggle]");
  if (!t) return;
  t.disabled = true;
  try {
    await setAmenityActive(t.dataset.toggle, t.checked);
    toast(t.checked ? "Amenity activated." : "Amenity deactivated.", "success");
    await refresh(false);
  } catch (ex) {
    t.checked = !t.checked;
    t.disabled = false;
    toast(friendlyError(ex), "error");
  }
});
await refresh();
subscribe([{ table: "amenities" }], () => refresh(false));

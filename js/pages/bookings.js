// Manager / admin booking management. RLS limits managers to their own properties.
import { boot, load } from "../page.js";
import {
  listBookings,
  cancelBooking,
  checkIn,
  checkOut,
} from "../data/bookings.js";
import { listProperties } from "../data/properties.js";
import { subscribe } from "../realtime.js";
import { html, render, $, titleCase, friendlyError } from "../utils.js";
import {
  pageHead,
  emptyState,
  confirmDialog,
  toast,
  withBusy,
  pager,
} from "../ui.js";
import { bookingRow } from "../views.js";

const { profile, view } = await boot({
  roles: ["manager", "admin"],
  title: "Bookings",
});
const f = { status: "", propertyId: "", date: "" };
let page = 0,
  props = [];
try {
  props = await listProperties();
} catch {
  /* property filter hidden */
}
const actions = (b) =>
  [
    b.status === "confirmed" &&
    Date.now() < new Date(b.end_at) &&
    Date.now() >= new Date(b.start_at) - 15 * 60000
      ? `<button class="btn sm" data-in="${b.id}">Check in</button>`
      : "",
    b.status === "checked_in"
      ? `<button class="btn sm secondary" data-out="${b.id}">Check out</button>`
      : "",
    ["confirmed", "checked_in"].includes(b.status)
      ? `<button class="btn sm secondary" data-cancel="${b.id}">Cancel</button>`
      : "",
  ].join("");
render(
  view,
  html`${pageHead(
      "Bookings",
      profile.role === "manager"
        ? "Reservations at your properties"
        : "All reservations",
    )}
    <div class="toolbar">
      <select class="input" id="status" aria-label="Status">
        <option value="">All statuses</option>
        ${["confirmed", "checked_in", "completed", "cancelled"].map(
          (s) => html`<option value="${s}">${titleCase(s)}</option>`,
        )}
      </select>
      ${props.length > 1
        ? html`<select class="input" id="propertyId" aria-label="Property">
            <option value="">All properties</option>
            ${props.map(
              (p) => html`<option value="${p.id}">${p.name}</option>`,
            )}
          </select>`
        : ""}
      <input class="input" type="date" id="date" aria-label="Date" /><button
        class="btn ghost sm"
        id="clear"
        hidden
      >
        Clear filters
      </button>
    </div>
    <section class="card" id="list"></section>`,
);
async function draw() {
  const q = { status: f.status, propertyId: f.propertyId, page, order: "desc" };
  if (f.date) {
    q.from = new Date(`${f.date}T00:00:00+05:30`).toISOString();
    q.to = new Date(
      new Date(`${f.date}T00:00:00+05:30`).getTime() + 86400000,
    ).toISOString();
  }
  const res = await listBookings(q);
  const has = Object.values(f).some(Boolean);
  render(
    $("#list"),
    html`${res.rows.length
      ? res.rows.map((b) =>
          bookingRow(b, { showUser: true, actions: actions(b) }),
        )
      : emptyState({
          title: has ? "No matching bookings" : "No bookings yet",
          text: has
            ? "Try changing your filters."
            : "Bookings appear here as tenants reserve amenities.",
          action: has
            ? '<button class="btn secondary" data-clear>Clear filters</button>'
            : "",
          ico: "calendar",
        })}${pager({ page, pageSize: 10, total: res.total })}`,
  );
  $("#clear").hidden = !has;
}
const refresh = (s = true) => load($("#list"), draw, { skeleton: s });
["status", "propertyId", "date"].forEach((k) =>
  $(`#${k}`)?.addEventListener("change", (e) => {
    f[k] = e.target.value;
    page = 0;
    refresh();
  }),
);
view.addEventListener("click", async (e) => {
  if (e.target.closest("#clear, [data-clear]")) {
    Object.keys(f).forEach((k) => {
      f[k] = "";
      const el = $(`#${k}`);
      if (el) el.value = "";
    });
    page = 0;
    return refresh();
  }
  const p = e.target.closest("[data-page]");
  if (p) {
    page = Number(p.dataset.page);
    return refresh();
  }
  const act = (btn, fn, ok) =>
    withBusy(btn, async () => {
      try {
        await fn();
        toast(ok, "success");
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    });
  const c = e.target.closest("[data-cancel]");
  if (c) {
    if (
      await confirmDialog({
        title: "Cancel this booking?",
        message: "The tenant will be notified and the slot freed.",
        confirmLabel: "Cancel booking",
        danger: true,
      })
    )
      act(c, () => cancelBooking(c.dataset.cancel), "Booking cancelled.");
    return;
  }
  const i = e.target.closest("[data-in]");
  if (i) return act(i, () => checkIn(i.dataset.in), "Checked in.");
  const o = e.target.closest("[data-out]");
  if (o) return act(o, () => checkOut(o.dataset.out), "Checked out.");
});
await refresh();
subscribe([{ table: "amenity_bookings" }], () => refresh(false));

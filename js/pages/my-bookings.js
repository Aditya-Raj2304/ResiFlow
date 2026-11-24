import { boot, load } from "../page.js";
import {
  listBookings,
  cancelBooking,
  checkIn,
  checkOut,
} from "../data/bookings.js";
import { subscribe } from "../realtime.js";
import { html, raw, render, $, friendlyError } from "../utils.js";
import {
  pageHead,
  emptyState,
  confirmDialog,
  toast,
  withBusy,
  pager,
  loadingState,
} from "../ui.js";
import { bookingRow } from "../views.js";

const { user, view } = await boot({ roles: ["tenant"], title: "My bookings" });
let tab = "upcoming",
  page = 0;
const canCheckIn = (b) =>
  b.status === "confirmed" &&
  Date.now() >= new Date(b.start_at) - 15 * 60000 &&
  Date.now() < new Date(b.end_at);
const actions = (b) =>
  [
    canCheckIn(b)
      ? `<button class="btn sm" data-in="${b.id}">Check in</button>`
      : "",
    b.status === "checked_in"
      ? `<button class="btn sm secondary" data-out="${b.id}">Check out</button>`
      : "",
    b.status === "confirmed" && new Date(b.start_at) > new Date()
      ? `<button class="btn sm secondary" data-cancel="${b.id}">Cancel</button>`
      : "",
  ].join("");

async function draw() {
  const res = await listBookings({
    userId: user.id,
    upcomingOnly: tab === "upcoming",
    pastOnly: tab === "history",
    order: tab === "upcoming" ? "asc" : "desc",
    page,
  });
  render(
    $("#list"),
    html`${res.rows.length
      ? res.rows.map((b) => bookingRow(b, { actions: actions(b) }))
      : emptyState({
          title:
            tab === "upcoming" ? "No upcoming bookings" : "No booking history",
          text:
            tab === "upcoming"
              ? "Reserve an amenity to see it here."
              : "Completed and cancelled bookings appear here.",
          action:
            tab === "upcoming"
              ? '<a class="btn" href="amenities.html">Browse amenities</a>'
              : "",
          ico: "calendar",
        })}${pager({ page, pageSize: 10, total: res.total })}`,
  );
}
render(
  view,
  html`${pageHead(
      "My bookings",
      "Your amenity reservations",
      '<a class="btn" href="amenities.html">New booking</a>',
    )}
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button role="tab" data-tab="upcoming" aria-selected="true">
          Upcoming</button
        ><button role="tab" data-tab="history" aria-selected="false">
          History
        </button>
      </div>
    </div>
    <section class="card" id="list"></section>`,
);
const refresh = (skeleton = true) => load($("#list"), draw, { skeleton });
view.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-tab]");
  if (t) {
    tab = t.dataset.tab;
    page = 0;
    view
      .querySelectorAll("[data-tab]")
      .forEach((b) => b.setAttribute("aria-selected", b === t));
    return refresh();
  }
  const p = e.target.closest("[data-page]");
  if (p) {
    page = Number(p.dataset.page);
    return refresh();
  }
  const doAct = async (btn, fn, ok) =>
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
        title: "Cancel booking?",
        message: "This frees the slot for others.",
        confirmLabel: "Cancel booking",
        danger: true,
      })
    )
      doAct(c, () => cancelBooking(c.dataset.cancel), "Booking cancelled.");
    return;
  }
  const i = e.target.closest("[data-in]");
  if (i) return doAct(i, () => checkIn(i.dataset.in), "Checked in.");
  const o = e.target.closest("[data-out]");
  if (o) return doAct(o, () => checkOut(o.dataset.out), "Checked out.");
});
await refresh();
subscribe([{ table: "amenity_bookings" }], () => refresh(false));

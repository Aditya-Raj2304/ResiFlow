import { boot, load } from "../page.js";
import { countByStatus, listRequests } from "../data/maintenance.js";
import { listBookings } from "../data/bookings.js";
import { listProperties } from "../data/properties.js";
import { subscribe } from "../realtime.js";
import { html, render, todayIn, addDays } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { R } from "../routes.js";
import { statCard, requestRow, bookingRow } from "../views.js";

const { profile, view } = await boot({
  roles: ["manager"],
  title: "Dashboard",
});
async function draw() {
  const props = await listProperties();
  const tz = props[0]?.timezone || "Asia/Kolkata";
  // Day boundaries: use a generous UTC window then keep bookings whose local date matches today.
  const today = todayIn(tz);
  const [counts, pending, day] = await Promise.all([
    countByStatus(),
    listRequests({ status: "pending", pageSize: 5 }),
    listBookings({
      from: new Date(`${addDays(today, -1)}T00:00:00Z`).toISOString(),
      to: new Date(`${addDays(today, 2)}T00:00:00Z`).toISOString(),
      statuses: ["confirmed", "checked_in"],
      order: "asc",
      pageSize: 100,
    }),
  ]);
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const todays = day.rows.filter(
    (b) => fmt.format(new Date(b.start_at)) === today,
  );
  render(
    view,
    html`${pageHead(
        `Welcome, ${profile.full_name.split(" ")[0]}`,
        `${props.length} propert${props.length === 1 ? "y" : "ies"} under your management`,
        `<a class="btn" href="${R("maintenance")}">All requests</a><a class="btn secondary" href="${R("schedule")}">Today's schedule</a>`,
      )}
      <div class="grid cols-4" style="margin-bottom:20px">
        ${statCard("clock", "Pending", counts.pending, "amber")}${statCard(
          "wrench",
          "In progress",
          counts.in_progress,
          "sky",
        )}${statCard(
          "check",
          "Completed",
          counts.completed,
          "green",
        )}${statCard("calendar", "Bookings today", todays.length)}
      </div>
      <div class="grid cols-2">
        <section class="card">
          <div class="card-head">
            <h2>Needs attention</h2>
            <a class="small" href="${R("maintenance")}">View all</a>
          </div>
          ${pending.rows.length
            ? pending.rows.map((r) =>
                requestRow(r, { showProperty: true, showCreator: true }),
              )
            : emptyState({
                title: "Inbox zero",
                text: "No pending requests right now.",
                ico: "check",
              })}
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Today's bookings</h2>
            <a class="small" href="${R("bookings")}">All bookings</a>
          </div>
          ${todays.length
            ? todays.map((b) => bookingRow(b, { showUser: true }))
            : emptyState({
                title: "Quiet day",
                text: "No amenity bookings today.",
                ico: "calendar",
              })}
        </section>
      </div>`,
  );
}
await load(view, draw);
subscribe(
  [{ table: "maintenance_requests" }, { table: "amenity_bookings" }],
  () => load(view, draw, { skeleton: false }),
);

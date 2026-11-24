import { boot, load } from "../page.js";
import { countByStatus, listRequests } from "../data/maintenance.js";
import { listUsers } from "../data/profiles.js";
import { listProperties } from "../data/properties.js";
import { listBookings } from "../data/bookings.js";
import { subscribe } from "../realtime.js";
import { html, render } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { R } from "../routes.js";
import { statCard, requestRow, bookingRow } from "../views.js";

const { profile, view } = await boot({ roles: ["admin"], title: "Dashboard" });
async function draw() {
  const [users, props, counts, recent, bookings, upcoming] = await Promise.all([
    listUsers({ pageSize: 1 }),
    listProperties(),
    countByStatus(),
    listRequests({ pageSize: 5 }),
    listBookings({ pageSize: 1 }),
    listBookings({ upcomingOnly: true, order: "asc", pageSize: 5 }),
  ]);
  render(
    view,
    html`${pageHead(
        `Welcome, ${profile.full_name.split(" ")[0]}`,
        "Platform overview",
        `<a class="btn" href="${R("reports")}">View reports</a>`,
      )}
      <div class="grid cols-4" style="margin-bottom:20px">
        ${statCard("users", "Users", users.total)}${statCard(
          "building",
          "Properties",
          props.length,
        )}${statCard(
          "wrench",
          "Open requests",
          counts.pending + counts.in_progress,
          "amber",
        )}${statCard("calendar", "Total bookings", bookings.total, "sky")}
      </div>
      <div class="grid cols-2">
        <section class="card">
          <div class="card-head">
            <h2>Recent requests</h2>
            <a class="small" href="${R("maintenance")}">View all</a>
          </div>
          ${recent.rows.length
            ? recent.rows.map((r) =>
                requestRow(r, { showProperty: true, showCreator: true }),
              )
            : emptyState({ title: "No requests yet", ico: "wrench" })}
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Upcoming bookings</h2>
            <a class="small" href="${R("bookings")}">View all</a>
          </div>
          ${upcoming.rows.length
            ? upcoming.rows.map((b) => bookingRow(b, { showUser: true }))
            : emptyState({ title: "No upcoming bookings", ico: "calendar" })}
        </section>
      </div>`,
  );
}
await load(view, draw);
subscribe(
  [{ table: "maintenance_requests" }, { table: "amenity_bookings" }],
  () => load(view, draw, { skeleton: false }),
);

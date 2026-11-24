import { boot, load } from "../page.js";
import { myTenancy } from "../data/properties.js";
import { listRequests } from "../data/maintenance.js";
import { listBookings } from "../data/bookings.js";
import { subscribe } from "../realtime.js";
import { html, render, icon } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { statCard, requestRow, bookingRow, noPropertyState } from "../views.js";

const { profile, user, view } = await boot({
  roles: ["tenant"],
  title: "Dashboard",
});

async function draw() {
  const tenancy = await myTenancy(user.id);
  if (!tenancy) {
    render(
      view,
      html`${pageHead(
        `Welcome, ${profile.full_name.split(" ")[0] || "there"}`,
      )}${noPropertyState()}`,
    );
    return;
  }
  const [open, recent, upcoming] = await Promise.all([
    listRequests({ page: 0, pageSize: 5 }),
    listRequests({ page: 0, pageSize: 1 }),
    listBookings({
      userId: user.id,
      upcomingOnly: true,
      order: "asc",
      pageSize: 4,
    }),
  ]);
  const openCount = (
    await Promise.all(
      ["pending", "in_progress"].map((s) =>
        listRequests({ status: s, pageSize: 1 }),
      ),
    )
  ).reduce((a, r) => a + r.total, 0);
  const p = tenancy.property;
  render(
    view,
    html` ${pageHead(
        `Welcome, ${profile.full_name.split(" ")[0] || "there"}`,
        `${p.name}${tenancy.unit ? ` · Unit ${tenancy.unit}` : ""}`,
        '<a class="btn" href="create-request.html">New request</a><a class="btn secondary" href="amenities.html">Book amenity</a>',
      )}
      <div class="grid cols-3" style="margin-bottom:20px">
        ${statCard("wrench", "Open requests", openCount, "amber")}
        ${statCard("calendar", "Upcoming bookings", upcoming.total, "sky")}
        ${statCard("clipboard", "Total requests", recent.total)}
      </div>
      <div class="grid cols-2">
        <section class="card">
          <div class="card-head">
            <h2>Recent requests</h2>
            <a href="maintenance.html" class="small">View all</a>
          </div>
          ${open.rows.length
            ? open.rows.map((r) => requestRow(r))
            : emptyState({
                title: "No requests yet",
                text: "Report an issue and we will track it here.",
                action:
                  '<a class="btn" href="create-request.html">Create request</a>',
                ico: "wrench",
              })}
        </section>
        <section class="card">
          <div class="card-head">
            <h2>Upcoming bookings</h2>
            <a href="my-bookings.html" class="small">View all</a>
          </div>
          ${upcoming.rows.length
            ? upcoming.rows.map((b) => bookingRow(b))
            : emptyState({
                title: "Nothing booked",
                text: "Reserve the pool, gym or hall.",
                action:
                  '<a class="btn" href="amenities.html">Browse amenities</a>',
                ico: "calendar",
              })}
        </section>
      </div>`,
  );
}
const run = () => load(view, draw);
await run();
subscribe(
  [{ table: "maintenance_requests" }, { table: "amenity_bookings" }],
  () => load(view, draw, { skeleton: false }),
);

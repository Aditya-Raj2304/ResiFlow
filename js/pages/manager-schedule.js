// Day schedule: per amenity, every slot with who booked it and an occupancy bar.
import { boot, load } from "../page.js";
import { listAmenities, getSlots } from "../data/amenities.js";
import { listBookings } from "../data/bookings.js";
import { subscribe } from "../realtime.js";
import {
  html,
  raw,
  render,
  $,
  icon,
  todayIn,
  addDays,
  fmtTime,
  fmtWeekday,
} from "../utils.js";
import { pageHead, emptyState } from "../ui.js";

const { view } = await boot({ roles: ["manager", "admin"], title: "Schedule" });
let date = null,
  tz = "Asia/Kolkata";
render(
  view,
  html`${pageHead("Schedule", "Occupancy by amenity and time slot")}
    <div class="toolbar">
      <button class="icon-btn" id="prev" aria-label="Previous day">
        ${icon("back")}</button
      ><input
        class="input"
        type="date"
        id="date"
        style="min-width:170px"
        aria-label="Date"
      /><button
        class="icon-btn"
        id="next"
        aria-label="Next day"
        style="transform:scaleX(-1)"
      >
        ${icon("back")}</button
      ><button class="btn secondary sm" id="today">Today</button>
    </div>
    <div id="board"></div>`,
);
async function draw() {
  const amenities = await listAmenities();
  tz = amenities[0]?.property?.timezone || "Asia/Kolkata";
  if (!date) {
    date = todayIn(tz);
    $("#date").value = date;
  }
  if (!amenities.length) {
    render(
      $("#board"),
      html`<div class="card">
        ${emptyState({
          title: "No amenities",
          text: "Add amenities to see a schedule.",
          ico: "pool",
        })}
      </div>`,
    );
    return;
  }
  const blocks = await Promise.all(
    amenities.map(async (a) => {
      const slots = await getSlots(a.id, date);
      if (!slots.length) return { a, slots: [], bookings: [] };
      const { rows } = await listBookings({
        amenityId: a.id,
        from: slots[0].slot_start,
        to: slots[slots.length - 1].slot_end,
        statuses: ["confirmed", "checked_in", "completed"],
        order: "asc",
        pageSize: 200,
      });
      return { a, slots, bookings: rows };
    }),
  );
  render(
    $("#board"),
    html`<p class="small muted" style="margin-bottom:12px">
        ${fmtWeekday(`${date}T12:00:00Z`, "UTC")} · times in ${tz}
      </p>
      <div class="stack">
        ${blocks.map(
          ({ a, slots, bookings }) =>
            html` <section class="card">
              <div class="card-head">
                <div>
                  <h2>${a.name}</h2>
                  <div class="xs muted">
                    ${a.property?.name} ·
                    ${a.booking_mode === "exclusive"
                      ? "exclusive"
                      : `capacity ${a.capacity}`}${a.is_active
                      ? ""
                      : " · inactive"}
                  </div>
                </div>
              </div>
              ${slots.length
                ? slots.map((s) => {
                    const here = bookings.filter(
                      (b) =>
                        new Date(b.start_at) < new Date(s.slot_end) &&
                        new Date(b.end_at) > new Date(s.slot_start),
                    );
                    const used =
                      a.booking_mode === "exclusive"
                        ? here.length
                          ? 1
                          : 0
                        : here.reduce((n, b) => n + b.participants, 0);
                    const cap = a.booking_mode === "exclusive" ? 1 : a.capacity;
                    const pct = Math.min(100, Math.round((used / cap) * 100));
                    return html`<div class="list-item">
                      <div class="mono small" style="width:130px">
                        ${fmtTime(s.slot_start, tz)} –
                        ${fmtTime(s.slot_end, tz)}
                      </div>
                      <div class="grow">
                        <div
                          class="bar ${pct >= 100
                            ? "full"
                            : pct >= 70
                              ? "warn"
                              : ""}"
                        >
                          <i style="width:${pct}%"></i>
                        </div>
                        <div class="xs muted" style="margin-top:4px">
                          ${here.length
                            ? here
                                .map(
                                  (b) =>
                                    `${b.booker?.full_name || "Tenant"}${a.booking_mode === "capacity" ? ` (${b.participants})` : ""}${b.status === "checked_in" ? " ✓" : ""}`,
                                )
                                .join(", ")
                            : "Open"}
                        </div>
                      </div>
                      <span class="mono small">${used}/${cap}</span>
                    </div>`;
                  })
                : html`<div class="state small">No slots configured.</div>`}
            </section>`,
        )}
      </div>`,
  );
}
const refresh = (s = true) => load($("#board"), draw, { skeleton: s });
const go = (d) => {
  date = d;
  $("#date").value = d;
  refresh();
};
$("#date").addEventListener(
  "change",
  (e) => e.target.value && go(e.target.value),
);
$("#prev").addEventListener("click", () => go(addDays(date, -1)));
$("#next").addEventListener("click", () => go(addDays(date, 1)));
$("#today").addEventListener("click", () => go(todayIn(tz)));
await refresh();
subscribe([{ table: "amenity_bookings" }, { table: "amenities" }], () =>
  refresh(false),
);

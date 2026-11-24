// Reports: hand-built SVG/CSS charts (no chart library). Data comes from the admin_reports() RPC.
import { boot, load } from "../page.js";
import { getReports } from "../data/profiles.js";
import { subscribe } from "../realtime.js";
import { html, raw, render, titleCase } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { statCard } from "../views.js";

const { view } = await boot({ roles: ["admin"], title: "Reports" });
const C = { pending: "#d97706", in_progress: "#0284c7", completed: "#059669" };

function donut(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return html`<p class="muted small">No requests yet.</p>`;
  const r = 52,
    c = 2 * Math.PI * r;
  let off = 0;
  const arcs = ["pending", "in_progress", "completed"]
    .filter((k) => counts[k])
    .map((k) => {
      const len = (counts[k] / total) * c;
      const el = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${C[k]}" stroke-width="18" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
      off += len;
      return el;
    })
    .join("");
  return html`<div class="row wrap" style="gap:24px">
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      role="img"
      aria-label="Requests by status"
    >
      ${raw(arcs)}
      <text
        x="70"
        y="68"
        text-anchor="middle"
        font-size="24"
        font-weight="800"
        fill="currentColor"
      >
        ${total}
      </text>
      <text x="70" y="86" text-anchor="middle" font-size="10" fill="#64748b">
        requests
      </text>
    </svg>
    <div class="legend" style="flex-direction:column;gap:8px">
      ${["pending", "in_progress", "completed"].map(
        (k) =>
          html`<span
            ><i style="background:${C[k]}"></i>${titleCase(k)} ·
            <b class="mono">${counts[k] || 0}</b></span
          >`,
      )}
    </div>
  </div>`;
}
function stacked(rows) {
  const max = Math.max(
    1,
    ...rows.map((r) => r.pending + r.in_progress + r.completed),
  );
  return html`${rows.map((r) => {
      const t = r.pending + r.in_progress + r.completed;
      return html`<div class="hbar">
        <span class="truncate" title="${r.name}">${r.name}</span>
        <div
          class="bar"
          style="display:flex;height:14px;background:var(--line)"
        >
          ${["pending", "in_progress", "completed"].map((k) =>
            raw(
              `<i style="width:${(r[k] / max) * 100}%;background:${C[k]};border-radius:0"></i>`,
            ),
          )}
        </div>
        <span class="mono small">${t}</span>
      </div>`;
    })}
    <div class="legend" style="margin-top:12px">
      ${["pending", "in_progress", "completed"].map(
        (k) =>
          html`<span><i style="background:${C[k]}"></i>${titleCase(k)}</span>`,
      )}
    </div>`;
}
function bars(rows) {
  const max = Math.max(1, ...rows.map((r) => r.bookings));
  return html`${rows.map(
    (r) =>
      html`<div class="hbar">
        <span class="truncate" title="${r.name}">${r.name}</span>
        <div class="bar" style="height:14px">
          <i style="width:${(r.bookings / max) * 100}%"></i>
        </div>
        <span class="mono small">${r.bookings}</span>
      </div>`,
  )}`;
}
async function draw() {
  const d = await getReports();
  const rate = d.total_requests
    ? Math.round((d.completed_requests / d.total_requests) * 100)
    : 0;
  render(
    view,
    html`${pageHead("Reports", "Maintenance and amenity analytics")}
      <div class="grid cols-4" style="margin-bottom:20px">
        ${statCard("wrench", "Total requests", d.total_requests)}${statCard(
          "check",
          "Completion rate",
          `${rate}%`,
          "green",
        )}
        ${statCard(
          "clock",
          "Avg. resolution",
          d.avg_resolution_hours == null ? "—" : `${d.avg_resolution_hours} h`,
          "sky",
        )}${statCard(
          "shield",
          "Booking conflicts",
          d.booking_conflicts,
          d.booking_conflicts ? "rose" : "green",
        )}
      </div>
      <div class="grid cols-2">
        <section class="card card-pad">
          <h2 style="margin-bottom:16px">Requests by status</h2>
          ${donut(d.status_counts || {})}
        </section>
        <section class="card card-pad">
          <h2 style="margin-bottom:16px">Requests by property</h2>
          ${d.tickets_by_property?.length
            ? stacked(d.tickets_by_property)
            : emptyState({ title: "No properties", ico: "building" })}
        </section>
        <section class="card card-pad" style="grid-column:1/-1">
          <h2 style="margin-bottom:16px">Bookings by amenity</h2>
          ${d.bookings_by_amenity?.length
            ? bars(d.bookings_by_amenity)
            : emptyState({ title: "No amenities", ico: "pool" })}
        </section>
      </div>`,
  );
}
await load(view, draw);
subscribe(
  [{ table: "maintenance_requests" }, { table: "amenity_bookings" }],
  () => load(view, draw, { skeleton: false }),
  { debounceMs: 800 },
);

import { boot, load } from "../page.js";
import { myTenancy } from "../data/properties.js";
import { listAmenities } from "../data/amenities.js";
import { html, render, icon, fmtDate, timeLabel } from "../utils.js";
import { pageHead } from "../ui.js";
import { R } from "../routes.js";
import { noPropertyState, personCell } from "../views.js";

const { user, view } = await boot({ roles: ["tenant"], title: "My property" });
await load(view, async () => {
  const t = await myTenancy(user.id);
  if (!t) {
    render(view, html`${pageHead("My property")}${noPropertyState()}`);
    return;
  }
  const p = t.property;
  const amenities = await listAmenities({ propertyId: p.id });
  render(
    view,
    html`${pageHead(
        p.name,
        `${p.address_line}, ${p.city}, ${p.state} ${p.postal_code}`,
      )}
      <div class="grid cols-2">
        <section class="card">
          <div class="cover" style="border-radius:12px 12px 0 0">
            ${p.image_url
              ? html`<img
                  src="${p.image_url}"
                  alt=""
                  referrerpolicy="no-referrer"
                />`
              : ""}
          </div>
          <div class="card-pad stack-sm">
            <p>${p.description || "No description yet."}</p>
            <dl class="kv">
              <dt>Your unit</dt>
              <dd>${t.unit || "—"}</dd>
              <dt>Lease start</dt>
              <dd>${fmtDate(t.start_date)}</dd>
              <dt>Total units</dt>
              <dd>${p.unit_count}</dd>
              <dt>Built</dt>
              <dd>${p.year_built || "—"}</dd>
              <dt>Timezone</dt>
              <dd>${p.timezone}</dd>
            </dl>
          </div>
        </section>
        <div class="stack">
          <section class="card card-pad">
            <h2 style="margin-bottom:12px">Property manager</h2>
            ${p.manager
              ? html`${personCell(p.manager.full_name)}
                  <dl class="kv" style="margin-top:12px">
                    <dt>Email</dt>
                    <dd>
                      <a href="mailto:${p.manager.email}">${p.manager.email}</a>
                    </dd>
                    <dt>Phone</dt>
                    <dd>${p.manager.phone || "—"}</dd>
                  </dl>`
              : html`<p class="muted">No manager assigned yet.</p>`}
          </section>
          <section class="card">
            <div class="card-head">
              <h2>Amenities</h2>
              <a class="small" href="amenities.html">Book</a>
            </div>
            ${amenities.length
              ? amenities.map(
                  (a) =>
                    html`<a class="list-item" href="${R("book")}?id=${a.id}"
                      ><div class="avatar">${icon("pool", 18)}</div>
                      <div class="grow">
                        <strong>${a.name}</strong>
                        <div class="small muted">
                          ${timeLabel(a.opening_time)} –
                          ${timeLabel(a.closing_time)}
                        </div>
                      </div>
                      ${a.is_active
                        ? ""
                        : html`<span class="badge inactive">Closed</span>`}</a
                    >`,
                )
              : html`<div class="state small">No amenities listed.</div>`}
          </section>
        </div>
      </div>`,
  );
});

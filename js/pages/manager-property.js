import { boot, load } from "../page.js";
import { getProperty, listPropertyTenants } from "../data/properties.js";
import { listAmenities } from "../data/amenities.js";
import { listRequests } from "../data/maintenance.js";
import { html, render, param, isUuid, icon, timeLabel } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { requestRow, personCell } from "../views.js";
import { R } from "../routes.js";

const { profile, view } = await boot({
  roles: ["manager", "admin"],
  title: "Property",
});
const id = param("id");
if (!isUuid(id))
  render(
    view,
    emptyState({
      title: "Property not found",
      text: "The link is missing or invalid.",
      action: `<a class="btn" href="${R("properties")}">Back</a>`,
    }),
  );
else
  await load(view, async () => {
    const p = await getProperty(id);
    if (!p) {
      render(
        view,
        emptyState({
          title: "Property not found",
          text: "It doesn't exist or you don't have access.",
          action: `<a class="btn" href="${R("properties")}">Back</a>`,
        }),
      );
      return;
    }
    const [tenants, amenities, reqs] = await Promise.all([
      listPropertyTenants(id),
      listAmenities({ propertyId: id }),
      listRequests({ propertyId: id, pageSize: 5 }),
    ]);
    render(
      view,
      html`<a
          class="small row"
          style="margin-bottom:12px"
          href="${R("properties")}"
          >${icon("back", 14)} Properties</a
        >
        ${pageHead(
          p.name,
          `${p.address_line}, ${p.city}, ${p.state} ${p.postal_code}`,
        )}
        <div class="grid cols-3" style="margin-bottom:20px">
          <div class="card card-pad">
            <div class="small muted">Units</div>
            <div class="num mono" style="font-size:1.6rem">${p.unit_count}</div>
          </div>
          <div class="card card-pad">
            <div class="small muted">Active tenants</div>
            <div class="num mono" style="font-size:1.6rem">
              ${tenants.length}
            </div>
          </div>
          <div class="card card-pad">
            <div class="small muted">Timezone</div>
            <div style="font-size:1.1rem;font-weight:700">${p.timezone}</div>
          </div>
        </div>
        <div class="grid cols-2">
          <section class="card">
            <div class="card-head"><h2>Tenants</h2></div>
            ${tenants.length
              ? tenants.map(
                  (t) =>
                    html`<div class="list-item">
                      ${personCell(t.tenant?.full_name, t.tenant?.email)}<span
                        class="badge plain"
                        style="margin-left:auto"
                        >Unit ${t.unit || "—"}</span
                      >
                    </div>`,
                )
              : emptyState({
                  title: "No tenants linked",
                  text: "An administrator links tenants to properties.",
                  ico: "users",
                })}
          </section>
          <section class="card">
            <div class="card-head">
              <h2>Amenities</h2>
              <a class="small" href="${R("amenities")}">Manage</a>
            </div>
            ${amenities.length
              ? amenities.map(
                  (a) =>
                    html`<div class="list-item">
                      <div class="grow">
                        <strong>${a.name}</strong>
                        <div class="small muted">
                          ${timeLabel(a.opening_time)} –
                          ${timeLabel(a.closing_time)}
                        </div>
                      </div>
                      <span class="badge ${a.is_active ? "active" : "inactive"}"
                        >${a.is_active ? "Active" : "Inactive"}</span
                      >
                    </div>`,
                )
              : emptyState({ title: "No amenities", ico: "pool" })}
          </section>
          <section class="card" style="grid-column:1/-1">
            <div class="card-head">
              <h2>Recent requests</h2>
              <a class="small" href="${R("maintenance")}">All requests</a>
            </div>
            ${reqs.rows.length
              ? reqs.rows.map((r) => requestRow(r, { showCreator: true }))
              : emptyState({ title: "No requests", ico: "wrench" })}
          </section>
        </div>`,
    );
  });

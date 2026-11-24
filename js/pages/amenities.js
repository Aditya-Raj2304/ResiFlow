import { boot, load } from "../page.js";
import { myTenancy } from "../data/properties.js";
import { listAmenities } from "../data/amenities.js";
import { subscribe } from "../realtime.js";
import { html, render, icon, timeLabel, titleCase } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { R } from "../routes.js";
import { noPropertyState } from "../views.js";

const { user, view } = await boot({ roles: ["tenant"], title: "Amenities" });
async function draw() {
  const t = await myTenancy(user.id);
  if (!t) {
    render(view, html`${pageHead("Amenities")}${noPropertyState()}`);
    return;
  }
  const list = await listAmenities({ propertyId: t.property.id });
  render(
    view,
    html`${pageHead("Amenities", t.property.name)}
    ${list.length
      ? html`<div class="grid cols-3">
          ${list.map(
            (a) =>
              html` <article
                class="card hover"
                style="display:flex;flex-direction:column"
              >
                <div
                  class="cover"
                  style="height:110px;display:grid;place-items:center;color:#bae6fd"
                >
                  ${a.image_url
                    ? html`<img
                        src="${a.image_url}"
                        alt=""
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />`
                    : icon("pool", 40)}
                </div>
                <div class="card-pad stack-sm grow">
                  <div class="row between">
                    <h3>${a.name}</h3>
                    <span class="badge ${a.is_active ? "active" : "inactive"}"
                      >${a.is_active ? "Open" : "Closed"}</span
                    >
                  </div>
                  <p class="small muted">${a.description}</p>
                  <div class="small row wrap" style="gap:12px">
                    <span
                      >${icon("clock", 14)} ${timeLabel(a.opening_time)} –
                      ${timeLabel(a.closing_time)}</span
                    ><span>${a.slot_duration_minutes} min slots</span>
                  </div>
                  <div class="small muted">
                    ${a.booking_mode === "exclusive"
                      ? `Private use · up to ${a.capacity} guests`
                      : `Shared · ${a.capacity} spots per slot`}
                  </div>
                  <div style="margin-top:auto;padding-top:8px">
                    ${a.is_active
                      ? html`<a class="btn block" href="${R("book")}?id=${a.id}"
                          >Book a slot</a
                        >`
                      : html`<button class="btn block secondary" disabled>
                          Unavailable
                        </button>`}
                  </div>
                </div>
              </article>`,
          )}
        </div>`
      : html`<div class="card">
          ${emptyState({
            title: "No amenities yet",
            text: "Your property has no bookable amenities right now.",
            ico: "pool",
          })}
        </div>`}`,
  );
}
await load(view, draw);
subscribe([{ table: "amenities" }], () =>
  load(view, draw, { skeleton: false }),
);

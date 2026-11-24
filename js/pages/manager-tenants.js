import { boot, load } from "../page.js";
import { listAllTenancies, listProperties } from "../data/properties.js";
import { html, render, $, debounce, fmtDate } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { personCell } from "../views.js";

const { view } = await boot({ roles: ["manager"], title: "Tenants" });
let all = [],
  props = [],
  q = "",
  pid = "";
const byId = () => Object.fromEntries(props.map((p) => [p.id, p.name]));
function table() {
  const rows = all.filter(
    (t) =>
      (!pid || t.property_id === pid) &&
      (!q ||
        `${t.tenant?.full_name} ${t.tenant?.email} ${t.unit}`
          .toLowerCase()
          .includes(q)),
  );
  const names = byId();
  render(
    $("#list"),
    rows.length
      ? html`<div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Unit</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(
                  (t) =>
                    html`<tr>
                      <td>
                        ${personCell(t.tenant?.full_name, t.tenant?.email)}
                      </td>
                      <td>${names[t.property_id] || ""}</td>
                      <td>${t.unit || "—"}</td>
                      <td>${fmtDate(t.start_date)}</td>
                    </tr>`,
                )}
              </tbody>
            </table>
          </div>
          <div class="pager">
            <span>${rows.length} tenant${rows.length === 1 ? "" : "s"}</span>
          </div>`
      : emptyState({
          title: all.length ? "No matching tenants" : "No tenants yet",
          text: all.length
            ? "Try a different search."
            : "Administrators link tenants to your properties.",
          ico: "users",
        }),
  );
}
render(
  view,
  html`${pageHead("Tenants", "People living at your properties")}
    <div class="toolbar">
      <input
        class="input search"
        id="q"
        type="search"
        placeholder="Search name, email or unit…"
        aria-label="Search"
      /><select class="input" id="p" aria-label="Property">
        <option value="">All properties</option>
      </select>
    </div>
    <section class="card" id="list"></section>`,
);
await load($("#list"), async () => {
  [all, props] = await Promise.all([listAllTenancies(), listProperties()]);
  $("#p").insertAdjacentHTML(
    "beforeend",
    props.map((p) => html`<option value="${p.id}">${p.name}</option>`).join(""),
  );
  table();
});
$("#q").addEventListener(
  "input",
  debounce((e) => {
    q = e.target.value.trim().toLowerCase();
    table();
  }, 200),
);
$("#p").addEventListener("change", (e) => {
  pid = e.target.value;
  table();
});

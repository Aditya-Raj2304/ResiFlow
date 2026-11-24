// Shared by tenant / manager / admin — RLS decides which requests each role can see.
import { boot, load } from "../page.js";
import { listRequests } from "../data/maintenance.js";
import { listProperties } from "../data/properties.js";
import { subscribe } from "../realtime.js";
import {
  html,
  raw,
  render,
  $,
  debounce,
  CATEGORIES,
  PRIORITIES,
  titleCase,
} from "../utils.js";
import { pageHead, emptyState, pager } from "../ui.js";
import { requestRow } from "../views.js";

const { profile, view } = await boot({ roles: [], title: "Maintenance" });
const f = {
  search: "",
  status: "",
  priority: "",
  category: "",
  propertyId: "",
};
let page = 0;
let props = [];
if (profile.role !== "tenant") {
  try {
    props = await listProperties();
  } catch {
    /* filter simply hidden */
  }
}
const hasFilters = () => Object.values(f).some(Boolean);

render(
  view,
  html`${pageHead(
      "Maintenance",
      profile.role === "tenant"
        ? "Your requests"
        : profile.role === "manager"
          ? "Requests across your properties"
          : "All requests",
      profile.role === "tenant"
        ? '<a class="btn" href="create-request.html">New request</a>'
        : "",
    )}
    <div class="toolbar">
      <input
        class="input search"
        id="search"
        type="search"
        placeholder="Search title or description…"
        aria-label="Search"
      />
      <select class="input" id="status" aria-label="Status">
        <option value="">All statuses</option>
        ${["pending", "in_progress", "completed"].map(
          (s) => html`<option value="${s}">${titleCase(s)}</option>`,
        )}
      </select>
      <select class="input" id="priority" aria-label="Priority">
        <option value="">All priorities</option>
        ${PRIORITIES.map(
          (s) => html`<option value="${s}">${titleCase(s)}</option>`,
        )}
      </select>
      <select class="input" id="category" aria-label="Category">
        <option value="">All categories</option>
        ${CATEGORIES.map((s) => html`<option>${s}</option>`)}
      </select>
      ${props.length > 1
        ? html`<select class="input" id="propertyId" aria-label="Property">
            <option value="">All properties</option>
            ${props.map(
              (p) => html`<option value="${p.id}">${p.name}</option>`,
            )}
          </select>`
        : ""}
      <button class="btn ghost sm" id="clear" hidden>Clear filters</button>
    </div>
    <section class="card" id="list"></section>`,
);

async function draw() {
  const res = await listRequests({ ...f, page });
  if (page > 0 && !res.rows.length && res.total > 0) {
    page = 0;
    return draw();
  }
  render(
    $("#list"),
    html`${res.rows.length
      ? res.rows.map((r) =>
          requestRow(r, {
            showProperty: profile.role !== "tenant",
            showCreator: profile.role !== "tenant",
          }),
        )
      : hasFilters()
        ? emptyState({
            title: "No matching requests",
            text: "Try changing or clearing your filters.",
            action:
              '<button class="btn secondary" data-clear>Clear filters</button>',
            ico: "search",
          })
        : emptyState({
            title: "No requests yet",
            text:
              profile.role === "tenant"
                ? "Report an issue and track it here."
                : "Requests will appear here as tenants submit them.",
            action:
              profile.role === "tenant"
                ? '<a class="btn" href="create-request.html">Create request</a>'
                : "",
            ico: "wrench",
          })}${pager({ page, pageSize: 10, total: res.total })}`,
  );
  $("#clear").hidden = !hasFilters();
}
const refresh = (skeleton = true) => load($("#list"), draw, { skeleton });
const clear = () => {
  Object.keys(f).forEach((k) => {
    f[k] = "";
    const el = $(`#${k}`);
    if (el) el.value = "";
  });
  page = 0;
  refresh();
};
const onSearch = debounce((v) => {
  f.search = v.trim();
  page = 0;
  refresh();
}, 300);
$("#search").addEventListener("input", (e) => onSearch(e.target.value));
["status", "priority", "category", "propertyId"].forEach((k) =>
  $(`#${k}`)?.addEventListener("change", (e) => {
    f[k] = e.target.value;
    page = 0;
    refresh();
  }),
);
view.addEventListener("click", (e) => {
  if (e.target.closest("#clear, [data-clear]")) return clear();
  const p = e.target.closest("[data-page]");
  if (p) {
    page = Number(p.dataset.page);
    refresh();
  }
});
await refresh();
subscribe([{ table: "maintenance_requests" }], () => refresh(false));

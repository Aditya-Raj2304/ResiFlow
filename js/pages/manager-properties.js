import { boot, load } from "../page.js";
import { listProperties } from "../data/properties.js";
import { html, render } from "../utils.js";
import { pageHead, emptyState } from "../ui.js";
import { R } from "../routes.js";
import { propertyCard } from "../views.js";

const { view } = await boot({ roles: ["manager"], title: "Properties" });
await load(view, async () => {
  const list = await listProperties();
  render(
    view,
    html`${pageHead("Properties", "Properties you manage")}${list.length
      ? html`<div class="grid cols-3">
          ${list.map((p) =>
            propertyCard(p, `${R("propertyDetail")}?id=${p.id}`),
          )}
        </div>`
      : html`<div class="card">
          ${emptyState({
            title: "No properties assigned",
            text: "An administrator assigns properties to managers.",
            ico: "building",
          })}
        </div>`}`,
  );
});

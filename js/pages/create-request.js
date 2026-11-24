import { boot } from "../page.js";
import { myTenancy } from "../data/properties.js";
import { createRequest } from "../data/maintenance.js";
import { validateForm } from "../validation.js";
import {
  html,
  raw,
  render,
  $,
  CATEGORIES,
  PRIORITIES,
  titleCase,
  friendlyError,
} from "../utils.js";
import { pageHead, toast, withBusy } from "../ui.js";
import { noPropertyState } from "../views.js";

const { user, view } = await boot({ roles: ["tenant"], title: "New request" });
const MAX = 5 * 1024 * 1024,
  TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
let tenancy;
try {
  tenancy = await myTenancy(user.id);
} catch (e) {
  render(view, html`<div class="alert error">${friendlyError(e)}</div>`);
}
if (tenancy === null)
  render(
    view,
    html`${pageHead("New maintenance request")}${noPropertyState()}`,
  );
else if (tenancy) {
  let files = [];
  render(
    view,
    html`${pageHead(
        "New maintenance request",
        `${tenancy.property.name}${tenancy.unit ? ` · Unit ${tenancy.unit}` : ""}`,
      )}
      <form
        id="f"
        class="card card-pad form-grid"
        novalidate
        style="max-width:760px"
      >
        <div class="field full">
          <label for="title">Title</label
          ><input
            class="input"
            id="title"
            name="title"
            maxlength="140"
            placeholder="e.g. Leaking kitchen faucet"
          />
          <div class="field-error" data-error-for="title"></div>
        </div>
        <div class="field">
          <label for="category">Category</label
          ><select class="input" id="category" name="category">
            <option value="">Select…</option>
            ${CATEGORIES.map((c) => html`<option>${c}</option>`)}
          </select>
          <div class="field-error" data-error-for="category"></div>
        </div>
        <div class="field">
          <label for="priority">Priority</label
          ><select class="input" id="priority" name="priority">
            ${PRIORITIES.map(
              (p) =>
                html`<option
                  value="${p}"
                  ${p === "medium" ? raw("selected") : ""}
                >
                  ${titleCase(p)}
                </option>`,
            )}
          </select>
        </div>
        <div class="field full">
          <label for="description">Description</label
          ><textarea
            class="input"
            id="description"
            name="description"
            placeholder="What's wrong, where, and since when?"
          ></textarea>
          <div class="field-error" data-error-for="description"></div>
        </div>
        <div class="field full">
          <label for="files"
            >Photos / PDF (optional, up to 5 files · 5 MB each)</label
          ><input
            class="input"
            id="files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
          <div class="field-error" id="files-err"></div>
          <ul
            id="flist"
            class="small muted"
            style="margin:0;padding-left:18px"
          ></ul>
        </div>
        <div class="full alert error" id="err" hidden></div>
        <div class="full row" style="justify-content:flex-end">
          <a class="btn secondary" href="maintenance.html">Cancel</a
          ><button class="btn" id="submit" data-busy="Submitting…">
            Submit request
          </button>
        </div>
      </form>`,
  );
  const showFiles = () => {
    render(
      $("#flist"),
      html`${files.map(
        (f) => html`<li>${f.name} (${Math.round(f.size / 1024)} KB)</li>`,
      )}`,
    );
  };
  $("#files").addEventListener("change", (e) => {
    const picked = [...e.target.files];
    $("#files-err").textContent = "";
    const bad = picked.find((f) => !TYPES.includes(f.type) || f.size > MAX);
    if (bad) {
      $("#files-err").textContent =
        `${bad.name}: only JPG, PNG, WebP or PDF up to 5 MB.`;
      e.target.value = "";
      files = [];
    } else if (picked.length > 5) {
      $("#files-err").textContent = "Attach at most 5 files.";
      e.target.value = "";
      files = [];
    } else files = picked;
    showFiles();
  });
  const form = $("#f");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#err").hidden = true;
    if (
      !validateForm(form, {
        title: (v) =>
          v.length >= 3
            ? ""
            : "Give the request a short title (3+ characters).",
        category: (v) => (v ? "" : "Choose a category."),
        description: (v) =>
          v.length >= 10 ? "" : "Describe the issue (10+ characters).",
      })
    )
      return;
    await withBusy($("#submit"), async () => {
      try {
        const r = await createRequest({
          propertyId: tenancy.property.id,
          userId: user.id,
          files,
          ...Object.fromEntries(new FormData(form)),
        });
        toast(
          r.failed.length
            ? `Request submitted, but ${r.failed.length} attachment(s) failed to upload.`
            : "Request submitted.",
          r.failed.length ? "info" : "success",
        );
        setTimeout(
          () => location.assign(`request-details.html?id=${r.id}`),
          700,
        );
      } catch (ex) {
        $("#err").textContent = friendlyError(ex);
        $("#err").hidden = false;
      }
    });
  });
}

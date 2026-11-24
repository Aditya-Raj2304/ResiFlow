import { boot, load } from "../page.js";
import {
  getRequest,
  getHistory,
  getAttachments,
  signedUrl,
  assignRequest,
  setStatus,
  addNote,
  listStaff,
} from "../data/maintenance.js";
import { subscribe } from "../realtime.js";
import {
  html,
  raw,
  render,
  $,
  param,
  isUuid,
  icon,
  fmtDateTime,
  titleCase,
  friendlyError,
} from "../utils.js";
import {
  statusBadge,
  priorityBadge,
  emptyState,
  openDialog,
  toast,
  withBusy,
} from "../ui.js";
import { R } from "../routes.js";
import { personCell } from "../views.js";

const { profile, view } = await boot({ roles: [], title: "Request details" });
const id = param("id");
let staff = [];

async function draw() {
  const r = await getRequest(id);
  if (!r) {
    render(
      view,
      emptyState({
        title: "Request not found",
        text: "It doesn't exist or you don't have access to it.",
        action: `<a class="btn" href="${R("maintenance")}">Back to requests</a>`,
      }),
    );
    return;
  }
  const [hist, files] = await Promise.all([getHistory(id), getAttachments(id)]);
  const canManage = profile.role === "manager" && r.status !== "completed"; // DB re-checks that this manager owns the property
  if (canManage && !staff.length) {
    try {
      staff = await listStaff();
    } catch {
      staff = [];
    }
  }
  render(
    view,
    html`<a
        href="${R("maintenance")}"
        class="small row"
        style="margin-bottom:12px"
        >${icon("back", 14)} All requests</a
      >
      <div class="page-head">
        <div>
          <div class="row wrap" style="gap:10px">
            <h1>${r.title}</h1>
            ${statusBadge(r.status)}${priorityBadge(r.priority)}
          </div>
          <p>
            ${r.category} · ${r.property?.name || ""} · opened
            ${fmtDateTime(r.created_at)}
          </p>
        </div>
        <div class="row wrap">
          ${canManage
            ? html`${r.status === "pending"
                ? html`<button class="btn" data-start>Start work</button>`
                : html`<button class="btn success" data-complete>
                    Mark complete
                  </button>`}`
            : ""}
        </div>
      </div>
      <div
        class="grid"
        style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start"
      >
        <div class="stack">
          <section class="card card-pad stack-sm">
            <h2>Description</h2>
            <p style="white-space:pre-wrap">${r.description}</p>
            ${files.length
              ? html`<h3 style="margin-top:8px">Attachments</h3>
                  <div class="row wrap">
                    ${files.map(
                      (a) =>
                        html`<button
                          class="btn secondary sm"
                          data-file="${a.storage_path}"
                        >
                          ${a.file_name || "Attachment"}
                        </button>`,
                    )}
                  </div>`
              : ""}
          </section>
          ${r.status === "completed"
            ? html`<section class="alert success">
                <b>Resolution</b>
                <p style="margin-top:4px;white-space:pre-wrap">
                  ${r.resolution_notes || "—"}
                </p>
                <p class="xs" style="margin-top:6px">
                  Resolved ${fmtDateTime(r.resolved_at)}
                </p>
              </section>`
            : ""}
          <section class="card card-pad">
            <h2 style="margin-bottom:14px">Activity</h2>
            <ol class="timeline">
              ${hist.map(
                (h) =>
                  html`<li>
                    <div class="row wrap" style="gap:8px">
                      ${h.old_status === h.new_status
                        ? html`<strong>Update</strong>`
                        : html`<strong
                            >${titleCase(h.old_status || "created")} →
                            ${titleCase(h.new_status)}</strong
                          >`}<span class="xs muted"
                        >${fmtDateTime(h.created_at)}</span
                      >
                    </div>
                    <div class="small">${h.note || ""}</div>
                    <div class="xs muted">
                      ${h.author?.full_name ? `by ${h.author.full_name}` : ""}
                    </div>
                  </li>`,
              )}
            </ol>
            ${canManage
              ? html`<form
                  id="note"
                  class="row"
                  style="margin-top:16px;align-items:flex-start"
                >
                  <textarea
                    class="input"
                    name="note"
                    style="min-height:60px"
                    placeholder="Add an update for the tenant…"
                    aria-label="Add note"
                  ></textarea
                  ><button class="btn secondary" data-busy="Posting…">
                    Post
                  </button>
                </form>`
              : ""}
          </section>
        </div>
        <aside class="stack">
          <section class="card card-pad stack-sm">
            <h3>Submitted by</h3>
            ${personCell(
              r.creator?.full_name || "Unknown",
              r.creator?.email,
            )}${r.creator?.phone
              ? html`<div class="small muted">${r.creator.phone}</div>`
              : ""}
          </section>
          <section class="card card-pad stack-sm">
            <h3>Assigned to</h3>
            ${r.assignee
              ? personCell(r.assignee.full_name)
              : html`<p class="muted small">Not assigned yet.</p>`}
            ${canManage
              ? html`<div class="row">
                  <select class="input" id="assignee" aria-label="Assign to">
                    <option value="">Choose staff…</option>
                    ${staff.map(
                      (s) =>
                        html`<option
                          value="${s.id}"
                          ${s.id === r.assigned_to ? raw("selected") : ""}
                        >
                          ${s.full_name} (${s.role})
                        </option>`,
                    )}</select
                  ><button class="btn secondary sm" data-assign>Assign</button>
                </div>`
              : ""}
          </section>
        </aside>
      </div>`,
  );
}
const refresh = (skeleton = true) => load(view, draw, { skeleton });

if (!isUuid(id))
  render(
    view,
    emptyState({
      title: "Request not found",
      text: "The link is missing or invalid.",
      action: `<a class="btn" href="${R("maintenance")}">Back to requests</a>`,
    }),
  );
else {
  view.addEventListener("click", async (e) => {
    const act = async (btn, fn, ok) =>
      withBusy(btn, async () => {
        try {
          await fn();
          toast(ok, "success");
          await refresh(false);
        } catch (ex) {
          toast(friendlyError(ex), "error");
        }
      });
    const st = e.target.closest("[data-start]");
    if (st) return act(st, () => setStatus(id, "in_progress"), "Work started.");
    const as = e.target.closest("[data-assign]");
    if (as) {
      const v = $("#assignee").value;
      if (!v) return toast("Choose a staff member first.", "error");
      return act(as, () => assignRequest(id, v), "Request assigned.");
    }
    const fl = e.target.closest("[data-file]");
    if (fl) {
      try {
        window.open(await signedUrl(fl.dataset.file), "_blank", "noopener");
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
      return;
    }
    if (e.target.closest("[data-complete]")) {
      const d = openDialog({
        title: "Complete request",
        body: '<div class="field"><label for="res">Resolution notes (required)</label><textarea class="input" id="res" placeholder="What was done to fix this?"></textarea><div class="field-error" id="res-err"></div></div>',
        footer:
          '<button class="btn secondary" data-close>Cancel</button><button class="btn success" id="ok" data-busy="Saving…">Complete</button>',
      });
      $("#ok", d.el).addEventListener("click", async (ev) => {
        const v = $("#res", d.el).value.trim();
        if (!v) {
          $("#res-err", d.el).textContent = "Resolution notes are required.";
          return;
        }
        await withBusy(ev.currentTarget, async () => {
          try {
            await setStatus(id, "completed", null, v);
            d.close();
            toast("Request completed.", "success");
            await refresh(false);
          } catch (ex) {
            toast(friendlyError(ex), "error");
          }
        });
      });
    }
  });
  view.addEventListener("submit", async (e) => {
    if (e.target.id !== "note") return;
    e.preventDefault();
    const v = e.target.elements.note.value.trim();
    if (!v) return toast("Write a note first.", "error");
    await withBusy(e.target.querySelector("button"), async () => {
      try {
        await addNote(id, v);
        toast("Update posted.", "success");
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    });
  });
  await refresh();
  subscribe(
    [
      { table: "maintenance_requests", filter: `id=eq.${id}` },
      { table: "maintenance_status_history" },
    ],
    () => refresh(false),
  );
}

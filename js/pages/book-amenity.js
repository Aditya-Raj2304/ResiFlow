import { boot, load } from "../page.js";
import { getAmenity, getSlots } from "../data/amenities.js";
import { createBooking } from "../data/bookings.js";
import { subscribe } from "../realtime.js";
import {
  html,
  raw,
  render,
  $,
  param,
  isUuid,
  icon,
  todayIn,
  addDays,
  minutesToLabel,
  fmtTime,
  timeLabel,
  friendlyError,
} from "../utils.js";
import { toast, withBusy, emptyState } from "../ui.js";

const { view } = await boot({ roles: ["tenant"], title: "Book amenity" });
const id = param("id");
let A,
  tz,
  today,
  maxDay,
  month,
  date = null,
  slots = [],
  slotsErr = "",
  picked = null,
  guests = 1,
  loadingSlots = false;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function calendar() {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const pad = first.getDay();
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push(html`<span></span>`);
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const off = key < today || key > maxDay;
    cells.push(
      html`<button
        type="button"
        data-date="${key}"
        class="${key === today ? "today" : ""} ${key === date
          ? "selected"
          : ""}"
        ${off ? raw("disabled") : ""}
        aria-label="${key}"
      >
        ${d}
      </button>`,
    );
  }
  const prevOff = `${y}-${String(m).padStart(2, "0")}` <= today.slice(0, 7),
    nextOff = `${y}-${String(m).padStart(2, "0")}` >= maxDay.slice(0, 7);
  return html`<div class="cal-head">
      <button
        type="button"
        class="icon-btn"
        data-month="-1"
        ${prevOff ? raw("disabled") : ""}
        aria-label="Previous month"
      >
        ${icon("back")}</button
      ><span>${MONTHS[m - 1]} ${y}</span
      ><button
        type="button"
        class="icon-btn"
        data-month="1"
        ${nextOff ? raw("disabled") : ""}
        aria-label="Next month"
        style="transform:scaleX(-1)"
      >
        ${icon("back")}
      </button>
    </div>
    <div class="cal">
      ${["S", "M", "T", "W", "T", "F", "S"].map(
        (d) => html`<span class="dow">${d}</span>`,
      )}${cells}
    </div>`;
}
function slotGrid() {
  if (!date)
    return html`<p class="muted small">Pick a date to see available times.</p>`;
  if (loadingSlots)
    return html`<div class="slots">
      ${[...Array(6)].map(
        () => html`<div class="skeleton" style="height:56px"></div>`,
      )}
    </div>`;
  if (slotsErr)
    return html`<div class="alert error">
      ${slotsErr} <button class="btn secondary sm" data-reload>Retry</button>
    </div>`;
  if (!slots.length)
    return emptyState({
      title: "No slots",
      text: "This amenity has no bookable slots on that day.",
      ico: "clock",
    });
  return html`<div class="slots">
    ${slots.map((s) => {
      const dis = !["available"].includes(s.state);
      const label = {
        booked: "Reserved",
        full: "Full",
        past: "Past",
        inactive: "Closed",
      }[s.state];
      const sub =
        s.state === "available"
          ? A.booking_mode === "capacity"
            ? `${s.remaining} of ${A.capacity} left`
            : "Available"
          : label;
      return html`<button
        type="button"
        class="slot ${s.state} ${picked === s.start_minutes ? "selected" : ""}"
        data-slot="${s.start_minutes}"
        ${dis ? raw("disabled") : ""}
      >
        <b>${fmtTime(s.slot_start, tz)} – ${fmtTime(s.slot_end, tz)}</b
        ><small>${sub}</small>
      </button>`;
    })}
  </div>`;
}
function summary() {
  const s = slots.find((x) => x.start_minutes === picked);
  const maxG =
    A.booking_mode === "capacity"
      ? Math.min(A.capacity, s?.remaining || A.capacity)
      : A.capacity;
  return html`<div
    class="card card-pad stack-sm"
    style="position:sticky;top:84px"
  >
    <h2>Your booking</h2>
    <dl class="kv" style="grid-template-columns:90px 1fr">
      <dt>Amenity</dt>
      <dd>${A.name}</dd>
      <dt>Date</dt>
      <dd>${date || "—"}</dd>
      <dt>Time</dt>
      <dd>
        ${s ? `${fmtTime(s.slot_start, tz)} – ${fmtTime(s.slot_end, tz)}` : "—"}
      </dd>
    </dl>
    <div class="field">
      <label for="guests">Guests (max ${maxG})</label
      ><input
        id="guests"
        class="input"
        type="number"
        min="1"
        max="${maxG}"
        value="${Math.min(guests, maxG)}"
      />
    </div>
    ${A.booking_rules
      ? html`<div class="alert info small">
          <b>Rules:</b> ${A.booking_rules}
        </div>`
      : ""}
    <button
      class="btn block"
      id="confirm"
      data-busy="Booking…"
      ${s ? "" : raw("disabled")}
    >
      Confirm booking
    </button>
    <p class="xs muted">
      Times shown in the property's timezone (${tz}). Your slot is held as soon
      as you confirm.
    </p>
  </div>`;
}
function paint() {
  render($("#cal"), calendar());
  render($("#slots"), slotGrid());
  render($("#summary"), summary());
  document
    .querySelectorAll(".step")
    .forEach((el, i) =>
      el.classList.toggle(
        "done",
        i === 0 || (i === 1 && date) || (i === 2 && picked != null),
      ),
    );
}
async function fetchSlots(quiet) {
  if (!date) return;
  if (!quiet) {
    loadingSlots = true;
    paint();
  }
  try {
    slots = await getSlots(id, date);
    slotsErr = "";
  } catch (e) {
    slotsErr = friendlyError(e);
    slots = [];
  }
  loadingSlots = false;
  const still = slots.find((s) => s.start_minutes === picked);
  if (picked != null && (!still || still.state !== "available")) {
    if (quiet) toast("That slot was just taken. Please pick another.", "info");
    picked = null;
  }
  paint();
}

if (!isUuid(id))
  render(
    view,
    emptyState({
      title: "Amenity not found",
      text: "The link is missing or invalid.",
      action: '<a class="btn" href="amenities.html">Back to amenities</a>',
    }),
  );
else
  await load(
    view,
    async () => {
      A = await getAmenity(id);
      if (!A) {
        render(
          view,
          emptyState({
            title: "Amenity not found",
            text: "It doesn't exist or you don't have access.",
            action:
              '<a class="btn" href="amenities.html">Back to amenities</a>',
          }),
        );
        return;
      }
      tz = A.property?.timezone || "Asia/Kolkata";
      today = todayIn(tz);
      maxDay = addDays(today, 60);
      month = today.slice(0, 7);
      render(
        view,
        html`<a
            href="amenities.html"
            class="small row"
            style="margin-bottom:12px"
            >${icon("back", 14)} Amenities</a
          >
          <div class="page-head">
            <div>
              <h1>${A.name}</h1>
              <p>
                ${A.description} · ${timeLabel(A.opening_time)} –
                ${timeLabel(A.closing_time)} · ${A.slot_duration_minutes} min
                slots
              </p>
            </div>
          </div>
          ${A.is_active
            ? ""
            : html`<div class="alert warn" style="margin-bottom:16px">
                This amenity is currently closed for booking.
              </div>`}
          <div class="steps">
            <span class="step"></span><span class="step"></span
            ><span class="step"></span>
          </div>
          <div
            class="grid"
            style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start"
          >
            <div class="stack">
              <section class="card card-pad">
                <h2 style="margin-bottom:12px">1 · Choose a date</h2>
                <div id="cal"></div>
              </section>
              <section class="card card-pad">
                <h2 style="margin-bottom:12px">2 · Choose a time</h2>
                <div id="slots"></div>
              </section>
            </div>
            <div id="summary"></div>
          </div>`,
      );
      paint();
      view.addEventListener("click", async (e) => {
        const d = e.target.closest("[data-date]");
        if (d) {
          date = d.dataset.date;
          picked = null;
          return fetchSlots();
        }
        const mo = e.target.closest("[data-month]");
        if (mo) {
          const [y, m] = month.split("-").map(Number);
          const n = new Date(y, m - 1 + Number(mo.dataset.month), 1);
          month = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
          return paint();
        }
        const s = e.target.closest("[data-slot]");
        if (s) {
          picked = Number(s.dataset.slot);
          return paint();
        }
        if (e.target.closest("[data-reload]")) return fetchSlots();
        const c = e.target.closest("#confirm");
        if (c) {
          const g = Number($("#guests").value);
          await withBusy(c, async () => {
            try {
              await createBooking(id, date, picked, g);
              toast("Booking confirmed!", "success");
              setTimeout(() => location.assign("my-bookings.html"), 600);
            } catch (ex) {
              toast(friendlyError(ex), "error");
              picked = null;
              await fetchSlots(true);
            }
          });
        }
      });
      view.addEventListener("input", (e) => {
        if (e.target.id === "guests") guests = Number(e.target.value) || 1;
      });
      subscribe([{ table: "amenity_bookings" }], () => fetchSlots(true));
    },
    { skeleton: true },
  );

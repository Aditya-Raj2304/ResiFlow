import {
  db,
  commit,
  me,
  byId,
  person,
  notify,
  isManagerOf,
  isTenantOf,
  paginate,
  zonedToUtc,
  toMinutes,
} from "../store.js";
import { PAGE_SIZE } from "../config.js";

const visible = (u) =>
  db().bookings.filter(
    (b) =>
      u.role === "admin" ||
      b.booked_by === u.id ||
      isManagerOf(u, b.property_id),
  );
const enrich = (b) => {
  const a = byId(db().amenities, b.amenity_id),
    p = byId(db().properties, b.property_id);
  return {
    ...b,
    amenity: a
      ? { id: a.id, name: a.name, booking_mode: a.booking_mode }
      : null,
    property: p ? { id: p.id, name: p.name, timezone: p.timezone } : null,
    booker: person(b.booked_by, ["id", "full_name", "email"]),
  };
};

export async function listBookings({
  status,
  statuses,
  amenityId,
  propertyId,
  from,
  to,
  upcomingOnly,
  pastOnly,
  page = 0,
  pageSize = PAGE_SIZE,
  userId,
  order = "desc",
} = {}) {
  const now = Date.now();
  let rows = visible(me()).filter(
    (b) =>
      (!userId || b.booked_by === userId) &&
      (!status || b.status === status) &&
      (!statuses || statuses.includes(b.status)) &&
      (!amenityId || b.amenity_id === amenityId) &&
      (!propertyId || b.property_id === propertyId) &&
      (!from || b.start_at >= new Date(from).toISOString()) &&
      (!to || b.start_at < new Date(to).toISOString()) &&
      (!upcomingOnly ||
        (["confirmed", "checked_in"].includes(b.status) &&
          new Date(b.end_at) >= now)) &&
      (!pastOnly ||
        ["completed", "cancelled"].includes(b.status) ||
        new Date(b.end_at) < now),
  );
  rows = rows.sort(
    (a, b) => (order === "asc" ? 1 : -1) * a.start_at.localeCompare(b.start_at),
  );
  const out = paginate(rows, page, pageSize);
  return { rows: out.rows.map(enrich), total: out.total };
}
export async function createBooking(
  amenityId,
  date,
  startMinutes,
  participants = 1,
) {
  const u = me();
  const a = byId(db().amenities, amenityId);
  if (!a) throw new Error("Amenity not found.");
  if (!isTenantOf(u, a.property_id))
    throw new Error("You are not associated with this property.");
  if (!a.is_active)
    throw new Error("This amenity is not currently available for booking.");
  if (
    !Number.isInteger(participants) ||
    participants < 1 ||
    participants > a.capacity
  )
    throw new Error(`Guests must be between 1 and ${a.capacity}.`);
  const tz = byId(db().properties, a.property_id)?.timezone || "Asia/Kolkata",
    open = toMinutes(a.opening_time),
    close = toMinutes(a.closing_time),
    dur = a.slot_duration_minutes;
  if (
    startMinutes < open ||
    startMinutes + dur > close ||
    (startMinutes - open) % dur !== 0
  )
    throw new Error("That time is outside this amenity's booking slots.");
  const s = zonedToUtc(date, startMinutes, tz),
    e = s + dur * 60000;
  if (s <= Date.now()) throw new Error("You can't book a slot in the past.");
  if (s > Date.now() + 60 * 86400e3)
    throw new Error("Bookings open up to 60 days ahead.");
  const overlap = db().bookings.filter(
    (b) =>
      b.amenity_id === a.id &&
      ["confirmed", "checked_in"].includes(b.status) &&
      new Date(b.start_at) < e &&
      new Date(b.end_at) > s,
  );
  if (a.booking_mode === "exclusive") {
    if (overlap.length)
      throw new Error(
        "That slot was just reserved by someone else. Please choose another.",
      );
  } else {
    const left = a.capacity - overlap.reduce((n, b) => n + b.participants, 0);
    if (participants > left)
      throw new Error(
        left <= 0
          ? "That slot is full. Please choose another."
          : `Only ${left} spot(s) left for that slot.`,
      );
  }
  const b = {
    id: crypto.randomUUID(),
    amenity_id: a.id,
    property_id: a.property_id,
    booked_by: u.id,
    start_at: new Date(s).toISOString(),
    end_at: new Date(e).toISOString(),
    status: "confirmed",
    participants,
    is_exclusive: a.booking_mode === "exclusive",
    created_at: new Date().toISOString(),
  };
  db().bookings.push(b);
  notify(
    u.id,
    "Booking confirmed",
    `${a.name} is reserved.`,
    "booking",
    "booking",
    b.id,
  );
  const p = byId(db().properties, a.property_id);
  if (p?.manager_id && p.manager_id !== u.id)
    notify(
      p.manager_id,
      "New booking",
      `${u.full_name} booked ${a.name}.`,
      "booking",
      "booking",
      b.id,
    );
  commit();
  return b.id;
}
function target(id) {
  const u = me();
  const b = byId(db().bookings, id);
  if (!b) throw new Error("Booking not found.");
  const staff = isManagerOf(u, b.property_id) || u.role === "admin";
  if (!(b.booked_by === u.id || staff)) throw new Error("Not allowed.");
  return { u, b, staff };
}
const aname = (b) => byId(db().amenities, b.amenity_id)?.name || "Amenity";
export async function cancelBooking(id) {
  const { u, b, staff } = target(id);
  if (!["confirmed", "checked_in"].includes(b.status))
    throw new Error("Only active bookings can be cancelled.");
  if (!staff) {
    if (b.status !== "confirmed")
      throw new Error(
        "Checked-in bookings can't be cancelled. Check out instead.",
      );
    if (new Date(b.start_at) <= Date.now())
      throw new Error(
        "This booking has already started and can't be cancelled.",
      );
  }
  b.status = "cancelled";
  b.cancelled_at = new Date().toISOString();
  notify(
    b.booked_by,
    "Booking cancelled",
    `${aname(b)} reservation was ${b.booked_by === u.id ? "cancelled." : "cancelled by property staff."}`,
    "booking",
    "booking",
    b.id,
  );
  commit();
}
export async function checkIn(id) {
  const { u, b } = target(id);
  if (b.status !== "confirmed")
    throw new Error("Only confirmed bookings can be checked in.");
  if (Date.now() < new Date(b.start_at) - 15 * 60000)
    throw new Error("Check-in opens 15 minutes before the slot starts.");
  if (Date.now() >= new Date(b.end_at))
    throw new Error("This booking has already ended.");
  b.status = "checked_in";
  b.checked_in_at = new Date().toISOString();
  if (b.booked_by !== u.id)
    notify(
      b.booked_by,
      "Checked in",
      `You were checked in to ${aname(b)}.`,
      "booking",
      "booking",
      b.id,
    );
  commit();
}
export async function checkOut(id) {
  const { b } = target(id);
  if (b.status !== "checked_in")
    throw new Error("Only checked-in bookings can be checked out.");
  b.status = "completed";
  b.checked_out_at = new Date().toISOString();
  notify(
    b.booked_by,
    "Checked out",
    `Thanks for using ${aname(b)}.`,
    "booking",
    "booking",
    b.id,
  );
  commit();
}

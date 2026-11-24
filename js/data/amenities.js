import {
  db,
  commit,
  me,
  byId,
  isManagerOf,
  isTenantOf,
  canAccessProperty,
  toMinutes,
  zonedToUtc,
} from "../store.js";

const visible = (u) =>
  db().amenities.filter(
    (a) =>
      u.role === "admin" ||
      isManagerOf(u, a.property_id) ||
      (a.is_active && isTenantOf(u, a.property_id)),
  );
const enrich = (a) => {
  const p = byId(db().properties, a.property_id);
  return {
    ...a,
    property: p ? { id: p.id, name: p.name, timezone: p.timezone } : null,
  };
};
export const listAmenities = async ({ propertyId } = {}) =>
  visible(me())
    .filter((a) => !propertyId || a.property_id === propertyId)
    .map(enrich)
    .sort((a, b) => a.name.localeCompare(b.name));
export const getAmenity = async (id) => {
  const a = visible(me()).find((x) => x.id === id);
  return a ? enrich(a) : null;
};
const clean = (v) => ({
  name: v.name.trim(),
  description: (v.description || "").trim(),
  capacity: Number(v.capacity),
  booking_mode: v.booking_mode,
  slot_duration_minutes: Number(v.slot_duration_minutes),
  opening_time: String(v.opening_time).slice(0, 5),
  closing_time: String(v.closing_time).slice(0, 5),
  booking_rules: (v.booking_rules || "").trim(),
  is_active: v.is_active !== false,
});
function validate(c) {
  if (!(toMinutes(c.closing_time) > toMinutes(c.opening_time)))
    throw new Error("Closing time must be after opening time.");
  if (c.capacity < 1) throw new Error("Capacity must be at least 1.");
  if (c.slot_duration_minutes < 15 || c.slot_duration_minutes > 720)
    throw new Error("Slot length must be 15–720 minutes.");
}
export async function createAmenity(propertyId, v) {
  const u = me();
  if (!isManagerOf(u, propertyId))
    throw new Error("You can't add amenities to this property.");
  const c = clean(v);
  validate(c);
  const a = {
    id: crypto.randomUUID(),
    property_id: propertyId,
    image_url: null,
    ...c,
  };
  db().amenities.push(a);
  commit();
  return { id: a.id };
}
export async function updateAmenity(id, v) {
  const u = me();
  const a = byId(db().amenities, id);
  if (!a || !(u.role === "admin" || isManagerOf(u, a.property_id)))
    throw new Error("Not allowed.");
  const c = clean(v);
  validate(c);
  Object.assign(a, c);
  commit();
  return { id };
}
export async function setAmenityActive(id, active) {
  const u = me();
  const a = byId(db().amenities, id);
  if (!a || !(u.role === "admin" || isManagerOf(u, a.property_id)))
    throw new Error("Not allowed.");
  a.is_active = active;
  commit();
  return { id };
}

// Same slot grid & states as the original get_amenity_slots(): available / booked / full / past / inactive.
export async function getSlots(amenityId, date) {
  const u = me();
  const a = byId(db().amenities, amenityId);
  if (!a || !canAccessProperty(u, a.property_id))
    throw new Error("Amenity not found.");
  const tz = byId(db().properties, a.property_id)?.timezone || "Asia/Kolkata";
  const open = toMinutes(a.opening_time),
    close = toMinutes(a.closing_time);
  const out = [];
  for (
    let m = open;
    m + a.slot_duration_minutes <= close;
    m += a.slot_duration_minutes
  ) {
    const s = zonedToUtc(date, m, tz),
      e = s + a.slot_duration_minutes * 60000;
    const used = db()
      .bookings.filter(
        (b) =>
          b.amenity_id === a.id &&
          ["confirmed", "checked_in"].includes(b.status) &&
          new Date(b.start_at) < e &&
          new Date(b.end_at) > s,
      )
      .reduce(
        (n, b) => n + (a.booking_mode === "exclusive" ? 1 : b.participants),
        0,
      );
    let state, remaining;
    if (!a.is_active) {
      state = "inactive";
      remaining = 0;
    } else if (s <= Date.now()) {
      state = "past";
      remaining = 0;
    } else if (a.booking_mode === "exclusive") {
      state = used > 0 ? "booked" : "available";
      remaining = used > 0 ? 0 : 1;
    } else {
      remaining = Math.max(a.capacity - used, 0);
      state = remaining === 0 ? "full" : "available";
    }
    out.push({
      start_minutes: m,
      slot_start: new Date(s).toISOString(),
      slot_end: new Date(e).toISOString(),
      state,
      remaining,
    });
  }
  return out;
}

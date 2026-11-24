import { db, commit, me, byId, person, notify } from "../store.js";

const PEOPLE = ["id", "full_name", "email", "phone"];
const withManager = (p) => ({ ...p, manager: person(p.manager_id, PEOPLE) });
const visible = (u) =>
  db().properties.filter(
    (p) =>
      u.role === "admin" ||
      p.manager_id === u.id ||
      db().tenancies.some(
        (t) => t.property_id === p.id && t.tenant_id === u.id && t.is_active,
      ),
  );
const needAdmin = () => {
  const u = me();
  if (u.role !== "admin") throw new Error("Administrators only.");
  return u;
};

export const listProperties = async () =>
  visible(me())
    .map(withManager)
    .sort((a, b) => a.name.localeCompare(b.name));
export const getProperty = async (id) => {
  const p = visible(me()).find((x) => x.id === id);
  return p ? withManager(p) : null;
};
const link = (t) => ({
  ...t,
  tenant: person(t.tenant_id, PEOPLE),
  property:
    byId(db().properties, t.property_id) &&
    withManager(byId(db().properties, t.property_id)),
});
export const listPropertyTenants = async (propertyId) => {
  const u = me();
  if (!visible(u).some((p) => p.id === propertyId)) return [];
  return db()
    .tenancies.filter((t) => t.property_id === propertyId && t.is_active)
    .map(link)
    .sort((a, b) => a.unit.localeCompare(b.unit));
};
export const myTenancy = async (userId) => {
  const t = db().tenancies.find((x) => x.tenant_id === userId && x.is_active);
  return t ? link(t) : null;
};
export const listAllTenancies = async () => {
  const u = me();
  const mine = new Set(visible(u).map((p) => p.id));
  return db()
    .tenancies.filter(
      (t) => t.is_active && (u.role === "admin" || mine.has(t.property_id)),
    )
    .map(link);
};
function clean(v) {
  return {
    name: v.name.trim(),
    address_line: v.address_line.trim(),
    city: v.city.trim(),
    state: v.state.trim(),
    postal_code: v.postal_code.trim(),
    timezone: (v.timezone || "Asia/Kolkata").trim(),
    description: (v.description || "").trim(),
    unit_count: Number(v.unit_count) || 1,
    year_built: v.year_built ? Number(v.year_built) : null,
    image_url: (v.image_url || "").trim() || null,
    manager_id: v.manager_id || null,
  };
}
export const createProperty = async (v) => {
  needAdmin();
  const p = {
    id: crypto.randomUUID(),
    ...clean(v),
    created_at: new Date().toISOString(),
  };
  db().properties.push(p);
  commit();
  return { id: p.id };
};
export const updateProperty = async (id, v) => {
  needAdmin();
  const p = byId(db().properties, id);
  if (!p) throw new Error("Property not found.");
  Object.assign(p, clean(v));
  commit();
  return { id };
};
export const deleteProperty = async (id) => {
  needAdmin();
  const s = db();
  const reqIds = new Set(
    s.requests.filter((r) => r.property_id === id).map((r) => r.id),
  );
  s.properties = s.properties.filter((p) => p.id !== id);
  s.tenancies = s.tenancies.filter((t) => t.property_id !== id);
  s.amenities = s.amenities.filter((a) => a.property_id !== id);
  s.bookings = s.bookings.filter((b) => b.property_id !== id);
  s.requests = s.requests.filter((r) => r.property_id !== id);
  s.history = s.history.filter((h) => !reqIds.has(h.request_id));
  s.attachments = s.attachments.filter((a) => !reqIds.has(a.request_id));
  commit();
};
export const associateTenant = async (property, tenant, unit, start) => {
  needAdmin();
  const today = new Date().toISOString().slice(0, 10);
  db()
    .tenancies.filter((t) => t.tenant_id === tenant && t.is_active)
    .forEach((t) => {
      t.is_active = false;
      t.end_date = today;
    });
  const t = {
    id: crypto.randomUUID(),
    property_id: property,
    tenant_id: tenant,
    unit: (unit || "").trim(),
    start_date: start || today,
    end_date: null,
    is_active: true,
  };
  db().tenancies.push(t);
  const p = byId(db().properties, property);
  notify(
    tenant,
    "Property assigned",
    `You were linked to ${p?.name}${t.unit ? ` · Unit ${t.unit}` : ""}.`,
    "system",
    "property",
    property,
  );
  commit();
  return t.id;
};
export const removeTenant = async (linkId) => {
  needAdmin();
  const t = byId(db().tenancies, linkId);
  if (t) {
    t.is_active = false;
    t.end_date = new Date().toISOString().slice(0, 10);
    commit();
  }
};

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
} from "../store.js";
import { PAGE_SIZE } from "../config.js";

const visible = (u) =>
  db().requests.filter(
    (r) =>
      u.role === "admin" ||
      r.created_by === u.id ||
      isManagerOf(u, r.property_id),
  );
const enrich = (r) => ({
  ...r,
  property: pickProp(r.property_id),
  creator: person(r.created_by),
  assignee: person(r.assigned_to, ["id", "full_name"]),
});
const pickProp = (pid) => {
  const p = byId(db().properties, pid);
  return p ? { id: p.id, name: p.name } : null;
};
const sort = (rows) =>
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));

export async function listRequests({
  status,
  priority,
  category,
  search,
  propertyId,
  page = 0,
  pageSize = PAGE_SIZE,
} = {}) {
  const s = (search || "").trim().toLowerCase();
  const rows = sort(
    visible(me()).filter(
      (r) =>
        (!status || r.status === status) &&
        (!priority || r.priority === priority) &&
        (!category || r.category === category) &&
        (!propertyId || r.property_id === propertyId) &&
        (!s || `${r.title} ${r.description}`.toLowerCase().includes(s)),
    ),
  );
  const out = paginate(rows, page, pageSize);
  return { rows: out.rows.map(enrich), total: out.total };
}
export const getRequest = async (id) => {
  const r = visible(me()).find((x) => x.id === id);
  return r ? enrich(r) : null;
};
export const getHistory = async (id) => {
  if (!(await getRequest(id))) return [];
  return db()
    .history.filter((h) => h.request_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((h) => ({ ...h, author: person(h.changed_by, ["full_name"]) }));
};
export const getAttachments = async (id) =>
  (await getRequest(id))
    ? db().attachments.filter((a) => a.request_id === id)
    : [];
export async function signedUrl() {
  throw new Error(
    "File previews are not available in the frontend-only demo (only file names are stored).",
  );
}
export async function countByStatus() {
  const out = { pending: 0, in_progress: 0, completed: 0 };
  visible(me()).forEach((r) => {
    out[r.status]++;
  });
  return out;
}

export async function createRequest({
  propertyId,
  userId,
  title,
  description,
  category,
  priority,
  files = [],
}) {
  const u = me();
  if (u.id !== userId || !isTenantOf(u, propertyId))
    throw new Error("You are not associated with this property.");
  if (title.trim().length < 3) throw new Error("Title is too short.");
  if (!description.trim()) throw new Error("Description is required.");
  const now = new Date().toISOString();
  const r = {
    id: crypto.randomUUID(),
    property_id: propertyId,
    created_by: u.id,
    assigned_to: null,
    title: title.trim(),
    description: description.trim(),
    category,
    priority: priority || "medium",
    status: "pending",
    resolution_notes: null,
    created_at: now,
    updated_at: now,
    resolved_at: null,
  };
  db().requests.push(r);
  db().history.push({
    id: crypto.randomUUID(),
    request_id: r.id,
    changed_by: u.id,
    old_status: null,
    new_status: "pending",
    note: "Request submitted.",
    created_at: now,
  });
  files.forEach((f) =>
    db().attachments.push({
      id: crypto.randomUUID(),
      request_id: r.id,
      storage_path: "",
      file_name: f.name,
      created_at: now,
    }),
  );
  const p = byId(db().properties, propertyId);
  if (p?.manager_id)
    notify(
      p.manager_id,
      "New maintenance request",
      `${r.title} at ${p.name}`,
      "maintenance",
      "maintenance_request",
      r.id,
    );
  commit();
  return { id: r.id, failed: [] };
}
function managed(id) {
  const u = me();
  const r = byId(db().requests, id);
  if (!r) throw new Error("Request not found.");
  if (!isManagerOf(u, r.property_id))
    throw new Error("Only the property manager can update this request.");
  return { u, r };
}
const log = (r, by, from, to, note) =>
  db().history.push({
    id: crypto.randomUUID(),
    request_id: r.id,
    changed_by: by,
    old_status: from,
    new_status: to,
    note,
    created_at: new Date().toISOString(),
  });
export async function assignRequest(id, assignee) {
  const { u, r } = managed(id);
  if (r.status === "completed")
    throw new Error("Completed requests cannot be reassigned.");
  const a = db().users.find(
    (x) => x.id === assignee && ["manager", "admin"].includes(x.role),
  );
  if (!a) throw new Error("Assignee must be a staff member.");
  r.assigned_to = a.id;
  r.updated_at = new Date().toISOString();
  log(r, u.id, r.status, r.status, `Assigned to ${a.full_name}.`);
  notify(
    r.created_by,
    "Request assigned",
    `${r.title} was assigned to ${a.full_name}.`,
    "maintenance",
    "maintenance_request",
    r.id,
  );
  if (a.id !== u.id)
    notify(
      a.id,
      "New assignment",
      `You were assigned: ${r.title}`,
      "maintenance",
      "maintenance_request",
      r.id,
    );
  commit();
}
export async function setStatus(id, status, note, resolution) {
  const { u, r } = managed(id);
  if (
    !(
      (r.status === "pending" && status === "in_progress") ||
      (r.status === "in_progress" && status === "completed")
    )
  )
    throw new Error(`Invalid status change: ${r.status} to ${status}.`);
  if (status === "completed" && !(resolution || "").trim())
    throw new Error("Resolution notes are required to complete a request.");
  const old = r.status;
  r.status = status;
  r.assigned_to = r.assigned_to || u.id;
  r.updated_at = new Date().toISOString();
  if (status === "completed") {
    r.resolution_notes = resolution.trim();
    r.resolved_at = r.updated_at;
  }
  log(
    r,
    u.id,
    old,
    status,
    (note || "").trim() ||
      (status === "completed" ? "Completed." : "Work started."),
  );
  notify(
    r.created_by,
    status === "completed" ? "Request completed" : "Request in progress",
    status === "completed"
      ? `${r.title} has been resolved.`
      : `${r.title} is now being worked on.`,
    "maintenance",
    "maintenance_request",
    r.id,
  );
  commit();
}
export async function addNote(id, note) {
  if (!(note || "").trim()) throw new Error("Note cannot be empty.");
  const { u, r } = managed(id);
  log(r, u.id, r.status, r.status, note.trim());
  notify(
    r.created_by,
    "Update on your request",
    note.trim(),
    "maintenance",
    "maintenance_request",
    r.id,
  );
  commit();
}
export async function listStaff() {
  const u = me();
  if (u.role !== "admin" && !db().properties.some((p) => p.manager_id === u.id))
    throw new Error("Not allowed.");
  return db()
    .users.filter((x) => ["manager", "admin"].includes(x.role))
    .map((x) => ({ id: x.id, full_name: x.full_name, role: x.role }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

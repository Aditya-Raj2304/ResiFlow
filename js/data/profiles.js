import { db, commit, me, publicUser, paginate } from "../store.js";
import { PAGE_SIZE } from "../config.js";

const needAdmin = () => {
  const u = me();
  if (u.role !== "admin") throw new Error("Administrators only.");
  return u;
};
export async function listUsers({
  role,
  search,
  page = 0,
  pageSize = PAGE_SIZE,
} = {}) {
  needAdmin();
  const s = (search || "").toLowerCase();
  let rows = db().users.filter(
    (u) =>
      (!role || u.role === role) &&
      (!s || `${u.full_name} ${u.email}`.toLowerCase().includes(s)),
  );
  rows = rows
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(publicUser);
  return paginate(rows, page, pageSize);
}
export async function changeRole(userId, role) {
  needAdmin();
  if (!["tenant", "manager", "admin"].includes(role))
    throw new Error("Invalid role.");
  const u = db().users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found.");
  u.role = role;
  commit();
}
export async function updateMyProfile(id, { full_name, phone }) {
  const u = me();
  if (u.id !== id) throw new Error("You can't edit another profile.");
  u.full_name = full_name.trim();
  u.phone = (phone || "").trim() || null;
  commit();
  return { id };
}
export async function listManagers() {
  needAdmin();
  return db()
    .users.filter((u) => u.role === "manager")
    .map(publicUser)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}
export async function getReports() {
  needAdmin();
  const s = db();
  const rq = s.requests;
  const done = rq.filter((r) => r.status === "completed" && r.resolved_at);
  const avg = done.length
    ? Math.round(
        (done.reduce(
          (n, r) => n + (new Date(r.resolved_at) - new Date(r.created_at)),
          0,
        ) /
          done.length /
          3600e3) *
          10,
      ) / 10
    : null;
  const act = s.bookings.filter(
    (b) => b.is_exclusive && ["confirmed", "checked_in"].includes(b.status),
  );
  let conflicts = 0;
  for (let i = 0; i < act.length; i++)
    for (let j = i + 1; j < act.length; j++)
      if (
        act[i].amenity_id === act[j].amenity_id &&
        new Date(act[i].start_at) < new Date(act[j].end_at) &&
        new Date(act[i].end_at) > new Date(act[j].start_at)
      )
        conflicts++;
  const sc = {};
  rq.forEach((r) => {
    sc[r.status] = (sc[r.status] || 0) + 1;
  });
  return {
    total_requests: rq.length,
    completed_requests:
      done.length +
      rq.filter((r) => r.status === "completed" && !r.resolved_at).length,
    avg_resolution_hours: avg,
    status_counts: sc,
    tickets_by_property: [...s.properties]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        name: p.name,
        pending: rq.filter(
          (r) => r.property_id === p.id && r.status === "pending",
        ).length,
        in_progress: rq.filter(
          (r) => r.property_id === p.id && r.status === "in_progress",
        ).length,
        completed: rq.filter(
          (r) => r.property_id === p.id && r.status === "completed",
        ).length,
      })),
    bookings_by_amenity: [...s.amenities]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({
        name: a.name,
        bookings: s.bookings.filter((b) => b.amenity_id === a.id).length,
      })),
    booking_conflicts: conflicts,
  };
}

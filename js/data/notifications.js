import { db, commit, me, paginate } from "../store.js";
import { PAGE_SIZE } from "../config.js";
import { R, currentRole } from "../routes.js";

export async function listNotifications({
  unreadOnly = false,
  page = 0,
  pageSize = PAGE_SIZE,
} = {}) {
  const u = me();
  const rows = db()
    .notifications.filter(
      (n) => n.user_id === u.id && (!unreadOnly || !n.is_read),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginate(rows, page, pageSize);
}
export const unreadCount = (userId) =>
  db().notifications.filter((n) => n.user_id === userId && !n.is_read).length;
export const markRead = async (id) => {
  const u = me();
  const n = db().notifications.find((x) => x.id === id && x.user_id === u.id);
  if (n) {
    n.is_read = true;
    commit();
  }
};
export const markAllRead = async () => {
  const u = me();
  db().notifications.forEach((n) => {
    if (n.user_id === u.id) n.is_read = true;
  });
  commit();
};
export function notificationLink(n) {
  if (n.related_entity_type === "maintenance_request" && n.related_entity_id)
    return `${R("request")}?id=${n.related_entity_id}`;
  if (n.related_entity_type === "booking")
    return R("bookings") === "#" ? null : R("bookings");
  if (n.related_entity_type === "property")
    return currentRole() === "tenant" ? R("property") : null;
  return null;
}

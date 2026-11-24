import { boot, load } from "../page.js";
import {
  listNotifications,
  markRead,
  markAllRead,
  notificationLink,
} from "../data/notifications.js";
import { subscribe } from "../realtime.js";
import { html, render, $, icon, timeAgo, friendlyError } from "../utils.js";
import { pageHead, emptyState, pager, toast, withBusy } from "../ui.js";

const { user, view } = await boot({ roles: [], title: "Notifications" });
let unreadOnly = false,
  page = 0;
render(
  view,
  html`${pageHead(
      "Notifications",
      "Updates on your requests and bookings",
      '<button class="btn secondary" id="all" data-busy="Marking…">Mark all as read</button>',
    )}
    <div class="toolbar">
      <div class="tabs">
        <button data-f="all" aria-selected="true">All</button
        ><button data-f="unread" aria-selected="false">Unread</button>
      </div>
    </div>
    <section class="card" id="list"></section>`,
);
async function draw() {
  const res = await listNotifications({ unreadOnly, page });
  render(
    $("#list"),
    html`${res.rows.length
      ? res.rows.map(
          (n) =>
            html`<div
              class="notif ${n.is_read ? "" : "unread"}"
              data-id="${n.id}"
              data-href="${notificationLink(n) || ""}"
              tabindex="0"
              role="link"
            >
              <span class="pip"></span>
              <div class="grow">
                <strong>${n.title}</strong>
                <div class="small">${n.message}</div>
                <div class="xs muted">${timeAgo(n.created_at)}</div>
              </div>
            </div>`,
        )
      : emptyState({
          title: unreadOnly ? "You're all caught up" : "No notifications yet",
          text: "New activity shows up here in real time.",
          ico: "bell",
        })}${pager({ page, pageSize: 10, total: res.total })}`,
  );
}
const refresh = (s = true) => load($("#list"), draw, { skeleton: s });
view.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-f]");
  if (t) {
    unreadOnly = t.dataset.f === "unread";
    page = 0;
    view
      .querySelectorAll("[data-f]")
      .forEach((b) => b.setAttribute("aria-selected", b === t));
    return refresh();
  }
  const p = e.target.closest("[data-page]");
  if (p) {
    page = Number(p.dataset.page);
    return refresh();
  }
  if (e.target.closest("#all"))
    return withBusy($("#all"), async () => {
      try {
        await markAllRead();
        toast("All notifications marked as read.", "success");
        await refresh(false);
      } catch (ex) {
        toast(friendlyError(ex), "error");
      }
    });
  const n = e.target.closest(".notif");
  if (n) {
    try {
      if (n.classList.contains("unread")) await markRead(n.dataset.id);
    } catch {
      /* navigation still proceeds */
    }
    if (n.dataset.href) location.assign(n.dataset.href);
    else refresh(false);
  }
});
view.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList?.contains("notif"))
    e.target.click();
});
await refresh();
subscribe([{ table: "notifications", filter: `user_id=eq.${user.id}` }], () =>
  refresh(false),
);

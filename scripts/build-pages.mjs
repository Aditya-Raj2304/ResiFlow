// Generates the thin HTML shells for the authenticated pages using the PRD file names.
// Each shell loads one ES module from js/pages/ and declares which roles may open it (data-roles).
// Admin pages live in /admin and use <base href="../"> so every asset/link resolves from the project root.
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
const T = "tenant",
  M = "manager",
  A = "admin";
// [file, module, title, roles]
const pages = [
  // 4.2 Tenant
  ["tenant-dashboard", "dashboard", "Dashboard", [T]],
  ["tenant-property", "my-property", "My property", [T]],
  ["maintenance", "maintenance", "Maintenance", [T]],
  ["create-request", "create-request", "New request", [T]],
  ["request-details", "request-details", "Request details", [T]],
  ["amenities", "amenities", "Amenities", [T]],
  ["booking", "book-amenity", "Book amenity", [T]],
  ["my-bookings", "my-bookings", "My bookings", [T]],
  ["notifications", "notifications", "Notifications", [T, A]],
  ["profile", "profile", "Profile", [T, A]],
  // 4.3 Manager
  ["manager-dashboard", "manager-dashboard", "Dashboard", [M]],
  ["manager-properties", "manager-properties", "Properties", [M]],
  ["manager-property-details", "manager-property", "Property details", [M, A]],
  ["manager-tenants", "manager-tenants", "Tenants", [M]],
  ["manager-maintenance", "maintenance", "Maintenance", [M]],
  ["manager-request-details", "request-details", "Request details", [M]],
  ["manager-amenities", "manager-amenities", "Amenities", [M]],
  ["manager-schedule", "manager-schedule", "Schedule", [M]],
  ["manager-bookings", "bookings", "Bookings", [M]],
  ["manager-notifications", "notifications", "Notifications", [M]],
  ["manager-profile", "profile", "Profile", [M]],
  // 4.4 Admin (in /admin)
  ["admin/admin-dashboard", "admin-dashboard", "Dashboard", [A]],
  ["admin/admin-users", "admin-users", "Users", [A]],
  ["admin/admin-properties", "admin-properties", "Properties", [A]],
  ["admin/admin-maintenance", "maintenance", "Maintenance", [A]],
  ["admin/admin-request-details", "request-details", "Request details", [A]],
  ["admin/admin-amenities", "manager-amenities", "Amenities", [A]],
  ["admin/admin-bookings", "bookings", "Bookings", [A]],
  ["admin/admin-reports", "admin-reports", "Reports", [A]],
];
// remove superseded names from earlier builds
for (const f of [
  "dashboard",
  "my-property",
  "book-amenity",
  "manager-property",
  "bookings",
  "admin-dashboard",
  "admin-users",
  "admin-properties",
  "admin-reports",
])
  if (existsSync(`${f}.html`)) rmSync(`${f}.html`);
mkdirSync("admin", { recursive: true });
for (const [file, mod, title, roles] of pages) {
  const admin = file.startsWith("admin/");
  writeFileSync(
    `${file}.html`,
    `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
${admin ? '<base href="../">\n' : ""}<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · ResiFlow</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400;0,500;1,500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/app.css">
</head>
<body data-roles="${roles.join(",")}">
<div id="app"><div class="state" aria-busy="true"><span class="spinner"></span><p>Loading…</p></div></div>
<div id="toasts" aria-live="polite"></div>
<noscript><p style="padding:24px">ResiFlow needs JavaScript enabled.</p></noscript>
<script type="module" src="js/pages/${mod}.js"></script>
</body>
</html>
`,
  );
}
console.log(`wrote ${pages.length} pages`);

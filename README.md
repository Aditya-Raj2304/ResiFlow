# ResiFlow — Frontend-only build, ROYAL black theme (HTML + CSS + JavaScript)

No backend, no database, no build step. All data lives in the browser (`localStorage`), seeded with demo data from `js/store.js`. Open it through any static server (ES modules need http, not `file://`):

```
npx serve . -l 3000     # then open http://localhost:3000/login.html
```
Or deploy the folder as-is to Vercel / Netlify / GitHub Pages.

## Hardcoded demo credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@resiflow.com | Admin@123 |
| Manager | manager@resiflow.com | Manager@123 |
| Tenant | tenant@resiflow.com | Tenant@123 |
| Tenant 2 | tenant2@resiflow.com | Tenant@123 |

They are shown on the login page (toggle with `SHOW_DEMO_LOGINS` in `js/config.js`). "Reset demo data" on the login page restores the seed.
You can also sign up: new accounts are always tenants. An admin links them to a property (Admin → Properties → Tenants) and can promote roles (Admin → Users).

## What works
- Role-based pages: tenant, manager, admin (guards redirect by role)
- Maintenance: create (file names only), filter/search/paginate, assign, start, post notes, complete with required resolution notes, history timeline
- Amenity booking: calendar, slot grid, exclusive and capacity modes, conflict/capacity/past/60-day rules, cancel, check-in (opens 15 min before), check-out
- Manager: amenities CRUD, bookings, day schedule, tenants. Admin: users/roles, properties CRUD, tenant linking, reports with hand-built SVG charts
- Notifications with unread badge; dark mode; responsive layout with mobile drawer
- "Live" updates: changes made in one browser tab appear in other open tabs (BroadcastChannel)

## Important limitations (read these)
- **Not secure, by design.** Credentials and data are in the browser, so anyone with the files can read them. Use this for demos and design work only.
- Data is per browser/device and is not shared between people. Clearing site data resets it.
- Attachments: only file names are stored; previews are unavailable.
- Password reset is simulated (no email).
- localStorage has a ~5 MB limit.
- Tested: static audit (`node scripts/check.mjs`), every page rendering per role with zero console errors, and end-to-end flows in headless Chromium (login/guards, request lifecycle, manager workflow, booking conflicts between two tenants, admin reports/users, sign-up). Not tested on other browsers or real devices.

## Layout
`index/login/signup/forgot-password/reset-password.html` public · `dashboard…` tenant · `manager-*.html` · `admin-*.html` · shared: `maintenance`, `request-details`, `bookings`, `notifications`, `profile`
`css/app.css` design system · `js/store.js` local data + rules · `js/data/*.js` data functions · `js/pages/*.js` one module per page · `scripts/check.mjs` audit

## Theme (ROYAL)
Styled after the supplied screen recording: pure black, white square buttons, uppercase grotesk headings (Inter Tight), italic wordmark, full-bleed photography.
- `css/app.css` = design system + ROYAL overrides for the app (sidebar, tables, forms, badges). A light variant exists behind the sun/moon toggle.
- `css/royal.css` = landing page and auth pages. `index.html` has: hero slideshow with thumbnails, property showcases, story split, communities marquee, testimonials carousel, journal cards, CTA band, subscribe footer.
- **Photos** are hotlinked from Unsplash (set per block via an inline `--img:url(...)`) with a dark gradient underneath, so layouts hold if a photo fails to load. Replace them with your own files (e.g. `assets/hero1.jpg`) for production.
- **Placeholder content to replace:** testimonials (marked "Sample content"), journal titles, footer phone/email/address, social links. The subscribe form only saves to this browser.

## Update: PRD page map, landing improvements
- **All PRD pages now exist** with the PRD file names: tenant-dashboard, tenant-property, amenities, booking, my-bookings, maintenance, request-details, create-request, notifications, profile; manager-dashboard, manager-properties, manager-property-details, manager-tenants, manager-maintenance, manager-request-details, manager-amenities, manager-schedule, manager-bookings, manager-notifications, manager-profile; admin/admin-dashboard, admin-users, admin-properties, admin-maintenance, admin-request-details, admin-amenities, admin-bookings, admin-reports; plus login, signup, forgot/reset-password. Extras: `community.html`, `article.html`.
- Landing: sticky card-stack effect, dark scrim behind the nav that turns into a solid black bar after the stack, clickable property/community/journal cards, communities strip scrolls sideways with mouse wheel (hover), drag or arrows, rebuilt testimonials.
- The landing and public detail pages work by double-click (classic scripts). The app pages (login onward) need a local server: `npx serve .`
- Photos are hot-linked from Unsplash; testimonials and journal articles are sample content to replace (`js/site-data.js`, `js/landing.js`).

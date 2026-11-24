// Role-aware page routes using the PRD file names. Admin pages live in /admin and use <base href="../">,
// so every path below is relative to the project root and works from any page.
export const ROUTES = {
  tenant: { home: 'tenant-dashboard.html', property: 'tenant-property.html', amenities: 'amenities.html', book: 'booking.html', bookings: 'my-bookings.html',
    maintenance: 'maintenance.html', request: 'request-details.html', createRequest: 'create-request.html', notifications: 'notifications.html', profile: 'profile.html' },
  manager: { home: 'manager-dashboard.html', properties: 'manager-properties.html', propertyDetail: 'manager-property-details.html', tenants: 'manager-tenants.html',
    maintenance: 'manager-maintenance.html', request: 'manager-request-details.html', amenities: 'manager-amenities.html', schedule: 'manager-schedule.html',
    bookings: 'manager-bookings.html', notifications: 'manager-notifications.html', profile: 'manager-profile.html' },
  admin: { home: 'admin/admin-dashboard.html', users: 'admin/admin-users.html', properties: 'admin/admin-properties.html', propertyDetail: 'manager-property-details.html',
    maintenance: 'admin/admin-maintenance.html', request: 'admin/admin-request-details.html', amenities: 'admin/admin-amenities.html', bookings: 'admin/admin-bookings.html',
    reports: 'admin/admin-reports.html', notifications: 'notifications.html', profile: 'profile.html' },
};
export const setRole = (role) => { document.documentElement.dataset.role = role; };
export const currentRole = () => document.documentElement.dataset.role || 'tenant';
// R('request') → the right request-details page for the signed-in role
export const R = (key) => ROUTES[currentRole()]?.[key] || ROUTES.tenant[key] || '#';
export const fileOf = (p) => String(p).split('/').pop();
// path of the current page relative to the site root (e.g. "admin/admin-users.html?x=1")
export const relPath = () => location.href.slice(document.baseURI.replace(/[^/]*$/, '').length);

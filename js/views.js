// Reusable HTML fragments (all interpolations are auto-escaped by html``).
import { html, raw, icon, fmtDate, fmtTime, fmtDateTime, timeAgo, titleCase, initials } from './utils.js';
import { statusBadge, priorityBadge } from './ui.js';
import { R } from './routes.js';

export const statCard = (ico, label, value, tone = '') => html`<div class="card stat"><div class="ico" ${tone ? raw(`style="background:var(--${tone}-soft);color:var(--${tone})"`) : ''}>${icon(ico, 22)}</div><div><div class="num">${value}</div><div class="small muted">${label}</div></div></div>`;

export const requestRow = (r, { showProperty = false, showCreator = false } = {}) => html`
  <a class="list-item" href="${R('request')}?id=${r.id}">
    <div class="grow"><div class="row wrap" style="gap:8px"><strong class="truncate">${r.title}</strong>${priorityBadge(r.priority)}</div>
      <div class="small muted truncate">${r.category}${showProperty && r.property ? ` · ${r.property.name}` : ''}${showCreator && r.creator ? ` · ${r.creator.full_name || r.creator.email}` : ''} · ${timeAgo(r.created_at)}</div></div>
    ${statusBadge(r.status)}</a>`;

const tz = (b) => b.property?.timezone || 'Asia/Kolkata';
export const bookingTimeText = (b) => `${fmtDate(b.start_at, tz(b))} · ${fmtTime(b.start_at, tz(b))} – ${fmtTime(b.end_at, tz(b))}`;

export const bookingRow = (b, { actions = '', showUser = false } = {}) => html`
  <div class="list-item"><div class="avatar">${icon('pool', 18)}</div>
    <div class="grow"><strong class="truncate">${b.amenity?.name || 'Amenity'}</strong>
      <div class="small muted">${bookingTimeText(b)} · ${b.participants} guest${b.participants > 1 ? 's' : ''}${showUser && b.booker ? ` · ${b.booker.full_name || b.booker.email}` : ''}</div>
      ${b.property ? html`<div class="xs muted">${b.property.name}</div>` : ''}</div>
    ${statusBadge(b.status)}${raw(actions)}</div>`;

export const propertyCard = (p, href) => html`
  <a class="card hover" href="${href}" style="display:block;color:inherit;text-decoration:none">
    <div class="cover">${p.image_url ? html`<img src="${p.image_url}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</div>
    <div class="card-pad"><h3>${p.name}</h3><p class="small muted">${p.address_line}, ${p.city}, ${p.state} ${p.postal_code}</p>
      <div class="small row" style="margin-top:10px;gap:14px"><span>${icon('building', 14)} ${p.unit_count} units</span>${p.manager ? html`<span>${icon('user', 14)} ${p.manager.full_name}</span>` : html`<span class="muted">No manager</span>`}</div></div></a>`;

export const noPropertyState = () => html`<div class="card"><div class="state"><div class="state-icon">${icon('building', 24)}</div><h3>No property linked yet</h3><p>Your account isn't linked to a property. Ask your property administrator to link you, then refresh.</p></div></div>`;

export const personCell = (name, sub = '') => html`<div class="row"><span class="avatar">${initials(name)}</span><div><div><strong>${name || '—'}</strong></div>${sub ? html`<div class="xs muted">${sub}</div>` : ''}</div></div>`;
export { fmtDate, fmtDateTime, titleCase };

/* Public site content (communities + journal). Plain classic script so the landing pages work even without a server.
   SAMPLE CONTENT: replace the text, numbers and photos with your own. */
(function () {
  var u = function (id, w) { return 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=' + (w || 1600) + '&q=72'; };
  window.SITE = {
    communities: [
      { id: 'lakeview', name: 'Lakeview Residency', city: 'Ranchi, Jharkhand', address: '14 Kanke Road, Ranchi 834008', hero: u('photo-1600596542815-ffad4c1539a9'), card: u('photo-1600566753190-17f0baa2a6c3', 900), units: 48, year: 2019,
        summary: 'Modern apartments near the lake with a rooftop pool, fitness studio and community hall.',
        about: ['Lakeview Residency is a 48-unit building set a short walk from the water. Apartments are bright, well ventilated and finished to a calm, minimal standard.',
          'Residents book the rooftop pool, fitness studio and community hall by the slot, and report maintenance issues in seconds. The building manager sees every request and booking live.'],
        amenities: ['Rooftop pool (private slots)', 'Fitness studio (8 per hour)', 'Community hall (up to 40 guests)', '24/7 maintenance requests', 'Visitor parking'] },
      { id: 'hillcrest', name: 'Hillcrest Heights', city: 'Jamshedpur, Jharkhand', address: '22 Bistupur Main Road, Jamshedpur 831001', hero: u('photo-1564013799919-ab600027ffc6'), card: u('photo-1502672260266-1c1ef2d93688', 900), units: 24, year: 2016,
        summary: 'Quiet low-rise homes with landscaped gardens in the heart of Bistupur.',
        about: ['Hillcrest Heights is a low-rise community of 24 homes arranged around shared gardens. It is quiet, green and close to everything in Bistupur.',
          'Maintenance requests are tracked from the first report to the fix, with updates posted straight to the resident.'],
        amenities: ['Landscaped gardens', 'Covered parking', 'Maintenance tracking', 'Resident notifications'] },
      { id: 'garden-court', name: 'Garden Court', city: 'Sample community', address: 'Sample address', hero: u('photo-1600607687939-ce8a6c25118c'), card: u('photo-1560448204-e02f11c3d0e2', 900), units: 36, year: 2021,
        summary: 'Sunlit apartments around a central courtyard garden.',
        about: ['Garden Court is a sample listing that shows how a community page looks. Replace this text with the real description of your property.', 'Add your own photos, unit counts and amenities in js/site-data.js.'],
        amenities: ['Courtyard garden', 'Co-working lounge', 'Bike storage', 'Rooftop terrace'] },
      { id: 'riverside-towers', name: 'Riverside Towers', city: 'Sample community', address: 'Sample address', hero: u('photo-1512917774080-9991f1c4c750'), card: u('photo-1493809842364-78817add7ffb', 900), units: 120, year: 2022,
        summary: 'High-rise living with river views and a full amenity floor.',
        about: ['Riverside Towers is a sample listing for a larger high-rise community. Replace this text with your own property details.', 'Amenity booking and maintenance tracking work the same way at any scale.'],
        amenities: ['Sky lounge', 'Infinity pool', 'Gym and yoga studio', 'Concierge desk'] },
      { id: 'the-residences', name: 'The Residences', city: 'Sample community', address: 'Sample address', hero: u('photo-1613490493576-7fde63acd811'), card: u('photo-1600585154340-be6161a56a0c', 900), units: 12, year: 2023,
        summary: 'A boutique collection of private villas with a shared pool house.',
        about: ['The Residences is a sample listing for a boutique villa community. Replace this text with the real story of your property.', 'Exclusive amenities such as the pool house are booked by time slot, so they are never double-booked.'],
        amenities: ['Shared pool house', 'Private gardens', 'Security gate', 'Resident app'] }
    ],
    articles: [
      { id: 'real-time-maintenance', category: 'Article', title: 'How real-time maintenance tracking shortens resolution times', image: u('photo-1600566753190-17f0baa2a6c3', 900), hero: u('photo-1600566753190-17f0baa2a6c3'), read: '4 min read',
        body: ['Most delays in building maintenance are not caused by the repair itself. They happen in the gaps: a request that sits unseen, a technician who was never told, a resident who has no idea whether anyone is coming.',
          'Real-time tracking closes those gaps. When a resident submits a request, the property manager is notified instantly. Assigning it, starting work and completing it each leave a timestamped trail the resident can see without calling anyone.',
          'The result is fewer follow-up calls and faster fixes. Managers spend their time on the work, not on status updates, and residents feel looked after because they can see progress.',
          'A good rule of thumb: every request should always be in exactly one of three states (pending, in progress or completed), and the person who owns the next step should be obvious at a glance.'] },
      { id: 'conflict-free-booking', category: 'Insight', title: 'Why conflict-free amenity booking keeps residents happy', image: u('photo-1502672260266-1c1ef2d93688', 900), hero: u('photo-1502672260266-1c1ef2d93688'), read: '3 min read',
        body: ['Few things annoy residents more than arriving at the pool to find someone else already there. Double bookings are almost always a process problem, not a people problem.',
          'Slot-based booking solves it. Each amenity has opening hours, a slot length and a capacity. Exclusive spaces such as a hall allow one booking per slot; shared spaces such as a gym allow several, up to a limit.',
          'The rule that matters most is that the system itself refuses an overlap, even when two residents tap Confirm at the same moment. When the rules live in the system, nobody has to police the calendar.'] },
      { id: 'one-live-dashboard', category: 'Article', title: 'Inside a building run from one shared, live dashboard', image: u('photo-1512917774080-9991f1c4c750', 900), hero: u('photo-1512917774080-9991f1c4c750'), read: '5 min read',
        body: ['Picture a manager starting the day. Instead of a notebook and three chat groups, there is one screen: pending requests, today’s amenity schedule and anything that changed overnight.',
          'Because the dashboard updates live, a new request or a cancelled booking appears the moment it happens. There is nothing to refresh and nothing to reconcile.',
          'Owners get the same data as reports: how long repairs take, which properties raise the most tickets and how well amenities are used. Decisions stop being guesses.',
          'The best part is how little training it takes. Residents, managers and administrators each see only what they need.'] }
    ]
  };
})();

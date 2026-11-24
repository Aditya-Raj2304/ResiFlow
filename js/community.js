(function () {
  var U = window.SITE_UI, S = window.SITE, id = U.param('id');
  var c = S.communities.filter(function (x) { return x.id === id; })[0];
  var root = document.getElementById('page');
  document.getElementById('top').innerHTML = U.nav; document.getElementById('bottom').innerHTML = U.footer; U.wire();
  if (!c) { root.innerHTML = '<section class="d-empty"><h1>Community not found</h1><p>That listing doesn’t exist.</p><a class="r-btn" href="index.html#communities">Back to communities</a></section>'; return; }
  document.title = c.name + ' · ResiFlow';
  var others = S.communities.filter(function (x) { return x.id !== c.id; }).slice(0, 3).map(function (x) {
    return '<a class="r-comm-card" href="community.html?id=' + x.id + '"><div class="pic photo" style="--img:url(\'' + x.card + '\')"></div><span>' + U.esc(x.name) + '</span></a>';
  }).join('');
  root.innerHTML =
    '<section class="d-hero photo" style="--img:url(\'' + c.hero + '\');--shade:.5"><div class="d-hero-in"><span class="r-label">' + U.esc(c.city) + '</span><h1>' + U.esc(c.name) + '</h1><p>' + U.esc(c.summary) + '</p>' +
    '<div class="btns"><a class="r-btn" href="signup.html">Create resident account</a><a class="r-btn ghost" href="login.html">Sign in to book</a></div></div></section>' +
    '<section class="d-body"><div><span class="r-label">About</span><h2>' + U.esc(c.summary) + '</h2>' + c.about.map(function (p) { return '<p>' + U.esc(p) + '</p>'; }).join('') + '</div>' +
    '<aside><dl class="d-facts"><div><dt>Address</dt><dd>' + U.esc(c.address) + '</dd></div><div><dt>Homes</dt><dd>' + c.units + '</dd></div><div><dt>Built</dt><dd>' + c.year + '</dd></div></dl>' +
    '<h3 class="d-h3">Amenities & services</h3><ul class="d-list">' + c.amenities.map(function (a) { return '<li>' + U.esc(a) + '</li>'; }).join('') + '</ul></aside></section>' +
    '<section class="d-more"><h2>More communities</h2><div class="d-row">' + others + '</div></section>';
})();

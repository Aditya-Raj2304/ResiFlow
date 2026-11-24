(function () {
  var U = window.SITE_UI, S = window.SITE, id = U.param('id');
  var a = S.articles.filter(function (x) { return x.id === id; })[0];
  var root = document.getElementById('page');
  document.getElementById('top').innerHTML = U.nav; document.getElementById('bottom').innerHTML = U.footer; U.wire();
  if (!a) { root.innerHTML = '<section class="d-empty"><h1>Article not found</h1><p>That article doesn’t exist.</p><a class="r-btn" href="index.html#journal">Back to the journal</a></section>'; return; }
  document.title = a.title + ' · ResiFlow';
  var more = S.articles.filter(function (x) { return x.id !== a.id; }).map(function (x) {
    return '<a class="r-card" href="article.html?id=' + x.id + '"><div class="pic photo" style="--img:url(\'' + x.image + '\')"></div><small>' + U.esc(x.category) + '</small><h3>' + U.esc(x.title) + '</h3></a>';
  }).join('');
  root.innerHTML =
    '<article class="d-article"><a class="d-back" href="index.html#journal">← Journal</a><span class="r-label">' + U.esc(a.category) + ' · ' + U.esc(a.read) + '</span><h1>' + U.esc(a.title) + '</h1>' +
    '<div class="pic photo d-cover" style="--img:url(\'' + a.hero + '\');--shade:.1" role="img" aria-label="' + U.esc(a.title) + '"></div>' +
    a.body.map(function (p) { return '<p>' + U.esc(p) + '</p>'; }).join('') + '<p class="r-sample">Sample article · replace with your own writing</p></article>' +
    '<section class="d-more"><h2>Keep reading</h2><div class="r-cards">' + more + '</div></section>';
})();

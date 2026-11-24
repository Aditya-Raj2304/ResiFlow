/* Shared nav + footer for the public detail pages (community.html, article.html). Classic script, no modules needed. */
(function () {
  var logo = '<a class="r-logo" href="index.html">ResiFlow</a>';
  window.SITE_UI = {
    nav: '<header class="r-nav solid" id="nav">' + logo +
      '<nav class="r-links" id="links" aria-label="Primary"><a href="index.html#about">About</a><a href="index.html#communities">Properties</a><a href="index.html#journal">Journal</a><a href="index.html#contact">Contact</a><a class="r-btn" href="login.html">Sign in</a></nav>' +
      '<button class="r-burger" id="burger" aria-label="Menu" aria-expanded="false">☰</button></header>',
    footer: '<footer class="r-footer" id="contact"><div class="r-footer-in"><div>' + logo + '<p class="lead">Residences, run beautifully.</p><a class="r-btn" href="signup.html">Create account</a></div>' +
      '<div><h4>Pages</h4><ul><li><a href="index.html">Home</a></li><li><a href="index.html#communities">Communities</a></li><li><a href="index.html#journal">Journal</a></li><li><a href="login.html">Sign in</a></li></ul></div>' +
      '<div><h4>Socials</h4><ul><li><a href="#">Instagram</a></li><li><a href="#">LinkedIn</a></li></ul></div>' +
      '<div class="r-contact"><div><h4>Email</h4><span class="txt">hello@resiflow.com</span></div><div><h4>Phone</h4><span class="txt">+91 00000 00000</span></div></div></div>' +
      '<div class="r-footer-in r-bottom" style="display:flex"><span>Images: <b>Unsplash</b></span><span>© All rights reserved</span></div></footer>',
    wire: function () {
      var b = document.getElementById('burger'), l = document.getElementById('links');
      if (b) b.addEventListener('click', function () { var o = l.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
    },
    esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    param: function (n) { return new URLSearchParams(location.search).get(n); }
  };
})();

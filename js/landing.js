/* Landing behaviour. Classic script (works without a server). */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nav = $('#nav'), stack = $('.r-stack'), cards = $$('.r-cs');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* burger */
  var b = $('#burger'), l = $('#links');
  if (b) b.addEventListener('click', function () { var o = l.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
  $$('#links a').forEach(function (a) { a.addEventListener('click', function () { l.classList.remove('open'); }); });

  /* card stack + nav bar */
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    cards.forEach(function (c, i) {
      var n = cards[i + 1], p = 0;
      if (n) { var t = n.getBoundingClientRect().top; p = Math.min(1, Math.max(0, 1 - t / vh)); }
      c.style.setProperty('--p', p.toFixed(3));
    });
    var end = stack.offsetTop + stack.offsetHeight - vh;
    nav.classList.toggle('solid', window.scrollY >= end - 4);
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); update();

  /* hero slideshow */
  var slides = $$('.r-slide'), thumbs = $$('#thumbs button'), cur = 0, timer;
  function show(i) { cur = (i + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('on', k === cur); }); thumbs.forEach(function (t, k) { t.classList.toggle('on', k === cur); }); }
  thumbs.forEach(function (t, k) { t.addEventListener('click', function () { show(k); restart(); }); });
  function restart() { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(cur + 1); }, 6000); }
  restart();

  /* communities: horizontal scroll */
  var sc = $('#scroller');
  if (sc) {
    sc.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; /* trackpad sideways already native */
      var max = sc.scrollWidth - sc.clientWidth;
      if ((d < 0 && sc.scrollLeft <= 0) || (d > 0 && sc.scrollLeft >= max - 1)) return; /* at an end: let the page scroll on */
      e.preventDefault(); sc.scrollLeft += d;
    }, { passive: false });
    var down = false, sx = 0, sl = 0, moved = false;
    sc.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; down = true; moved = false; sx = e.clientX; sl = sc.scrollLeft; });
    addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; sc.classList.add('drag'); } if (moved) sc.scrollLeft = sl - dx; });
    addEventListener('pointerup', function () { down = false; sc.classList.remove('drag'); });
    sc.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    sc.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') sc.scrollBy({ left: 380, behavior: 'smooth' }); if (e.key === 'ArrowLeft') sc.scrollBy({ left: -380, behavior: 'smooth' }); });
    var step = function () { return Math.min(sc.clientWidth * .8, 400); };
    $('#cprev').addEventListener('click', function () { sc.scrollBy({ left: -step(), behavior: 'smooth' }); });
    $('#cnext').addEventListener('click', function () { sc.scrollBy({ left: step(), behavior: 'smooth' }); });
  }

  /* testimonials (sample content) */
  var T = [
    { q: 'I report an issue, see it move to in progress, and it is fixed before I have to chase anyone.', n: 'Resident', r: 'Tenant · maintenance' },
    { q: 'Booking the clubhouse takes seconds, and the slot is simply gone for everyone else. No more clashes or phone calls.', n: 'Resident', r: 'Tenant · amenities' },
    { q: 'One live dashboard shows what is pending, who is assigned and what is booked today. I start my day knowing exactly where things stand.', n: 'Property manager', r: 'Manager · operations' }
  ];
  var qEl = $('#quote'); if (qEl) {
    var ti = 0, tt, voices = $('#voices'), prog = $('#tprog');
    T.forEach(function (t, k) { var bt = document.createElement('button'); bt.type = 'button'; bt.innerHTML = '<b></b><span></span>'; bt.firstChild.textContent = t.n; bt.lastChild.textContent = t.r; bt.addEventListener('click', function () { setT(k); }); voices.appendChild(bt); });
    function setT(i) {
      ti = (i + T.length) % T.length; var t = T[ti];
      qEl.textContent = '“' + t.q + '”'; $('#who').textContent = t.n; $('#role').textContent = t.r; $('#tav').textContent = t.n.charAt(0);
      $('#tcount').textContent = '0' + (ti + 1) + ' / 0' + T.length;
      $$('button', voices).forEach(function (x, k) { x.classList.toggle('on', k === ti); });
      prog.classList.remove('run'); void prog.offsetWidth; if (!reduce) prog.classList.add('run');
      clearInterval(tt); if (!reduce) tt = setInterval(function () { setT(ti + 1); }, 7000);
    }
    $('#prev').addEventListener('click', function () { setT(ti - 1); }); $('#next').addEventListener('click', function () { setT(ti + 1); });
    var m = $('#tmain'); m.addEventListener('mouseenter', function () { clearInterval(tt); prog.classList.remove('run'); }); m.addEventListener('mouseleave', function () { setT(ti); });
    setT(0);
  }

  /* subscribe (stored locally, demo) */
  var f = $('#sub'); if (f) f.addEventListener('submit', function (e) {
    e.preventDefault(); var em = f.querySelector('input').value.trim(), msg = $('#sub-msg');
    try { var a = JSON.parse(localStorage.getItem('resiflow-subscribers') || '[]'); if (a.indexOf(em) < 0) a.push(em); localStorage.setItem('resiflow-subscribers', JSON.stringify(a)); } catch (x) {}
    msg.textContent = 'Thanks, you are on the list (saved in this browser only).'; f.reset();
  });
})();

/* Müşteri sunumu görüntüleyici: ok düğmeleri, klavye, kaydırma, tam ekran, #numara ile doğrudan slayt.
   Yalnız komşu slaytlar yüklenir. Sağ tık, sürükleme, kopyalama, Ctrl+S ve Ctrl+P engellenir (caydırıcı). */
(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slayt'));
  var n = slides.length;
  if (!n) return;
  var i = 0;
  var no = document.getElementById('no');
  var bar = document.getElementById('cubuk');
  var prev = document.getElementById('geri');
  var next = document.getElementById('ileri');
  var frame = document.getElementById('cerceve');
  var stage = document.getElementById('sahne');
  var fsBtn = document.getElementById('tam');

  function load(k) {
    var s = slides[k];
    if (s && !s.getAttribute('src') && s.dataset.src) s.src = s.dataset.src;
  }

  function go(k) {
    k = Math.max(0, Math.min(n - 1, k));
    slides[i].classList.remove('aktif');
    slides[i].setAttribute('aria-hidden', 'true');
    i = k;
    load(i); load(i + 1); load(i - 1);
    slides[i].classList.add('aktif');
    slides[i].removeAttribute('aria-hidden');
    no.textContent = i + 1;
    bar.style.width = ((i + 1) / n * 100) + '%';
    prev.disabled = i === 0;
    next.disabled = i === n - 1;
    if (history.replaceState) history.replaceState(null, '', '#' + (i + 1));
  }

  prev.addEventListener('click', function () { go(i - 1); });
  next.addEventListener('click', function () { go(i + 1); });

  // Slayta tıklama: sol üçte bir geri, kalanı ileri
  frame.addEventListener('click', function (e) {
    var r = frame.getBoundingClientRect();
    go(i + (e.clientX - r.left < r.width / 3 ? -1 : 1));
  });

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'S' || k === 'p' || k === 'P')) { e.preventDefault(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var onButton = e.target && e.target.tagName === 'BUTTON';
    if (onButton && (k === 'Enter' || k === ' ')) return;   // düğme kendi tıklamasını işler
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); go(i + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); go(i - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(n - 1); }
    else if ((k === 'f' || k === 'F') && !fsBtn.hidden) { toggleFullscreen(); }
  });

  // Dokunmatik kaydırma
  var x0 = null, y0 = null;
  stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
    x0 = y0 = null;
  });

  // İndirmeyi zorlaştır
  ['contextmenu', 'dragstart', 'copy', 'selectstart'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); });
  });

  // Tam ekran (desteklenmeyen tarayıcıda düğme gizli kalır, ör. iPhone Safari)
  var root = document.documentElement;
  var canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  function toggleFullscreen() {
    if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
      var req = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      // Dokunmatik ekranda tam ekrana geçince yatay konuma kilitle (Android Chrome); desteklenmezse sessizce geçer
      if (req && req.then && screen.orientation && screen.orientation.lock && window.matchMedia('(pointer: coarse)').matches) {
        req.then(function () { return screen.orientation.lock('landscape'); }).catch(function () {});
      }
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }
  if (canFs) { fsBtn.hidden = false; fsBtn.addEventListener('click', toggleFullscreen); }

  // Telefon yan çevrilince kontroller 2,5 sn sonra gizlenir; dokunma, fare ya da tuşla geri gelir
  var box = document.querySelector('.sunum');
  var compact = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
  var hideTimer = null;
  function wake() {
    box.classList.remove('gizle');
    clearTimeout(hideTimer);
    if (compact.matches) hideTimer = setTimeout(function () { box.classList.add('gizle'); }, 2500);
  }
  ['touchstart', 'mousemove', 'keydown'].forEach(function (t) { document.addEventListener(t, wake, { passive: true }); });
  if (compact.addEventListener) compact.addEventListener('change', wake); else if (compact.addListener) compact.addListener(wake);
  wake();

  var start = parseInt(location.hash.slice(1), 10);
  go(isFinite(start) ? start - 1 : 0);
})();

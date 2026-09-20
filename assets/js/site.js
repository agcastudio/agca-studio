/* agca·studio — menü, süzgeç, büyütme. Bağımlılık yok (GLightbox yalnız proje sayfasında yüklenir). */
(function () {
  "use strict";

  /* Mobil menü */
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var lblOpen = toggle.querySelector("[data-label-open]");
    var lblClose = toggle.querySelector("[data-label-close]");
    var mainEl = document.getElementById("icerik");
    var footEl = document.querySelector(".site-footer");
    var darEkran = function () { return window.matchMedia("(max-width: 760px)").matches; };
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (lblOpen) lblOpen.hidden = open;
      if (lblClose) lblClose.hidden = !open;
      /* panel açıkken arkadaki içerik sekme sırasından çıkarılır; yoksa odak
         panelin altında görünmeyen düğmelere gider */
      var kilit = open && darEkran();
      if (mainEl && "inert" in mainEl) mainEl.inert = kilit;
      if (footEl && "inert" in footEl) footEl.inert = kilit;
      if (!open && nav.contains(document.activeElement)) toggle.focus();
    };
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    /* bağlantıya basınca kapansın */
    nav.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) setOpen(false);
    });
    /* menünün dışına dokununca kapansın */
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 760 && nav.classList.contains("is-open")) setOpen(false);
    });
  }

  /* Kapak slaytı (ana sayfa): yumuşak geçiş, üzerine gelince ve odaklanınca durur, hareket azaltmada otomatik ilerlemez */
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll(".hero-slide"));
    var arrows = Array.prototype.slice.call(hero.querySelectorAll(".hero-arrow"));
    var dots = [];
    if (slides.length > 1) {
      var current = 0, timer = null;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var show = function (n) {
        current = (n + slides.length) % slides.length;
        slides.forEach(function (s, i) {
          var on = i === current;
          s.classList.toggle("is-active", on);
          s.setAttribute("aria-hidden", on ? "false" : "true");
          if (on) s.removeAttribute("tabindex"); else s.setAttribute("tabindex", "-1");
        });
        dots.forEach(function (d, i) {
          d.classList.toggle("is-active", i === current);
          if (i === current) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
        });
      };
      var start = function () { if (!reduce && !timer) timer = setInterval(function () { show(current + 1); }, 6000); };
      var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
      arrows.forEach(function (a) {
        a.addEventListener("click", function () { stop(); show(current + (parseInt(a.getAttribute("data-dir"), 10) || 1)); start(); });
      });
      hero.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { stop(); show(current - 1); start(); }
        if (e.key === "ArrowRight") { stop(); show(current + 1); start(); }
      });
      hero.addEventListener("mouseenter", stop);
      hero.addEventListener("mouseleave", start);
      hero.addEventListener("focusin", stop);
      hero.addEventListener("focusout", start);
      document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
      start();
    }
  }

  /* Tür süzgeci (proje dizini) */
  var filter = document.querySelector("[data-filter]");
  var grid = document.querySelector("[data-grid]");
  if (filter && grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
    var buttons = Array.prototype.slice.call(filter.querySelectorAll(".filter-btn"));
    var apply = function (tur, push) {
      cards.forEach(function (c) {
        var list = (c.getAttribute("data-tur") || "").split(/\s+/);
        c.classList.toggle("is-hidden", !!tur && list.indexOf(tur) === -1);
      });
      buttons.forEach(function (b) {
        var on = (b.getAttribute("data-tur") || "") === tur;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (push) {
        var url = tur ? "#tur=" + encodeURIComponent(tur) : location.pathname + location.search;
        history.replaceState(null, "", url);
      }
    };
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-tur") || "", true); });
    });
    var m = /[#&]tur=([^&]+)/.exec(location.hash);
    if (m) apply(decodeURIComponent(m[1]), false);
  }

  /* Dokunmatikte büyütme penceresi: iki parmakla yakınlaştırma tarayıcıya bırakılır,
     yakınlaştırılmışken tek parmakla gezinme açılır (kütüphane bu olayları yutuyordu). */
  var vv = window.visualViewport;
  var lbZoomed = function () { return !!vv && vv.scale > 1.01; };
  var syncLightboxTouch = function () {
    var c = document.querySelector(".glightbox-container");
    if (c) c.classList.toggle("is-zoomed", lbZoomed());
  };
  if (vv) {
    vv.addEventListener("resize", syncLightboxTouch);
    vv.addEventListener("scroll", syncLightboxTouch);
  }
  /* iki parmaklı hareketin BİTİŞİ de kütüphaneye gitmemeli: touchend'de
     e.touches kalkan parmağı içermez, bu yüzden ayrı bayrakla izleniyor */
  var cokluDokunus = false;
  ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (tip) {
    document.addEventListener(tip, function (e) {
      if (!document.querySelector(".glightbox-container")) return;
      var parmak = (e.touches ? e.touches.length : 0) + (tip === "touchend" || tip === "touchcancel" ? (e.changedTouches ? e.changedTouches.length : 0) : 0);
      if (parmak > 1) cokluDokunus = true;
      if (cokluDokunus || lbZoomed()) {
        syncLightboxTouch();
        e.stopPropagation();
      }
      if (e.touches && e.touches.length === 0) cokluDokunus = false;
    }, true);
  });

  /* Büyütme penceresi (GLightbox yalnız proje sayfasında yüklenir).
     Hareket azaltma açıkken CSS tüm animasyonları kapatır; GLightbox kapanışı animationend
     olayını beklediği için efektler "none" yapılır, yoksa pencere kapanmaz. */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fx = reduceMotion ? "none" : "fade";
  var lb = null;
  var lastTrigger = null;
  var restoreFocus = function () {
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
  };
  var setupLightbox = function () {
    if (lb || !window.GLightbox || !document.querySelector(".glb")) return;
    lb = GLightbox({
      selector: ".glb",
      touchNavigation: true,
      loop: false,
      zoomable: true,
      draggable: true,
      openEffect: fx,
      closeEffect: fx,
      slideEffect: fx,
      moreLength: 0,
      preload: true,
      onOpen: syncLightboxTouch,
      onClose: restoreFocus
    });
  };
  setupLightbox();
  if (!lb) window.addEventListener("load", setupLightbox);

  /* Pencere kapanınca odak, açan bağlantıya geri döner */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest(".glb, [data-cover-open]") : null;
    if (t) lastTrigger = t;
  }, true);

  /* Kapak tıklaması: büyütme penceresini kapağın karesinden açar */
  var coverLink = document.querySelector("[data-cover-open]");
  if (coverLink) {
    coverLink.addEventListener("click", function (e) {
      setupLightbox();
      if (!lb) return;
      e.preventDefault();
      var hrefs = Array.prototype.map.call(document.querySelectorAll(".glb"), function (a) { return a.href; });
      var i = hrefs.indexOf(coverLink.href);
      if (i >= 0) { lb.openAt(i); return; }
      GLightbox({
        elements: [{ href: coverLink.href, type: "image", alt: coverLink.getAttribute("data-alt") || "" }],
        openEffect: fx,
        closeEffect: fx,
        onOpen: syncLightboxTouch,
        onClose: restoreFocus
      }).open();
    });
  }

  /* Sanal tur: üçüncü taraf çerçeve ancak ziyaretçi başlatınca yüklenir */
  var tour = document.querySelector("[data-tour]");
  var tourStart = tour && tour.querySelector("[data-tour-start]");
  if (tour && tourStart) {
    tourStart.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = tour.getAttribute("data-tour");
      f.title = tour.getAttribute("data-title") || "";
      f.setAttribute("allow", "fullscreen; accelerometer; gyroscope; xr-spatial-tracking");
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("referrerpolicy", "no-referrer");
      tour.classList.add("is-live");
      while (tour.firstChild) tour.removeChild(tour.firstChild);
      tour.appendChild(f);
      f.focus();
    });
  }
})();

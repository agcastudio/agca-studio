/* agca·studio — menü, süzgeç, büyütme. Bağımlılık yok (GLightbox yalnız proje sayfasında yüklenir). */
(function () {
  "use strict";

  /* Mobil menü */
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var lblOpen = toggle.querySelector("[data-label-open]");
    var lblClose = toggle.querySelector("[data-label-close]");
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (lblOpen) lblOpen.hidden = open;
      if (lblClose) lblClose.hidden = !open;
    };
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
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

  /* Büyütme penceresi */
  if (window.GLightbox && document.querySelector(".glb")) {
    GLightbox({
      selector: ".glb",
      touchNavigation: true,
      loop: false,
      zoomable: true,
      draggable: true,
      openEffect: "fade",
      closeEffect: "fade",
      slideEffect: "fade",
      moreLength: 0,
      preload: true
    });
  } else if (document.querySelector(".glb")) {
    /* GLightbox henüz yüklenmediyse yükleme bitince kur */
    window.addEventListener("load", function () {
      if (window.GLightbox) {
        GLightbox({ selector: ".glb", touchNavigation: true, loop: false, zoomable: true, openEffect: "fade", closeEffect: "fade", slideEffect: "fade", moreLength: 0 });
      }
    });
  }
})();

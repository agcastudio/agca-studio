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

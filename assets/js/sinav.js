/* LLM Sınav (layouts/sinav/single.html). Sorular sayfaya gömülü JSON'dan okunur (data/llmsinav/*.json).
   Sunucuya veri gitmez: seçimler, deneme geçmişi ve soru istatistikleri ziyaretçinin tarayıcısında (localStorage).
   Akış: ders seç → soru sayısı → sınav (cevaplar sonda) → sonuç ve açıklamalar → yanlışları tekrar çöz. */
(function () {
  'use strict';

  var kaynakEl = document.getElementById('veri');
  var VERI = {};
  try { VERI = JSON.parse(kaynakEl ? kaynakEl.textContent : '{}') || {}; } catch (e) { VERI = {}; }

  var DERSLER = Object.keys(VERI).sort(function (a, b) { return a.localeCompare(b, 'tr', { numeric: true }); })
    .map(function (k) { return VERI[k]; })
    .filter(function (d) { return d && Array.isArray(d.sorular) && d.sorular.length; });
  var SORU = {};
  DERSLER.forEach(function (d) { d.sorular.forEach(function (s) { s._ders = d.id; SORU[s.id] = s; }); });
  var TOPLAM = Object.keys(SORU).length;

  var DEPO = 'llmsinav_v1';
  var HARF = ['A', 'B', 'C', 'D'];
  var ZORLUK_AD = { 1: 'temel', 2: 'orta', 3: 'zor' };
  var SAYILAR = [15, 25, 40];

  var ekran = document.getElementById('ekran');

  /* ---------- depo ---------- */
  function depoOku() {
    var bos = { ayar: null, denemeler: [], istatistik: {} };
    try { var r = localStorage.getItem(DEPO); if (!r) return bos; var d = JSON.parse(r); return d && typeof d === 'object' ? Object.assign(bos, d) : bos; }
    catch (e) { return bos; }
  }
  function depoYaz() { try { localStorage.setItem(DEPO, JSON.stringify(depo)); } catch (e) { /* özel pencere vb. */ } }
  var depo = depoOku();
  var ayar = Object.assign({ dersler: DERSLER.map(function (d) { return d.id; }), n: 15 }, depo.ayar || {});
  ayar.dersler = (ayar.dersler || []).filter(function (id) { return DERSLER.some(function (d) { return d.id === id; }); });
  if (!ayar.dersler.length) ayar.dersler = DERSLER.map(function (d) { return d.id; });
  if (ayar.n !== 'tum' && SAYILAR.indexOf(ayar.n) < 0) ayar.n = 15;

  /* ---------- yardımcılar ---------- */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function karistir(dizi) { var a = dizi.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sureMetni(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function tarihMetni(t) { try { return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function ders(id) { for (var i = 0; i < DERSLER.length; i++) if (DERSLER[i].id === id) return DERSLER[i]; return null; }
  function dersKisa(id) { var d = ders(id); return d ? d.ders : id; }
  function yuzde(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function rozetSinif(p) { return p >= 80 ? 'iyi' : p >= 60 ? 'orta' : 'zayif'; }
  function dersIstatistik(id) {
    var d = ders(id), dogru = 0, toplam = 0;
    if (!d) return null;
    d.sorular.forEach(function (s) { var i = depo.istatistik[s.id]; if (i) { dogru += i.d || 0; toplam += (i.d || 0) + (i.y || 0); } });
    return toplam ? { dogru: dogru, toplam: toplam, oran: yuzde(dogru, toplam) } : null;
  }
  function goster(html) { ekran.innerHTML = html; window.scrollTo(0, 0); ekran.focus({ preventScroll: true }); }
  function durum(metin) { var el = document.getElementById('durum'); if (el) el.textContent = metin || ''; }
  function dogruMu(q) { return q.cevap !== null && q.secenekler[q.cevap].dogru; }

  /* ---------- oturum ---------- */
  var oturum = null;    // { sorular: [{s, secenekler:[{metin, dogru}], cevap}], i, baslangic, bitis, sayac }

  function havuzOlustur() {
    var liste = [];
    DERSLER.forEach(function (d) { if (ayar.dersler.indexOf(d.id) >= 0) liste = liste.concat(d.sorular); });
    return liste;
  }

  function oturumBaslat(sorular) {
    if (oturum && oturum.sayac) clearInterval(oturum.sayac);
    oturum = {
      i: 0,
      baslangic: Date.now(),
      bitis: null,
      sayac: null,
      sorular: sorular.map(function (s) {
        var secenekler = karistir(s.secenekler.map(function (m, k) { return { metin: m, dogru: k === s.dogru }; }));
        return { s: s, secenekler: secenekler, cevap: null };
      })
    };
    oturum.sayac = setInterval(function () { if (oturum && !oturum.bitis) durum(sureMetni(Date.now() - oturum.baslangic)); }, 1000);
    soruCiz();
  }

  function sinavBaslat() {
    var havuz = havuzOlustur();
    if (!havuz.length) return;
    var n = ayar.n === 'tum' ? havuz.length : Math.min(ayar.n, havuz.length);
    oturumBaslat(karistir(havuz).slice(0, n));
  }

  /* ---------- ana ekran ---------- */
  function anaEkran() {
    if (oturum && oturum.sayac) clearInterval(oturum.sayac);
    oturum = null;
    var havuz = havuzOlustur();

    var dersHtml = DERSLER.map(function (d) {
      var ist = dersIstatistik(d.id);
      var secili = ayar.dersler.indexOf(d.id) >= 0;
      return '<label class="ders">' +
        '<input type="checkbox" data-ders="' + h(d.id) + '"' + (secili ? ' checked' : '') + '>' +
        '<span class="ders-orta"><span class="ders-ad">' + h(d.ders) + '</span><span class="ders-alt">' + h(d.baslik) + '</span></span>' +
        '<span class="ders-sag">' + d.sorular.length + ' soru' + (ist ? '<b>%' + ist.oran + '</b>' : '') + '</span>' +
        '</label>';
    }).join('');

    var sayiHtml = SAYILAR.map(function (n) {
      return '<button type="button" data-n="' + n + '" aria-pressed="' + (ayar.n === n) + '"' + (havuz.length < n ? ' disabled' : '') + '>' + n + '</button>';
    }).join('') + '<button type="button" data-n="tum" aria-pressed="' + (ayar.n === 'tum') + '">Tümü · ' + havuz.length + '</button>';

    var gecmis = depo.denemeler.slice(-5).reverse();
    var gecmisHtml = gecmis.length ? gecmis.map(function (g) {
      var p = yuzde(g.dogru, g.n);
      return '<div class="gecmis-satir"><div><div>' + h(g.dersler.map(dersKisa).join(', ')) + ' · ' + g.n + ' soru</div>' +
        '<div class="muted">' + h(tarihMetni(g.t)) + ' · ' + h(sureMetni(g.sure)) + '</div></div>' +
        '<span class="skor-rozet ' + rozetSinif(p) + '">%' + p + '</span></div>';
    }).join('') : '';

    goster(
      '<div class="giris">' +
      '<header class="giris-baslik"><h1>LLM Sınav</h1><p>' + DERSLER.length + ' ders · ' + TOPLAM + ' soru · cevaplar ve açıklamalar sınav sonunda</p></header>' +

      '<section aria-labelledby="b-dersler"><div class="bolum-baslik"><h2 id="b-dersler">Dersler</h2>' +
      '<span class="ipucu"><button type="button" class="baglanti" data-tum="1">tümü</button> · <button type="button" class="baglanti" data-tum="0">hiçbiri</button></span></div>' +
      '<div class="dersler">' + dersHtml + '</div></section>' +

      '<section aria-labelledby="b-sayi"><div class="bolum-baslik"><h2 id="b-sayi">Soru sayısı</h2></div>' +
      '<div class="segment" data-grup="n">' + sayiHtml + '</div></section>' +

      '<div class="baslat">' +
      '<button type="button" class="btn vurgu buyuk" id="basla"' + (havuz.length ? '' : ' disabled') + '>Sınavı başlat</button>' +
      (havuz.length ? '' : '<p class="uyari">En az bir ders seç.</p>') +
      '</div>' +

      (gecmisHtml ? '<section aria-labelledby="b-gecmis"><div class="bolum-baslik"><h2 id="b-gecmis">Son denemeler</h2>' +
        '<span class="ipucu"><button type="button" class="baglanti" id="sifirla">sil</button></span></div>' +
        '<div class="gecmis">' + gecmisHtml + '</div></section>' : '') +
      '<p class="dipnot">Cevaplar ve deneme geçmişi yalnız bu tarayıcıda saklanır.</p>' +
      '</div>'
    );

    ekran.querySelectorAll('input[data-ders]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var id = inp.getAttribute('data-ders'), k = ayar.dersler.indexOf(id);
        if (inp.checked && k < 0) ayar.dersler.push(id); else if (!inp.checked && k >= 0) ayar.dersler.splice(k, 1);
        ayarKaydet(); anaEkran();
      });
    });
    ekran.querySelectorAll('[data-tum]').forEach(function (b) {
      b.addEventListener('click', function () { ayar.dersler = b.getAttribute('data-tum') === '1' ? DERSLER.map(function (d) { return d.id; }) : []; ayarKaydet(); anaEkran(); });
    });
    ekran.querySelectorAll('[data-grup="n"] button').forEach(function (b) {
      b.addEventListener('click', function () { var v = b.getAttribute('data-n'); ayar.n = v === 'tum' ? 'tum' : parseInt(v, 10); ayarKaydet(); anaEkran(); });
    });
    var basla = document.getElementById('basla');
    if (basla) basla.addEventListener('click', sinavBaslat);
    var sifirla = document.getElementById('sifirla');
    if (sifirla) sifirla.addEventListener('click', function () {
      if (window.confirm('Deneme geçmişi ve soru istatistikleri bu tarayıcıdan silinsin mi?')) { depo.denemeler = []; depo.istatistik = {}; depoYaz(); anaEkran(); }
    });
  }
  function ayarKaydet() { depo.ayar = { dersler: ayar.dersler, n: ayar.n }; depoYaz(); }

  /* ---------- soru ekranı ---------- */
  function soruCiz() {
    var q = oturum.sorular[oturum.i], s = q.s, n = oturum.sorular.length;
    var son = oturum.i === n - 1;
    var cevapli = oturum.sorular.filter(function (x) { return x.cevap !== null; }).length;

    var secHtml = q.secenekler.map(function (o, k) {
      return '<li><button type="button" class="secenek" role="radio" data-k="' + k + '" aria-checked="' + (q.cevap === k) + '">' +
        '<span class="harf" aria-hidden="true">' + HARF[k] + '</span><span>' + h(o.metin) + '</span></button></li>';
    }).join('');

    var gezgin = '<nav class="gezgin" aria-label="Sorular">' + oturum.sorular.map(function (x, k) {
      return '<button type="button" data-git="' + k + '" class="' + (x.cevap !== null ? 'cevapli' : '') + '"' + (k === oturum.i ? ' aria-current="true"' : '') + ' aria-label="Soru ' + (k + 1) + (x.cevap !== null ? ', cevaplandı' : '') + '">' + (k + 1) + '</button>';
    }).join('') + '</nav>';

    goster(
      '<div class="soru-ust">' +
      '<span class="soru-no">' + (oturum.i + 1) + ' <span class="muted">/ ' + n + '</span></span>' +
      '<span class="muted">' + h(dersKisa(s._ders)) + ' · ' + h(s.konu) + '</span>' +
      '<span class="bosluk"></span>' +
      '<span class="zorluk" aria-label="zorluk: ' + h(ZORLUK_AD[s.zorluk] || '') + '">' + [1, 2, 3].map(function (z) { return '<i class="' + (z <= (s.zorluk || 1) ? 'dolu' : '') + '"></i>'; }).join('') + '</span>' +
      '<span class="durum" id="durum"></span>' +
      '</div>' +
      '<div class="ilerleme" aria-hidden="true"><span style="width:' + yuzde(cevapli, n) + '%"></span></div>' +
      '<h2 class="soru-metin" id="soru-' + h(s.id) + '">' + h(s.soru) + '</h2>' +
      '<ul class="secenekler" role="radiogroup" aria-labelledby="soru-' + h(s.id) + '">' + secHtml + '</ul>' +
      '<div class="soru-alt">' +
      '<button type="button" class="btn ikincil" id="geri"' + (oturum.i === 0 ? ' disabled' : '') + '>Önceki</button>' +
      '<span class="klavye"><kbd>1</kbd>–<kbd>4</kbd> seç · <kbd>←</kbd> <kbd>→</kbd> gez</span><span class="bosluk"></span>' +
      (son
        ? '<button type="button" class="btn vurgu" id="bitir">Sınavı bitir</button>'
        : '<button type="button" class="btn ikincil" id="bitir">Bitir</button><button type="button" class="btn" id="ileri">Sonraki</button>') +
      '</div>' +
      gezgin
    );
    durum(sureMetni(Date.now() - oturum.baslangic));

    ekran.querySelectorAll('.secenek').forEach(function (b) {
      b.addEventListener('click', function () { sec(parseInt(b.getAttribute('data-k'), 10)); });
    });
    var ileri = document.getElementById('ileri'), geriB = document.getElementById('geri'), bitir = document.getElementById('bitir');
    if (ileri) ileri.addEventListener('click', sonraki);
    if (geriB) geriB.addEventListener('click', onceki);
    if (bitir) bitir.addEventListener('click', bitirIste);
    ekran.querySelectorAll('[data-git]').forEach(function (b) { b.addEventListener('click', function () { oturum.i = parseInt(b.getAttribute('data-git'), 10); soruCiz(); }); });
  }

  function sec(k) {
    var q = oturum.sorular[oturum.i];
    q.cevap = (q.cevap === k) ? null : k;
    soruCiz();
  }
  function sonraki() { if (oturum.i < oturum.sorular.length - 1) { oturum.i++; soruCiz(); } else bitirIste(); }
  function onceki() { if (oturum.i > 0) { oturum.i--; soruCiz(); } }

  function bitirIste() {
    var bos = oturum.sorular.filter(function (x) { return x.cevap === null; }).length;
    if (bos && !window.confirm(bos + ' soru boş. Yine de bitirilsin mi? Boş sorular yanlış sayılır.')) return;
    bitir();
  }

  function istatistikYaz(q) {
    var i = depo.istatistik[q.s.id] || { d: 0, y: 0, son: null };
    var d = dogruMu(q);
    if (d) i.d++; else i.y++;
    i.son = d ? 'd' : 'y';
    depo.istatistik[q.s.id] = i;
  }

  /* ---------- sonuç ---------- */
  function bitir() {
    if (oturum.sayac) clearInterval(oturum.sayac);
    oturum.bitis = Date.now();
    oturum.sorular.forEach(istatistikYaz);
    var dogru = oturum.sorular.filter(dogruMu).length;
    var dersler = [];
    oturum.sorular.forEach(function (x) { if (dersler.indexOf(x.s._ders) < 0) dersler.push(x.s._ders); });
    depo.denemeler.push({ t: oturum.bitis, dersler: dersler, n: oturum.sorular.length, dogru: dogru, sure: oturum.bitis - oturum.baslangic });
    if (depo.denemeler.length > 40) depo.denemeler = depo.denemeler.slice(-40);
    depoYaz();
    sonucEkrani();
  }

  function sonucEkrani() {
    var S = oturum.sorular, n = S.length;
    var dogru = 0, yanlis = 0, bos = 0;
    var dersT = {}, konuT = {};
    S.forEach(function (x) {
      var d = dogruMu(x);
      if (x.cevap === null) bos++; else if (d) dogru++; else yanlis++;
      var dk = dersT[x.s._ders] || (dersT[x.s._ders] = { d: 0, n: 0 }); dk.n++; if (d) dk.d++;
      var kk = konuT[x.s._ders + '|' + x.s.konu] || (konuT[x.s._ders + '|' + x.s.konu] = { ders: x.s._ders, konu: x.s.konu, d: 0, n: 0 }); kk.n++; if (d) kk.d++;
    });
    var p = yuzde(dogru, n);

    var dersHtml = Object.keys(dersT).map(function (id) {
      var t = dersT[id]; return '<div class="cubuk-satir"><span>' + h(dersKisa(id)) + ' <span class="muted">' + h((ders(id) || {}).baslik || '') + '</span></span>' +
        '<div class="cubuk"><span style="width:' + yuzde(t.d, t.n) + '%"></span></div><span class="oran">' + t.d + ' / ' + t.n + '</span></div>';
    }).join('');

    var zayif = Object.keys(konuT).map(function (k) { return konuT[k]; }).filter(function (k) { return k.d < k.n; })
      .sort(function (a, b) { return (a.d / a.n) - (b.d / b.n) || b.n - a.n; }).slice(0, 6);
    var zayifHtml = zayif.length ? '<ul class="zayif">' + zayif.map(function (k) {
      return '<li><span>' + h(k.konu) + '</span><span class="muted">' + h(dersKisa(k.ders)) + ' · ' + k.d + ' / ' + k.n + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">Her konuda tam puan.</p>';

    var yanlisVar = yanlis + bos > 0;

    goster(
      '<div class="giris">' +
      '<header class="sonuc-ozet">' +
      '<div class="halka" style="--p:' + p + '" role="img" aria-label="Başarı yüzde ' + p + '"><div><span>%' + p + '</span><small>' + dogru + ' / ' + n + '</small></div></div>' +
      '<div><h1>' + (p >= 90 ? 'Çok iyi.' : p >= 75 ? 'İyi gidiyor.' : p >= 50 ? 'Temel oturmuş, eksikler var.' : 'Konuları yeniden çalışmak gerek.') + '</h1>' +
      '<p class="muted">' + dogru + ' doğru · ' + yanlis + ' yanlış' + (bos ? ' · ' + bos + ' boş' : '') + ' · ' + h(sureMetni(oturum.bitis - oturum.baslangic)) + '</p>' +
      '<div class="btn-satir" style="margin-top:14px">' +
      (yanlisVar ? '<button type="button" class="btn vurgu" id="yanlislar">Yanlışları tekrar çöz · ' + (yanlis + bos) + '</button>' : '') +
      '<button type="button" class="btn ikincil" id="yeni">Yeni sınav</button>' +
      '<button type="button" class="btn ikincil" id="ana">Başa dön</button></div>' +
      '</div></header>' +

      '<section aria-labelledby="b-ders-sonuc"><div class="bolum-baslik"><h2 id="b-ders-sonuc">Derslere göre</h2></div><div class="cubuklar">' + dersHtml + '</div></section>' +
      '<section aria-labelledby="b-zayif"><div class="bolum-baslik"><h2 id="b-zayif">Tekrar edilecek konular</h2></div>' + zayifHtml + '</section>' +

      '<section aria-labelledby="b-inceleme"><div class="bolum-baslik"><h2 id="b-inceleme">Soru incelemesi</h2>' +
      '<span class="ipucu"><div class="segment kucuk" data-grup="filtre"><button type="button" data-f="yanlis" aria-pressed="' + yanlisVar + '"' + (yanlisVar ? '' : ' disabled') + '>Yanlışlar</button><button type="button" data-f="tum" aria-pressed="' + !yanlisVar + '">Tümü</button></div></span></div>' +
      '<ol class="inceleme" id="inceleme"></ol></section>' +
      '</div>'
    );

    var filtre = yanlisVar ? 'yanlis' : 'tum';
    function incelemeCiz() {
      var liste = document.getElementById('inceleme');
      liste.innerHTML = S.map(function (x, i) {
        var d = dogruMu(x);
        if (filtre === 'yanlis' && d) return '';
        var sinif = x.cevap === null ? 'bos' : d ? 'dogru' : 'yanlis';
        return '<li class="inceleme-soru ' + sinif + '"><div class="inceleme-ust"><span>' + (i + 1) + '</span><span>' + h(dersKisa(x.s._ders)) + ' · ' + h(x.s.konu) + '</span>' +
          (x.cevap === null ? '<span class="uyari">boş</span>' : '') + '</div>' +
          '<p class="inceleme-metin">' + h(x.s.soru) + '</p>' +
          '<div class="inceleme-secenekler">' + x.secenekler.map(function (o, k) {
            var c = o.dogru ? 'dogru' : (x.cevap === k ? 'yanlis' : '');
            return '<div class="' + c + '"><span class="harf-kucuk">' + HARF[k] + '</span>' + h(o.metin) + '</div>';
          }).join('') + '</div>' +
          '<p class="inceleme-aciklama">' + h(x.s.aciklama) + '<span class="kaynak">' + h(dersKisa(x.s._ders)) + ', slayt ' + h(x.s.slayt) + '</span></p></li>';
      }).join('');
    }
    incelemeCiz();
    ekran.querySelectorAll('[data-grup="filtre"] button').forEach(function (b) {
      b.addEventListener('click', function () {
        filtre = b.getAttribute('data-f');
        ekran.querySelectorAll('[data-grup="filtre"] button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        incelemeCiz();
      });
    });
    var yan = document.getElementById('yanlislar');
    if (yan) yan.addEventListener('click', function () {
      var tekrar = S.filter(function (x) { return !dogruMu(x); }).map(function (x) { return x.s; });
      oturumBaslat(karistir(tekrar));
    });
    document.getElementById('yeni').addEventListener('click', sinavBaslat);
    document.getElementById('ana').addEventListener('click', anaEkran);
  }

  /* ---------- klavye ---------- */
  document.addEventListener('keydown', function (e) {
    if (!oturum || oturum.bitis) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = -1;
    if (/^[1-4]$/.test(e.key)) k = parseInt(e.key, 10) - 1;
    else if (/^[a-dA-D]$/.test(e.key)) k = e.key.toUpperCase().charCodeAt(0) - 65;
    if (k >= 0) { e.preventDefault(); sec(k); return; }
    if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); sonraki(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onceki(); }
  });

  window.addEventListener('beforeunload', function (e) {
    if (oturum && !oturum.bitis && oturum.sorular.some(function (x) { return x.cevap !== null; })) { e.preventDefault(); e.returnValue = ''; }
  });

  if (!DERSLER.length) {
    goster('<p class="muted" style="text-align:center;padding:40px 0">Soru verisi bulunamadı.</p>');
  } else {
    anaEkran();
  }
})();

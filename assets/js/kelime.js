/* İngilizce Kartlar (layouts/kelime/single.html). İfadeler sayfaya gömülü JSON'dan okunur (data/ingilizce/*.json).
   Ezber sistemi: Leitner kutuları (1–5). Bilinen kart bir üst kutuya çıkar ve daha geç tekrar edilir; bilinmeyen kart
   1. kutuya döner ve aynı oturumda yeniden sorulur. Kartlar, test ve yazma çalışması aynı kutuları günceller.
   Sunucuya veri gitmez: ilerleme ziyaretçinin tarayıcısında (localStorage). */
(function () {
  'use strict';

  var kaynakEl = document.getElementById('veri');
  var VERI = {};
  try { VERI = JSON.parse(kaynakEl ? kaynakEl.textContent : '{}') || {}; } catch (e) { VERI = {}; }

  var DERSLER = Object.keys(VERI).sort(function (a, b) { return a.localeCompare(b, 'tr', { numeric: true }); })
    .map(function (k) { return VERI[k]; })
    .filter(function (d) { return d && Array.isArray(d.ogeler) && d.ogeler.length; });
  var OGE = {};
  var TUM = [];
  DERSLER.forEach(function (d) {
    d.ogeler.forEach(function (o) {
      o._ders = d.id;
      o.anlam = Array.isArray(o.anlam) ? o.anlam : [];
      o.grup = Array.isArray(o.grup) ? o.grup : [];
      OGE[o.id] = o; TUM.push(o);
    });
  });

  var DEPO = 'ingkelime_v1';
  var GUN = 86400000;
  var ARALIK = [0, 0, 1, 3, 7, 16];          // kutuya göre tekrar aralığı (gün); 1. kutu hemen
  var YENI_LIMIT = 15;                         // bir kart oturumuna eklenen en çok yeni kart
  var SAYILAR = [10, 20];
  var HARF = ['A', 'B', 'C', 'D'];

  var ekran = document.getElementById('ekran');
  var klavye = null;                           // etkin ekranın klavye işleyicisi

  /* ---------- depo ---------- */
  function depoOku() {
    var bos = { ayar: null, kutu: {}, denemeler: [] };
    try { var r = localStorage.getItem(DEPO); if (!r) return bos; var d = JSON.parse(r); return d && typeof d === 'object' ? Object.assign(bos, d) : bos; }
    catch (e) { return bos; }
  }
  function depoYaz() { try { localStorage.setItem(DEPO, JSON.stringify(depo)); } catch (e) { /* özel pencere vb. */ } }
  var depo = depoOku();
  if (!depo.kutu || typeof depo.kutu !== 'object') depo.kutu = {};
  if (!Array.isArray(depo.denemeler)) depo.denemeler = [];
  var ayar = Object.assign({ dersler: DERSLER.map(function (d) { return d.id; }), n: 10, yon: 'en' }, depo.ayar || {});
  ayar.dersler = (ayar.dersler || []).filter(function (id) { return DERSLER.some(function (d) { return d.id === id; }); });
  if (!ayar.dersler.length) ayar.dersler = DERSLER.map(function (d) { return d.id; });
  if (ayar.n !== 'tum' && SAYILAR.indexOf(ayar.n) < 0) ayar.n = 10;
  if (ayar.yon !== 'en' && ayar.yon !== 'tr') ayar.yon = 'en';
  function ayarKaydet() { depo.ayar = { dersler: ayar.dersler, n: ayar.n, yon: ayar.yon }; depoYaz(); }

  /* ---------- yardımcılar ---------- */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function karistir(dizi) { var a = dizi.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rastgele(dizi) { return dizi[Math.floor(Math.random() * dizi.length)]; }
  function yuzde(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function rozetSinif(p) { return p >= 80 ? 'iyi' : p >= 60 ? 'orta' : 'zayif'; }
  function tarihMetni(t) { try { return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function ders(id) { for (var i = 0; i < DERSLER.length; i++) if (DERSLER[i].id === id) return DERSLER[i]; return null; }
  function dersKisa(id) { var d = ders(id); return d ? d.ders : id; }
  function ornekHtml(s) { return h(s).replace(/\[\[(.+?)\]\]/g, '<mark>$1</mark>'); }
  function goster(html) { ekran.innerHTML = html; window.scrollTo(0, 0); ekran.focus({ preventScroll: true }); }
  function secili() { return TUM.filter(function (o) { return ayar.dersler.indexOf(o._ders) >= 0; }); }

  /* ---------- seslendirme (tarayıcının kendi İngilizce sesi) ---------- */
  var SES = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  function konus(metin) {
    if (!SES) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(metin).replace(/[()]/g, '').replace(/…/g, ''));
      u.lang = 'en-GB'; u.rate = 0.92;
      var sesler = window.speechSynthesis.getVoices() || [];
      var v = sesler.filter(function (x) { return /^en-GB/i.test(x.lang); })[0] || sesler.filter(function (x) { return /^en/i.test(x.lang); })[0];
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ses yok */ }
  }
  function sesDugme(metin) {
    if (!SES) return '';
    return '<button type="button" class="ses" data-ses="' + h(metin) + '" aria-label="Sesli oku: ' + h(metin) + '" title="Sesli oku">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
  }
  function sesBagla(kok) {
    (kok || ekran).querySelectorAll('[data-ses]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); konus(b.getAttribute('data-ses')); });
    });
  }

  /* ---------- Leitner kutuları ---------- */
  function kayit(id) { return depo.kutu[id] || null; }
  function kutuNo(id) { var r = kayit(id); return r ? r.k : 0; }
  function vadesiGeldi(id, simdi) { var r = kayit(id); return !!r && r.k > 0 && (r.t || 0) <= simdi; }
  function kutuGuncelle(id, dogru) {
    var r = depo.kutu[id] || { k: 0, d: 0, y: 0 };
    if (dogru) { r.k = Math.min(5, Math.max(r.k, 1) + 1); r.d = (r.d || 0) + 1; }
    else { r.k = 1; r.y = (r.y || 0) + 1; }
    r.t = Date.now() + ARALIK[r.k] * GUN;
    depo.kutu[id] = r;
    depoYaz();
  }
  function durumAd(k) { return k >= 5 ? 'öğrenildi' : k >= 3 ? 'pekişiyor' : k >= 1 ? 'öğreniliyor' : 'yeni'; }
  function durumSinif(k) { return k >= 5 ? 'ogrenildi' : k >= 3 ? 'pekisiyor' : k >= 1 ? 'ogreniliyor' : 'yeni'; }
  function dagilim(liste) {
    var d = { yeni: 0, ogreniliyor: 0, pekisiyor: 0, ogrenildi: 0 };
    liste.forEach(function (o) { d[durumSinif(kutuNo(o.id))]++; });
    return d;
  }
  function dagilimCubuk(d, toplam) {
    function p(x) { return (toplam ? 100 * x / toplam : 0).toFixed(2) + '%'; }
    return '<div class="dagilim" aria-hidden="true">' +
      '<span class="ogrenildi" style="width:' + p(d.ogrenildi) + '"></span>' +
      '<span class="pekisiyor" style="width:' + p(d.pekisiyor) + '"></span>' +
      '<span class="ogreniliyor" style="width:' + p(d.ogreniliyor) + '"></span></div>';
  }

  /* ---------- cevap karşılaştırma (yazma çalışması) ---------- */
  function normal(s) {
    return String(s || '').toLowerCase()
      .replace(/[’‘`´]/g, "'").replace(/…/g, ' ')
      .replace(/[^a-z' ]+/g, ' ')
      .replace(/\b(my|his|her|their|our|one's|someone's)\b/g, 'your')
      .replace(/\s+/g, ' ').trim()
      .replace(/^to /, '')
      .replace(/^(a|an|the) /, '');
  }
  function bicimler(o) {
    var liste = [o.ifade].concat(o.kabul || []);
    var sonuc = [];
    liste.forEach(function (m) {
      if (/\(([^)]+)\)/.test(m)) {
        sonuc.push(m.replace(/\s*\(([^)]+)\)\s*/g, ' '));
        sonuc.push(m.replace(/\(([^)]+)\)/g, '$1'));
      } else sonuc.push(m);
    });
    return sonuc.map(normal).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  }
  function mesafe(a, b) {
    var m = a.length, n = b.length, i, j, onceki, gecici, satir = [];
    for (j = 0; j <= n; j++) satir[j] = j;
    for (i = 1; i <= m; i++) {
      onceki = satir[0]; satir[0] = i;
      for (j = 1; j <= n; j++) {
        gecici = satir[j];
        satir[j] = Math.min(satir[j] + 1, satir[j - 1] + 1, onceki + (a[i - 1] === b[j - 1] ? 0 : 1));
        onceki = gecici;
      }
    }
    return satir[n];
  }
  /* Küçük yazım hatası: kelime sayısı aynı, en çok iki kelimede birer harf farkı. Kısa kelimeler (edat, tanımlık:
     in/on, up/off, a/the …) birebir tutmalı; collocation'da edat hatası yazım hatası değildir. */
  function yakinMi(y, b) {
    var a1 = y.split(' '), a2 = b.split(' '), fark = 0;
    if (a1.length !== a2.length) return false;
    for (var i = 0; i < a1.length; i++) {
      if (a1[i] === a2[i]) continue;
      if (Math.min(a1[i].length, a2[i].length) <= 4 || mesafe(a1[i], a2[i]) > 1) return false;
      if (++fark > 2) return false;
    }
    return fark > 0;
  }
  /* 'tam' | 'yakin' (küçük yazım hatası, doğru sayılır) | 'yanlis' */
  function karsilastir(o, yazilan) {
    var y = normal(yazilan);
    if (!y) return 'yanlis';
    var b = bicimler(o);
    if (b.indexOf(y) >= 0) return 'tam';
    for (var i = 0; i < b.length; i++) if (yakinMi(y, b[i])) return 'yakin';
    return 'yanlis';
  }
  function ipucu(ifade) {
    return ifade.split(' ').map(function (w) {
      if (/^(to|a|an|the)$/i.test(w)) return w;
      var harfler = w.replace(/[^A-Za-z']/g, '');
      return w.charAt(0) === '(' ? '(' + harfler.charAt(0) + '…)' : harfler.charAt(0) + '…';
    }).join(' ');
  }

  /* ---------- çeldirici seçimi ----------
     Aynı anlam grubundaki (grup etiketi ortak) ifadeler birbirine çeldirici yapılmaz; böylece birden çok doğru
     cevap gibi görünen seçenek çıkmaz. Çeldiriciler tüm derslerden seçilir. */
  function cakisir(a, b) {
    if (a.id === b.id) return true;
    for (var i = 0; i < a.grup.length; i++) if (b.grup.indexOf(a.grup[i]) >= 0) return true;
    return false;
  }
  function celdiriciler(o, metinAl, dogruMetin, adet) {
    var gorulen = [normal(dogruMetin)], sonuc = [];
    karistir(TUM).forEach(function (x) {
      if (sonuc.length >= adet || cakisir(o, x)) return;
      var m = metinAl(x);
      if (!m) return;
      var n = normal(m);
      if (gorulen.indexOf(n) >= 0) return;
      gorulen.push(n); sonuc.push(m);
    });
    return sonuc;
  }

  /* ---------- soru üretimi (test) ---------- */
  function soruTurleri(o) {
    var t = ['tr'];
    if (o.anlam.length || o.zit) { t.push('anlam'); t.push('ters'); }
    if (o.bosluk) t.push('bosluk');
    return t;
  }
  function soruUret(o) {
    var tur = rastgele(soruTurleri(o));
    var q = { o: o, tur: tur, cevap: null };
    var dogru, yanlislar;
    if (tur === 'anlam') {
      if (o.zit) {
        q.baslik = 'Zıt anlamlısı hangisi?'; q.metin = o.ifade; q.ses = o.ifade;
        dogru = o.zit.ifade;
        yanlislar = celdiriciler(o, function (x) { return x.ifade; }, dogru, 3);
      } else {
        q.baslik = 'Anlamı hangisi?'; q.metin = o.ifade; q.ses = o.ifade;
        dogru = rastgele(o.anlam);
        yanlislar = celdiriciler(o, function (x) { return x.anlam.length ? rastgele(x.anlam) : ''; }, dogru, 3);
      }
    } else if (tur === 'ters') {
      if (o.zit) {
        q.baslik = 'Zıt anlamlısı bu olan ifade hangisi?'; q.metin = o.zit.ifade;
      } else {
        q.baslik = 'Bu anlama gelen ifade hangisi?'; q.metin = rastgele(o.anlam);
      }
      dogru = o.ifade;
      yanlislar = celdiriciler(o, function (x) { return x.ifade; }, dogru, 3);
    } else if (tur === 'bosluk') {
      q.baslik = 'Boşluğa hangisi gelir?'; q.metin = o.bosluk.metin; q.ipucu = o.tr;
      dogru = o.bosluk.cevap;
      yanlislar = o.bosluk.yanlis.slice(0, 3);
    } else {
      q.baslik = 'Türkçesi verilen ifade hangisi?'; q.metin = o.tr;
      dogru = o.ifade;
      yanlislar = celdiriciler(o, function (x) { return x.ifade; }, dogru, 3);
    }
    q.secenekler = karistir([{ metin: dogru, dogru: true }].concat(yanlislar.map(function (m) { return { metin: m, dogru: false }; })));
    return q;
  }
  /* Önce az bilinenler: kutu numarası küçük olan ifadeler öncelikli, eşitlerde rastgele. */
  function oncelikli(liste, n) {
    var sirali = karistir(liste).sort(function (a, b) { return kutuNo(a.id) - kutuNo(b.id); });
    return karistir(sirali.slice(0, n));
  }
  function sayi(liste) { return ayar.n === 'tum' ? liste.length : Math.min(ayar.n, liste.length); }

  /* ---------- ortak kart arka yüzü ---------- */
  function ayrintiHtml(o, ifadeGoster) {
    return (ifadeGoster ? '<p class="ay-ifade"><span>' + h(o.ifade) + '</span>' + sesDugme(o.ifade) + '</p>' : '') +
      (o.anlam.length ? '<ul class="ay-anlam">' + o.anlam.map(function (a) { return '<li><span class="isaret" aria-label="eş anlam">=</span>' + h(a) + '</li>'; }).join('') + '</ul>' : '') +
      (o.zit ? '<ul class="ay-anlam zit"><li><span class="isaret" aria-label="zıt anlam">≠</span><span><b>' + h(o.zit.ifade) + '</b> <span class="muted">· ' + h(o.zit.tr) + '</span></span></li></ul>' : '') +
      '<p class="ay-tr">' + h(o.tr) + '</p>' +
      (o.ornek ? '<p class="ay-ornek">' + ornekHtml(o.ornek) + '</p>' : '') +
      (o.not ? '<p class="ay-not">' + h(o.not) + '</p>' : '');
  }

  /* ---------- ana ekran ---------- */
  function anaEkran() {
    klavye = null;
    var liste = secili(), simdi = Date.now();
    var vade = liste.filter(function (o) { return vadesiGeldi(o.id, simdi); }).length;
    var yeni = liste.filter(function (o) { return !kayit(o.id); }).length;
    var kartSayi = vade + Math.min(YENI_LIMIT, yeni);
    var dTum = dagilim(TUM);

    var dersHtml = DERSLER.map(function (d) {
      var dd = dagilim(d.ogeler), sec = ayar.dersler.indexOf(d.id) >= 0;
      return '<label class="ders">' +
        '<input type="checkbox" data-ders="' + h(d.id) + '"' + (sec ? ' checked' : '') + '>' +
        '<span class="ders-orta"><span class="ders-ad">' + h(d.ders) + '</span><span class="ders-alt">' + h(d.baslik) + '</span>' + dagilimCubuk(dd, d.ogeler.length) + '</span>' +
        '<span class="ders-sag">' + d.ogeler.length + ' ifade<b>' + dd.ogrenildi + ' öğrenildi</b></span>' +
        '</label>';
    }).join('');

    var sayiHtml = SAYILAR.map(function (n) {
      return '<button type="button" data-n="' + n + '" aria-pressed="' + (ayar.n === n) + '"' + (liste.length < n ? ' disabled' : '') + '>' + n + '</button>';
    }).join('') + '<button type="button" data-n="tum" aria-pressed="' + (ayar.n === 'tum') + '">Tümü · ' + liste.length + '</button>';

    var gecmis = depo.denemeler.slice(-5).reverse();
    var gecmisHtml = gecmis.map(function (g) {
      var p = yuzde(g.dogru, g.n);
      return '<div class="gecmis-satir"><div><div>' + (g.tur === 'yaz' ? 'Yazma' : 'Test') + ' · ' + g.n + ' soru · ' + h((g.dersler || []).map(dersKisa).join(', ')) + '</div>' +
        '<div class="muted">' + h(tarihMetni(g.t)) + '</div></div>' +
        '<span class="skor-rozet ' + rozetSinif(p) + '">%' + p + '</span></div>';
    }).join('');

    goster(
      '<div class="giris">' +
      '<header class="giris-baslik"><h1>İngilizce Kartlar</h1><p>' + DERSLER.length + ' ders · ' + TUM.length + ' collocation, deyim ve ifade · yalnız ders notlarındakiler</p></header>' +

      '<section class="ozet" aria-label="İlerleme">' +
      dagilimCubuk(dTum, TUM.length) +
      '<ul class="lejant">' +
      '<li><i class="ogrenildi"></i>Öğrenildi <b>' + dTum.ogrenildi + '</b></li>' +
      '<li><i class="pekisiyor"></i>Pekişiyor <b>' + dTum.pekisiyor + '</b></li>' +
      '<li><i class="ogreniliyor"></i>Öğreniliyor <b>' + dTum.ogreniliyor + '</b></li>' +
      '<li><i class="yeni"></i>Yeni <b>' + dTum.yeni + '</b></li></ul></section>' +

      '<section aria-labelledby="b-dersler"><div class="bolum-baslik"><h2 id="b-dersler">Dersler</h2>' +
      '<span class="ipucu"><button type="button" class="baglanti" data-tum="1">tümü</button> · <button type="button" class="baglanti" data-tum="0">hiçbiri</button></span></div>' +
      '<div class="dersler">' + dersHtml + '</div>' +
      (liste.length ? '' : '<p class="uyari" style="margin-top:8px">En az bir ders seç.</p>') + '</section>' +

      '<section class="mod" aria-labelledby="b-kart"><div class="bolum-baslik"><h2 id="b-kart">1 · Kartlar</h2><span class="ipucu">' + vade + ' tekrar · ' + yeni + ' yeni</span></div>' +
      '<p class="mod-aciklama">Kartı çevir, bildiysen “Bildim” de. Bildiğin kart daha seyrek, bilemediğin kart hemen yeniden gelir.</p>' +
      '<div class="segment" data-grup="yon"><button type="button" data-yon="en" aria-pressed="' + (ayar.yon === 'en') + '">İngilizce → anlam</button>' +
      '<button type="button" data-yon="tr" aria-pressed="' + (ayar.yon === 'tr') + '">Türkçe → İngilizce</button></div>' +
      '<div class="btn-satir"><button type="button" class="btn vurgu" id="kart-basla"' + (kartSayi ? '' : ' disabled') + '>' + (kartSayi ? 'Kartlara başla · ' + kartSayi : 'Bugünlük tekrar yok') + '</button>' +
      '<button type="button" class="baglanti" id="kart-tum"' + (liste.length ? '' : ' disabled') + '>tüm kartları karışık çalış</button></div></section>' +

      '<section class="mod" aria-labelledby="b-test"><div class="bolum-baslik"><h2 id="b-test">2 · Test ve yazma</h2></div>' +
      '<p class="mod-aciklama">Test: anlam, Türkçe karşılık, zıt anlam ve eksik kelime soruları. Yazma: ifadeyi kendin yaz. Önce az bildiğin ifadeler sorulur.</p>' +
      '<div class="segment" data-grup="n">' + sayiHtml + '</div>' +
      '<div class="btn-satir"><button type="button" class="btn" id="test-basla"' + (liste.length ? '' : ' disabled') + '>Testi başlat</button>' +
      '<button type="button" class="btn ikincil" id="yaz-basla"' + (liste.length ? '' : ' disabled') + '>Yazarak çalış</button></div></section>' +

      '<section class="mod" aria-labelledby="b-liste"><div class="bolum-baslik"><h2 id="b-liste">3 · Liste</h2></div>' +
      '<div class="btn-satir"><button type="button" class="btn ikincil" id="liste">Tüm ifadeleri gör</button></div></section>' +

      (gecmisHtml ? '<section aria-labelledby="b-gecmis"><div class="bolum-baslik"><h2 id="b-gecmis">Son denemeler</h2></div><div class="gecmis">' + gecmisHtml + '</div></section>' : '') +
      '<p class="dipnot">İlerleme yalnız bu tarayıcıda saklanır. <button type="button" class="baglanti" id="sifirla">İlerlemeyi sıfırla</button></p>' +
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
    ekran.querySelectorAll('[data-yon]').forEach(function (b) {
      b.addEventListener('click', function () { ayar.yon = b.getAttribute('data-yon'); ayarKaydet(); anaEkran(); });
    });
    bagla('kart-basla', function () { kartBaslat(false); });
    bagla('kart-tum', function () { kartBaslat(true); });
    bagla('test-basla', function () { testBaslat(oncelikli(secili(), sayi(secili()))); });
    bagla('yaz-basla', function () { yazBaslat(oncelikli(secili(), sayi(secili()))); });
    bagla('liste', listeEkran);
    bagla('sifirla', function () {
      if (window.confirm('Tüm kart ilerlemesi ve deneme geçmişi bu tarayıcıdan silinsin mi?')) { depo.kutu = {}; depo.denemeler = []; depoYaz(); anaEkran(); }
    });
  }
  function bagla(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  function ustBar(sol, sag) {
    return '<div class="soru-ust"><button type="button" class="baglanti" id="cik">← Ana sayfa</button><span class="bosluk"></span>' +
      (sol || '') + (sag ? '<span class="durum">' + sag + '</span>' : '') + '</div>';
  }

  /* ---------- kartlar ---------- */
  var kart = null;   // { kuyruk: [oge], i, cevrildi, bildim: {}, tekrar: {}, yon }

  function kartBaslat(hepsi, idler) {
    var liste;
    if (idler) liste = karistir(idler.map(function (id) { return OGE[id]; }).filter(Boolean));
    else if (hepsi) liste = karistir(secili());
    else {
      var simdi = Date.now(), s = secili();
      var vade = karistir(s.filter(function (o) { return vadesiGeldi(o.id, simdi); })).sort(function (a, b) { return kutuNo(a.id) - kutuNo(b.id); });
      var yeni = karistir(s.filter(function (o) { return !kayit(o.id); })).slice(0, YENI_LIMIT);
      liste = vade.concat(yeni);
    }
    if (!liste.length) return anaEkran();
    kart = { kuyruk: liste, i: 0, cevrildi: false, bildim: {}, tekrar: {}, ilk: liste.length };
    kartCiz();
  }

  function kartCiz() {
    var o = kart.kuyruk[kart.i];
    var on = ayar.yon === 'tr'
      ? '<p class="kart-etiket">Türkçe</p><p class="kart-on tr">' + h(o.tr) + '</p>' +
        (o.anlam.length ? '<p class="kart-alt">= ' + h(o.anlam[0]) + '</p>' : '') +
        (o.zit ? '<p class="kart-alt">≠ ' + h(o.zit.ifade) + '</p>' : '')
      : '<p class="kart-etiket">' + h(dersKisa(o._ders)) + '</p><p class="kart-on">' + h(o.ifade) + '</p>';
    var kalan = kart.kuyruk.length - kart.i;
    goster(
      ustBar('', kalan + ' kart kaldı') +
      '<div class="ilerleme" aria-hidden="true"><span style="width:' + yuzde(kart.i, kart.kuyruk.length) + '%"></span></div>' +
      '<div class="kart' + (kart.cevrildi ? ' cevrik' : '') + '" id="kart" role="button" tabindex="0" aria-label="' + (kart.cevrildi ? 'Kartın arka yüzü' : 'Kartı çevir') + '">' +
      '<div class="kart-yuz">' + on + (kart.cevrildi ? '' : '<p class="kart-ipucu">Çevirmek için dokun</p>') + '</div>' +
      (kart.cevrildi ? '<div class="kart-arka">' + ayrintiHtml(o, ayar.yon === 'tr') + '</div>' : '') +
      '</div>' +
      (kart.cevrildi
        ? '<div class="kart-dugmeler"><button type="button" class="btn karar yanlis" id="bilemedim">Bilemedim</button><button type="button" class="btn karar dogru" id="bildim">Bildim</button></div>' +
          '<p class="klavye ortala"><kbd>1</kbd> bilemedim · <kbd>2</kbd> bildim</p>'
        : '<div class="kart-dugmeler"><button type="button" class="btn buyuk" id="cevir">Çevir</button>' + (ayar.yon === 'en' ? sesDugme(o.ifade) : '') + '</div>' +
          '<p class="klavye ortala"><kbd>Boşluk</kbd> çevir</p>')
    );
    sesBagla();
    bagla('cik', anaEkran);
    var k = document.getElementById('kart');
    k.addEventListener('click', function (e) { if (!kart.cevrildi && !e.target.closest('[data-ses]')) cevir(); });
    bagla('cevir', cevir);
    bagla('bildim', function () { kartKarar(true); });
    bagla('bilemedim', function () { kartKarar(false); });
    klavye = function (e) {
      if (!kart.cevrildi && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); cevir(); }
      else if (kart.cevrildi && (e.key === '1' || e.key === 'ArrowLeft')) { e.preventDefault(); kartKarar(false); }
      else if (kart.cevrildi && (e.key === '2' || e.key === 'ArrowRight')) { e.preventDefault(); kartKarar(true); }
    };
    var odak = document.getElementById(kart.cevrildi ? 'bildim' : 'cevir');
    if (odak) odak.focus({ preventScroll: true });
  }
  function cevir() { kart.cevrildi = true; kartCiz(); }
  function kartKarar(bildi) {
    var o = kart.kuyruk[kart.i];
    // Kutu yalnız kartın oturumdaki ilk cevabıyla değişir; yeniden sorulan kart bilinse de 1. kutuda kalır.
    if (!kart.tekrar[o.id] && !kart.bildim[o.id]) kutuGuncelle(o.id, bildi);
    if (bildi) kart.bildim[o.id] = true;
    else { kart.tekrar[o.id] = true; kart.kuyruk.push(o); }
    kart.i++; kart.cevrildi = false;
    if (kart.i >= kart.kuyruk.length) kartSonu(); else kartCiz();
  }
  function kartSonu() {
    klavye = null;
    var ilkte = 0, zor = [];
    Object.keys(kart.bildim).forEach(function (id) { if (!kart.tekrar[id]) ilkte++; });
    Object.keys(kart.tekrar).forEach(function (id) { zor.push(OGE[id]); });
    goster(
      '<div class="giris">' +
      '<header class="giris-baslik"><h1>Kartlar bitti</h1><p>' + kart.ilk + ' kartın ' + ilkte + ' tanesini ilk seferde bildin.</p></header>' +
      (zor.length ? '<section><div class="bolum-baslik"><h2>Zorlandıkların · ' + zor.length + '</h2></div><ul class="zayif">' +
        zor.map(function (o) { return '<li><span>' + h(o.ifade) + '</span><span class="muted">' + h(o.tr) + '</span></li>'; }).join('') + '</ul></section>' : '') +
      '<div class="btn-satir">' +
      (zor.length ? '<button type="button" class="btn vurgu" id="zor-test">Zorlandıklarımı test et</button>' : '') +
      '<button type="button" class="btn ikincil" id="ana">Ana sayfa</button></div>' +
      '</div>'
    );
    bagla('zor-test', function () { testBaslat(karistir(zor)); });
    bagla('ana', anaEkran);
  }

  /* ---------- test (çoktan seçmeli, anında geri bildirim) ---------- */
  var test = null;   // { sorular: [q], i, dogru }

  function testBaslat(liste) {
    if (!liste.length) return anaEkran();
    test = { sorular: liste.map(soruUret), i: 0, dogru: 0 };
    testCiz();
  }
  function testCiz() {
    var q = test.sorular[test.i], n = test.sorular.length, bitti = q.cevap !== null;
    var secHtml = q.secenekler.map(function (s, k) {
      var sinif = '';
      if (bitti) sinif = s.dogru ? ' dogru' : (q.cevap === k ? ' yanlis' : ' soluk');
      return '<li><button type="button" class="secenek' + sinif + '" data-k="' + k + '"' + (bitti ? ' aria-disabled="true"' : '') + '>' +
        '<span class="harf" aria-hidden="true">' + (bitti && s.dogru ? '✓' : bitti && q.cevap === k ? '✗' : HARF[k]) + '</span><span>' + h(s.metin) + '</span></button></li>';
    }).join('');
    var dogruMu = bitti && q.secenekler[q.cevap].dogru;
    goster(
      ustBar('<span class="soru-no">' + (test.i + 1) + ' <span class="muted">/ ' + n + '</span></span>', '') +
      '<div class="ilerleme" aria-hidden="true"><span style="width:' + yuzde(test.i + (bitti ? 1 : 0), n) + '%"></span></div>' +
      '<p class="soru-tur">' + h(q.baslik) + '</p>' +
      '<h2 class="soru-metin ifade-soru" id="soru">' + h(q.metin) + (q.ses ? ' ' + sesDugme(q.ses) : '') + '</h2>' +
      (q.ipucu ? '<p class="soru-ipucu">' + h(q.ipucu) + '</p>' : '') +
      '<ul class="secenekler" aria-labelledby="soru">' + secHtml + '</ul>' +
      (bitti
        ? '<div class="geri-bildirim ' + (dogruMu ? 'dogru' : 'yanlis') + '" role="status"><p class="gb-baslik">' + (dogruMu ? '✓ Doğru' : '✗ Yanlış') + '</p>' + ayrintiHtml(q.o, true) + '</div>' +
          '<div class="soru-alt"><span class="klavye"><kbd>Enter</kbd> devam</span><span class="bosluk"></span><button type="button" class="btn vurgu" id="ileri">' + (test.i === n - 1 ? 'Sonucu gör' : 'Sonraki') + '</button></div>'
        : '<div class="soru-alt"><span class="klavye"><kbd>1</kbd>–<kbd>4</kbd> seç</span></div>')
    );
    sesBagla();
    bagla('cik', anaEkran);
    if (!bitti) ekran.querySelectorAll('.secenek').forEach(function (b) {
      b.addEventListener('click', function () { testSec(parseInt(b.getAttribute('data-k'), 10)); });
    });
    bagla('ileri', testIleri);
    klavye = function (e) {
      var q2 = test.sorular[test.i];
      if (q2.cevap === null && /^[1-4]$/.test(e.key)) { e.preventDefault(); testSec(parseInt(e.key, 10) - 1); }
      else if (q2.cevap !== null && (e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); testIleri(); }
    };
    var ileri = document.getElementById('ileri');
    if (ileri) ileri.focus({ preventScroll: true });
  }
  function testSec(k) {
    var q = test.sorular[test.i];
    if (q.cevap !== null || !q.secenekler[k]) return;
    q.cevap = k;
    var d = q.secenekler[k].dogru;
    if (d) test.dogru++;
    kutuGuncelle(q.o.id, d);
    testCiz();
  }
  function testIleri() { if (test.i < test.sorular.length - 1) { test.i++; testCiz(); } else sonucEkran('test', test.sorular.map(function (q) { return { o: q.o, dogru: q.secenekler[q.cevap].dogru }; })); }

  /* ---------- yazma ---------- */
  var yaz = null;   // { liste: [oge], i, sonuclar: [{o, dogru, yazilan, durum}], ipucu }

  function yazBaslat(liste) {
    if (!liste.length) return anaEkran();
    yaz = { liste: liste, i: 0, sonuclar: [], ipucu: false };
    yazCiz();
  }
  function yazCiz() {
    var o = yaz.liste[yaz.i], n = yaz.liste.length, s = yaz.sonuclar[yaz.i];
    var gb = '';
    if (s) {
      var baslik = s.durum === 'tam' ? '✓ Doğru' : s.durum === 'yakin' ? '✓ Doğru sayıldı (küçük yazım hatası)' : s.durum === 'elle' ? '✓ Doğru sayıldı' : '✗ Yanlış';
      gb = '<div class="geri-bildirim ' + (s.dogru ? 'dogru' : 'yanlis') + '" role="status"><p class="gb-baslik">' + baslik + '</p>' +
        (s.yazilan && s.durum !== 'tam' ? '<p class="gb-yazilan">Senin cevabın: <b>' + h(s.yazilan) + '</b></p>' : '') +
        ayrintiHtml(o, true) + '</div>' +
        '<div class="soru-alt">' + (s.durum === 'yanlis' && s.yazilan ? '<button type="button" class="baglanti" id="elle">Cevabım doğruydu, doğru say</button>' : '') +
        '<span class="bosluk"></span><button type="button" class="btn vurgu" id="ileri">' + (yaz.i === n - 1 ? 'Sonucu gör' : 'Sonraki') + '</button></div>';
    }
    goster(
      ustBar('<span class="soru-no">' + (yaz.i + 1) + ' <span class="muted">/ ' + n + '</span></span>', '') +
      '<div class="ilerleme" aria-hidden="true"><span style="width:' + yuzde(yaz.i + (s ? 1 : 0), n) + '%"></span></div>' +
      '<p class="soru-tur">İngilizce ifadeyi yaz</p>' +
      '<h2 class="soru-metin" id="soru">' + h(o.tr) + '</h2>' +
      (o.anlam.length ? '<p class="soru-ipucu">= ' + h(o.anlam[0]) + '</p>' : '') +
      (o.zit ? '<p class="soru-ipucu">≠ ' + h(o.zit.ifade) + '</p>' : '') +
      (yaz.ipucu || s ? '<p class="soru-ipucu harfler">İpucu: ' + h(ipucu(o.ifade)) + '</p>' : '') +
      '<form class="yaz-form" id="yaz-form" autocomplete="off">' +
      '<input type="text" id="yaz-girdi" class="yaz-girdi" aria-labelledby="soru" spellcheck="false" autocapitalize="none" autocorrect="off" lang="en"' +
      (s ? ' value="' + h(s.yazilan) + '" disabled' : '') + ' placeholder="to …">' +
      (s ? '' : '<div class="btn-satir"><button type="submit" class="btn">Kontrol et</button>' +
        (yaz.ipucu ? '' : '<button type="button" class="btn ikincil" id="ipucu">İpucu</button>') +
        '<button type="button" class="baglanti" id="bilmiyorum">Bilmiyorum</button></div>') +
      '</form>' + gb
    );
    sesBagla();
    bagla('cik', anaEkran);
    var form = document.getElementById('yaz-form'), girdi = document.getElementById('yaz-girdi');
    form.addEventListener('submit', function (e) { e.preventDefault(); if (!s) yazKontrol(girdi.value); });
    bagla('ipucu', function () { yaz.ipucu = true; var v = girdi.value; yazCiz(); var g = document.getElementById('yaz-girdi'); g.value = v; g.focus(); });
    bagla('bilmiyorum', function () { yazKontrol(''); });
    bagla('elle', function () {
      var r = yaz.sonuclar[yaz.i];
      r.dogru = true; r.durum = 'elle';
      // Kutuyu düzelt: yanlış cevaptan önceki kaydı geri yükle, sonra doğru say.
      if (r.onceki) depo.kutu[o.id] = r.onceki; else delete depo.kutu[o.id];
      kutuGuncelle(o.id, true);
      yazCiz();
    });
    bagla('ileri', yazIleri);
    klavye = s ? function (e) { if (e.key === 'Enter') { e.preventDefault(); yazIleri(); } } : null;
    if (s) { var ileri = document.getElementById('ileri'); if (ileri) ileri.focus({ preventScroll: true }); }
    else girdi.focus({ preventScroll: true });
  }
  function yazKontrol(deger) {
    var o = yaz.liste[yaz.i];
    var durum = karsilastir(o, deger);
    var dogru = durum !== 'yanlis';
    var onceki = depo.kutu[o.id] ? JSON.parse(JSON.stringify(depo.kutu[o.id])) : null;
    yaz.sonuclar[yaz.i] = { o: o, dogru: dogru, yazilan: deger.trim(), durum: durum, onceki: onceki };
    kutuGuncelle(o.id, dogru);
    yazCiz();
  }
  function yazIleri() {
    if (yaz.i < yaz.liste.length - 1) { yaz.i++; yaz.ipucu = false; yazCiz(); }
    else sonucEkran('yaz', yaz.sonuclar.map(function (r) { return { o: r.o, dogru: r.dogru }; }));
  }

  /* ---------- sonuç ---------- */
  function sonucEkran(tur, sonuclar) {
    klavye = null;
    var n = sonuclar.length, dogru = sonuclar.filter(function (r) { return r.dogru; }).length, p = yuzde(dogru, n);
    var yanlis = sonuclar.filter(function (r) { return !r.dogru; }).map(function (r) { return r.o; });
    depo.denemeler.push({ t: Date.now(), tur: tur, n: n, dogru: dogru, dersler: ayar.dersler.slice() });
    if (depo.denemeler.length > 50) depo.denemeler = depo.denemeler.slice(-50);
    depoYaz();
    goster(
      '<div class="giris">' +
      '<div class="sonuc-ozet"><div class="halka" style="--p:' + p + '"><div><span>%' + p + '</span><small>' + dogru + ' / ' + n + '</small></div></div>' +
      '<div><h1>' + (p >= 80 ? 'Çok iyi' : p >= 60 ? 'İyi gidiyor' : 'Biraz daha tekrar') + '</h1><p class="muted">' + (tur === 'yaz' ? 'Yazma çalışması' : 'Test') + ' · ' + n + ' soru</p></div></div>' +
      (yanlis.length ? '<section><div class="bolum-baslik"><h2>Yanlışların · ' + yanlis.length + '</h2></div><ul class="zayif">' +
        yanlis.map(function (o) { return '<li><span>' + h(o.ifade) + '</span><span class="muted">' + h(o.tr) + '</span></li>'; }).join('') + '</ul></section>' : '') +
      '<div class="btn-satir">' +
      (yanlis.length ? '<button type="button" class="btn vurgu" id="yanlis-kart">Yanlışları kartlarla çalış</button>' : '') +
      (yanlis.length ? '<button type="button" class="btn ikincil" id="yanlis-tekrar">Yanlışları yeniden ' + (tur === 'yaz' ? 'yaz' : 'çöz') + '</button>' : '') +
      '<button type="button" class="btn ikincil" id="ana">Ana sayfa</button></div>' +
      '</div>'
    );
    var idler = yanlis.map(function (o) { return o.id; });
    bagla('yanlis-kart', function () { kartBaslat(false, idler); });
    bagla('yanlis-tekrar', function () { if (tur === 'yaz') yazBaslat(karistir(yanlis)); else testBaslat(karistir(yanlis)); });
    bagla('ana', anaEkran);
  }

  /* ---------- liste ---------- */
  function listeEkran() {
    klavye = null;
    goster(
      ustBar('', TUM.length + ' ifade') +
      '<div class="giris"><header class="giris-baslik"><h1>Tüm ifadeler</h1></header>' +
      '<input type="search" id="ara" class="yaz-girdi" placeholder="Ara: İngilizce, anlam veya Türkçe" aria-label="İfadelerde ara">' +
      '<div id="liste-govde"></div></div>'
    );
    bagla('cik', anaEkran);
    var ara = document.getElementById('ara'), govde = document.getElementById('liste-govde');
    function ciz() {
      var q = ara.value.toLocaleLowerCase('tr').trim();
      govde.innerHTML = DERSLER.map(function (d) {
        var ogeler = d.ogeler.filter(function (o) {
          if (!q) return true;
          return [o.ifade, o.tr, o.anlam.join(' '), o.zit ? o.zit.ifade : ''].join(' ').toLocaleLowerCase('tr').indexOf(q) >= 0;
        });
        if (!ogeler.length) return '';
        return '<section class="liste-ders"><div class="bolum-baslik"><h2>' + h(d.ders) + ' · <span lang="en">' + h(d.baslik) + '</span></h2><span class="ipucu">' + ogeler.length + '</span></div>' +
          ogeler.map(function (o) {
            var k = kutuNo(o.id);
            return '<article class="liste-oge"><div class="liste-ust"><span class="liste-ifade">' + h(o.ifade) + '</span>' + sesDugme(o.ifade) +
              '<span class="bosluk"></span><span class="pil ' + durumSinif(k) + '">' + durumAd(k) + '</span></div>' + ayrintiHtml(o, false) + '</article>';
          }).join('') + '</section>';
      }).join('') || '<p class="muted">Sonuç yok.</p>';
      sesBagla(govde);
    }
    ara.addEventListener('input', ciz);
    ciz();
  }

  document.addEventListener('keydown', function (e) {
    if (!klavye || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && e.key !== 'Enter') return;
    if (t && t.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter') && t.id !== 'cevir' && t.id !== 'ileri' && t.id !== 'bildim') return;
    klavye(e);
  });
  if (SES) { try { window.speechSynthesis.getVoices(); } catch (e) { /* yok */ } }

  if (!TUM.length) { goster('<p class="yukleniyor">İfade bulunamadı.</p>'); return; }
  anaEkran();
})();

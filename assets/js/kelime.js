/* İngilizce Kartlar (layouts/kelime/single.html). İfadeler sayfaya gömülü JSON'dan okunur (data/ingilizce/ifadeler.json).
   Ders ayrımı yok: tüm ifadeler tek havuz. Ezber sistemi Leitner kutuları (1–5): bilinen kart bir üst kutuya çıkar ve
   daha geç tekrar edilir; bilinmeyen kart 1. kutuya döner ve aynı oturumda yeniden sorulur. Kartlar, test ve yazma
   aynı kutuları günceller. Sunucuya veri gitmez: ilerleme ziyaretçinin tarayıcısında (localStorage). */
(function () {
  'use strict';

  var kaynakEl = document.getElementById('veri');
  var VERI = {};
  try { VERI = JSON.parse(kaynakEl ? kaynakEl.textContent : '{}') || {}; } catch (e) { VERI = {}; }

  var TUM = [];
  var OGE = {};
  Object.keys(VERI).forEach(function (k) {
    var d = VERI[k];
    if (!d || !Array.isArray(d.ogeler)) return;
    d.ogeler.forEach(function (o) {
      o.anlam = Array.isArray(o.anlam) ? o.anlam : [];
      o.grup = Array.isArray(o.grup) ? o.grup : [];
      OGE[o.id] = o; TUM.push(o);
    });
  });

  var DEPO = 'ingkelime_v2';
  var GUN = 86400000;
  var ARALIK = [0, 0, 1, 3, 7, 16];          // kutuya göre tekrar aralığı (gün); 1. kutu hemen
  var YENI_LIMIT = 15;                         // bir kart oturumuna eklenen en çok yeni kart
  var SAYILAR = [10, 20];
  var HARF = ['A', 'B', 'C', 'D'];

  var ekran = document.getElementById('ekran');
  var klavye = null;                           // etkin ekranın klavye işleyicisi

  /* ---------- simgeler (satır içi SVG, currentColor) ---------- */
  function svg(yol, boyut) {
    return '<svg viewBox="0 0 24 24" width="' + (boyut || 20) + '" height="' + (boyut || 20) + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + yol + '</svg>';
  }
  var IKON = {
    kart: svg('<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/>'),
    test: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>'),
    yaz: svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
    liste: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
    ok: svg('<path d="M9 6l6 6-6 6"/>', 18),
    geri: svg('<path d="M15 6l-6 6 6 6"/>', 18),
    tamam: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', 28),
    ses: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

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
  var ayar = Object.assign({ n: 10, yon: 'en' }, depo.ayar || {});
  if (ayar.n !== 'tum' && SAYILAR.indexOf(ayar.n) < 0) ayar.n = 10;
  if (ayar.yon !== 'en' && ayar.yon !== 'tr') ayar.yon = 'en';
  function ayarKaydet() { depo.ayar = { n: ayar.n, yon: ayar.yon }; depoYaz(); }

  /* ---------- yardımcılar ---------- */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function karistir(dizi) { var a = dizi.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rastgele(dizi) { return dizi[Math.floor(Math.random() * dizi.length)]; }
  function yuzde(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function rozetSinif(p) { return p >= 80 ? 'iyi' : p >= 60 ? 'orta' : 'zayif'; }
  function tarihMetni(t) { try { return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function ornekHtml(s) { return h(s).replace(/\[\[(.+?)\]\]/g, '<mark>$1</mark>'); }
  function goster(html) { ekran.innerHTML = html; window.scrollTo(0, 0); ekran.focus({ preventScroll: true }); }
  function bagla(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  function siralamaAnahtari(o) { return o.ifade.toLowerCase().replace(/^(to|a|an|the)\s+/, ''); }

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
  function sesDugme(metin, sinif) {
    if (!SES) return '';
    return '<button type="button" class="ses' + (sinif ? ' ' + sinif : '') + '" data-ses="' + h(metin) + '" aria-label="Sesli oku: ' + h(metin) + '" title="Sesli oku">' + IKON.ses + '</button>';
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
  var DURUMLAR = [
    { id: 'yeni', ad: 'Yeni' },
    { id: 'ogreniliyor', ad: 'Öğreniliyor' },
    { id: 'pekisiyor', ad: 'Pekişiyor' },
    { id: 'ogrenildi', ad: 'Öğrenildi' }
  ];
  function durumSinif(k) { return k >= 5 ? 'ogrenildi' : k >= 3 ? 'pekisiyor' : k >= 1 ? 'ogreniliyor' : 'yeni'; }
  function durumAd(k) { var s = durumSinif(k); for (var i = 0; i < DURUMLAR.length; i++) if (DURUMLAR[i].id === s) return DURUMLAR[i].ad; return ''; }
  function dagilim(liste) {
    var d = { yeni: 0, ogreniliyor: 0, pekisiyor: 0, ogrenildi: 0 };
    liste.forEach(function (o) { d[durumSinif(kutuNo(o.id))]++; });
    return d;
  }
  function pil(k) { return '<span class="pil ' + durumSinif(k) + '">' + durumAd(k) + '</span>'; }

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
     cevap gibi görünen seçenek çıkmaz. */
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
      q.metin = o.ifade; q.ses = o.ifade;
      if (o.zit) {
        q.baslik = 'Zıt anlamlısı hangisi?';
        dogru = o.zit.ifade;
        yanlislar = celdiriciler(o, function (x) { return x.ifade; }, dogru, 3);
      } else {
        q.baslik = 'Anlamı hangisi?';
        dogru = rastgele(o.anlam);
        yanlislar = celdiriciler(o, function (x) { return x.anlam.length ? rastgele(x.anlam) : ''; }, dogru, 3);
      }
    } else if (tur === 'ters') {
      if (o.zit) { q.baslik = 'Zıt anlamlısı bu olan ifade hangisi?'; q.metin = o.zit.ifade; }
      else { q.baslik = 'Bu anlama gelen ifade hangisi?'; q.metin = rastgele(o.anlam); }
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
  function oncelikli(n) {
    var sirali = karistir(TUM).sort(function (a, b) { return kutuNo(a.id) - kutuNo(b.id); });
    return karistir(sirali.slice(0, n));
  }
  function sayi() { return ayar.n === 'tum' ? TUM.length : Math.min(ayar.n, TUM.length); }

  /* ---------- ifade ayrıntısı (kart arka yüzü, geri bildirim, liste) ---------- */
  function ayrintiHtml(o, ifadeGoster) {
    return (ifadeGoster ? '<p class="ay-ifade" lang="en"><span>' + h(o.ifade) + '</span>' + sesDugme(o.ifade) + '</p>' : '') +
      (o.anlam.length ? '<ul class="ay-anlam" lang="en">' + o.anlam.map(function (a) { return '<li><span class="isaret" title="eş anlam">=</span><span>' + h(a) + '</span></li>'; }).join('') + '</ul>' : '') +
      (o.zit ? '<ul class="ay-anlam zit"><li><span class="isaret" title="zıt anlam">≠</span><span><b lang="en">' + h(o.zit.ifade) + '</b> <span class="muted">· ' + h(o.zit.tr) + '</span></span></li></ul>' : '') +
      '<p class="ay-tr">' + h(o.tr) + '</p>' +
      (o.ornek ? '<p class="ay-ornek" lang="en">' + ornekHtml(o.ornek) + '</p>' : '') +
      (o.not ? '<p class="ay-not">' + h(o.not) + '</p>' : '');
  }
  function ustBar(orta, sag) {
    return '<div class="ust-bar"><button type="button" class="geri-dugme" id="cik">' + IKON.geri + '<span>Ana sayfa</span></button>' +
      '<span class="bosluk"></span>' + (orta || '') + (sag ? '<span class="durum">' + sag + '</span>' : '') + '</div>';
  }
  function ilerleme(oran) { return '<div class="ilerleme" aria-hidden="true"><span style="width:' + oran + '%"></span></div>'; }

  /* ---------- ana ekran ---------- */
  function anaEkran() {
    klavye = null;
    var simdi = Date.now();
    var vade = TUM.filter(function (o) { return vadesiGeldi(o.id, simdi); }).length;
    var yeni = TUM.filter(function (o) { return !kayit(o.id); }).length;
    var kartSayi = vade + Math.min(YENI_LIMIT, yeni);
    var d = dagilim(TUM), N = TUM.length;
    function w(x) { return (N ? 100 * x / N : 0).toFixed(2) + '%'; }

    var sayiHtml = SAYILAR.map(function (n) {
      return '<button type="button" data-n="' + n + '" aria-pressed="' + (ayar.n === n) + '">' + n + '</button>';
    }).join('') + '<button type="button" data-n="tum" aria-pressed="' + (ayar.n === 'tum') + '">Tümü</button>';

    var gecmis = depo.denemeler.slice(-4).reverse();
    var gecmisHtml = gecmis.map(function (g) {
      var p = yuzde(g.dogru, g.n);
      return '<li class="gecmis-satir"><span class="gecmis-ikon">' + (g.tur === 'yaz' ? IKON.yaz : IKON.test) + '</span>' +
        '<span><span class="gecmis-ad">' + (g.tur === 'yaz' ? 'Yazma' : 'Test') + ' · ' + g.n + ' soru</span><span class="muted">' + h(tarihMetni(g.t)) + '</span></span>' +
        '<span class="skor-rozet ' + rozetSinif(p) + '">%' + p + '</span></li>';
    }).join('');

    var gunluk = kartSayi
      ? '<p class="gunluk-sayi"><b>' + kartSayi + '</b> kart hazır</p>' +
        '<p class="gunluk-alt">' + (vade ? vade + ' tekrar' : '') + (vade && Math.min(YENI_LIMIT, yeni) ? ' · ' : '') + (Math.min(YENI_LIMIT, yeni) ? Math.min(YENI_LIMIT, yeni) + ' yeni ifade' : '') + '</p>'
      : '<p class="gunluk-sayi bitti">' + IKON.tamam + '<span>Bugünkü tekrar bitti</span></p>' +
        '<p class="gunluk-alt">Sıradaki kartlar zamanı gelince burada görünecek.</p>';

    goster(
      '<div class="ana">' +
      '<header class="ana-ust"><h1>İngilizce Kartlar</h1>' +
      '<button type="button" class="btn ikincil kucuk-btn" id="liste">' + IKON.liste + '<span>Liste</span></button></header>' +

      '<section class="panel ilerleme-panel" aria-label="İlerleme">' +
      '<div class="ip-ust"><p class="ip-sayi"><b>' + d.ogrenildi + '</b><span>/ ' + N + ' öğrenildi</span></p><span class="ip-oran">%' + yuzde(d.ogrenildi, N) + '</span></div>' +
      '<div class="dagilim" role="img" aria-label="' + d.ogrenildi + ' öğrenildi, ' + d.pekisiyor + ' pekişiyor, ' + d.ogreniliyor + ' öğreniliyor, ' + d.yeni + ' yeni">' +
      '<span class="ogrenildi" style="width:' + w(d.ogrenildi) + '"></span><span class="pekisiyor" style="width:' + w(d.pekisiyor) + '"></span><span class="ogreniliyor" style="width:' + w(d.ogreniliyor) + '"></span></div>' +
      '<ul class="lejant">' + DURUMLAR.slice().reverse().map(function (s) { return '<li><i class="' + s.id + '"></i>' + s.ad + ' <b>' + d[s.id] + '</b></li>'; }).join('') + '</ul>' +
      '</section>' +

      '<section class="panel gunluk" aria-labelledby="b-gunluk">' +
      '<div class="panel-baslik"><span class="panel-ikon">' + IKON.kart + '</span><h2 id="b-gunluk">Bugünkü tekrar</h2></div>' +
      gunluk +
      '<div class="segment tam" role="group" aria-label="Kart yönü"><button type="button" data-yon="en" aria-pressed="' + (ayar.yon === 'en') + '">İngilizce → anlam</button>' +
      '<button type="button" data-yon="tr" aria-pressed="' + (ayar.yon === 'tr') + '">Türkçe → İngilizce</button></div>' +
      (kartSayi
        ? '<button type="button" class="btn vurgu buyuk tam" id="kart-basla">Kartlara başla</button>'
        : '<button type="button" class="btn buyuk tam" id="kart-tum">Tüm kartları karışık çalış</button>') +
      (kartSayi ? '<button type="button" class="baglanti ortala" id="kart-tum">ya da tüm kartları karışık çalış</button>' : '') +
      '</section>' +

      '<section aria-labelledby="b-sina">' +
      '<div class="bolum-baslik"><h2 id="b-sina">Kendini sına</h2></div>' +
      '<div class="karolar">' +
      '<button type="button" class="karo" id="test-basla"><span class="karo-ikon">' + IKON.test + '</span><span class="karo-metin"><b>Test</b><span>Çoktan seçmeli, anında geri bildirim</span></span><span class="karo-ok">' + IKON.ok + '</span></button>' +
      '<button type="button" class="karo" id="yaz-basla"><span class="karo-ikon">' + IKON.yaz + '</span><span class="karo-metin"><b>Yazma</b><span>Türkçesini gör, İngilizcesini yaz</span></span><span class="karo-ok">' + IKON.ok + '</span></button>' +
      '</div>' +
      '<div class="ayar-satir"><span class="ayar-ad" id="b-sayi">Soru sayısı</span><div class="segment kucuk" role="group" aria-labelledby="b-sayi" data-grup="n">' + sayiHtml + '</div></div>' +
      '</section>' +

      (gecmisHtml ? '<section aria-labelledby="b-gecmis"><div class="bolum-baslik"><h2 id="b-gecmis">Son denemeler</h2></div><ul class="gecmis">' + gecmisHtml + '</ul></section>' : '') +
      '<p class="dipnot">İlerleme yalnız bu tarayıcıda saklanır · <button type="button" class="baglanti" id="sifirla">sıfırla</button></p>' +
      '</div>'
    );

    ekran.querySelectorAll('[data-grup="n"] button').forEach(function (b) {
      b.addEventListener('click', function () { var v = b.getAttribute('data-n'); ayar.n = v === 'tum' ? 'tum' : parseInt(v, 10); ayarKaydet(); anaEkran(); });
    });
    ekran.querySelectorAll('[data-yon]').forEach(function (b) {
      b.addEventListener('click', function () { ayar.yon = b.getAttribute('data-yon'); ayarKaydet(); anaEkran(); });
    });
    bagla('kart-basla', function () { kartBaslat(false); });
    bagla('kart-tum', function () { kartBaslat(true); });
    bagla('test-basla', function () { testBaslat(oncelikli(sayi())); });
    bagla('yaz-basla', function () { yazBaslat(oncelikli(sayi())); });
    bagla('liste', function () { listeEkran(''); });
    bagla('sifirla', function () {
      if (window.confirm('Tüm kart ilerlemesi ve deneme geçmişi bu tarayıcıdan silinsin mi?')) { depo.kutu = {}; depo.denemeler = []; depoYaz(); anaEkran(); }
    });
  }

  /* ---------- kartlar ---------- */
  var kart = null;   // { kuyruk: [oge], i, cevrildi, bildim: {}, tekrar: {}, ilk }

  function kartBaslat(hepsi, idler) {
    var liste;
    if (idler) liste = karistir(idler.map(function (id) { return OGE[id]; }).filter(Boolean));
    else if (hepsi) liste = karistir(TUM);
    else {
      var simdi = Date.now();
      var vade = karistir(TUM.filter(function (o) { return vadesiGeldi(o.id, simdi); })).sort(function (a, b) { return kutuNo(a.id) - kutuNo(b.id); });
      var yeni = karistir(TUM.filter(function (o) { return !kayit(o.id); })).slice(0, YENI_LIMIT);
      liste = vade.concat(yeni);
    }
    if (!liste.length) return anaEkran();
    kart = { kuyruk: liste, i: 0, cevrildi: false, bildim: {}, tekrar: {}, ilk: liste.length };
    kartCiz();
  }

  function kartCiz() {
    var o = kart.kuyruk[kart.i];
    var on = ayar.yon === 'tr'
      ? '<p class="kart-on tr">' + h(o.tr) + '</p>' +
        (o.anlam.length ? '<p class="kart-alt" lang="en">= ' + h(o.anlam[0]) + '</p>' : '') +
        (o.zit ? '<p class="kart-alt" lang="en">≠ ' + h(o.zit.ifade) + '</p>' : '')
      : '<p class="kart-on" lang="en">' + h(o.ifade) + '</p>';
    var kalan = kart.kuyruk.length - kart.i;
    goster(
      ustBar('', kalan + ' kart') +
      ilerleme(yuzde(kart.i, kart.kuyruk.length)) +
      '<div class="kart' + (kart.cevrildi ? ' cevrik' : '') + '" id="kart"' + (kart.cevrildi ? '' : ' role="button" tabindex="0" aria-label="Kartı çevir"') + '>' +
      '<div class="kart-kose">' + pil(kutuNo(o.id)) + (ayar.yon === 'en' || kart.cevrildi ? sesDugme(o.ifade) : '') + '</div>' +
      '<div class="kart-yuz">' + on + (kart.cevrildi ? '' : '<p class="kart-ipucu">Çevirmek için dokun</p>') + '</div>' +
      (kart.cevrildi ? '<div class="kart-arka">' + ayrintiHtml(o, ayar.yon === 'tr') + '</div>' : '') +
      '</div>' +
      '<div class="eylem-cubugu">' +
      (kart.cevrildi
        ? '<div class="kart-dugmeler"><button type="button" class="btn karar yanlis" id="bilemedim">Bilemedim</button><button type="button" class="btn karar dogru" id="bildim">Bildim</button></div>' +
          '<p class="klavye ortala"><kbd>1</kbd> bilemedim · <kbd>2</kbd> bildim</p>'
        : '<div class="kart-dugmeler"><button type="button" class="btn buyuk tam" id="cevir">Çevir</button></div>' +
          '<p class="klavye ortala"><kbd>Boşluk</kbd> çevir</p>') +
      '</div>'
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
    var p = yuzde(ilkte, kart.ilk);
    goster(
      '<div class="ana">' +
      '<div class="sonuc-ozet">' + halka(p, ilkte + ' / ' + kart.ilk) +
      '<div><h1>Kartlar bitti</h1><p class="muted">' + kart.ilk + ' kartın ' + ilkte + ' tanesini ilk seferde bildin.</p></div></div>' +
      (zor.length ? '<section><div class="bolum-baslik"><h2>Zorlandıkların · ' + zor.length + '</h2></div>' + kisaListe(zor) + '</section>' : '') +
      '<div class="btn-satir">' +
      (zor.length ? '<button type="button" class="btn vurgu" id="zor-test">Zorlandıklarımı test et</button>' : '') +
      '<button type="button" class="btn ikincil" id="ana">Ana sayfa</button></div>' +
      '</div>'
    );
    bagla('zor-test', function () { testBaslat(karistir(zor)); });
    bagla('ana', anaEkran);
  }
  function halka(p, alt) { return '<div class="halka" style="--p:' + p + '"><div><span>%' + p + '</span><small>' + alt + '</small></div></div>'; }
  function kisaListe(liste) {
    return '<ul class="kisa-liste">' + liste.map(function (o) {
      return '<li><span class="kl-ifade" lang="en">' + h(o.ifade) + '</span><span class="kl-tr">' + h(o.tr) + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ---------- test (çoktan seçmeli, anında geri bildirim) ---------- */
  var test = null;   // { sorular: [q], i }

  function testBaslat(liste) {
    if (!liste.length) return anaEkran();
    test = { sorular: liste.map(soruUret), i: 0 };
    testCiz();
  }
  function testCiz() {
    var q = test.sorular[test.i], n = test.sorular.length, bitti = q.cevap !== null;
    var dilEn = q.tur === 'tr' ? '' : ' lang="en"';
    var secDil = q.tur === 'anlam' || q.tur === 'ters' || q.tur === 'tr' || q.tur === 'bosluk' ? ' lang="en"' : '';
    var secHtml = q.secenekler.map(function (s, k) {
      var sinif = '';
      if (bitti) sinif = s.dogru ? ' dogru' : (q.cevap === k ? ' yanlis' : ' soluk');
      return '<li><button type="button" class="secenek' + sinif + '" data-k="' + k + '"' + (bitti ? ' aria-disabled="true"' : '') + '>' +
        '<span class="harf" aria-hidden="true">' + (bitti && s.dogru ? '✓' : bitti && q.cevap === k ? '✗' : HARF[k]) + '</span><span' + secDil + '>' + h(s.metin) + '</span></button></li>';
    }).join('');
    var dogruMu = bitti && q.secenekler[q.cevap].dogru;
    goster(
      ustBar('', '<b>' + (test.i + 1) + '</b> / ' + n) +
      ilerleme(yuzde(test.i + (bitti ? 1 : 0), n)) +
      '<p class="soru-tur">' + h(q.baslik) + '</p>' +
      '<h2 class="soru-metin ifade-soru" id="soru"><span' + dilEn + '>' + h(q.metin) + '</span>' + (q.ses ? sesDugme(q.ses) : '') + '</h2>' +
      (q.ipucu ? '<p class="soru-ipucu">' + h(q.ipucu) + '</p>' : '') +
      '<ul class="secenekler" aria-labelledby="soru">' + secHtml + '</ul>' +
      (bitti
        ? '<div class="geri-bildirim ' + (dogruMu ? 'dogru' : 'yanlis') + '" role="status"><p class="gb-baslik">' + (dogruMu ? '✓ Doğru' : '✗ Yanlış') + '</p>' + ayrintiHtml(q.o, true) + '</div>' +
          '<div class="eylem-cubugu"><button type="button" class="btn vurgu buyuk tam" id="ileri">' + (test.i === n - 1 ? 'Sonucu gör' : 'Sonraki soru') + '</button>' +
          '<p class="klavye ortala"><kbd>Enter</kbd> devam</p></div>'
        : '<p class="klavye"><kbd>1</kbd>–<kbd>4</kbd> seç</p>')
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
    if (bitti) {
      var gb = ekran.querySelector('.geri-bildirim');
      if (gb && gb.scrollIntoView) gb.scrollIntoView({ block: 'nearest' });
      var ileri = document.getElementById('ileri');
      if (ileri) ileri.focus({ preventScroll: true });
    }
  }
  function testSec(k) {
    var q = test.sorular[test.i];
    if (q.cevap !== null || !q.secenekler[k]) return;
    q.cevap = k;
    kutuGuncelle(q.o.id, q.secenekler[k].dogru);
    testCiz();
  }
  function testIleri() {
    if (test.i < test.sorular.length - 1) { test.i++; testCiz(); }
    else sonucEkran('test', test.sorular.map(function (q) { return { o: q.o, dogru: q.secenekler[q.cevap].dogru }; }));
  }

  /* ---------- yazma ---------- */
  var yaz = null;   // { liste: [oge], i, sonuclar: [{o, dogru, yazilan, durum, onceki}], ipucu }

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
        (s.yazilan && s.durum !== 'tam' ? '<p class="gb-yazilan">Senin cevabın: <b lang="en">' + h(s.yazilan) + '</b></p>' : '') +
        ayrintiHtml(o, true) +
        (s.durum === 'yanlis' && s.yazilan ? '<button type="button" class="baglanti" id="elle">Cevabım doğruydu, doğru say</button>' : '') +
        '</div>' +
        '<div class="eylem-cubugu"><button type="button" class="btn vurgu buyuk tam" id="ileri">' + (yaz.i === n - 1 ? 'Sonucu gör' : 'Sonraki soru') + '</button>' +
        '<p class="klavye ortala"><kbd>Enter</kbd> devam</p></div>';
    }
    goster(
      ustBar('', '<b>' + (yaz.i + 1) + '</b> / ' + n) +
      ilerleme(yuzde(yaz.i + (s ? 1 : 0), n)) +
      '<p class="soru-tur">İngilizcesini yaz</p>' +
      '<h2 class="soru-metin" id="soru">' + h(o.tr) + '</h2>' +
      (o.anlam.length ? '<p class="soru-ipucu" lang="en">= ' + h(o.anlam[0]) + '</p>' : '') +
      (o.zit ? '<p class="soru-ipucu" lang="en">≠ ' + h(o.zit.ifade) + '</p>' : '') +
      (yaz.ipucu && !s ? '<p class="soru-ipucu harfler" lang="en">' + h(ipucu(o.ifade)) + '</p>' : '') +
      '<form class="yaz-form" id="yaz-form" autocomplete="off">' +
      '<input type="text" id="yaz-girdi" class="yaz-girdi" aria-labelledby="soru" spellcheck="false" autocapitalize="none" autocorrect="off" lang="en" enterkeyhint="done"' +
      (s ? ' value="' + h(s.yazilan) + '" disabled' : '') + ' placeholder="to …">' +
      (s ? '' : '<div class="btn-satir"><button type="submit" class="btn vurgu">Kontrol et</button>' +
        (yaz.ipucu ? '' : '<button type="button" class="btn ikincil" id="ipucu">İpucu</button>') +
        '<span class="bosluk"></span><button type="button" class="baglanti" id="bilmiyorum">Bilmiyorum</button></div>') +
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
    depo.denemeler.push({ t: Date.now(), tur: tur, n: n, dogru: dogru });
    if (depo.denemeler.length > 50) depo.denemeler = depo.denemeler.slice(-50);
    depoYaz();
    goster(
      '<div class="ana">' +
      '<div class="sonuc-ozet">' + halka(p, dogru + ' / ' + n) +
      '<div><h1>' + (p >= 80 ? 'Çok iyi' : p >= 60 ? 'İyi gidiyor' : 'Biraz daha tekrar') + '</h1><p class="muted">' + (tur === 'yaz' ? 'Yazma' : 'Test') + ' · ' + n + ' soru</p></div></div>' +
      (yanlis.length ? '<section><div class="bolum-baslik"><h2>Yanlışların · ' + yanlis.length + '</h2></div>' + kisaListe(yanlis) + '</section>' : '') +
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
  function listeEkran(suzgec) {
    klavye = null;
    var d = dagilim(TUM);
    var cipler = '<button type="button" data-suz="" aria-pressed="' + (!suzgec) + '">Tümü <span>' + TUM.length + '</span></button>' +
      DURUMLAR.map(function (s) { return '<button type="button" data-suz="' + s.id + '" aria-pressed="' + (suzgec === s.id) + '">' + s.ad + ' <span>' + d[s.id] + '</span></button>'; }).join('');
    goster(
      ustBar('', '') +
      '<div class="ana"><header class="ana-ust"><h1>Tüm ifadeler</h1></header>' +
      '<div class="liste-arac"><input type="search" id="ara" class="yaz-girdi" placeholder="İngilizce, anlam ya da Türkçe ara" aria-label="İfadelerde ara">' +
      '<div class="cipler" role="group" aria-label="Duruma göre süz">' + cipler + '</div></div>' +
      '<p class="liste-sayac muted" id="sayac" aria-live="polite"></p>' +
      '<div id="liste-govde" class="liste-govde"></div></div>'
    );
    bagla('cik', anaEkran);
    var ara = document.getElementById('ara'), govde = document.getElementById('liste-govde'), sayac = document.getElementById('sayac');
    var sirali = TUM.slice().sort(function (a, b) { return siralamaAnahtari(a).localeCompare(siralamaAnahtari(b), 'en'); });
    function ciz() {
      var q = ara.value.toLocaleLowerCase('tr').trim();
      var ogeler = sirali.filter(function (o) {
        if (suzgec && durumSinif(kutuNo(o.id)) !== suzgec) return false;
        if (!q) return true;
        return [o.ifade, o.tr, o.anlam.join(' '), o.zit ? o.zit.ifade : ''].join(' ').toLocaleLowerCase('tr').indexOf(q) >= 0;
      });
      sayac.textContent = ogeler.length + ' ifade';
      govde.innerHTML = ogeler.map(function (o) {
        return '<article class="liste-oge"><div class="liste-ust"><span class="liste-ifade" lang="en">' + h(o.ifade) + '</span>' + sesDugme(o.ifade) +
          '<span class="bosluk"></span>' + pil(kutuNo(o.id)) + '</div>' + ayrintiHtml(o, false) + '</article>';
      }).join('') || '<p class="bos-durum">Bu aramaya uyan ifade yok.</p>';
      sesBagla(govde);
    }
    ekran.querySelectorAll('[data-suz]').forEach(function (b) {
      b.addEventListener('click', function () {
        suzgec = b.getAttribute('data-suz');
        ekran.querySelectorAll('[data-suz]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        ciz();
      });
    });
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

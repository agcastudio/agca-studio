// =====================================================================
//  PROJE VERİSİ — Sadece bu dosyayı kendi projenize göre düzenleyin.
//  Tüm ölçüler metre (m). Kotlar YOL (kaldırım önü asfalt) seviyesine göredir.
// =====================================================================
window.PROJE = {
  ad: "znr",
  logo: "logo.png",     // başlıkta gösterilen logo (yoksa "ad" yazılır)
  blok: "Bina",

  // ---- Revit/IFC modeli (model/model.js varsa bu ayarlar kullanılır) ----
  modelAyarlari: {
    yolKotu: null,       // Zemin/yol kotu (±0.00'a göre, m). null = modelden okunur: yolun en alçak noktası (bu modelde -6.00)
    binayiKaldir: true,  // En alt kat yolun altında kalırsa bina o kadar yukarı taşınır (bu modelde gerekmiyor: 0 m)
    haricKatlar: []      // Daire olmayan katlar, ör. ["L1"]
  },

  // ---- Aşağıdakiler yalnızca model YOKKEN çizilen örnek bina içindir ----

  // Kesitten okunacak değerler
  zeminKotu: 1.20,      // Zemin kat döşemesi (±0.00) yoldan kaç m yukarıda
  katYuksekligi: 3.00,  // Döşemeden döşemeye kat yüksekliği

  // Kat listesi (aşağıdan yukarı). İsimleri kat planlarınızdaki gibi yazın.
  katlar: ["Zemin Kat", "1. Kat", "2. Kat", "3. Kat", "4. Kat", "5. Kat", "6. Kat", "7. Kat"],

  // Bina dış ölçüsü (kat planından)
  bina: { en: 24, derinlik: 16 },

  // Vaziyet planından: bina önü ile yol arasındaki mesafeler
  cevre: { onBahce: 5, kaldirim: 3, yolGenisligi: 10 },

  // Tip kat planındaki daireler (dikdörtgen yaklaşık).
  // x: soldan, z: yol cephesinden itibaren (m). Planı ölçekli okuyup girin.
  daireTipleri: [
    { kod: "A", x: 0,  z: 0, en: 10, derinlik: 8, cephe: "Yol cephesi (Güney)",   brut: 80 },
    { kod: "B", x: 14, z: 0, en: 10, derinlik: 8, cephe: "Yol cephesi (Güney)",   brut: 80 },
    { kod: "C", x: 0,  z: 8, en: 10, derinlik: 8, cephe: "Bahçe cephesi (Kuzey)", brut: 80 },
    { kod: "D", x: 14, z: 8, en: 10, derinlik: 8, cephe: "Bahçe cephesi (Kuzey)", brut: 80 }
  ],

  // Daire olmayan hacimler (merdiven, asansör çekirdeği vb.)
  cekirdek: [ { x: 10, z: 0, en: 4, derinlik: 16 } ],

  // Daire numarası -> malik / hak sahibi adı.
  // Numaralama: zemin kat A=1, B=2, C=3, D=4; 1. kat A=5 ... şeklinde ilerler.
  // Girilmeyen daireler "Hak Sahibi (no)" olarak görünür.
  // Bağımsız bölüm (BB) no -> hak sahibi adı. Girilmeyenlerde Revit'teki oda adı görünür.
  malikler: {},

  // BB no -> net / brüt alan (m²). null = henüz girilmedi, kartta "—" görünür. Örnek: 14: { net: 98.40, brut: 126.30 }
  // Bölüm renkleri otomatik atanır; istenirse tek tek verilebilir: 14: { net: 98.40, brut: 126.30, renk: "#1f77b4" }
  daireBilgileri: {
     1: { net: null, brut: null },   2: { net: null, brut: null },   3: { net: null, brut: null },
     4: { net: null, brut: null },   5: { net: null, brut: null },   6: { net: null, brut: null },
     7: { net: null, brut: null },   8: { net: null, brut: null },   9: { net: null, brut: null },
    10: { net: null, brut: null },  11: { net: null, brut: null },  12: { net: null, brut: null },
    13: { net: null, brut: null },  14: { net: null, brut: null },  15: { net: null, brut: null },
    16: { net: null, brut: null },  17: { net: null, brut: null },  18: { net: null, brut: null },
    19: { net: null, brut: null },  20: { net: null, brut: null },  21: { net: null, brut: null },
    22: { net: null, brut: null },  23: { net: null, brut: null },  24: { net: null, brut: null },
    25: { net: null, brut: null },  26: { net: null, brut: null },  27: { net: null, brut: null },
    28: { net: null, brut: null },  29: { net: null, brut: null },  30: { net: null, brut: null },
    31: { net: null, brut: null },  32: { net: null, brut: null },  33: { net: null, brut: null }
  }
};

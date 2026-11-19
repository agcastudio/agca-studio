// =====================================================================
//  PROJE VERİSİ — Sadece bu dosyayı kendi projenize göre düzenleyin.
//  Tüm ölçüler metre (m). Kotlar YOL (kaldırım önü asfalt) seviyesine göredir.
// =====================================================================
window.PROJE = {
  ad: "448A-8P Konut Projesi",
  blok: "Bina",

  // ---- Revit/IFC modeli (model/model.js varsa bu ayarlar kullanılır) ----
  modelAyarlari: {
    yolKotu: 0.00,       // Yol asfaltının ±0.00'a göre kotu (m). Modelde kaldırım +0.14.
    haricKatlar: []      // Daire olmayan katlar, ör. ["L1"] (zemin kat dükkan ise)
  },

  // ---- Aşağıdakiler yalnızca model YOKKEN çizilen örnek bina içindir ----

  // Kesitten okunacak değerler
  zeminKotu: 1.20,      // Zemin kat döşemesi (±0.00) yoldan kaç m yukarıda
  katYuksekligi: 3.00,  // Döşemeden döşemeye kat yüksekliği
  gozHizasi: 1.60,      // Döşemeden göz/pencere hizası (manzara için)

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
  // Revit modelinde şimdilik her kat tek bölüm: 1 = Zemin Kat, 2 = 1. Kat ... 6 = 5. Kat.
  malikler: {}
};

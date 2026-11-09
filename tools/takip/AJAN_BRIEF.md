# Haftalık plan ajanı için görev metni

Pazar rutini bu metni `{{WS}}` (hafta başı Pazartesi, YYYY-MM-DD), `{{WS_END}}` (Pazar), `{{DUMP}}` (dump.js çıktısının tam yolu) ve `{{OUT}}` (ajanın yazacağı JSON dosyasının tam yolu) yerlerini doldurup Agent aracına (general-purpose) tek parça olarak verir.

---

Sen deneyimli bir beslenme uzmanısın (diyetisyen). İki kişilik bir evin {{WS}} – {{WS_END}} haftasının yeme planını baştan hazırlayacaksın. Web araması yapma; yalnız verilen dosyayı oku ve sonucu dosyaya yaz.

GİRDİ DOSYASI (JSON): {{DUMP}}
- `week.days`: haftanın iskeleti (plan yoksa standart menü; yalnız fikir verir, kopyalama). Gün anahtarları 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi, 0=Pazar. Öğün anahtarları k=kahvaltı 07:30, a1=ara 10:30, o=öğle 12:30, a2=ara 16:00, ak=akşam 19:00, g=gece 21:30.
- `previousWeeksDishes`: önceki iki haftanın öğle ve akşam yemekleri — bunları TEKRAR ETME (çeşitlilik).
- `recipes`: mevcut tarifler (id, name, time, kcal {E,K}, tags, ing, steps, por, tip, servings). Mümkün olduğunca bunları kullan.
- `rules`: programın yazılı kuralları (PLAN_RULES) — uy.
- `snacks`, `drinks`, `rhythm`, `units`, `shopCats`: yardımcı listeler.

KİŞİLER: E = 35 yaş erkek, 170 cm, 87 → 78 kg hedefi, ofis çalışanı, sabah 30 dk koşu, zaman zaman şişkinlik (baklagil yalnız öğle öğününde, iyi pişmiş, günde tek baklagil öğünü), ailede tip 2 diyabet, 1800 kcal, protein hedefi ~130 g/gün (bu yüzden kahvaltılara yumurta veya lor koy). K = 37 yaş kadın, 160 cm, 74 kg, güvenli tempo 0,5 kg/hafta, süt ürünlerini sever, dönemsel tatlı isteği (Cumartesi 16:00 planlı şekersiz tatlı), yeşil çay tansiyonunu etkiler (koyma), 1450 kcal, protein ~100 g/gün. Günde en fazla 2 yumurta (kişi başı), kahve en fazla 2 fincan.

EV DÜZENİ: Pazar günleri Çarşamba ve Cuma kuruluyor; Çarşamba pazarı Çarşamba akşamından Cuma öğlesine, Cuma pazarı Cuma akşamından sonraki Çarşamba öğlesine kadar olan öğünleri karşılar. Sebze yemekleri, baklagil yemekleri ve çorbalar 4 porsiyon pişer ve ardışık iki günde yenir: ikinci günün metninde "(2. gün)" yaz, ikinci günün `s` listesi boş olsun (alışveriş yalnız pişirme gününde). Ana protein (balık, köfte, tavuk) taze pişer. Hafta içi akşam hazırlığı en çok 25 dakika; Pazar hazırlık günü. Kahvaltılar kolay (yoğurt-yulaf-meyve, haşlanmış yumurta + peynir, lor kasesi, çılbır); hafta sonu kahvaltısı 08:30 ve biraz daha zengin. Haftada 2 balık, kırmızı et en çok 1, tavuk/hindi 2–3, baklagil 2–3 öğle. Karbonhidrat öğlede (bulgur, kısır, ekmek), akşamlar tahılsız. Her ana öğünde protein 25–40 g; gün toplamı E 110–130 g, K 85–100 g. Sebze çeşidi haftada 15'in üstünde, mevsim (Kasım–Şubat). Önce sebze/çorba → protein → en son karbonhidrat sırası tiplerde hatırlatılabilir.

GÖREV:
1. 7 günün tamamını yaz (1,2,3,4,5,6,0), her günde 6 öğün (k, a1, o, a2, ak, g); g için yalnız bitki çayı (yeşil çay yok). Her gün için `tip`: o günün yemeğiyle ilgili kısa, somut bir püf noktası (1 cümle).
2. Mevcut tariflere `r` ile bağla. Yeni tarif şartsa en fazla 4 tane ekle: id küçük harf, yalnız a-z0-9 ve tire, en çok 24 karakter; sebze/baklagil/çorba tarifleri 4 porsiyonluk malzeme ve `"servings": 4`; kcal porsiyon başına; `tags` ilk öğe öğün (kahvaltı/öğle/akşam/tatlı/ara öğün), sonra tür (sebze, baklagil, balık, tavuk, hindi, et, çorba, yumurta, tahıl, pişirmesiz, meze).
3. Alışveriş kalemleri (`s`): her öğün için [ad, miktar, birim, kategori, false]; birim yalnız adet, g, ml, demet, baş, kavanoz, paket, dilim, su bardağı; kategori yalnız sebze, et, sut, firin, kiler. Zeytinyağı, tuz, baharat, limon suyu gibi kiler sabitlerini yazma. Bir yemeğin tarifindeki her taze malzeme pişirme gününün `s` listesinde bulunsun, miktarlar tarife uygun olsun. Yoğurt, kefir, peynir, yumurta, meyve ve kuruyemiş gibi kahvaltı/ara öğün malzemelerini de yaz.
4. `review`: haftanın kısa değerlendirmesi (5–7 cümle, sade dil, rakamlarla: protein dağılımı, balık/et/baklagil sayısı, çeşitlilik, kişiye özel notlar).

ÇIKTI: Şu dosyaya yalnız geçerli JSON yaz (başka metin yok): {{OUT}}
{
  "review": "...",
  "days": {
    "1": { "tip": "...", "meals": [ { "k": "k", "t": "...", "E": "E porsiyonu", "K": "K porsiyonu", "r": ["tarif-id"], "s": [["Malzeme", 2, "adet", "sebze", false]] }, {"k":"a1",...}, {"k":"o",...}, {"k":"a2",...}, {"k":"ak",...}, {"k":"g",...} ] },
    "2": {...}, "3": {...}, "4": {...}, "5": {...}, "6": {...}, "0": {...}
  },
  "recipes": [ { "id": "...", "name": "...", "time": 25, "kcal": {"E": 0, "K": 0}, "tags": ["akşam", "sebze"], "ing": ["..."], "steps": ["..."], "por": {"E": "...", "K": "..."}, "tip": "...", "servings": 4 } ]
}
Dosyayı yazdıktan sonra kısa bir özet ver: günlerin ana yemekleri, yeni tarifler, değerlendirme.

# KARARLAR — agca·studio web sitesi

Kalıp: tarih · soru no · karar · alternatifler · gerekçe · yeniden açacağı aşama · varsayılan mı

Keşif anketi: `../00_KESIF_SORULARI.md`. Cevaplar 19 Eylül 2026'da alındı.

## A) Kapsam ve hedef

| Tarih | Soru | Karar | Alternatifler | Gerekçe | Yeniden açar | Varsayılan mı |
|---|---|---|---|---|---|---|
| 2026-09-19 | 1 | Amaç sırası: (a) kurumsal vitrin → (d) yurt dışı işbirliği. Ölçüt (e): "agca studio" aramasında 1. sıra + nitelikli başvuru. | iş alma odaklı (b), kurumsal (c) | Kullanıcı seçimi | Aşama 3 (ton), 6 (SEO) | hayır |
| 2026-09-19 | 2 | Ofis İstanbul / Üsküdar. Hatlar: kentsel dönüşüm, Revit ile mimari projelendirme, görselleştirme, sanal tur. Hizmetler sayfası bu dört hattan oluşur. | — | Kullanıcı seçimi (e→f) | Aşama 6 | hayır |
| 2026-09-19 | 3 | Başlangıçta 2 proje. Dizin proje türüne göre filtrelenir: konut, yarışma, konsept, ticari (liste büyüyebilir). Arşiv tablosu yok. | 30+ proje dizini | Kullanıcı seçimi | Aşama 2 (tür listesi) | hayır |
| 2026-09-19 | 4 | Hemen yayın (b); proje metinleri yok (f): metinleri görsellere ve paftalara göre ben yazarım, kullanıcı düzeltir. | — | Kullanıcı seçimi | Aşama 5 | hayır |
| 2026-09-19 | 5 | Malzeme klasörü `Desktop\agcastudioweb\Projeler\<kod>_Görseller\` düzeninde kalır; ek malzeme var, gerekince üretilecek. Kalite yüksek ama hız birinci: WebP + JPEG türevleri, srcset, lazy yükleme. | CDN dönüşümü | Kullanıcı: "kaliteyi yükseltelim ama site kasmasın" | Aşama 2 (hazirla.py) | kısmen |

## B) Kimlik ve tarz

| Tarih | Soru | Karar | Alternatifler | Gerekçe | Yeniden açar | Varsayılan mı |
|---|---|---|---|---|---|---|
| 2026-09-19 | 6 | Yazım: **agca·studio** (orta nokta) — metinde ve menüde. Logo yazı tipi Century Gothic; vektör yok → yazı-logo GOTHIC.TTF glif hatlarından SVG olarak yeniden üretildi. İki kurucu ortak (adlar/biyografiler BEKLENİYOR). Hukuki kimlik yayınlanmaz. Adres yalnız "İstanbul, Üsküdar". Telefon (BEKLENİYOR) ve e-posta yayınlanır. Google hesabı var → Search Console. | "agca.studio" düz yazım | Kullanıcı seçimi (b) | Aşama 5 (Stüdyo sayfası) | hayır |
| 2026-09-19 | 7 | Arketip (a) sessiz beyaz galeri; projelerde kısa anlatım; referans Norm Architects (boşluk, tipografi); beyaz zemin. Bazı projelerde sanal tur bağlantısı → künyede `sanal_tur` alanı. | editoryal (b), deneyim (c) | Kullanıcı seçimi | Aşama 3 | hayır |
| 2026-09-19 | 8 | Beyaz zemin + tek vurgu: logo somonu **#F4A888** yalnız bağlantı vurgusu, etkin filtre ve nokta olarak. Metin #111, gri tonlar #6b6b6b / #d9d9d9. | krem zemin (c) | Kullanıcı seçimi (b) | Aşama 3 | hayır |
| 2026-09-19 | 9 | Inter (değişken, 400–600), kendi sunucumuzdan WOFF2, Latin + Türkçe alt küme (~60 KB). Google Fonts sunucusu kullanılmaz. | Century Gothic benzeri geometrik | Önerim kabul | Aşama 3 | evet |
| 2026-09-19 | 10 | Projelerde nesnel üçüncü tekil; Stüdyo sayfasında "biz" (iki ortak). Metin taslakları benden. Başlık şablonu "Proje · Tür, Şehir · agca·studio"; açıklama 120–155 karakter; alt metin 50–125 karakter. Üstünlük ifadesi ve fiyat yok. | — | Önerim kabul; "ben" yerine "biz" iki ortak olduğu için | Aşama 5 | evet |

## C) İçerik, haklar, gizlilik

| Tarih | Soru | Karar | Alternatifler | Gerekçe | Yeniden açar | Varsayılan mı |
|---|---|---|---|---|---|---|
| 2026-09-19 | 11 | Künye: Yer (il, ilçe), İşveren, Proje Yılı, Bitiş Yılı, Program, Durum, İnşaat Alanı, Arsa Alanı, Ekip + Rol + Derece. "Fotoğraf" alanı yok. Proje kodu kullanılmaz (klasör kodu yalnız iç düzen). | — | Kullanıcı seçimi | Aşama 2 | hayır |
| 2026-09-19 | 12 | Fotoğraf ve renderlar kullanıcıya ait. Kredi satırı "Görselleştirme: agca·studio". | — | Kullanıcı beyanı | — | hayır |
| 2026-09-19 | 13 | Projeler kullanıcıya ait; başka ofis kredisi gerekmiyor. OYUK: yarışma sonucu/derece/yıl BEKLENİYOR (künyede "Yarışma" durumu). | — | Kullanıcı beyanı | Aşama 5 | hayır |
| 2026-09-19 | 14 | Gizli/listelenmeyen proje yok. | — | Kullanıcı (a) | — | hayır |
| 2026-09-19 | 15 | PDF portfolyo ve basın kiti yok. | — | Kullanıcı (a) | — | hayır |
| 2026-09-19 | 16 | Sanal tur (360/3B) bağlantısı bazı projelerde olacak; ilk iki projede yok. Künyede isteğe bağlı `sanal_tur` URL alanı; gömme değil, yeni sekmede bağlantı (çerez ve ağırlık yok). | gömme | Kullanıcı (d) + hız önceliği | Aşama 2 | kısmen |

## D) Arayüz ve sayfalar

| Tarih | Soru | Karar | Alternatifler | Gerekçe | Yeniden açar | Varsayılan mı |
|---|---|---|---|---|---|---|
| 2026-09-19 | 17 | Ana sayfa: tam genişlik kapak görseli + seçili proje ızgarası + tek cümle. Kapak öncelikli yüklenir. | ızgara-only, slayt, video | Önerim kabul | Aşama 4 | evet |
| 2026-09-19 | 18 | Menü: Projeler · Stüdyo · Hizmetler · İletişim. Günce yok. Ekipte iki kurucu. | + Haberler | Önerim kabul (a+d) | Aşama 4 | evet |
| 2026-09-20 | 18 | **Hizmetler bölümü iptal:** dört hizmet sayfası, menü öğesi ve ana sayfadaki hizmet satırı kaldırıldı. Menü: Projeler · Stüdyo · İletişim. Hizmet anlatımı ana sayfa tanıtım paragrafı ve Stüdyo sayfasında kalır. | ayrı hizmet sayfaları | Kullanıcı kararı | Aşama 6 (SEO: hizmet anahtar kelimeleri artık yalnız ana sayfa ve Stüdyo'da) | hayır |
| 2026-09-19 | 19 | Dizin: 3:2 kırpma, masaüstü 3 sütun / mobil 1; kartta ad + yer; filtre yalnız Tür (proje sayısı az); elle sıra (`weight`). Proje sayfası: kapak → başlık/yer/yıl → künye → kısa metin → görseller → çizimler → krediler → önceki/sonraki. | tuğla dizilimi | Önerim kabul; filtre eksenleri 2 projede Tür'e indirildi | Aşama 4 | evet |
| 2026-09-19 | 20 | Telefonda büyütme: GLightbox (küçük, bakımlı), klavye/Esc, dokunarak yakınlaştırma. | PhotoSwipe | Önerim kabul | Aşama 4 | evet |
| 2026-09-19 | 21 | Sosyal: yalnız bağlantı simgeleri (Instagram, LinkedIn — adresler BEKLENİYOR). Gömme yok. Her sayfaya 1200×630 paylaşım kartı. | canlı akış | Önerim kabul | Aşama 6 | evet |
| 2026-09-19 | 22 | Türkçe kökte, İngilizce `/en/` altında; hreflang + x-default=tr. İlk yayında EN: ana sayfa, Stüdyo, Hizmetler, İletişim ve iki proje (çeviri taslakları benden, kullanıcı okur). | yalnız TR | Önerim kabul; kitle (d) yurt dışı | Aşama 5 | evet |

## E) Altyapı ve içerik yönetimi

| Tarih | Soru | Karar | Alternatifler | Gerekçe | Yeniden açar | Varsayılan mı |
|---|---|---|---|---|---|---|
| 2026-09-19 | 23 | Alan adı agca.studio (Squarespace Domains, otomatik yenileme açık). agcastudio.com kullanıcının değil, yok sayılır. E-posta: info@agca.studio yönlendirmeli (MX → Mailgun) — DNS taşınırken MX/TXT birebir korunur. Asıl adres www'suz `https://agca.studio`, www → kök 301. | — | Kullanıcı beyanı + önerim | Aşama 8 | kısmen |
| 2026-09-19 | 24 | Hugo Extended 0.166.0 (winget, Node yok) + Cloudflare Workers statik barındırma (Git entegrasyonu, dal önizlemesi) + yeni herkese açık depo `agcastudio/agca-studio`. 0 $/ay. Çıktı statik → GitHub Pages'e taşınabilir. | GitHub Pages | Kullanıcı (a) kabul | — | evet |
| 2026-09-19 | 25 | İçerik: yalnız kullanıcı, VS Code'da Markdown + `git push`; yerel önizleme `hugo server`. Yeni proje = klasör + `index.md` + görseller (`hazirla.py` ile). | Sveltia CMS | Kullanıcı (a) | — | hayır |
| 2026-09-19 | 26 | Form yok: e-posta (info@agca.studio) + telefon + Instagram/LinkedIn bağlantıları. Sunucu tarafı kod yok. | Worker + Turnstile | Kullanıcı (a) | — | hayır |
| 2026-09-19 | 27 | Derleme anında türevler (Hugo görsel işleme: WebP + JPEG, 480/960/1440/1920). Filigran yok, R2 yedeği yok; orijinaller kullanıcıda. Depoya yalnız `hazirla.py` ile 2560 px sRGB'ye indirilmiş kaynaklar girer. | CDN dönüşümü | Kullanıcı: filigran/arşiv yok | — | kısmen |
| 2026-09-19 | 28 | Pafta Studio ile **hiçbir ilişki yok**: ayrı depo, ayrı adres, bağlantı verilmez, alt alan adı yapılmaz. | alt alan adı | Kullanıcı: "kesinlikle ilişkilendirme" | — | hayır |

## F) SEO, ölçüm, hukuk, bakım

| Tarih | Soru | Karar | Alternatifler | Gerekçe | Yeniden açar | Varsayılan mı |
|---|---|---|---|---|---|---|
| 2026-09-19 | 29 | Adresler: `/projeler/<kisa-ad>/`, `/studyo/`, `/hizmetler/`, `/iletisim/`, `/en/projects/<slug>/`, `/en/studio/`, `/en/services/`, `/en/contact/`. Küçük harf ASCII, tire, sonda eğik çizgi; yayınlanınca dondurulur. Eski adres yok. | — | Önerim kabul | — | evet |
| 2026-09-19 | 30 | Ücretsiz ve az üyelik: yalnız mevcut hesaplar (GitHub, Cloudflare, Google). Ölçüm: Cloudflare Web Analytics (çerezsiz, rıza bandı gerekmez). Search Console mevcut Google hesabıyla. Yeni hiçbir servise üyelik yok; IndexNow anahtarı statik dosya olarak eklenir, betik isteğe bağlı. | Plausible, GA4 | Kullanıcı: "çok fazla yerde üyelik açmak istemiyorum" | Aşama 8 | kısmen |
| 2026-09-19 | 31 | Hız öncelikli: mobilde LCP < 2,5 s, CLS 0, kapak < 200 KB, yazı tipi < 100 KB; her görselde genişlik/yükseklik. | kalite öncelikli | Önerim kabul | Aşama 7 | evet |
| 2026-09-19 | 32 | Minimum uğraş: form ve çerez olmadığı için tek kısa "Gizlilik ve KVKK" sayfası (veri toplanmadığı, çerezsiz analitik beyanı, e-posta ile iletişimde veri işleme). Avukat turu yok; metin kısa ve olgusal. | ayrı aydınlatma + çerez politikası | Kullanıcı: "basit site, minimum uğraş" | — | hayır |
| 2026-09-19 | 33 | Bakım: `BAKIM.md` kısa takvim (alan adı otomatik yenileme kontrolü, Search Console 3 ayda bir, Hugo sürümü yılda bir). | — | Önerim kabul | — | evet |

## Bekleyen bilgiler (kullanıcıdan)

- ~~Kurucu ortakların ad-soyad, unvan, biyografi~~ → 2026-09-20 alındı: Kutbeddin Ağca (ka.jpg) ve Selen Baş Ağca (sb.jpg), Kurucu Ortak · Mimar; metinler Stüdyo sayfasında, yapısal veride `founder`.
- Telefon numarası; Instagram ve LinkedIn adresleri.
- OYUK: yarışmanın resmî adı, yılı, sonuç/derece, ekip (yayınlanacaksa).
- İkinci projenin klasörü (`Projeler/<kod>_Görseller/`) ve türü.
- Cloudflare + GitHub adımları (yayın aşamasında birlikte): depo oluşturma, Git bağlantısı, ad sunucusu değişikliği.

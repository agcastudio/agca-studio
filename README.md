# agca·studio — web sitesi

Statik site: **Hugo** ile derlenir, **Cloudflare Workers** (statik varlıklar) üzerinde yayınlanır. Alan adı: https://agca.studio

## Klasörler

```
site/
  hugo.toml            site ayarları (e-posta, telefon, sosyal bağlantılar, analitik anahtarı)
  content/tr/          Türkçe içerik (kök adresler)
  content/en/          İngilizce içerik (/en/ altında)
  assets/projeler/     proje görselleri (hazirla.py üretir; 2560 px sRGB JPEG)
  assets/img/          portreler, paylaşım kartı
  layouts/             şablonlar
  static/              logo, yazı tipleri, simgeler, _headers, _redirects
  tools/               hazirla.py · ikonlar.py · logo_svg.py · yayin_bildir.py
  KARARLAR.md          karar kaydı · BAKIM.md bakım takvimi · YAYIN.md yayına alma adımları
```

Kaynak görseller depo dışında, bir üst klasörde durur: `../Projeler/<kod>_Görseller/` ve `../Kurumsal/`.

## Yerel önizleme

```
hugo server -D
```
Tarayıcıda http://localhost:1313 (Hugo `winget install Hugo.Hugo.Extended` ile kurulu; yeni terminalde `hugo` komutu çalışır).

## Yeni proje eklemek

1. Görselleri `../Projeler/<kod>_<ad>/` altına, alt klasörlerle koy: `Renders/`, `Cizimler/` (plan-kesit-görünüş), `Diagrams/`. Dosya adları web'de görünmez ama betik adı dosya adından türetir; kısa ve anlamlı adlar ver (`kose.jpg`, `zemin-kat.jpg`).
2. Dönüştür: `python tools/hazirla.py <kod> --slug <kisa-ad>` → `assets/projeler/<kisa-ad>/` ve `_manifest.txt` (liste).
3. `content/tr/projeler/oyuk/index.md` dosyasını `content/tr/projeler/<kisa-ad>/index.md` olarak kopyala; künyeyi, metni ve görsel listesini düzenle. İngilizce için `content/en/projects/<kisa-ad>/index.md` (aynı `translationKey`).
   - `tur`: `konut` · `yarisma` · `konsept` · `ticari` · `kentsel` · `ic_mekan` (yeni tür için `i18n/tr.toml` ve `en.toml` içine `tur_<ad>` ekle)
   - `cover`: kapak (geniş), `card`: dizin kartı (3:2 kırpılır), `sanal_tur`: varsa bağlantı
   - `weight`: dizin sırası (küçük önce)
4. Kullanılmayan görselleri sil: `python tools/hazirla.py --temizle <kisa-ad>`
5. Önizle, sonra `git add -A && git commit -m "Proje: <ad>" && git push` → Cloudflare otomatik derler ve yayınlar.

## Metin ve ayarlar

- Telefon, Instagram, LinkedIn: `hugo.toml` → `[params]`. Boş bırakılan alan sitede görünmez.
- Stüdyo sayfası ve kurucular: `content/tr/studyo.md` (`people` listesi) ve `content/en/studio.md`.
- Hizmet sayfaları: `content/tr/hizmetler/*.md`, `content/en/services/*.md` (`faq` listesi yapısal veriye de girer).
- Gizlilik: `content/tr/gizlilik.md`, `content/en/privacy.md`.

## Yayın sonrası bildirim

```
hugo --gc --minify
python tools/yayin_bildir.py            # Bing/Yandex'e IndexNow bildirimi (Google sitemap'ten kendisi tarar)
```

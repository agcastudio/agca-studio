# BAKIM — agca.studio

Sitede form, veritabanı ve eklenti yok; bakım yükü düşük. Aşağıdakiler yeter.

| Sıklık | İş | Nerede |
|---|---|---|
| Her yeni proje | `hazirla.py` → `index.md` → önizle → `git push`; sonra `python tools/yayin_bildir.py` | README.md |
| 3 ayda bir | Search Console: kapsam hataları, Sayfa Deneyimi (mobil), site haritası durumu | search.google.com/search-console |
| 3 ayda bir | PageSpeed Insights ile ana sayfa ve bir proje sayfası (mobil): LCP < 2,5 s, CLS < 0,1 | pagespeed.web.dev |
| 6 ayda bir | Kırık bağlantı kontrolü: `hugo` derlemesi uyarı vermiyor mu; sanal tur bağlantıları açılıyor mu | terminal / tarayıcı |
| Yılda bir (Eylül) | Alan adı: Squarespace'te otomatik yenileme açık ve ödeme kartı güncel mi (bitiş: 1 Ekim) | account.squarespace.com |
| Yılda bir | Hugo sürümü: `winget upgrade Hugo.Hugo.Extended`; Cloudflare'de `HUGO_VERSION` aynı sürüme çekilir | terminal / Cloudflare |
| Yılda bir (Ocak) | Gizlilik sayfası: KVKK ceza tutarları ve metin hâlâ doğru mu | content/*/gizlilik.md |
| Gerektiğinde | Telefon / sosyal bağlantı değişikliği: `hugo.toml` → `[params]` | hugo.toml |

Yedek: kaynak görseller `Desktop\agcastudioweb\Projeler` (kullanıcıda), site kaynağı GitHub deposunda, yayın sürüm geçmişi Cloudflare'de. Ek yedek istenirse `Desktop\agcastudioweb` klasörü harici diske kopyalanır.

Çıkış planı: `hugo` çıktısı (`public/`) düz HTML'dir; GitHub Pages, Netlify ya da herhangi bir barındırmaya olduğu gibi taşınır.

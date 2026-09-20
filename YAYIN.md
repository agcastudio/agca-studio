# YAYIN — agca.studio'yu canlıya alma adımları

Sıra önemli. Her adım için kimin yapacağı yazılı: **(sen)** hesap işlemleri, **(ben)** kod ve doğrulama.

## 0. Ön koşul — alan adı yenileme (sen)
- Squarespace Domains → agca.studio → otomatik yenileme AÇIK ve kart güncel. Bitiş: **1 Ekim 2026**.

## 1. GitHub deposu — TAMAMLANDI (20 Eylül 2026)
- Depo: github.com/agcastudio/agca-studio; `main` dalı gönderildi.
- **Yapılacak (sen, 1 dakika):** Settings → General → Danger Zone → Change visibility → **Private**. Depoda `KARARLAR.md` (iç karar kaydı, bekleyen sorular) ve proje dosyalarının sitede yayımlanmayan rapor metinleri var. Cloudflare Workers özel depolarla sorunsuz çalışır.

## 2. Cloudflare Workers — Git bağlantısı (sen, 5 dakika)
- dash.cloudflare.com → Workers & Pages → **Create** → Workers → **Import a repository** → GitHub'ı yetkilendir → `agcastudio/agca-studio` seç.
- Ayarlar:
  - Project name: `agca-studio`
  - Build command: `hugo --gc --minify`
  - Deploy command: `npx wrangler deploy`
  - Root directory: `/`
  - **Build variables and secrets** (çalışma zamanı "Variables & Secrets" değil): `HUGO_VERSION` = `0.166.0`. Girilmezse derleme görüntüsünün varsayılanı olan Hugo 0.147.7 kullanılır ve site eski sürümle üretilir.
- Project name, `wrangler.jsonc` içindeki `name` ile birebir aynı olmalı (`agca-studio`), yoksa derleme başarısız olur.
- Deploy → birkaç dakika sonra `agca-studio.<hesap>.workers.dev` adresinde site açılır. Bu adresi bana gönder; kontrol ederim.
- Her `git push` yeni yayın, her dal (branch) ayrı önizleme adresi üretir.

## 3. DNS'i Cloudflare'e taşıma (sen, 10 dakika + bekleme)
Mevcut kayıtlar (19 Eylül 2026 envanteri; e-posta kayıtları taşımada aynen korunmalı):
- **MX** `agca.studio` → `mxa.mailgun.org` ve `mxb.mailgun.org` (öncelik 10) — info@agca.studio yönlendirmesi buna bağlı → **KORUNACAK**
- **TXT** `agca.studio` → `v=spf1 include:mailgun.org ~all` → **KORUNACAK**
- DKIM (`*._domainkey`) kaydı dışarıdan görünmedi; Squarespace/Google DNS panelindeki tam listeyi ekran görüntüsüyle gönder, eksik kalanı birlikte ekleriz
- **A** `agca.studio` → `198.202.211.1` ve **CNAME** `www` → `cdn.webflow.com`: eski Webflow sitesinin kalıntısı, artık 409 veriyor → Cloudflare'de **silinir** (yerine Workers custom domain gelir)

Adımlar:
1. Cloudflare → **Add a domain** → `agca.studio` → Free plan → Cloudflare mevcut kayıtları tarar; MX ve TXT satırlarının listede olduğunu doğrula (yoksa elle ekle).
2. Cloudflare'in verdiği iki ad sunucusunu (ör. `xxx.ns.cloudflare.com`) Squarespace Domains → agca.studio → DNS → **Nameservers** bölümüne yaz (Squarespace DNS'ten "custom nameservers"a geç).
3. Aktifleşme 5 dakika ile birkaç saat arası sürer; Cloudflare "Active" dediğinde info@agca.studio'ya bir test e-postası gönder.
4. Zone "Active" olduktan sonra DNS → Records: eski Webflow kayıtlarını sil — `A agca.studio → 198.202.211.1` ve `CNAME www → cdn.webflow.com`. **MX ve TXT satırlarına dokunma.** Bu kayıtlar dururken alan adı Worker'a bağlanamaz.

## 4. Alan adını siteye bağlama (sen, 2 dakika)
- Workers & Pages → `agca-studio` → Settings → **Domains & Routes** → Add → Custom domain → `agca.studio`; sonra tekrar Add → `www.agca.studio`.
- Sertifika otomatik.
- `www` → kök yönlendirmesini **Redirect Rule** ile kur (Workers statik varlıklarda `_redirects` alan adı düzeyinde yönlendirme yapamaz): agca.studio → Rules → Redirect Rules → Create rule → şablon **Redirect from WWW to Root** → Wildcard `https://www.*` → `https://${1}`, 301, sorgu dizesi korunsun.
- Settings → Domains & Routes → **workers.dev** adresini kapat; site yalnız kendi alan adından sunulsun (ikinci kopya dizine girmesin).
- Cloudflare → SSL/TLS → **Full (strict)**; Edge Certificates → **Always Use HTTPS** açık.

## 5. Doğrulama (ben)
- https://agca.studio açılıyor, https://www.agca.studio köke 301 ile dönüyor, /en/ açılıyor, 404 sayfası çalışıyor.
- `curl -I` ile `_headers` (önbellek ve güvenlik başlıkları) geliyor.
- PageSpeed Insights mobil: LCP < 2,5 s, CLS < 0,1.
- Paylaşım kartı: WhatsApp'a ana sayfa ve bir proje bağlantısı atıp önizlemeye bak.

## 6. Arama motorları (sen + ben)
- **Google Search Console** (sen, mevcut Google hesabı): Add property → **Domain** → `agca.studio` → verilen TXT kaydını Cloudflare DNS'e ekle (ben yazarım, sen yapıştırırsın) → Verify. Sitemaps → `https://agca.studio/sitemap.xml` ekle.
- **Bing Webmaster Tools** (sen): bing.com/webmasters → "Import from Google Search Console" (yeni üyelik gerekmez, Google hesabıyla girilir).
- **Yandex Webmaster** (isteğe bağlı; Türkiye'de payı var): webmaster.yandex.com → site ekle → DNS TXT ile doğrula.
- **IndexNow** (ben): `python tools/yayin_bildir.py` — Bing ve Yandex'e tüm adresler bildirilir. Anahtar dosyası sitede hazır.
- **Google İşletme Profili** (sen, mevcut hesap): business.google.com → "Mimar" kategorisi, adres gizli (hizmet bölgesi: İstanbul), web sitesi `https://agca.studio`, telefon ve e-posta siteyle birebir aynı.

## 7. Ölçüm (sen, 2 dakika)
- Cloudflare → Web Analytics → Add a site → `agca.studio` → JS beacon'ı seç → verilen **token**'ı bana gönder; `hugo.toml` içine `cfAnalyticsToken` olarak yazarım. Çerezsizdir, rıza bandı gerekmez.

## 8. Lansman günü
- Instagram/LinkedIn biyografilerine `agca.studio` yaz.
- E-posta imzasına siteyi ekle.
- 48 saat sonra Search Console → URL Inspection ile ana sayfanın dizine alındığını kontrol et (ben).

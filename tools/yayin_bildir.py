# -*- coding: utf-8 -*-
"""
yayin_bildir.py — Yayından sonra arama motorlarına yeni/değişen adresleri bildirir (IndexNow: Bing, Yandex, Naver vb.).
Google IndexNow kullanmaz; Google için site haritası Search Console'a bir kez eklenir, gerisi otomatiktir.

Kullanım (site/ klasöründe, hugo ile derleme yaptıktan sonra):
  python tools/yayin_bildir.py            # public/ altındaki tüm sayfaları bildirir
  python tools/yayin_bildir.py /projeler/oyuk/ /en/projects/oyuk/   # yalnız verilen yolları bildirir
Anahtar: hugo.toml içindeki params.indexnowKey ve static/<anahtar>.txt dosyası.
"""
import json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
HOST = "agca.studio"

def read_key():
    cfg = open(os.path.join(SITE, "hugo.toml"), encoding="utf-8").read()
    m = re.search(r'indexnowKey\s*=\s*"([0-9a-f]+)"', cfg)
    if not m:
        sys.exit("hugo.toml içinde indexnowKey bulunamadı")
    return m.group(1)

def urls_from_public():
    urls = []
    pub = os.path.join(SITE, "public")
    for root, _, files in os.walk(pub):
        if "index.html" in files:
            rel = os.path.relpath(root, pub).replace("\\", "/")
            path = "/" if rel == "." else f"/{rel}/"
            if path.startswith("/404"):
                continue
            urls.append(f"https://{HOST}{path}")
    return sorted(urls)

def main():
    key = read_key()
    args = sys.argv[1:]
    urls = [f"https://{HOST}{a if a.startswith('/') else '/' + a}" for a in args] if args else urls_from_public()
    if not urls:
        sys.exit("Bildirilecek adres yok — önce `hugo` ile derleyin.")
    body = json.dumps({"host": HOST, "key": key, "keyLocation": f"https://{HOST}/{key}.txt", "urlList": urls[:10000]}).encode()
    req = urllib.request.Request("https://api.indexnow.org/IndexNow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"IndexNow: HTTP {r.status} — {len(urls)} adres bildirildi")
    except urllib.error.HTTPError as e:
        print(f"IndexNow hata: HTTP {e.code} {e.read().decode(errors='ignore')[:200]}")

if __name__ == "__main__":
    main()

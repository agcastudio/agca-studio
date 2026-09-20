# -*- coding: utf-8 -*-
"""
harita.py — İletişim sayfası için çerezsiz, statik harita görseli üretir (OpenStreetMap karoları, Pillow).
Kullanım: python tools/harita.py [enlem] [boylam] [zoom]
Varsayılan: Üsküdar merkez. Çıktı: assets/img/harita.jpg (1600×1000). Tam adres gelince enlem/boylamı güncelleyip yeniden çalıştırın.
Not: OSM karo kullanım politikası gereği tek seferlik, düşük hacimli indirme ve tanımlayıcı User-Agent kullanılır.
"""
import io, math, os, sys, urllib.request
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "assets", "img", "harita.jpg")
lat = float(sys.argv[1]) if len(sys.argv) > 1 else 41.0255
lon = float(sys.argv[2]) if len(sys.argv) > 2 else 29.0160
zoom = int(sys.argv[3]) if len(sys.argv) > 3 else 14
W, H, TILE = 1600, 1000, 256
ACCENT = (244, 168, 136)

def deg2num(lat_deg, lon_deg, z):
    lat_rad = math.radians(lat_deg); n = 2 ** z
    return (lon_deg + 180.0) / 360.0 * n, (1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n

cx, cy = deg2num(lat, lon, zoom)
px, py = cx * TILE, cy * TILE                  # merkez piksel (dünya koordinatı)
x0, y0 = px - W / 2, py - H / 2
tx0, ty0 = int(x0 // TILE), int(y0 // TILE)
tx1, ty1 = int((x0 + W) // TILE), int((y0 + H) // TILE)
canvas = Image.new("RGB", ((tx1 - tx0 + 1) * TILE, (ty1 - ty0 + 1) * TILE), (240, 240, 240))
opener = urllib.request.build_opener()
opener.addheaders = [("User-Agent", "agca.studio-site-map/1.0 (info@agca.studio)")]
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        url = f"https://tile.openstreetmap.org/{zoom}/{tx}/{ty}.png"
        try:
            data = opener.open(url, timeout=30).read()
            canvas.paste(Image.open(io.BytesIO(data)).convert("RGB"), ((tx - tx0) * TILE, (ty - ty0) * TILE))
        except Exception as e:
            print("karo alınamadı:", url, e)
ox, oy = int(x0 - tx0 * TILE), int(y0 - ty0 * TILE)
img = canvas.crop((ox, oy, ox + W, oy + H))
# sessiz galeri diline uygun: gri tonlama + açma
img = ImageOps.grayscale(img).convert("RGB")
img = Image.blend(img, Image.new("RGB", img.size, (255, 255, 255)), 0.28)
# işaret: somon nokta + beyaz halka (bölge merkezi)
d = ImageDraw.Draw(img)
mx, my = W // 2, H // 2
d.ellipse((mx - 22, my - 22, mx + 22, my + 22), fill=(255, 255, 255))
d.ellipse((mx - 15, my - 15, mx + 15, my + 15), fill=ACCENT)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT, "JPEG", quality=85, optimize=True, progressive=True)
print("yazıldı:", OUT, img.size, os.path.getsize(OUT) // 1024, "KB — merkez", lat, lon, "zoom", zoom)

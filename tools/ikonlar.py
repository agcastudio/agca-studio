# -*- coding: utf-8 -*-
"""Site simgeleri ve paylaşım kartı: favicon.ico, apple-touch-icon.png, og-default.jpg, logo-og.png"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
KURUMSAL = os.path.join(SITE, "..", "Kurumsal")
STATIC = os.path.join(SITE, "static")
IMG = os.path.join(STATIC, "img")
ASSETS_IMG = os.path.join(SITE, "assets", "img")
ACCENT = (244, 168, 136)
os.makedirs(IMG, exist_ok=True); os.makedirs(ASSETS_IMG, exist_ok=True)

def dot(size, pad_ratio=0.30, bg=(255, 255, 255, 0)):
    im = Image.new("RGBA", (size * 4, size * 4), bg)
    d = ImageDraw.Draw(im)
    p = int(size * 4 * pad_ratio)
    d.ellipse((p, p, size * 4 - p, size * 4 - p), fill=ACCENT)
    return im.resize((size, size), Image.LANCZOS)

# favicon.ico (16/32/48) — şeffaf zemin, somon nokta
icons = [dot(s) for s in (16, 32, 48)]
icons[0].save(os.path.join(STATIC, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=icons[1:])

# apple-touch-icon 180 — beyaz zemin
dot(180, 0.28, (255, 255, 255, 255)).convert("RGB").save(os.path.join(IMG, "apple-touch-icon.png"), optimize=True)

# logo-og.png 512×512 (şema logo alanı için) ve og-default.jpg 1200×630 — kare logodan
Image.MAX_IMAGE_PIXELS = None
logo = Image.open(os.path.join(KURUMSAL, "logo.jpg")).convert("RGB")
logo.thumbnail((2400, 2400), Image.LANCZOS)
w, h = logo.size
sq = logo.resize((512, 512), Image.LANCZOS)
sq.save(os.path.join(IMG, "logo-og.png"), optimize=True)
# 1200×630: logonun orta bandını kırp (yazı ortada)
band_h = int(w * 630 / 1200)
top = (h - band_h) // 2
og = logo.crop((0, top, w, top + band_h)).resize((1200, 630), Image.LANCZOS)
og.save(os.path.join(ASSETS_IMG, "og-default.jpg"), "JPEG", quality=88, optimize=True)
print("ikonlar yazıldı:", STATIC, IMG, ASSETS_IMG)

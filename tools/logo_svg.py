# -*- coding: utf-8 -*-
"""
agca·studio yazı-logosunu raster (JPG) örneğinden ölçüp Century Gothic (GOTHIC.TTF)
glif hatlarıyla SVG olarak yeniden üretir.

Çıktılar (static/img/):
  logo.svg          yatay kelime markası (siyah harfler + somon nokta)
  logo-white.svg    beyaz harfler (koyu zemin gerekirse)
  mark.svg          yalnız somon nokta (favicon / site simgesi)
"""
import os, sys
import numpy as np
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
SRC = os.path.join(SITE, "..", "Kurumsal", "agca·studio 2.jpg")
FONT = r"C:\Windows\Fonts\GOTHIC.TTF"
OUT = os.path.join(SITE, "static", "img")
ACCENT = "#F4A888"
TEXT = "agca" + "studio"  # nokta ayrı çizilir

os.makedirs(OUT, exist_ok=True)

# --- 1) rasterden harf konumlarını ölç -----------------------------------
im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(int)
gray = a.mean(axis=2)
sat = a.max(axis=2) - a.min(axis=2)
ink = (gray < 110) & (sat < 60)          # siyah harfler
dot = sat > 60                            # somon nokta

cols = ink.any(axis=0)
segs, start = [], None
for x, v in enumerate(cols):
    if v and start is None:
        start = x
    elif not v and start is not None:
        segs.append((start, x - 1)); start = None
if start is not None:
    segs.append((start, len(cols) - 1))
# çok dar parçaları (gürültü) at
segs = [s for s in segs if s[1] - s[0] > 8]
print("harf parçaları:", len(segs), segs)
assert len(segs) == len(TEXT), "beklenen 10 harf parçası bulunamadı"

def rows_of(x0, x1):
    r = ink[:, x0:x1 + 1].any(axis=1)
    ys = np.where(r)[0]
    return ys.min(), ys.max()

# 'a' (ilk harf) x-yüksekliği ve taban çizgisi
a_top, a_bot = rows_of(*segs[0])
baseline_px = a_bot
xheight_px = a_bot - a_top
print("x-yüksekliği px:", xheight_px, "taban:", baseline_px)

# nokta
ys, xs = np.where(dot)
dot_cx, dot_cy = xs.mean(), ys.mean()
dot_r = (xs.max() - xs.min() + ys.max() - ys.min()) / 4.0
print("nokta merkez/r:", dot_cx, dot_cy, dot_r)

# --- 2) font glifleri -----------------------------------------------------
font = TTFont(FONT)
gs = font.getGlyphSet()
cmap = font.getBestCmap()
upem = font["head"].unitsPerEm

def glyph_bounds(ch):
    g = gs[cmap[ord(ch)]]
    bp = BoundsPen(gs); g.draw(bp)
    return bp.bounds  # xMin, yMin, xMax, yMax

def glyph_path(ch):
    g = gs[cmap[ord(ch)]]
    pen = SVGPathPen(gs); g.draw(pen)
    return pen.getCommands()

# ölçek: raster x-yüksekliği / fontun 'a' yüksekliği (a'nın yMax'ı ≈ x-height + overshoot)
a_b = glyph_bounds("a")
scale = xheight_px / (a_b[3] - a_b[1])  # a'nın toplam yüksekliği (overshoot dahil), rasterdeki de aynı
print("ölçek px/unit:", scale)

W, H = im.size
paths = []
for ch, (x0, x1) in zip(TEXT, segs):
    b = glyph_bounds(ch)
    # glifin sol mürekkep kenarı rasterdeki parçanın soluna otursun
    tx = x0 - b[0] * scale
    ty = baseline_px + (a_b[1] * scale)  # a'nın alt overshoot'u taban çizgisinin altına gelir
    paths.append((ch, glyph_path(ch), tx, ty))

def svg(fill):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="agca·studio">']
    parts.append('<title>agca·studio</title>')
    for ch, d, tx, ty in paths:
        parts.append(f'<path fill="{fill}" transform="translate({tx:.2f},{ty:.2f}) scale({scale:.6f},{-scale:.6f})" d="{d}"/>')
    parts.append(f'<circle fill="{ACCENT}" cx="{dot_cx:.2f}" cy="{dot_cy:.2f}" r="{dot_r:.2f}"/>')
    parts.append('</svg>')
    return "\n".join(parts)

open(os.path.join(OUT, "logo.svg"), "w", encoding="utf-8").write(svg("#111111"))
open(os.path.join(OUT, "logo-white.svg"), "w", encoding="utf-8").write(svg("#ffffff"))
mark = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle fill="{ACCENT}" cx="32" cy="32" r="22"/></svg>'
open(os.path.join(OUT, "mark.svg"), "w", encoding="utf-8").write(mark)
print("yazıldı:", OUT)

# --- 3) hızlı doğrulama: SVG'yi kabaca rasterize etmeden, harf genişliklerini karşılaştır
for ch, (x0, x1) in zip(TEXT, segs):
    b = glyph_bounds(ch)
    print(f"{ch}: raster genişlik {x1-x0+1:4d}  font genişlik {int((b[2]-b[0])*scale):4d}")

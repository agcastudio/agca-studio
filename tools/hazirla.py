# -*- coding: utf-8 -*-
"""
hazirla.py — Proje görsellerini web için hazırlar.

Kullanım (site/ klasöründe):
  python tools/hazirla.py 2605 --slug oyuk        # Projeler/2605_*/ altındaki görselleri assets/projeler/oyuk/ içine dönüştürür
  python tools/hazirla.py 2605 --slug oyuk --paftalar   # paftaları da dahil et (varsayılan: hariç)
  python tools/hazirla.py --temizle oyuk           # index.md'lerde geçmeyen görselleri assets/projeler/oyuk/ içinden siler
  python tools/hazirla.py --kurumsal               # Kurumsal/ içindeki portreleri assets/img/ içine hazırlar

Kurallar:
  - Kaynak klasör: ../Projeler/<kod>_*/<alt klasör>/...  (Renders → r-, plan/kesit/görünüş → c-, Diagram → d-, Pafta → p-)
  - Çıktı adı: <önek>-<kaynak-adı-slug>.jpg  (küçük harf ASCII, tire)
  - Uzun kenar en çok 2560 px, sRGB JPEG, kalite 85, progressive, EXIF yok
  - CMYK → RGB, saydamlık → beyaz zemin
  - Var olan çıktı, kaynağı daha yeni değilse atlanır
"""
import argparse, glob, io, os, re, sys, unicodedata
from PIL import Image, ImageCms, ImageOps

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(SITE, ".."))
PROJELER = os.path.join(ROOT, "Projeler")
KURUMSAL = os.path.join(ROOT, "Kurumsal")
MAX_SIDE = 2560
QUALITY = 85
EXTS = (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".bmp")

TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜâîûÂÎÛ", "cgiosuCGIOSUaiuAIU")

def slugify(s):
    s = os.path.splitext(s)[0].translate(TR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "gorsel"

def kategori(rel_dir):
    d = rel_dir.lower()
    if d in (".", ""): return "r"   # proje kökündeki görseller render sayılır
    if "render" in d: return "r"
    if "pafta" in d: return "p"
    if "diagram" in d or "diyagram" in d or "sema" in d: return "d"
    return "c"  # plan / kesit / görünüş / perspektif / diğer çizimler

def to_srgb_rgb(im):
    icc = im.info.get("icc_profile")
    if im.mode == "CMYK":
        # Gömülü CMYK profili varsa onunla, yoksa Pillow'un dönüşümüyle
        try:
            if icc:
                src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
                dst = ImageCms.createProfile("sRGB")
                return ImageCms.profileToProfile(im, src, dst, outputMode="RGB")
        except Exception:
            pass
        return im.convert("RGB")
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    if im.mode != "RGB":
        im = im.convert("RGB")
    # RGB + farklı ICC (AdobeRGB vb.) → sRGB
    try:
        if icc:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            desc = ImageCms.getProfileDescription(src)
            if "sRGB" not in desc:
                dst = ImageCms.createProfile("sRGB")
                im = ImageCms.profileToProfile(im, src, dst, outputMode="RGB")
    except Exception:
        pass
    return im

def prepare(src, dst, max_side=MAX_SIDE, quality=QUALITY):
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return "atlandı"
    im = Image.open(src)
    im.draft("RGB", (max_side * 2, max_side * 2))
    im = ImageOps.exif_transpose(im)
    im = to_srgb_rgb(im)
    w, h = im.size
    if max(w, h) > max_side:
        s = max_side / max(w, h)
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "JPEG", quality=quality, optimize=True, progressive=True, subsampling="4:2:0")
    return f"{im.size[0]}x{im.size[1]}  {os.path.getsize(dst)//1024} KB"

def cmd_proje(kod, slug, paftalar):
    kaynak = [d for d in glob.glob(os.path.join(PROJELER, f"{kod}_*")) if os.path.isdir(d)]
    if not kaynak:
        sys.exit(f"Kaynak klasör bulunamadı: {PROJELER}\\{kod}_*")
    kaynak = kaynak[0]
    out_dir = os.path.join(SITE, "assets", "projeler", slug)
    os.makedirs(out_dir, exist_ok=True)
    manifest = []
    for root, _, files in os.walk(kaynak):
        rel_dir = os.path.relpath(root, kaynak)
        kat = kategori(rel_dir)
        if kat == "p" and not paftalar:
            continue
        for f in sorted(files):
            if not f.lower().endswith(EXTS):
                continue
            name = f"{kat}-{slugify(f)}.jpg"
            dst = os.path.join(out_dir, name)
            try:
                info = prepare(os.path.join(root, f), dst)
            except Exception as e:
                info = f"HATA {e}"
            manifest.append((name, rel_dir, f, info))
            print(f"{name:40s} <- {rel_dir}\\{f}  [{info}]")
    with open(os.path.join(out_dir, "_manifest.txt"), "w", encoding="utf-8") as fh:
        fh.write("# çıktı adı | kaynak klasör | kaynak dosya | sonuç\n")
        for m in manifest:
            fh.write(" | ".join(m) + "\n")
    print(f"\n{len(manifest)} görsel → {out_dir}\nListe: {out_dir}\\_manifest.txt")

def cmd_temizle(slug):
    out_dir = os.path.join(SITE, "assets", "projeler", slug)
    used = set()
    for md in glob.glob(os.path.join(SITE, "content", "*", "*", slug, "index.md")):
        txt = open(md, encoding="utf-8").read()
        used.update(re.findall(r'(?:file|cover|card):\s*"?([A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp))"?', txt))
    removed = 0
    for f in os.listdir(out_dir):
        if f.lower().endswith(EXTS) and f not in used:
            os.remove(os.path.join(out_dir, f)); removed += 1
            print("silindi:", f)
    print(f"{removed} dosya silindi; {len(used)} dosya kullanımda.")

def cmd_kurumsal():
    out_dir = os.path.join(SITE, "assets", "img")
    os.makedirs(out_dir, exist_ok=True)
    for f in sorted(os.listdir(KURUMSAL)):
        if not f.lower().endswith(EXTS) or "logo" in f.lower() or "agca" in f.lower():
            continue
        name = slugify(f).replace("-profil-sb", "") + ".jpg"
        info = prepare(os.path.join(KURUMSAL, f), os.path.join(out_dir, name), max_side=1200, quality=88)
        print(f"{name:30s} <- {f}  [{info}]")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("kod", nargs="?", help="proje klasör kodu (ör. 2605)")
    ap.add_argument("--slug", help="site adres kısa adı (ör. oyuk)")
    ap.add_argument("--paftalar", action="store_true", help="paftaları da dönüştür")
    ap.add_argument("--temizle", metavar="SLUG", help="index.md'de geçmeyen görselleri sil")
    ap.add_argument("--kurumsal", action="store_true", help="Kurumsal/ portrelerini hazırla")
    a = ap.parse_args()
    if a.kurumsal:
        cmd_kurumsal()
    elif a.temizle:
        cmd_temizle(a.temizle)
    elif a.kod and a.slug:
        cmd_proje(a.kod, a.slug, a.paftalar)
    else:
        ap.print_help()

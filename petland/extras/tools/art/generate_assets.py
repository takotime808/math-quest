import os, json, io
from pathlib import Path
from PIL import Image, ImageOps
try: import cairosvg
except Exception: cairosvg=None

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "extras" / "tools" / "art" / "source"
OUT = ROOT / "petlands" / "app" / "static" / "assets"
ICONS = ROOT / "petlands" / "app" / "static" / "icons"
MANIFEST = ROOT / "petlands" / "app" / "static" / "manifest.webmanifest"

for p in [OUT, ICONS]: p.mkdir(parents=True, exist_ok=True)

def rasterize(path: Path):
    if path.suffix.lower()==".png": return Image.open(path).convert("RGBA")
    if path.suffix.lower()==".svg":
        if cairosvg is None: raise RuntimeError("Install cairosvg to rasterize SVG")
        png = cairosvg.svg2png(url=str(path)); return Image.open(io.BytesIO(png)).convert("RGBA")
    raise ValueError("Unsupported format")

def save(img, path, size=None, fmt=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    im = img if size is None else ImageOps.contain(img, size, method=Image.Resampling.NEAREST)
    if fmt is None:
        fmt = "PNG" if path.suffix.lower()==".png" else "WEBP"
    im.save(path, format=fmt)

def export_icons(logo: Path):
    lg = rasterize(logo)
    for s in (("apple-touch-icon.png",(180,180)),("icon-192.png",(192,192)),("icon-512.png",(512,512))):
        save(lg, ICONS/s[0], size=s[1], fmt="PNG")
    (ICONS/"favicon.ico").write_bytes((ICONS/"icon-192.png").read_bytes())
    MANIFEST.write_text(json.dumps({
        "name":"Petlands","short_name":"Petlands",
        "icons":[{"src":"/static/icons/icon-192.png","sizes":"192x192","type":"image/png"},
                 {"src":"/static/icons/icon-512.png","sizes":"512x512","type":"image/png"}],
        "start_url":"/","display":"standalone","background_color":"#f5f7fb","theme_color":"#4f46e5"
    }, indent=2))

def export_category(cat, sizes):
    src = SRC/cat
    if not src.exists(): return []
    written = []
    for p in src.glob("*.*"):
        if p.suffix.lower() not in (".svg",".png"): continue
        img = rasterize(p)
        for sz in sizes:
            out = OUT/cat/p.stem/f"{sz}.png"
            save(img, out, size=(sz,sz), fmt="PNG")
            save(img, out.with_suffix(".webp"), size=(sz,sz), fmt="WEBP")
            written.append(out)
    return written

def main():
    (OUT/"pets").mkdir(parents=True, exist_ok=True)
    (OUT/"items").mkdir(parents=True, exist_ok=True)
    branding = list((SRC/"branding").glob("*.*"))
    if branding: export_icons(branding[0])
    export_category("pets", [64,128,256])
    export_category("items", [32,64])
    export_category("ui", [64,128])
    print("Assets written to", OUT)

if __name__=="__main__": main()

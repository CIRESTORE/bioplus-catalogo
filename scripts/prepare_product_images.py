import io
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public" / "data" / "catalog.json"
OUT = ROOT / "public" / "assets" / "products"
OUT.mkdir(parents=True, exist_ok=True)

def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")

def download(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=60) as response:
        return response.read()

def white_product_image(source: bytes, session) -> Image.Image:
    original = Image.open(io.BytesIO(source)).convert("RGBA")
    original.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    cutout = remove(original, session=session)
    alpha = cutout.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGB", (1000, 1000), "white")
    subject = cutout.crop(bbox)
    subject.thumbnail((780, 820), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1000, 1000), "white")
    x = (1000 - subject.width) // 2
    y = (1000 - subject.height) // 2
    canvas.alpha_composite(subject, (x, y))
    return canvas.convert("RGB")

def main(limit: int | None = None):
    data = json.loads(CATALOG.read_text())
    session = new_session("u2net")
    unique = {}
    for product in data["products"]:
        url = product["images"][0]
        unique.setdefault(url, slug(product["name"]))
    items = list(unique.items())[:limit]
    mapping = {}
    for index, (url, name) in enumerate(items, 1):
        target = OUT / f"{name}.webp"
        if target.exists():
            print(f"[{index}/{len(items)}] {name} (cached)", flush=True)
            mapping[url] = f"assets/products/{target.name}"
            continue
        print(f"[{index}/{len(items)}] {name}", flush=True)
        image = white_product_image(download(url), session)
        image.save(target, "WEBP", quality=90, method=6)
        mapping[url] = f"assets/products/{target.name}"
    (OUT / "mapping.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=2))
    print(f"Processed {len(items)} images")

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    main(limit)

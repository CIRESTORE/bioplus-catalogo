from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/products"
SINGLE_FILES = [
    "anticolesterol-2x1.webp",
    "batido-verde-2x1.webp",
    "bondis.webp",
    "chancapiedra-bioplus-500-ml-2x1.webp",
    "cido-rico-500-ml-2x1.webp",
    "clorofila-premium.webp",
    "corrector-para-entradas-2x1-negro.webp",
    "fungi-fin-2x1.webp",
    "h-ten-natural-2x1.webp",
    "higadosan-2x1.webp",
    "hiperten-2x1.webp",
    "k-lostro-bovino.webp",
    "moringa-con-yac-n.webp",
    "propolmiel.webp",
    "rellenador-de-entradas-2x1-negro.webp",
    "rompequistes-500-ml-2x1.webp",
    "vitacer-2x1.webp",
    "vitacerebrina-premium-1-litro.webp",
]

def foreground_crop(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    bg = Image.new("RGB", rgb.size, "white")
    diff = ImageChops.difference(rgb, bg).convert("L")
    mask = diff.point([0 if value <= 8 else 255 for value in range(256)])
    bbox = mask.getbbox()
    if not bbox:
        return rgb
    left, top, right, bottom = bbox
    pad = max(8, int(max(right-left, bottom-top) * 0.03))
    return rgb.crop((max(0, left-pad), max(0, top-pad), min(rgb.width, right+pad), min(rgb.height, bottom+pad)))

def pair_image(path: Path) -> None:
    source = foreground_crop(Image.open(path))
    canvas = Image.new("RGB", (1200, 1000), "white")
    max_w, max_h = 470, 790
    scale = min(max_w / source.width, max_h / source.height)
    size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    unit = source.resize(size, Image.Resampling.LANCZOS)
    y = (canvas.height - unit.height) // 2
    centers = (355, 845)
    for center in centers:
        x = center - unit.width // 2
        canvas.paste(unit, (x, y))
    canvas.save(path, "WEBP", quality=95, method=6)
    print(f"paired {path.name}: {source.size} -> {size}")

if __name__ == "__main__":
    for filename in SINGLE_FILES:
        path = ASSETS / filename
        if not path.exists():
            raise FileNotFoundError(path)
        pair_image(path)

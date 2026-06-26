"""
Sellobay logo qayta ishlash (v3):
- Source: assets/logo-new.png (1120x955, maroon fon + oq SB markaz)
- Center square crop, keyin asset o'lchamlarga resize.
"""

from pathlib import Path

from PIL import Image

ASSETS = Path(r"C:\Dev\Sellobay\apps\mobile\assets")
SRC = ASSETS / "logo-new.png"
MAROON = (139, 0, 32)  # #8B0020 (asset .json'da bilan mos)


def center_square_crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def fit_on_canvas(
    src: Image.Image,
    canvas_size: tuple[int, int],
    bg: tuple[int, int, int] | None,
    scale: float,
) -> Image.Image:
    """src ni canvas o'rtasiga scale bilan joylashtirish."""
    cw, ch = canvas_size
    target = int(min(cw, ch) * scale)
    sw, sh = src.size
    ratio = min(target / sw, target / sh)
    new_size = (max(1, int(sw * ratio)), max(1, int(sh * ratio)))
    resized = src.resize(new_size, Image.Resampling.LANCZOS)
    if bg is None:
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    else:
        canvas = Image.new("RGB", canvas_size, bg)
    x = (cw - new_size[0]) // 2
    y = (ch - new_size[1]) // 2
    if canvas.mode == "RGBA" and resized.mode != "RGBA":
        resized = resized.convert("RGBA")
    canvas.paste(resized, (x, y), resized if resized.mode == "RGBA" else None)
    return canvas


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source not found: {SRC}")
    src = Image.open(SRC).convert("RGB")
    print(f"Source: {src.size} {src.mode}")
    square = center_square_crop(src)
    print(f"Center-square: {square.size}")

    # icon.png — 1024x1024, butun rasmni to'liq egallaydi (logo allaqachon maroon fonda)
    icon = square.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon.save(ASSETS / "icon.png", "PNG", optimize=True)
    print(f"Saved icon.png: {icon.size}")

    # splash.png — 1242x2436 oq fon, markazda logo (55%)
    splash = fit_on_canvas(square, (1242, 2436), (255, 255, 255), scale=0.55)
    splash.save(ASSETS / "splash.png", "PNG", optimize=True)
    print(f"Saved splash.png: {splash.size}")

    # adaptive-icon.png — 1024x1024, app.json'da backgroundColor maroon o'rnatilgan
    # Logo'ning markazidagi oq SB qismini foreground sifatida ishlatamiz (kichikroq)
    adaptive = fit_on_canvas(square, (1024, 1024), MAROON, scale=0.85)
    adaptive.save(ASSETS / "adaptive-icon.png", "PNG", optimize=True)
    print(f"Saved adaptive-icon.png: {adaptive.size}")

    # favicon.png — 256x256
    favicon = square.resize((256, 256), Image.Resampling.LANCZOS)
    favicon.save(ASSETS / "favicon.png", "PNG", optimize=True)
    print(f"Saved favicon.png: {favicon.size}")

    # === Web / Admin / Seller public icons ===
    WEB_APPS = [
        Path(r"C:\Dev\Sellobay\apps\web\public"),
        Path(r"C:\Dev\Sellobay\apps\admin\public"),
        Path(r"C:\Dev\Sellobay\apps\seller\public"),
    ]
    ICON_SIZES = {
        "sellobay-icon.png": 1024,
        "sellobay-icon-512.png": 512,
        "sellobay-icon-192.png": 192,
        "sellobay-icon-180.png": 180,
        "sellobay-icon-64.png": 64,
        "sellobay-icon-32.png": 32,
    }
    for app_dir in WEB_APPS:
        if not app_dir.exists():
            continue
        for fname, sz in ICON_SIZES.items():
            out = square.resize((sz, sz), Image.Resampling.LANCZOS)
            out.save(app_dir / fname, "PNG", optimize=True)
        print(f"Updated {app_dir.parent.name}/public/ icons")

    print("\nDone!")


if __name__ == "__main__":
    main()

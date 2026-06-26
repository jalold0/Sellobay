"""
Sellobay logo generator (v5) — toza bold "S".
1024x1024 maroon fon (subtle radial) + Impact (bold condensed sans) "S" oq rangda.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(r"C:\Dev\Sellobay\apps\mobile\assets")
OUT_PATH = OUT_DIR / "logo-new.png"

MAROON_LIGHT = (155, 18, 50)
MAROON_DARK = (95, 5, 25)
WHITE = (255, 255, 255)

# Impact — bold condensed sans-serif, "S" da yaxshi balans beradi
FONT_PATH = r"C:\Windows\Fonts\impact.ttf"


def make_radial(size: tuple[int, int], inner: tuple[int, int, int], outer: tuple[int, int, int]) -> Image.Image:
    """Subtle radial gradient — markaz biroz yorqin, burchaklar quyuq."""
    w, h = size
    img = Image.new("RGB", size, outer)
    pixels = img.load()
    assert pixels is not None
    cx, cy = w / 2, h / 2
    max_r = (cx ** 2 + cy ** 2) ** 0.5
    for y in range(h):
        for x in range(w):
            t = min(1.0, (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / max_r)
            # easeOut: t**1.5 — center ko'proq, burchak quyuq
            t = t ** 1.3
            r = int(inner[0] + (outer[0] - inner[0]) * t)
            g = int(inner[1] + (outer[1] - inner[1]) * t)
            b = int(inner[2] + (outer[2] - inner[2]) * t)
            pixels[x, y] = (r, g, b)
    return img


def main() -> None:
    SIZE = 1024
    img = make_radial((SIZE, SIZE), MAROON_LIGHT, MAROON_DARK)
    draw = ImageDraw.Draw(img)

    # Katta bold "S" — Impact font, ekranni 70% egallaydi
    font_size = 1100  # Impact juda baland va tor — katta bo'lib chiqadi
    font = ImageFont.truetype(FONT_PATH, font_size)
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (SIZE - text_w) // 2 - bbox[0]
    y = (SIZE - text_h) // 2 - bbox[1] - 50  # ozgina yuqoriroq optical center uchun
    draw.text((x, y), text, fill=WHITE, font=font)

    img.save(OUT_PATH, "PNG", optimize=True)
    print(f"Saved: {OUT_PATH} ({img.size})")


if __name__ == "__main__":
    main()

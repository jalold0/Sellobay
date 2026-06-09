"""
Sellobay logo extraction — V2 (clean image).
Foydalanuvchining toza logo.jpg'sidan oq fonni kesib, faqat SB ikoni saqlanadi.

Manba: C:\\Users\\user\\Desktop\\logo.jpg (1024x519)
"""

from PIL import Image
import numpy as np
import os

SOURCE = r'C:\Users\user\Desktop\logo.jpg'
PROJECT_ROOT = r'C:\Users\user\Desktop\E-Commerce\Online shop'

img = Image.open(SOURCE).convert('RGBA')
W, H = img.size
print(f'Source: {W}x{H}')

# Bordo ranglarni topish — keng diapazonda (icon ham bordo, ham qoramtir)
arr = np.array(img)
# Bordo: red > 60, green < 60, blue < 80 (gradient bordo)
# Yana qoramtir qism: barchasi < 80
mask = (
    ((arr[:, :, 0] > 60) & (arr[:, :, 1] < 80) & (arr[:, :, 2] < 100))  # bordeaux/dark
    | ((arr[:, :, 0] < 80) & (arr[:, :, 1] < 80) & (arr[:, :, 2] < 80))  # qora qism
)

# Logo'ni topish — bordo pixellar bounding box
ys, xs = np.where(mask)
if len(xs) > 0:
    x_min, x_max = int(xs.min()), int(xs.max())
    y_min, y_max = int(ys.min()), int(ys.max())
    print(f'Auto-detected bbox: ({x_min}, {y_min}) -> ({x_max}, {y_max})')

    # Tight crop — padding yo'q (oq fon kerak emas)
    icon = img.crop((x_min, y_min, x_max + 1, y_max + 1))
    print(f'Tight cropped: {icon.size}')

    # Kvadrat qilish — borgan o'lcham bilan
    w, h = icon.size
    side = max(w, h)
    # Markazlangan kvadrat — kichikroq tomonni padding bilan
    new_icon = Image.new('RGBA', (side, side), (0, 0, 0, 0))  # transparent bg
    paste_x = (side - w) // 2
    paste_y = (side - h) // 2
    new_icon.paste(icon, (paste_x, paste_y))
    icon = new_icon
    print(f'Square (centered): {icon.size}')
else:
    raise RuntimeError('No bordeaux pixels found!')

# Saqlash papkalari
TARGETS = ['apps/web/public', 'apps/admin/public', 'apps/seller/public']

# Kerakli o'lchamlar
SIZES = [
    ('sellobay-icon-512.png', 512),
    ('sellobay-icon-192.png', 192),
    ('sellobay-icon-180.png', 180),
    ('sellobay-icon-64.png', 64),
    ('sellobay-icon-32.png', 32),
]

for target_rel in TARGETS:
    target_dir = os.path.join(PROJECT_ROOT, target_rel)
    os.makedirs(target_dir, exist_ok=True)
    for filename, size in SIZES:
        out_path = os.path.join(target_dir, filename)
        resized = icon.resize((size, size), Image.LANCZOS)
        resized.save(out_path, 'PNG', optimize=True)
    print(f'Saved: {target_rel}')

# Next.js app/ icons (asosiy favikonlar)
APP_TARGETS = [
    ('apps/web/src/app/icon.png', 32),
    ('apps/web/src/app/apple-icon.png', 180),
    ('apps/admin/src/app/icon.png', 32),
    ('apps/admin/src/app/apple-icon.png', 180),
    ('apps/seller/src/app/icon.png', 32),
    ('apps/seller/src/app/apple-icon.png', 180),
]
for rel, size in APP_TARGETS:
    out_path = os.path.join(PROJECT_ROOT, rel)
    icon.resize((size, size), Image.LANCZOS).save(out_path, 'PNG', optimize=True)
    print(f'App icon: {rel} ({size}x{size})')

print('\nAll done! V2 — clean logo, no white margins.')

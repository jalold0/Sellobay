"""
Sellobay mobil ilova uchun Expo asset'larini yaratadi.
Manba: C:\\Users\\user\\Desktop\\logo.jpg (toza SB logo, oq fonda)

Yaratiladi (apps/mobile/assets/):
- icon.png         1024x1024  — app store/launcher ikonkasi (SB logo to'liq)
- adaptive-icon.png 1024x1024 — Android adaptive (markazda logo, padding bilan)
- splash.png       1284x2778  — splash screen (markazda logo, oq fon)
- favicon.png      48x48      — web variant
"""

from PIL import Image
import numpy as np
import os

# Tozalangan logo allaqachon web/public'da bor (oq fonsiz, kvadrat)
SOURCE = r'C:\Users\user\Desktop\E-Commerce\Online shop\apps\web\public\sellobay-icon-512.png'
OUT = r'C:\Users\user\Desktop\E-Commerce\Online shop\apps\mobile\assets'
os.makedirs(OUT, exist_ok=True)

logo = Image.open(SOURCE).convert('RGBA')
print(f'Logo manba: {logo.size}')

# 1) icon.png — to'liq logo 1024 (logo allaqachon rounded bordo kvadrat)
icon = logo.resize((1024, 1024), Image.LANCZOS)
icon.convert('RGB').save(os.path.join(OUT, 'icon.png'), 'PNG')
print('icon.png 1024')

# 2) adaptive-icon.png — Android safe zone: logo ~62% markazda, bordo fon
ADAPT = 1024
bg = Image.new('RGBA', (ADAPT, ADAPT), (139, 0, 32, 255))  # #8B0020 bordo
# gradient effekti uchun pastga to'qroq
for y in range(ADAPT):
    t = y / ADAPT
    r = int(139 * (1 - t) + 26 * t)   # 8B -> 1A
    g = int(0 * (1 - t) + 0 * t)
    b = int(32 * (1 - t) + 15 * t)    # 20 -> 0F
    for_row = Image.new('RGBA', (ADAPT, 1), (r, g, b, 255))
    bg.paste(for_row, (0, y))
logo_fg = logo.resize((int(ADAPT * 0.58), int(ADAPT * 0.58)), Image.LANCZOS)
# faqat oq SB harflarini olish uchun logo'ning o'zini joylashtiramiz (u allaqachon bordo fonli)
# lekin adaptive uchun toza oq monogramma kerak — logo'ni shundayligicha qo'yamiz
off = (ADAPT - logo_fg.size[0]) // 2
bg.paste(logo_fg, (off, off), logo_fg)
bg.convert('RGB').save(os.path.join(OUT, 'adaptive-icon.png'), 'PNG')
print('adaptive-icon.png 1024')

# 3) splash.png — oq fon, markazda logo
SW, SH = 1284, 2778
splash = Image.new('RGBA', (SW, SH), (255, 255, 255, 255))
slogo = logo.resize((520, 520), Image.LANCZOS)
splash.paste(slogo, ((SW - 520) // 2, (SH - 520) // 2 - 100), slogo)
splash.convert('RGB').save(os.path.join(OUT, 'splash.png'), 'PNG')
print('splash.png 1284x2778')

# 4) favicon.png 48
logo.resize((48, 48), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'favicon.png'), 'PNG')
print('favicon.png 48')

print('\\nDONE — apps/mobile/assets/ tayyor')

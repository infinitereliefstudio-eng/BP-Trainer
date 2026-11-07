"""Draws the app icon (two Blueprint nodes joined by a white exec wire).

    python3 tools/icons/make_icons.py   # writes public/icons/*.png

icon-maskable-512.png shrinks the drawing into Android's safe zone.
"""
import pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parents[2] / 'public' / 'icons'
S = 1024  # drawn large, then downscaled for smooth edges

BG = (21, 21, 21)
BODY = (36, 36, 36)
RED = (166, 28, 28)
BLUE = (58, 110, 194)
WHITE = (240, 240, 240)
GREEN = (156, 242, 58)


def node(d: ImageDraw.ImageDraw, x, y, w, h, header):
    r = 34
    d.rounded_rectangle((x, y, x + w, y + h), r, fill=BODY, outline=(70, 70, 70), width=6)
    d.rounded_rectangle((x, y, x + w, y + 92), r, fill=header)
    d.rectangle((x, y + 60, x + w, y + 92), fill=header)


def exec_pin(d, cx, cy, s=26, fill=WHITE):
    d.polygon([(cx - s, cy - s), (cx + 4, cy - s), (cx + s + 4, cy), (cx + 4, cy + s), (cx - s, cy + s)], fill=fill)


def bezier(p0, p1, p2, p3, n=80):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        pts.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return pts


def draw() -> Image.Image:
    img = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(img)
    # Left: an event node (red header) with its exec output.
    node(d, 150, 250, 300, 260, RED)
    exec_pin(d, 405, 420)
    # Right: a function node (blue header), exec in and a data pin.
    node(d, 575, 520, 300, 260, BLUE)
    exec_pin(d, 625, 690)
    d.ellipse((800, 665, 850, 715), outline=GREEN, width=10)
    # The white exec wire between them.
    # Dots along the curve give a smooth thick stroke.
    for x, y in bezier((432, 420), (560, 420), (470, 690), (598, 690), 400):
        d.ellipse((x - 11, y - 11, x + 11, y + 11), fill=WHITE)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    big = draw()
    for size in (512, 192, 180):
        big.resize((size, size), Image.LANCZOS).save(OUT / f'icon-{size}.png', optimize=True)
    # Maskable: the drawing shrunk into Android's safe circle (radius 40 %).
    mask = Image.new('RGB', (S, S), BG)
    inner = big.resize((int(S * 0.7), int(S * 0.7)), Image.LANCZOS)
    mask.paste(inner, ((S - inner.width) // 2, (S - inner.height) // 2))
    mask.resize((512, 512), Image.LANCZOS).save(OUT / 'icon-maskable-512.png', optimize=True)
    print('icons written to', OUT)


if __name__ == '__main__':
    main()

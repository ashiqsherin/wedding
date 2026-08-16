#!/usr/bin/env python3
"""Cut assets/GateOpen1.png into the pieces the animated gate needs.

    python3 tools/build-gate3.py assets/

  gate3-scene.jpg   the artwork with the two door leaves lifted out of it and
                    the hole filled with the paper behind them
  gate3-leaf-l.png  the left leaf, ink only, on transparency
  gate3-leaf-r.png  the right leaf

Compositing the leaves back over the scene in place reproduces the original
picture; rotating them away opens the gate — which is what css/style.css does,
from the same rectangle as the one below. Move it here and move it there.

Needs Pillow: pip install pillow
"""
from PIL import Image, ImageFilter, ImageDraw, ImageChops
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, os.pardir, 'assets', 'GateOpen1.png')
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

# The door opening, in the artwork's own pixels: between the two lantern posts,
# from the crown's peak down to where the lilies take over.
X0, X1 = 233, 694
Y0, Y1 = 756, 1474
XM = 463                      # where the two leaves meet
FEATHER = 7                   # sides + top: just enough to kill the cut line
FADE_BOT = 145                 # bottom: the leaves dissolve into the flowers

im = Image.open(SRC).convert('RGB')
W, H = im.size

# ── 1. the mask ────────────────────────────────────────────────
# White where the leaves live. Everything below keys off this one shape, so the
# scene loses exactly what the leaves gain and the two still add up to the
# original.
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
d.rectangle([X0, Y0, X1, Y1], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
# the long fade along the bottom, over the flowers
grad = Image.new('L', (W, H), 255)
gd = ImageDraw.Draw(grad)
for i in range(FADE_BOT):
    y = Y1 - FADE_BOT + i
    gd.line([(0, y), (W, y)], fill=int(255 * (1 - i / FADE_BOT) ** 1.15))
gd.rectangle([0, Y1, W, H], fill=0)
mask = ImageChops.multiply(mask, grad)

# ── 2. the paper behind the gate ───────────────────────────────
# Widen the light and the ironwork disappears into it; blurring what is left
# gives back the paper, its grain and the haze of the far-off hills, without
# any of the iron. Only the opening is taken from it.
plate = im.crop((X0 - 40, Y0 - 40, X1 + 40, Y1 + 40))
plate = plate.filter(ImageFilter.MaxFilter(13))
plate = plate.filter(ImageFilter.MaxFilter(9))
plate = plate.filter(ImageFilter.GaussianBlur(16))
full_plate = im.copy()
full_plate.paste(plate, (X0 - 40, Y0 - 40))
scene = Image.composite(full_plate, im, mask)

# ── 3. the leaves ──────────────────────────────────────────────
# The ironwork is ink on cream: how far a pixel falls below the paper is how
# much iron is in it. That reading is the alpha, and dividing the colour back
# out of it leaves the ink at its own strength — so the leaf laid back over the
# scene lands on the original pixel, not a paler copy of it.
HI, LO, GAMMA = 251.0, 194.0, 1.35
BG = (250, 247, 242)

door = im.crop((X0, Y0, X1, Y1))
dmask = mask.crop((X0, Y0, X1, Y1))
px = door.load()
mp = dmask.load()
leaf = Image.new('RGBA', door.size)
lp = leaf.load()
for y in range(door.size[1]):
    for x in range(door.size[0]):
        r, g, b = px[x, y]
        lum = (r * 299 + g * 587 + b * 114) / 1000.0
        if lum >= HI:
            a = 0.0
        elif lum <= LO:
            a = 1.0
        else:
            a = ((HI - lum) / (HI - LO)) ** GAMMA
        a *= mp[x, y] / 255.0
        if a <= 0.004:
            lp[x, y] = (0, 0, 0, 0)
            continue
        # un-mix the paper the ink was painted on
        out = []
        for c, bg in ((r, BG[0]), (g, BG[1]), (b, BG[2])):
            v = (c - (1 - a) * bg) / a
            out.append(0 if v < 0 else (255 if v > 255 else int(v + .5)))
        lp[x, y] = (out[0], out[1], out[2], int(a * 255 + .5))

half = XM - X0
left = leaf.crop((0, 0, half, leaf.size[1]))
right = leaf.crop((half, 0, leaf.size[0], leaf.size[1]))

os.makedirs(OUT, exist_ok=True)
scene.save(os.path.join(OUT, 'gate3-scene.jpg'), quality=84, optimize=True, progressive=True)
left.quantize(colors=160, method=Image.FASTOCTREE).save(os.path.join(OUT, 'gate3-leaf-l.png'), optimize=True)
right.quantize(colors=160, method=Image.FASTOCTREE).save(os.path.join(OUT, 'gate3-leaf-r.png'), optimize=True)
for n, i in (('scene', scene), ('leaf-l', left), ('leaf-r', right)):
    print(n, i.size)

# ── proofs ─────────────────────────────────────────────────────
shut = scene.convert('RGBA')
shut.alpha_composite(left, (X0, Y0))
shut.alpha_composite(right, (XM, Y0))
shut.convert('RGB').save(os.path.join(OUT, 'proof-shut.jpg'), quality=88)
diff = ImageChops.difference(shut.convert('RGB'), im)
print('closed vs original — worst channel error:', diff.getextrema())
scene.save(os.path.join(OUT, 'proof-open.jpg'), quality=88)

# side by side, so the seam is easy to spot
band = im.crop((X0 - 60, Y0 - 60, X1 + 60, Y1 + 60))
cmp = Image.new('RGB', (band.width * 2 + 20, band.height), (255, 255, 255))
cmp.paste(band, (0, 0))
cmp.paste(shut.convert('RGB').crop((X0 - 60, Y0 - 60, X1 + 60, Y1 + 60)), (band.width + 20, 0))
cmp.save(os.path.join(OUT, 'proof-compare.jpg'), quality=90)

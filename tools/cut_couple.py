"""
Cuts the couple collection sheet into individual transparent poses.
Run:  python3 tools/cut_couple.py        (needs pillow + numpy)
Input : elements/couple/Watercolor South Asian Wedding Couple Collection.png
Output: site/assets/couple/<pose>.webp  (+ prints size / feet position)
"""
import os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "elements/couple/Watercolor South Asian Wedding Couple Collection.png")
OUT = os.path.join(ROOT, "site/assets/couple")
os.makedirs(OUT, exist_ok=True)

K = 1.536  # boxes below were measured on a 1000 px wide preview of the 1536 px sheet
POSES = {  # name: (x0, y0, x1, y1) in preview coordinates
    "wedding-front": (18, 28, 162, 288),
    "wedding-back": (163, 26, 312, 288),
    "wedding-side": (318, 28, 462, 288),
    "wedding-carry": (466, 28, 636, 288),
    "wedding-walk": (636, 36, 802, 288),
    "wedding-bench": (800, 80, 996, 288),
    "haldi-front": (18, 292, 150, 528),
    "haldi-carry": (140, 296, 272, 528),
    "haldi-back": (274, 296, 392, 528),
    "sangeet-run": (452, 306, 620, 515),
    "sangeet-twirl": (676, 312, 822, 518),
    "sangeet-dip": (802, 316, 970, 512),
    "reception": (362, 448, 524, 648),
}

sheet = Image.open(SRC).convert("RGBA")
A = np.array(sheet)


def components(mask, merge=3):
    """Label connected parts at half resolution (dilated so both people join up)."""
    m = Image.fromarray((mask * 255).astype("uint8")).resize((mask.shape[1] // 2, mask.shape[0] // 2))
    m = m.filter(ImageFilter.MaxFilter(merge))
    md = np.array(m) > 127
    lab = np.zeros(md.shape, int)
    n = 0
    H, W = md.shape
    for y in range(H):
        for x in range(W):
            if md[y, x] and not lab[y, x]:
                n += 1
                q = deque([(y, x)])
                lab[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and md[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n
                            q.append((ny, nx))
    return lab, n


for name, box in POSES.items():
    x0, y0, x1, y1 = [int(v * K) for v in box]
    sub = A[y0:y1, x0:x1].copy()
    alpha = sub[..., 3].astype(np.float32)
    solid = alpha > 70
    lab, n = components(solid)
    if n == 0:
        print("EMPTY", name)
        continue
    sizes = [(lab == i).sum() for i in range(1, n + 1)]
    big = max(sizes)
    H2, W2 = lab.shape
    keep = np.zeros(lab.shape, bool)
    for i, s in enumerate(sizes, 1):
        if s <= big * 0.18:
            continue
        ys, xs = np.where(lab == i)
        if s < big and (xs.min() <= 2 or xs.max() >= W2 - 3):   # neighbour's sliver cut by the box edge
            continue
        keep |= lab == i
    keep_full = np.array(Image.fromarray((keep * 255).astype("uint8")).resize((solid.shape[1], solid.shape[0]), Image.NEAREST)) > 127
    keep_full = np.array(Image.fromarray((keep_full * 255).astype("uint8")).filter(ImageFilter.MaxFilter(7))) > 127
    # remove the baked-in white glow: steeper alpha ramp, then pull the edge in 1px
    a2 = np.clip((alpha - 105) / 50.0, 0, 1)   # steep ramp: pale fabric stays solid, the baked-in glow (alpha <= ~100) disappears
    a2 = a2 * keep_full
    a_img = Image.fromarray((a2 * 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = sub.copy()
    out[..., 3] = np.array(a_img)
    # keep only the main mass: drop anything separated from it by an empty gap (neighbour slivers)
    for axis in (0, 1):
        occ = (out[..., 3] > 128).sum(axis=axis)
        runs, s0, gap = [], None, 0
        for k, v in enumerate(occ):
            if v > 0:
                if s0 is None:
                    s0 = k
                gap = 0
                e0 = k
            elif s0 is not None:
                gap += 1
                if gap > 1:
                    runs.append((s0, e0, occ[s0:e0 + 1].sum()))
                    s0 = None
        if s0 is not None:
            runs.append((s0, e0, occ[s0:e0 + 1].sum()))
        mainw = max(r[2] for r in runs)
        for r0, r1, w in runs:
            if w < 0.25 * mainw:                      # thin neighbour sliver
                if axis == 0:
                    out[:, r0:r1 + 1, 3] = 0
                else:
                    out[r0:r1 + 1, :, 3] = 0
    bb = Image.fromarray(out[..., 3]).getbbox()
    out = out[bb[1]:bb[3], bb[0]:bb[2]]
    alpha_f = out[..., 3].astype(np.float32) / 255
    rgb = out[..., :3].astype(np.float32)
    # alpha bleeding: replace the colour of every edge / transparent pixel with the colour of the nearby
    # opaque interior, so no dark or white fringe can show when the edge is resampled or composited
    known = alpha_f > 0.92
    for r in (1, 2, 2, 3, 3, 4, 5, 6, 8, 10):
        kn_img = Image.fromarray((known * 255).astype("uint8")).filter(ImageFilter.BoxBlur(r))
        den = np.array(kn_img).astype(np.float32) / 255
        new = (~known) & (den > 0.04)
        if not new.any():
            continue
        for c in range(3):
            ch = Image.fromarray((rgb[..., c] * known).astype("uint8")).filter(ImageFilter.BoxBlur(r))
            fill = np.array(ch).astype(np.float32) / np.maximum(den, 1e-3)
            rgb[..., c] = np.where(new, np.clip(fill, 0, 255), rgb[..., c])
        known |= new
    # gentle 1.75x upscale (colour and alpha separately) + soft sharpen on colour only
    h, w = alpha_f.shape
    size = (int(w * 1.75), int(h * 1.75))
    rgb_img = Image.fromarray(np.clip(rgb, 0, 255).astype("uint8")).resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))
    a_img = Image.fromarray((alpha_f * 255).astype("uint8")).resize(size, Image.BICUBIC)
    im = rgb_img.convert("RGBA")
    im.putalpha(a_img)
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=90, method=6)
    print(f"{name:15s} {im.size}  {os.path.getsize(os.path.join(OUT, name + '.webp'))//1024} KB")

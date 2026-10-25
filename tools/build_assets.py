"""
Builds every web asset from /elements into /assets (run:  python3 tools/build_assets.py).
Needs: pillow, numpy.

Outputs (all WebP):
  plate-a.webp   SCENE_A, 9:16, sky extended upward, plate's own banana leaves / bougainvillea /
                 brass vases erased (repainted by diffusion fill). Bell + lantern extracted first.
  plate-b.webp   SCENE_B, 9:16, sky extended upward (umbrella/rug/bowls kept as the Haldi base)
  banana.webp, bougain.webp (mirrored for top-right), bell.webp, lantern.webp
  (couple poses come from tools/cut_couple.py)
  brass-stand.webp (IMG6), marigold.webp (IMG7), stage.webp (IMG8, painterly + soft edges)
  envelope.webp (IMG2)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EL = os.path.join(ROOT, "elements")
OUT = os.path.join(ROOT, "site", "assets")
os.makedirs(OUT, exist_ok=True)

SRC = {
    "scene_a": "WhatsApp Image 2026-10-19 at 17.53.56.jpeg",
    "scene_b": "WhatsApp Image 2026-10-19 at 17.53.57.jpeg",
    "img1": "WhatsApp Image 2026-10-19 at 18.24.03.jpeg",            # banana leaves (white bg)
    "img2": "WhatsApp Image 2026-10-19 at 17.48.54.jpeg",            # envelope
    "img4": "WhatsApp Image 2026-10-19 at 17.44.43.jpeg",            # bougainvillea (baked checkerboard)
    "img6": "WhatsApp_Image_2026-10-19_at_17.44.45-removebg-preview.png",  # brass stands + elephant
    "img7": "WhatsApp_Image_2026-10-19_at_17.44.45__1_-removebg-preview.png",  # marigold arrangement
    "img8": "WhatsApp Image 2026-10-19 at 17.44.45 (2).jpeg",        # red-drape stage
    "reception": "_.jpeg",                                           # reception stage photo (Instagram screenshot)
}


def load(key, mode="RGB"):
    return Image.open(os.path.join(EL, SRC[key])).convert(mode)


def save(im, name, q=84):
    p = os.path.join(OUT, name)
    im.save(p, "WEBP", quality=q, method=6)
    print(f"{name:20s} {im.size}  {os.path.getsize(p)//1024} KB")


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def poly_mask(size, poly):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.array(m) > 127


# ---------------------------------------------------------------- SCENE A
def diffuse_fill(img, mask, scale=4, iters=900):
    """Repaint masked pixels by diffusing the surrounding colours inward (smooth sky/sand/sea)."""
    W, H = img.size
    sw, sh = W // scale, H // scale
    a = np.array(img.resize((sw, sh), Image.BILINEAR)).astype(np.float32)
    m = np.array(Image.fromarray((mask * 255).astype("uint8")).resize((sw, sh), Image.BILINEAR)) > 20
    known = ~m
    cur = a.copy()
    cur[m] = a[known].mean(axis=0)
    for _ in range(iters):
        p = np.pad(cur, ((1, 1), (1, 1), (0, 0)), mode="edge")
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        cur[m] = avg[m]
    big = Image.fromarray(np.clip(cur, 0, 255).astype("uint8")).resize((W, H), Image.BICUBIC)
    return big.filter(ImageFilter.GaussianBlur(3))


def build_plate_a():
    img = load("scene_a")
    W, H = img.size
    hsv = np.array(img.convert("HSV")).astype(np.float32)
    hue = hsv[..., 0] * 360 / 255
    sat = hsv[..., 1] / 255
    val = hsv[..., 2] / 255

    tree = poly_mask((W, H), [(560, 0), (1153, 0), (1153, 780), (1090, 780), (1060, 640), (1030, 470),
                              (940, 430), (880, 350), (800, 330), (560, 330)])
    leaves = poly_mask((W, H), [(870, 1000), (1153, 1000), (1153, 1600), (920, 1600), (930, 1540), (860, 1420),
                                (870, 1380), (890, 1300), (870, 1190), (890, 1100)])
    vases = poly_mask((W, H), [(0, 1300), (440, 1300), (440, 1600), (0, 1600)])

    green = (hue > 50) & (hue < 170)
    mask = (tree & ((sat > 0.18) | (val < 0.55))) \
        | (leaves & green & (sat > 0.25)) \
        | (vases & ((sat > 0.30) | (val < 0.55)))
    m = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(15))
    mask = np.array(m) > 127
    clean = diffuse_fill(img, mask)
    # feather the repaint into the original
    soft = np.array(m.filter(ImageFilter.GaussianBlur(5))).astype(np.float32)[..., None] / 255
    out = Image.fromarray((np.array(img) * (1 - soft) + np.array(clean) * soft).astype("uint8"))
    # a touch of grain so the repaint matches the paper
    noise = np.random.RandomState(3).normal(0, 2.2, (H, W, 1))
    o = np.array(out).astype(np.float32) + noise * soft
    out = Image.fromarray(np.clip(o, 0, 255).astype("uint8"))

    # ---- bell + lantern (gold) extracted from the ORIGINAL
    def extract(box, name, seed, mirror_left=False):
        c = img.crop(box)
        h = np.array(c.convert("HSV")).astype(np.float32)
        hh, ss = h[..., 0] * 360 / 255, h[..., 1] / 255
        gold = (hh > 28) & (hh < 62) & (ss > 0.22)
        b = Image.fromarray((gold * 255).astype("uint8"))
        # keep only the object connected to the chain (drops stray leaves / petals)
        grown = b.filter(ImageFilter.MaxFilter(5))
        ImageDraw.floodfill(grown, seed, 128, thresh=0)
        keep = (np.array(grown) == 128) & (np.array(b) > 127)
        a = Image.fromarray((keep * 255).astype("uint8"))
        a = a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
        rgba = c.convert("RGBA")
        rgba.putalpha(a)
        if mirror_left:                       # blossoms hide the right half: rebuild it from the left
            cx = seed[0]
            left = rgba.crop((0, 0, cx + 1, rgba.height))
            full = Image.new("RGBA", (cx * 2 + 1, rgba.height))
            full.paste(left, (0, 0))
            full.paste(left.transpose(Image.FLIP_LEFT_RIGHT), (cx, 0))
            rgba = full
        rgba = rgba.crop(rgba.getbbox())
        save(rgba, name, 90)
    extract((795, 95, 885, 325), "bell.webp", (45, 60))
    extract((925, 140, 1062, 398), "lantern.webp", (70, 60), mirror_left=True)

    # ---- extend sky upward to 9:16
    target_h = int(round(W * 16 / 9))
    extra = target_h - H
    top = out.crop((0, 0, W, extra)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(6))
    canvas = Image.new("RGB", (W, target_h))
    canvas.paste(top, (0, 0))
    canvas.paste(out, (0, extra))
    # soften the seam
    seam = canvas.crop((0, extra - 40, W, extra + 40)).filter(ImageFilter.GaussianBlur(10))
    canvas.paste(seam, (0, extra - 40))
    canvas = canvas.resize((900, int(900 * 16 / 9)), Image.LANCZOS)
    save(canvas, "plate-a.webp", 82)
    print("plate-a: original y -> new y offset:", extra)


# ---------------------------------------------------------------- SCENE B
def build_plate_b():
    img = load("scene_b")
    W, H = img.size
    target_h = int(round(W * 16 / 9))
    extra = target_h - H
    top = img.crop((0, 0, W, extra)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(6))
    canvas = Image.new("RGB", (W, target_h))
    canvas.paste(top, (0, 0))
    canvas.paste(img, (0, extra))
    seam = canvas.crop((0, extra - 40, W, extra + 40)).filter(ImageFilter.GaussianBlur(10))
    canvas.paste(seam, (0, extra - 40))
    canvas = canvas.resize((900, int(900 * 16 / 9)), Image.LANCZOS)
    save(canvas, "plate-b.webp", 82)


# ---------------------------------------------------------------- cut-outs
def build_banana():
    im = load("img1")
    a = np.array(im).astype(np.float32)
    whiteness = a.min(axis=2)
    alpha = 1 - smoothstep(214, 248, whiteness)
    A = Image.fromarray((alpha * 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    al = np.array(A).astype(np.float32) / 255
    # un-matte from white
    rgb = (a - (1 - al[..., None]) * 255) / np.maximum(al[..., None], 0.05)
    rgb = np.clip(rgb, 0, 255).astype("uint8")
    out = Image.fromarray(rgb).convert("RGBA")
    out.putalpha(A)
    save(out.crop(out.getbbox()), "banana.webp", 88)


def build_bougain():
    im = load("img4")
    a = np.array(im).astype(np.float32) / 255
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / (mx + 1e-6)
    alpha = np.maximum(smoothstep(0.10, 0.24, sat), smoothstep(0.62, 0.45, mx))
    A = Image.fromarray((alpha * 255).astype("uint8"))
    A = A.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MinFilter(3)) \
        .filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(A)
    out = out.crop(out.getbbox()).transpose(Image.FLIP_LEFT_RIGHT)   # hangs from the top-right
    save(out, "bougain.webp", 88)


def trim(im):
    return im.crop(im.getbbox())


def build_cutouts():
    save(trim(load("img6", "RGBA")), "brass-stand.webp", 90)
    save(trim(load("img7", "RGBA")), "marigold.webp", 90)
    save(load("img2"), "envelope.webp", 86)


def build_stage():
    """IMG8 (square stage photo) -> full-bleed 9:16 plate. The canopy above and the lawn below the photo are
    mirrored continuations (blurred + darkened) so the stage fills the whole screen like the other scenes."""
    im = load("img8")
    im = ImageEnhance.Color(im).enhance(1.1)
    im = ImageEnhance.Brightness(im).enhance(1.12)
    PW, PH = 900, 1600
    ph = im.resize((PW, PW), Image.LANCZOS)
    top = 369                                   # photo top on the plate: chequered floor lands at ~72% of the height
    canvas = Image.new("RGB", (PW, PH), (8, 10, 8))
    canvas.paste(ph, (0, top))
    # canopy: mirror of the photo's top rows, blurred and fading to dark toward the top edge
    sharp = ph.crop((0, 0, PW, top)).transpose(Image.FLIP_TOP_BOTTOM)
    soft = sharp.filter(ImageFilter.GaussianBlur(6))
    k = np.clip(np.linspace(1.0, -0.6, top), 0, 1)[:, None, None]          # sharp at the seam, softer farther up
    ext = Image.fromarray((np.array(sharp) * k + np.array(soft) * (1 - k)).astype("uint8"))
    fade = np.linspace(0.45, 1.0, top)[:, None, None]
    ext = Image.fromarray((np.array(ext).astype(np.float32) * fade).astype("uint8"))
    canvas.paste(ext, (0, 0))
    # lawn: mirror-tile the last rows of the photo (grass only), blurred and darker toward the bottom
    below = PH - (top + PW)
    strip = ph.crop((0, PW - 70, PW, PW))
    tile = Image.new("RGB", (PW, below))
    y, flip = 0, True
    while y < below:
        t = strip.transpose(Image.FLIP_TOP_BOTTOM) if flip else strip
        tile.paste(t, (0, y))
        y += t.height
        flip = not flip
    tile = tile.filter(ImageFilter.GaussianBlur(7))
    fade = np.linspace(1.0, 0.4, below)[:, None, None]
    tile = Image.fromarray((np.array(tile).astype(np.float32) * fade).astype("uint8"))
    canvas.paste(tile, (0, top + PW))
    save(canvas, "plate-sangeet.webp", 86)


def build_reception_plate():
    """Reception stage photo -> clean 9:16 plate: crop the black top bar + the app UI on the right,
    repaint the decorator's small logo on the floor, resize."""
    img = load("reception")
    W, H = img.size
    top = 10
    cw = int(round((H - top) * 9 / 16))
    x0 = 112
    # logo mark on the floor (source px)
    mask = np.zeros((H, W), bool)
    mask[758:858, 336:426] = True
    clean = diffuse_fill(img, mask, scale=4, iters=500)
    soft = np.array(Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)[..., None] / 255
    out = Image.fromarray((np.array(img) * (1 - soft) + np.array(clean) * soft).astype("uint8"))
    out = out.crop((x0, top, x0 + cw, H))
    out = out.resize((900, int(900 * 16 / 9)), Image.LANCZOS)
    save(out, "plate-reception.webp", 86)


if __name__ == "__main__":
    build_plate_a()
    build_plate_b()
    build_banana()
    build_bougain()
    build_cutouts()
    build_stage()
    build_reception_plate()

"""
Splits the "garland exchange" pose from the Indian wedding pose sheet into puppet layers so the
exchange can be animated (hands lift the garland, lower it over the partner):

  gx-bride-body.webp   bride (strand removed)
  gx-groom-body.webp   groom (his garland + raised forearm/hands removed, repainted)
  gx-groom-arm.webp    groom's forearm + hands (rotates about the elbow)
  gx-strand.webp       the long garland the groom lowers onto the bride
  gx-garland.webp      the garland the bride lowers onto the groom
All layers share one canvas so they stack with identical alignment.

Run:  python3 tools/cut_garland.py     (pillow + numpy)
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "elements/couple/Watercolor Indian Wedding Pose Sheet.png")
OUT = os.path.join(ROOT, "site/assets/couple")
BOX = (672, 520, 925, 950)        # pose area in sheet px
X0, Y0 = BOX[0], BOX[1]
SCALE = 2

sheet = Image.open(SRC).convert("RGBA").crop(BOX)
W, H = sheet.size
S = np.array(sheet)
alpha0 = S[..., 3].astype(np.float32)


def poly_mask(pts):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([(x - X0, y - Y0) for x, y in pts], fill=255)
    return np.array(m) > 127


def capsule(p0, p1, r):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    a = (p0[0] - X0, p0[1] - Y0)
    b = (p1[0] - X0, p1[1] - Y0)
    d.line([a, b], fill=255, width=int(r * 2))
    for c in (a, b):
        d.ellipse((c[0] - r, c[1] - r, c[0] + r, c[1] + r), fill=255)
    return np.array(m) > 127


def circle(c, r):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse((c[0] - X0 - r, c[1] - Y0 - r, c[0] - X0 + r, c[1] - Y0 + r), fill=255)
    return np.array(m) > 127


# ---- hand-measured geometry (sheet px) ----------------------------------------------------
ELBOW = (746, 678)       # groom's elbow = pivot of the rig
WRIST = (783, 618)
HANDS = (793, 603)
G_POLY = [(731, 590), (736, 606), (741, 622), (746, 640), (748, 665), (750, 690), (751, 720), (754, 750),
          (756, 776), (758, 808), (764, 811), (771, 800), (771, 755), (769, 725), (766, 695), (763, 665),
          (762, 640), (758, 620), (753, 602), (747, 588), (739, 585)]
B_POLY = [(790, 611), (810, 611), (813, 640), (812, 700), (809, 760), (805, 794), (798, 803), (782, 801),
          (778, 770), (779, 700), (780, 660), (783, 636), (786, 620)]

M_F = capsule(ELBOW, WRIST, 15) | circle(HANDS, 20) | circle(WRIST, 16)
M_G_poly = poly_mask(G_POLY)
M_B = poly_mask(B_POLY)

# skin (hands / fingers) stays with the body or the arm, never with the garland
rgb = S[..., :3].astype(np.float32) / 255
mx, mn = rgb.max(2), rgb.min(2)
sat = (mx - mn) / (mx + 1e-6)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hsv = np.array(sheet.convert("RGB").convert("HSV")).astype(np.float32)
hue = hsv[..., 0] * 360 / 255
# real skin is peach (hue ~8-30); shaded jasmine is golden (hue 35-55) and must NOT count as skin
skin = (hue >= 6) & (hue <= 32) & (sat >= 0.25) & (sat <= 0.7) & (mx > 0.55)
# the bride's own hand + wrist stay on her body (jasmine shading is also peach, so colour can't tell them apart)
H_B = circle((793, 647), 11) | circle((806, 659), 9)
M_B = M_B & ~H_B & ~M_F
# the bride's collar of jasmine/roses round her neck + the band running down to the hands (same garland)
COLLAR_POLY = [(869, 611), (856, 608), (842, 611), (831, 616), (821, 626), (811, 637), (803, 648), (799, 661),
               (808, 670), (819, 663), (827, 652), (835, 643), (847, 638), (859, 636), (870, 630)]
M_collar_poly = poly_mask(COLLAR_POLY)
# groom's garland = everything garland-coloured inside a generous corridor round his chest + the hand-drawn core
corridor = np.zeros((H, W), bool)
corridor[584 - Y0:802 - Y0, 724 - X0:783 - X0] = True
roses = ((r > 0.42) & (g < 0.35) & (b < 0.45) & (sat > 0.35)) | ((g > r) & (g > b) & (sat > 0.2))   # roses + leaves
jasmine = (mn > 0.9) & (sat < 0.1)                                                                 # brighter than the cream sherwani
colour = Image.fromarray(((roses | jasmine) & corridor & (alpha0 > 100)).astype("uint8") * 255).filter(ImageFilter.MaxFilter(5))
core = Image.fromarray(M_G_poly.astype("uint8") * 255).filter(ImageFilter.MaxFilter(5))
M_G = ((np.array(colour) > 127) | (np.array(core) > 127)) & ~M_F


ys, xs = np.mgrid[0:H, 0:W]
gx = xs + X0

# collar pixels = garland-coloured (jasmine / roses / leaves) pixels inside the polygon (never skin)
jas2 = ((sat < 0.24) & (mn > 0.68)) | ((hue >= 33) & (hue <= 58) & (sat < 0.6) & (mx > 0.7))     # jasmine, incl. golden shading
ros2 = ((sat > 0.55) & ((hue >= 325) | (hue <= 12)) & (mx < 0.85)) | ((hue >= 70) & (hue <= 170) & (sat > 0.2))   # roses + leaves
poly_d = np.array(Image.fromarray((M_collar_poly * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))) > 127
col_mask = Image.fromarray((((jas2 | ros2) & poly_d & ~H_B & (alpha0 > 100)) * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))
M_collar = (np.array(col_mask) > 127) & ~M_F
M_Bc = M_B | M_collar


def diffuse(rgb8, known, iters=500):
    """Fill unknown pixels by diffusing neighbouring colours."""
    cur = rgb8.astype(np.float32).copy()
    unk = ~known
    cur[unk] = cur[known].mean(axis=0)
    for _ in range(iters):
        p = np.pad(cur, ((1, 1), (1, 1), (0, 0)), mode="edge")
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        cur[unk] = avg[unk]
    return cur


def layer(mask, soft=0.8):
    """Sprite = original pixels inside mask (feathered)."""
    solid = mask & (alpha0 > 70)       # pale petals are semi-transparent in the sheet: count them as solid
    a = Image.fromarray((solid * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(soft))
    out = S.copy()
    out[..., 3] = np.array(a)
    return Image.fromarray(out)


def body(remove, inside):
    """Original minus `remove`; where the removed pixels sat on the body (`inside`) repaint them."""
    known = (alpha0 > 200) & ~remove
    filled = diffuse(S[..., :3], known)
    out = S.copy()
    out[..., :3] = np.where((remove & inside)[..., None], filled, S[..., :3]).astype("uint8")
    al = alpha0.copy()
    al[remove & ~inside] = 0
    al[remove & inside] = 255
    out[..., 3] = al.astype("uint8")
    return Image.fromarray(out)


# ---- ONE body layer for both people (no straight cut between them) --------------------------------
# what gets lifted off the body: the groom's long garland (below his neck - the little neck collar stays on
# him), his forearm + hands, and the garland on the bride (strand + the band down to the hands; her neck wrap stays)
M_G_low = M_G & ((ys + Y0) >= 604)
M_band = M_collar & (gx < 822)
M_BcLow = M_B | M_band
remove = M_G_low | M_F | M_BcLow


def dil(mask, k):
    return np.array(Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(k))) > 127


near_removed = dil(remove, 7)
hue_ok = (r >= g) & (g >= b) & (sat > 0.07) & (sat < 0.3) & (mx > 0.78)
garment_g = hue_ok & (alpha0 > 200) & (gx < 780) & ~near_removed             # his cream sherwani
bride_known = (alpha0 > 200) & ~near_removed & (gx >= 801) & ~jas2 & ~ros2   # her sleeve / saree / skin

# where the removed pixels sat ON a body (a strand hanging in the air beside it must stay transparent)
sil = (alpha0 > 200) & ~remove
sil_d = dil(sil, 15)
inside = (M_G_low & sil_d) | (M_F & (gx < 745)) | (M_BcLow & sil_d & (gx >= 801)) | (M_B & (gx >= 806))
body_img = np.array(body(remove, inside))
cream_fill = diffuse(S[..., :3], garment_g, iters=450)
bride_fill = diffuse(S[..., :3], bride_known, iters=450)
paint_g = (M_G_low | M_F) & inside & (gx < 781)
paint_b = M_BcLow & inside & (gx >= 781)
body_img[..., :3] = np.where(paint_g[..., None], cream_fill, body_img[..., :3]).astype("uint8")
body_img[..., :3] = np.where(paint_b[..., None], bride_fill, body_img[..., :3]).astype("uint8")

ghost = (alpha0 < 170) & ~remove & (gx >= 765) & (gx < 805)      # faint haze between the two people
body_img[..., 3] = np.where(ghost, 0, body_img[..., 3])

parts = {
    "gx-body": Image.fromarray(body_img),
    "gx-groom-arm": layer(M_F, 0.6),
    "gx-garland": layer(M_G_low, 0.6),
    "gx-strand": layer(M_BcLow, 0.6),
}

for name, im in parts.items():
    im = im.resize((W * SCALE, H * SCALE), Image.LANCZOS)
    p = os.path.join(OUT, name + ".webp")
    im.save(p, "WEBP", quality=92, method=6)
    print(name, im.size, os.path.getsize(p) // 1024, "KB")

pct = lambda x, y: (round((x - X0) / W * 100, 1), round((y - Y0) / H * 100, 1))
rig = {"canvas": [W * SCALE, H * SCALE], "aspect": W / H, "elbow": pct(*ELBOW), "hands": pct(*HANDS),
       "strandTop": pct(797, 611), "garlandTop": pct(738, 588)}
print(json.dumps(rig))
json.dump(rig, open(os.path.join(OUT, "garland-rig.json"), "w"))


# the site only needs the untouched garlanded pose: composite the pieces back together and drop the parts
final = Image.open(os.path.join(OUT, "gx-body.webp")).convert("RGBA")
for n in ("gx-strand", "gx-groom-arm", "gx-garland"):
    final = Image.alpha_composite(final, Image.open(os.path.join(OUT, n + ".webp")).convert("RGBA"))
final.save(os.path.join(OUT, "gx-final.webp"), "WEBP", quality=92, method=6)
for n in ("gx-body", "gx-strand", "gx-groom-arm", "gx-garland", "garland-rig"):
    for ext in (".webp", ".json"):
        f = os.path.join(OUT, n + ext)
        if os.path.exists(f):
            os.remove(f)

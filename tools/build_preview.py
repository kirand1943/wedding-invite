"""Link-preview image (Open Graph) for WhatsApp / Instagram / iMessage: site/assets/og-image.jpg, 1200x630.
Needs the Cormorant Garamond + Jost fonts (Google Fonts). Set FONTS to the folder that holds
CormorantGaramond-Italic[wght].ttf, CormorantGaramond[wght].ttf and Jost[wght].ttf (or edit the paths below)."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.environ.get("FONTS", "/tmp/fonts")
A = os.path.join(ROOT, "site", "assets")
W, H = 1200, 630


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


# background: the beach / palace plate, soft and warm
plate = Image.open(os.path.join(A, "plate-a.webp")).convert("RGB")
scale = W / plate.width
plate = plate.resize((W, int(plate.height * scale)), Image.LANCZOS)
top = int(plate.height * 0.43)
bg = plate.crop((0, top, W, top + H)).filter(ImageFilter.GaussianBlur(1.2))

# cream veil that fades from the left (text side) to clear on the right
veil = Image.new("RGBA", (W, H), (0, 0, 0, 0))
px = veil.load()
for x in range(W):
    t = min(1.0, max(0.0, (x - 380) / 520))               # 0 on the left .. 1 on the right
    a = int(238 * (1 - t) + 30 * t)
    for y in range(H):
        px[x, y] = (250, 243, 230, a)
bg = Image.alpha_composite(bg.convert("RGBA"), veil)

# the couple
couple = Image.open(os.path.join(A, "couple", "gx-final.webp")).convert("RGBA")
ch = 560
couple = couple.resize((int(couple.width * ch / couple.height), ch), Image.LANCZOS)
shadow = Image.new("RGBA", (couple.width + 80, couple.height + 80), (0, 0, 0, 0))
shadow.paste((60, 40, 20, 120), (40, 52), couple.split()[3])
shadow = shadow.filter(ImageFilter.GaussianBlur(14))
cx, cy = 820, H - ch - 14
bg.alpha_composite(shadow, (cx - 40, cy - 40))
bg.alpha_composite(couple, (cx, cy))

d = ImageDraw.Draw(bg)
gold, ink = (176, 141, 79), (58, 36, 40)


def centered(text, f, y, fill, x0=70, x1=760, spacing=0):
    w = d.textlength(text, font=f)
    d.text((x0 + (x1 - x0 - w) / 2, y), text, font=f, fill=fill)


centered("TOGETHER WITH OUR FAMILIES", font("jost.ttf", 22, 400), 118, gold)
centered("WE INVITE YOU TO OUR WEDDING", font("jost.ttf", 22, 400), 150, gold)
centered("Kiran", font("cg-italic.ttf", 118, 500), 190, ink)
centered("weds", font("cg-italic.ttf", 48, 400), 312, gold)
centered("Rutuja", font("cg-italic.ttf", 118, 500), 350, ink)
d.line((255, 508, 575, 508), fill=gold, width=2)
centered("14 DECEMBER 2026", font("jost.ttf", 30, 400), 528, ink)

bg.convert("RGB").save(os.path.join(A, "og-image.jpg"), "JPEG", quality=86, optimize=True, progressive=True)
print("og-image.jpg", os.path.getsize(os.path.join(A, "og-image.jpg")) // 1024, "KB")

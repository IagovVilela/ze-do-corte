from PIL import Image
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "images" / "barbernegon_logo_concept_b.png"
im = Image.open(src).convert("RGBA")
w, h = im.size
print("size", w, h)
pixels = im.load()


def is_content(r: int, g: int, b: int, a: int) -> bool:
    if a < 10:
        return False
    if r < 18 and g < 18 and b < 18:
        return False
    return True


xs: list[int] = []
ys: list[int] = []
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if is_content(r, g, b, a):
            xs.append(x)
            ys.append(y)

if not xs:
    raise SystemExit("no content found")

minx, maxx = min(xs), max(xs)
miny, maxy = min(ys), max(ys)
print("bbox", minx, miny, maxx, maxy, "dims", maxx - minx + 1, maxy - miny + 1)

pad = 8
minx = max(0, minx - pad)
miny = max(0, miny - pad)
maxx = min(w - 1, maxx + pad)
maxy = min(h - 1, maxy + pad)

cx = (minx + maxx) / 2
cy = (miny + maxy) / 2
side = max(maxx - minx + 1, maxy - miny + 1)
half = side / 2
left = int(round(cx - half))
top = int(round(cy - half))
right = left + side
bottom = top + side
left = max(0, left)
top = max(0, top)
right = min(w, right)
bottom = min(h, bottom)

cropped = im.crop((left, top, right, bottom))
cw, ch = cropped.size
side2 = max(cw, ch)
square = Image.new("RGBA", (side2, side2), (0, 0, 0, 0))
square.paste(cropped, ((side2 - cw) // 2, (side2 - ch) // 2))

# Circular mask: keep black inside seal, transparent outside
final = Image.new("RGBA", (side2, side2), (0, 0, 0, 0))
srcpx = square.load()
dstpx = final.load()
cx2 = cy2 = side2 / 2
radius = side2 / 2 - 1
for y in range(side2):
    for x in range(side2):
        dx = x + 0.5 - cx2
        dy = y + 0.5 - cy2
        dist = (dx * dx + dy * dy) ** 0.5
        r, g, b, a = srcpx[x, y]
        if dist <= radius - 0.5:
            dstpx[x, y] = (r, g, b, a)
        elif dist < radius + 0.5:
            alpha = max(0.0, min(1.0, radius + 0.5 - dist))
            dstpx[x, y] = (r, g, b, int(a * alpha))

out_public = root / "public" / "images" / "barbernegon-logo.png"
out_icon = root / "src" / "app" / "icon.png"
final.save(out_public, "PNG")
final.save(out_icon, "PNG")
print("saved", out_public, final.size)

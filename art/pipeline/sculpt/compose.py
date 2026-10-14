"""Review composites for a sculpt part (Windows or WSL Python with Pillow).

    python compose.py pair <left.png> <right.png> <out.png> "<left label>" "<right label>" [--crop-right x0,y0,x1,y1] [--crop-left ...]
    python compose.py strip <out.png> <img1> "<caption1>" <img2> "<caption2"> [...]

pair: both images scaled to the same height, side by side, a label bar over each.
strip: images in order, each scaled to one height, a caption under each.
"""

import sys

from PIL import Image, ImageDraw, ImageFont

H = 768
BG = (24, 24, 24)
FG = (235, 235, 235)


def font(size=22):
    for name in ("arial.ttf", "DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def load(path, crop=None, h=H):
    im = Image.open(path).convert("RGB")
    if crop:
        im = im.crop(crop)
    w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS)


def pair(left, right, out, ll, rl, crop_left=None, crop_right=None):
    a, b = load(left, crop_left), load(right, crop_right)
    bar = 40
    canvas = Image.new("RGB", (a.width + b.width + 12, H + bar), BG)
    canvas.paste(a, (0, bar))
    canvas.paste(b, (a.width + 12, bar))
    d = ImageDraw.Draw(canvas)
    f = font()
    d.text((10, 8), ll, fill=FG, font=f)
    d.text((a.width + 22, 8), rl, fill=FG, font=f)
    canvas.save(out)


def strip(out, items, h=512):
    ims = [(load(p, h=h), c) for p, c in items]
    cap = 44
    canvas = Image.new("RGB", (sum(i.width for i, _ in ims) + 12 * (len(ims) - 1), h + cap), BG)
    d = ImageDraw.Draw(canvas)
    f = font(19)
    x = 0
    for im, c in ims:
        canvas.paste(im, (x, 0))
        d.text((x + 8, h + 10), c, fill=FG, font=f)
        x += im.width + 12
    canvas.save(out)


def _box(s):
    return tuple(int(v) for v in s.split(",")) if s else None


if __name__ == "__main__":
    args = sys.argv[1:]
    opts = {}
    for k in ("--crop-left", "--crop-right"):
        if k in args:
            i = args.index(k)
            opts[k] = _box(args[i + 1])
            del args[i:i + 2]
    if args[0] == "pair":
        pair(args[1], args[2], args[3], args[4], args[5], opts.get("--crop-left"), opts.get("--crop-right"))
    elif args[0] == "strip":
        rest = args[2:]
        strip(args[1], list(zip(rest[0::2], rest[1::2])))

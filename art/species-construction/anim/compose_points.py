"""Per-point before/after crops for a rig pass: the same frame of two (or more) clips at one fixed framing, side by
side, cropped to the region a review point is about, with the reviewer's words on top.

  python art/species-construction/anim/compose_points.py <points json> <out dir>

points json: {"columns": [{"label": "...", "dirs": {"<clip>": "<frames dir>"}}, ...],
              "points": [{"name": "point-1", "text": "...", "rows": [{"clip": "<clip>", "view": "side", "frame": 24,
                          "crop": [x0, y0, x1, y1] or null, "label": "..."}], "refs": ["<png>", ...]}]}
Each row puts that frame of every column next to each other (crop scaled to 640 px tall); refs go in a last row.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:
    F = ImageFont.truetype('arial.ttf', 24)
    FS = ImageFont.truetype('arial.ttf', 19)
    FB = ImageFont.truetype('arialbd.ttf', 28)
except OSError:
    F = FS = FB = ImageFont.load_default()
BG, DARK = (245, 245, 245), (20, 20, 20)
H = 640


def wrap(text, w, font):
    lines = []
    for para in text.split('\n'):
        cur = ''
        for wd in para.split():
            t = (cur+' '+wd).strip()
            if font.getlength(t) > w-16 and cur:
                lines.append(cur)
                cur = wd
            else:
                cur = t
        lines.append(cur)
    return lines


def fit(im, h):
    return im.resize((max(1, int(im.width*h/im.height)), h), Image.LANCZOS)


def frame(col, row):
    d = Path(col['dirs'][row['clip']])
    f = d/row['view']/f"{row['frame']:04d}.png" if row.get('view') else d
    im = Image.open(f).convert('RGB')
    return im.crop(tuple(row['crop'])) if row.get('crop') else im


def main():
    spec = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    cols = spec['columns']
    for pt in spec['points']:
        rows = []
        for row in pt['rows']:
            ims = [fit(frame(c, row), H) for c in cols if row['clip'] in c['dirs']]
            labs = [c['label'] for c in cols if row['clip'] in c['dirs']]
            rows.append((row.get('label', ''), ims, labs))
        refs = [fit(Image.open(r).convert('RGB'), 420) for r in pt.get('refs', [])]
        W = max(max(sum(i.width for i in ims)+12*(len(ims)-1) for _, ims, _ in rows), 1400)
        tl = wrap(pt['text'], W, F)
        hgt = 20+30*len(tl)+sum(40+H+34 for _ in rows)+((460+30) if refs else 0)
        sheet = Image.new('RGB', (W, hgt), BG)
        d = ImageDraw.Draw(sheet)
        y = 10
        for l in tl:
            d.text((10, y), l, fill=DARK, font=F)
            y += 30
        for lab, ims, labs in rows:
            y += 8
            d.text((10, y), lab, fill=DARK, font=FB)
            y += 32
            x = 0
            for im, cl in zip(ims, labs):
                sheet.paste(im, (x, y))
                d.text((x+8, y+H+6), cl, fill=DARK, font=FS)
                x += im.width+12
            y += H+34
        if refs:
            d.text((10, y), 'References (anim/ref, untracked)', fill=DARK, font=FS)
            y += 26
            x = 0
            for r in refs:
                if x+r.width > W:
                    break
                sheet.paste(r, (x, y))
                x += r.width+10
        sheet.save(out/f"{pt['name']}.png")
        print('wrote', out/f"{pt['name']}.png", sheet.size)


if __name__ == '__main__':
    main()

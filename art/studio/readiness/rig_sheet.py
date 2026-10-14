"""Side-by-side sheet of rig test arms (art/studio/readiness/rig_test.py outputs).

    python art/studio/readiness/rig_sheet.py --arms <out dir> [<out dir> ...] --view threequarter \
        --rows rest,stride,crouch,look [--kind clay|distort|bones|bleed] --out <sheet.jpg>

Renders are transparent; the sheet puts them on white. --kind bones shows each arm's skeleton over a faded
skin. Each column is labeled with the arm's label and each row with its pose and the arm's numbers for it.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CELL = 520


def font(size):
    for name in ('arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def on_white(path, fade=1.0):
    im = Image.open(path).convert('RGBA')
    if fade < 1:
        a = im.getchannel('A').point(lambda v: int(v*fade))
        im.putalpha(a)
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im)


def cell(arm, row, view, kind):
    r = arm/'renders'
    if kind == 'bones':
        base = on_white(r/f'rest-{view}.png', 0.35)
        sticks = Image.open(r/f'bones-{view}.png').convert('RGBA')
        return Image.alpha_composite(base, sticks).convert('RGB')
    if kind == 'bleed':
        return on_white(r/f'bleed-{view}.png').convert('RGB')
    name = f'{row}-{view}.png' if kind == 'clay' or row == 'rest' else f'{row}-distort-{view}.png'
    return on_white(r/name).convert('RGB')


def caption(m, row, kind):
    if kind == 'bleed':
        return f"vertices on two limbs: {m['bleedVertices']} ({100*m['bleedShare']:.1f}%)"
    if kind == 'bones':
        out = m['jointsOutsideSkin']
        return f"joints outside skin: {len(out)}"
    if row == 'rest':
        return f"{m['faces']} faces, {m['retopo']} remesh"
    p = m['poses'][row]
    return (f"crushed {100*p['crushedShare']:.2f}%  stretched {100*p['stretchedShare']:.2f}%  "
            f"new intersections {p['newIntersectingPairs']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--arms', type=Path, nargs='+', required=True)
    ap.add_argument('--view', default='threequarter')
    ap.add_argument('--rows', default='rest,stride,crouch,look')
    ap.add_argument('--kind', default='clay', choices=['clay', 'distort', 'bones', 'bleed'])
    ap.add_argument('--title', default='')
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    rows = a.rows.split(',') if a.kind not in ('bones', 'bleed') else [a.kind]
    metrics = [json.loads((arm/'metrics.json').read_text()) for arm in a.arms]
    head, cap = 70 if a.title else 0, 34
    W = CELL*len(a.arms)
    H = head+40+len(rows)*(CELL+cap)
    sheet = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(sheet)
    if a.title:
        d.text((16, 18), a.title, fill=(20, 20, 20), font=font(30))
    for c, (arm, m) in enumerate(zip(a.arms, metrics)):
        d.text((c*CELL+12, head+8), m['label'], fill=(20, 20, 20), font=font(20))
        for r, row in enumerate(rows):
            y = head+40+r*(CELL+cap)
            im = cell(arm, row, a.view, a.kind).resize((CELL, CELL), Image.LANCZOS)
            sheet.paste(im, (c*CELL, y))
            d.text((c*CELL+12, y+6), row if a.kind in ('clay', 'distort') else a.kind, fill=(60, 60, 60), font=font(22))
            d.text((c*CELL+12, y+CELL+6), caption(m, row, a.kind), fill=(20, 20, 20), font=font(18))
    for c in range(1, len(a.arms)):
        d.line([(c*CELL, head), (c*CELL, H)], fill=(180, 180, 180), width=2)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out, quality=88)
    print('wrote', a.out)


if __name__ == '__main__':
    main()

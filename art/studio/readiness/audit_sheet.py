"""Deformation audit sheets: one picture per pose, eight cameras across, three looks down (clay, curvature, flags).

    python art/studio/readiness/audit_sheet.py --run <rig_test --audit out dir> [--cell 420] [--out <dir>]

Renders are transparent; cells go on a light ground. The flags row shows crushed faces blue, stretched amber,
self-intersecting near black (rig_test.py flag_colors). The caption carries the pose's numbers and any
plausibility-limit violations, so the orchestrator and the independent critic read the same evidence.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

VIEWS = ['side', 'threequarter', 'front', 'threequarter-right', 'side-right', 'rear-threequarter', 'back', 'top']
LOOKS = [('clay', '{pose}-{view}.png'), ('curvature', '{pose}-curvature-{view}.png'), ('flags', '{pose}-distort-{view}.png')]


def font(size):
    for name in ('arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--run', type=Path, required=True)
    ap.add_argument('--cell', type=int, default=420)
    ap.add_argument('--out', type=Path)
    a = ap.parse_args()
    m = json.loads((a.run/'metrics.json').read_text())
    out = a.out or a.run/'audit'
    out.mkdir(parents=True, exist_ok=True)
    C = a.cell
    for pose in ['rest', *m['poses'].keys()]:
        W, H = C*len(VIEWS), 90+len(LOOKS)*(C+8)
        sheet = Image.new('RGB', (W, H), (255, 255, 255))
        d = ImageDraw.Draw(sheet)
        if pose == 'rest':
            cap = f"rest  |  {m['label']}"
        else:
            p = m['poses'][pose]
            cap = (f"{pose}  |  crushed {100*p['crushedShare']:.2f}%  stretched {100*p['stretchedShare']:.2f}%  "
                   f"new self-intersections {p['newIntersectingPairs']}  |  limit violations "
                   f"{len(p.get('limitViolations', []))}  |  {m['label']}")
        d.text((12, 12), cap, fill=(20, 20, 20), font=font(26))
        d.text((12, 50), 'rows: clay, curvature (ridges light, creases dark), flags (crushed blue, stretched amber, '
                         'self-intersecting black)', fill=(90, 90, 90), font=font(18))
        for r, (look, pat) in enumerate(LOOKS):
            for c, view in enumerate(VIEWS):
                if pose == 'rest' and look == 'flags':
                    continue
                f = a.run/'renders'/pat.format(pose=pose, view=view)
                if not f.is_file():
                    continue
                im = Image.open(f).convert('RGBA')
                bg = Image.new('RGBA', im.size, (240, 240, 238, 255))
                cell = Image.alpha_composite(bg, im).convert('RGB').resize((C, C), Image.LANCZOS)
                sheet.paste(cell, (c*C, 90+r*(C+8)))
                if r == 0:
                    d.text((c*C+6, 92), view, fill=(60, 60, 60), font=font(16))
        sheet.save(out/f'{pose}.jpg', quality=88)
        print('wrote', out/f'{pose}.jpg')


if __name__ == '__main__':
    main()

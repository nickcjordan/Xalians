"""Akinza game mesh pass 1: the comparison sheet (source skin against the game mesh, rest and the deepest Night Stalk
frame, side and three-quarter), from gamemesh_compare.py's 720 px shots.

  python art/species-construction/anim/gamemesh_sheet.py <compare dir> <out.png> [--deep-frame N]

Columns: source skin (clay, posed as the sprites pose it), game mesh (clay, posed as the glb plays it), game mesh with
its baked maps. Rows: rest side, rest three-quarter, crouch side, crouch three-quarter. Labels in plain text.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for f in ('arial.ttf', 'DejaVuSans.ttf', 'segoeui.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('compare', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('--deep-frame', type=int, default=18)
    a = p.parse_args()
    cols = [('source-clay', 'source skin (sprite pose)'), ('game-clay', 'game mesh (glb pose), clay'), ('game-look', 'game mesh, baked maps')]
    rows = [('rest', 'side', 'rest, side'), ('rest', 'three_quarter', 'rest, three-quarter'),
            ('crouch', 'side', f'Night Stalk frame {a.deep_frame}, side'), ('crouch', 'three_quarter', f'Night Stalk frame {a.deep_frame}, three-quarter')]
    cell = 720
    head, left = 56, 330
    W, H = left+cell*len(cols), head+cell*len(rows)
    sheet = Image.new('RGB', (W, H), (24, 26, 30))
    d = ImageDraw.Draw(sheet)
    f = font(26)
    for j, (_, label) in enumerate(cols):
        d.text((left+j*cell+16, 14), label, fill=(232, 234, 238), font=f)
    for i, (pose, view, label) in enumerate(rows):
        d.text((16, head+i*cell+cell//2-14), label, fill=(232, 234, 238), font=font(19))
        for j, (var, _) in enumerate(cols):
            im = Image.open(a.compare/'shots'/f'{pose}-{view}-{var}.png').convert('RGB').resize((cell, cell))
            sheet.paste(im, (left+j*cell, head+i*cell))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out)
    print('SHEET', a.out, sheet.size)


if __name__ == '__main__':
    main()

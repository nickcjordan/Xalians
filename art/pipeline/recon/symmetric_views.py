"""Symmetric conditioning views for a bilaterally symmetric creature.

    <shape-env python> art/pipeline/recon/symmetric_views.py --masks <masks dir> --front-midline 573
        [--body-midline 597 --blend-rows 420,560]

front_sym.rgba.png: the front view's image-left half (the creature's right side) mirrored about a vertical
midline, so the turned body of the source front view no longer reads as width. The head and the body are
turned against each other in the source, so the midline is per row: --front-midline for the head (measured
from the mask: the head spans x 496 to 651 on rows 310 to 330, horn tips at 379 and 762) and --body-midline
below (the gap between the forelegs: x 572 to 622 on rows 720 to 880), blended linearly over --blend-rows.
right.rgba.png: the side (left) view mirrored horizontally, standing in for the creature's right side.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--masks', type=Path, required=True)
    ap.add_argument('--front-midline', type=int, required=True)
    ap.add_argument('--body-midline', type=int, default=None)
    ap.add_argument('--blend-rows', default='420,560')
    args = ap.parse_args()
    r0, r1 = (int(x) for x in args.blend_rows.split(','))
    front = np.asarray(Image.open(args.masks / 'front.rgba.png').convert('RGBA')).copy()
    src_img = front.copy()
    h, w, _ = front.shape
    head_cx = args.front_midline
    body_cx = args.body_midline if args.body_midline is not None else head_cx
    for y in range(h):
        u = min(1.0, max(0.0, (y - r0) / max(1, r1 - r0)))
        cx = head_cx + (body_cx - head_cx) * u
        for x in range(int(cx), w):
            src = int(round(2 * cx - x))
            front[y, x] = src_img[y, src] if 0 <= src < w else 0
    Image.fromarray(front, 'RGBA').save(args.masks / 'front_sym.rgba.png')
    side = Image.open(args.masks / 'side.rgba.png').convert('RGBA')
    side.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(args.masks / 'right.rgba.png')
    rec = {'frontMidline': head_cx, 'bodyMidline': body_cx, 'blendRows': [r0, r1],
           'front_sym': {'from': 'front.rgba.png', 'sha256': sha(args.masks / 'front_sym.rgba.png')},
           'right': {'from': 'side.rgba.png mirrored', 'sha256': sha(args.masks / 'right.rgba.png')}}
    (args.masks / 'symmetric_views.json').write_text(json.dumps(rec, indent=1), encoding='utf-8')
    print(json.dumps(rec, indent=1))


if __name__ == '__main__':
    main()

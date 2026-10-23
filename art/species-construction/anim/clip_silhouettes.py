"""Silhouette extents and onion skins from rendered clay clip frames (PIL and numpy, no Blender). Numbers only.

  python art/species-construction/anim/clip_silhouettes.py <frames dir> <out dir> [--spec <clips-spec.json>]

<frames dir>/<clip>/<view>/NNNN.png (clip_frames.py, clay look). The figure is every pixel that differs from the
plain world colour (sampled in the top-left corner) by more than 6 levels. Per frame and view: the silhouette's top,
bottom, front (smallest x, the creature faces left) and back (largest x), the top of the figure in the front third
of its width (head and ears), and the area. Onion skins (two or more frames' silhouette outlines on one image,
earliest blue, latest amber, the in-between ones stepping in luminance; frame numbers in the legend):
  idle breath empty against full (0, 19), the weight shift's forward and back peaks (22, 67), the ear flick (52 to 59),
  the loop seam (89, 0, 1); Night Stalk anticipation (0, 4), descent (6 to 16), the hold breath (16, 24, 36), the
  tail-tip twitch (26, 28, 33), the rise (37 to 44), and frame 17 against 31.
Writes <out>/silhouettes.json and <out>/onion-*.png (side and sprite; the sprite onions scaled up 3x nearest).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

frames, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)


def mask(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    bg = a[2, 2]
    return np.abs(a-bg).max(2) > 6


def extents(m):
    ys, xs = np.nonzero(m)
    if not len(xs):
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    front = xs < x0+(x1-x0)/3
    return dict(top=int(ys.min()), bottom=int(ys.max()), front=x0, back=x1, area=int(m.sum()),
                head_top_front_third=int(ys[front].min()))


res = {}
for clip in ('idle', 'stalk'):
    for view in ('side', 'sprite'):
        d = frames/clip/view
        if not d.exists():
            continue
        res[f'{clip}/{view}'] = {int(p.stem): extents(mask(p)) for p in sorted(d.glob('[0-9][0-9][0-9][0-9].png'))}

ONIONS = {'idle': {'breath-0-19': [0, 19], 'shift-22-67': [22, 67], 'flick-52-59': list(range(52, 60)), 'seam-89-0-1': [89, 0, 1]},
          'stalk': {'anticip-0-4': [0, 4], 'descent-6-16': list(range(6, 17, 2)), 'hold-breath-16-24-36': [16, 24, 36],
                    'twitch-26-28-33': [26, 28, 33], 'rise-37-44': list(range(37, 45)), 'f17-vs-f31': [17, 31]}}
BLUE, AMBER = np.array([70, 140, 255]), np.array([255, 176, 40])


def outline(m):
    e = m.copy()
    e[1:-1, 1:-1] = m[1:-1, 1:-1] & ~(m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:])
    return e


def font(size):
    for f in ('C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


for clip, sets in ONIONS.items():
    for view in ('side', 'sprite'):
        d = frames/clip/view
        if not d.exists():
            continue
        for name, fs in sets.items():
            ms = [mask(d/f'{f:04d}.png') for f in fs]
            H, W = ms[0].shape
            img = np.full((H, W, 3), 18, np.uint8)
            for i, m in enumerate(ms):
                t = i/max(1, len(ms)-1)
                col = (BLUE*(1-t)+AMBER*t).astype(np.uint8)
                img[outline(m)] = col
            im = Image.fromarray(img)
            if view == 'sprite':
                im = im.resize((W*3, H*3), Image.NEAREST)
            dr = ImageDraw.Draw(im)
            dr.text((8, 6), f'{clip} {view} onion: frames {fs} (first blue, last amber)', fill=(235, 235, 235), font=font(16))
            im.save(out/f'onion-{clip}-{view}-{name}.png')
(out/'silhouettes.json').write_text(json.dumps(res, indent=0))


def span(clip, view, key, fs):
    v = [res[f'{clip}/{view}'][f][key] for f in fs if f in res.get(f'{clip}/{view}', {})]
    return [min(v), max(v)] if v else None


summ = {}
for view in ('side', 'sprite'):
    if f'idle/{view}' not in res:
        continue
    summ[view] = dict(
        idle_top_range=span('idle', view, 'top', range(90)), idle_front_range=span('idle', view, 'front', range(90)),
        idle_head_top_front_third_range=span('idle', view, 'head_top_front_third', range(90)),
        stalk_top_per_frame={f: res[f'stalk/{view}'][f]['top'] for f in sorted(res[f'stalk/{view}'])},
        stalk_front_per_frame={f: res[f'stalk/{view}'][f]['front'] for f in sorted(res[f'stalk/{view}'])})
(out/'silhouettes-summary.json').write_text(json.dumps(summ, indent=1))
print('SILHOUETTES_DONE', json.dumps({v: {k: x for k, x in s.items() if 'range' in k} for v, s in summ.items()}))

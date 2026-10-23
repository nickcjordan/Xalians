"""Silhouette extents and onion skins from rendered clay clip frames (PIL and numpy, no Blender). Numbers only.

  python art/species-construction/anim/clip_silhouettes.py <frames dir> <out dir> [--spec <clips-spec.json>]

<frames dir>/<clip>/<view>/NNNN.png (clip_frames.py, clay look). The figure is every pixel that differs from the
plain world colour (sampled in the top-left corner) by more than 6 levels. Per frame and view: the silhouette's top,
bottom, front (smallest x, the creature faces left) and back (largest x), the top of the figure in the front third
of its width (head and ears), and the area. Onion skins (two or more frames' silhouette outlines on one image,
earliest blue, latest amber, the in-between ones stepping in luminance; frame numbers in the legend):
  idle breath empty against full (0, 19), the weight shift's forward and back peaks (22, 67), the ear flick (52 to 60),
  the loop seam (89, 0, 1); Night Stalk (pass 3 timing) anticipation (0, 3), descent (4 to 18), the sink's end
  (14 to 18), the hold breath (18, 24, 31), the tail-tip twitch (25, 27, 30), the rise (31 to 44) and its start
  (31 to 35), and frame 19 against 30. Also the changed pixels from each frame to the next (channel sum above 30).
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


res, diff = {}, {}
for clip in ('idle', 'stalk'):
    for view in ('side', 'sprite'):
        d = frames/clip/view
        if not d.exists():
            continue
        fs = sorted(d.glob('[0-9][0-9][0-9][0-9].png'))
        res[f'{clip}/{view}'] = {int(p.stem): extents(mask(p)) for p in fs}
        # changed pixels from each frame to the next (any channel sum above 30, the critic's measure); idle wraps 89 -> 0
        ims = [np.asarray(Image.open(p).convert('RGB')).astype(np.int16) for p in fs]
        if clip == 'idle':
            ims.append(ims[0])
        diff[f'{clip}/{view}'] = [int((np.abs(ims[i+1]-ims[i]).sum(2) > 30).sum()) for i in range(len(ims)-1)]

ONIONS = {'idle': {'breath-0-19': [0, 19], 'shift-22-67': [22, 67], 'flick-52-60': list(range(52, 61)), 'seam-89-0-1': [89, 0, 1]},
          'stalk': {'anticip-0-3': [0, 3], 'descent-4-18': list(range(4, 19, 2)), 'sink-end-14-18': list(range(14, 19)),
                    'hold-breath-18-24-31': [18, 24, 31], 'twitch-25-27-30': [25, 27, 30], 'rise-31-44': list(range(31, 45, 2)),
                    'rise-start-31-35': list(range(31, 36)), 'f19-vs-f30': [19, 30]}}
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
    if f'idle/{view}' not in res or f'stalk/{view}' not in res:
        continue
    summ[view] = dict(
        idle_top_range=span('idle', view, 'top', range(90)), idle_front_range=span('idle', view, 'front', range(90)),
        idle_head_top_front_third_range=span('idle', view, 'head_top_front_third', range(90)),
        stalk_top_per_frame={f: res[f'stalk/{view}'][f]['top'] for f in sorted(res[f'stalk/{view}'])},
        stalk_front_per_frame={f: res[f'stalk/{view}'][f]['front'] for f in sorted(res[f'stalk/{view}'])})
for k, v in diff.items():
    med = float(np.median(v))
    summ.setdefault('frameChangePx', {})[k] = dict(median=med, max=max(v), argmax=int(np.argmax(v)), perStep=v,
                                                    maxOverMedian=round(max(v)/med, 2) if med else None)
    if k.startswith('idle'):
        fl = v[51:60]
        summ['frameChangePx'][k]['flick_51_60'] = fl
        summ['frameChangePx'][k]['flickMaxOverMedian'] = round(max(fl)/med, 2) if med else None
(out/'silhouettes-summary.json').write_text(json.dumps(summ, indent=1))
print('SILHOUETTES_DONE', json.dumps({v: {k: x for k, x in s.items() if 'range' in k} for v, s in summ.items() if v != 'frameChangePx'}),
      json.dumps({k: {x: y for x, y in v.items() if x != 'perStep'} for k, v in summ.get('frameChangePx', {}).items()}))

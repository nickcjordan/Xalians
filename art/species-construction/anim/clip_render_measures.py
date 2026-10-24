"""Measurements read from the rendered clip frames (PIL and numpy, no Blender). Numbers only.

  python art/species-construction/anim/clip_render_measures.py <clips dir> [--before <earlier clips dir>]

<clips dir> holds bake/measure.json (clip_measure.py) and frames/clay, frames/fur (Night Stalk) and frames/fur-idle (idle),
each <clip>/<view>/NNNN.png. Writes <clips dir>/measure/render-measures.json and overlay images:
- ear flick (idle 50 to 60): the near ear's visible angle in the side render, the line from the ear's base ring to its
  visible tip (the blade's skin point projected farthest from the base) against its frame-0 line, drawn over the
  render in measure/ear-angle-<look>-side-50-60.png so the line can be checked against the picture; degrees, positive
  = back (also the same angle to the ear's tip joint);
- outline change (sprite, clay and fur): pixels whose figure-or-background state flips from each frame to the next
  (figure = more than 30 summed levels from the background); the sink's (5 to 18) and the recovery's (29 to 44) largest;
- the gap between the two lower tails (fur and clay sprite, idle): a frame has a gap when a background pixel lies on the
  middle 70 percent of the line between the middle and lower tails' joint j3, j4 or tip; the fraction of frames;
- fur shimmer (idle, both views): where clay changes by at most 2 levels from frame to frame ("still"), the share of fur
  figure pixels that change by more than 12 levels (largest channel), each frame to the next; also clay's own share.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('clips', type=Path)
p.add_argument('--before', type=Path, default=None, help='an earlier clips dir to measure the same way, for comparison')
p.add_argument('--before-measure', type=Path, default=None, help='the measure.json to use for --before (one with the ear and tail joints)')
a = p.parse_args()


def ld(f):
    return np.asarray(Image.open(f).convert('RGB')).astype(np.int16)


def figure(im):
    return np.abs(im-im[2, 2]).sum(2) > 30


def frames(d):
    return sorted(Path(d).glob('[0-9][0-9][0-9][0-9].png'))


def measure(C, mpath=None, overlays=True):
    out = {}
    m = json.loads((mpath or C/'bake'/'measure.json').read_text())

    def ang(r, cam, tip='ear_visible_tip'):
        b, t = np.array(r[cam]['ear_base']), np.array(r[cam][tip])
        v = t-b
        return math.degrees(math.atan2(v[0], -v[1]))
    for cam in ('side', 'sprite'):
        for tip, name in (('ear_visible_tip', 'visible_tip'), ('ear_tip', 'tip_joint')):
            if tip not in m['idle'][0][cam]:
                continue
            a0 = ang(m['idle'][0], cam, tip)
            out[f'ear_flick_deg_{name}_{cam}'] = {f: round(ang(m['idle'][f], cam, tip)-a0, 1) for f in range(50, 61)}
    # overlay on the side renders (clay and fur)
    for look, d in (('clay', C/'frames/clay/idle/side'), ('fur', C/'frames/fur-idle/idle/side')):
        if not d.exists() or not overlays:
            continue
        tiles = []
        for f in range(50, 61):
            im = Image.open(d/f'{f:04d}.png').convert('RGB')
            dr = ImageDraw.Draw(im)
            r = m['idle'][f]['side']
            r0 = m['idle'][0]['side']
            dr.line([tuple(r0['ear_base']), tuple(r0['ear_visible_tip'])], fill=(120, 120, 120), width=1)
            dr.line([tuple(r['ear_base']), tuple(r['ear_visible_tip'])], fill=(255, 170, 0), width=2)
            x0, y0 = int(r0['ear_base'][0]), int(r0['ear_base'][1])
            crop = im.crop((x0-110, y0-150, x0+130, y0+60))
            ImageDraw.Draw(crop).text((4, 4), f'f{f} {out["ear_flick_deg_visible_tip_side"][f]:+.1f} deg', fill=(20, 20, 20))
            tiles.append(crop)
        sheet = Image.new('RGB', (240*len(tiles), 210), (255, 255, 255))
        for i, t in enumerate(tiles):
            sheet.paste(t, (240*i, 0))
        (C/'measure').mkdir(exist_ok=True)
        sheet.save(C/'measure'/f'ear-angle-{look}-side-50-60.png')
    # outline change, sprite
    for look, sd, idir in (('clay', C/'frames/clay/stalk/sprite', C/'frames/clay/idle/sprite'),
                           ('fur', C/'frames/fur/stalk/sprite', C/'frames/fur-idle/idle/sprite')):
        if sd.exists():
            M = [figure(ld(f)) for f in frames(sd)]
            ch = [0]+[int((M[i] ^ M[i-1]).sum()) for i in range(1, len(M))]
            out[f'stalk_outline_change_sprite_{look}'] = ch
            out[f'stalk_outline_change_sprite_{look}_sink_max'] = max(ch[5:19])
            out[f'stalk_outline_change_sprite_{look}_recovery_max'] = max(ch[29:45])
            out[f'stalk_outline_change_sprite_{look}_recovery_argmax'] = 29+int(np.argmax(ch[29:45]))
        if idir.exists():
            M = [figure(ld(f)) for f in frames(idir)]
            M.append(M[0])
            ch = [int((M[i+1] ^ M[i]).sum()) for i in range(len(M)-1)]
            out[f'idle_outline_change_sprite_{look}'] = dict(median=float(np.median(ch)), max=max(ch), argmax=int(np.argmax(ch)),
                                                             flick_51_60=ch[51:60])
    # lower tails' gap, idle sprite
    for look, d in (('clay', C/'frames/clay/idle/sprite'), ('fur', C/'frames/fur-idle/idle/sprite')):
        if not d.exists():
            continue
        hits = []
        for i, f in enumerate(frames(d)):
            im = ld(f)
            bgm = np.abs(im-im[2, 2]).sum(2) <= 30
            r = m['idle'][i]['sprite']
            ks = []
            for k in ('j3', 'j4', 'tip'):
                p0, q0 = np.array(r[f'tail_b_{k}']), np.array(r[f'tail_c_{k}'])
                n = int(np.linalg.norm(q0-p0))+2
                for u in np.linspace(.15, .85, n):
                    x, y = (p0+(q0-p0)*u).round().astype(int)
                    if 0 <= y < im.shape[0] and 0 <= x < im.shape[1] and bgm[y, x]:
                        ks.append(k)
                        break
            hits.append(ks)
        out[f'idle_lower_tails_gap_{look}'] = dict(fraction=round(sum(1 for h in hits if h)/len(hits), 3),
                                                   by_joint={k: round(sum(1 for h in hits if k in h)/len(hits), 3) for k in ('j3', 'j4', 'tip')},
                                                   frames_with_gap=[i for i, h in enumerate(hits) if h])
    # fur shimmer where clay is still, idle
    for view in ('side', 'sprite'):
        cd, fd = C/'frames/clay/idle'/view, C/'frames/fur-idle/idle'/view
        if not (cd.exists() and fd.exists()):
            continue
        fu = [ld(f) for f in frames(fd)]
        size = fu[0].shape[1], fu[0].shape[0]
        # the clay side view is 720 px and the fur side 480 px over the same framing: clay is box-filtered to the fur's size
        cl = [np.asarray(Image.open(f).convert('RGB').resize(size, Image.BOX)).astype(np.int16) for f in frames(cd)]
        fur_share, clay_share = [], []
        for i in range(len(fu)):
            j = (i+1) % len(fu)
            still = np.abs(cl[j]-cl[i]).max(2) <= 2
            fig = figure(fu[i]) | figure(fu[j])
            mm = still & fig
            fur_share.append(float((np.abs(fu[j]-fu[i]).max(2)[mm] > 12).mean()))
            cfig = figure(cl[i]) | figure(cl[j])
            clay_share.append(float((np.abs(cl[j]-cl[i]).max(2)[cfig] > 12).mean()))
        out[f'idle_fur_shimmer_{view}'] = dict(fur_changed_over_12_in_still_median_pct=round(100*float(np.median(fur_share)), 2),
                                              fur_changed_over_12_in_still_max_pct=round(100*max(fur_share), 2),
                                              clay_changed_over_12_median_pct=round(100*float(np.median(clay_share)), 2))
    return out


res = {'clips': measure(a.clips)}
if a.before:
    res['before'] = measure(a.before, a.before_measure, overlays=False)
(a.clips/'measure').mkdir(exist_ok=True)
(a.clips/'measure'/'render-measures.json').write_text(json.dumps(res, indent=1))
for k, v in res.items():
    print(k, json.dumps({x: y for x, y in v.items() if not (isinstance(y, list) and len(y) > 20)}))

"""Outline change per frame at the sprite framing, before rendering (numpy, no Blender). Numbers only.

  python art/species-construction/anim/clip_outline.py <rig dir> <rest skin npz> <bake dir> --sprite-box lo,hi [--clips stalk]

Every frame's skin is posed exactly as the renders pose it (breath key, corrective keys, dual quaternions), every vertex
is splatted into the sprite camera's 192 px grid (look-dev side_left, azimuth 90, elevation 0, 6 percent margin), the
mask is closed by one pixel, and the outline change from each frame to the next is the count of pixels whose inside or
outside state flipped. A proxy for the rendered clay silhouette (the skin's vertices are a few millimetres apart, a
sprite pixel about 9 mm); the render's own mask change is measured afterwards by clip_silhouettes.py.
Writes <bake dir>/outline-proxy.json.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('--sprite-box', required=True)
p.add_argument('--sprite', type=int, default=192)
p.add_argument('--clips', default='stalk')
a = p.parse_args()
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.rest)
rest = s*(d['src'].astype(np.float64)-off)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = json.loads((R/'correctives.json').read_text())['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
SHAPES = ac.load_shapes(a.bake)
box = np.array([float(v) for v in a.sprite_box.split(',')])
lo, hi = box[:3], box[3:]
r_ax, u_ax = np.array([0, 1., 0]), np.array([0, 0, 1.])        # side_left from +X, elevation 0: image right = +Y, up = +Z
corners = np.array([[hi[0] if k & 1 else lo[0], hi[1] if k & 2 else lo[1], hi[2] if k & 4 else lo[2]] for k in range(8)])
xs, ys = corners@r_ax, corners@u_ax
ortho = max(np.ptp(xs), np.ptp(ys))*1.12
cx, cy = (xs.max()+xs.min())/2, (ys.max()+ys.min())/2
S = a.sprite


def mask(P_m):
    X = P_m/s+off
    px = ((X@r_ax-cx)/ortho*S+S/2).astype(int)
    py = (S/2-(X@u_ax-cy)/ortho*S).astype(int)
    m = np.zeros((S, S), bool)
    ok = (px >= 0) & (px < S) & (py >= 0) & (py < S)
    m[py[ok], px[ok]] = True
    c = m.copy()                                     # close by one pixel (fill single-pixel holes between vertices)
    c[1:-1, 1:-1] |= (m[:-2, 1:-1] & m[2:, 1:-1]) | (m[1:-1, :-2] & m[1:-1, 2:])
    return c


out = {}
for clip in a.clips.split(','):
    frames = json.loads((a.bake/clip/'poses.json').read_text())
    prev, rows = None, []
    for fr in frames:
        P, _, _ = rc.posed_skin(ac.apply_shapes(rest, fr, SHAPES), idx, w, J, fr['pose'], fr['lift'], KEYS, DELTAS)
        m = mask(P)
        rows.append(int((m ^ prev).sum()) if prev is not None else 0)
        prev = m
    out[clip] = rows
    print(clip, rows, flush=True)
(a.bake/'outline-proxy.json').write_text(json.dumps(out))

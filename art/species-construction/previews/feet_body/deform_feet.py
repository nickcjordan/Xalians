"""Temporary hind-foot preview deformation for Akinza (never written to the recipe).

python deform_feet.py <probe.npz> <claws.npz> <out.npz> [scale=0.66] [inward=0] [roll=0]
Narrows each hind foot sideways about its own ankle axis: x' = cx + (x-cx)*(1-(1-scale)*w(z)), with w = 1 at and
below z -0.86 (the foot) easing to 0 at z -0.78 (lower shin), so the ankle and leg above are untouched. The claws move
rigidly with the toe they sit on (their centroid's displacement), so they keep their shape.
Optional inward: moves the ball and toes (y < 0.02, easing in over 0.08) toward the body by this many world units,
so the ball sits under the ankle instead of hanging off its outer side (a slight toe-in turn of the front of the foot).
Optional roll: rounds the lower side edges into the sole (invisible from the side): below z -0.905 the foot narrows
about its own midline by up to this fraction at the sole.
"""
import sys
import numpy as np

probe, claws, out = sys.argv[1:4]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 0.66
inward = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
roll = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
P = np.load(probe); v = P['v'].copy()
C = np.load(claws)


def smooth(t):
    t = np.clip(t, 0, 1); return t*t*(3-2*t)


def ankle_center(v, side):
    b = v[(np.sign(v[:, 0]) == side) & (np.abs(v[:, 0]) > 0.2) & (np.abs(v[:, 2]+0.83) < 0.004)]
    return 0.5*(b[:, 0].min()+b[:, 0].max()), 0.5*(b[:, 1].min()+b[:, 1].max())


def field(p, side, cx):
    w = smooth((-0.78 - p[:, 2])/0.08)
    sel = (np.sign(p[:, 0]) == side) & (np.abs(p[:, 0]) > 0.2) & (p[:, 2] < -0.78)
    q = p.copy()
    f = 1-(1-scale)*w
    wy = smooth((0.02-p[:, 1])/0.08)
    q[sel, 0] = cx + (p[sel, 0]-cx)*f[sel] - side*inward*wy[sel]*w[sel]
    return q


res = {}
for side in (-1, 1):
    cx, cy = ankle_center(P['v'], side)
    print('side', side, 'ankle centre x', round(cx, 4), 'y', round(cy, 4))
    v = field(v, side, cx)
    rollf = None
    if roll > 0:
        ref = v[(np.sign(v[:, 0]) == side) & (np.abs(v[:, 0]) > 0.2) & (np.abs(v[:, 2]+0.905) < 0.004)]
        ys = np.linspace(-0.16, 0.08, 25); mids = []
        for y in ys:
            c = ref[np.abs(ref[:, 1]-y) < 0.012]
            mids.append(0.5*(c[:, 0].min()+c[:, 0].max()) if len(c) > 3 else np.nan)
        mids = np.array(mids); ok = ~np.isnan(mids)
        mids = np.interp(ys, ys[ok], mids[ok]); mids = np.convolve(np.pad(mids, 2, mode='edge'), np.ones(5)/5, 'valid')

        def rollf(p, ys=ys, mids=mids, side=side):
            q = p.copy()
            sel = (np.sign(p[:, 0]) == side) & (np.abs(p[:, 0]) > 0.2) & (p[:, 2] < -0.88)
            mid = np.interp(p[sel, 1], ys, mids)
            t = smooth((-0.905-p[sel, 2])/0.052)
            q[sel, 0] = mid + (p[sel, 0]-mid)*(1-roll*t*t)
            return q
        v = rollf(v)
    for k in C.files:
        if not k.endswith('_v') or 'hind claw' not in k:
            continue
        c = C[k]
        if np.sign(c[:, 0].mean()) != side:
            continue
        cen = c.mean(0, keepdims=True)
        moved = field(cen, side, cx)
        if rollf is not None:
            moved = rollf(moved)
        res['claw::' + k[:-2].replace('body_Curved hind claw m1', 'body_Curved hind claw -1')] = c + (moved-cen)
np.savez_compressed(out, skin=v.astype(np.float32), **{k: x.astype(np.float32) for k, x in res.items()})
print('saved', out, 'claws', sorted(res))

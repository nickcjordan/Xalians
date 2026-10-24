"""Akinza sprites pass 1, eye sockets from a pose-only pass (numpy, no Blender, nothing rendered).

  python art/species-construction/anim/sprite_eyes.py <sprites1 dir> <rig dir> <bake dir> --sprite-box lo,hi

Each eye's socket is its cornea front as the sprite camera sees it: from the eyeball center (the globe's bounds center,
as rig.json's eyeCentres) along the eye's forward axis (toward the iris-and-pupil part's vertex mean) to where that line
leaves the globe's surface (ray against the globe's triangles from probe_eyes.py). The eye parts follow the head bone
rigidly (clip_frames.py), so every frame's point is the head bone's transform of the rest point, from the baked pose
(rig_core.bone_transforms, the root move included), projected through the clips4 sprite camera (look-dev side_left,
the sprite box's corners fitted with a 6 percent margin). The same path is checked against the Blender pass: the head
socket projected here against frames-raw/<clip>/sockets.json.

Visibility per facing: an eye whose posed forward axis points away from the camera (a negative dot with the direction
toward the camera, +X for side_left) is hidden behind the head.

Check against the rendered iris (frames/<clip>/NNNN.png, 192 px): within 4 px of the projected cornea front, the opaque
pixels (alpha > 0.9) more than 35 luminance levels darker than the median of the opaque pixels within 8 px and bluish
(blue at least 12 levels above red: the palette T7 iris is blue-charcoal, the eyeliner and the fur's shade are neutral
gray); their darkness-weighted centroid (pixel centers) against the socket, per frame. Writes <sprites1>/eyes/eye-sockets.json.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

CELL = 192
CLIPS = {'idle': 90, 'stalk': 45}


def ray_exit(o, d, V, T):
    """Farthest hit along o + t d (t > 0) on triangles V[T] (Moller-Trumbore), or None."""
    v0, v1, v2 = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    e1, e2 = v1-v0, v2-v0
    p = np.cross(d, e2)
    det = (e1*p).sum(1)
    ok = np.abs(det) > 1e-14
    inv = np.where(ok, 1/np.where(ok, det, 1), 0)
    s = o-v0
    u = (s*p).sum(1)*inv
    q = np.cross(s, e1)
    v = (q*d).sum(1)*inv
    t = (e2*q).sum(1)*inv
    hit = ok & (u >= 0) & (v >= 0) & (u+v <= 1) & (t > 1e-9)
    return float(t[hit].max()) if hit.any() else None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('sprites', type=Path)
    p.add_argument('rig', type=Path)
    p.add_argument('bake', type=Path)
    p.add_argument('--sprite-box', required=True)
    a = p.parse_args()
    S = a.sprites
    rig = json.loads((a.rig/'rig.json').read_text())
    J = json.loads((a.rig/'joints.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    to_m = lambda X: s*(np.asarray(X, float)-off)
    from_m = lambda X: np.asarray(X, float)/s+off
    z = np.load(S/'eyes/eyes.npz')
    box = np.array([float(v) for v in a.sprite_box.split(',')])
    lo, hi = box[:3], box[3:]
    corners = np.array([[hi[0] if k & 1 else lo[0], hi[1] if k & 2 else lo[1], hi[2] if k & 4 else lo[2]] for k in range(8)])
    xs, ys = corners[:, 1], corners[:, 2]          # side_left from +X: image right = +Y, image up = +Z
    ortho = max(np.ptp(xs), np.ptp(ys))*1.12
    cx, cy = (xs.max()+xs.min())/2, (ys.max()+ys.min())/2

    def uv(X):
        X = np.atleast_2d(X)
        return np.stack([(X[:, 1]-cx)/ortho+.5, .5-(X[:, 2]-cy)/ortho], 1)

    rest = {}
    for name, part in (('eye_l', '1'), ('eye_r', '-1')):
        g, gt = z[f'head_eye_globe_{part}__v'], z[f'head_eye_globe_{part}__t']
        c = (g.min(0)+g.max(0))/2
        q = z[f'head_iris_and_pupil_{part}__v'].mean(0)
        ax = (q-c)/np.linalg.norm(q-c)
        t = ray_exit(c, ax, g, gt)
        rest[name] = dict(center=c, axis=ax, radius=t, front=c+t*ax)
        print(name, 'center', c.round(4), 'axis', ax.round(4), 'radius along axis', round(t, 5), flush=True)
    out = dict(rule=__doc__.strip().split('\n\n')[1].replace('\n', ' '), orthoSource=ortho, cellPx=CELL,
               rest={k: {kk: (vv.tolist() if isinstance(vv, np.ndarray) else vv) for kk, vv in v.items()} for k, v in rest.items()},
               clips={})
    head_err = 0.
    for clip, n in CLIPS.items():
        frames = [f for f in json.loads((a.bake/clip/'poses.json').read_text()) if f['frame'] < n]
        blender = {r['frame']: r for r in json.loads((S/'frames-raw'/clip/'sockets.json').read_text())['rows']}
        rows = []
        for fr in frames:
            T = rc.bone_transforms(J, fr['pose'], bones=rc.ANIM_BONES, root_translate=tuple(rc.lift_vec(fr['lift'])))
            R, tt = T['head']
            hm = (np.asarray(J['head_base'], float)+np.asarray(J['head_top'], float))/2
            head_uv = uv(from_m(R@hm+tt))[0]
            head_err = max(head_err, float(np.abs(head_uv-np.array(blender[fr['frame']]['uv']['head'])).max()))
            row = dict(frame=fr['frame'])
            for name, e in rest.items():
                P = from_m(R@to_m(e['front'])+tt)
                axw = R@e['axis']
                row[name] = [round(float(x), 6) for x in uv(P)[0]]
                row[name+'_towardCamera'] = round(float(axw[0]), 4)      # +X is toward the side_left camera
            # the rendered iris near the near eye's socket
            im = np.asarray(Image.open(S/'frames'/clip/f"{fr['frame']:04d}.png")).astype(float)
            A = im[..., 3]/255
            L = im[..., 0]*.299+im[..., 1]*.587+im[..., 2]*.114
            ex, ey = np.array(row['eye_l'])*CELL
            yy, xx = np.mgrid[0:CELL, 0:CELL]
            cxp, cyp = xx+.5, yy+.5
            near = (np.abs(cxp-ex) <= 4) & (np.abs(cyp-ey) <= 4) & (A > .9)
            wide = (np.abs(cxp-ex) <= 8) & (np.abs(cyp-ey) <= 8) & (A > .9)
            ref = float(np.median(L[wide]))
            dark = near & (L < ref-35) & (im[..., 2]-im[..., 0] >= 12)   # the T7 iris is blue-charcoal; liner and shade are gray
            if dark.any():
                w = (ref-L[dark])
                ix, iy = float((cxp[dark]*w).sum()/w.sum()), float((cyp[dark]*w).sum()/w.sum())
                row['iris'] = dict(px=int(dark.sum()), centroid=[round(ix, 3), round(iy, 3)], offsetPx=[round(ex-ix, 3), round(ey-iy, 3)],
                                   distPx=round(float(np.hypot(ex-ix, ey-iy)), 3), localMedianL=round(ref, 1))
                old = np.array(blender[fr['frame']]['uv']['eye_l'])*CELL
                row['iris']['oldSocketDistPx'] = round(float(np.hypot(old[0]-ix, old[1]-iy)), 3)
            else:
                row['iris'] = None
            rows.append(row)
        out['clips'][clip] = rows
    out['headSocketAgainstBlenderMaxUv'] = head_err
    d = [r['iris']['distPx'] for c in out['clips'].values() for r in c if r['iris']]
    dold = [r['iris']['oldSocketDistPx'] for c in out['clips'].values() for r in c if r['iris']]
    tc = [r['eye_r_towardCamera'] for c in out['clips'].values() for r in c]
    tl = [r['eye_l_towardCamera'] for c in out['clips'].values() for r in c]
    out['summary'] = dict(framesWithIris=len(d), framesWithoutIris=sum(1 for c in out['clips'].values() for r in c if not r['iris']),
                          irisDistMaxPx=round(max(d), 3), irisDistMeanPx=round(float(np.mean(d)), 3), under1Px=sum(1 for x in d if x < 1),
                          oldSocketIrisDistMeanPx=round(float(np.mean(dold)), 3), oldSocketIrisDistMaxPx=round(max(dold), 3),
                          eyeLTowardCamera=[min(tl), max(tl)], eyeRTowardCamera=[min(tc), max(tc)],
                          headSocketAgainstBlenderMaxPx=round(head_err*CELL, 5))
    (S/'eyes/eye-sockets.json').write_text(json.dumps(out, indent=1))
    print(json.dumps(out['summary'], indent=1))


if __name__ == '__main__':
    main()

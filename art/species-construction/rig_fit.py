"""Silhouette projection and tail-free scoring for the rig tools (numpy, scipy, PIL; no bpy).

Cameras are the quick_silhouette.py cameras: orthographic, fixed ORTHO_SCALE
and CENTER, so rows map to fixed world heights exactly as in loop_tools.fit.
A posed point cloud is splatted into a mask, mapped into loop_tools' canonical
frame and scored against the reference figures.
"""
import math
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent/'loop'))
import loop_tools as lt  # noqa: E402

ORTHO_SCALE = 3.2094
CENTER = np.array([0.0, .175, -.0267])
WIDTH, HEIGHT = 900, 600
PER_UNIT = max(WIDTH, HEIGHT)/ORTHO_SCALE
ANGLES = {'front': 0, 'front-left': 45, 'left': 90, 'back': 180, 'right': 270, 'front-right': 315}
VIEWS = ['front', 'left', 'back']
# columns of the canonical frame kept per view: the half of the reference that has no tails
LEFT_CUT = 268
BELOW_TAILS = .86      # canonical row below which front and back views have no tails


def cam_axes(view):
    a = math.radians(ANGLES[view])
    right = np.array([math.cos(a), math.sin(a), 0.0])
    return right, np.array([0, 0, 1.0])


def project(points, view):
    right, up = cam_axes(view)
    rel = points-CENTER
    return WIDTH/2+rel@right*PER_UNIT, HEIGHT/2-rel@up*PER_UNIT


def raster(points, view, close=True):
    px, py = project(points, view)
    ix, iy = np.round(px).astype(int), np.round(py).astype(int)
    ok = (ix >= 0) & (ix < WIDTH) & (iy >= 0) & (iy < HEIGHT)
    mask = np.zeros((HEIGHT, WIDTH), bool)
    mask[iy[ok], ix[ok]] = True
    if close:
        mask = ndimage.binary_closing(ndimage.binary_dilation(mask, iterations=1), iterations=1)
    return mask


def span():
    row = lambda z: HEIGHT/2-(z-CENTER[2])*PER_UNIT
    return round(row(lt.FLOOR_Z+lt.FIXED_HEIGHT)), round(row(lt.FLOOR_Z))


_REF = {}


def reference(view):
    if view not in _REF:
        _REF[view] = lt.canonical(lt.reference_figure(view))
    return _REF[view]


def model_canonical(mask):
    return lt.canonical(mask, span())


def half_columns(view):
    n = lt.FIT_GRID
    return {'front': (0, n//2), 'back': (n//2, n), 'left': (0, LEFT_CUT)}[view]


FINE_BANDS = {'neck': (.20, .30), 'arm': (.30, .58), 'thigh': (.56, .72), 'shin': (.72, .92), 'foot': (.92, 1.0)}


def scores(model, ref, view, half=True):
    """lt.fit_scores plus finer bands; with half=True only the tail-free columns count."""
    if half:
        c0, c1 = half_columns(view)
        keep = np.zeros_like(model)
        keep[:, c0:c1] = True
        if view != 'left':
            keep[int(BELOW_TAILS*lt.FIT_GRID):, :] = True      # the lower legs sit below every tail
        model, ref = model & keep, ref & keep
    out = lt.fit_scores(model, ref)
    n = lt.FIT_GRID
    for band, (a, b) in FINE_BANDS.items():
        m, r = model[int(a*n):int(b*n)], ref[int(a*n):int(b*n)]
        union, inter = (m | r).sum(), (m & r).sum()
        out[band] = {'iou': round(float(inter/union), 4) if union else None,
                     'extra': round(float((m & ~r).sum()/max(1, r.sum())), 4),
                     'missing': round(float((r & ~m).sum()/max(1, r.sum())), 4)}
    return out


def overlay_half(model, ref, view, label, half=True):
    """Like loop_tools.overlay, with the excluded columns greyed out."""
    picture = lt.overlay(model, ref, label)
    if half:
        c0, c1 = half_columns(view)
        arr = np.array(picture)
        shade = np.ones(arr.shape[:2], bool)
        shade[:, c0:c1] = False
        if view != 'left':
            shade[int(BELOW_TAILS*lt.FIT_GRID):, :] = False
        arr[shade] = (arr[shade]*.35+255*.65).astype(np.uint8)
        arr[:, c0 if c0 else c1-1] = (0, 0, 0)
        from PIL import Image, ImageDraw
        picture = Image.fromarray(arr)
        ImageDraw.Draw(picture).text((6, 4), label, fill=(0, 0, 0))
    return picture


def evaluate(points, half=True):
    """Canonical masks and scores for the three views from one posed point cloud."""
    res = {}
    for view in VIEWS:
        m = model_canonical(raster(points, view))
        res[view] = (m, reference(view), scores(m, reference(view), view, half))
    return res


def objective(points):
    """Higher is better: tail-free trunk and leg IoU, plus the whole half."""
    total = 0.
    for view in VIEWS:
        m = model_canonical(raster(points, view))
        s = scores(m, reference(view), view, True)
        total += .2*s['all']['iou']+.25*s['trunk']['iou']+.25*s['legs']['iou']+.3*s['arm']['iou']
    return total/3


# ---------------------------------------------------------------- pose search
import rig_core as rc  # noqa: E402

# Free parameters: (bone, axis index, low, high). Limb bones are searched on the
# .L side and mirrored to .R; centre bones are searched as given.
LIMITS = {'pelvis': ((-20, 20), (-10, 10), (0, 0)), 'spine': ((-15, 15), (-10, 10), (0, 0)),
          'chest': ((-15, 15), (-10, 10), (0, 0)), 'neck': ((-10, 10), (-10, 10), (0, 0)),
          'head': ((-10, 10), (-10, 10), (0, 0)), 'clavicle': ((-15, 15), (-25, 25), (-15, 15)),
          'upperarm': ((-110, 110), (-110, 110), (-110, 110)), 'forearm': ((-140, 140), (-140, 140), (-140, 140)),
          'hand': ((-70, 70), (-70, 70), (-70, 70)), 'thigh': ((-45, 45), (-40, 40), (-15, 15)),
          'shin': ((-60, 60), (-25, 25), (-15, 15)), 'foot': ((-35, 35), (-20, 20), (-25, 25))}
CENTRE = ('pelvis', 'spine', 'chest', 'neck', 'head')
LEGS = ('thigh', 'shin', 'foot')
# arms mirror left to right (the sheet's akimbo arms are symmetric); legs are free per side because the
# sheet's stance is not: only the lower legs below the tails show on the tail side
PARAMS = [(bone+('' if bone in CENTRE else f'.{side}'), axis, *LIMITS[bone][axis])
          for bone in LIMITS for side in (('L', 'R') if bone in LEGS else ('L',)) for axis in range(3)
          if LIMITS[bone][axis] != (0, 0)]
# Sheet-derived start: world directions (left side, +x outward, -y forward) read off the
# reference's front and side figures: elbow out and back, forearm folded onto the hip.
START_DIRS = {'upperarm.L': (.5, .62, -.58), 'forearm.L': (-.28, -.56, -.79),
              'thigh.L': (.10, -.04, -1.0), 'shin.L': (.12, .08, -1.0)}
INITIAL = {}


ARM_WINDOW = 35


def base_name(bone):
    return bone.split('.')[0]


def build_pose(vec):
    pose = {}
    for (bone, axis, _, _), value in zip(PARAMS, vec):
        pose.setdefault(bone, [0., 0., 0.])[axis] = float(value)
    full = dict(pose)
    left = {b: v for b, v in pose.items() if b.endswith('.L') and base_name(b) not in LEGS}
    full.update(rc.mirror_pose(left))
    return full


def initial_vector(joints=None):
    start = rc.pose_from_directions(joints, START_DIRS) if joints else {}
    for b in list(start):
        if b.endswith('.L') and base_name(b) in LEGS:
            start[b[:-1]+'R'] = rc.mirror_pose({b: start[b]})[b[:-1]+'R']
    return np.array([start.get(bone, (0, 0, 0))[axis] for bone, axis, _, _ in PARAMS], float)


def pose_points(points, idx, w, joints, pose, root=(0.0, 0.0)):
    """Pose the skin points, shift the root by (dx, dy), then drop the figure onto the floor."""
    dx, dy = root if hasattr(root, '__len__') else (0.0, root)
    T = rc.bone_transforms(joints, pose, root_translate=(dx, dy, 0))
    out = rc.skin_points(points, idx, w, T)
    out[:, 2] += rc.ground_offset(out)
    return out


def fit_pose(points, idx, w, joints, start=None, steps=(12, 6, 3, 1.5), sweeps=3, log=print):
    """Coordinate search over bone angles and the root's sideways/depth shift. Lengths never change."""
    n = len(PARAMS)
    vec = initial_vector(joints) if start is None else np.array(start, float)
    vec = np.r_[vec, 0.0, 0.0]                 # root dx, dy
    lo = np.array([p[2] for p in PARAMS]+[-.2, -.2], float)
    hi = np.array([p[3] for p in PARAMS]+[.2, .2], float)
    # the arms start from the sheet-read directions and may only move within a window of them:
    # the long model arm cannot reach the hip, and an unconstrained search just lets it hang
    for i, (bone, axis, _, _) in enumerate(PARAMS):
        if base_name(bone) in ('upperarm', 'forearm', 'hand'):
            lo[i], hi[i] = vec[i]-ARM_WINDOW, vec[i]+ARM_WINDOW
    unit = np.r_[np.ones(n), .004, .004]

    def score(v):
        return objective(pose_points(points, idx, w, joints, build_pose(v[:n]), (v[n], v[n+1])))
    best = score(vec)
    log(f'start objective {best:.4f}')
    for step in steps:
        for _ in range(sweeps):
            improved = False
            for i in range(len(vec)):
                for sign in (1, -1):
                    v = vec.copy()
                    v[i] = np.clip(v[i]+sign*step*unit[i], lo[i], hi[i])
                    if v[i] == vec[i]:
                        continue
                    sc = score(v)
                    if sc > best+1e-5:
                        best, vec, improved = sc, v, True
                        break
            log(f'step {step}: objective {best:.4f}')
            if not improved:
                break
    return vec[:n], (float(vec[n]), float(vec[n+1])), best

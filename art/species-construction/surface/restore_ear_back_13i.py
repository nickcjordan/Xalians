"""Restore recorded ear trims, then taper only overhanging apex hair paths."""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.geometry import convex_hull_2d

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from refine_ear_root_12b2 import values

args = sys.argv[sys.argv.index('--') + 1:]
before, original, masks, out = map(Path, args[:4])
plan = np.load(args[4]) if len(args) > 4 else None
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(original / 'surface.blend'))
cu = bpy.data.objects['Akinza fur'].data
base_starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', base_starts)
base = {k: values(cu, k, 'vector', 3) if k == 'position' else values(cu, k)
        for k in ('position', 'radius', 'strlen')}
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
assert np.array_equal(starts, base_starts), '13b curve ordering differs'
assert len(cu.points) == len(base['position']), '13b point topology differs'
counts = np.diff(np.r_[starts, len(cu.points)])
points = values(cu, 'position', 'vector', 3)
old = points.copy()
roots = points[starts].copy()
radius = values(cu, 'radius')
old_radius = radius.copy()
strlen = values(cu, 'strlen')
old_strlen = strlen.copy()
active = np.maximum.reduceat(radius, starts) > 0
mask = np.load(masks)
restore = mask['rim'] & active & ~mask['tuft']
pm = np.repeat(restore, counts)
points[pm] = base['position'][pm]
radius[pm] = base['radius'][pm]
strlen[np.repeat(restore, counts) if cu.attributes['strlen'].domain == 'POINT' else restore] = base['strlen'][np.repeat(restore, counts) if cu.attributes['strlen'].domain == 'POINT' else restore]

# Measure the outline in the established tip-review camera. Mirror the other
# ear into the same frame. The apex uses the actual skin extremum, not a box.
info = json.loads((before / 'surface-info.json').read_text())
skin = bpy.data.objects[info['skin']]
co = values(skin.data, 'position', 'vector', 3)
ear = co[(co[:, 0] > .30) & (co[:, 2] > .73)]
az, el = np.deg2rad([155, 24])
camera = np.array([np.sin(az)*np.cos(el), -np.cos(az)*np.cos(el), np.sin(el)])
right = np.cross(-camera, [0, 0, 1]); right /= np.linalg.norm(right)
up = np.cross(right, -camera)
def project(q):
    q = np.array(q, copy=True); q[:, 0] = abs(q[:, 0])
    return np.column_stack([q @ right, q @ up])
q = project(ear)
outline = q[convex_hull_2d([Vector(v) for v in q])]
def excess(p):
    p = project(p); dist = np.full(len(p), np.inf); signs = []
    for a, b in zip(outline, np.roll(outline, -1, axis=0)):
        d = b-a; t = np.clip((p-a) @ d / np.dot(d, d), 0, 1)
        dist = np.minimum(dist, np.linalg.norm(p-a-t[:, None]*d, axis=1))
        signs.append(d[0]*(p[:, 1]-a[1])-d[1]*(p[:, 0]-a[0]))
    s = np.array(signs)
    inside = np.all(s >= -1e-9, axis=0) | np.all(s <= 1e-9, axis=0)
    return np.where(inside, -dist, dist)
apex_along = np.max(.8*ear[:, 0]+.6*ear[:, 2])
distance = apex_along-(.8*abs(roots[:, 0])+.6*roots[:, 2])
w = np.clip((.038-distance)/.020, 0, 1)
w = w*w*(3-2*w)
ends = starts+counts-1
overhang = excess(points[ends])
rng = np.random.default_rng(131609)
target = .009*rng.uniform(.8, 1.2, len(starts))
trim = restore & (w > 0) & (overhang > target+.001)
for i in np.where(trim)[0]:
    sl = slice(starts[i], starts[i]+counts[i]); path = points[sl].copy()
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    samples = np.linspace(0, arc[-1], 129)
    dense = np.column_stack([np.interp(samples, arc, path[:, k]) for k in range(3)])
    limit = overhang[i]*(1-w[i])+target[i]*w[i]
    cross = np.where(excess(dense) > limit)[0]
    if not len(cross):trim[i] = False;continue
    assert cross[0] > 0, 'Apex allowance excludes the root'
    length = samples[max(1, cross[0]-1)]
    sample = np.linspace(0, length, counts[i])
    points[sl] = np.column_stack([np.interp(sample, arc, path[:, k]) for k in range(3)])
    t = np.linspace(0, 1, counts[i])
    radius[sl] = radius[starts[i]]*(1-t)**1.35+.000001*t
    strlen[sl if cu.attributes['strlen'].domain == 'POINT' else i] = length
if plan is not None:
    # The NumPy plan relaxes shortening near protected original hairs rather
    # than cutting those inside-outline hairs to hide an envelope outlier.
    points = plan['points'].copy();trim = plan['trim'];target = plan['target'];w = plan['weight']
    assert np.array_equal(points[~pm], old[~pm])
    assert np.array_equal(points[starts], roots)
    assert np.all(~trim | restore)
    radius[pm] = base['radius'][pm]
    strlen[np.repeat(restore, counts) if cu.attributes['strlen'].domain == 'POINT' else restore] = base['strlen'][np.repeat(restore, counts) if cu.attributes['strlen'].domain == 'POINT' else restore]
    for i in np.where(trim)[0]:
        sl = slice(starts[i], starts[i]+counts[i]);t = np.linspace(0, 1, counts[i])
        radius[sl] = radius[starts[i]]*(1-t)**1.35+.000001*t
        length = np.linalg.norm(np.diff(points[sl], axis=0), axis=1).sum()
        strlen[sl if cu.attributes['strlen'].domain == 'POINT' else i] = length
cu.points.foreach_set('position', points.ravel())
cu.attributes['radius'].data.foreach_set('value', radius)
cu.attributes['strlen'].data.foreach_set('value', strlen)
changed = np.maximum.reduceat(np.linalg.norm(points-old, axis=1), starts) > 0
np.savez_compressed(out/'patch-evidence.npz', changed=changed, restore=restore,
                    trim=trim, roots=roots, starts=starts, outline=outline,
                    oldPoints=old[pm], oldRadius=old_radius[pm],
                    oldStrlen=old_strlen[np.repeat(restore, counts) if cu.attributes['strlen'].domain == 'POINT' else restore],
                    weight=w, target=target, originalOverhang=overhang)
info.update(parent=str(before), earBack13i=dict(restored=int(restore.sum()),
            apexTrimmed=int(trim.sum()), original=str(original),
            falloffMeters=.020, apexReachMeters=.038, variation=.20))
(out/'surface-info.json').write_text(json.dumps(info, indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('13I_SAVED', info['earBack13i'], flush=True)

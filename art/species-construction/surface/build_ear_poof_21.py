"""Step 21: P-ombre-rev (white root, blue tip) with Nick's rule "make sure that
you're not coloring part of the head blue": a poof point may take blue only if
it lies over ear skin (nearest skin earw > .9) and, seen from the ears-front
camera, outside the head outline. The per-point mask is saved in the patch
evidence; the color switch multiplies the blue ramp by it.

  blender -b --python build_ear_poof_21.py -- <s12-20 dir> <out dir> [--set-default-only]
"""
import sys
import json
import math
import hashlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ear_poof_color_19 as color

args = sys.argv[sys.argv.index('--') + 1:]
before, out = Path(args[0]), Path(args[1])
default_only = '--set-default-only' in args
src = out if default_only else before
if not default_only:
    assert not (out / 'surface.blend').exists()
    out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
cu = bpy.data.objects['Akinza fur'].data
pos = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', pos)
prior = dict(np.load(src / 'patch-evidence.npz'))
if not default_only:
    info = json.loads((before / 'surface-info.json').read_text())
    skin = bpy.data.objects[info['skin']]
    co = np.empty(len(skin.data.vertices) * 3, np.float32)
    skin.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    earw = np.empty(len(co), np.float32)
    skin.data.attributes['earw'].data.foreach_get('value', earw)
    tree = KDTree(len(co))
    for i, q in enumerate(co):
        tree.insert(Vector(q), i)
    tree.balance()
    starts = np.empty(len(cu.curves), np.int32)
    cu.curves.foreach_get('first_point_index', starts)
    P = pos.reshape(-1, 3)
    poofpts = P[starts[color.NATIVE]:]
    el = math.radians(3)
    fwd = np.array([0, math.cos(el), -math.sin(el)])
    right = np.cross(fwd, [0, 0, 1]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    S = 1.35 / 1024
    q = poofpts - np.array([0, -.02, .74])
    x = 512 + q @ right / S
    y = 333.5 - q @ up / S - 2
    head = ((x - 512) / 140.0) ** 2 + ((y - 395) / 175.0) ** 2 <= 1.0
    on_ear = np.array([earw[tree.find(Vector(p))[1]] > .9 for p in poofpts])
    mask = (on_ear & ~head).astype(np.float32)
    # a strand rooted on head skin stays white along its whole length
    n = len(cu.curves) - color.NATIVE
    per = mask.reshape(n, -1)
    per[~on_ear.reshape(n, -1)[:, 0]] = 0
    mask = per.ravel()
    prior['poofEarMask'] = mask
    print('EAR_MASK', dict(points=len(mask), blueAllowed=int(mask.sum()), overHead=int(head.sum()),
                           rootedOnHead=int((~on_ear.reshape(n, -1)[:, 0]).sum())), flush=True)
default = color.options()['default']
color.apply(prior, default)
after = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', after)
assert np.array_equal(pos, after), 'Geometry must not change'
info = json.loads((src / 'surface-info.json').read_text())
info.update(parent=str(before))
info['earPoofColor21'] = dict(default=default, option=color.options()['options'][default], geometryExact=True,
                              headRule='blue only on poof points over ear skin and outside the head outline; strands rooted on head skin stay white')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
np.savez_compressed(out / 'patch-evidence.npz', **prior)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_POOF_21_SAVED', default, flush=True)

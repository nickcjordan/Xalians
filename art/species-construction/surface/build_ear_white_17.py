"""Step 17 (Nick: "just remove it entirely and then make that section of the ear
white"): delete the fan, and recolor the native inner-ear coat white inside the
D1 half-disc at each ear base. Only the cupm (ear blue) attribute changes.

  blender -b --python build_ear_white_17.py -- <16half surface dir> <out dir>
"""
import sys
import json
import math
import hashlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
removed = []
for name in ('Akinza ear fan 16 halfway', 'Akinza ear fan guides 16 halfway'):
    ob = bpy.data.objects[name]
    removed.append(dict(name=name, curves=len(ob.data.curves)))
    bpy.data.objects.remove(ob, do_unlink=True)
left = [o.name for o in bpy.data.objects if o.type == 'CURVES' and o.name not in ('Akinza fur',) and not o.hide_render]
print('OTHER_VISIBLE_CURVES', left, flush=True)

cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
pts = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', pts)
pts = pts.reshape(-1, 3)
roots = pts[starts]
counts = np.diff(np.r_[starts, len(pts)])
nrm = np.empty(len(starts) * 3, np.float32)
cu.attributes['nrm'].data.foreach_get('vector', nrm)
nrm = nrm.reshape(-1, 3)

cam_target = np.array([0, -.02, .74])
el = math.radians(3)
fwd = np.array([0, math.cos(el), -math.sin(el)])
right = np.cross(fwd, [0, 0, 1]); right /= np.linalg.norm(right)
up = np.cross(right, fwd)
S = 1.35 / 1024
q = roots - cam_target
px = 512 + q @ right / S
py = 333.5 - q @ up / S - 2          # into the 15-target-base framing

def smooth(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)

RADIUS, FADE = 85.0, 12.0
weight = np.zeros(len(starts), np.float32)
for (ox, oy), axis in (((375, 362), -149), ((649, 361), -31)):
    a = math.radians(axis)
    dx, dy = px - ox, py - oy
    r = np.hypot(dx, dy)
    along = dx * math.cos(a) + dy * math.sin(a)       # >0 into the ear
    w = smooth((RADIUS + FADE - r) / FADE) * smooth((along + FADE) / FADE)
    weight = np.maximum(weight, w)
weight[nrm[:, 1] > .2] = 0                            # front (inner) side only
a = cu.attributes['cupm']
cupm = np.empty(len(a.data), np.float32)
a.data.foreach_get('value', cupm)
old = cupm.copy()
wpt = np.repeat(weight, counts) if a.domain == 'POINT' else weight
cupm = cupm * (1 - wpt)
a.data.foreach_set('value', cupm)
changed = (np.abs(cupm - old).reshape(-1) > 1e-6)
changed_curves = int((np.maximum.reduceat(changed.astype(np.int8), starts) > 0).sum()) if a.domain == 'POINT' else int(changed.sum())
print('RECOLOR', dict(domain=a.domain, curvesChanged=changed_curves, fullWhite=int((weight > .99).sum())), flush=True)

info.update(parent=str(before), additionalFurObjects=[],
            strands=len(starts), strandPoints=len(pts))
info.pop('earFan16Halfway', None)
info['earWhite17'] = dict(sourceSha256=hashlib.sha256((before / 'surface.blend').read_bytes()).hexdigest(),
                          removed=removed, origins=[[375, 362], [649, 361]], axesDeg=[-149, -31],
                          radiusPx=RADIUS, fadePx=FADE, attribute='cupm scaled by (1 - weight)',
                          curvesChanged=changed_curves, nickRuling='just remove it entirely and then make that section of the ear white')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
np.savez_compressed(out / 'patch-evidence.npz', changed=np.zeros(len(starts), bool), leftover=prior['leftover'],
                    whiteWeight=weight, oldCupm=old)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_WHITE_17_SAVED', info['earWhite17'], flush=True)

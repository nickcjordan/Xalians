"""Step 22 (Nick: "It's showing up on the side of the head. Only the tuft should
have this ombre color"). Mesh-region rule, no camera test:

* ear-sheet skin = the step 12b2 test: thin skin (thickness along -normal under
  .08, inside the .065-.095 sheet gate) that belongs to the ear (earw > .5);
* poof strands get blue only if rooted on ear sheet, and only on points whose
  nearest skin is ear sheet; everything over head skin is white;
* native strands rooted on head skin in the ear-root area (earw > .02, not
  sheet) lose any ear blue, so the head side is plain head white.
Color attributes only; geometry is asserted unchanged.

  blender -b --python build_ear_poof_22.py -- <s12-21 dir> <out dir>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ear_poof_color_19 as color

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
skin = bpy.data.objects[info['skin']]
me = skin.data
co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
nm = np.empty(len(me.vertices) * 3, np.float32); me.vertex_normals.foreach_get('vector', nm); nm = nm.reshape(-1, 3)
earw = np.empty(len(co), np.float32); me.attributes['earw'].data.foreach_get('value', earw)
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
thick = np.full(len(co), np.inf)
for i in np.where(earw > .02)[0]:
    hit = bvh.ray_cast(Vector(co[i] - nm[i] * .0001), Vector(-nm[i]), .3)
    if hit[0] is not None:
        thick[i] = hit[3] + .0001
sheet = (earw > .5) & (thick < .08)
headside = (earw > .02) & ~sheet
print('SKIN', dict(earArea=int((earw > .02).sum()), sheet=int(sheet.sum()), headSide=int(headside.sum())), flush=True)
tree = KDTree(len(co))
for i, q in enumerate(co):
    tree.insert(Vector(q), i)
tree.balance()

cu = bpy.data.objects['Akinza fur'].data
pos = np.empty(len(cu.points) * 3, np.float32); cu.points.foreach_get('position', pos)
P = pos.reshape(-1, 3)
starts = np.empty(len(cu.curves), np.int32); cu.curves.foreach_get('first_point_index', starts)
N = color.NATIVE
prior = dict(np.load(before / 'patch-evidence.npz'))
root_v = np.array([tree.find(Vector(q))[1] for q in P[starts]])
# native head-side strands: no ear blue
base = prior['baseCupm'].copy()
strip = np.zeros(len(starts), bool)
strip[:N] = headside[root_v[:N]] & (base[:N] > 0)
base[strip] = 0
prior['baseCupm'] = base
# poof: per-point mask from the mesh
poofpts = P[starts[N]:]
pv = np.array([tree.find(Vector(q))[1] for q in poofpts])
n = len(starts) - N
mask = sheet[pv].reshape(n, -1).astype(np.float32)
rooted_sheet = sheet[root_v[N:]]
mask[~rooted_sheet] = 0
prior['poofEarMask'] = mask.ravel()
print('MASK', dict(nativeHeadSideStripped=int(strip.sum()), poofRootedOnSheet=int(rooted_sheet.sum()),
                   poofRootedOnHead=int((~rooted_sheet).sum()), poofPointsBlueAllowed=int(mask.sum())), flush=True)
default = color.options()['default']
color.apply(prior, default)
after = np.empty(len(cu.points) * 3, np.float32); cu.points.foreach_get('position', after)
assert np.array_equal(pos, after)
info.update(parent=str(before))
info['earPoofColor22'] = dict(default=default, sheetRule='earw > .5 and skin thickness < .08 (step 12b2 test)',
                              nativeHeadSideStripped=int(strip.sum()), poofRootedOnHead=int((~rooted_sheet).sum()),
                              geometryExact=True)
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
np.savez_compressed(out / 'patch-evidence.npz', **prior, sheetVertices=sheet, nativeHeadSideStripped=strip)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_POOF_22_SAVED', default, flush=True)

"""Step 23: keep the poof on the ear. Poof strands rooted on head skin are culled
(zero radius, as earlier rogue culls); ear-rooted poof strands are shortened,
with a soft falloff shared with their neighbors, so no part lies over head skin
or within 4 mm of it. Ombre (white root, blue tips) re-applied on what remains.
Native strands are untouched.

  blender -b --python build_ear_poof_23.py -- <s12-22 dir> <out dir>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ear_poof_color_19 as color

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
prior = dict(np.load(before / 'patch-evidence.npz'))
skin = bpy.data.objects[info['skin']]
co = np.empty(len(skin.data.vertices) * 3, np.float32)
skin.data.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
sheet = prior['sheetVertices']
earw = np.empty(len(co), np.float32)
skin.data.attributes['earw'].data.foreach_get('value', earw)
headside = (earw > .02) & ~sheet
tree = KDTree(len(co))
for i, q in enumerate(co):
    tree.insert(Vector(q), i)
tree.balance()
hid = np.where(headside)[0]
htree = KDTree(len(hid))
for k, i in enumerate(hid):
    htree.insert(Vector(co[i]), k)
htree.balance()

cu = bpy.data.objects['Akinza fur'].data
N = color.NATIVE
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
orig = P.copy()
rad = np.empty(len(cu.points), np.float32)
cu.attributes['radius'].data.foreach_get('value', rad)
n = len(starts) - N
NP = (len(P) - starts[N]) // n
poof = P[starts[N]:].reshape(n, NP, 3).copy()


def ok(p):
    v = tree.find(Vector(p))[1]
    return bool(sheet[v]) and htree.find(Vector(p))[2] > .004


on_ear = np.array([ok(s[0]) for s in poof])
arc = np.c_[np.zeros(n), np.cumsum(np.linalg.norm(np.diff(poof, axis=1), axis=2), axis=1)]
L = arc[:, -1]
allowed = np.zeros(n)
for i in range(n):
    if not on_ear[i]:
        continue
    bad = [j for j in range(1, NP) if not ok(poof[i, j])]
    allowed[i] = L[i] if not bad else .85 * arc[i, bad[0] - 1]
frac = np.where(L > 0, allowed / np.maximum(L, 1e-9), 0)
# Soft falloff: each strand takes the smaller of its own fraction and its 12
# nearest poof neighbors' mean, so lengths ramp down toward the boundary.
rk = KDTree(n)
for i in range(n):
    rk.insert(Vector(poof[i, 0]), i)
rk.balance()
soft = frac.copy()
for i in np.where(on_ear)[0]:
    nb = [j for _, j, _ in rk.find_n(Vector(poof[i, 0]), 13)]
    soft[i] = min(frac[i], float(np.mean(frac[nb])) * 1.05)
culled = ~on_ear | (soft * L < .004)
shortened = 0
for i in range(n):
    sl = slice(starts[N + i], starts[N + i] + NP)
    if culled[i]:
        rad[sl] = 0
        continue
    if soft[i] < .999:
        target = np.linspace(0, soft[i] * L[i], NP)
        P[sl] = np.column_stack([np.interp(target, arc[i], poof[i, :, k]) for k in range(3)])
        shortened += 1
cu.points.foreach_set('position', P.ravel())
cu.attributes['radius'].data.foreach_set('value', rad)
if 'strlen' in cu.attributes and cu.attributes['strlen'].domain == 'CURVE':
    sv = np.empty(len(starts), np.float32)
    cu.attributes['strlen'].data.foreach_get('value', sv)
    sv[N:] = np.where(culled, 0, soft * L)
    cu.attributes['strlen'].data.foreach_set('value', sv)
assert np.array_equal(P[:starts[N]], orig[:starts[N]]), 'Native strands must not move'
newpoof = P[starts[N]:].reshape(n, NP, 3)
mask = np.zeros((n, NP), np.float32)
left_over_head = 0
for i in range(n):
    if culled[i]:
        continue
    for j in range(NP):
        if ok(newpoof[i, j]):
            mask[i, j] = 1
        else:
            left_over_head += 1
prior['poofEarMask'] = mask.ravel()
prior['poof'] = newpoof
prior['poofCulled23'] = culled
stats = dict(culledOnHead=int((~on_ear).sum()), culledTooShort=int((culled & on_ear).sum()),
             shortened=shortened, kept=int((~culled).sum()), keptPointsOverHead=left_over_head)
print('POOF23', stats, flush=True)
color.apply(prior, color.options()['default'])
info.update(parent=str(before))
info['earPoof23'] = dict(stats, rule='every poof point over ear sheet and more than 4 mm from head skin; neighbor-shared length falloff')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
np.savez_compressed(out / 'patch-evidence.npz', **prior)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_POOF_23_SAVED', flush=True)

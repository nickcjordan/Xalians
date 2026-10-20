"""Step 26: tails. Applies plan_tails_26.py:
* strands reaching past their tail's smoothed outer envelope are shortened
  (resampled along their own path, never lengthened), which removes the
  bristly root collar and the bumps on the outer edge without changing the
  plume's direction or density;
* 'sth' becomes a per-point attribute (all other strands keep their value on
  every point); on tail strands each point's sth is set so that the unchanged
  ring shader term sth + intercept*strlen*tipShift equals where that point
  actually lies along its tail, so the rings fall in clean bands.
No shader or palette change.

  blender -b --python build_fix_26.py -- <before dir> <out dir> <plan.npz>
"""
import sys
import json
from pathlib import Path
import bpy
import numpy as np

before, out, plan_path = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
pal = json.loads((Path(__file__).resolve().parent / 'akinza-palettes.json').read_text())['T7']
TIP = pal['patternParams'].get('tipShift', 0.8)
plan = np.load(plan_path)
cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
P = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', P)
P = P.reshape(-1, 3)
orig = P.copy()
counts = np.diff(np.r_[starts, len(P)])


def getv(name):
    a = cu.attributes[name]
    v = np.empty(len(a.data), np.float32)
    a.data.foreach_get('value', v)
    return a.domain, v


sdom, sth = getv('sth')
ldom, strlen = getv('strlen')
print('ATTR_DOMAINS', dict(sth=sdom, strlen=ldom), flush=True)
sth_pt = np.repeat(sth, counts) if sdom == 'CURVE' else sth.copy()
changed = np.zeros(len(starts), bool)
trimmed = 0
for j, i in enumerate(plan['ids']):
    s, c = starts[i], counts[i]
    path = orig[s:s + c]
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    f = float(plan['factor'][j])
    tS = plan['trueS'][j, :c]
    tt = plan['t'][j, :c]
    if f < .999:
        target = np.linspace(0, arc[-1] * f, c)
        P[s:s + c] = np.column_stack([np.interp(target, arc, path[:, k]) for k in range(3)])
        trimmed += 1
        sl_true = np.interp(target / max(arc[-1], 1e-9), tt, tS)
        L = (strlen[i] if ldom == 'CURVE' else strlen[s]) * f
        if ldom == 'CURVE':
            strlen[i] = L
        else:
            strlen[s:s + c] = L
    else:
        sl_true = tS
        L = strlen[i] if ldom == 'CURVE' else strlen[s]
    t = np.linspace(0, 1, c)
    sth_pt[s:s + c] = sl_true - t * L * TIP
    changed[i] = True
cu.points.foreach_set('position', P.ravel())
cu.attributes['strlen'].data.foreach_set('value', strlen)
if sdom == 'CURVE':
    cu.attributes.remove(cu.attributes['sth'])
    cu.attributes.new('sth', 'FLOAT', 'POINT')
cu.attributes['sth'].data.foreach_set('value', sth_pt.astype(np.float32))
keep = np.repeat(~changed, counts)
assert np.array_equal(P[keep], orig[keep])
print('TAILS26', dict(tailStrands=int(changed.sum()), trimmed=trimmed, tipShift=TIP), flush=True)
info.update(parent=str(before))
info['tails26'] = dict(tailStrands=int(changed.sum()), trimmed=trimmed, sthDomain='POINT',
                       method='trim to the smoothed 80th-percentile outer envelope per tail; per-point sth so rings follow actual position')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
prior = dict(np.load(before / 'patch-evidence.npz'))
geo = np.zeros(len(starts), bool)
geo[plan['ids'][plan['factor'] < .999]] = True
prior['changed26'] = geo
np.savez_compressed(out / 'patch-evidence.npz', **prior)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('FIX26_SAVED', flush=True)

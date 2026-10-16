"""Reopen both saves and verify held assets plus the exact dedicated system."""
import json
import sys
from pathlib import Path
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from verify_fur_13 import snapshot
from refine_ear_root_12b2 import values

before, after = map(Path, sys.argv[sys.argv.index('--') + 1:])
before_info = json.loads((before / 'surface-info.json').read_text())
after_info = json.loads((after / 'surface-info.json').read_text())
assert not before_info.get('additionalFurObjects'), 'Preserve any inherited additional system'
assert after_info['additionalFurObjects'] == ['Akinza canal tuft 13g']
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
original_objects = set(bpy.data.objects.keys())
patch = np.load(after / 'patch-evidence.npz')
original_fur = bpy.data.objects['Akinza fur'].data
original_position = values(original_fur, 'position', 'vector', 3)
original_strlen = values(original_fur, 'strlen')
allowed = ['position', 'radius', 'strlen']
baseline = snapshot(before, patch['changed'], allowed)
final = snapshot(after, patch['changed'], allowed)
added_material = 'Akinza dedicated white canal hair'
assert added_material in final['materials']
del final['materials'][added_material]
assert baseline == final, 'Held meshes, materials or fur data differ'
cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
point_rim = np.repeat(patch['rim'], np.diff(np.r_[starts, len(cu.points)]))
assert np.array_equal(values(cu, 'position', 'vector', 3)[~point_rim], original_position[~point_rim])
length_rim = point_rim if cu.attributes['strlen'].domain == 'POINT' else patch['rim']
assert np.array_equal(values(cu, 'strlen')[~length_rim], original_strlen[~length_rim])
radius = values(cu, 'radius')
assert np.all(np.maximum.reduceat(radius, starts)[patch['tuft']] == 0)
r = patch['roots'][patch['rim']]
assert np.all(((abs(r[:, 0]) > .30) & (r[:, 2] > .74)) |
              ((abs(r[:, 0]) > .25) & (r[:, 2] > .80)))
g = bpy.data.objects['Akinza canal guides 13g']
children = bpy.data.objects['Akinza canal tuft 13g']
assert len(g.data.curves) == 28 and g.hide_render
expected_children = after_info['earGuides13g']['childrenPerEar'] * 2
assert len(children.data.curves) == expected_children and not children.hide_render
assert children.data.materials[0].name == added_material
assert np.allclose(np.array(children.matrix_world), np.eye(4))
assert np.allclose(np.array(g.matrix_world), np.eye(4))
guides = np.load(after / 'guide-evidence.npz')
assert guides['guides'].shape == (28, 16, 3)
assert np.all(guides['radii'][:, -1] < .000002)
assert set(bpy.data.objects.keys()) - original_objects == {'Akinza canal guides 13g', 'Akinza canal tuft 13g'}
assert not original_objects - set(bpy.data.objects.keys())
assert np.array_equal(values(g.data, 'position', 'vector', 3), guides['guides'].astype(np.float32).reshape(-1, 3))
assert np.array_equal(values(children.data, 'position', 'vector', 3), guides['children'].astype(np.float32).reshape(-1, 3))
assert np.array_equal(values(children.data, 'radius'), guides['radii'].astype(np.float32).ravel())
result = dict(unchanged=True, protected=final, suppressed=int(patch['tuft'].sum()),
              rim=int(patch['rim'].sum()), guides=28, children=expected_children,
              allowed=allowed)
(after / 'held-data.json').write_text(json.dumps(result, indent=2) + '\n')
print('13G_SAVED_PROTECTION_PASS', flush=True)

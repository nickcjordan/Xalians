"""Blender half of legs_tail_v1_post.py: write new skin positions (same topology and vertex order) into the assembled
creature's skin object, check it is one closed component, save akinza.blend and akinza.glb into the out dir and
update assembly.json (outputs, the skin's stats).

  blender -b --python legs_tail_v1_apply.py -- <input akinza.blend> <positions npz with src (world)> <out dir>
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from blender_blockout import mesh_stats, sha  # noqa: E402

src_blend, positions, out = sys.argv[sys.argv.index('--')+1:][:3]
out = Path(out)
bpy.ops.wm.open_mainfile(filepath=src_blend)
bpy.context.preferences.filepaths.save_version = 0
skin = bpy.data.objects['akinza_continuous_construction']
me = skin.data
n = len(me.vertices)
new = np.load(positions)['src'].astype(np.float64)
assert len(new) == n, (len(new), n)
mi = np.linalg.inv(np.array(skin.matrix_world))
me.vertices.foreach_set('co', (new@mi[:3, :3].T+mi[:3, 3]).astype(np.float32).ravel())
me.update()
st = mesh_stats(skin)
assert st['components'] == 1 and st['nonManifoldEdges'] == 0 and st['vertices'] == n, st
bpy.ops.wm.save_as_mainfile(filepath=str(out/'akinza.blend'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out/'akinza.glb'), export_format='GLB')
asm_json = out/'assembly.json'
assembly = json.loads(asm_json.read_text())
assembly['outputs'] = {k: sha(out/k) for k in ('akinza.blend', 'akinza.glb')}
assembly['objects'][skin.name] = st
asm_json.write_text(json.dumps(assembly, indent=2)+'\n')
(out/'legs-tail-apply.json').write_text(json.dumps({'skinAfter': st}, indent=1))
print('LEGS_TAIL_APPLIED', json.dumps(st), flush=True)

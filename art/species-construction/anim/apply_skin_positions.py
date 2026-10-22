"""Write new skin positions (same topology and vertex order) into a copy of the fur-of-record surface, with the fur
carried onto the new skin, and write the rig probe for it.

  run_blender.py apply_skin_positions.py <log> -- <surface dir> <positions npz (src)> <out surface dir> <out probe dir>
      [--max-move 0.03]

The skin object akinza_continuous_construction gets the new positions; every strand of the fur keeps its root
triangle and its points in that triangle's frame (fur_bind: bound to the old skin, rebuilt on the new one), so
the groom and the culls stay strand for strand. Fails if the vertex count differs or any vertex moves more than
--max-move (source units). Writes <out surface dir>/surface.blend (copying the other files of the surface dir that
the renders read) and <out probe dir>/skin.npz (verts, tris, mat, edges as probe_skin writes them) plus the probe's
objects.json.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fur_bind  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('surface', type=Path)
p.add_argument('positions', type=Path)
p.add_argument('out', type=Path)
p.add_argument('probe', type=Path)
p.add_argument('--probe-src', type=Path, default=None, help='probe dir whose objects.json and mat to copy')
p.add_argument('--max-move', type=float, default=.03)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
a.out.mkdir(parents=True, exist_ok=True)
a.probe.mkdir(parents=True, exist_ok=True)
for f in a.surface.iterdir():
    if f.is_file() and f.name != 'surface.blend':
        shutil.copyfile(f, a.out/f.name)
bpy.ops.wm.open_mainfile(filepath=str(a.surface/'surface.blend'))
skin = bpy.data.objects['akinza_continuous_construction']
fur = bpy.data.objects.get('Akinza fur')
n = len(skin.data.vertices)
new = np.load(a.positions)['src'].astype(np.float64)
assert len(new) == n, (len(new), n)
mw = np.array(skin.matrix_world)
co = np.empty(n*3, np.float32)
skin.data.vertices.foreach_get('co', co)
old = co.reshape(-1, 3).astype(np.float64)@mw[:3, :3].T+mw[:3, 3]
move = np.linalg.norm(new-old, axis=1)
if move.max() > a.max_move:
    raise SystemExit(f'a vertex moves {move.max():.4f} > {a.max_move}')
skin.data.calc_loop_triangles()
tri = np.empty(len(skin.data.loop_triangles)*3, np.int32)
skin.data.loop_triangles.foreach_get('vertices', tri)
tri = tri.reshape(-1, 3)
if fur is not None:
    b = fur_bind.bind(old, tri, fur)
    fur_bind.write(b, fur_bind.rebuild(b, new))
mi = np.linalg.inv(mw)
skin.data.vertices.foreach_set('co', (new@mi[:3, :3].T+mi[:3, 3]).astype(np.float32).ravel())
skin.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str((a.out/'surface.blend').resolve()))
src_probe = a.probe_src
ed = np.empty(len(skin.data.edges)*2, np.int32)
skin.data.edges.foreach_get('vertices', ed)
mat = np.zeros(len(tri), np.int32)
if src_probe and (src_probe/'skin.npz').exists():
    mat = np.load(src_probe/'skin.npz')['mat']
    if (src_probe/'objects.json').exists():
        shutil.copyfile(src_probe/'objects.json', a.probe/'objects.json')
np.savez_compressed(a.probe/'skin.npz', verts=new.astype(np.float32), tris=tri, mat=mat, edges=ed.reshape(-1, 2))
rec = dict(surface=str(a.surface), positions=str(a.positions), movedVertices=int((move > 1e-6).sum()),
           maxMove=float(move.max()), furStrands=len(fur.data.curves) if fur else 0)
(a.out/'skin-positions.json').write_text(json.dumps(rec, indent=1))
print('APPLIED', json.dumps(rec))

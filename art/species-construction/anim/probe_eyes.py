"""Export the eye parts of the fur of record at rest (sprites pass 1, the eye socket fix). No render, no fur.

  run_blender.py probe_eyes.py <log> -- <surface dir> <out dir>

Writes <out>/eyes.npz: for each eye globe, iris-and-pupil, catch light and eyeliner ribbon object, its world vertices
(`<name>__v`), triangles (`<name>__t`) and per-vertex normals (`<name>__n`), plus <out>/eyes.json (names, counts,
materials, bounds). The eye parts follow the head bone rigidly (clip_frames.py), so their posed positions are the head
bone's transform of these rest positions.
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np

src, out = [Path(x) for x in sys.argv[sys.argv.index('--')+1:][:2]]
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src/'surface.blend'))
arrays, info = {}, []
for o in bpy.data.objects:
    if o.type != 'MESH' or not any(k in o.name for k in ('eye_globe', 'iris_and_pupil')):
        continue
    m = o.data
    mw = np.array(o.matrix_world)
    co = np.empty(len(m.vertices)*3, np.float32)
    m.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)@mw[:3, :3].T+mw[:3, 3]
    nr = np.empty(len(m.vertices)*3, np.float32)
    m.vertices.foreach_get('normal', nr)
    nr = nr.reshape(-1, 3).astype(np.float64)@np.linalg.inv(mw[:3, :3])
    nr /= np.maximum(np.linalg.norm(nr, axis=1, keepdims=True), 1e-12)
    m.calc_loop_triangles()
    tri = np.empty(len(m.loop_triangles)*3, np.int32)
    m.loop_triangles.foreach_get('vertices', tri)
    arrays[o.name+'__v'] = co
    arrays[o.name+'__n'] = nr
    arrays[o.name+'__t'] = tri.reshape(-1, 3)
    info.append(dict(name=o.name, vertices=len(co), triangles=len(tri)//3, hide_render=o.hide_render,
                     materials=[x.name if x else None for x in m.materials], bounds=[co.min(0).tolist(), co.max(0).tolist()]))
np.savez_compressed(out/'eyes.npz', **arrays)
(out/'eyes.json').write_text(json.dumps(info, indent=1))
print('EYES_DONE', [i['name'] for i in info])

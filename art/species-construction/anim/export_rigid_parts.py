"""Export the rigid parts that clip_frames.py poses on a bone (claws, eyes, nose, mouth) as numpy arrays, so the batch 3
clip builders and checks can pose them without Blender (clip set batch 3: the hind claws against the floor on the toe-pad
pivot, the fore claw tips for the strike reach).

  run_blender.py export_rigid_parts.py <log> -- <surface dir> <rig dir> <out npz>

Every mesh object of the surface file except the skin, in rig metres (rig.json's transform), with the bone clip_frames.py
gives it (fore claw: hand.<side>, hind claw: foot.<side>, anything else: head; side L if '+1' is in the name). Writes
<out npz> with one array per part (`P_<k>`), and <out npz>.json with each part's name, bone and vertex count.
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np

a = sys.argv[sys.argv.index('--')+1:]
surface, rig_dir, out = Path(a[0]), Path(a[1]), Path(a[2])
rig = json.loads((rig_dir/'rig.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
bpy.ops.wm.open_mainfile(filepath=str(surface/'surface.blend'))
skin = bpy.data.objects['akinza_continuous_construction']
arrays, meta = {}, []
for k, o in enumerate(sorted((o for o in bpy.data.objects if o.type == 'MESH' and o is not skin), key=lambda o: o.name)):
    c = np.empty(len(o.data.vertices)*3, np.float32)
    o.data.vertices.foreach_get('co', c)
    m = np.array(o.matrix_world)
    X = c.reshape(-1, 3).astype(np.float64)@m[:3, :3].T+m[:3, 3]
    nm = o.name.lower()
    side = 'L' if '+1' in nm else 'R'
    bone = f'hand.{side}' if 'fore claw' in nm else f'foot.{side}' if 'hind claw' in nm else 'head'
    arrays[f'P_{k}'] = s*(X-off)
    meta.append(dict(key=f'P_{k}', name=o.name, bone=bone, vertices=len(X)))
out.parent.mkdir(parents=True, exist_ok=True)
np.savez(out, **arrays)
Path(str(out)+'.json').write_text(json.dumps(meta, indent=1))
print('exported', len(meta), 'parts:', [(m['name'], m['bone'], m['vertices']) for m in meta])
print('EXPORT_DONE')

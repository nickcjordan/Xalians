import bpy,json,numpy as np
from pathlib import Path
out=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-hindpaw/pass1')
for tag,path in [('approved','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/revert-forelegs/luceras_sculpt.blend'),('generated','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-compare/generated.blend')]:
 bpy.ops.wm.open_mainfile(filepath=path)
 data=[]
 for o in bpy.data.objects:
  if o.type!='MESH':continue
  p=np.array([o.matrix_world@v.co for v in o.data.vertices])
  data.append(dict(name=o.name,verts=len(p),faces=len(o.data.polygons),lo=p.min(0).tolist(),hi=p.max(0).tolist(),matrix=[list(r) for r in o.matrix_world],modifiers=[(m.name,m.type) for m in o.modifiers],shape_keys=list(o.data.shape_keys.key_blocks.keys()) if o.data.shape_keys else []))
  if len(p)>10000:
   np.savez_compressed(out/(tag+'_mesh.npz'),co=p,edges=np.array([e.vertices[:] for e in o.data.edges]),tri=np.array([t.vertices[:] for t in o.data.loop_triangles]) if o.data.loop_triangles else np.empty((0,3)))
 (out/(tag+'_inventory.json')).write_text(json.dumps(data,indent=2))
 print(tag,json.dumps(data))

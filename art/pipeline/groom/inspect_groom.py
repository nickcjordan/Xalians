import bpy,json,numpy as np
from pathlib import Path
out=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass1')
r={}
for label,path in [('sculpt','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/revert-forelegs/luceras_sculpt.blend'),('surface','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-surface/pass3/surface.blend')]:
 bpy.ops.wm.open_mainfile(filepath=path)
 data=[]
 for o in bpy.data.objects:
  d={'name':o.name,'type':o.type,'hide':o.hide_render,'matrix':[list(row) for row in o.matrix_world]}
  if o.type=='MESH':
   co=np.array([o.matrix_world@v.co for v in o.data.vertices]);d.update(vertices=len(co),polygons=len(o.data.polygons),bounds=[co.min(0).tolist(),co.max(0).tolist()],materials=[m.name if m else None for m in o.data.materials],uv=[u.name for u in o.data.uv_layers],attributes=[a.name for a in o.data.attributes])
  data.append(d)
 r[label]=data
(out/'inspection.json').write_text(json.dumps(r,indent=2))
print(json.dumps(r))

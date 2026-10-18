import bpy,json,numpy as np
bpy.ops.wm.open_mainfile(filepath='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass5/groom.blend')
r=[]
for o in bpy.context.scene.objects:
 if o.type in ['MESH','CURVES']:
  r.append({'name':o.name,'type':o.type,'modifiers':[(m.name,m.type) for m in o.modifiers],'matrix':[list(v) for v in o.matrix_world],'materials':[m.name for m in o.data.materials],'bounds':[list(v) for v in o.bound_box] if o.type=='MESH' else None})
open('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass6/inspection.json','w').write(json.dumps(r,indent=2))

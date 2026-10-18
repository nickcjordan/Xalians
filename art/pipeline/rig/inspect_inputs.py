import bpy,json,hashlib
from pathlib import Path
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-rig/pass1')
r={}
for label,path in [('game','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6/gamemesh.blend'),('sculpt','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/revert-forelegs/luceras_sculpt.blend')]:
 bpy.ops.wm.open_mainfile(filepath=path)
 objs=[]
 for o in bpy.context.scene.objects:
  d=dict(name=o.name,type=o.type,parent=o.parent.name if o.parent else None,parent_type=o.parent_type,parent_bone=o.parent_bone,matrix=[list(row) for row in o.matrix_world])
  if o.type=='MESH':
   o.data.calc_loop_triangles();d.update(vertices=len(o.data.vertices),triangles=len(o.data.loop_triangles),groups=[g.name for g in o.vertex_groups],modifiers=[(m.name,m.type) for m in o.modifiers],bounds=[list(p) for p in o.bound_box])
  if o.type=='ARMATURE':d['bones']=[dict(name=b.name,head=list(b.head_local),tail=list(b.tail_local),parent=b.parent.name if b.parent else None,deform=b.use_deform) for b in o.data.bones]
  objs.append(d)
 r[label]=dict(sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),objects=objs)
(O/'source_inspection.json').write_text(json.dumps(r,indent=2))

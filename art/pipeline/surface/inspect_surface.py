import bpy,json
from pathlib import Path
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-surface/pass1')
bpy.ops.wm.open_mainfile(filepath='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6/gamemesh.blend')
data=[]
for o in bpy.data.objects:
 d={'name':o.name,'type':o.type,'location':list(o.location),'hide':o.hide_render}
 if o.type=='MESH':
  o.data.calc_loop_triangles();pts=[o.matrix_world@v.co for v in o.data.vertices]
  d.update(vertices=len(pts),triangles=len(o.data.loop_triangles),bounds=[[min(p[i] for p in pts),max(p[i] for p in pts)] for i in range(3)],materials=[m.name for m in o.data.materials],uvs=[x.name for x in o.data.uv_layers],groups=[g.name for g in o.vertex_groups])
  d['uv_bounds']=[[min(l.uv[i] for l in o.data.uv_layers.active.data),max(l.uv[i] for l in o.data.uv_layers.active.data)] for i in range(2)]
 if o.type=='ARMATURE':d['bones']=[{'name':b.name,'head':list(b.head_local),'tail':list(b.tail_local)} for b in o.data.bones]
 data.append(d)
(P/'input_inspection.json').write_text(json.dumps(data,indent=2))
print(json.dumps(data,indent=2))

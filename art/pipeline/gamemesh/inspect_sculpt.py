import bpy,bmesh,json,hashlib
from pathlib import Path
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');O.mkdir(exist_ok=True)
def stat(o):
 d={'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'parent_bone':o.parent_bone}
 if o.type=='MESH':
  m=o.data;m.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(m)
  inf=[sum(g.weight>1e-8 for g in v.groups) for v in m.vertices]
  d.update(vertices=len(m.vertices),triangles=len(m.loop_triangles),non_manifold_edges=sum(not e.is_manifold for e in bm.edges),max_influences=max(inf,default=0),unweighted_vertices=inf.count(0),modifiers=[{'name':x.name,'type':x.type} for x in o.modifiers],bounds=[list(v) for v in o.bound_box]);bm.free()
 return d
r={'blender':bpy.app.version_string,'objects':[stat(o) for o in bpy.data.objects],'bones':[b.name for o in bpy.data.objects if o.type=='ARMATURE' for b in o.data.bones]}
r['unexpected_objects']=[o.name for o in bpy.data.objects if o.name!='luceras_blockout' and o.type!='ARMATURE' and not any(k in o.name for k in ['horn','eye','whisker','claw'])]
r['source_sha256']=hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest()
(O/'sculpt_check.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
print('QUAD',bpy.ops.object.quadriflow_remesh.get_rna_type().properties.keys())

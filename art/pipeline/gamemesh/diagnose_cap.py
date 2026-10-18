import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');b=bpy.data.objects['luceras_blockout'];bm=bmesh.new();bm.from_mesh(b.data)
for v in bm.verts:
 if v.is_boundary:v.co.x=0
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002)
bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges))
bad={f for e in bm.edges if len(e.link_faces)>2 for f in e.link_faces};bmesh.ops.delete(bm,geom=list(bad),context='FACES_ONLY')
wire=[e for e in bm.edges if e.is_wire]
if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
r={'removed_bad_faces':len(bad),'before_fill':sum(not e.is_manifold for e in bm.edges)}
fill=bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
r['after_holes_fill']=sum(not e.is_manifold for e in bm.edges)
if r['after_holes_fill']:
 res=bmesh.ops.triangle_fill(bm,edges=[e for e in bm.edges if e.is_boundary],normal=Vector((1,0,0)),use_beauty=True,use_dissolve=False)
r['after_triangle_fill']=sum(not e.is_manifold for e in bm.edges)
r['remaining_edge_face_counts']=[len(e.link_faces) for e in bm.edges if not e.is_manifold]
for step in range(4):
 wire=[e for e in bm.edges if e.is_wire]
 if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
 bad={f for e in bm.edges if len(e.link_faces)>2 for f in e.link_faces}
 if bad:bmesh.ops.delete(bm,geom=list(bad),context='FACES_ONLY')
 bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
 r['step_'+str(step)]=sum(not e.is_manifold for e in bm.edges)
(p/'iter2_cap_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)

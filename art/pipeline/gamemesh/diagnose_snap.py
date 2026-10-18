import bpy,bmesh,json
from pathlib import Path
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');b=bpy.data.objects['luceras_blockout'];bm=bmesh.new();bm.from_mesh(b.data)
for v in bm.verts:
 if v.is_boundary:v.co.x=0
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002)
bm.verts.ensure_lookup_table();bm.verts.index_update();seen=set();duplicates=[]
for f in bm.faces:
 key=tuple(sorted(v.index for v in f.verts))
 if key in seen:duplicates.append(f)
 seen.add(key)
if duplicates:bmesh.ops.delete(bm,geom=duplicates,context='FACES_ONLY')
bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges))
wire=[e for e in bm.edges if e.is_wire]
if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
r={'after_snap_weld':sum(not e.is_manifold for e in bm.edges),'boundary':sum(e.is_boundary for e in bm.edges),'duplicate_faces':len(duplicates)}
fill=bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));r['after_fill']=sum(not e.is_manifold for e in bm.edges);r['filled_faces']=len(fill['faces'])
(p/'iter2_snap_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)

import bpy,bmesh,json
from pathlib import Path
from mathutils import Matrix
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');b=bpy.data.objects['luceras_blockout'];bm=bmesh.new();bm.from_mesh(b.data)
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-8,plane_co=(.0003,0,0),plane_no=(1,0,0),clear_inner=True,clear_outer=False)
for v in bm.verts:
 if v.is_boundary:v.co.x=0
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
res=bmesh.ops.duplicate(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces));vs=[v for v in res['geom'] if isinstance(v,bmesh.types.BMVert)];bmesh.ops.scale(bm,vec=(-1,1,1),verts=vs)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
r={'nonmanifold':sum(not e.is_manifold for e in bm.edges),'nonmanifold_vertices':sum(not v.is_manifold for v in bm.verts),'faces':len(bm.faces),'vertices':len(bm.verts)}
(p/'iter2_rebuild_seam_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)

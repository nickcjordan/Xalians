import bpy,bmesh,json
from pathlib import Path
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');b=bpy.data.objects['luceras_blockout'];bm=bmesh.new();bm.from_mesh(b.data)
r={}
for dist in [0,.0000001,.000001,.00002,.0001]:
 if dist:bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=dist)
 es=[e for e in bm.edges if not e.is_manifold];vs={v for e in es for v in e.verts}
 r[str(dist)]={'nonmanifold':len(es),'boundary':sum(e.is_boundary for e in es),'x_range':[min(abs(v.co.x) for v in vs),max(abs(v.co.x) for v in vs)] if vs else [],'verts':len(bm.verts),'faces':len(bm.faces)}
bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges));result=bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
r['fill']={'new_faces':len(result['faces']),'nonmanifold':sum(not e.is_manifold for e in bm.edges),'boundary':sum(e.is_boundary for e in bm.edges)}
(p/'iter2_raw_topology_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)

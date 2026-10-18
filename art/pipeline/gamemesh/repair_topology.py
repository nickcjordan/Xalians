import bpy,bmesh,json
from pathlib import Path
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');b=bpy.data.objects['game_body'];bm=bmesh.new();bm.from_mesh(b.data)
def stats():
 e=[e for e in bm.edges if not e.is_manifold];v={v for e in e for v in e.verts}
 return {'nonmanifold':len(e),'boundary':sum(e.is_boundary for e in e),'boundary_abs_x_range':[min(abs(v.co.x) for v in v),max(abs(v.co.x) for v in v)] if v else [],'vertices':len(bm.verts),'faces':len(bm.faces)}
r={'before':stats()}
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));r['after_weld']=stats()
(p/'iter2_topology_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)
bm.to_mesh(b.data);bm.free();b.data.update();bpy.ops.wm.save_as_mainfile(filepath=str(p/'iter2_repaired.blend'))

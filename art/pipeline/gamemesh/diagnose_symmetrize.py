import bpy,bmesh,json
from pathlib import Path
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1');b=bpy.data.objects['luceras_blockout'];r={}
for dist in [.00001,.0001,.0003,.0005,.001]:
 bm=bmesh.new();bm.from_mesh(b.data)
 bmesh.ops.symmetrize(bm,input=list(bm.verts)+list(bm.edges)+list(bm.faces),direction='-X',dist=dist)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=dist)
 bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges))
 fill=bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
 r[str(dist)]={'nonmanifold':sum(not e.is_manifold for e in bm.edges),'boundary':sum(e.is_boundary for e in bm.edges),'faces':len(bm.faces),'filled':len(fill['faces'])};bm.free()
(p/'iter2_symmetrize_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)


import bpy,bmesh,json
from pathlib import Path
from mathutils.bvhtree import BVHTree
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh')
bpy.ops.wm.open_mainfile(filepath=str(P/'pass5/gamemesh.blend'))
o=bpy.data.objects['game_body_horns_claws'];bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table();bm.edges.ensure_lookup_table();bm.normal_update()
r={'bad_edges':[{'id':e.index,'verts':[(v.index,list(v.co)) for v in e.verts],'faces':[(f.index,list(f.calc_center_median()),f.calc_area()) for f in e.link_faces]} for e in bm.edges if not e.is_manifold], 'folds':[{'id':e.index,'dot':e.link_faces[0].normal.dot(e.link_faces[1].normal),'verts':[(v.index,list(v.co)) for v in e.verts],'faces':[f.index for f in e.link_faces]} for e in bm.edges if e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.2]}
tree=BVHTree.FromBMesh(bm);pairs=tree.overlap(tree);r['intersections']=[(a,b,list(bm.faces[a].calc_center_median()),list(bm.faces[b].calc_center_median())) for a,b in pairs if a<b and not set(bm.faces[a].verts)&set(bm.faces[b].verts)]
(P/'pass6/iter1_diagnosis.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))

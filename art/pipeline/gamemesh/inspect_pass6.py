import bpy,bmesh,json
from pathlib import Path
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh');bpy.ops.wm.open_mainfile(filepath=str(P/'pass5/gamemesh.blend'));o=bpy.data.objects['game_body_horns_claws'];bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table();bm.normal_update()
for ids in ([137,138,141],[2726,2964,2966,2958]):
 for i in ids:
  v=bm.verts[i];print('VERT',i,list(v.co),'edges',len(v.link_edges),'faces',[(f.index,[v.index for v in f.verts],list(f.normal),f.calc_area()) for f in v.link_faces])
print('ALL_INVERTED_ISLAND_FACES',[(f.index,[v.index for v in f.verts],list(f.calc_center_median()),f.calc_area()) for f in bm.faces if all(e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.8 for e in f.edges)])

import bpy,bmesh,sys,json
from pathlib import Path
HERE=Path(__file__).parent;sys.path.insert(0,str(HERE));import build_pass1 as g
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6');bpy.ops.wm.open_mainfile(filepath=str(P/'iter4_baked.blend'));o=bpy.data.objects['game_body'];rig=bpy.data.objects['luceras_rig'];result={}
for pose,fn in g.block.POSES.items():
 fn(g.clips.Poser(rig),rig);bpy.context.view_layer.update();ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());bm=bmesh.new();bm.from_mesh(ev.data);bm.normal_update();record={}
 for side in (-1,1):
  faces=[f for f in bm.faces if all(.04<side*o.data.vertices[v.index].co.x<.17 and .12<o.data.vertices[v.index].co.y<.30 and .3<o.data.vertices[v.index].co.z<.56 for v in f.verts)]
  edges={e for f in faces for e in f.edges};record['left' if side==1 else 'right']={'faces':len(faces),'zero_area_faces':sum(f.calc_area()<1e-14 for f in faces),'fully_reversed_face_fans':sum(all(e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.7 for e in f.edges) for f in faces),'near_opposed_edge_count':sum(e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.8 for e in edges)}
 result[pose]=record;bm.free()
(P/'bilateral_thigh_pose_scan.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))

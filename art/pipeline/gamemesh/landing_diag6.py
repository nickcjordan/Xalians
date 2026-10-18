import bpy,bmesh,sys,json
from pathlib import Path
HERE=Path(__file__).parent;sys.path.insert(0,str(HERE));import build_pass1 as g
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6');bpy.ops.wm.open_mainfile(filepath=str(P/'iter4_baked.blend'));o=bpy.data.objects['game_body'];rig=bpy.data.objects['luceras_rig'];g.block.POSES['landing'](g.clips.Poser(rig),rig);bpy.context.view_layer.update();ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());bm=bmesh.new();bm.from_mesh(ev.data);bm.normal_update();rest=bmesh.new();rest.from_mesh(o.data);rest.verts.ensure_lookup_table();bm.verts.ensure_lookup_table();r=[]
for f in bm.faces:
 if all(e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.7 for e in f.edges):
  p=sum((o.data.vertices[v.index].co for v in f.verts),g.Vector())/len(f.verts)
  if p.y>.1 and p.y<.35 and p.z>.3:r.append({'face':f.index,'rest_center':list(p),'verts':[{'index':v.index,'rest':list(rest.verts[v.index].co),'valence':len(rest.verts[v.index].link_edges)} for v in f.verts]})
(P/'landing_diagnosis.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))

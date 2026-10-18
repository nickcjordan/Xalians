"""Read-only late diagnostics on frozen candidate4, no mesh edits."""
import bpy,bmesh,json,sys,hashlib
from pathlib import Path
HERE=Path(__file__).parent;sys.path.insert(0,str(HERE));import build_pass1 as g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass5');g.ITERATION=4;g.OUT=g.IterationOutput(str(OUT))
frozen=hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest();records={}
for name in ('iter2_mesh.blend','gamemesh.blend','iter4_baked.blend'):
 bpy.ops.wm.open_mainfile(filepath=str(OUT/name));obj=bpy.data.objects.get('game_body') or bpy.data.objects['game_body_horns_claws'];bm=bmesh.new();bm.from_mesh(obj.data)
 records[name]={'non_manifold_edges':[{'verts':[list(v.co) for v in e.verts],'length_m':e.calc_length(),'faces':len(e.link_faces),'boundary':e.is_boundary,'wire':e.is_wire} for e in bm.edges if not e.is_manifold],'zero_area_faces':sum(f.calc_area()<1e-14 for f in bm.faces),'inconsistent_edges':sum(not e.is_contiguous for e in bm.edges if e.is_manifold)};bm.free()
# Render the same frozen geometry with normal map disconnected to isolate mesh faults.
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter4_baked.blend'));g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16
mat=bpy.data.materials['Luceras_body'];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for link in list(bs.inputs['Normal'].links):mat.node_tree.links.remove(link)
g.visible('game')
views=g.cameras();views['ear_three_quarter']=((g.Vector((.035,-.210,.585)),g.Vector((.105,-.115,.655))),45,12)
for view in ('full_side','ear_three_quarter'):
 box,az,el=views[view];cam=g.lookdev.place_camera('lookdev_diagnosis',box,az,el,.04);g.lookdev.render(cam,OUT/f'iter4_no_normal_{view}.png',size=768)
records['frozen_blend_sha256']=frozen;records['frozen_blend_unchanged']=hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()==frozen
(OUT/'final_diagnosis.json').write_text(json.dumps(records,indent=2));print('FINAL_DIAGNOSIS',json.dumps(records),flush=True)

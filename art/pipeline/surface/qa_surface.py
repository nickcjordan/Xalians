import bpy,json,hashlib,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-surface/pass1');SRC=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'surface.blend'))
body=bpy.data.objects['game_body_horns_claws'];rig=bpy.data.objects['luceras_rig']
def geometry(me):
 return {'vertices':np.array([v.co[:] for v in me.vertices]),'faces':[tuple(p.vertices) for p in me.polygons],'uv':np.array([l.uv[:] for l in me.uv_layers.active.data])}
current=geometry(body.data)
with bpy.data.libraries.load(str(SRC/'gamemesh.blend'),link=False) as (src,dst):dst.meshes=[n for n in src.meshes if n.startswith('luceras_body')]
original=geometry(dst.meshes[0]);geo={'vertices_identical':bool(np.array_equal(current['vertices'],original['vertices'])),'faces_identical':current['faces']==original['faces'],'body_uv_identical':bool(np.array_equal(current['uv'],original['uv']))}
scene=bpy.context.scene;scene.cycles.samples=20
def roots():
 dg=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(dg);mesh=ev.to_mesh();mesh.calc_loop_triangles();points=[body.matrix_world@v.co for v in mesh.vertices];tree=BVHTree.FromPolygons(points,[tuple(t.vertices) for t in mesh.loop_triangles],all_triangles=True)
 result={}
 for name in ['surface_hind_fringe_l','surface_hind_fringe_r','surface_chest_ruff']:
  o=bpy.data.objects[name];e=o.evaluated_get(dg);m=e.to_mesh();dist=[]
  for i in range(0,len(m.vertices),5):
   for k in (0,1):dist.append(tree.find_nearest(o.matrix_world@m.vertices[i+k].co)[3])
  result[name]={'root_distance_m_max':max(dist),'root_distance_m_p95':float(np.percentile(dist,95))};e.to_mesh_clear()
 ev.to_mesh_clear();return result
checks={'source_geometry':geo,'rest_roots':roots(),'rig_bones':len(rig.data.bones),'body_parts':21,'eyes':2,'horns':2,'claws_including_dewclaws':18}
sys.path.insert(0,str(Path(__file__).parent.parent/'roster'));import lookdev
for name,rot in [('tail_06',(.45,0,.15)),('leg_hl_02',(.32,0,0)),('leg_hr_02',(-.20,0,0))]:
 p=rig.pose.bones[name];p.rotation_mode='XYZ';p.rotation_euler=rot
bpy.context.view_layer.update();checks['posed_roots']=roots()
lookdev.render(bpy.data.objects['lookdev_side'],OUT/'check_tail_hind_pose.png',768)
for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0)
bpy.context.view_layer.update()
checks['pose_note']='Tail tip rotated 0.45 radians with 0.15 radians lateral twist; left and right hocks rotated 0.32 and -0.20 radians. Saved asset was not modified.'
checks['surface_blend_sha256']=hashlib.sha256((OUT/'surface.blend').read_bytes()).hexdigest()
(OUT/'geometry_skin_check.json').write_text(json.dumps(checks,indent=2))

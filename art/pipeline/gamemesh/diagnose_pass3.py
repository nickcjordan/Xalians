import sys,json,os,runpy
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3');g.OUT=g.IterationOutput(str(OUT));g.ITERATION=1
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_review.blend'))
low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset()
bm=bmesh.new();bm.from_mesh(src.data);bad=sum(e.is_manifold and not e.is_contiguous for e in bm.edges);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));tree=BVHTree.FromBMesh(bm);bm.free()
bm=bmesh.new();bm.from_mesh(low.data);faces=[]
for f in bm.faces:
 c=f.calc_center_median();hit=tree.find_nearest(c)
 if .0<c.y<.30 and c.z>.25 and hit and f.normal.dot(hit[1])<0:
  faces.append({'index':f.index,'center':list(c),'dot':f.normal.dot(hit[1]),'area':f.calc_area()})
g.write('iter1_diagnosis.json',{'source_inconsistent_winding_edges':bad,'hip_opposed_faces':faces});bm.free()
mat=bpy.data.materials['Luceras_body'];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for l in list(bs.inputs['Normal'].links):mat.node_tree.links.remove(l)
g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16;g.visible('game')
center=rig.data.bones['leg_hl_01'].head_local;r=Vector((.105,.105,.105));cam=g.lookdev.place_camera('lookdev_diag',(center-r,center+r),90,0,.04);g.lookdev.render(cam,OUT/'iter1_hip_without_normal.png',size=512)
os.environ['GM_ITERATION']='1';sys.argv=[sys.argv[0],'--','--stage','hold'];runpy.run_path(str(Path(__file__).with_name('build_gamemesh.py')),run_name='__main__')

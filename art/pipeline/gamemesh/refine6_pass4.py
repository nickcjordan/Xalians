"""Final local tail thickness fit after the accepted bounded relaxation."""
import sys,os,json,time,runpy
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent));import build_pass2 as p2
from build_pass2 import g
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass4');g.ITERATION=6;g.OUT=g.IterationOutput(str(O));p2.OUT=g.OUT
bpy.ops.wm.open_mainfile(filepath=str(O/'iter5_mesh.blend'));low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset();src.data.calc_loop_triangles();pts=np.array([v.co[:] for v in src.data.vertices]);tri=np.array([t.vertices[:] for t in src.data.loop_triangles]);moves=[]
for v in low.data.vertices:
 p=v.co.copy();centerz=.4884-(p.y-.32)*1.2
 if not (.325<p.y<.390 and abs(p.x)<.017 and abs(p.z-centerz)<.028):continue
 loop=p2.section(pts,tri,Vector((0,1,0)),Vector(),p.y,np.array((0,p.y,centerz)))
 if np.ptp(loop[:,2])>.07:continue
 center=(loop.min(0)+loop.max(0))/2;angle=np.arctan2(loop[:,2]-center[2],loop[:,0]-center[0]);order=np.argsort(angle);aa=angle[order];pp=loop[order];aa=np.r_[aa[-1]-2*np.pi,aa,aa[0]+2*np.pi];pp=np.vstack([pp[-1],pp,pp[0]]);t=np.arctan2(p.z-center[2],p.x-center[0]);q=Vector((float(np.interp(t,aa,pp[:,0])),p.y,float(np.interp(t,aa,pp[:,2]))));delta=q-p
 if delta.length>.006:q=p+delta.normalized()*.006
 v.co=q;moves.append((q-p).length)
# Fit both sides of the root shelf vertically into the actual sculpt notch.
sb=bmesh.new();sb.from_mesh(src.data);tree=BVHTree.FromBMesh(sb);sb.free();earmoves=[]
for v in low.data.vertices:
 p=v.co.copy();origin,axis,across,depth=p2.ear_frame(1 if p.x>0 else -1);q=p-origin;h=q.dot(axis)
 if not (abs(p.x)>.023 and -.012<h<.030 and q.dot(across)<.002 and abs(q.dot(across))<.035 and -.027<q.dot(depth)<.036):continue
 hit=tree.ray_cast(Vector((p.x,p.y,.680)),Vector((0,0,-1)),.15)
 if hit[0] is not None and .001<p.z-hit[0].z<.045:
  v.co=hit[0];earmoves.append((v.co-p).length)
low.data.update()
for m in list(low.modifiers):low.modifiers.remove(m)
m=low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(low,m);g.normalize(low,rig);m=low.modifiers.new('rig','ARMATURE');m.object=rig
record=json.loads((O/'iter5_mesh.json').read_text());record['repairs']['tail_root']['thickness_fit']={'vertices':len(moves),'max_move_m':max(moves,default=0),'mean_move_m':float(np.mean(moves)) if moves else 0,'method':'Source radial sections only inside the detached tail tube, y .325 to .390, bounded at 6 mm.'};record['repairs']['ear_root']['vertical_notch_fit']={'vertices':len(earmoves),'max_move_m':max(earmoves,default=0)};g.write('iter1_mesh.json',record);assert g.manifold(low)==0
bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_mesh.blend'));g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=12
center=rig.data.bones['tail_01'].head_local;box=(center-Vector((.105,.105,.105)),center+Vector((.105,.105,.105)));cam=g.lookdev.place_camera('lookdev_tail',box,90,0,.04)
for variant in ('sculpt','game'):
 g.visible(variant);g.lookdev.render(cam,g.OUT/f'iter1_pre_{variant}_tail.png',size=512)
for view in ('ear_side','ear_three_quarter'):
 box,az,el=p2.cameras()[view];cam=g.lookdev.place_camera('lookdev_ear',box,az,el,.04)
 for variant in ('sculpt','game'):
  g.visible(variant);g.lookdev.render(cam,g.OUT/f'iter1_pre_{variant}_{view}.png',size=512)
request=O/'next_stage.json';deadline=time.time()+150;print('REVIEW_WINDOW',flush=True)
while time.time()<deadline and not request.exists():time.sleep(.5)
if request.exists():
 cfg=json.loads(request.read_text());request.unlink();os.environ['GM_ITERATION']=str(cfg.get('iteration',6));sys.argv=[sys.argv[0],'--','--stage',cfg.get('stage','bake_render')];runpy.run_path(str(Path(__file__).with_name(cfg.get('script','build_gamemesh.py'))),run_name='__main__')

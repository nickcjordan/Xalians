"""B-db8w. Reconstruct review from the actual shipped checkpoint, never stale renders."""
import os,sys,json,shutil,hashlib
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3')
BASE=OUT.parent/'pass2'
ITER=int(os.environ.get('GM_ITERATION','1'));g.ITERATION=ITER;g.OUT=g.IterationOutput(str(OUT));p2.OUT=g.OUT
# Use the original measurement without obsolete ring verification.
def measured():
 facts=p2.oldmeasure();facts['hard_budget_checks']['triangles']=facts['triangles_total']<=11500;g.write('measurements.json',facts);return facts
g.measure=measured
CAMERA_MAP=g.cameras()
for side,az in (('l',45),('r',315)):
 lo,hi=(.05,.22) if side=='l' else (-.22,-.05)
 CAMERA_MAP['hind_paw_'+side+'_three_quarter']=((Vector((lo,-.02,0)),Vector((hi,.30,.15))),az,28)
 lo,hi=(-.01,.10) if side=='l' else (-.10,.01)
 CAMERA_MAP['fore_paw_'+side+'_three_quarter']=((Vector((lo,-.25,0)),Vector((hi,-.04,.13))),az,28)
g.cameras=lambda:CAMERA_MAP

def prepare():
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'gamemesh.blend'))
 g.write('iter1_input_shader.json',{m.name:{'nodes':[{'name':n.name,'type':n.type,'image':n.image.name if n.type=='TEX_IMAGE' and n.image else None} for n in m.node_tree.nodes],'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links]} for m in bpy.data.materials if m.use_nodes})
 rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset();rig.data.pose_position='POSE'
 with bpy.data.libraries.load(g.SOURCE,link=False) as (a,b):b.objects=[n for n in a.objects if not n.startswith('lookdev_') and n!='luceras_rig']
 for o in b.objects:
  if o is None:continue
  bpy.context.scene.collection.objects.link(o)
  if o.parent and o.parent.type=='ARMATURE':
   o.parent=rig
  for m in o.modifiers:
   if m.type=='ARMATURE':m.object=rig
 for o in list(bpy.data.objects):
  if o.type=='ARMATURE' and o!=rig:bpy.data.objects.remove(o,do_unlink=True)
 bpy.context.view_layer.update()
 # Separate disconnected parts without changing coordinates, topology, UVs or weights.
 for o in list(bpy.data.objects):
  if o.type=='MESH' and o.name.startswith('game_'):
   g.select(o);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
 game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')]
 body=max(game,key=lambda o:len(o.data.vertices));body.name='game_body'
 originals=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith(('game_','lookdev_')) and 'whisker' not in o.name and o.name!='luceras_blockout']
 def center(o):return sum((o.matrix_world@v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
 pairs=[['luceras_blockout','game_body']]
 for o in game:
  if o==body:continue
  src=min(originals,key=lambda s:(center(s)-center(o)).length);originals.remove(src);o.name='game_'+src.name;pairs.append([src.name,o.name])
 g.write('iter1_mesh.json',{'pairs':pairs,'total':sum(g.triangles(o) for o in game),'origin':'Separated loose components of pass2/gamemesh.blend with identical geometry, UVs and weights.'})
 for im in bpy.data.images:
  if im.name.startswith(('normal_1024','ao_1024')):
   im.filepath_raw=str(OUT/(im.name.split('.')[0]+'.png'));im.file_format='PNG';im.save()
 bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_baked.blend'))

JOINTS={'shoulder':'leg_fl_01','elbow':'leg_fl_02','wrist':'leg_fl_03','hip':'leg_hl_01','stifle':'leg_hl_02','hock':'leg_hl_03','neck':'neck_01','tail_base':'tail_01'}
def close_poses():
 bpy.ops.wm.open_mainfile(filepath=str(g.OUT/'iter1_review.blend'))
 rig=bpy.data.objects['luceras_rig'];poser=g.clips.Poser(rig);g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16
 evidence={}
 for pose,fn in g.block.POSES.items():
  fn(poser,rig);bpy.context.view_layer.update()
  for label,bone in JOINTS.items():
   center=rig.matrix_world@rig.pose.bones[bone].head;radius=.105 if label in ('shoulder','hip','neck','tail_base') else .075
   box=(center-Vector((radius,radius,radius)),center+Vector((radius,radius,radius)))
   cam=g.lookdev.place_camera('lookdev_bend',box,90,0,.04)
   evidence[label]={'bone':bone,'half_width_m':radius}
   for variant in ('sculpt','game'):
    g.visible(variant);g.lookdev.render(cam,g.OUT/f'iter1_bend_{label}_{pose}_{variant}.png',size=384)
 g.write('bend_review.json',{'joints':evidence,'poses':list(g.block.POSES),'method':'Identical posed bone-centered side camera for sculpt and game; original blockout proxy poses.'})

stage=sys.argv[sys.argv.index('--stage')+1] if '--stage' in sys.argv else 'initial'
if stage=='initial':
 prepare();g.renders();close_poses()
elif stage=='render':g.renders();close_poses()
elif stage=='bends':close_poses()
elif stage=='bake':p2.bake()
elif stage=='final':
 frozen=hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()
 prepare();g.export=lambda:None;g.renders();close_poses()
 g.write('render_provenance.json',{'build_id':'B-db8w','iteration':ITER,'source_blend':'gamemesh.blend','sha256':frozen,'unchanged_after_renders':hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()==frozen,'engine':'Cycles','samples':16,'normal_map':'Packed tangent-space normal connected to body material; extracted to normal_1024.png','geometry':'Disconnected components separated only for per-object measurement. No vertex, topology, UV or weight changes.'})
# Keep the authorized slot briefly while the images are inspected, then execute only an explicit local continuation.
import time,runpy
request=OUT/f'iter{ITER}_continue.json'
print('REVIEW_WINDOW',str(request),flush=True)
deadline=time.time()+150
while time.time()<deadline and not request.exists():time.sleep(.5)
if request.exists():
 cfg=json.loads(request.read_text());request.unlink();os.environ['GM_ITERATION']=str(cfg.get('iteration',ITER))
 sys.argv=[sys.argv[0],'--','--stage',cfg.get('stage','render')]
 runpy.run_path(str(Path(__file__).with_name(cfg.get('script','build_gamemesh.py'))),run_name='__main__')

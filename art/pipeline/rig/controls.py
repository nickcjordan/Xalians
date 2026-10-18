"""Blender-only controls, deterministic action baking and export proof."""
import bpy, sys, math, json, numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0,str(Path(__file__).parent))
import build_rig as r
def property_driver(constraint,owner,key):
 f=constraint.driver_add('influence');d=f.driver;d.type='AVERAGE';v=d.variables.new();v.name='enabled';v.targets[0].id=owner;v.targets[0].data_path='["'+key+'"]'
def enabled(obj,key,value):obj[key]=float(value);obj.update_tag();bpy.context.view_layer.update()
def make_controls(rig):
 ctrl=rig.copy();ctrl.data=rig.data.copy();ctrl.name='Luceras_Controls';ctrl.animation_data_clear()
 coll=bpy.data.collections.new('CONTROLS_BLENDER_ONLY');bpy.context.scene.collection.children.link(coll);coll.objects.link(ctrl)
 ctrl.show_in_front=True;ctrl.display_type='WIRE'
 for b in ctrl.data.bones:b.use_deform=False
 r.select(ctrl);bpy.ops.object.mode_set(mode='EDIT')
 eb=ctrl.data.edit_bones
 def add(name,head,tail,parent='root',matrix=None):
  b=eb.new(name);b.head=head;b.tail=tail;b.parent=eb[parent] if parent else None;b.use_deform=False
  if matrix is not None:b.matrix=matrix;b.length=.055
  return b
 for leg in ('fl','fr','hl','hr'):
  a,b,c=[eb[f'leg_{leg}_{i:02}'] for i in (1,2,3)]
  add('CTRL_foot_'+leg,c.head,c.tail,matrix=c.matrix.copy())
  line=(b.tail-a.head).normalized();d=b.head-a.head;side=(d-line*d.dot(line)).normalized();p=b.head+side*.22
  add('CTRL_pole_'+leg,p,p+Vector((0,0,.055)))
 head=eb['head_01'];p=head.tail+(head.tail-head.head).normalized()*.3
 add('CTRL_head_look',p,p+Vector((0,0,.06)))
 for i in (1,3,5):
  b=eb[f'tail_{i:02}'];add(f'CTRL_tail_{(i+1)//2:02}',b.head,b.tail,matrix=b.matrix.copy())
 bpy.ops.object.mode_set(mode='OBJECT')
 ctrl['leg_ik']=0.;ctrl['head_look']=0.;ctrl['tail_controls']=0.
 ctrl['root_control']='root';ctrl['body_control']='spine_01';ctrl['ear_controls']='ear_l_01, ear_r_01'
 for b in ctrl.data.bones:
  try:b.color.palette='THEME04' if b.name.startswith('CTRL_') else 'THEME03'
  except:pass
 calibration={}
 for leg in ('fl','fr','hl','hr'):
  pb=ctrl.pose.bones[f'leg_{leg}_02'];c=pb.constraints.new('IK');c.name='Leg IK';c.target=ctrl;c.subtarget='CTRL_foot_'+leg;c.pole_target=ctrl;c.pole_subtarget='CTRL_pole_'+leg;c.chain_count=2;c.use_stretch=False;c.iterations=64
  # Calibrate the pole rotation against the inherited rest bend plane.
  best=None
  for step in range(72):
   angle=-math.pi+step*math.pi/36;c.pole_angle=angle;bpy.context.view_layer.update()
   err=sum(np.linalg.norm(np.array(ctrl.pose.bones[f'leg_{leg}_{i:02}'].matrix)-np.array(ctrl.data.bones[f'leg_{leg}_{i:02}'].matrix_local)) for i in (1,2))
   if best is None or err<best[0]:best=(float(err),angle)
  for radius in (math.radians(5),math.radians(.25)):
   center=best[1]
   for step in range(41):
    angle=center+radius*(step/20-1);c.pole_angle=angle;bpy.context.view_layer.update()
    err=sum(np.linalg.norm(np.array(ctrl.pose.bones[f'leg_{leg}_{i:02}'].matrix)-np.array(ctrl.data.bones[f'leg_{leg}_{i:02}'].matrix_local)) for i in (1,2))
    if err<best[0]:best=(float(err),angle)
  c.pole_angle=best[1];calibration[leg]=dict(pole_angle_rad=best[1],rest_matrix_error=best[0]);property_driver(c,ctrl,'leg_ik')
  c=ctrl.pose.bones[f'leg_{leg}_03'].constraints.new('COPY_ROTATION');c.target=ctrl;c.subtarget='CTRL_foot_'+leg;c.target_space='POSE';c.owner_space='POSE';property_driver(c,ctrl,'leg_ik')
 c=ctrl.pose.bones['head_01'].constraints.new('DAMPED_TRACK');c.name='Head look at';c.target=ctrl;c.subtarget='CTRL_head_look';c.track_axis='TRACK_Y';property_driver(c,ctrl,'head_look')
 for i in range(1,7):
  c=ctrl.pose.bones[f'tail_{i:02}'].constraints.new('COPY_ROTATION');c.target=ctrl;c.subtarget=f'CTRL_tail_{(i+1)//2:02}';c.target_space='LOCAL';c.owner_space='LOCAL';property_driver(c,ctrl,'tail_controls')
 rig['controls_enabled']=1.
 for pb in rig.pose.bones:
  c=pb.constraints.new('COPY_TRANSFORMS');c.name='Blender control input';c.target=ctrl;c.subtarget=pb.name;c.target_space='POSE';c.owner_space='POSE';property_driver(c,rig,'controls_enabled')
 write=r.write;write('control_setup.json',dict(collection=coll.name,exported=False,ik_calibration=calibration,controls=[b.name for b in ctrl.data.bones],switches=['leg_ik','head_look','tail_controls'],root='root',body='spine_01',ears=['ear_l_01','ear_r_01']))
 return ctrl
def bake_matrices(rig,samples,name):
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action
 enabled(rig,'controls_enabled',0)
 for f,matrices in samples.items():
  for pb in rig.pose.bones:
   b=pb.bone;kw={}
   if b.parent:kw=dict(parent_matrix=matrices[b.parent.name],parent_matrix_local=b.parent.matrix_local)
   basis=b.convert_local_to_pose(matrices[b.name],b.matrix_local,invert=True,**kw)
   pb.matrix_basis=basis;pb.rotation_mode='QUATERNION'
   for prop in ('location','rotation_quaternion','scale'):pb.keyframe_insert(prop,frame=f,group=b.name)
 errors=[]
 for f,matrices in samples.items():
  bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
  errors.extend(float(np.max(np.abs(np.array(pb.matrix)-np.array(matrices[pb.name])))) for pb in rig.pose.bones)
 return action,max(errors,default=0)
def test_bake(rig,ctrl):
 samples={};feet=[];scene=bpy.context.scene
 for key in ('leg_ik','head_look','tail_controls'):enabled(ctrl,key,1)
 enabled(rig,'controls_enabled',1)
 for f in range(1,32):
  r.g.clips.Poser(ctrl).reset();u=math.sin(math.pi*(f-1)/30)
  poser=r.g.clips.Poser(ctrl);poser.move('spine_01',Vector((0,0,-.045*u)))
  poser.move('CTRL_foot_fl',Vector((0,-.025*u,.045*u)))
  poser.move('CTRL_head_look',Vector((.08*u,0,.04*u)))
  for leg in ('fl','fr','hl','hr'):poser.move('CTRL_pole_'+leg,Vector((.015*u,0,0)))
  for i in range(1,4):poser.rot(f'CTRL_tail_{i:02}',Vector((0,0,1)),.12*u)
  poser.rot('ear_l_01',Vector((1,0,0)),.2*u)
  bpy.context.view_layer.update();samples[f]={pb.name:pb.matrix.copy() for pb in rig.pose.bones}
  feet.append(max((ctrl.pose.bones[f'leg_{leg}_02'].tail-ctrl.pose.bones['CTRL_foot_'+leg].head).length for leg in ('fl','fr','hl','hr')))
 action,err=bake_matrices(rig,samples,'control.bake_test')
 r.write('bake_test.json',dict(frames=31,fps=30,max_matrix_abs_error=err,limit=1e-4,passed=err<1e-4 and max(feet)<.001,max_ik_target_error_m=max(feet),ik_target_limit_m=.001,tested=['body translation','forefoot target','four moved pole targets','head look','three tail controls','left ear rotation']))
 assert err<1e-4,err
 assert max(feet)<.001,max(feet)
 rig.animation_data.action=None
 for key in ('leg_ik','head_look','tail_controls'):enabled(ctrl,key,0)
 r.g.clips.Poser(ctrl).reset();r.g.clips.Poser(rig).reset();return action
def review_action(rig,ctrl):
 enabled(rig,'controls_enabled',1);samples={}
 for i,name in enumerate(r.POSES):
  r.pose(ctrl,name);bpy.context.view_layer.update();samples[1+i*10]={pb.name:pb.matrix.copy() for pb in rig.pose.bones}
 action,err=bake_matrices(rig,samples,'review.poses');r.write('review_action.json',dict(poses={n:1+i*10 for i,n in enumerate(r.POSES)},max_matrix_abs_error=err,passed=err<1e-4));assert err<1e-4
 return action
def main():
 bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'weighted.blend'));rig=bpy.data.objects['luceras_rig'];ctrl=make_controls(rig)
 test_bake(rig,ctrl);action=review_action(rig,ctrl)
 scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=71;scene.frame_set(11)
 r.check_geometry()
 # Export the selected game bodies and inherited skeleton only.
 r.select(rig)
 for o in r.meshes('game'):o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(r.OUT/'luceras_rigged.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True,export_def_bones=False,export_all_influences=False,export_rest_position_armature=True,export_tangents=True)
 # The editable file opens with controls active in the rest stance.
 rig.animation_data.action=None;r.g.clips.Poser(ctrl).reset();r.g.clips.Poser(rig).reset();enabled(rig,'controls_enabled',1)
 for key in ('leg_ik','head_look','tail_controls'):enabled(ctrl,key,1)
 scene.frame_set(1);r.visible('sculpt')
 for o in r.meshes('game'):o.hide_set(True)
 r.select(ctrl);bpy.ops.wm.save_as_mainfile(filepath=str(r.OUT/'rig.blend'))
if __name__=='__main__':main()

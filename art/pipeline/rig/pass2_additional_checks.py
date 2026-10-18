"""Final pose-space, rigid-skull and source-pivot audits."""
import bpy,sys,json,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
def main():
 rig=p.openfile(p.OUT/'rig.blend');names=[b.name for b in rig.data.bones]
 skull={};refs={};checks={};shape={};head_rest=rig.matrix_world@rig.data.bones['head_01'].matrix_local
 for kind in ('sculpt','game'):
  o=bpy.data.objects['luceras_blockout' if kind=='sculpt' else 'game_body_horns_claws'];xyz=r.coords(o);a=r.weights(o,names)
  # Forehead, cheek and horn seats, excluding the ear shell and soft neck seam.
  mask=(xyz[:,1]<-.183)&(xyz[:,2]>.501)&(xyz[:,2]<.65)&(abs(xyz[:,0])<.072)
  skull[kind]={'object':o.name,'vertices':int(mask.sum()),'max_non_head_weight':float(np.max(1-a[mask,names.index('head_01')])),'region':'y < -0.183, 0.501 < z < 0.65, abs(x) < 0.072 meters; excludes ear blades and soft neck seam.'}
  refs[kind]=(o,mask,xyz)
 for pose in r.POSES:
  p.showpose(rig,pose);checks[pose]={};head=np.array(rig.matrix_world@rig.pose.bones['head_01'].matrix@head_rest.inverted())
  for kind,(o,mask,xyz) in refs.items():
   expected=xyz@head[:3,:3].T+head[:3,3];actual=r.coords(o,True);checks[pose][kind]=float(np.linalg.norm(actual[mask]-expected[mask],axis=1).max())
  shape[pose]={k.name:float(k.value) for k in bpy.data.objects['luceras_blockout'].data.shape_keys.key_blocks} if bpy.data.objects['luceras_blockout'].data.shape_keys else {}
 old=json.loads((p.OLD/'measurements.json').read_text());current=[{'name':b.name,'parent':b.parent.name if b.parent else None,'deform':b.use_deform,'sprite_only':False,'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones]
 data={'skeleton_exactly_retained':current==old['bones'],'skull_regions':skull,'rigid_head_residual_m':checks,'skull_tolerance_m':1e-6,'skull_rigid':max(v for q in checks.values() for v in q.values())<1e-6,'shape_key_driver_values':shape,'basis_geometry_exact':json.loads((p.OUT/'geometry_preservation.json').read_text())['all_exact']}
 ctrl=bpy.data.objects['Luceras_Controls'];control_errors={};obj=bpy.data.objects['luceras_blockout']
 for key in ('leg_ik','head_look','tail_controls'):ctrl[key]=0.
 ctrl.update_tag()
 for pose in r.POSES:
  rig['controls_enabled']=0.;rig.update_tag();p.showpose(rig,pose);expected=r.coords(obj,True)
  rig.animation_data.action=None;rig['controls_enabled']=1.;rig.update_tag();r.pose(ctrl,pose);bpy.context.view_layer.update();actual=r.coords(obj,True)
  control_errors[pose]=float(np.max(np.linalg.norm(actual-expected,axis=1)))
 rig['controls_enabled']=0.;rig.update_tag();r.pose(ctrl,'rest');bpy.context.view_layer.update()
 data['control_vs_baked_sculpt_error_m']=control_errors;data['correctives_work_through_controls']=max(control_errors.values())<1e-5
 p.write('additional_checks.json',data)
 # Source-matched neutral head crop reveals any inherited surface detail.
 p.showpose(rig,'rest');r.g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16
 from mathutils import Vector
 center=Vector((.025,-.21,.59));rad=.13;cam=r.g.lookdev.place_camera('lookdev_neutral_head',(center-Vector((rad,rad,rad)),center+Vector((rad,rad,rad))),65,5,.04)
 for kind in ('sculpt','game'):
  for o in r.meshes(kind):r.g.lookdev.apply_clay(o)
  r.visible(kind);r.g.lookdev.render(cam,p.OUT/f'neutral_head_{kind}.png',size=768)
 center=rig.matrix_world@rig.pose.bones['tail_01'].head;rad=.13
 cam=r.g.lookdev.place_camera('lookdev_neutral_rump',(center-Vector((rad,rad,rad)),center+Vector((rad,rad,rad))),135,25,.04)
 for kind in ('sculpt','game'):
  r.visible(kind);r.g.lookdev.render(cam,p.OUT/f'neutral_rump_{kind}.png',size=512)
 print('ADDITIONAL_CHECKS',data['skeleton_exactly_retained'],data['skull_rigid'],flush=True)
if __name__=='__main__':main()

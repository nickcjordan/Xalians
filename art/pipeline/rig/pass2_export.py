"""Export selected game bodies and evaluated reference data for exact GLB auditing."""
import bpy, sys, json, numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
def main():
 rig=p.openfile(p.OUT/'rig.blend');ctrl=bpy.data.objects['Luceras_Controls']
 import controls
 controls.test_bake(rig,ctrl)
 rig['controls_enabled']=0.;rig.update_tag();rig.animation_data.action=bpy.data.actions['review.poses']
 scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=71;scene.render.fps=30
 samples={};refs={};angles={}
 for f in range(1,72):
  scene.frame_set(f);bpy.context.view_layer.update()
  samples[str(f)]={b.name:np.array(rig.matrix_world@b.matrix@b.bone.matrix_local.inverted()@rig.matrix_world.inverted()).tolist() for b in rig.pose.bones}
  if (f-1)%10==0:
   pose=r.POSES[(f-1)//10]
   for o in r.meshes('game'):refs[pose+'__'+o.name]=r.coords(o,True)
   angles[pose]={b.name:list(b.rotation_quaternion) for b in rig.pose.bones if b.name.startswith('leg')}
 p.write('evaluated_deformation_matrices.json',samples);p.write('pose_angles.json',angles)
 np.savez_compressed(str(p.OUT/'blender_game_vertices.npz'),**refs)
 scene.frame_set(11);r.select(rig)
 for o in r.meshes('game'):o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(p.OUT/'luceras_rigged.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True,export_def_bones=False,export_all_influences=False,export_rest_position_armature=True,export_tangents=True)
 # Save a rest checkpoint for the inherited measurements tool.
 rig.animation_data.action=None;r.pose(rig,'rest');bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'weighted.blend'))
 # Restore the existing animator entry state without changing the controls.
 r.g.clips.Poser(ctrl).reset();r.g.clips.Poser(rig).reset();controls.enabled(rig,'controls_enabled',1)
 for key in ('leg_ik','head_look','tail_controls'):controls.enabled(ctrl,key,1)
 scene.frame_set(1);r.visible('sculpt')
 for o in r.meshes('game'):o.hide_set(True)
 r.select(ctrl);bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'rig.blend'))
 import measure
 measure.main()
 facts=json.loads((p.OUT/'measurements.json').read_text())
 facts['build_id']='B-bvrc';facts['sculpt_corrective_keys']=[key.name for key in bpy.data.objects['luceras_blockout'].data.shape_keys.key_blocks if key.name!='Basis'] if bpy.data.objects['luceras_blockout'].data.shape_keys else []
 facts['shape_key_note']='Object key lists include Basis. sculpt_corrective_keys lists only the authored pose-space correctives. Game bodies have no shape keys.'
 p.write('measurements.json',facts)
if __name__=='__main__':main()

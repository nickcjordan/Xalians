"""Test localized pose-space smoothing without changing the frozen base mesh."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import build_rig as r
import bpy,numpy as np
bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'weighted.blend'))
rig=bpy.data.objects['luceras_rig'];o=bpy.data.objects['luceras_blockout']
r.pose(rig,'rest');p=r.coords(o);mask=np.zeros(len(p))
for bone in ('leg_fl_01','leg_fr_01','leg_fl_02','leg_fr_02','leg_hl_01','leg_hr_01','neck_01','tail_01'):
 center=np.array(rig.matrix_world@rig.data.bones[bone].head_local)
 radius=.115 if bone.endswith('01') else .08
 f=np.clip(1-np.linalg.norm(p-center,axis=1)/radius,0,1)
 mask=np.maximum(mask,f*f*(3-2*f))
vg=o.vertex_groups.new(name='CORRECTIVE_soft_tissue')
for i in np.flatnonzero(mask>0):vg.add([int(i)],float(mask[i]),'REPLACE')
m=o.modifiers.new('Localized pose volume correction','CORRECTIVE_SMOOTH')
m.factor=.75;m.iterations=30;m.smooth_type='LENGTH_WEIGHTED';m.rest_source='ORCO';m.vertex_group=vg.name
r.check_geometry()
bpy.ops.wm.save_as_mainfile(filepath=str(r.OUT/'corrective_trial.blend'))
r.renders(rig,'iter4',full=False)

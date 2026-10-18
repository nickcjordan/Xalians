"""Compare volume-preserving skinning on the offline sculpt."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import build_rig as r
import bpy
bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'weighted.blend'))
o=bpy.data.objects['luceras_blockout']
for m in o.modifiers:
 if m.type=='ARMATURE':m.use_deform_preserve_volume=True
r.check_geometry()
bpy.ops.wm.save_as_mainfile(filepath=str(r.OUT/'volume_trial.blend'))
r.renders(bpy.data.objects['luceras_rig'],'iter5',full=False)

"""Promote the reviewed corrective trial, then regenerate delivery evidence."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import build_rig as r
import bpy,controls,measure
bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'corrective_trial.blend'))
r.check_geometry()
bpy.ops.wm.save_as_mainfile(filepath=str(r.OUT/'weighted.blend'))
controls.main()
measure.main()
bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'rig.blend'))
r.renders(bpy.data.objects['luceras_rig'],'final',full=True)

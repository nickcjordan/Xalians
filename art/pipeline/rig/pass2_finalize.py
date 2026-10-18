"""Combine selected weights and sculpt-only corrective deltas without geometry edits."""
import bpy,sys,numpy as np,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
def main():
 source=sys.argv[-1] if sys.argv[-1].endswith('.blend') else 'synced10.blend'
 rig=p.openfile(p.OUT/source)
 rig['build_id']='B-bvrc';bpy.context.scene['rig_build_id']='B-bvrc'
 r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'rig.blend'))
 import pass2_export
 pass2_export.main()
 import pass2_additional_checks
 pass2_additional_checks.main()
 rig=p.openfile(p.OUT/'rig.blend');r.renders(rig,'final',True);p.detail(rig,'after')
if __name__=='__main__':main()

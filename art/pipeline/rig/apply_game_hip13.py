import bpy,sys,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
rig=p.openfile(p.OUT/'synced10.blend');o=bpy.data.objects['game_body_horns_claws']
r.setweights(o,np.load(p.OUT/'optimized13_weights.npy'),[b.name for b in rig.data.bones],4)
r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'optimized13.blend'))
p.detail(rig,'iter13',regions=('hip','rump'))

import bpy,sys,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r,BASE,rigid
rig=p.openfile(BASE/'rig.blend');names=[b.name for b in rig.data.bones]
o=bpy.data.objects['game_body_horns_claws'];a=np.load(str(p.OUT/'fit3_weights.npy'));r.setweights(o,a,names,4)
p.write('rigid_binding.json',{obj.name:rigid(obj,names) for obj in r.meshes('game')})
r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'trial3.blend'));p.detail(rig,'iter3',regions=('hip','rump'))

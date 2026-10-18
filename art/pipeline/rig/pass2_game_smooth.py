import bpy,sys,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
rig=p.openfile(p.OUT/'synced10.blend');o=bpy.data.objects['game_body_horns_claws'];names=[b.name for b in rig.data.bones];a=r.weights(o,names);xyz=r.coords(o)
mask=np.zeros(len(a))
for side in ('l','r'):
 c=np.array(rig.matrix_world@rig.data.bones['leg_h'+side+'_01'].head_local)
 mask=np.maximum(mask,p.smooth((.21-np.linalg.norm(xyz-c,axis=1))/.10))
mask*=p.smooth((xyz[:,2]-.29)/.07)*p.smooth((.38-xyz[:,1])/.06)
edges=np.array([e.vertices[:] for e in o.data.edges]);ii=np.concatenate([edges[:,0],edges[:,1]]);jj=np.concatenate([edges[:,1],edges[:,0]]);degree=np.bincount(ii,minlength=len(a)).clip(1)
for _ in range(45):
 avg=np.column_stack([np.bincount(ii,weights=a[jj,c],minlength=len(a)) for c in range(len(names))])/degree[:,None]
 a+=(avg-a)*(.5*mask[:,None])
a[a<.00011]=0;r.setweights(o,a,names,4)
r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'smooth11.blend'));p.detail(rig,'iter11',regions=('hip','rump'))

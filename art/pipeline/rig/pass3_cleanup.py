import bpy,sys,numpy as np,datetime
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r,symmetry
rig=p.openfile(p.OUT/'trial13.blend');names=[b.name for b in rig.data.bones];refs={}
for pose in r.POSES:
 p.showpose(rig,pose);refs[pose]={o.name:r.coords(o,True) for o in r.meshes('game')}
rig.animation_data.action=None;r.pose(rig,'rest');stats={}
for o in r.meshes('game'):
 a=r.weights(o,names);invalid=[j for j,n in enumerate(names) if not rig.data.bones[n].use_deform];removed=a[:,invalid].sum(1);a[:,invalid]=0;a/=a.sum(1)[:,None];a[a<.00011]=0;r.setweights(o,a,names,4);stats[o.name]={'changed_vertices':int((removed>0).sum()),'max_non_deform_weight_removed':float(removed.max()),'removed_groups':[names[j] for j in invalid]}
errors={}
for pose in r.POSES:
 p.showpose(rig,pose);errors[pose]={o.name:float(np.linalg.norm(r.coords(o,True)-refs[pose][o.name],axis=1).max()) for o in r.meshes('game')}
p.write('nondeform_weight_cleanup.json',{'objects':stats,'effective_deformation_max_error_m':errors,'same_effective_deformation':max(v for q in errors.values() for v in q.values())<1e-6})
rig.animation_data.action=None;r.pose(rig,'rest');r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'rig.blend'))
p.write('symmetry_after.json',{o.name:symmetry(o,names,False) for k in ('sculpt','game') for o in r.meshes(k) if o.name=='luceras_blockout' or k=='game'})
p.write('selection.json',{'iteration':13,'source':'trial13.blend','cleanup':'Nondeforming root weights removed and remaining weights renormalized.','editing_minutes':(datetime.datetime.now(datetime.timezone.utc)-datetime.datetime(2026,10,16,21,39,13,tzinfo=datetime.timezone.utc)).total_seconds()/60})

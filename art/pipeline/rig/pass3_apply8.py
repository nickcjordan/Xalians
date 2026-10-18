import bpy,sys,numpy as np,datetime
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r,BASE,rigid,symmetry,swapnames
from mathutils.kdtree import KDTree
if datetime.datetime.now(datetime.timezone.utc)>=datetime.datetime(2026,10,16,22,9,13,tzinfo=datetime.timezone.utc):raise RuntimeError('Editing cutoff reached')
rig=p.openfile(BASE/'rig.blend');names=[b.name for b in rig.data.bones]
o=bpy.data.objects['game_body_horns_claws'];r.setweights(o,np.load(str(p.OUT/'fit8_weights.npy')),names,4)
# Two close mutual skull/ear-seat counterparts explain the sculpt's large outliers.
o=bpy.data.objects['luceras_blockout'];xyz=r.coords(o);a=r.weights(o,names);old=a.copy();swap=swapnames(names);kd=KDTree(len(a))
for i,v in enumerate(xyz):kd.insert(v,i)
kd.balance();repairs=[]
for i in np.flatnonzero(xyz[:,0]>.00001):
 q=xyz[i].copy();q[0]*=-1;_,j,d=kd.find(q)
 back=xyz[j].copy();back[0]*=-1;_,ii,_=kd.find(back)
 err=float(abs(old[i]-old[j,swap]).max())
 if d<.0002 and ii==i and err>.15:
  w=(old[i]+old[j,swap])*.5;a[i]=w;a[j]=w[swap];repairs.append({'positive_vertex':int(i),'negative_vertex':j,'distance_m':d,'before_max_difference':err,'position':xyz[i].tolist()})
# Avoid rewriting the remaining sculpt weights so accepted skinning stays exact.
for i in np.flatnonzero(abs(a-old).max(axis=1)>0):
 for vg in o.vertex_groups:vg.remove([int(i)])
 for j in np.flatnonzero(a[i]>0):o.vertex_groups[names[j]].add([int(i)],float(a[i,j]),'REPLACE')
p.write('sculpt_symmetry_repairs.json',{'changed_vertices':int((abs(a-old).max(axis=1)>0).sum()),'pairs':repairs,'shape_keys_changed':False})
p.write('rigid_binding.json',{obj.name:rigid(obj,names) for obj in r.meshes('game')})
p.write('symmetry_after.json',{obj.name:symmetry(obj,names,False) for k in ('sculpt','game') for obj in r.meshes(k) if obj.name=='luceras_blockout' or k=='game'})
rig['build_id']='B-a87k';bpy.context.scene['rig_build_id']='B-a87k';r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'trial8.blend'));p.detail(rig,'iter8',regions=('hip','rump','cheek','horn_base'))

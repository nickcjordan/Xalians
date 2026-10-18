import sys,bpy,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r,BASE
from mathutils.bvhtree import BVHTree
rig=p.openfile(BASE/'rig.blend');o=bpy.data.objects['game_body_horns_claws'];names=[b.name for b in rig.data.bones];a=r.weights(o,names);xyz=r.coords(o)
sc=bpy.data.objects['luceras_blockout'];sp=r.coords(sc);sc.data.calc_loop_triangles();tri=np.array([t.vertices[:] for t in sc.data.loop_triangles]);tree=BVHTree.FromPolygons(sp.tolist(),tri.tolist(),all_triangles=True)
hits=[];coeff=[]
for point in xyz:
 hit,_,ti,_=tree.find_nearest(point);ix=tri[ti];v0,v1,v2=sp[ix];bc=np.linalg.lstsq(np.stack([v1-v0,v2-v0],axis=1),np.array(hit)-v0,rcond=None)[0];co=np.clip([1-bc.sum(),*bc],0,1);co/=sum(co);hits.append(ix);coeff.append(co)
hits=np.array(hits);coeff=np.array(coeff);offset=xyz-np.einsum('ni,nij->nj',coeff,sp[hits])
matrices=[];posed=[];targets=[]
for pose in r.POSES:
 p.showpose(rig,pose)
 matrices.append([np.array(rig.matrix_world@rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()@rig.matrix_world.inverted()) for n in names])
 posed.append(r.coords(o,True))
 q=r.coords(sc,True);rotation=np.einsum('nb,bij->nij',a,np.array(matrices[-1])[:,:3,:3]);targets.append(np.einsum('ni,nij->nj',coeff,q[hits])+np.einsum('nij,nj->ni',rotation,offset))
rig.animation_data.action=None;r.pose(rig,'rest')
np.savez_compressed(str(p.OUT/'game_optimization_source.npz'),weights=a,xyz=xyz,edges=np.array([e.vertices[:] for e in o.data.edges]),matrices=np.array(matrices),posed=np.array(posed),targets=np.array(targets),names=np.array(names),hip_centers=np.array([rig.matrix_world@rig.data.bones['leg_h'+s+'_01'].head_local for s in ('l','r')]))

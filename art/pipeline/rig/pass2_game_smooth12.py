import bpy,sys,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
from mathutils.bvhtree import BVHTree
import datetime,json
r=p.r
cutoff=datetime.datetime(2026,10,16,21,21,9,tzinfo=datetime.timezone.utc)
if datetime.datetime.now(datetime.timezone.utc)>=cutoff:
 p.write('resume_cutoff_fallback.json',{'selected':'synced10.blend','reason':'Shared slot became available after the user editing cutoff. No new weight edits were run.'})
 import pass2_finalize
 sys.argv.append('synced10.blend');pass2_finalize.main();sys.exit(0)
rig=p.openfile(p.OUT/'synced10.blend');o=bpy.data.objects['game_body_horns_claws'];names=[b.name for b in rig.data.bones];a=r.weights(o,names);xyz=r.coords(o)
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
mask=np.zeros(len(a))
for side in ('l','r'):
 c=np.array(rig.matrix_world@rig.data.bones['leg_h'+side+'_01'].head_local)
 mask=np.maximum(mask,p.smooth((.21-np.linalg.norm(xyz-c,axis=1))/.10))
mask*=p.smooth((xyz[:,2]-.29)/.07)*p.smooth((.38-xyz[:,1])/.06)
edges=np.array([e.vertices[:] for e in o.data.edges]);ii=np.concatenate([edges[:,0],edges[:,1]]);jj=np.concatenate([edges[:,1],edges[:,0]]);degree=np.bincount(ii,minlength=len(a)).clip(1)
support=a>0
for _ in range(20):
 avg=np.column_stack([np.bincount(ii,weights=a[jj,c],minlength=len(a)) for c in range(len(names))])/degree[:,None]
 avg*=support; avg/=np.maximum(avg.sum(axis=1)[:,None],1e-30)
 a+=(avg-a)*(.35*mask[:,None])
a[a<.00011]=0;r.setweights(o,a,names,4)
r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'smooth12.blend'));p.detail(rig,'iter12',regions=('hip','rump'))


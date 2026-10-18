"""Fit the game skin to the final sculpt's surface motion, without game morph targets."""
import bpy,sys,numpy as np
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
def main():
 rig=p.openfile(p.OUT/'corrected9.blend');names=[b.name for b in rig.data.bones];sc=bpy.data.objects['luceras_blockout'];game=bpy.data.objects['game_body_horns_claws'];sp=r.coords(sc);gp=r.coords(game);sw=r.weights(sc,names);a=r.weights(game,names)
 sc.data.calc_loop_triangles();tri=np.array([t.vertices[:] for t in sc.data.loop_triangles]);tree=BVHTree.FromPolygons(sp.tolist(),tri.tolist(),all_triangles=True)
 adj=[[] for _ in gp]
 for ed in game.data.edges:
  i,j=ed.vertices;adj[i].append(j);adj[j].append(i)
 todo=set(range(len(gp)));parts=[]
 while todo:
  stack=[todo.pop()];part=[]
  while stack:
   i=stack.pop();part.append(i)
   for j in adj[i]:
    if j in todo:todo.remove(j);stack.append(j)
  parts.append(part)
 ids=np.array(max(parts,key=len));hits=[];coeff=[];distances=[]
 for i in ids:
  hit,_,ti,dist=tree.find_nearest(gp[i]);ix=tri[ti];v0,v1,v2=sp[ix];bc=np.linalg.lstsq(np.stack([v1-v0,v2-v0],axis=1),np.array(hit)-v0,rcond=None)[0];co=np.clip([1-bc.sum(),*bc],0,1);co/=sum(co);hits.append(ix);coeff.append(co);distances.append(dist)
 hits=np.array(hits);coeff=np.array(coeff);a[ids]=np.einsum('ni,nij->nj',coeff,sw[hits]);offset=gp[ids]-np.einsum('ni,nij->nj',coeff,sp[hits]);targets=[];ph=np.column_stack([gp,np.ones(len(gp))])
 for pose in r.POSES:
  r.pose(rig,pose);q=r.coords(sc,True);mats=np.array([np.array(rig.matrix_world@rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()@rig.matrix_world.inverted()) for n in names])
  target=np.einsum('nb,bij,nj->ni',a,mats,ph)[:,:3]
  rotation=np.einsum('nb,bij->nij',a[ids],mats[:,:3,:3]);target[ids]=np.einsum('ni,nij->nj',coeff,q[hits])+np.einsum('nij,nj->ni',rotation,offset);targets.append(target)
 r.pose(rig,'rest');a=p.fit_four(game,a,names,rig,np.concatenate(targets,axis=1));a[a<.00011]=0;r.setweights(game,a,names,4)
 p.write('game_surface_sync.json',{'method':__doc__,'body_vertices':len(ids),'max_rest_surface_distance_m':max(distances),'mean_rest_surface_distance_m':float(np.mean(distances)),'target_includes_sculpt_correctives':True})
 r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'synced10.blend'));p.detail(rig,'iter10',regions=('elbow','hip','rump','cheek','horn_base'))
if __name__=='__main__':main()

"""Pruned exhaustive segment checks against separate eyes, nose and claw meshes."""
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
surface=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(surface/'surface.blend'));fur=bpy.data.objects['Akinza fur'].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
p=values(fur,'position','vector',3);s=np.empty(len(fur.curves),np.int32);fur.curves.foreach_get('first_point_index',s);count=np.diff(np.r_[s,len(p)]);lo=np.minimum.reduceat(p,s,axis=0);hi=np.maximum.reduceat(p,s,axis=0)
radius=values(fur,'radius');active=np.maximum.reduceat(radius,s)>0
hits=np.zeros(len(s),np.int16);depth=np.zeros(len(s),np.float32);candidate=np.zeros(len(s),bool);names=[];per_mesh=[];closed_mesh=[];boundary_edges=[];nonmanifold_edges=[];inside_counts=[];unverified_counts=[]

def inside(tri,pos):
 a,b,c=(tri-pos).transpose(1,0,2)
 la=np.linalg.norm(a,axis=1);lb=np.linalg.norm(b,axis=1);lc=np.linalg.norm(c,axis=1)
 det=np.einsum('ij,ij->i',a,np.cross(b,c))
 den=la*lb*lc+np.einsum('ij,ij->i',a,b)*lc+np.einsum('ij,ij->i',b,c)*la+np.einsum('ij,ij->i',c,a)*lb
 return abs(np.sum(2*np.arctan2(det,den))/(4*np.pi))>.5
skin=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));edge_ids=np.empty(len(skin.data.loops),np.int32);skin.data.loops.foreach_get('edge_index',edge_ids);uses=np.bincount(edge_ids,minlength=len(skin.data.edges));skin_boundary=int((uses==1).sum());skin_nonmanifold=int((uses>2).sum());print('SKIN_TOPOLOGY',skin_boundary,skin_nonmanifold,flush=True)
for ob in bpy.data.objects:
 if ob.type!='MESH' or not any(v in ob.name.lower() for v in ('eye_globe','nose_finish','claw')):continue
 me=ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).data;coords=np.array([ob.matrix_world@v.co for v in me.vertices],np.float64);bblo=coords.min(0)-.0001;bbhi=coords.max(0)+.0001
 sel=(hi>=bblo).all(1)&(lo<=bbhi).all(1)&active;candidate|=sel;mesh_hits=0
 # These anatomical meshes have identity transforms in the approved assembly.
 assert np.allclose(np.array(ob.matrix_world),np.eye(4))
 bvh=BVHTree.FromObject(ob,bpy.context.evaluated_depsgraph_get())
 edge_ids=np.empty(len(me.loops),np.int32);me.loops.foreach_get('edge_index',edge_ids);uses=np.bincount(edge_ids,minlength=len(me.edges));boundary=int((uses==1).sum());nonmanifold=int((uses>2).sum());closed=bool(len(uses)>0 and np.all(uses==2));inside_curve=set();unverified_curve=set()
 me.calc_loop_triangles();idx=np.empty(len(me.loop_triangles)*3,np.int32);me.loop_triangles.foreach_get('vertices',idx);idx=idx.reshape(-1,3);tri=coords[idx]
 ee=np.concatenate([idx[:,[0,1]],idx[:,[1,2]],idx[:,[2,0]]]);_,inv,num=np.unique(np.sort(ee,axis=1),axis=0,return_inverse=True,return_counts=True);balance=np.bincount(inv,weights=np.where(ee[:,0]<ee[:,1],1,-1));orientation_conflicts=int(((num==2)&(balance!=0)).sum());assert orientation_conflicts==0,'Incoherent obstacle orientation'
 print('WINDING_MESH',ob.name,len(tri),orientation_conflicts,flush=True)
 for i in np.where(sel)[0]:
  oldhit=hits[i]
  for j in range(s[i]+1,s[i]+count[i]):
   v=p[j]-p[j-1];ln=float(np.linalg.norm(v))
   if ln>1e-7:
    eps=min(.0002,ln*.15);hit=bvh.ray_cast(Vector(p[j-1]+v/ln*eps),Vector(v/ln),max(ln-2*eps,0))
    if hit[0] is not None:hits[i]+=1
   for pos in (p[j],(p[j]+p[j-1])*.5):
    hit=bvh.find_nearest(Vector(pos))
    if hit[0] is not None and (pos>=bblo).all() and (pos<=bbhi).all():
     if closed and inside(tri,pos):depth[i]=max(depth[i],hit[3]);inside_curve.add(int(i))
     elif not closed and np.dot(pos-np.array(hit[0]),np.array(hit[1]))<0:unverified_curve.add(int(i))
  mesh_hits+=int(hits[i]>oldhit)
 names.append(ob.name);per_mesh.append(mesh_hits);closed_mesh.append(closed);boundary_edges.append(boundary);nonmanifold_edges.append(nonmanifold);inside_counts.append(len(inside_curve));unverified_counts.append(len(unverified_curve));print('TOPOLOGY',ob.name,'closed',closed,'boundary',boundary,'inside',len(inside_curve),'unverifiedSigned',len(unverified_curve),flush=True);print('OBSTACLE',ob.name,int(sel.sum()),mesh_hits,flush=True)
np.savez_compressed(out/'obstacle-evidence.npz',intersections=hits,penetration=depth,candidate=candidate,names=np.array(names),meshRayCrossingStrands=np.array(per_mesh),closedMesh=np.array(closed_mesh),boundaryEdges=np.array(boundary_edges),nonmanifoldEdges=np.array(nonmanifold_edges),windingInsideStrands=np.array(inside_counts),unverifiedOpenSignedStrands=np.array(unverified_counts),skinBoundaryEdges=np.array(skin_boundary),skinNonmanifoldEdges=np.array(skin_nonmanifold),active=active)
print('OBSTACLES_COMPLETE',int(((hits>0)|(depth>.0006)).sum()),flush=True)

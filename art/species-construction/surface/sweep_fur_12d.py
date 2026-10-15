"""Exhaustive saved-strand collision evidence for the 12d body-wide sweep."""
import sys,json,time
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from review_fur_12c import export
p=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
export(p,out);d=np.load(out/'evidence.npz');co=d['co'];pts=d['points'];starts=d['starts'];counts=np.diff(np.r_[starts,len(pts)])
skin=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
tree=KDTree(len(co))
for i,v in enumerate(co):tree.insert(Vector(v),i)
tree.balance();nearest=np.array([tree.find(Vector(v))[1] for v in d['roots']],np.int32)
cu=bpy.data.objects['Akinza fur'].data
rad=np.empty(len(cu.points),np.float32);cu.attributes['radius'].data.foreach_get('value',rad);active=np.maximum.reduceat(rad,starts)>0
end=starts+counts-1;tip_nearest=np.empty(len(starts),np.int32)
penetration=np.zeros(len(starts),np.float32);intersections=np.zeros(len(starts),np.int16);max_clearance=np.zeros(len(starts),np.float32)
for i,s in enumerate(starts):
 if not active[i]:tip_nearest[i]=nearest[i];continue
 for j in range(s+1,s+counts[i]):
  v=pts[j]-pts[j-1];length=float(np.linalg.norm(v))
  if length>1e-7:
   direction=v/length;eps=min(.0002,length*.15)
   hit=bvh.ray_cast(Vector(pts[j-1]+direction*eps),Vector(direction),max(length-2*eps,0))
   if hit[0] is not None:intersections[i]+=1
  # Test the segment midpoint too, including chords inside a concave fold.
  for pos in (pts[j],(pts[j]+pts[j-1])*.5):
   hit=bvh.find_nearest(Vector(pos))
   if hit[0] is not None:
    dist=hit[3];signed=np.dot(pos-np.array(hit[0]),np.array(hit[1]))
    if signed<0:penetration[i]=max(penetration[i],dist)
    else:max_clearance[i]=max(max_clearance[i],dist)
 tip_nearest[i]=tree.find(Vector(pts[end[i]]))[1]
 if i%50000==0:print('SWEEP',i,'of',len(starts),flush=True)
np.savez_compressed(out/'collision-evidence.npz',nearest=nearest,tip_nearest=tip_nearest,penetration=penetration,intersections=intersections,max_clearance=max_clearance,active=active)
print('COLLISION_COMPLETE',int((penetration>.0005).sum()),int((intersections>0).sum()),flush=True)

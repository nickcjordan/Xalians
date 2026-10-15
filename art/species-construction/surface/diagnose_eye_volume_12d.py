"""Resolve ambiguous BVH eye parity using coherent double-precision winding."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
base=Path(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=str(base/'surface.blend'))
cu=bpy.data.objects['Akinza fur'].data;p=values(cu,'position','vector',3);s=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',s);count=np.diff(np.r_[s,len(p)])
o=np.load(base/'r/obstacle-evidence.npz');ids=np.where((o['intersections']>0)|(o['penetration']>.0006))[0]

def winding(tri,q):
 a,b,c=(tri-q).transpose(1,0,2);la=np.linalg.norm(a,axis=1);lb=np.linalg.norm(b,axis=1);lc=np.linalg.norm(c,axis=1)
 det=np.einsum('ij,ij->i',a,np.cross(b,c));den=la*lb*lc+np.einsum('ij,ij->i',a,b)*lc+np.einsum('ij,ij->i',b,c)*la+np.einsum('ij,ij->i',c,a)*lb
 return float(np.sum(2*np.arctan2(det,den))/(4*np.pi))

def ray_count(tree,q,d):
 start=Vector(q);number=0
 for _ in range(128):
  h=tree.ray_cast(start,d,3)
  if h[0] is None:break
  number+=1;start=h[0]+d*.000001
 return number

report={};saved={}
for ob in bpy.data.objects:
 if 'eye_globe' not in ob.name:continue
 me=ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).data;me.calc_loop_triangles();v=np.array([x.co for x in me.vertices],np.float64);idx=np.empty(len(me.loop_triangles)*3,np.int32);me.loop_triangles.foreach_get('vertices',idx);idx=idx.reshape(-1,3);tri=v[idx]
 ee=np.concatenate([idx[:,[0,1]],idx[:,[1,2]],idx[:,[2,0]]]);key=np.sort(ee,axis=1);_,inv,num=np.unique(key,axis=0,return_inverse=True,return_counts=True);sign=np.where(ee[:,0]<ee[:,1],1,-1);balance=np.bincount(inv,weights=sign);conflicts=int(((num==2)&(balance!=0)).sum())
 tree=BVHTree.FromObject(ob,bpy.context.evaluated_depsgraph_get());rows=[];dirs=[Vector(d).normalized() for d in [(.371,.529,.763),(-.617,.283,.733),(.193,-.887,.419)]]
 for i in ids:
  path=p[s[i]:s[i]+count[i]];queries=np.concatenate([path,(path[1:]+path[:-1])*.5]);w=[winding(tri,q) for q in queries];rays=[[ray_count(tree,q,d) for d in dirs] for q in queries];distance=[tree.find_nearest(Vector(q))[3] for q in queries]
  rows.append(dict(curve=int(i),points=queries.tolist(),winding=w,rayCounts=rays,nearestDistance=distance))
 report[ob.name]=dict(evaluatedVertices=len(v),triangles=len(idx),boundaryEdges=int((num==1).sum()),nonmanifoldEdges=int((num>2).sum()),orientationConflicts=conflicts,windingAtVertexMean=winding(tri,v.mean(0)),candidates=rows)
 saved[ob.name]=tri
(base/'eye-winding-diagnostic.json').write_text(json.dumps(report,indent=2));np.savez_compressed(base/'eye-winding-triangles.npz',**saved)
print(json.dumps({k:{'orientationConflicts':v['orientationConflicts'],'meanWinding':v['windingAtVertexMean'],'curves':[{ 'curve':r['curve'],'windingMin':min(r['winding']),'windingMax':max(r['winding'])} for r in v['candidates']]} for k,v in report.items()},indent=2),flush=True)

"""Shorten only residual colliding/outlier curves, without another global push-out."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
base=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2])
bpy.ops.wm.open_mainfile(filepath=str(base/'surface.blend'));bpy.context.preferences.filepaths.save_version=0
info=json.loads((base/'surface-info.json').read_text());skin=bpy.data.objects[info['skin']];bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
fur=bpy.data.objects['Akinza fur'];cu=fur.data
points=values(cu,'position','vector',3);starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts);counts=np.diff(np.r_[starts,len(points)])
f=np.load(base/'r/sweep-flags.npz');c=np.load(base/'r/collision-evidence.npz');selected=f['repair'];previous=np.load(base/'patch-evidence.npz');changed=previous['changed']|selected

def bad(path,clearance_limit=float("inf")):
 for j in range(1,len(path)):
  delta=path[j]-path[j-1];ln=np.linalg.norm(delta)
  if ln>1e-7:
   eps=min(.0002,ln*.15);h=bvh.ray_cast(Vector(path[j-1]+delta/ln*eps),Vector(delta/ln),max(ln-2*eps,0))
   if h[0] is not None:return True
  for pos in (path[j],(path[j]+path[j-1])*.5):
   h=bvh.find_nearest(Vector(pos))
   if h[0] is not None and (np.dot(pos-np.array(h[0]),np.array(h[1]))<-.00045 or h[3]>clearance_limit):return True
 return False
fallback=[]
for i in np.where(selected)[0]:
 sl=slice(starts[i],starts[i]+counts[i]);old=points[sl].copy();root=old[0].copy();relative=old-root
 factor=1.0
 if f['body'][i]:factor=min(1,.010/max(f['length'][i],1e-9),.002/max(c['max_clearance'][i],1e-9))
 path=root+relative*factor;clearance_limit=.004 if f['body'][i] else float('inf')
 for k in range(24):
  if not bad(path,clearance_limit):break
  factor*=.8;path=root+relative*factor
 if bad(path,clearance_limit):
  h=bvh.find_nearest(Vector(root));normal=np.array(h[1]);t=np.linspace(0,1,counts[i]);path=root+normal[None,:]*(.001*t[:,None]);fallback.append(int(i))
 assert not bad(path,clearance_limit),f'Unresolved strand {i}'
 points[sl]=path
cu.points.foreach_set('position',points.ravel());out.mkdir(parents=True,exist_ok=True)
data={k:previous[k] for k in previous.files};data.update(changed=changed,after_points=points)
np.savez_compressed(out/'patch-evidence.npz',**data)
info['changedCurves']=int(changed.sum())
info['residualRepair']=dict(parent=str(base),curves=int(selected.sum()),method='bounded shortening of remaining outliers and collision paths',fallbackNormalStubs=fallback)
(out/'surface-info.json').write_text(json.dumps(info,indent=2));(out/'residual-repair.json').write_text(json.dumps(info['residualRepair'],indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'));print('RESIDUAL_REPAIRED',int(selected.sum()),'FALLBACK',len(fallback),flush=True)

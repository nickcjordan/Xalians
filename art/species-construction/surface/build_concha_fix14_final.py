"""Final authorized build: visible white furnishings over the fixed blue coat."""
import sys,json,hashlib,runpy
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from refine_ear_root_12b2 import values
from concha_fix14_paths import baseline
from guard_concha_fix14 import guard
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
sources=[work/'s12-14-fix2',Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix2-rejected-14-fix'),Path('/mnt/c/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix2-rejected-14-fix')]
source=next(folder for folder in sources if (folder/'surface.blend').exists())
out=work/'s12-14-fix3'
assert not (out/'surface.blend').exists(),'Never overwrite an existing design build'
out.mkdir(exist_ok=True)
before=baseline(work)
bpy.ops.wm.open_mainfile(filepath=str(source/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
patch=dict(np.load(source/'patch-evidence.npz'))
info=json.loads((source/'surface-info.json').read_text())
skin=bpy.data.objects[info['skin']];co=values(skin.data,'position','vector',3)
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
tree=KDTree(len(co))
for i,q in enumerate(co):tree.insert(Vector(q),i)
tree.balance()
cu=bpy.data.objects['Akinza fur'].data
starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts)
points=values(cu,'position','vector',3);old=points.copy();counts=np.diff(np.r_[starts,len(points)])
radius=values(cu,'radius');strlen=values(cu,'strlen')
white=bpy.data.objects['Akinza concha tuft 14'].data
paths=values(white,'position','vector',3).reshape(-1,16,3)
rng=np.random.default_rng(14101603);t=np.linspace(0,1,16)
radii=(rng.uniform(.000065,.000110,len(paths))[:,None]*(1-t)**1.65+.0000006*t).astype(np.float32)
blue=bpy.data.objects['Akinza inner ear undercoat 14 fix'].data
blue_paths=values(blue,'position','vector',3).reshape(-1,16,3)
blue_radii=values(blue,'radius').reshape(-1,16)
def collision(path):
 for a,b in zip(path[:-1],path[1:]):
  delta=b-a;length=np.linalg.norm(delta)
  if length>1e-7:
   eps=min(.0002,length*.15)
   if bvh.ray_cast(Vector(a+delta/length*eps),Vector(delta/length),max(0,length-2*eps))[0] is not None:return True
  for q in (b,(a+b)*.5):
   hit=bvh.find_nearest(Vector(q))
   if np.dot(q-np.array(hit[0]),np.array(hit[1]))<-.0001:return True
 return False
assert not any(collision(path) for path in paths),'Reactivated white paths collide'
points,strlen,changed,transition=guard(before,out,points,starts,counts,radius,strlen,np.r_[paths,blue_paths],np.r_[radii,blue_radii],patch['changed'].copy(),tree,collision)
cu.points.foreach_set('position',points.ravel());cu.attributes['strlen'].data.foreach_set('value',strlen)
white.attributes['radius'].data.foreach_set('value',radii.ravel())
patch.update(changed=changed,transition=patch['transition']|transition,radii=radii)
np.savez_compressed(out/'patch-evidence.npz',**patch)
info['parent']=str(source)
info['conchaFix14'].update(nativeEdited=int(changed.sum()),transitionTrimmed=int(patch['transition'].sum()),visibleWhiteFibers=len(paths),build=out.name)
info['finalWhiteVisibility14Fix']=dict(sourceSha256=hashlib.sha256((source/'surface.blend').read_bytes()).hexdigest(),visibleFibers=len(paths),rootRadiusMicrons=[65,110],nativeChangedFromFix2=int((np.maximum.reduceat(np.linalg.norm(points-old,axis=1),starts)>0).sum()),whitePathsAndBlueUndercoatExact=True)
(out/'surface-info.json').write_text(json.dumps(info,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('FIX_FINAL_SAVED',info['finalWhiteVisibility14Fix'],flush=True)
sys.argv=['render_concha_fix14.py','--',out.name,'ears-front,ear-root-close']
runpy.run_path(str(HERE/'render_concha_fix14.py'),run_name='__main__')
sys.argv=['check_concha_fix14.py','--',out.name]
runpy.run_path(str(HERE/'check_concha_fix14.py'),run_name='__main__')

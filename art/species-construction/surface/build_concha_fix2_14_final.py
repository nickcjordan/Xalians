"""Final permitted white refinement: curved soft locks and irregular wisps."""
import sys,json,hashlib,runpy
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));sys.path.insert(0,str(HERE.parent))
from refine_ear_root_12b2 import values
from concha_v1_post import coordinates
from concha_fix2_14_paths import baseline
from guard_concha_fix14 import guard
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
candidates=[work/'s12-14-fix2a',Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix2a-rejected-14-fix2'),Path('/mnt/c/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix2a-rejected-14-fix2')]
source=next(folder for folder in candidates if (folder/'surface.blend').exists())
before=baseline(work);out=work/'s12-14-fix2b'
assert not (out/'surface.blend').exists(),'Never overwrite a saved design build'
out.mkdir(exist_ok=True);bpy.ops.wm.open_mainfile(filepath=str(source/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
info=json.loads((source/'surface-info.json').read_text());patch=dict(np.load(source/'patch-evidence.npz'))
skin=bpy.data.objects[info['skin']];co=values(skin.data,'position','vector',3)
normal=np.empty_like(co);skin.data.vertex_normals.foreach_get('vector',normal.ravel())
uv=coordinates(co);tri=np.load(work/'14-fix-probe.npz')['tri']
sheet=(normal[:,1]<-.05)&(values(skin.data,'earw')>.95)&(abs(co[:,0])>.15)&(uv[:,0]>-.01)
ear=BVHTree.FromPolygons(co.tolist(),tri[sheet[tri].all(1)].tolist(),all_triangles=True)
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get());tree=KDTree(len(co))
for i,q in enumerate(co):tree.insert(Vector(q),i)
tree.balance()
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
def ear_y(x,z):
 hit=ear.ray_cast(Vector((float(x),-.5,float(z))),Vector((0,1,0)),1)
 assert hit[0] is not None,('White path escaped ear sheet',x,z)
 return hit[0].y
cu=bpy.data.objects['Akinza fur'].data
starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts)
points=values(cu,'position','vector',3);original=points.copy();counts=np.diff(np.r_[starts,len(points)])
radius=values(cu,'radius');strlen=values(cu,'strlen');rng=np.random.default_rng(14160202)
paths=[];radii=[];root_uv=[];lock_ids=[];wisp_ids=[];t=np.linspace(0,1,24)
for side in (-1,1):
 for lock in range(6):
  center=(lock+.5)/6
  for child in range(460):
   wisp=child>=360
   angle=np.deg2rad(168+107*center+rng.normal(0,5.8))
   u=.057+.024*np.cos(angle)+rng.normal(0,.00055)
   v=.019+.019*np.sin(angle)+rng.normal(0,.00055)
   root_uv.append([u,v]);lock_ids.append((side+1)*3+lock);wisp_ids.append(wisp)
   length=(.073+.041*np.sin(np.pi*center)**.8)*rng.uniform(.70,1.16)
   if wisp:length*=rng.uniform(1.12,1.38)
   transverse=rng.normal(0,.008 if wisp else .005)
   a=np.array([u,v]);b=a+length*np.array([rng.uniform(.18,.27),rng.uniform(.16,.29)])
   c=a+length*np.array([rng.uniform(.64,.79),rng.uniform(.12,.27)])
   end=a+np.array([length,length*rng.uniform(-.015,.15)+transverse])
   pathuv=(1-t[:,None])**3*a+3*(1-t[:,None])**2*t[:,None]*b+3*(1-t[:,None])*t[:,None]**2*c+t[:,None]**3*end
   pathuv[:,1]+=rng.uniform(.0004,.0011)*np.sin(t*np.pi*rng.uniform(1.5,3.5)+rng.uniform(0,6))*np.sin(np.pi*t)
   path=np.c_[side*(.17+.8*pathuv[:,0]-.6*pathuv[:,1]),np.zeros(len(t)),.64+.6*pathuv[:,0]+.8*pathuv[:,1]]
   ys=np.array([ear_y(q[0],q[2]) for q in path])
   clearance=.001+(.023+rng.uniform(0,.010))*np.sin(t*np.pi*.70)**.8
   path[:,1]=ys-clearance
   for attempt in range(8):
    if not collision(path):break
    path[1:,1]-=.001
   else:raise AssertionError(('White wisp collides',side,lock,child))
   paths.append(path)
   root_radius=rng.uniform(.000060,.000095) if wisp else rng.uniform(.000095,.000145)
   # Body opacity remains above the original furnishing, while a long soft
   # taper and independently scattered wisps dissolve the collective edge.
   shaft=np.where(t<.58,1-.35*(t/.58)**1.25,.65*(np.maximum(1-t,0)/.42)**1.35)
   radii.append(root_radius*shaft+.0000006*t)
paths=np.array(paths,np.float32);radii=np.array(radii,np.float32)
points,strlen,changed,transition=guard(before,out,points,starts,counts,radius,strlen,paths,radii,patch['changed'].copy(),tree,collision,native_only_baseline=True,trim_children=True)
native_changes=int((np.maximum.reduceat(np.linalg.norm(points-original,axis=1),starts)>0).sum())
cu.points.foreach_set('position',points.ravel());cu.attributes['strlen'].data.foreach_set('value',strlen)
tuft=bpy.data.objects['Akinza concha tuft 14'];material=tuft.data.materials[0]
hair=bpy.data.hair_curves.new('Curved white locks and independent wisps fix2');hair.add_curves([24]*len(paths));hair.points.foreach_set('position',paths.ravel())
hair.attributes.new('radius','FLOAT','POINT').data.foreach_set('value',radii.ravel());hair.materials.append(material);tuft.data=hair
patch.update(changed=changed,transition=patch['transition']|transition,children=paths,radii=radii,rootUV=np.array(root_uv),lockIds=np.array(lock_ids),wisps=np.array(wisp_ids))
np.savez_compressed(out/'patch-evidence.npz',**patch)
info.update(parent=str(source),strands=len(starts)+len(paths),strandPoints=len(points)+paths.size//3)
info['conchaFix2_14'].update(build=out.name,nativeEdited=int(changed.sum()),transitionTrimmed=int(patch['transition'].sum()),whiteFibers=len(paths),whiteRootRadiusMicrons=[60,145],whiteShaftWidthAt60Percent=float(np.interp(.6,t,shaft)))
info['finalWhiteFix2_14']=dict(sourceSha256=hashlib.sha256((source/'surface.blend').read_bytes()).hexdigest(),nativeChangedFromA=native_changes,mainFibers=4320,wisps=1200,curvedProjectedPaths=True,blueSkinAndMaterialsPreserved=True)
(out/'surface-info.json').write_text(json.dumps(info,indent=2)+'\n');print('FIX2_FINAL_PRE_SAVE',info['finalWhiteFix2_14'],flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
sys.argv=['render_concha_fix14.py','--',out.name,'ears-front,ear-root-close'];runpy.run_path(str(HERE/'render_concha_fix14.py'),run_name='__main__')
sys.argv=['check_concha_fix14.py','--',out.name,'--before',str(before)];runpy.run_path(str(HERE/'check_concha_fix14.py'),run_name='__main__')

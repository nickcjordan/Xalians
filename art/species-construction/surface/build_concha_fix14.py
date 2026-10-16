"""Restore suppressed inner-ear coat and comb rim-rooted white furnishings."""
import sys,json,hashlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE));sys.path.insert(0,str(HERE.parent))
from refine_ear_root_12b2 import values
from concha_v1_post import coordinates
from render_surface import lin
from concha_fix14_paths import baseline
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
out=work/sys.argv[sys.argv.index('--')+1]
assert not (out/'surface.blend').exists(),'Never overwrite an existing design build'
out.mkdir(parents=True,exist_ok=True)
revision2='--revision2' in sys.argv
source=baseline(work);info=json.loads((source/'surface-info.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(source/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
skin=bpy.data.objects[info['skin']];co=values(skin.data,'position','vector',3)
normal=np.empty_like(co);skin.data.vertex_normals.foreach_get('vector',normal.ravel())
earw=values(skin.data,'earw');uv=coordinates(co)
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
tree=KDTree(len(co))
for i,q in enumerate(co):tree.insert(Vector(q),i)
tree.balance()
probe=np.load(work/'14-fix-probe.npz');tri=probe['tri']
sheet=(earw>.95)&(normal[:,1]<-.05)&(abs(co[:,0])>.15)&(uv[:,0]>-.01)
ear=BVHTree.FromPolygons(co.tolist(),tri[sheet[tri].all(axis=1)].tolist(),all_triangles=True)
cu=bpy.data.objects['Akinza fur'].data
s=probe['starts'];counts=np.diff(np.r_[s,len(cu.points)])
p=values(cu,'position','vector',3);old=p.copy();roots=p[s].copy()
attrs={name:values(cu,name) for name in ('radius','cupm','pale','fur_tone','fur_guided','strlen','concha_velvet14')}
original={name:q.copy() for name,q in attrs.items()}
ni=np.array([tree.find(Vector(q))[1] for q in roots]);ruv=coordinates(roots)
active=np.maximum.reduceat(attrs['radius'],s)>0
n=values(cu,'nrm','vector',3)
scope=(earw[ni]>.95)&(n[:,1]<-.15)&(abs(roots[:,0])>.15)&(ruv[:,0]>0)&(ruv[:,0]<.17)&(abs(ruv[:,1]-.019)<.075)
restored=scope&~active
prior=np.load(source/'patch-evidence.npz')
flags=np.load(source/'r/sweep-flags.npz')
gate=json.loads((source/'artifact-gate.json').read_text())
repair=np.zeros(len(s),bool)
for key in ('collision','neighborLength','rogue'):
 ids=np.array(gate[key]['newIds']);repair[ids[ids<len(s)]]=True
changed=restored|prior['changed']|repair
# Restore blue attributes as well as actual fibers. 13g suppressed these paths
# after 13c painted them white. Density itself was never cleared here.
cupskin=values(skin.data,'cupm')[ni]
# earw also excludes stripes on nearby skull skin. Retain the inherited
# thickness-qualified cup mask for color, so the white temple stays white.
color=scope&(restored|((ruv[:,0]<.145)&(cupskin>.5))) if revision2 else scope&(restored|(ruv[:,0]<.145))
attrs['cupm'][color]=1;attrs['pale'][color]=0;attrs['fur_tone'][color]=1
attrs['fur_guided'][changed]=0
rng=np.random.default_rng(141016)

def smooth(q):
 q=np.clip(q,0,1);return q*q*(3-2*q)

def velvet(q):
 r=np.linalg.norm((coordinates(q)-[.057,.019])/[.024,.019],axis=1)
 return .25*smooth((1-r)/.6)

def collision(path):
 for a,b in zip(path[:-1],path[1:]):
  delta=b-a;length=np.linalg.norm(delta)
  if length>1e-7:
   eps=min(.0002,length*.15)
   if bvh.ray_cast(Vector(a+delta/length*eps),Vector(delta/length),max(0,length-2*eps))[0] is not None:return True
  for q in (b,(a+b)*.5):
   hit=bvh.find_nearest(Vector(q))
   if hit[0] is not None and np.dot(q-np.array(hit[0]),np.array(hit[1]))<-.0001:return True
 return False

rootshift=[];shortened=0
for i in np.where(changed)[0]:
 sl=slice(s[i],s[i]+counts[i]);q=roots[i]
 hit=bvh.find_nearest(Vector(q),.004)
 if hit[0] is None:
  nearest=bvh.find_nearest(Vector(q))
  print('UNATTACHED_SOURCE_ROOT',i,q.tolist(),nearest[3],bool(restored[i]),bool(repair[i]),flush=True)
  # Inactive legacy roots were not transferred when the cup moved the skin.
  # Reattach only to the same ear sheet, bounded by its stored root normal.
  hit=ear.find_nearest(Vector(q),.008)
  assert restored[i] and hit[0] is not None and np.dot(n[i],np.array(hit[1]))>.5,'Missing local root sheet'
 root=np.array(hit[0]);norm=np.array(hit[1]);root+=norm*.0007
 assert np.dot(norm,n[i])>0,'Native root changed surface side'
 assert np.linalg.norm(root-q)<(.0087 if restored[i] else .004),'Root attachment crossed sheets'
 rootshift.append(float(np.linalg.norm(root-q)))
 direction=np.array([np.sign(q[0])*.8,0,.6]);tangent=direction-norm*np.dot(direction,norm)
 tangent/=max(np.linalg.norm(tangent),1e-9)
 r=np.linalg.norm((ruv[i]-[.057,.019])/[.026,.021])
 blend=smooth((r-.5)/.75)
 length=(.002*(1-blend)+.008*blend)*rng.uniform(.8,1.2)
 t=np.linspace(0,1,counts[i]);accepted=False
 for attempt in range(8):
  lift=.0012+attempt*.0005
  path=root+t[:,None]*tangent*length+norm*(lift*np.sin(t*np.pi*.65))[:,None]
  if not collision(path):accepted=True;break
  length*=.82
 assert accepted,('Local coat collision',i)
 shortened+=attempt>0;p[sl]=path
 rad=max(float(original['radius'][s[i]]),.000135)*rng.uniform(.9,1.1)
 attrs['radius'][sl]=rad*(1-t)**1.35+.000001*t
 attrs['strlen'][i]=np.linalg.norm(np.diff(path,axis=0),axis=1).sum()
attrs['concha_velvet14'][:]=0
velvet_roots=np.zeros(len(s),np.float32);velvet_roots[scope]=velvet(p[s][scope])
attrs['concha_velvet14']=np.repeat(velvet_roots,counts)
p=p.astype(np.float32)
assert np.max(np.linalg.norm(p[s][changed&~restored]-roots[changed&~restored],axis=1))<.004
assert np.array_equal(p[np.repeat(~changed,counts)],old[np.repeat(~changed,counts)])
cu.points.foreach_set('position',p.ravel())
for name,q in attrs.items():cu.attributes[name].data.foreach_set('value',q)
skinw=np.zeros(len(co),np.float32);skinw[sheet]=velvet(co[sheet])
skin.data.attributes['concha_velvet14'].data.foreach_set('value',skinw)
# The existing material splice now has a cup-only C1 gradient and only a
# quarter-strength tint. Its underlying original graph remains untouched.
for mat in {bpy.data.materials['Akinza hair'],*skin.data.materials}:
 mat.node_tree.nodes['14 blue velvet'].inputs['Color'].default_value=lin('#8CBCE0')

tuft=bpy.data.objects['Akinza concha tuft 14'];hair=tuft.data
paths=[];radii=[];root_uv=[]
def ear_y(x,z):
 hit=ear.ray_cast(Vector((float(x),-.5,float(z))),Vector((0,1,0)),1)
 assert hit[0] is not None,('Outside ear sheet',x,z)
 return hit[0].y
for side in (-1,1):
 for i in range(1100):
  f=(i+rng.random())/1100
  v=.019+(f-.5)*(.026 if revision2 else .035)
  spread=.00035 if revision2 else .0015
  u=.057-.024*np.sqrt(max(0,1-((v-.019)/.021)**2))+rng.uniform(-spread,spread)
  root_uv.append([u,v]);start=np.array([side*(.17+.8*u-.6*v),0,.64+.6*u+.8*v])
  start[1]=ear_y(start[0],start[2])-.0008
  # One comb direction throughout. The band center is longest; length and
  # radius variation dissolve the boundary into individual wispy tips.
  length=((.020+.067*np.sin(np.pi*f)**.8)*rng.uniform(.60,1.15) if revision2 else (.026+.048*np.sin(np.pi*f)**.8)*rng.uniform(.78,1.12))
  du=length;dv=length*(.28 if revision2 else .10)+rng.normal(0,.0018)
  t=np.linspace(0,1,16);enduv=np.array([u+du,v+dv])
  end=np.array([side*(.17+.8*enduv[0]-.6*enduv[1]),0,.64+.6*enduv[0]+.8*enduv[1]])
  path=start+(end-start)*t[:,None]
  path[:,0]+=side*.0008*np.sin(np.pi*t)*np.sin(f*17)
  ys=np.array([ear_y(q[0],q[2]) for q in path])
  control=ys.min()-.019-rng.uniform(0,.004)
  path[:,1]=(1-t)**2*start[1]+2*t*(1-t)*control+t*t*(ys[-1]-.012)
  path[:,1]=np.minimum(path[:,1],ys-.0008)
  # Clear chords against this ear sheet only; never move native roots by a
  # frontmost head ray. The full skin collision check remains authoritative.
  for iteration in range(8):
   for j in range(1,len(path)):
    mid=(path[j-1]+path[j])*.5
    clearance=ear_y(mid[0],mid[2])-.0008
    if mid[1]>clearance:
     shift=mid[1]-clearance
     if j==1:path[j,1]-=shift*2
     else:path[j-1:j+1,1]-=shift
   if not collision(path):break
  assert not collision(path),('White fiber collision',side,i)
  paths.append(path);radius=rng.uniform(.000035,.000065) if revision2 else rng.uniform(.000045,.000085)
  radii.append((radius*(1-t)**1.65+.0000006*t) if not revision2 or i%4==0 else np.zeros_like(t))
paths=np.array(paths,np.float32);radii=np.array(radii,np.float32)
transition=np.zeros(len(s),bool)
undercoat_evidence={};undercoat_ob=None
if revision2:
 from undercoat_concha_fix14 import build as undercoat
 undercoat_ob,blue_paths,blue_radii,undercoat_evidence=undercoat(co,normal,uv,earw,values(skin.data,'cupm'),tri,p[s][restored],paths[:,0],bvh,collision,rng)
 from guard_concha_fix14 import guard
 p,attrs['strlen'],changed,transition=guard(source,out,p,s,counts,attrs['radius'],attrs['strlen'],np.r_[paths,blue_paths],np.r_[radii,blue_radii],changed,tree,collision)
 cu.points.foreach_set('position',p.ravel());cu.attributes['strlen'].data.foreach_set('value',attrs['strlen'])
hair.points.foreach_set('position',paths.ravel());hair.attributes['radius'].data.foreach_set('value',radii.ravel())
assert np.all(np.linalg.norm(np.diff(paths,axis=1),axis=2)<.015)
info.pop('delivery14',None)
if undercoat_ob:
 info['additionalFurObjects']=['Akinza concha tuft 14',undercoat_ob.name]
 info['strands']=len(s)+len(paths)+len(blue_paths)
 info['strandPoints']=len(p)+paths.size//3+blue_paths.size//3
info.update(parent=str(source),conchaFix14=dict(restoredBlue=int(restored.sum()),nativeEdited=int(changed.sum()),transitionTrimmed=int(transition.sum()),blueColorCorrected=int(color.sum()),whiteFibers=len(paths),visibleWhiteFibers=int((radii.max(axis=1)>0).sum()),maxNativeRootShift=max(rootshift),sourceSha256=hashlib.sha256((source/'surface.blend').read_bytes()).hexdigest(),build=out.name))
(out/'surface-info.json').write_text(json.dumps(info,indent=2)+'\n')
np.savez_compressed(out/'patch-evidence.npz',changed=changed,color=color,scope=scope,restored=restored,repair=repair,transition=transition,children=paths,radii=radii,rootUV=root_uv,skinWeight=skinw,**undercoat_evidence)
print('FIX_PRE_SAVE',info['conchaFix14'],'collisionShortened',shortened,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('FIX_SAVED',out,flush=True)
if revision2 and '--build-only' not in sys.argv:
 # Keep one exclusive PC lease through the native decision views and full
 # saved checks, rather than competing for another lease between operations.
 import runpy
 sys.argv=['render_concha_fix14.py','--',out.name,'ears-front,ear-root-close']
 runpy.run_path(str(HERE/'render_concha_fix14.py'),run_name='__main__')
 sys.argv=['check_concha_fix14.py','--',out.name]
 runpy.run_path(str(HERE/'check_concha_fix14.py'),run_name='__main__')

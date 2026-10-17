"""Continue the actual surrounding blue groom and grow visible white locks."""
import sys,json,hashlib,runpy
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from refine_ear_root_12b2 import values
from concha_fix2_14_paths import baseline
from guard_concha_fix14 import guard
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
source=baseline(work);out=work/sys.argv[sys.argv.index('--')+1]
assert not (out/'surface.blend').exists(),'Never overwrite an existing design build'
out.mkdir(exist_ok=True);bpy.ops.wm.open_mainfile(filepath=str(source/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
info=json.loads((source/'surface-info.json').read_text());prior=dict(np.load(source/'patch-evidence.npz'))
skin=bpy.data.objects[info['skin']];co=values(skin.data,'position','vector',3)
normal=np.empty_like(co);skin.data.vertex_normals.foreach_get('vector',normal.ravel())
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
tri=np.load(work/'14-fix-probe.npz')['tri'];earw=values(skin.data,'earw')
def uv(q):
 x=abs(q[:,0])-.17;z=q[:,2]-.64
 return np.c_[.8*x+.6*z,-.6*x+.8*z]
def smooth(q):
 q=np.clip(q,0,1);return q*q*(3-2*q)
suv=uv(co);sheet=(normal[:,1]<-.05)&(earw>.95)&(abs(co[:,0])>.15)&(suv[:,0]>-.01)
ear=BVHTree.FromPolygons(co.tolist(),tri[sheet[tri].all(1)].tolist(),all_triangles=True)
tree=KDTree(len(co))
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
cu=bpy.data.objects['Akinza fur'].data
starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts)
points=values(cu,'position','vector',3);original=points.copy();counts=np.diff(np.r_[starts,len(points)])
roots=points[starts];ruv=uv(roots);nrm=values(cu,'nrm','vector',3)
attrs={name:values(cu,name) for name in ('radius','strlen','cupm','pale','fur_tone','fur_guided')}
oldattrs={key:value.copy() for key,value in attrs.items()}
active=np.maximum.reduceat(attrs['radius'],starts)>0
changed=prior['changed']&~prior['transition'];color=prior['color'].copy()
nearest=np.array([tree.find(Vector(q))[1] for q in roots])
donor_mask=active&~prior['changed']&~prior['color']&(nrm[:,1]<-.15)&(earw[nearest]>.95)&(values(skin.data,'cupm')[nearest]>.5)&(ruv[:,0]>.14)&(ruv[:,0]<.23)&(abs(ruv[:,1]-.019)<.06)
donors=np.where(donor_mask)[0];assert len(donors)>1500
donor_map=np.full(len(starts),-1,np.int32);rng=np.random.default_rng(14160201)
for side in (-1,1):
 pool=donors[np.sign(roots[donors,0])==side];dt=KDTree(len(pool))
 for j,i in enumerate(pool):dt.insert(Vector((float(ruv[i,0]),float(ruv[i,1]),0)),j)
 dt.balance()
 for i in np.where((changed|color)&(np.sign(roots[:,0])==side))[0]:
  candidates=dt.find_n(Vector((float(ruv[i,0]),float(ruv[i,1]),0)),8)
  candidates=[pool[v[1]] for v in candidates if np.dot(nrm[pool[v[1]]],nrm[i])>.2]
  assert candidates
  donor_map[i]=candidates[int(rng.integers(len(candidates)))]
lifted=0
for i in np.where(changed)[0]:
 j=donor_map[i];sl=slice(starts[i],starts[i]+counts[i]);ds=slice(starts[j],starts[j]+counts[j])
 t=np.linspace(0,1,counts[i]);td=np.linspace(0,1,counts[j])
 offsets=np.column_stack([np.interp(t,td,original[ds,k]-roots[j,k]) for k in range(3)])
 hit=bvh.find_nearest(Vector(roots[i]));norm=np.array(hit[1]);assert np.dot(norm,nrm[i])>0
 rotation=np.array(Vector(nrm[j]).rotation_difference(Vector(norm)).to_matrix())
 offsets=offsets@rotation.T
 length=np.linalg.norm(np.diff(offsets,axis=0),axis=1).sum()
 rr=np.linalg.norm((ruv[i]-[.057,.019])/[.024,.019])
 blend=smooth((rr-.30)/.55);scale=(.0028*(1-blend)+length*blend)/length
 for attempt in range(14):
  path=roots[i]+offsets*scale+norm*(attempt*.00055*np.sin(t*np.pi*.75))[:,None]
  if not collision(path):break
 else:raise AssertionError(('Native template collides',int(i)))
 lifted+=attempt>0;points[sl]=path
 attrs['radius'][sl]=np.interp(t,td,oldattrs['radius'][ds])
 attrs['strlen'][i]=np.linalg.norm(np.diff(path,axis=0),axis=1).sum()
 attrs['fur_guided'][i]=oldattrs['fur_guided'][j]
for name in ('cupm','pale','fur_tone'):
 attrs[name][color]=oldattrs[name][donor_map[color]]
# The real native root density and radius profiles replace the fine felt layer.
fine=bpy.data.objects['Akinza inner ear undercoat 14 fix'];retired=len(fine.data.curves)
bpy.data.objects.remove(fine,do_unlink=True)
skin_weight=np.zeros(len(co),np.float32)
rr=np.linalg.norm((suv-[.057,.019])/[.015,.012],axis=1)
skin_weight[sheet]=.25*smooth((1-rr[sheet])/.55)
skin.data.attributes['concha_velvet14'].data.foreach_set('value',skin_weight)
root_weight=np.zeros(len(starts),np.float32);rr=np.linalg.norm((ruv-[.057,.019])/[.015,.012],axis=1)
root_weight[prior['scope']]=.25*smooth((1-rr[prior['scope']])/.55)
cu.attributes['concha_velvet14'].data.foreach_set('value',np.repeat(root_weight,counts))
def ear_y(x,z):
 hit=ear.ray_cast(Vector((float(x),-.5,float(z))),Vector((0,1,0)),1)
 assert hit[0] is not None,('Outside ear sheet',x,z)
 return hit[0].y
paths=[];radii=[];root_uv=[];lock_ids=[];t=np.linspace(0,1,24)
shaft=np.where(t<.70,1-.25*(t/.70)**1.5,.75*(np.maximum(1-t,0)/.30)**1.9)
for side in (-1,1):
 for lock in range(6):
  center=(lock+.5)/6
  for child in range(600):
   angle=np.deg2rad(168+107*center+rng.normal(0,4.5))
   u=.057+.024*np.cos(angle)+rng.normal(0,.00055)
   v=.019+.019*np.sin(angle)+rng.normal(0,.00055)
   root_uv.append([u,v]);lock_ids.append((side+1)*3+lock)
   length=(.075+.043*np.sin(np.pi*center)**.8)*rng.uniform(.73,1.16)
   du=length;dv=length*(.065+.07*np.sin(lock*1.7))+rng.normal(0,.0025)
   pathuv=np.c_[u+du*t,v+dv*t]
   pathuv[:,1]+=np.sin(np.pi*t)*rng.normal(0,.0015)+t*t*rng.normal(0,.0028)
   path=np.c_[side*(.17+.8*pathuv[:,0]-.6*pathuv[:,1]),np.zeros(len(t)),.64+.6*pathuv[:,0]+.8*pathuv[:,1]]
   ys=np.array([ear_y(q[0],q[2]) for q in path])
   clearance=.001+(.026+rng.uniform(0,.008))*np.sin(t*np.pi*.70)**.8
   path[:,1]=ys-clearance
   for attempt in range(8):
    if not collision(path):break
    path[1:,1]-=.001
   else:raise AssertionError(('White lock collides',side,lock,child))
   paths.append(path);radius=rng.uniform(.000120,.000180)
   radii.append(radius*shaft+.0000006*t)
paths=np.array(paths,np.float32);radii=np.array(radii,np.float32)
points,attrs['strlen'],changed,transition=guard(source,out,points,starts,counts,attrs['radius'],attrs['strlen'],paths,radii,changed,tree,collision,native_only_baseline=True)
cu.points.foreach_set('position',points.ravel())
for name,value in attrs.items():cu.attributes[name].data.foreach_set('value',value)
tuft=bpy.data.objects['Akinza concha tuft 14'];material=tuft.data.materials[0]
hair=bpy.data.hair_curves.new('White lower rim soft locks fix2');hair.add_curves([24]*len(paths));hair.points.foreach_set('position',paths.ravel())
hair.attributes.new('radius','FLOAT','POINT').data.foreach_set('value',radii.ravel());hair.materials.append(material);tuft.data=hair
assert np.array_equal(points[starts],roots),'Native roots moved'
info.pop('finalWhiteVisibility14Fix',None);info.pop('archive14Fix',None)
info.update(parent=str(source),additionalFurObjects=[tuft.name],strands=len(starts)+len(paths),strandPoints=len(points)+paths.size//3)
info['conchaFix2_14']=dict(build=out.name,sourceSha256=hashlib.sha256((source/'surface.blend').read_bytes()).hexdigest(),nativeEdited=int(changed.sum()),nativeProfileReplaced=int((prior['changed']&~prior['transition']).sum()),colorMatched=int(color.sum()),transitionTrimmed=int(transition.sum()),donorPool=len(donors),retiredFineFibers=retired,whiteFibers=len(paths),whiteLocks=12,whiteRootRadiusMicrons=[120,180],whiteShaftWidthAt60Percent=float(np.interp(.6,t,shaft)),nativeRootsExact=True,collisionLiftedNative=lifted)
(out/'surface-info.json').write_text(json.dumps(info,indent=2)+'\n')
np.savez_compressed(out/'patch-evidence.npz',changed=changed,color=color,scope=prior['scope'],restored=prior['restored'],transition=transition,children=paths,radii=radii,rootUV=root_uv,lockIds=lock_ids,skinWeight=skin_weight,donor=donor_map,originalTransition=prior['transition'])
print('FIX2_PRE_SAVE',info['conchaFix2_14'],flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
sys.argv=['render_concha_fix14.py','--',out.name,'ears-front,ear-root-close'];runpy.run_path(str(HERE/'render_concha_fix14.py'),run_name='__main__')
sys.argv=['check_concha_fix14.py','--',out.name,'--before',str(source)];runpy.run_path(str(HERE/'check_concha_fix14.py'),run_name='__main__')

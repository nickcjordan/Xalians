"""Local white ear furnishings, preserving the saved coat and blue skin mask."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values

before,out=map(Path,sys.argv[sys.argv.index('--')+1:])
info=json.loads((before/'surface-info.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
skin=bpy.data.objects[info['skin']];co=values(skin.data,'position','vector',3)
normal=np.empty(co.size,np.float32);skin.data.vertex_normals.foreach_get('vector',normal);normal=normal.reshape(-1,3)
tree=KDTree(len(co))
for i,p in enumerate(co):tree.insert(Vector(p),i)
tree.balance()
fur=bpy.data.objects['Akinza fur'];cu=fur.data
assert not fur.modifiers,'Expected baked baseline'
starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts)
points=values(cu,'position','vector',3);old=points.copy();roots=points[starts].copy();counts=np.diff(np.r_[starts,len(points)])
nearest=np.array([tree.find(Vector(p))[1] for p in roots])
n=normal[nearest];cupskin=values(skin.data,'cupm')[nearest]
x=abs(roots[:,0]);z=roots[:,2]
# A broad, tapered root band on the lower inner ear, never on skull skin.
u=(x-.17)*.80+(z-.64)*.60
eligible=(x>.165)&(x<.31)&(z>.61)&(z<.78)&(n[:,1]<-.4)&(cupskin>.05)&(u<.095)
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
thick=np.full(len(roots),np.inf)
for i in np.where(eligible)[0]:
    v=nearest[i];hit=bvh.ray_cast(Vector(co[v]-normal[v]*.0001),Vector(-normal[v]),.3)
    if hit[0] is not None:thick[i]=hit[3]+.0001
selected=eligible&(thick<.096)
radius=values(cu,'radius');cup=values(cu,'cupm');strlen=values(cu,'strlen')
oldattrs={k:v.copy() for k,v in [('radius',radius),('cupm',cup),('strlen',strlen)]}
active=np.maximum.reduceat(radius,starts)>0;selected&=active
rng=np.random.default_rng(121506)
for i in np.where(selected)[0]:
    sl=slice(starts[i],starts[i]+counts[i]);t=np.linspace(0,1,counts[i]);side=np.sign(roots[i,0])
    # Root-band edges graduate to short hairs. Small shared bends create soft locks.
    fade=np.clip((.095-u[i])/.030,0,1)*np.clip((x[i]-.165)/.020,0,1)
    lock=np.sin(x[i]*240-z[i]*120)
    length=.012+fade*(.055+.105*((lock+1)*.5)**1.5)*rng.uniform(.82,1.08)
    # Keep low roots softly furnished within their held head-region length rule.
    if co[nearest[i],2]<=.65 or abs(co[nearest[i],0])<=.14:length=min(length,.033)
    direction=np.array([side*(.70+.18*lock),-.04,.78-.18*lock])
    tangent=direction-n[i]*np.dot(direction,n[i]);tangent/=np.linalg.norm(tangent)
    arch=(.24+.12*(lock+1)*.5)*np.sin(t*np.pi*.80)+.12*t**1.5
    bend=np.array([side*.16,0,-.08])*t[:,None]**2*lock
    cross=np.cross(n[i],tangent);phase=rng.uniform(0,2*np.pi)
    wave=.035*np.sin(2*np.pi*t+phase)*np.sin(np.pi*t)
    path=roots[i]+length*(t[:,None]*tangent+arch[:,None]*n[i]+bend+wave[:,None]*cross)
    # Prevent folds from turning a furnishing strand back into the ear skin.
    valid=True
    for a,b in zip(path[:-1],path[1:]):
        delta=b-a;dist=np.linalg.norm(delta);hit=bvh.ray_cast(Vector(a+delta*.001),Vector(delta/dist),dist*.998)
        if hit[0] is not None:valid=False;break
    if not valid:selected[i]=False;continue
    points[sl]=path
    radius[sl]=(.00014+.000070*fade)*(1-t)**1.60+.000004
    cup[sl if cu.attributes['cupm'].domain=='POINT' else i]=0
    strlen[sl if cu.attributes['strlen'].domain=='POINT' else i]=length
out.mkdir(parents=True,exist_ok=True)
initial=selected.copy()
from guard_tuft_paths_12f import guard
selected=guard(before,out,points,old,starts,counts,selected,bvh)
restored=initial&~selected
for name,v in [('radius',radius),('cupm',cup),('strlen',strlen)]:
    mask=np.repeat(restored,counts) if cu.attributes[name].domain=='POINT' else restored
    v[mask]=oldattrs[name][mask]
cu.points.foreach_set('position',points.ravel())
for name,v in [('radius',radius),('cupm',cup),('strlen',strlen)]:cu.attributes[name].data.foreach_set('value',v)
out.mkdir(parents=True,exist_ok=True)
np.savez_compressed(out/'patch-evidence.npz',changed=selected,nearest=nearest,thickness=thick,roots=roots,curve_max_delta=np.maximum.reduceat(np.linalg.norm(points-old,axis=1),starts))
info.update(parent=str(before),earTuft12f=dict(selected=int(selected.sum()),seed=121506,method='lower thin inner-ear root band; long white curved tapered soft locks'))
(out/'surface-info.json').write_text(json.dumps(info,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('EAR_TUFT_SAVED',int(selected.sum()),flush=True)

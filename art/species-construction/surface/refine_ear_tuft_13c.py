"""Opaque triangular canal furnishings and a short soft ear-apex fringe."""
import sys,json,subprocess
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
before,out=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'));bpy.context.preferences.filepaths.save_version=0
info=json.loads((before/'surface-info.json').read_text());skin=bpy.data.objects[info['skin']]
co=values(skin.data,'position','vector',3);normal=np.empty(co.size,np.float32);skin.data.vertex_normals.foreach_get('vector',normal);normal=normal.reshape(-1,3)
tree=KDTree(len(co))
for i,p in enumerate(co):tree.insert(Vector(p),i)
tree.balance();bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
cu=bpy.data.objects['Akinza fur'].data;s=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',s)
p=values(cu,'position','vector',3);old=p.copy();counts=np.diff(np.r_[s,len(p)]);roots=p[s].copy()
nearest=np.array([tree.find(Vector(v))[1] for v in roots]);n=normal[nearest]
attrs={name:values(cu,name) for name in ('radius','cupm','strlen','pale','fur_tone','fur_guided')};oldattrs={k:v.copy() for k,v in attrs.items()}
x=abs(roots[:,0]);z=roots[:,2];u=(x-.17)*.8+(z-.64)*.6
v=(z-.64)*.8-(x-.17)*.6
eligible=(x>.165)&(x<.355)&(z>.61)&(z<.80)&(n[:,1]<-.4)&(values(skin.data,'cupm')[nearest]>.05)&(u<.140)
eligible&=abs(v-.015)<(.070*np.clip(1-u/.20,0,1)+.015)
active=np.maximum.reduceat(attrs['radius'],s)>0;eligible&=active
thick=np.full(len(s),np.inf)
for i in np.where(eligible)[0]:
    j=nearest[i];hit=bvh.ray_cast(Vector(co[j]-normal[j]*.0001),Vector(-normal[j]),.3)
    if hit[0] is not None:thick[i]=hit[3]+.0001
selected=eligible&(thick<.096);rng=np.random.default_rng(131503)
lock_coordinate=(v-.015)/.023
family=np.floor(lock_coordinate+.5).astype(int)
anchors={}
for side in (-1,1):
    for group in np.unique(family[selected]):
        members=selected&(np.sign(roots[:,0])==side)&(family==group)
        if members.any():anchors[side,int(group)]=np.mean(roots[members],axis=0)
for i in np.where(selected)[0]:
    sl=slice(s[i],s[i]+counts[i]);t=np.linspace(0,1,counts[i]);side=np.sign(roots[i,0])
    edge=np.clip((x[i]-.165)/.018,0,1)*np.clip((z[i]-.625)/.040,0,1)
    # A dense shared base covers the canal. Separate families emerge only
    # toward the narrowing outer triangle, leaving its root half opaque.
    group=int(family[i]);fraction=lock_coordinate[i]-group
    lock=np.exp(-(fraction/.38)**4);phase=group*1.73
    tip_u=.185-.050*np.clip(abs(v[i]-.015)/.075,0,1)**1.4
    length=(.027+edge*max(0,tip_u-u[i]-.027))*rng.uniform(.94,1.06)
    # Graduate out of the held short head coat instead of making a blunt hem
    # where the head-region length ceiling meets the long ear furnishings.
    short=min(length,.033)
    transition=np.clip((co[nearest[i],2]-.65)/.035,0,1)
    length=short+transition*(length-short)
    if abs(co[nearest[i],0])<=.14:length=short
    direction=np.array([side*(.80+.10*np.sin(phase)),-.08,.60-.10*np.sin(phase)]);tangent=direction-n[i]*np.dot(direction,n[i]);tangent/=np.linalg.norm(tangent)
    cross=np.cross(n[i],tangent);arch=(.23+.07*np.sin(phase))*np.sin(np.pi*.90*t)+.10*t*t
    wave=.055*np.sin(2*np.pi*t+rng.uniform(0,2*np.pi))*np.sin(np.pi*t)
    bend=np.array([side*.07,-.08-.05*np.cos(phase),-.04])*t[:,None]**2
    path=roots[i]+length*(t[:,None]*tangent+arch[:,None]*n[i]+wave[:,None]*cross+bend)
    anchor=anchors[side,group]
    path+=(anchor-roots[i])*.45*lock*t[:,None]**2
    path+=np.array([side*.6,0,-.8])*(v[i]-.015)*.45*t[:,None]**2
    actual=np.linalg.norm(np.diff(path,axis=0),axis=1).sum()
    if actual>.194:
        path=roots[i]+(path-roots[i])*(.194/actual);actual=.194
    valid=True
    for a,b in zip(path[:-1],path[1:]):
        delta=b-a;ln=np.linalg.norm(delta)
        if ln>1e-7 and bvh.ray_cast(Vector(a+delta*.001),Vector(delta/ln),ln*.998)[0] is not None:valid=False;break
    if not valid:selected[i]=False;continue
    p[sl]=path;attrs['radius'][sl]=(.00018+.00013*edge)*(1-t)**1.45+.000003
    for name,value in [('cupm',0),('strlen',actual),('pale',1),('fur_tone',1),('fur_guided',1)]:attrs[name][sl if cu.attributes[name].domain=='POINT' else i]=value
tuft=selected.copy()
# Shorten the coherent apex brush as a group, with a broad smooth transition
# into neighboring rim length. Resample the existing path prefix, preserving
# every root and avoiding a scaled path cutting through the ear surface.
diagonal=x*.8+z*.6
apex=active&(x>.39)&(z>.81)&(diagonal>.86)
rim=np.zeros(len(s),bool)
for i in np.where(apex)[0]:
    sl=slice(s[i],s[i]+counts[i]);path=old[sl];length=np.linalg.norm(np.diff(path,axis=0),axis=1).sum()
    fade=np.clip((diagonal[i]-.86)/.050,0,1);fade=fade*fade*(3-2*fade)
    target=.065-.034*fade
    if length<=target:continue
    arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
    sample=np.linspace(0,target,counts[i])
    p[sl]=np.column_stack([np.interp(sample,arc,path[:,axis]) for axis in range(3)]);rim[i]=True
    attrs['strlen'][sl if cu.attributes['strlen'].domain=='POINT' else i]=target
selected|=rim
out.mkdir(parents=True,exist_ok=True);initial=selected.copy()
from guard_tuft_paths_12f import guard
selected=guard(before,out,p,old,s,counts,selected,bvh)
baseline_rogue=np.load(before/'r/rogue-flags.npz')['rogue']
def win(path):
    value=str(path.resolve());assert value.startswith('/mnt/');return value[5].upper()+':'+value[6:]
for iteration in range(12):
    # The legacy guard updates pre-save evidence for precisely these paths.
    with (out/f'rogue-guard-{iteration}.log').open('w') as log:
        subprocess.run(['/mnt/c/Python314/python.exe',win(Path(__file__).with_name('rogue_hairs_13.py')),win(out/'pre-save')],stdout=log,stderr=subprocess.STDOUT,check=True)
    new=np.load(out/'pre-save/rogue-flags.npz')['rogue']&~baseline_rogue
    if not new.any():break
    restore=new&selected
    for i in np.where(new&~selected)[0]:restore|=selected&(np.linalg.norm(roots-roots[i],axis=1)<.018)
    assert restore.any(),'No local cause for new rogue flag'
    for i in np.where(restore)[0]:p[s[i]:s[i]+counts[i]]=old[s[i]:s[i]+counts[i]]
    selected[restore]=False
    selected=guard(before,out,p,old,s,counts,selected,bvh)
else:raise AssertionError('Rogue guard did not converge')
for name,v in attrs.items():
    mask=np.repeat(initial&~selected,counts) if cu.attributes[name].domain=='POINT' else initial&~selected
    v[mask]=oldattrs[name][mask];cu.attributes[name].data.foreach_set('value',v)
cu.points.foreach_set('position',p.ravel())
np.savez_compressed(out/'patch-evidence.npz',changed=selected,tuft=tuft&selected,rim=rim&selected,roots=roots,nearest=nearest,thickness=thick,curve_max_delta=np.maximum.reduceat(np.linalg.norm(p-old,axis=1),s))
info.update(parent=str(before),earTuft13c=dict(selected=int((tuft&selected).sum()),rimTrimmed=int((rim&selected).sum()),seed=131503,method='opaque white triangular canal fan with soft lock tips; smoothly shortened apex fringe'))
(out/'surface-info.json').write_text(json.dumps(info,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'));print('EAR_TUFT_SAVED',int(selected.sum()),flush=True)

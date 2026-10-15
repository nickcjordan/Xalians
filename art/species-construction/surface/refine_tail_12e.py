"""Apply the local continuous tail patch, with an exterior-path guard."""
import sys
import json
import hashlib
import subprocess
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values

before,out=map(Path,sys.argv[sys.argv.index('--')+1:])
plan=np.load(out/'planned-patch.npz');info=json.loads((before/'surface-info.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
skin=bpy.data.objects[info['skin']];bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
fur=bpy.data.objects['Akinza fur'];assert not fur.modifiers,'Expected the baked s12d parent'
cu=fur.data;old=values(cu,'position','vector',3);points=plan['points'].copy();starts=plan['starts'];counts=np.diff(np.r_[starts,len(points)])
selected=plan['changed'];assert np.isfinite(points).all();assert np.array_equal(old[starts],points[starts])
assert np.array_equal(old[~np.repeat(selected,counts)],points[~np.repeat(selected,counts)])
corrections=out/'artifact-corrections.json'
if not corrections.exists():
    corrections=Path(__file__).with_name('akinza-tail-12e-corrections.json')
restored=[]
if corrections.exists():
    correction=json.loads(corrections.read_text())
    assert correction['beforeSurfaceSha256']==hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest()
    restored=correction['restoreRootPaths']
    for i in restored:
        assert selected[i] and plan['tail_id'][i]>0
        sl=slice(starts[i],starts[i]+counts[i]);points[sl]=old[sl]


def bad(path):
    for j in range(1,len(path)):
        delta=path[j]-path[j-1];length=float(np.linalg.norm(delta))
        if length>1e-7:
            eps=min(.0002,length*.15)
            hit=bvh.ray_cast(Vector(path[j-1]+delta/length*eps),Vector(delta/length),max(length-2*eps,0))
            if hit[0] is not None:return True
        for q in (path[j],(path[j]+path[j-1])*.5):
            hit=bvh.find_nearest(Vector(q))
            if hit[0] is not None and np.dot(q-np.array(hit[0]),np.array(hit[1]))<-.0005:return True
    return False


repairs=[]
for i in np.where(selected)[0]:
    sl=slice(starts[i],starts[i]+counts[i]);path=points[sl].copy()
    if not bad(path):continue
    # A cap strand must remain as short as its new neighbors. Blending in the
    # old long plume made isolated spikes at two cap roots in build 2.
    hit=bvh.find_nearest(Vector(old[starts[i]]));normal=np.array(hit[1])
    v=np.linspace(0,1,counts[i]);candidate=old[starts[i]]+normal*.012*v[:,None]
    for attempt in range(24):
        if not bad(candidate):break
        candidate=old[starts[i]]+(candidate-old[starts[i]])*.8
    assert not bad(candidate),f'Unresolved cap path: {i}'
    points[sl]=candidate;repairs.append(dict(strand=int(i),method='short exterior cap hair'))
points[starts]=old[starts]
assert np.array_equal(points[starts],old[starts]),'Final roots differ'
# Check the actual complete flag definitions before the final save. Restoring a
# newly offending selected path preserves the parent's known-safe local growth.
baseline_data=np.load(before/'r/evidence.npz');baseline_collision=np.load(before/'r/collision-evidence.npz')
collision={k:baseline_collision[k].copy() for k in baseline_collision.files}
co=baseline_data['co'];tree=KDTree(len(co))
for i,q in enumerate(co):tree.insert(Vector(q),i)
tree.balance()
for i in np.where(selected)[0]:
    sl=slice(starts[i],starts[i]+counts[i]);path=points[sl]
    collision['penetration'][i]=0;collision['intersections'][i]=0;collision['max_clearance'][i]=0
    collision['tip_nearest'][i]=tree.find(Vector(path[-1]))[1]
    for j in range(1,len(path)):
        for q in (path[j],(path[j]+path[j-1])*.5):
            hit=bvh.find_nearest(Vector(q))
            if hit[0] is None:continue
            key='penetration' if np.dot(q-np.array(hit[0]),np.array(hit[1]))<0 else 'max_clearance'
            collision[key][i]=max(collision[key][i],hit[3])
pre=out/'pre-save';pre.mkdir(parents=True,exist_ok=True)
np.save(pre/'selected.npy',selected)


def win(path):
    s=str(path.resolve());assert s.startswith('/mnt/')
    return s[5].upper()+':'+s[6:]


guard_history=[]
for iteration in range(5):
    export={k:baseline_data[k] for k in baseline_data.files}
    export.update(points=points,roots=points[starts],first=points[starts+1]-points[starts])
    np.savez_compressed(pre/'evidence.npz',**export)
    np.savez_compressed(pre/'collision-evidence.npz',**collision)
    # Windows Python supplies SciPy; Blender remains the only Blender process.
    cmd=['/mnt/c/Python314/python.exe',win(Path(__file__).with_name('guard_artifacts_12e.py')),win(pre),win(before)]
    with (pre/f'guard-{iteration}.log').open('w') as log:
        subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
    result=json.loads((pre/'guard-result.json').read_text());guard_history.append(result)
    if result['remaining']==0:break
    assert result['restore'],'A new flag has no selected cause'
    for i in result['restore']:
        assert selected[i]
        sl=slice(starts[i],starts[i]+counts[i]);points[sl]=old[sl]
        for key in ['penetration','intersections','max_clearance','tip_nearest']:
            collision[key][i]=baseline_collision[key][i]
else:raise AssertionError('Pre-save artifact gate did not converge')
(out/'artifact-guard-history.json').write_text(json.dumps(guard_history,indent=2))
assert np.array_equal(points[starts],old[starts])
cu.points.foreach_set('position',points.ravel())
np.savez_compressed(out/'patch-evidence.npz',changed=selected,tail_id=plan['tail_id'],hip_blend=plan['hip_blend'],starts=starts,before_points=old,after_points=points)
(out/'exterior-guard.json').write_text(json.dumps(dict(selected=int(selected.sum()),capRepairs=repairs,restoredRootPaths=restored),indent=2))
info.update(parent=str(before),baked=True,tailPatch12e=dict(seed=121205,selected=int(selected.sum()),method='single continuous analytic radial/lift and sweep envelope, original fixed roots and density, proximal smoothstep blend, local hip length blend',capRepairs=len(repairs),restoredRootPaths=len(restored)))
(out/'surface-info.json').write_text(json.dumps(info,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('TAIL_PATCH_SAVED',len(repairs),'cap repairs',len(restored),'restored root paths',flush=True)

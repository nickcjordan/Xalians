"""Repair tail-contaminated body fur, groom chest/ribs and resolve skin crossings."""
import argparse
import hashlib
import json
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
from build_surface import smoothstep, unit


def mask(r, n):
    x = np.abs(r[:, 0])
    # Chest and ribs join the medial upper arm. Outer arm and back stay held.
    torso = 1-smoothstep((x-.18)/.055)
    medial = 1-smoothstep((n[:, 0]*np.sign(r[:, 0])+.2)/.4)
    arm = smoothstep((x-.17)/.04)*medial*(1-smoothstep((x-.31)/.04))
    return (np.maximum(torso, arm)*smoothstep((r[:, 2]+.10)/.07)
            *(1-smoothstep((r[:, 2]-.36)/.08))
            *(1-smoothstep((r[:, 1]-.015)/.10)))


def fingerprint(skin, cu, selected, starts, points):
    changed_points = np.repeat(selected, np.diff(np.r_[starts, len(points)]))
    result = {}
    for a in cu.attributes:
        if a.data_type not in ('FLOAT', 'FLOAT_VECTOR', 'INT', 'BOOLEAN'): continue
        width = 3 if a.data_type == 'FLOAT_VECTOR' else 1
        v = np.empty(len(a.data)*width, np.float32 if a.data_type.startswith('FLOAT') else np.int32)
        a.data.foreach_get('vector' if width == 3 else 'value', v)
        v = v.reshape(-1, width)
        outside = ~selected if a.domain == 'CURVE' else ~changed_points
        result[a.name] = hashlib.sha256(v[outside].tobytes()).hexdigest()
    return result


def main():
    p = argparse.ArgumentParser(); p.add_argument('--before', type=Path, required=True); p.add_argument('--out', type=Path, required=True)
    p.add_argument('--sweep', type=Path, help='Baseline sweep folder, including when --before is archived')
    a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
    info = json.loads((a.before/'surface-info.json').read_text())
    bpy.ops.wm.open_mainfile(filepath=str(a.before/'surface.blend'))
    bpy.context.preferences.filepaths.save_version = 0
    skin = bpy.data.objects[info['skin']]; me = skin.data
    co = values(me, 'position', 'vector', 3)
    normal = np.empty(co.size, np.float32); me.vertex_normals.foreach_get('vector', normal); normal=normal.reshape(-1,3)
    fur = bpy.data.objects['Akinza fur']; cu=fur.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.copy(); fur.modifiers.clear(); fur.data=cu
    starts=np.empty(len(cu.curves),np.int32); cu.curves.foreach_get('first_point_index',starts)
    counts=np.diff(np.r_[starts,len(cu.points)])
    points=values(cu,'position','vector',3); original=points.copy(); roots=points[starts].copy()
    tree=KDTree(len(co))
    for i,v in enumerate(co): tree.insert(Vector(v),i)
    tree.balance(); nearest=np.array([tree.find(Vector(v))[1] for v in roots])
    n=normal[nearest]
    sweep_folder=a.sweep or a.before.parent/'12d-before'
    sweep=np.load(sweep_folder/'sweep-flags.npz')
    collision=np.load(sweep_folder/'collision-evidence.npz')
    chest_weights=mask(roots,n)
    body=sweep['body']; actual_tail=sweep['actualTail']
    tail_influence=values(me,'ptail')[nearest]
    contamination=body & ~actual_tail & (tail_influence>.02)
    weights=np.maximum(chest_weights, contamination*smoothstep((tail_influence-.02)/.08))
    reshape=sweep['repair'] & body & ~sweep['collision'] & ~actual_tail
    weights=np.maximum(weights,reshape.astype(float))
    selected=(weights>0)|sweep['collision']
    oldfp=fingerprint(skin,cu,selected,starts,points)
    comb=values(cu,'combp','vector',3)
    if len(comb)==len(points):comb=comb[starts]
    bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
    rng=np.random.default_rng(121204)
    radius=values(cu,'radius'); oldradius=radius.copy()
    # A continuous field spreads from the sternum around the ribs and down.
    def flow(pos, nn):
        side=1 if pos[0]>=0 else -1
        outward=.48*np.tanh(abs(pos[0])/.08)
        direction=np.array([side*outward,.20*min(abs(pos[0])/.17,1),-1.0])
        direction-=nn*np.dot(direction,nn)
        return direction/max(np.linalg.norm(direction),1e-8)
    for i in np.where(weights>0)[0]:
        count=counts[i]; t=np.linspace(0,1,count); sl=slice(starts[i],starts[i]+count)
        chest=1-smoothstep((abs(roots[i,0])-.09)/.10)
        length=(.010+.007*chest)*rng.uniform(.78,1.22)
        if chest_weights[i]<.01:length=.014*rng.uniform(.8,1.2)
        phase=rng.uniform(0,2*np.pi); wave=rng.uniform(.00018,.00045)
        nn=n[i].copy(); pos=roots[i].astype(float).copy(); shaped=[pos.copy()]
        for j in range(1,count):
            natural=flow(pos,nn)
            held=comb[i]-nn*np.dot(comb[i],nn);held/=max(np.linalg.norm(held),1e-8)
            direction=natural*chest_weights[i]+held*(1-chest_weights[i]);direction/=max(np.linalg.norm(direction),1e-8)
            lateral=np.cross(nn,direction)
            # Smooth wave has no shared convergence point and no straight tip.
            step=direction*length/(count-1)+lateral*wave*(np.sin(2.4*np.pi*t[j]+phase)-np.sin(2.4*np.pi*t[j-1]+phase))
            query=pos+step
            hit=bvh.find_nearest(Vector(query))
            if hit[0] is not None:
                nn=np.array(hit[1]); base=np.array(hit[0])
                clearance=.00022+.00085*np.sin(np.pi*t[j]*.85)
                pos=base+nn*clearance
            else: pos=query
            shaped.append(pos.copy())
        w=weights[i]; points[sl]=original[sl]*(1-w)+np.array(shaped)*w
        newradius=(rng.uniform(.00036,.00048)*(1-t)**1.15+.000012)
        radius[sl]=radius[sl]*(1-w)+newradius*w
    # Repair only colliding paths outside the grooming area, preserving their length
    # and visible silhouette whenever the original points are already exterior.
    for i in np.where(selected)[0]:
        sl=slice(starts[i],starts[i]+counts[i]);path=points[sl].astype(float).copy();initial=path.copy();n0=n[i]
        displacement_cap=.025 if sweep['region'][i] in (2,3) else .03
        for iteration in range(16):
            changed=False
            for j in range(1,len(path)):
                q=path[j];hit=bvh.find_nearest(Vector(q))
                if hit[0] is not None and np.dot(q-np.array(hit[0]),np.array(hit[1]))<-.00005:
                    # A ray from the root-facing exterior retains the ear's own
                    # sheet side rather than snapping a back root through the cup.
                    ray=bvh.ray_cast(Vector(q+n0*.15),Vector(-n0),.3)
                    if ray[0] is not None and np.dot(np.array(ray[1]),n0)>.05 and np.linalg.norm(np.array(ray[0])-q)<.05:
                        path[j]=np.array(ray[0])+np.array(ray[1])*.00035
                    else:path[j]=np.array(hit[0])+np.array(hit[1])*.00035
                    changed=True
                delta=path[j]-path[j-1];ln=np.linalg.norm(delta)
                if ln<1e-8:continue
                mid=(path[j]+path[j-1])*.5;h=bvh.find_nearest(Vector(mid))
                ray=bvh.ray_cast(Vector(path[j-1]+delta/ln*.00012),Vector(delta/ln),max(ln-.00024,0))
                signed=np.dot(mid-np.array(h[0]),np.array(h[1])) if h[0] is not None else 1
                if signed<-.00005 or ray[0] is not None:
                    # Shift the chord outside, with the root fixed.
                    nn=np.array(h[1]) if h[0] is not None else n0
                    if np.dot(nn,n0)<-.2:nn=n0
                    push=max(.0003,.00025-signed)
                    path[j]+=nn*push*1.8
                    if j>1:path[j-1]+=nn*push*.6
                    changed=True
            delta=path-initial;reach=np.linalg.norm(delta,axis=1)
            path=initial+delta*np.minimum(1,displacement_cap/np.maximum(reach,1e-12))[:,None]
            if not changed:break
        points[sl]=path
        if i%50000==0:print('REPAIR',i,flush=True)
    cu.points.foreach_set('position',points.ravel()); cu.attributes['radius'].data.foreach_set('value',radius)
    assert oldfp==fingerprint(skin,cu,selected,starts,points), 'Unselected fur changed'
    # No skin attribute, geometry, pattern input, material or root is edited.
    assert np.array_equal(points[starts],original[starts])
    a.out.mkdir(parents=True,exist_ok=True)
    np.savez_compressed(a.out/'patch-evidence.npz',changed=selected,weights=weights,nearest=nearest,
        before_points=original,after_points=points,starts=starts,normal=n,chest_weights=chest_weights,contamination=contamination,actual_tail=actual_tail,
        radius_before=oldradius,radius_after=radius)
    (a.out/'protection-check.json').write_text(json.dumps(dict(unselectedAttributesEqual=True,rootsEqual=True,unselectedFingerprints=oldfp),indent=2))
    info.update(parent=str(a.before),localChestPatch=dict(seed=121204,changedCurves=int(selected.sum()),coreCurves=int((weights>.99).sum()),sourceTailCut=dict(z=[-1,1],y=[.105,.105],soft=.015),method='remove tail influence on connected non-tail body; surface-following chest paths; minimal exterior collision repair'),baked=True)
    (a.out/'surface-info.json').write_text(json.dumps(info,indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(a.out/'surface.blend'))
    print('PATCHED',int(selected.sum()),flush=True)
if __name__=='__main__': main()

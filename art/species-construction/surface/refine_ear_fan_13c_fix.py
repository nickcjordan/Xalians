"""Build an arc-root canal fan and shorten tips past the measured ear rim."""
import sys
import json
import hashlib
import subprocess
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from refine_ear_root_12b2 import values
before, out, plan = map(Path, sys.argv[sys.argv.index('--')+1:])
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before/'surface-info.json').read_text())
skin = bpy.data.objects[info['skin']]
co = values(skin.data, 'position', 'vector', 3)
normal = np.empty(co.size, np.float32)
skin.data.vertex_normals.foreach_get('vector', normal); normal = normal.reshape(-1, 3)
tree = KDTree(len(co))
for i, q in enumerate(co): tree.insert(Vector(q), i)
tree.balance()
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
cu = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(cu.curves), np.int32); cu.curves.foreach_get('first_point_index', starts)
points = values(cu, 'position', 'vector', 3); old = points.copy()
counts = np.diff(np.r_[starts, len(points)]); roots = points[starts].copy()
nearest = np.array([tree.find(Vector(q))[1] for q in roots])
attrs = {name: values(cu, name) for name in ('radius','cupm','strlen','pale','fur_tone','fur_guided')}
original_attrs = {name: q.copy() for name, q in attrs.items()}
active = np.maximum.reduceat(attrs['radius'], starts) > 0
lengths = np.load(before/'r/sweep-flags.npz')['length']
x = abs(roots[:, 0]); z = roots[:, 2]
u = (x-.17)*.8+(z-.64)*.6; v = (z-.64)*.8-(x-.17)*.6
cup = values(skin.data, 'cupm')[nearest]
eligible = active & (x>.15) & (x<.36) & (z>.61) & (z<.81) & (normal[nearest,1]<-.20) & (cup>.05)
boundary_scope = active & (x>.16) & (x<.28) & (z>.61) & (z<.78) & (u<.12)
boundary_scope &= (normal[nearest,1]<-.20) & (values(skin.data,'earw')[nearest]>.98)
previous_tuft=np.load(before/'patch-evidence.npz')['tuft']
opening_tree=KDTree(int(previous_tuft.sum()))
for j,i in enumerate(np.where(previous_tuft)[0]):opening_tree.insert(Vector(roots[i]),j)
opening_tree.balance();opening_distance=np.full(len(starts),np.inf)
for i in np.where(boundary_scope)[0]:opening_distance[i]=opening_tree.find(Vector(roots[i]))[2]
boundary_scope&=opening_distance<.018
thickness = np.full(len(starts), np.inf)
for i in np.where(eligible|boundary_scope)[0]:
    j = nearest[i]
    hit = bvh.ray_cast(Vector(co[j]-normal[j]*.0001), Vector(-normal[j]), .3)
    if hit[0] is not None: thickness[i] = hit[3]+.0001
scope = eligible & (thickness<.096) & (u<.17)
boundary_scope &= (thickness<.18) & (co[nearest,2]>.60)
center = .020; half = .050
arc_u = .060+.010*((v-center)/half)**2
weight = np.exp(-((u-arc_u)/.021)**4)
arc = scope & (abs(v-center)<half) & (weight>.035) & (z>.65)
curve_cup = attrs['cupm'][starts] if cu.attributes['cupm'].domain=='POINT' else attrs['cupm']
inherited = scope & (curve_cup<.15) & (lengths>.019)
tuft = inherited | arc
rim = np.zeros(len(starts), bool)
tip_plan = np.load(plan/'tip-plan.npz')
median = float(tip_plan['median']); outline = tip_plan['outline']
target_overhang=tip_plan['target'] if 'target' in tip_plan else np.full(len(starts),median)
requested_rim = tip_plan['selected'] & active
rim_scope = active & (x>.32) & (z>.74)
az, el = np.deg2rad([155,24])
camera = np.array([np.sin(az)*np.cos(el),-np.cos(az)*np.cos(el),np.sin(el)])
right = np.cross(-camera,[0,0,1]); right /= np.linalg.norm(right)
up = np.cross(right,-camera); camera_target = np.array([.395,.015,.837])

def project(q):
    q = np.array(q, copy=True); q[:,0] = abs(q[:,0]); q -= camera_target
    return np.column_stack([q@right,q@up])

def excess(q):
    q = project(np.atleast_2d(q)); distance = np.full(len(q),np.inf)
    cross = []
    for a,b in zip(outline,np.roll(outline,-1,axis=0)):
        delta=b-a; t=np.clip((q-a)@delta/np.dot(delta,delta),0,1)
        distance=np.minimum(distance,np.linalg.norm(q-a-t[:,None]*delta,axis=1))
        cross.append(delta[0]*(q[:,1]-a[1])-delta[1]*(q[:,0]-a[0]))
    inside=np.all(np.array(cross)>=-1e-9,axis=0)
    return np.where(inside,-distance,distance)

def set_attr(name, i, value):
    sl=slice(starts[i],starts[i]+counts[i]) if cu.attributes[name].domain=='POINT' else i
    attrs[name][sl]=value

def prefix(i, length):
    sl=slice(starts[i],starts[i]+counts[i]); path=old[sl]
    arclength=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
    if length>=arclength[-1]-1e-7:points[sl]=path
    else:
        sample=np.linspace(0,min(length,arclength[-1]),counts[i])
        points[sl]=np.column_stack([np.interp(sample,arclength,path[:,k]) for k in range(3)])
    set_attr('strlen',i,float(np.linalg.norm(np.diff(points[sl],axis=0),axis=1).sum()))

def clear_furnishing(i):
    prefix(i,.010)
    for name in ('cupm','pale','fur_tone','fur_guided'):
        set_attr(name,i,float(values_cache[name][nearest[i]]))

values_cache={name:values(skin.data,name) for name in ('cupm','pale','fur_tone','fur_guided')}
rng=np.random.default_rng(131601)
for i in np.where(tuft)[0]:
    if not arc[i]: clear_furnishing(i); continue
    side=np.sign(roots[i,0]); vv=np.clip((v[i]-center)/half,-1,1); w=weight[i]
    tip_u=.185-.070*abs(vv)**1.5
    tip_v=center+.010*vv
    end=np.array([side*(.17+.8*tip_u-.6*tip_v),roots[i,1]-.020,.64+.6*tip_u+.8*tip_v])
    end=roots[i]+w*(end-roots[i])+(1-w)*np.array([side*.009,0,.007])
    end_hit=bvh.find_nearest(Vector(end))
    end=np.array(end_hit[0])+np.array(end_hit[1])*(.002+.010*w)
    t=np.linspace(0,1,counts[i]); phase=rng.uniform(0,2*np.pi)
    for j,tj in enumerate(t):
        if j==0:continue
        wish=(1-tj)*roots[i]+tj*end
        wish+=np.array([0,-1,0])*.019*w*np.sin(np.pi*tj)**.75
        wish+=np.array([side*.6,0,-.8])*.0018*np.sin(2*np.pi*tj+phase)*np.sin(np.pi*tj)
        hit=bvh.find_nearest(Vector(wish))
        # Keep the smooth arch rather than snapping every sample onto the
        # folded cup. Only prevent actual near-surface penetration.
        if np.dot(wish-np.array(hit[0]),np.array(hit[1]))<.0004:
            wish=np.array(hit[0])+np.array(hit[1])*.0006
        points[starts[i]+j]=wish
    sl=slice(starts[i],starts[i]+counts[i])
    set_attr('radius',i,(.00012+.00015*w)*(1-t)**1.45+.000003)
    for name,value in [('cupm',cup[i]*(1-w**.35)),('pale',1),('fur_tone',1),('fur_guided',1),
                       ('strlen',np.linalg.norm(np.diff(points[sl],axis=0),axis=1).sum())]:
        set_attr(name,i,float(value))

for i in np.where(requested_rim)[0]:
    sl=slice(starts[i],starts[i]+counts[i]); path=old[sl]
    # Locate the first crossing of the median offset along the original path.
    samples=np.linspace(0,1,129)
    arclength=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
    positions=np.column_stack([np.interp(samples*arclength[-1],arclength,path[:,k]) for k in range(3)])
    crossing=np.where(excess(positions)>target_overhang[i]*.98)[0]
    if not len(crossing):continue
    prefix(i,arclength[-1]*samples[max(1,crossing[0]-1)]);rim[i]=True

# Repair numerical gate outliers inside the two authorized ear scopes rather
# than silently restoring the very brush or old white flap being repaired.
base=dict(np.load(before/'r/evidence.npz'))
baseline_col=dict(np.load(before/'r/collision-evidence.npz'))
baseline_flags=np.load(before/'r/sweep-flags.npz')
baseline_rogue=np.load(before/'r/rogue-flags.npz')['rogue']
obstacles=dict(np.load(before/'r/obstacle-evidence.npz'))
pre=out/'pre-save';pre.mkdir(exist_ok=True)
def win(path):
    text=str(path.resolve());assert text.startswith('/mnt/');return text[5].upper()+':'+text[6:]
history=[];restored=np.zeros(len(starts),bool);fringe=np.zeros(len(starts),bool)
seen_states=set()
for iteration in range(48):
    selected=tuft|rim; col={key:q.copy() for key,q in baseline_col.items()}
    for i in np.where(selected)[0]:
        path=points[starts[i]:starts[i]+counts[i]]
        col['penetration'][i]=0;col['intersections'][i]=0;col['max_clearance'][i]=0
        col['tip_nearest'][i]=tree.find(Vector(path[-1]))[1]
        for a,b in zip(path[:-1],path[1:]):
            delta=b-a;length=np.linalg.norm(delta);eps=min(.0002,length*.15)
            if length>1e-7 and bvh.ray_cast(Vector(a+delta/length*eps),Vector(delta/length),max(length-2*eps,0))[0] is not None:col['intersections'][i]+=1
            for q in (b,(a+b)*.5):
                hit=bvh.find_nearest(Vector(q));key='penetration' if np.dot(q-np.array(hit[0]),np.array(hit[1]))<0 else 'max_clearance'
                col[key][i]=max(col[key][i],hit[3])
    data=dict(base);data.update(points=points,first=points[starts+1]-points[starts])
    np.savez_compressed(pre/'evidence.npz',**data);np.savez_compressed(pre/'collision-evidence.npz',**col)
    np.savez_compressed(pre/'obstacle-evidence.npz',**obstacles)
    for script in ('analyze_sweep_12d.py','rogue_hairs_13.py'):
        with (pre/f'{iteration}-{script}.log').open('w') as log:
            subprocess.run(['/mnt/c/Python314/python.exe',win(HERE/script),win(pre)],stdout=log,stderr=subprocess.STDOUT,check=True)
    flags=np.load(pre/'sweep-flags.npz');new=np.zeros(len(starts),bool);report={}
    for key in ('collision','neighborLength','regionalLength','partTransfer','lift'):
        mask=flags[key]&~baseline_flags[key];new|=mask;report[key]=int(mask.sum())
    rogue=np.load(pre/'rogue-flags.npz')['rogue']&~baseline_rogue;new|=rogue;report['rogue']=int(rogue.sum());history.append(report)
    print('FAN_GUARD',iteration,report,flush=True)
    (out/'guard-history.json').write_text(json.dumps(history,indent=2)+'\n')
    if not new.any():break
    state=hashlib.sha256(points.tobytes()+new.tobytes()).hexdigest()
    if state in seen_states:
        raise AssertionError('Ear fix guards repeated an unchanged failing geometry; no model saved')
    seen_states.add(state)
    for i in np.where(new)[0]:
        if rim_scope[i] and not restored[i] and not fringe[i]:
            current=float(flags['length'][i]);prefix(i,min(current*.75,.022));rim[i]=True
        elif (scope[i] or boundary_scope[i]) and not restored[i] and not fringe[i]:
            current=float(flags['length'][i])
            if not scope[i]:
                prefix(i,min(current*.75,.018))
            elif arc[i] and tuft[i]:
                sl=slice(starts[i],starts[i]+counts[i]);points[sl]=roots[i]+(points[sl]-roots[i])*.82
                set_attr('strlen',i,current*.82)
            else:clear_furnishing(i)
            tuft[i]=True
        else:
            if fringe[i]:
                # A lone pinned fringe must still make progress. Its held
                # physical path is valid; retain the native cleanup color.
                prefix(i,float(lengths[i]))
            local=selected&(np.linalg.norm(roots-roots[i],axis=1)<.018)
            assert local.any(),'New artifact outside authorized local scopes without a local cause'
            for j in np.where(local)[0]:
                if j==i:continue
                sl=slice(starts[j],starts[j]+counts[j]);points[sl]=old[sl]
                if inherited[j] or fringe[j]:
                    # Keep old-flap cleanup. Blend the native undercoat length
                    # into the held neighbor instead of restoring a white hem.
                    target=max(float(flags['length'][j]) if fringe[j] else 0,
                               min(float(lengths[j]),float(flags['length'][i])/1.85))
                    radius_index=sl if cu.attributes['radius'].domain=='POINT' else j
                    attrs['radius'][radius_index]=original_attrs['radius'][radius_index]
                    clear_furnishing(j);prefix(j,target)
                    fringe[j]=True;arc[j]=False;tuft[j]=True
                    continue
                for name in attrs:
                    index=sl if cu.attributes[name].domain=='POINT' else j
                    attrs[name][index]=original_attrs[name][index]
            reverted=local&~fringe;reverted[i]=False
            restored|=reverted;tuft[reverted]=False;rim[reverted]=False
else:raise AssertionError('Ear fix guards did not converge')

selected=tuft|rim
for name,q in attrs.items():cu.attributes[name].data.foreach_set('value',q)
cu.points.foreach_set('position',points.ravel())
np.savez_compressed(out/'patch-evidence.npz',changed=selected,tuft=tuft,rim=rim,
                    roots=roots,nearest=nearest,thickness=thickness,fix13c=True,
                    colorTuft=tuft&scope,boundaryRepair=tuft&~scope,
                    openingDistance=opening_distance,fringe=fringe,
                    requestedRim=requested_rim,arc=arc&tuft,restored=restored,
                    curve_max_delta=np.maximum.reduceat(np.linalg.norm(points-old,axis=1),starts))
(out/'guard-history.json').write_text(json.dumps(history,indent=2)+'\n')
info.update(parent=str(before),earFan13cFix=dict(arcCurves=int((arc&tuft).sum()),
    furnishingCurves=int(tuft.sum()),rimTrimmed=int(rim.sum()),requestedRim=int(requested_rim.sum()),
    requestedRetained=int((requested_rim&rim).sum()),medianRimOverhang=median,
    boundaryRepairs=int((tuft&~scope).sum()),
    cleanupRestored=int((inherited&restored).sum()),nativeFringe=int(fringe.sum()),
    method='short opening arc, upward convergent surface-lifted white fan; projected tip-envelope trim'))
(out/'surface-info.json').write_text(json.dumps(info,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('EAR_FAN_FIX_SAVED',info['earFan13cFix'],flush=True)

# Keep the exclusive process slot for the required first visual inspection.
# The renderer reopens the saved model, so these images show saved data.
import review_fur_13
import render_surface
sys.argv=[sys.argv[0],'--','--surface',str(out),'--out',str(out/'r'),
          '--views','ears-front,ear-root-close,ear-tip-close',
          '--samples','32','--palette','T7']
render_surface.main()

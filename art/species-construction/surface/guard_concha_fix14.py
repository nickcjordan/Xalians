"""Before saving, run the unchanged full numeric tests on proposed paths.

The final saved skin and solid sweeps are still required. Only local native
transition hairs may be prefix-trimmed; accepted ear-back paths stay exact.
"""
import sys,json,subprocess
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def guard(source,out,points,starts,counts,radius,strlen,children,radii,changed,tree,collision):
 here=Path(__file__).resolve().parent
 base=dict(np.load(source/'r/evidence.npz'));col=dict(np.load(source/'r/collision-evidence.npz'))
 before=np.load(source/'r/sweep-flags.npz');oldrogue=np.load(source/'r/rogue-flags.npz')['rogue']
 from concha_14_paths import baseline as baseline13i
 protected=np.load(baseline13i(source.parent)/'patch-evidence.npz')
 protected=protected['restore']|protected['trim']|protected['changed']
 n=len(starts);allstarts=np.r_[starts,len(points)+np.arange(len(children))*children.shape[1]]
 allcounts=np.r_[counts,np.full(len(children),children.shape[1])]
 extra=len(allstarts)-len(before['region'])
 assert extra>=0
 col={key:np.r_[v,np.zeros(extra,dtype=v.dtype)] for key,v in col.items()}
 transition=np.zeros(n,bool);history=[];pre=out/'pre-save';pre.mkdir(exist_ok=True)
 dirty=np.r_[changed,np.ones(len(children),bool)]
 def win(path):
  path=str(path.resolve());assert path.startswith('/mnt/');return path[5].upper()+':'+path[6:]
 for iteration in range(24):
  allpoints=np.r_[points,children.reshape(-1,3)];roots=allpoints[allstarts]
  nearest=np.array([tree.find(Vector(q))[1] for q in roots],np.int32)
  tip=allpoints[allstarts+allcounts-1]
  col['nearest']=nearest;col['tip_nearest']=np.array([tree.find(Vector(q))[1] for q in tip],np.int32)
  edited=np.r_[changed,np.ones(len(children),bool)]
  # The builder collision-tests its proposed paths and every resampled prefix.
  # Full fresh saved sweeps follow this pre-save neighborhood guard.
  col['penetration'][edited]=0;col['intersections'][edited]=0
  data=dict(base)
  data.update(points=allpoints,starts=allstarts,roots=roots,first=allpoints[allstarts+1]-roots)
  data['curve_nrm']=np.r_[base['curve_nrm'][:n],base['normal'][nearest[n:]]]
  for key in ('curve_combp','curve_comb_flow'):
   if key in base:data[key]=np.r_[base[key][:n],children[:,1]-children[:,0] if key=='curve_combp' else np.ones(len(children))]
  col['active']=np.r_[np.maximum.reduceat(radius,starts)>0,radii.max(axis=1)>0]
  # Calculate clearance against the actual mesh for exactly the edited curves.
  import bpy
  bvh=BVHTree.FromObject(bpy.data.objects['akinza_continuous_construction'],bpy.context.evaluated_depsgraph_get())
  for i in np.where(dirty)[0]:
   path=allpoints[allstarts[i]:allstarts[i]+allcounts[i]];clear=0
   for a,b in zip(path[:-1],path[1:]):
    for q in (b,(a+b)*.5):
     hit=bvh.find_nearest(Vector(q));clear=max(clear,hit[3])
   col['max_clearance'][i]=clear
  np.savez_compressed(pre/'evidence.npz',**data);np.savez_compressed(pre/'collision-evidence.npz',**col)
  # All edited paths are local to the ear base, clear of separate solids.
  # Preserve their existing test data for the pre-save neighborhood analysis.
  if not (pre/'obstacle-evidence.npz').exists():
   obstacles=dict(np.load(source/'r/obstacle-evidence.npz'))
   obstacles={key:np.r_[v,np.zeros(extra,dtype=v.dtype)] if v.ndim==1 and len(v)==len(before['region']) else v for key,v in obstacles.items()}
   np.savez_compressed(pre/'obstacle-evidence.npz',**obstacles)
  for script in ('analyze_sweep_12d.py','rogue_hairs_13.py'):
   with (pre/f'{iteration}-{script}.log').open('w') as log:
    subprocess.run(['/mnt/c/Python314/python.exe',win(here/script),win(pre)],stdout=log,stderr=subprocess.STDOUT,check=True)
  flags=np.load(pre/'sweep-flags.npz');rogue=np.load(pre/'rogue-flags.npz')['rogue']
  bad=np.zeros(len(allstarts),bool);report={}
  for key in ('collision','neighborLength','regionalLength','partTransfer','lift','rogue'):
   a=oldrogue if key=='rogue' else before[key];a=np.r_[a,np.zeros(extra,bool)];b=rogue if key=='rogue' else flags[key]
   new=b&~a;bad|=new;report[key]=int(new.sum())
  history.append(report);(out/'guard-history.json').write_text(json.dumps(history,indent=2)+'\n')
  print('FIX_GUARD',iteration,report,flush=True)
  if not bad.any():break
  assert not bad[n:].any(),'White tuft requires a design correction'
  dirty=bad.copy()
  for i in np.where(bad[:n])[0]:
   root=roots[i];normal=base['curve_nrm'][i]
   side_crease=(root[1]<-.015 and abs(root[0])<.19)
   assert .15<abs(root[0])<.36 and .60<root[2]<.82 and (normal[1]<0 or side_crease) and not protected[i],'New flag outside authorized front ear-base transition'
   sl=slice(starts[i],starts[i]+counts[i]);path=points[sl]
   length=float(flags['length'][i]);target=min(.017,length*.8)
   arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
   for retry in range(12):
    candidate=np.column_stack([np.interp(np.linspace(0,min(target,arc[-1]),counts[i]),arc,path[:,k]) for k in range(3)])
    if not collision(candidate):break
    target*=.8
   else:raise AssertionError('Transition prefix collides; no save')
   points[sl]=candidate
   strlen[i]=np.linalg.norm(np.diff(points[sl],axis=0),axis=1).sum()
   changed[i]=True;transition[i]=True
 else:raise AssertionError('No guard convergence; no saved build')
 return points,strlen,changed,transition

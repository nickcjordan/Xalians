"""Construct a continuous plume envelope on fixed roots without stripe bands."""
import argparse
import json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from tail_profile_12e import coordinates, widths, unit


def smooth(x):
    x=np.clip(x,0,1);return x*x*(3-2*x)


def main():
    p=argparse.ArgumentParser();p.add_argument('--before',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();d=np.load(a.before/'r/evidence.npz');f=np.load(a.before/'r/sweep-flags.npz');c=np.load(a.before/'r/collision-evidence.npz')
    ni=c['nearest'];tails=coordinates(d,f,ni);original=d['points'];points=original.copy();starts=d['starts'];counts=np.diff(np.r_[starts,len(points)])
    roots=d['roots'];n=unit(d['curve_nrm']);selected=np.zeros(len(starts),bool);tail_id=np.zeros(len(starts),np.int8)
    rng=np.random.default_rng(121205)
    for tail in tails:
        ids=np.where(tail['selected'])[0];spl=tail['spline'];grid=tail['grid']
        s=d['attr_tailpos'][ni[ids]];u=np.clip((s-grid[0])/np.ptp(grid),0,1)
        tangent=unit(spl(s,1));radial=unit(n[ids]-tangent*np.sum(n[ids]*tangent,axis=1)[:,None])
        # One analytic envelope, with no group, stripe, or clump-cell lookup.
        sine=np.maximum(0,np.sin(np.pi*u.astype(float)**.90))
        height=.012+.020*(1-u)+.065*sine**1.7
        sweep=.025+.050*sine**1.2+.035*smooth((u-.70)/.30)
        variation=rng.uniform(.65,1.40,len(ids));phase=rng.uniform(0,2*np.pi,len(ids))
        sweep_var=rng.uniform(.60,1.50,len(ids));bend=rng.uniform(1.25,2.15,len(ids))
        arc=rng.uniform(.8,1.5,len(ids));fan=rng.uniform(-.13,.13,len(ids))
        for j,i in enumerate(ids):
            v=np.linspace(0,1,counts[i]);side=np.cross(tangent[j],radial[j])
            sl=slice(starts[i],starts[i]+counts[i])
            # Preserve the parent's authored curl residual, excluding its shared
            # low-order clump bend. Independent variation breaks the hard edge.
            delta=original[sl]-roots[i]
            basis=np.stack((v,v*v),axis=1)
            residual=delta-basis@np.linalg.lstsq(basis,delta,rcond=None)[0]
            displacement=(radial[j]*height[j]*variation[j]*np.sin(v[:,None]*np.pi/2)**arc[j]
                          +tangent[j]*sweep[j]*sweep_var[j]*v[:,None]**bend[j]
                          +side*height[j]*fan[j]*v[:,None]**2
                          +side*.0025*(.4+sine[j])*(np.sin(v[:,None]*2*np.pi+phase[j])-np.sin(phase[j]))*v[:,None]
                          +residual*.7)
            root_blend=smooth(u[j]/.06)
            points[sl]=points[sl]*(1-root_blend)+(roots[i]+displacement)*root_blend
        selected[ids]=True;tail_id[ids]=tail['number']
    # Only the short connection to hip coat is allowed beyond the true tubes.
    proximal=np.concatenate([d['co'][x['skin'] & (d['attr_tailpos']<x['grid'][0]+.04)] for x in tails])
    distance=cKDTree(proximal).query(roots)[0]
    hip=(f['region']==6)&(roots[:,1]>.095)&(d['attr_ptail'][ni]>.02)
    blend=(1-smooth(distance/.065))*hip
    length=f['length'];target=.014+.014*(1-smooth(distance/.05))
    weights=blend*smooth(abs(length-target)/.012)
    for i in np.where(weights>0)[0]:
        sl=slice(starts[i],starts[i]+counts[i]);scale=1+weights[i]*(min(2,target[i]/max(length[i],1e-8))-1)
        points[sl]=roots[i]+(points[sl]-roots[i])*scale
    selected|=weights>0
    # Blended float32 products can round even a mathematically fixed root.
    points[starts]=roots
    a.out.mkdir(parents=True,exist_ok=True)
    np.savez_compressed(a.out/'planned-patch.npz',points=points,changed=selected,tail_id=tail_id,hip_blend=weights,starts=starts)
    before=widths(d,tails,ni);after=widths(dict(d,points=points),tails,ni)
    result=dict(method='48 fixed skin-centerline stations; all saved strand points assigned spatially to the fixed centerline; transverse 1st-99th percentile width plus extrema in exact 4-degree side/back camera projections; unsmoothed widths',before=before,after=after)
    result['comparison']=[dict(tail=b['tail'],views={k:dict(beforeJump=b['views'][k]['largestJump'],afterJump=z['views'][k]['largestJump'],jumpRatio=z['views'][k]['largestJump']/b['views'][k]['largestJump'],midWidthRatio=z['views'][k]['midWidth']/b['views'][k]['midWidth']) for k in b['views']}) for b,z in zip(before,after)]
    (a.out/'planned-widths.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result['comparison'],indent=2));print('Selected',selected.sum(),'hip',int((weights>0).sum()))


if __name__=='__main__':main()

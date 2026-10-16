"""Measure a localized visible-wire correction without spending a Blender build."""
import ast
import json
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from analyze_sweep_12d import unit

guarded = '--guard' in sys.argv
if guarded:sys.argv.remove('--guard')
details = '--details' in sys.argv
if details:sys.argv.remove('--details')
visible_only = '--visible-only' in sys.argv
if visible_only:sys.argv.remove('--visible-only')
before, original, after = map(Path, sys.argv[1:4])
patch = np.load(after/'patch-evidence.npz')
plan = np.load(after/'allowance-0.009-strength-1.00-protected/trim-plan.npz')
base = dict(np.load(before/'r/evidence.npz'))
original_points = np.load(original/'r/evidence.npz')['points']
s = base['starts'];counts = np.diff(np.r_[s, len(base['points'])]);ends = s+counts-1
native = len(patch['starts']);r = base['roots'];normals = unit(base['curve_nrm'])
active = np.load(before/'r/collision-evidence.npz')['active']
flags = np.load(before/'r/sweep-flags.npz');reg = flags['region']
az, el = np.deg2rad([155,24]);camera = np.array([np.sin(az)*np.cos(el),-np.cos(az)*np.cos(el),np.sin(el)])
right = np.cross(-camera,[0,0,1]);right /= np.linalg.norm(right);up = np.cross(right,-camera)
outline = patch['outline']
source = ast.parse(Path(__file__).with_name('restore_ear_back_13i.py').read_text())
exec(compile(ast.Module(body=[q for q in source.body if isinstance(q,ast.FunctionDef)],type_ignores=[]),'outline_helpers','exec'))
center = np.array([.497,.070,.866]);mirrored = r[:native].copy();mirrored[:,0] = abs(mirrored[:,0])
distance = np.linalg.norm(mirrored-center,axis=1)
fade = np.clip((.021-distance)/.014,0,1);fade = fade*fade*(3-2*fade)
if visible_only:
    # The full-size close review identifies the descending wire bundle. Gate
    # its tip corridor as well as its physical apex roots, leaving the upper
    # fluffy ridge and the shorter supporting hairs intact.
    end_original = original_points[ends[:native]].copy()
    end_original[:,0] = abs(end_original[:,0])
    relative=end_original-np.array([.395,.015,.837])
    screen_x=500+relative@right*4000;screen_y=500-relative@up*4000
    fx=np.clip((200-screen_x)/60,0,1);fy=np.clip((screen_y-780)/70,0,1)
    fade *= fx*fx*(3-2*fx)*fy*fy*(3-2*fy)
co=base['co'];ear=co[(co[:,0]>.30)&(co[:,2]>.73)]
d=np.max(.8*ear[:,0]+.6*ear[:,2])-(.8*abs(r[:native,0])+.6*r[:native,2])
root_weight=np.clip((.038-d)/.020,0,1);root_weight=root_weight*root_weight*(3-2*root_weight)
# Include every neighbor whose diagnostic can change, with generous padding.
check = np.where((np.linalg.norm(np.column_stack([abs(r[:,0]),r[:,1:]])-center,axis=1)<.075)|
                 (np.linalg.norm(r-r[18319],axis=1)<.04))[0]
dist,idx = cKDTree(r).query(r[check],k=97,workers=-1)
local=(dist<.018)&(np.sum(normals[idx]*normals[check,None],axis=2)>.65)&(reg[idx]==reg[check,None])&active[idx];local[:,0]=False
near=(dist[:,:25]<.014)&(np.sum(normals[idx[:,:25]]*normals[check,None],axis=2)>.5)&(reg[idx[:,:25]]==reg[check,None])&active[idx[:,:25]];near[:,0]=False

def measure(points):
    delta=np.linalg.norm(np.diff(points,axis=0,append=points[-1:]),axis=1);delta[ends]=0;length=np.add.reduceat(delta,s)
    tip=points[ends]-r;flow=unit(tip);straight=np.linalg.norm(tip,axis=1)/np.maximum(length,1e-9)
    with np.errstate(invalid='ignore'):
        q=np.nanpercentile(np.where(local,length[idx],np.nan),70,axis=1)
        ls=np.nanmedian(np.where(local,straight[idx],np.nan),axis=1)
        envelope=np.nanpercentile(np.where(local,np.sum(tip[idx]*flow[check,None],axis=2),np.nan),85,axis=1)
        median=np.nanmedian(np.where(near,length[idx[:,:25]],np.nan),axis=1)
    q=np.where(np.isfinite(q),q,length[check]);ls=np.where(np.isfinite(ls),ls,straight[check]);envelope=np.where(np.isfinite(envelope),envelope,np.linalg.norm(tip[check],axis=1))
    alignment=np.sum(flow[check]*unit(np.sum(np.where(local[:,:,None],flow[idx],0),axis=1)),axis=1)
    excess=np.linalg.norm(tip[check],axis=1)-envelope;l=length[check];st=straight[check]
    rogue=((l>np.maximum(q*1.8,q+.012))&(excess>.009))|((st>.985)&(l>np.maximum(q*1.4,q+.009))&(excess>.008))|((st>np.maximum(.94,ls+.06))&(l>.018)&(excess>np.maximum(.009,.20*q)))|((alignment<.4)&(l>.018)&(excess>np.maximum(.012,q*.30)))|((st>.97)&(alignment<.85)&(l>.025)&(excess>.006))
    rogue &= active[check]&(local.sum(1)>=8)
    if details:
        row=int(np.where(check==466)[0][0])
        print('466_DETAIL',dict(length=float(l[row]),neighbor70=float(q[row]),straight=float(st[row]),
            neighborStraight=float(ls[row]),alignment=float(alignment[row]),excess=float(excess[row])),flush=True)
    long=(l>np.maximum(np.where(np.isfinite(median),median,l)*2.2,.022))&active[check]
    return rogue,long,length

history=[]
for strength in map(float,sys.argv[4:]):
    points=base['points'].copy();points[:len(original_points)]=plan['points']
    w=np.maximum(plan['weight'],fade*root_weight*strength)
    trim=plan['trim'].copy()
    focused=patch['restore']&(w>plan['weight']+1e-7)&(patch['originalOverhang']>patch['target']+.001)
    for i in np.where(focused)[0]:
        sl=slice(s[i],s[i]+counts[i]);path=original_points[sl]
        arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
        samples=np.linspace(0,arc[-1],129);dense=np.column_stack([np.interp(samples,arc,path[:,k]) for k in range(3)])
        limit=patch['originalOverhang'][i]*(1-w[i])+patch['target'][i]*w[i]
        cross=np.where(excess(dense)>limit)[0]
        if not len(cross):continue
        sample=np.linspace(0,samples[max(1,cross[0]-1)],counts[i])
        points[sl]=np.column_stack([np.interp(sample,arc,path[:,k]) for k in range(3)]);trim[i]=True
    # This inherited length outlier is already an authorized overhanging apex
    # trim. Correct it independently of the nonapex restoration decision.
    i=18319;sl=slice(s[i],s[i]+counts[i]);path=points[sl].copy();arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
    sample=np.linspace(0,min(arc[-1],.079),counts[i]);points[sl]=np.column_stack([np.interp(sample,arc,path[:,k]) for k in range(3)])
    rog,long,length=measure(points)
    protected_ids = []
    if guarded:
        # Restore a few supporting neighbors rather than shortening a hair
        # whose tip is inside the outline. Most of the visible brush still
        # receives the stronger localized cut.
        protected_points = base['points'].copy()
        protected_points[:len(original_points)] = plan['points']
        for iteration in range(64):
            if not rog.any():break
            benefit = {}
            for row in np.where(rog)[0]:
                i = check[row];direction=unit(points[ends[i]]-r[i])
                neighbors=idx[row][local[row]]
                candidates=neighbors[(neighbors<native)]
                candidates=candidates[(w[candidates]>plan['weight'][candidates]+1e-7)&focused[candidates]]
                for j in candidates:
                    gain=float(np.dot(protected_points[ends[j]]-points[ends[j]],direction))
                    if gain>0:benefit[j]=benefit.get(j,0)+gain
            if not benefit:break
            j=max(benefit,key=benefit.get);slj=slice(s[j],s[j]+counts[j])
            points[slj]=protected_points[slj];w[j]=plan['weight'][j];trim[j]=plan['trim'][j]
            protected_ids.append(int(j));rog,long,length=measure(points)
    item=dict(strength=strength,focused=int(focused.sum()),rogue=int(rog.sum()),newLength=int((long&~flags['neighborLength'][check]).sum()),rogueIds=check[rog].tolist())
    item['supportingNeighborsRestored']=protected_ids
    history.append(item);print('13I_FOCUS',item,flush=True)
    folder=after/f'focus-{strength:.2f}{"-guarded" if guarded else ""}{"-visible" if visible_only else ""}';folder.mkdir(exist_ok=True)
    np.savez_compressed(folder/'trim-plan.npz',points=points[:len(original_points)],trim=trim,target=plan['target'],weight=w)
    (folder/'metrics.json').write_text(json.dumps(item,indent=2)+'\n')
(after/'focus-measurements.json').write_text(json.dumps(history,indent=2)+'\n')

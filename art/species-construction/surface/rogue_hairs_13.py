"""Local envelope and flow outliers, including thin straight silhouette strays.

Uses fixed physical thresholds and active neighbors on the same surface side and
region. Deliberate ear locks and tail plumes are compared to their own neighbors.
The diagnostic is additive to the unchanged step 12d tests, never a replacement.
"""
import json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from analyze_sweep_12d import unit


def analyze(folder):
    folder=Path(folder)
    d=np.load(folder/'evidence.npz');c=np.load(folder/'collision-evidence.npz');f=np.load(folder/'sweep-flags.npz')
    r=d['roots'];p=d['points'];s=d['starts'];counts=np.diff(np.r_[s,len(p)]);end=s+counts-1
    active=c['active'];reg=f['region'];n=unit(d['curve_nrm']);length=f['length'];tip=p[end]-r;flow=unit(tip)
    dist,idx=cKDTree(r).query(r,k=97,workers=-1)
    local=(dist<.018)&(np.sum(n[idx]*n[:,None],axis=2)>.65)&(reg[idx]==reg[:,None])&active[idx]
    local[:,0]=False
    with np.errstate(invalid='ignore'):
        q=np.nanpercentile(np.where(local,length[idx],np.nan),70,axis=1)
    q=np.where(np.isfinite(q),q,length)
    mean=unit(np.sum(np.where(local[:,:,None],flow[idx],0),axis=1))
    alignment=np.sum(flow*mean,axis=1);straight=np.linalg.norm(tip,axis=1)/np.maximum(length,1e-9)
    local_straight=np.nanmedian(np.where(local,straight[idx],np.nan),axis=1)
    local_straight=np.where(np.isfinite(local_straight),local_straight,straight)
    # Neighbor tip envelope measured along each strand direction. Root-relative
    # vectors avoid treating the anatomical ear apex as a hair-length outlier.
    projected=np.sum(tip[idx]*flow[:,None],axis=2)
    envelope=np.nanpercentile(np.where(local,projected,np.nan),85,axis=1)
    envelope=np.where(np.isfinite(envelope),envelope,np.linalg.norm(tip,axis=1))
    excess=np.linalg.norm(tip,axis=1)-envelope
    enough=local.sum(1)>=8
    long=(length>np.maximum(q*1.8,q+.012))&(excess>.009)
    straight_stray=(straight>.985)&(length>np.maximum(q*1.40,q+.009))&(excess>.008)
    straight_stray|=(straight>np.maximum(.94,local_straight+.06))&(length>.018)&(excess>np.maximum(.009,.20*q))
    contrary=(alignment<.40)&(length>.018)&(excess>np.maximum(.012,q*.30))
    # Native ear-tip review exposed a long, nearly straight 45-degree stray
    # that is not longer than its neighbors. Its tip still clears their envelope.
    oblique=(straight>.97)&(alignment<.85)&(length>.025)&(excess>.006)
    rogue=(long|straight_stray|contrary|oblique)&active&enough
    np.savez_compressed(folder/'rogue-flags.npz',rogue=rogue,long=long&rogue,straight=straight_stray&rogue,contrary=contrary&rogue,oblique=oblique&rogue,neighborLength=q,neighborStraightness=local_straight,envelopeExcess=excess,flowAlignment=alignment,region=reg)
    names=list(json.loads((folder/'sweep-metrics.json').read_text())['regions'])
    report=dict(method=dict(radius=.018,neighbors=96,minNeighbors=8,lengthRatio=1.8,straightness=.985,straightLengthRatio=1.4,relativeStraightness=.06,flowCosine=.4,obliqueFlowCosine=.85,obliqueStraightness=.97,obliqueEnvelopeExcess=.006),total=int(rogue.sum()),regions={name:int((rogue&(reg==i)).sum()) for i,name in enumerate(names)})
    (folder/'rogue-metrics.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    return rogue

if __name__=='__main__':
    import sys
    analyze(sys.argv[1])

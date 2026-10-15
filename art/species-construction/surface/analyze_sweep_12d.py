"""All-strand neighbor, transfer and lift flags, with per-region cluster counts."""
import sys,json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

def unit(v):return v/np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-9)
def actual_tails(d):
 co=d["co"]; tube=d["attr_tail_tube"];e=d["edges"];allow=(tube>.80)&(co[:,1]>.085)&(co[:,2]<.16)
 ok=allow[e].all(axis=1);ee=e[ok];graph=coo_matrix((np.ones(len(ee)*2),(np.r_[ee[:,0],ee[:,1]],np.r_[ee[:,1],ee[:,0]])),shape=(len(co),len(co))).tocsr()
 _,labels=connected_components(graph,directed=False);seeds=allow&(co[:,1]>.27);return allow&np.isin(labels,np.unique(labels[seeds]))

def regions(co,tube):
 x=np.abs(co[:,0]);y=co[:,1];z=co[:,2]
 names=['chest-ribs','neck','head','ears','arms','hands','hips','legs','feet','tails']
 v=np.zeros(len(co),np.int32)
 v[z>.36]=1;v[z>.48]=2;v[(z>.65)&(x>.14)]=3
 v[z<-.12]=6;v[(z<-.28)&(y<.14)]=7
 v[(x>.205)&(z<.35)&(z>-.24)]=4
 v[(x>.32)&(z<-.10)&(z>-.29)]=5
 v[(z<-.82)&(y<.14)]=8
 v[tube]=9
 return v,names

def analyze(folder):
 d=np.load(folder/'evidence.npz');c=np.load(folder/'collision-evidence.npz');r=d['roots'];n=unit(d['curve_nrm']);s=d['starts'];p=d['points'];counts=np.diff(np.r_[s,len(p)]);ends=s+counts-1
 seg=np.linalg.norm(np.diff(p,axis=0,append=p[-1:]),axis=1);seg[ends]=0;length=np.add.reduceat(seg,s)
 active=c['active'] if 'active' in c else np.ones(len(r),bool)
 ni=c['nearest'];ti=c['tip_nearest'];tube=actual_tails(d);skinreg,names=regions(d['co'],tube);reg=skinreg[ni];tipreg=skinreg[ti]
 tree=cKDTree(r);dist,idx=tree.query(r,k=25,workers=-1)
 local=(dist<.014)&(np.sum(n[idx]*n[:,None,:],axis=2)>.5)&(reg[idx]==reg[:,None]);local&=active[idx];local[:,0]=False
 lens=np.where(local,length[idx],np.nan);med=np.nanmedian(lens,axis=1);med=np.where(np.isfinite(med),med,length)
 clear=c['max_clearance'];cl=np.where(local,clear[idx],np.nan);cm=np.nanmedian(cl,axis=1);cm=np.where(np.isfinite(cm),cm,clear)
 long=(length>np.maximum(med*2.2,.022))
 body=np.isin(reg,[0,1,4,5,6,7,8])
 # Regional length norms catch entire contaminated bands, which a neighbor ratio misses.
 regional=np.choose(reg,[.040,.035,.04,.20,.040,.022,.075,.035,.022,1.0])
 regional_long=length>regional
 lift=clear>np.maximum(2.5*cm,np.where(body,.006,.025))
 rootpart=np.where(np.isin(reg,[0,1,6]),0,reg);tippart=np.where(np.isin(tipreg,[0,1,6]),0,tipreg)
 transfer=(rootpart!=tippart)&(np.linalg.norm(d['co'][ti]-r,axis=1)>.025)&(np.linalg.norm(p[ends]-d['co'][ti],axis=1)<.018)
 collision=(c['penetration']>.0006)|(c['intersections']>0)
 skin_collision=collision.copy();obstacle_collision=np.zeros(len(r),bool)
 if (folder/'obstacle-evidence.npz').exists():
  ob=np.load(folder/'obstacle-evidence.npz')
  if 'closedMesh' in ob:
   obstacle_collision=(ob['penetration']>.0006)|(ob['intersections']>0);collision|=obstacle_collision
 flags={k:v&active for k,v in dict(collision=collision,neighborLength=long,regionalLength=regional_long,partTransfer=transfer,lift=lift).items()}
 anyflag=np.logical_or.reduce(list(flags.values()))
 # Long tail and ear plumes can legitimately cross regional boundaries or exceed neighbors.
 # Penetrations still require repair; approved plume volume stays held otherwise.
 repair=(collision|((long|regional_long|lift|transfer)&body))&active
 metrics={'method':{'allStrands':len(r),'activeStrands':int(active.sum()),'culledZeroRadiusCurves':int((~active).sum()),'allSegments':int((counts-1).sum()),'testedActiveSegments':int((counts[active]-1).sum()),'penetrationThreshold':.0006,'neighborRadius':.014,'neighbors':24,'neighborLengthRatio':2.2,'regionalLengthLimits':dict(zip(names,regional[np.array([np.where(reg==i)[0][0] for i in range(len(names))])].tolist())),'transfer':'different major spatial skin part, root to nearest tip surface >.025 and tip within .018','lift':'surface clearance >2.5 times neighboring median and >.006 body / .025 head and plume','caveat':'Spatial part labels are diagnostics, not rig bone IDs; transitions and intentional ear/tail overhang need review.'},'regions':{}}
 for k,name in enumerate(names):
  m=reg==k;f=m&anyflag
  clusters=[]
  if f.any():
   cell=np.floor(r[f]/.04).astype(int);ids,inv,num=np.unique(cell,axis=0,return_inverse=True,return_counts=True)
   for j in np.argsort(num)[-8:][::-1]:
    ids2=np.where(f)[0][inv==j];clusters.append(dict(count=int(num[j]),rootCentroid=r[ids2].mean(0).tolist(),rootMin=r[ids2].min(0).tolist(),rootMax=r[ids2].max(0).tolist(),lengthMax=float(length[ids2].max()),penetrationMax=float(c['penetration'][ids2].max()),tailWeightMedian=float(np.median(d['attr_ptail'][ni[ids2]]))))
  metrics['regions'][name]=dict(strands=int(m.sum()),activeStrands=int((m&active).sum()),culled=int((m&~active).sum()),skinCollision=int((skin_collision&m&active).sum()),solidObjectCollision=int((obstacle_collision&m&active).sum()),**{key:int((v&m).sum()) for key,v in flags.items()},flagged=int(f.sum()),repairCandidates=int((repair&m).sum()),rayCrossingStrands=int(((c['intersections']>0)&m).sum()),penetrationOver0006=int(((c['penetration']>.0006)&m).sum()),penetrationOver002=int(((c['penetration']>.002)&m).sum()),rayOnlyOrShallow=int(((c['intersections']>0)&(c['penetration']<=.0006)&m).sum()),worstClusters=clusters)
 np.savez_compressed(folder/'sweep-flags.npz',actualTailSkin=tube,actualTail=tube[ni],region=reg,length=length,neighborMedian=med,**flags,flagged=anyflag,repair=repair,body=body)
 (folder/'sweep-metrics.json').write_text(json.dumps(metrics,indent=2))
 print(json.dumps({k:{a:v[a] for a in ['strands','collision','neighborLength','regionalLength','partTransfer','lift','repairCandidates']} for k,v in metrics['regions'].items()},indent=2))
if __name__=='__main__':analyze(Path(sys.argv[1]))

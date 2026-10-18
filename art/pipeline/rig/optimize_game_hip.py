"""Fit existing four-weight supports with spatially smooth surface error."""
from pathlib import Path
import numpy as np
from scipy import sparse
from scipy.optimize import lsq_linear
import json
OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass2')

def smooth(x):
 x=np.clip(x,0,1);return x*x*(3-2*x)

def main():
 z=np.load(OUT/'game_optimization_source.npz');a=z['weights'];xyz=z['xyz'];edges=z['edges'];mats=z['matrices'];centers=z['hip_centers'];n=len(xyz)
 mask=np.maximum.reduce([smooth((.19-np.linalg.norm(xyz-c,axis=1))/.09) for c in centers])
 mask*=smooth((xyz[:,2]-.30)/.065)*smooth((.365-xyz[:,1])/.065)
 active=np.flatnonzero(mask>.001);rows,cols=np.nonzero(a[active]>0);vids=active[rows];bones=cols;old=a[vids,bones];nv=len(old)
 ph=np.column_stack([xyz,np.ones(n)])
 points=np.einsum('pbij,nj->npbi',mats,ph)[:,:,:,:3]
 current=np.einsum('nb,npbc->npc',a,points)
 target=z['targets'].transpose(1,0,2);desired=current+(target-current)*mask[:,None,None]
 # The residual should vary smoothly across neighboring surface vertices.
 # This penalizes a focal pucker while keeping the source muscle grooves.
 rr=(vids[:,None]*24+np.arange(24)[None,:]).ravel();cc=np.repeat(np.arange(nv),24)
 values=(points[vids,:,bones,:]-xyz[vids,None,:]).reshape(nv,24).ravel()
 D=sparse.coo_matrix((values,(rr,cc)),shape=(n*24,nv)).tocsr()
 ii=np.r_[edges[:,0],edges[:,1]];jj=np.r_[edges[:,1],edges[:,0]];degree=np.bincount(ii,minlength=n).clip(1)
 L=sparse.eye(n)-sparse.coo_matrix((1/degree[ii],(ii,jj)),shape=(n,n)).tocsr()
 K=sparse.kron(L,sparse.eye(24),format='csr')
 R=(desired-current).reshape(-1)
 S=sparse.coo_matrix((np.ones(nv),(rows,np.arange(nv))),shape=(len(active),nv)).tocsr()
 A=sparse.vstack([D,3*(K@D),100*S,.002*sparse.eye(nv)],format='csr')
 b=np.r_[R,3*(K@R),np.zeros(len(active)+nv)]
 result=lsq_linear(A,b,bounds=(-old,1-old),tol=1e-9,lsmr_tol=1e-10,max_iter=80,verbose=1)
 out=a.copy();out[vids,bones]+=result.x;out[out<.00011]=0;out/=out.sum(axis=1)[:,None]
 np.save(OUT/'optimized13_weights.npy',out)
 q=np.einsum('nb,npbc->npc',out,points)
 report={'method':__doc__,'active_vertices':len(active),'variables':nv,'success':bool(result.success),'status':result.message,'max_influences':int((out>0).sum(axis=1).max()),'max_weight_change':float(abs(out-a).max()),'max_position_change_m':float(np.linalg.norm(q-current,axis=2).max()),'sum_constraint_error_before_normalizing':float(abs(S@result.x).max())}
 (OUT/'hip_optimization13.json').write_text(json.dumps(report,indent=2));print(report)

if __name__=='__main__':main()

"""Four-influence convex surface fit with common bilateral supports and smooth error."""
from pathlib import Path
import numpy as np,json,time
from scipy import sparse
from scipy.spatial import cKDTree
OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass3')
z=np.load(OUT/'game_optimization_source.npz');a=z['weights'];xyz=z['xyz'];edges=z['edges'];mats=z['matrices'];names=z['names'].tolist();n=len(a)
def smooth(x):
 x=np.clip(x,0,1);return x*x*(3-2*x)
swap=[]
for b in names:
 q=b.replace('_fl_','_fr_').replace('_hl_','_hr_') if ('_fl_' in b or '_hl_' in b) else b.replace('_fr_','_fl_').replace('_hr_','_hl_') if ('_fr_' in b or '_hr_' in b) else b.replace('_l','_r') if '_l' in b else b.replace('_r','_l') if '_r' in b else b
 swap.append(names.index(q) if q in names else names.index(b))
flip=xyz.copy();flip[:,0]*=-1;dist,mirror=cKDTree(xyz).query(flip)
mask=np.maximum.reduce([smooth((.24-np.linalg.norm(xyz-c,axis=1))/.09) for c in z['hip_centers']]);mask*=smooth((xyz[:,2]-.26)/.07)*smooth((.39-xyz[:,1])/.045)
from scipy.sparse.csgraph import connected_components
_,labels=connected_components(sparse.coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(n,n)),directed=False)
body=labels==np.argmax(np.bincount(labels))
active=np.flatnonzero(body & ((a>0).sum(axis=1)>1));lookup=np.full(n,-1);lookup[active]=np.arange(len(active));na=len(active)
prior=a.copy();mean=(a+a[mirror][:,swap])*.5
# Common supports remove arbitrary changes between nearly equivalent influences.
rank=mean.copy()
rear=(xyz[:,1]>.09)&(xyz[:,2]>.26)&(xyz[:,1]<.35)
for b in ['neck_01','neck_02','head_01','leg_fl_01','leg_fr_01','spine_03','spine_04','spine_05']:
 j=names.index(b);rank[rear,names.index('spine_02')]+=rank[rear,j];rank[rear,j]=0
supports=np.argsort(-rank[active],axis=1)[:,:4]
pairs=[]
for k,i in enumerate(active):
 j=mirror[i];l=lookup[j]
 if xyz[i,0]>0 and dist[i]<.001 and mirror[j]==i and l>=0:
  supports[l]=np.array(swap)[supports[k]];pairs.append((k,l))
ph=np.c_[xyz,np.ones(n)];points=np.einsum('pbij,nj->npbi',mats,ph)[:,:,:,:3];current=np.einsum('nb,npbc->npc',a,points)
target=z['targets'].transpose(1,0,2);desired=current+(target-current)*mask[:,None,None]

# Smooth the posed hip crease itself, without touching the frozen rest mesh.
focus=np.maximum.reduce([smooth((.155-np.linalg.norm(xyz-c,axis=1))/.075) for c in z['hip_centers']])
focus*=smooth((xyz[:,2]-.30)/.05)*smooth((.30-xyz[:,1])/.06)*smooth((abs(xyz[:,0])-.022)/.035)
ei=np.r_[edges[:,0],edges[:,1]];ej=np.r_[edges[:,1],edges[:,0]];deg=np.bincount(ei,minlength=n).clip(1)
for pi in (1,2,3):
 q=desired[:,pi,:].copy()
 for iteration in range(12):
  avg=np.column_stack([np.bincount(ei,weights=q[ej,c],minlength=n)/deg for c in range(3)])
  q+=(avg-q)*focus[:,None]*(.50 if iteration%2==0 else -.32)
 desired[:,pi,:]=q

rr=np.repeat(active*24,4)[:,None]+np.arange(24)[None,:];cc=np.repeat(np.arange(na*4),24)
values=(points[active[:,None],:,supports,:]-xyz[active,None,None,:]).reshape(na*4,24).ravel()
D=sparse.coo_matrix((values,(rr.ravel(),cc)),shape=(n*24,na*4)).tocsr()
ii=np.r_[edges[:,0],edges[:,1]];jj=np.r_[edges[:,1],edges[:,0]];degree=np.bincount(ii,minlength=n).clip(1)
L=sparse.eye(n)-sparse.coo_matrix((1/degree[ii],(ii,jj)),shape=(n,n)).tocsr();K=sparse.kron(L,sparse.eye(24),format='csr')
base=current.copy();base[active]=xyz[active,None,:];targetdelta=(desired-base).reshape(-1)
A=sparse.vstack([D,3*K@D,.003*sparse.eye(na*4)],format='csr');priorw=rank[active[:,None],supports];priorw/=priorw.sum(axis=1)[:,None]
b=np.r_[targetdelta,3*K@targetdelta,.003*priorw.ravel()];At=A.T.tocsr();H=At@A;rhs=At@b
v=np.ones(na*4);v/=np.linalg.norm(v)
for _ in range(70):v=H@v;v/=np.linalg.norm(v)
rate=1/(float(v@(H@v))*1.02)
pairs=np.array(pairs,dtype=int)
def project(w):
 w=w.reshape(-1,4).copy();w[priorw<1e-12]=-1000
 if len(pairs):
  av=(w[pairs[:,0]]+w[pairs[:,1]])*.5;w[pairs[:,0]]=av;w[pairs[:,1]]=av
 u=np.sort(w,axis=1)[:,::-1];css=np.cumsum(u,axis=1)-1;ind=np.arange(1,5);rho=((u-css/ind)>0).sum(axis=1)-1;theta=css[np.arange(na),rho]/(rho+1)
 return np.maximum(w-theta[:,None],0).ravel()
w=project(priorw.ravel());y=w.copy();t=1
for step in range(4000):
 new=project(y-rate*(H@y-rhs));tn=(1+np.sqrt(1+4*t*t))/2;y=new+(t-1)/tn*(new-w);w=new;t=tn
 if step%1000==0:print(step,float(np.linalg.norm(A@w-b)),flush=True)
out=a.copy();out[active]=0;out[active[:,None],supports]=w.reshape(-1,4);out[out<.00011]=0;out/=out.sum(axis=1)[:,None]
np.save(OUT/'fit5_weights.npy',out)
(OUT/'fit5.json').write_text(json.dumps({'active_vertices':na,'symmetric_pairs':len(pairs),'max_weight_change':float(abs(out-a).max()),'residual':float(np.linalg.norm(A@w-b)),'method':__doc__},indent=2));print('DONE',flush=True)

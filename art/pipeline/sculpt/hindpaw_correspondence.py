import numpy as np
from scipy.spatial import cKDTree
from pathlib import Path
p=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-hindpaw\pass1')
a=np.load(p/'approved_mesh.npz')['co'];g=np.load(p/'generated_mesh.npz')['co']
mask=lambda q:(abs(q[:,0])>.07)&(q[:,1]>.025)&(q[:,1]<.30)&(q[:,2]<.14)
ai=np.where(mask(a))[0];gi=np.where(mask(g))[0]
t=cKDTree(g[gi]);d,j=t.query(a[ai]);print('counts',len(ai),len(gi),'nearest',np.quantile(d,[0,.25,.5,.75,.9,1]))
for dims in [[0,1],[0,2],[1,2]]:
 d,j=cKDTree(g[gi][:,dims]).query(a[ai][:,dims]);print(dims,np.quantile(d,[0,.25,.5,.75,.9,1]),'unique',len(set(j)))
print('index equality fraction',len(a),len(g))
# Ordered regional sets may retain original relative order.
if len(ai)==len(gi):
 d=np.linalg.norm(a[ai]-g[gi],axis=1);print('ordered',np.quantile(d,[0,.25,.5,.75,.9,1]));print('same indices',np.mean(ai==gi));print('range indices',ai[:20],gi[:20]);print('ordered xy',np.quantile(np.linalg.norm((a[ai]-g[gi])[:,:2],axis=1),[0,.5,.9,1]))

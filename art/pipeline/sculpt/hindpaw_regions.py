import numpy as np
from pathlib import Path
p=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-hindpaw\pass1');a=np.load(p/'approved_mesh.npz');g=np.load(p/'generated_mesh.npz');A=a['co'];G=g['co']
for side in [1,-1]:
 for x in [.04,.05,.07]:
  for z in [.10,.13,.15,.18]:
   f=lambda q:(q[:,0]*side>x)&(q[:,1]>.025)&(q[:,1]<.34)&(q[:,2]<z)
   ai=np.where(f(A))[0];gi=np.where(f(G))[0]
   if len(ai)!=len(gi):print(side,x,z,len(ai),len(gi));continue
   am=np.full(len(A),-1);gm=np.full(len(G),-1);am[ai]=np.arange(len(ai));gm[gi]=np.arange(len(gi));ea=am[a['edges']];eg=gm[g['edges']];sa=set(map(tuple,np.sort(ea[(ea>=0).all(1)],axis=1)));sg=set(map(tuple,np.sort(eg[(eg>=0).all(1)],axis=1)))
   print(side,x,z,len(ai),'edge mismatch',len(sa^sg),'maxd',np.linalg.norm(A[ai]-G[gi],axis=1).max())

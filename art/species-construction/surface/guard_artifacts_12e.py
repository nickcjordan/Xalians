"""Apply unchanged 12d flag rules to the in-memory final patch before its save."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from analyze_sweep_12d import analyze

folder,before=map(Path,sys.argv[1:])
analyze(folder)
f=np.load(before/'r/sweep-flags.npz');g=np.load(folder/'sweep-flags.npz');d=np.load(folder/'evidence.npz')
selected=np.load(folder/'selected.npy');new=np.zeros(len(selected),bool);per_flag={}
for key in ['collision','neighborLength','regionalLength','partTransfer','lift']:
    m=g[key]&~f[key];new|=m;per_flag[key]=np.where(m)[0].tolist()
restore=new&selected
if (new&~selected).any():
    roots=d['roots'];tree=cKDTree(roots)
    for i in np.where(new&~selected)[0]:
        _,idx=tree.query(roots[i],k=25)
        restore[idx[selected[idx]]]=True
result=dict(newFlags=per_flag,restore=np.where(restore)[0].tolist(),remaining=int(new.sum()))
(folder/'guard-result.json').write_text(json.dumps(result,indent=2))
print('PRE_SAVE_GUARD',result['remaining'],'new flags',len(result['restore']),'selected paths to restore')

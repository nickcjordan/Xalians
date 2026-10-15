"""Apply the unchanged all-body rules before saving a local furnishing patch."""
import json,subprocess
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

def guard(before,out,points,original,starts,counts,selected,bvh):
    base=dict(np.load(before/'r/evidence.npz'));bc=dict(np.load(before/'r/collision-evidence.npz'));col={k:v.copy() for k,v in bc.items()}
    flags=np.load(before/'r/sweep-flags.npz');obs=dict(np.load(before/'r/obstacle-evidence.npz'))
    tree=KDTree(len(base['co']))
    for i,p in enumerate(base['co']):tree.insert(Vector(p),i)
    tree.balance()
    for i in np.where(selected)[0]:
        path=points[starts[i]:starts[i]+counts[i]]
        col['penetration'][i]=0;col['intersections'][i]=0;col['max_clearance'][i]=0
        col['tip_nearest'][i]=tree.find(Vector(path[-1]))[1]
        for a,b in zip(path[:-1],path[1:]):
            v=b-a;length=np.linalg.norm(v);eps=min(.0002,length*.15)
            if length>1e-7 and bvh.ray_cast(Vector(a+v/length*eps),Vector(v/length),max(length-2*eps,0))[0] is not None:col['intersections'][i]+=1
            for q in (b,(a+b)*.5):
                hit=bvh.find_nearest(Vector(q))
                key='penetration' if np.dot(q-np.array(hit[0]),np.array(hit[1]))<0 else 'max_clearance'
                col[key][i]=max(col[key][i],hit[3])
    pre=out/'pre-save';pre.mkdir(parents=True,exist_ok=True);history=[]
    def win(p):
        s=str(p.resolve());assert s.startswith('/mnt/');return s[5].upper()+':'+s[6:]
    for it in range(30):
        data=dict(base);data.update(points=points,first=points[starts+1]-points[starts])
        np.savez_compressed(pre/'evidence.npz',**data);np.savez_compressed(pre/'collision-evidence.npz',**col);np.savez_compressed(pre/'obstacle-evidence.npz',**obs)
        with (pre/f'guard-{it}.log').open('w') as log:
            subprocess.run(['/mnt/c/Python314/python.exe',win(Path(__file__).with_name('analyze_sweep_12d.py')),win(pre)],stdout=log,stderr=subprocess.STDOUT,check=True)
        now=np.load(pre/'sweep-flags.npz');new=np.zeros(len(selected),bool);report={}
        for k in ['collision','neighborLength','regionalLength','partTransfer','lift']:
            m=now[k]&~flags[k];new|=m;report[k]=int(m.sum())
        history.append(report)
        if not new.any():break
        restore=new&selected
        # A neighbor flag on an unchanged hair can be caused by local alterations.
        roots=base['roots']
        for i in np.where(new&~selected)[0]:
            near=np.where(selected&(np.linalg.norm(roots-roots[i],axis=1)<.014))[0];restore[near]=True
        assert restore.any(),'No local selected cause for artifact'
        for i in np.where(restore)[0]:points[starts[i]:starts[i]+counts[i]]=original[starts[i]:starts[i]+counts[i]]
        for k in col:
            if col[k].shape==selected.shape:col[k][restore]=bc[k][restore]
        selected[restore]=False
    else:raise AssertionError('Tuft artifact guard did not converge')
    (out/'artifact-guard-history.json').write_text(json.dumps(history,indent=2))
    return selected

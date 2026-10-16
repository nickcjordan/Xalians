"""Independently bound saved edit support, attachment and blue root coverage."""
import sys,json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from concha_fix14_paths import baseline
HERE=Path(__file__).resolve().parent
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
after=work/sys.argv[1];source=baseline(work)
d=np.load(after/'r/evidence.npz');old=np.load(source/'r/evidence.npz')
c=np.load(after/'r/collision-evidence.npz');patch=np.load(after/'patch-evidence.npz')
probe=np.load(work/'14-fix-probe.npz');prior=np.load(source/'patch-evidence.npz')
count=len(probe['starts']);changed=patch['changed'];color=patch['color'];restored=patch['restored']
co=d['co'];normal=d['normal'];roots=d['roots'][:count];oldroots=old['roots'][:count]
def uv(q):
 x=abs(q[:,0])-.17;z=q[:,2]-.64
 return np.column_stack([.8*x+.6*z,-.6*x+.8*z])
r=uv(oldroots);ni=np.load(source/'r/collision-evidence.npz')['nearest'][:count]
independent=(old['attr_earw'][ni]>.95)&(old['curve_nrm'][:count,1]<-.15)&(abs(oldroots[:,0])>.15)&(r[:,0]>0)&(r[:,0]<.17)&(abs(r[:,1]-.019)<.075)
allowed=independent|prior['changed']
if 'transition' in patch:
 transition=patch['transition']
 side_crease=(oldroots[:,1]<-.015)&(abs(oldroots[:,0])<.19)
 # earw also masks temple stripes. The bounded head-side crease can have a
 # lower value; its prefix-only repair is checked separately from blue color.
 bounds=(abs(oldroots[:,0])>.15)&(abs(oldroots[:,0])<.36)&(oldroots[:,2]>.60)&(oldroots[:,2]<.82)&((old['curve_nrm'][:count,1]<0)|side_crease)&((old['attr_earw'][ni]>.95)|side_crease)
 assert not (transition&~bounds).any(),'Transition repair reached face or ear back'
 assert not (color&~(restored|(old['attr_cupm'][ni]>.5))).any(),'Blue color escaped the thickness-qualified ear cup'
 allowed|=transition
from concha_14_paths import baseline as baseline13i
protected=np.load(baseline13i(work)/'patch-evidence.npz');protected=protected['restore']|protected['trim']|protected['changed']
assert not (changed&protected).any() and not (color&protected).any(),'Approved 13i ear-back data changed'
side_exceptions=[]
for i in np.flatnonzero(patch['transition']&(old['attr_earw'][ni]<=.95)):
 assert side_crease[i] and not color[i] and not protected[i]
 assert np.array_equal(oldroots[i],roots[i]),'Side-crease prefix moved its root'
 a=int(old['starts'][i]);b=int(d['starts'][i]);n=int(old['starts'][i+1]-a)
 original=old['points'][a:a+n];actual=d['points'][b:b+n]
 arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(original,axis=0),axis=1))]
 length=float(np.linalg.norm(np.diff(actual,axis=0),axis=1).sum())
 expected=np.column_stack([np.interp(np.linspace(0,length,n),arc,original[:,k]) for k in range(3)])
 error=float(np.linalg.norm(actual-expected,axis=1).max())
 assert error<.00001,'Side-crease edit departed from original prefix'
 side_exceptions.append(dict(curve=int(i),rootExact=True,colorExact=True,protected13i=False,oldLength=float(arc[-1]),newLength=length,maxPrefixError=error))
gate=json.loads((source/'artifact-gate.json').read_text())
for key in ('collision','neighborLength','rogue'):
 ids=np.array(gate[key]['newIds']);allowed[ids[ids<count]]=True
assert not (changed&~allowed).any() and not (color&~independent).any()
assert np.array_equal(old['co'],co),'Approved geometry changed'
assert np.array_equal(oldroots[~changed],roots[~changed]),'Held native roots changed'
dist,closest=cKDTree(co).query(roots[changed])
agreement=np.sum(normal[closest]*old['curve_nrm'][:count][changed],axis=1)
attachment=json.loads((after/'r/root-attachment.json').read_text())
assert attachment['maxSurfaceDistance']<.0012 and attachment['minOriginalNormalAgreement']>0,'Native root switched sheet or lost attachment'
shift=np.linalg.norm(roots-oldroots,axis=1)
assert shift[changed&~restored].max()<.004 and shift[restored].max()<.0087
w=d['attr_concha_velvet14'];suv=uv(co);rr=np.linalg.norm((suv-[.057,.019])/[.024,.019],axis=1)
support=w>0
assert np.all(rr[support]<1.00001) and np.all(normal[support,1]<-.05) and np.all(d['attr_earw'][support]>.95)
assert w.max()<=.250001 and np.array_equal(w,patch['skinWeight'])
# Root spacing measures whether the old suppressed patch now has real active
# coat fibers. It supplements native image review, not a claim of opaque fill.
target=independent&restored
assert c['active'][:count][target].all()
blue=color&c['active'][:count]
skin_target=(d['attr_cupm']>.5)&(normal[:,1]<-.15)&(suv[:,0]>.025)&(suv[:,0]<.14)&(abs(suv[:,1]-.019)<.07)&(d['attr_earw']>.95)
spacing=cKDTree(roots[blue]).query(co[skin_target])[0]
report=dict(geometryExact=True,heldRootsExact=True,outsideAuthorizedEditCount=int((changed&~allowed).sum()),nativeAttachmentMax=attachment['maxSurfaceDistance'],normalAgreementMin=attachment['minOriginalNormalAgreement'],maxRootShift=float(shift.max()),restoredActiveBlue=int(target.sum()),velvetSupportVertices=int(support.sum()),velvetMax=float(w.max()),velvetOutsideCup=0,blueRootSpacingQuantiles=np.quantile(spacing,[.5,.9,.99,1]).tolist(),coverageCaveat='Root spacing is supporting evidence; actual native images decide visible coverage.')
report['sideCreaseExceptions']=side_exceptions
(after/'scope-coverage.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

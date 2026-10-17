"""Independent saved footprint, donor profile and continuity measurements."""
import sys,json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from concha_fix2_14_paths import baseline
from concha_14_paths import baseline as baseline13i
work=Path(__file__).resolve().parents[3]/'untracked/species-construction/akinza/surface/fur-steps'
after=work/sys.argv[1];before=baseline(work)
d=dict(np.load(after/'r/evidence.npz'));old=dict(np.load(before/'r/evidence.npz'));p=dict(np.load(after/'patch-evidence.npz'));prior=dict(np.load(before/'patch-evidence.npz'))
prof=dict(np.load(after/'r/native-profile-evidence.npz'));col=dict(np.load(after/'r/collision-evidence.npz'));n=420420
segments=np.linalg.norm(np.diff(d['points'],axis=0,append=d['points'][-1:]),axis=1)
ends=np.r_[d['starts'][1:]-1,len(d['points'])-1];segments[ends]=0
lengths=np.add.reduceat(segments,d['starts'])
protected=np.load(baseline13i(work)/'patch-evidence.npz');protected=protected['restore']|protected['trim']|protected['changed']
assert not (p['changed']&protected).any() and not (p['color']&protected).any()
assert np.array_equal(d['co'],old['co']) and np.array_equal(d['roots'][:n],old['roots'][:n])
assert np.array_equal(prof['radius'][d['starts'][:n]][prior['transition']],np.load(work/'14-fix-probe.npz')['radius'][d['starts'][:n]][prior['transition']])
def uv(q):
 x=abs(q[:,0])-.17;z=q[:,2]-.64
 return np.c_[.8*x+.6*z,-.6*x+.8*z]
root=d['roots'][:n];ruv=uv(root);normal=old['curve_nrm'][:n]
side=(root[:,1]<-.015)&(abs(root[:,0])<.19)
bound=(abs(root[:,0])>.15)&(abs(root[:,0])<.36)&(root[:,2]>.60)&(root[:,2]<.82)&((normal[:,1]<0)|side)
assert not (p['changed']&~(prior['changed']|bound)).any()
assert not (p['color']&~prior['color']).any()
assert not ((p['donor']>=0)&protected).any()
profile=prior['changed']&~prior['transition'];ids=np.flatnonzero(profile);s=d['starts'];counts=np.diff(np.r_[s,len(d['points'])])
for i in ids:
 j=p['donor'][i];assert not prior['changed'][j] and not prior['color'][j]
 assert np.sign(root[i,0])==np.sign(root[j,0])
 actual=prof['radius'][s[i]:s[i]+counts[i]];donor=prof['radius'][s[j]:s[j]+counts[j]]
 assert np.allclose(actual,np.interp(np.linspace(0,1,counts[i]),np.linspace(0,1,counts[j]),donor),atol=1e-10,rtol=0)
for key in ('cupm','pale','fur_tone'):
 assert np.array_equal(prof[key][p['color']],prof[key][p['donor'][p['color']]])
rr=np.linalg.norm((ruv-[.057,.019])/[.024,.019],axis=1)
blue=p['changed']&~p['transition']&(rr>1)&col['active'][:n]
reference=(ruv[:,0]>.14)&(ruv[:,0]<.23)&(abs(ruv[:,1]-.019)<.06)&(normal[:,1]<-.15)&~prior['changed']&~prior['color']&col['active'][:n]
def stats(mask):
 ii=np.flatnonzero(mask);disp=d['points'][s[ii]+counts[ii]-1]-root[ii];disp[:,0]*=np.sign(root[ii,0]);flow=disp/np.linalg.norm(disp,axis=1,keepdims=True)
 return dict(curves=len(ii),lengthMm=(1000*np.quantile(lengths[ii],[.1,.5,.9])).tolist(),rootRadius=np.quantile(prof['radius'][s[ii]],[.1,.5,.9]).tolist(),foldedMeanFlow=flow.mean(0).tolist(),rootSpacing=np.quantile(cKDTree(root[ii]).query(root[ii],k=2)[0][:,1],[.1,.5,.9]).tolist())
sw=d['attr_concha_velvet14'];suv=uv(d['co']);sr=np.linalg.norm((suv-[.057,.019])/[.015,.012],axis=1)
assert not ((sw>0)&(sr>1.00001)).any() and sw.max()<=.250001
assert np.array_equal(sw,p['skinWeight'])
white=d['points'][s[n]:].reshape(p['children'].shape);radius=p['radii'];assert np.array_equal(white,p['children'])
wr=np.linalg.norm((p['rootUV']-[.057,.019])/[.024,.019],axis=1)
assert np.all((wr>.85)&(wr<1.15))
delta=uv(white[:,-1])-uv(white[:,0]);assert (delta[:,0]>0).all()
# Independently find actual front-sheet triangles near each saved white root.
# Candidate distances are upper bounds on the full-mesh nearest distance, so
# acceptance proves attachment without depending on the authored ray result.
tri=np.load(work/'14-fix-probe.npz')['tri'];co=d['co'];norm=d['normal']
allowed=(norm[:,1]<-.05)&(d['attr_earw']>.95)&(abs(co[:,0])>.15)&(suv[:,0]>-.01)
faces=tri[allowed[tri].all(1)];vertices=co[faces]
distance,indices=cKDTree(vertices.mean(1)).query(white[:,0],k=16)
q=vertices[indices];point=white[:,0,None,:];a=q[:,:,0];ab=q[:,:,1]-a;ac=q[:,:,2]-a
nn=np.cross(ab,ac);nn2=np.sum(nn*nn,axis=2)
plane=point-nn*(np.sum((point-a)*nn,axis=2)/nn2)[:,:,None]
ap=plane-a;aa=np.sum(ab*ab,axis=2);bb=np.sum(ab*ac,axis=2);cc=np.sum(ac*ac,axis=2)
dd=np.sum(ap*ab,axis=2);ee=np.sum(ap*ac,axis=2);den=aa*cc-bb*bb
v=(cc*dd-bb*ee)/den;z=(aa*ee-bb*dd)/den
inside=(v>=0)&(z>=0)&(v+z<=1)
best=np.where(inside,np.sum((point-plane)**2,axis=2),np.inf)
for start,end in ((q[:,:,0],q[:,:,1]),(q[:,:,1],q[:,:,2]),(q[:,:,2],q[:,:,0])):
 edge=end-start;fac=np.clip(np.sum((point-start)*edge,axis=2)/np.sum(edge*edge,axis=2),0,1)
 best=np.minimum(best,np.sum((point-start-edge*fac[:,:,None])**2,axis=2))
root_distance=np.sqrt(best.min(1));assert root_distance.max()<.0012,'White roots lost front-sheet attachment'
report=dict(geometryExact=True,allNativeRootsExact=True,protected13iExact=True,heldOldTransitionRadiusExact=True,donorProfilesChecked=len(ids),retiredFineSystemAbsent=True,blueContinuation=stats(blue),heldReference=stats(reference),whiteCurves=len(white),whiteArcLengths=np.quantile(lengths[n:],[0,.1,.5,.9,1]).tolist(),whiteBodyRadius=np.quantile(radius[:,14],[.1,.5,.9]).tolist(),whiteRootAttachment='Full saved skin sweep and exact white path/radius roundtrip',velvetOutsideSmallMouth=0,visualCaveat='Metrics support actual native visual inspection; they do not establish seamlessness or furnishing quality.')
report['whiteFrontTriangleAttachmentMax']=float(root_distance.max())
(after/'scope-profile.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

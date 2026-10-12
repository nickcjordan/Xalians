"""fit_muzzle_form.py <debug npz from nose_mouth_v1_field.py --debug> <out json> [K pairs] [M midline]: thin-plate base under the muzzle region and a fit of the
muzzle form (h0 - base) as mirrored anisotropic Gaussians on the (theta, phi) grid of nose_mouth_v1_field.py."""
import numpy as np, json, sys
from scipy.optimize import least_squares
d=np.load(sys.argv[1]); R0=d['R0']; free=d['free']; Wd=d['Wd']; E=d['E']
step=.3; th=np.radians(np.arange(-48,48+1e-9,step)); ph=np.radians(np.arange(-72,20+1e-9,step))
TH,PH=np.meshgrid(th,ph,indexing='ij')
h0=np.where(np.isfinite(R0),R0,np.nanmean(R0))
def lap(z):
    zp=np.pad(z,1,mode='edge'); return zp[2:,1:-1]+zp[:-2,1:-1]+zp[1:-1,2:]+zp[1:-1,:-2]-4*z
def cg(A,b,x,it=20000,tol=1e-16):
    r=b-A(x);p=r.copy();rz=(r*r).sum();b2=(b*b).sum()
    for i in range(it):
        Ap=A(p);a=rz/(p*Ap).sum();x+=a*p;r-=a*Ap;rz2=(r*r).sum()
        if rz2<tol*b2: break
        p=r+rz2/rz*p;rz=rz2
    return x,i
base=np.where(free,0.,h0); b=-lap(lap(base))[free]
def A(x):
    z=np.zeros_like(h0); z[free]=x; return lap(lap(z))[free]
sol,it=cg(A,b,h0[free].copy()); Rb=h0.copy(); Rb[free]=sol
res=h0-Rb
use=free&(Wd>0)&(E<.95)
print('base iters',it,'residual max',res[use].max(),'min',res[use].min())
K=int(sys.argv[3]) if len(sys.argv)>3 else 3; M=int(sys.argv[4]) if len(sys.argv)>4 else 2
def form(p,TH,PH):
    out=np.zeros_like(TH); q=p.reshape(-1,6)
    for k,(a,t0,p0,st,sp,rot) in enumerate(q):
        mids = k>=K
        for sg in ([1] if mids else [1,-1]):
            t0_=0. if mids else t0*sg; rot_=0. if mids else rot*sg
            dt=TH-t0_; dp=PH-p0; c,s=np.cos(rot_),np.sin(rot_)
            u=c*dt+s*dp; v=-s*dt+c*dp
            out+=a*np.exp(-.5*((u/st)**2+(v/sp)**2))
    return out
x=TH[use];y=PH[use];r=res[use]
p0=[]
for k in range(K): p0+= [.01, np.radians(10+8*k), np.radians(-30), np.radians(8), np.radians(8), 0.]
for m in range(M): p0+= [.01, 0., np.radians(-20-15*m), np.radians(10), np.radians(8), 0.]
p0=np.array(p0)
f=lambda p: form(p,x,y)-r
o=least_squares(f,p0,x_scale='jac',max_nfev=4000)
fit=form(o.x,TH,PH)
err=(res-fit)[use]
print('rms res',np.sqrt((r**2).mean()),'rms err',np.sqrt((err**2).mean()),'max err',np.abs(err).max())
q=o.x.reshape(-1,6)
g=[[round(float(a),5),round(float(np.degrees(t)),3),round(float(np.degrees(pp)),3),round(float(np.degrees(st)),3),round(float(np.degrees(sp)),3),round(float(np.degrees(rt)),3),'mid' if k>=K else 'pair'] for k,(a,t,pp,st,sp,rt) in enumerate(q)]
for row in g: print(row)
json.dump({'gaussians':g},open(sys.argv[2],'w'),indent=1)
np.savez_compressed(sys.argv[2].replace('.json','.npz'),Rb=Rb,res=res,fit=fit,use=use)

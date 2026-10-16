"""Dense short blue coat on the actual previously suppressed inner-ear sheet."""
import numpy as np
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

def build(co,normal,uv,earw,cupskin,tri,restored_roots,white_roots,bvh,collision,rng):
 r=np.linalg.norm((uv-[.057,.019])/[.026,.021],axis=1)
 rt=KDTree(len(restored_roots))
 for i,q in enumerate(restored_roots):rt.insert(Vector(q),i)
 rt.balance()
 dist=np.array([rt.find(Vector(q))[2] for q in co])
 mask=(normal[:,1]<-.15)&(earw>.95)&(abs(co[:,0])>.15)&(uv[:,0]>0)&(uv[:,0]<.15)&(abs(uv[:,1]-.019)<.075)&((cupskin>.5)|(r<1.1))&((dist<.0045)|(r<1.1))
 ids=np.where(mask[tri].all(axis=1))[0];faces=tri[ids]
 area=np.linalg.norm(np.cross(co[faces[:,1]]-co[faces[:,0]],co[faces[:,2]]-co[faces[:,0]]),axis=1)*.5
 center=uv[faces].mean(axis=1);rr=np.linalg.norm((center-[.057,.019])/[.026,.021],axis=1)
 blend=np.clip((rr-.5)/.75,0,1);blend=blend*blend*(3-2*blend)
 lengths=.002*(1-blend)+.008*blend
 density=area/lengths
 count=int(np.ceil(3.8/.00022*density.sum()))
 chosen=rng.choice(len(ids),size=count,p=density/density.sum())
 a=np.sqrt(rng.random(count));b=rng.random(count);bary=np.c_[1-a,a*(1-b),a*b]
 selected=faces[chosen];root=(co[selected]*bary[:,:,None]).sum(axis=1)
 norms=np.cross(co[selected[:,1]]-co[selected[:,0]],co[selected[:,2]]-co[selected[:,0]])
 norms/=np.linalg.norm(norms,axis=1,keepdims=True)
 root+=norms*.0007
 # The white furnishing has its own narrow rim root bed. Adjacent blue coat
 # grows through this part without placing blue roots in the white root row.
 wt=KDTree(len(white_roots))
 for i,q in enumerate(white_roots):wt.insert(Vector(q),i)
 wt.balance()
 keep=np.array([wt.find(Vector(q))[2]>.0013 for q in root])
 paths=[];radii=[];kept=[];t=np.linspace(0,1,16)
 for j in np.where(keep)[0]:
  q=root[j];n=norms[j];direction=np.array([np.sign(q[0])*.8,0,.6])
  tangent=direction-n*np.dot(direction,n);tangent/=max(np.linalg.norm(tangent),1e-9)
  length=lengths[chosen[j]]*rng.uniform(.8,1.2)
  for attempt in range(8):
   path=q+t[:,None]*tangent*length+n*((.0012+attempt*.0004)*np.sin(t*np.pi*.65))[:,None]
   if not collision(path):break
   length*=.82
  else:raise AssertionError('Undercoat path collides; no save')
  paths.append(path);rad=rng.uniform(.000085,.000135)
  radii.append(rad*(1-t)**1.35+.000001*t);kept.append(j)
 kept=np.array(kept,np.int32)
 paths=np.array(paths,np.float32);radii=np.array(radii,np.float32)
 hair=bpy.data.hair_curves.new('Inner ear undercoat fix14');hair.add_curves([16]*len(paths));hair.points.foreach_set('position',paths.ravel())
 def attr(name,v,domain='POINT'):
  hair.attributes.new(name,'FLOAT',domain).data.foreach_set('value',np.asarray(v,np.float32))
 attr('radius',radii.ravel());attr('cupm',np.ones(len(paths)),'CURVE')
 attr('pale',np.full(len(paths),.53),'CURVE');attr('fur_tone',np.ones(len(paths)),'CURVE')
 attr('strlen',np.linalg.norm(np.diff(paths,axis=1),axis=2).sum(axis=1),'CURVE')
 surface=(co[selected[kept]]*bary[kept,:,None]).sum(axis=1)
 x=abs(surface[:,0])-.17;z=surface[:,2]-.64
 rootuv=np.c_[.8*x+.6*z,-.6*x+.8*z]
 vr=np.linalg.norm((rootuv-[.057,.019])/[.024,.019],axis=1);w=np.clip((1-vr)/.6,0,1);w=.25*w*w*(3-2*w)
 attr('concha_velvet14',np.repeat(w,16))
 ob=bpy.data.objects.new('Akinza inner ear undercoat 14 fix',hair);bpy.context.scene.collection.objects.link(ob);hair.materials.append(bpy.data.materials['Akinza hair'])
 evidence=dict(undercoatTriangles=ids[chosen[kept]],undercoatBarycentric=bary[kept],undercoatRoots=paths[:,0],undercoatMask=mask)
 print('FIX_UNDERCOAT',len(paths),'area',float(area.sum()),flush=True)
 return ob,paths,radii,evidence

"""B-jas4: profile-swept paws with a protected 65 mm boundary."""
import bpy,bmesh,numpy as np,sys,json,time,math
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent
sys.path[:0]=[str(HERE),str(HERE.parent/'roster')]
import sculptkit as sk, graft_recon as gr,lookdev,legcam,forecam
T0=time.time()
A=sys.argv[sys.argv.index('--')+1:]
def arg(n,d=None):return A[A.index(n)+1] if n in A else d
OUT=Path(arg('--out','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-paws/pass2'))
TAG=arg('--tag','iter1');OUT.mkdir(exist_ok=True);(OUT/'renders').mkdir(exist_ok=True)
CFG=json.loads((OUT/'placement.json').read_text())
LOG={};PROFILE_LOG={}
def log(s):print(f'[{time.time()-T0:.1f}] {s}',flush=True)
def region(P,k):return (P[:,0]>0)&((P[:,1]>.025) if k=='hind' else (P[:,1]<.025))&(P[:,2]<.065)
def applymod(o,m):
 with bpy.context.temp_override(object=o,active_object=o,selected_objects=[o]):bpy.ops.object.modifier_apply(modifier=m.name)
def clean(o):
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.delete(bm,geom=[e for e in bm.edges if not e.link_faces],context='EDGES')
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_edges],context='VERTS')
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
def world(o):
 p=sk.co(o);m=np.array(o.matrix_world);return p@m[:3,:3].T+m[:3,3]
def pawcams(P):
 cams={}
 for k in ['hind','fore']:
  q=P[region(P,k)];lo=q.min(0);hi=q.max(0);lo[1]-=.035 if k=='hind' else .018;hi[2]=.10 if k=='hind' else .085
  for n,a,e in [('side',82,6),('front_three_quarter',35,13),('front',0,8)]:
   cams[k+'_paw_'+n]=lookdev.place_camera('lookdev_cam_'+k+n,(Vector(lo),Vector(hi)),a,e,margin=.08)
 return cams

def stitch(bm,A,B):
 def order(vs):
  allowed=set(vs);adj={v:[e.other_vert(v) for e in v.link_edges if e.is_boundary and e.other_vert(v) in allowed] for v in vs}
  loops=[];seen=set()
  for start in vs:
   if start in seen:continue
   loop=[];prev=None;v=start
   while v not in seen:
    seen.add(v);loop.append(v);opts=[w for w in adj[v] if w!=prev]
    if not opts:break
    prev,v=v,opts[0]
   if len(loop)>2:loops.append(loop)
  loop=max(loops,key=len)
  area=sum(loop[i].co.x*loop[(i+1)%len(loop)].co.y-loop[(i+1)%len(loop)].co.x*loop[i].co.y for i in range(len(loop)))
  if area<0:loop.reverse()
  c=sum((v.co for v in loop),Vector())/len(loop)
  start=min(range(len(loop)),key=lambda i:math.atan2(loop[i].co.y-c.y,loop[i].co.x-c.x))
  return loop[start:]+loop[:start]
 A=order(A);B=order(B)
 def split_longest(loop):
  j=max(range(len(loop)),key=lambda i:(loop[(i+1)%len(loop)].co-loop[i].co).length)
  v=loop[j];w=loop[(j+1)%len(loop)];edge=next(e for e in v.link_edges if e.other_vert(v)==w)
  newedge,newvert=bmesh.utils.edge_split(edge,v,.5);loop.insert(j+1,newvert)
 while len(A)<len(B):split_longest(A)
 while len(B)<len(A):split_longest(B)
 n=len(A);ap=np.array([tuple(v.co) for v in A]);bp=np.array([tuple(v.co) for v in B]);ca=(ap.min(0)+ap.max(0))/2;cb=(bp.min(0)+bp.max(0))/2
 scale=np.ptp(bp,axis=0)[:2]/np.maximum(np.ptp(ap,axis=0)[:2],1e-6)
 shift=min(range(n),key=lambda j:sum((A[i].co-B[(i+j)%n].co).length_squared for i in range(n)))
 B=B[shift:]+B[:shift]
 for av,bv in zip(A,B):
  bv.co.x=cb[0]+(av.co.x-ca[0])*scale[0];bv.co.y=cb[1]+(av.co.y-ca[1])*scale[1]
 for i in range(n):bm.faces.new((A[i],A[(i+1)%n],B[(i+1)%n],B[i]))

def transfer(src,dst):
 names=[g.name for g in src.vertex_groups];P=sk.co(src);W=np.zeros((len(P),len(names)))
 for v in src.data.vertices:
  for g in v.groups:W[v.index,g.group]=g.weight
 src.data.calc_loop_triangles();tris=np.array([t.vertices[:] for t in src.data.loop_triangles]);tree=BVHTree.FromPolygons([Vector(p) for p in P],tris.tolist(),all_triangles=True)
 # Retain exact original rows for unchanged vertices, including all protected geometry.
 exact={tuple(p):i for i,p in enumerate(P)}
 dst.vertex_groups.clear();gs=[dst.vertex_groups.new(name=n) for n in names]
 for v in dst.data.vertices:
  old=exact.get(tuple(v.co))
  if old is not None:w=W[old].copy()
  else:
   q,normal,index,dist=tree.find_nearest(v.co);ids=tris[index];a,b,c=P[ids];u=b-a;vv=c-a;r=np.array(q)-a
   den=(u@u)*(vv@vv)-(u@vv)**2;beta=((vv@vv)*(r@u)-(u@vv)*(r@vv))/max(den,1e-20);gamma=((u@u)*(r@vv)-(u@vv)*(r@u))/max(den,1e-20)
   w=np.maximum(0,[1-beta-gamma,beta,gamma])@W[ids]
  idx=np.argsort(w)[-4:];s=w[idx].sum()
  for i in idx:
   if w[i]>1e-8:gs[i].add([v.index],float(w[i]/s),'REPLACE')

def interp(keys,vals,t):
 keys=np.asarray(keys);vals=np.asarray(vals);ds=np.diff(vals)/np.diff(keys);sl=np.zeros(len(keys));sl[0]=ds[0];sl[-1]=ds[-1]
 for i in range(1,len(keys)-1):
  if ds[i-1]*ds[i]>0:sl[i]=2/(1/ds[i-1]+1/ds[i])
 out=np.empty_like(t)
 for j,x in enumerate(t):
  i=min(len(keys)-2,max(0,np.searchsorted(keys,x)-1));h=keys[i+1]-keys[i];u=np.clip((x-keys[i])/h,0,1)
  out[j]=(2*u**3-3*u**2+1)*vals[i]+(u**3-2*u*u+u)*h*sl[i]+(-2*u**3+3*u*u)*vals[i+1]+(u**3-u*u)*h*sl[i+1]
 return out

def place_recon(kind,base,source):
 cfg=CFG[kind];q=base[region(base,kind)];lo=q.min(0);hi=q.max(0);L=hi[1]-lo[1];W=hi[0]-lo[0]
 ring=q[q[:,2]>.062];rc=(ring.min(0)+ring.max(0))/2;rr=np.ptp(ring,axis=0)/2
 pieces=[];keys=np.array(cfg['stations']);tt=np.linspace(0,1,85);PROFILE_LOG[kind]=[]
 # Four centerlines run from the shared pad to the rounded tips.
 centers=np.linspace(lo[0]+.115*W,hi[0]-.115*W,4);cfg['toeX']=centers.tolist()
 for j,x in enumerate(centers):
  shortening=cfg['shortening'][j];ys=lo[1]+L*(cfg.get('rootY',.56)*(1-tt)+shortening*tt)
  zs=L*interp(keys,np.array(cfg['centerZ']),tt)
  rx=L*interp(keys,np.array(cfg['radiusX']),tt);rz=L*interp(keys,np.array(cfg['radiusZ']),tt)
  xs=x+(rc[0]-x)*cfg.get('rootConvergence',.65)*(1-tt)**2
  pts=np.c_[xs,ys,zs]
  PROFILE_LOG[kind].append({'digit':j+1,'centerlineM':pts.tolist(),'radiusXM':rx.tolist(),'radiusZM':rz.tolist(),'distalSpreadDegrees':float(np.degrees(np.arctan2(pts[-1,0]-pts[52,0],pts[52,1]-pts[-1,1]))),'note':'Pre-remesh and pre-footprint-fit samples; final scaling in placement.json.'})
  o,_=sk.sweep(kind+'_digit_'+str(j+1),pts,lambda i,theta:1/np.sqrt((np.cos(theta)/max(rz[i],.0001))**2+(np.sin(theta)/max(rx[i],.0001))**2),segments=32)
  pieces.append(o)
 # Longitudinal oval sections retain a level underside without transport-frame folds.
 pp=cfg['padLoft'];yk=np.array(pp['y']);yt=np.linspace(yk[0],yk[-1],110)
 yy=lo[1]+L*yt;cx=interp(yk,rc[0]+((lo[0]+hi[0])/2-rc[0])*np.array(pp['centerX']),yt)
 rx=interp(yk,W*np.array(pp['rx']),yt);top=interp(yk,np.array(pp['top']),yt);bottom=interp(yk,np.array(pp['bottom']),yt)
 vs=[];fs=[];N=64
 for i,y in enumerate(yy):
  for th in np.linspace(0,2*np.pi,N,endpoint=False):vs.append((cx[i]+rx[i]*math.cos(th),y,(top[i]+bottom[i])/2+(top[i]-bottom[i])/2*math.sin(th)))
 for i in range(len(yy)-1):
  for j in range(N):aa=i*N+j;bb=i*N+(j+1)%N;fs.append((aa,aa+N,bb+N,bb))
 fs.extend([tuple(range(N)),tuple(range(len(vs)-1,len(vs)-N-1,-1))])
 pieces.append(sk.mesh_from(kind+'_pad',vs,fs))
 o=sk.join(pieces,kind+'_swept_paw')
 for piece in pieces:bpy.data.objects.remove(piece,do_unlink=True)
 sk.voxel_remesh(o,cfg.get('voxel',.0015));sk.keep_largest(o);sk.taubin(o,9,np.ones(len(o.data.vertices)))
 m=o.modifiers.new('local_paw_budget','DECIMATE');m.ratio=min(1,(22000 if kind=='hind' else 12000)/sk.tri_count(o));applymod(o,m)
 pp=sk.co(o);pp[:,2]=np.maximum(pp[:,2],.0002);sk.set_co(o,pp)
 sk.cut_keep(o,(0,0,.0615),(0,0,1),False,False);clean(o)
 return o

def graft(body,paw,kind,source):
 # Kept body starts at 63 mm. The original surface above 65 mm is never moved.
 test=lambda p:(p.y>.025 if kind=='hind' else p.y<.025)
 sk.cut_keep(body,(0,0,.0623),(0,0,1),True,False,region=test)
 bm=bmesh.new();bm.from_mesh(body.data)
 for sx in [1,-1]:
  AA=list({v for e in bm.edges if e.is_boundary and all(v.co.x*sx>0 and test(v.co) and abs(v.co.z-.0623)<1e-5 for v in e.verts) for v in e.verts})
  old=set(bm.verts);me=paw.data.copy()
  if sx<0:me.transform(Matrix.Diagonal((-1,1,1,1)))
  bm.from_mesh(me);bpy.data.meshes.remove(me);fresh=set(bm.verts)-old
  BB=list({v for e in bm.edges if e.is_boundary and all(v in fresh for v in e.verts) for v in e.verts})
  if not AA or not BB:raise RuntimeError(f'{kind} missing graft rings {len(AA)} {len(BB)}')
  # Ease the new upper ring toward the kept ring footprint, then bridge unequal loops.
  ra=np.array([tuple(v.co) for v in AA]);rb=np.array([tuple(v.co) for v in BB]);ca=(ra.min(0)+ra.max(0))/2;cb=(rb.min(0)+rb.max(0))/2
  def angular(poly,c):
   d=poly[:,:2]-c[:2];ang=np.arctan2(d[:,1],d[:,0]);order=np.argsort(ang);ang=ang[order];rad=np.linalg.norm(d,axis=1)[order];return np.r_[ang[-1]-2*np.pi,ang,ang[0]+2*np.pi],np.r_[rad[-1],rad,rad[0]]
  aa,ar=angular(ra,ca);bb,br=angular(rb,cb)
  sp=sk.co(source);source.data.calc_loop_triangles();tri=[t.vertices[:] for t in source.data.loop_triangles if all(sp[i,0]*sx>0 and (sp[i,1]>.025 if kind=='hind' else sp[i,1]<.025) and sp[i,2]<.10 for i in t.vertices)]
  local=BVHTree.FromPolygons([Vector(p) for p in sp],tri,all_triangles=True)
  for v in fresh:
   w=np.clip((v.co.z-.055)/.0065,0,1);w=w*w*(3-2*w);w*=max(np.clip((v.co.y-(ca[1]-(.065 if kind=='hind' else .040)))/.020,0,1),np.clip((v.co.z-.058)/.0035,0,1))
   d=np.array(v.co)[:2]-cb[:2];angle=math.atan2(d[1],d[0]);scale=np.interp(angle,aa,ar)/np.interp(angle,bb,br)
   target=ca[:2]+d*scale
   if w>0:
    direction=Vector((math.cos(angle),math.sin(angle),0));start=Vector((ca[0],ca[1],.0623))+direction*.15
    q0=local.ray_cast(start,-direction)[0];start.z=.0673;q1=local.ray_cast(start,-direction)[0]
    if q0 is not None and q1 is not None:target=np.array(q0)[:2]+(v.co.z-.0623)/.005*(np.array(q1)[:2]-np.array(q0)[:2])
   for ax in [0,1]:v.co[ax]+=(target[ax]-v.co[ax])*w
  stitch(bm,AA,BB)
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free()
 bpy.data.objects.remove(paw,do_unlink=True)
 p=sk.co(body);w=np.clip((.065-p[:,2])/.003,0,1)*np.clip((p[:,2]-.058)/.003,0,1)*((p[:,1]>.025) if kind=='hind' else (p[:,1]<.025))
 w*=np.maximum(np.clip((p[:,1]-(.155 if kind=='hind' else -.14))/.02,0,1),np.clip((p[:,2]-.058)/.0035,0,1))
 before_z=p[:,2].copy();sk.smooth(body,35,.45,w);pp=sk.co(body);pp[:,2]=before_z;sk.set_co(body,pp);clean(body)
 bm=bmesh.new();bm.from_mesh(body.data);boundary=[e for e in bm.edges if e.is_boundary and all(v.co.z<.065 for v in e.verts)]
 if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
 bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4 and any(v.co.z<.065 for v in f.verts)]);bm.to_mesh(body.data);bm.free()

def claws(body,rig):
 tree=sk.bvh(body);result=[];info={}
 for k in ['hind','fore']:
  p=sk.co(body);q=p[region(p,k)&(p[:,2]<.045)];lo=q.min(0);hi=q.max(0)
  xs=CFG[k].get('toeX',np.linspace(lo[0]+(hi[0]-lo[0])*.14,hi[0]-(hi[0]-lo[0])*.14,4).tolist())
  for j,x in enumerate(xs):
   # Locate skin on the toe front at the intended claw root height.
   z=CFG[k].get('clawZ',.022 if k=='hind' else .011)
   hit=tree.ray_cast(Vector((x,lo[1]-.06,z)),Vector((0,1,0)))[0]
   if hit is None:
    near=q[abs(q[:,0]-x)<.003];hit=Vector((x,float(near[:,1].min()),z))
   root=np.array(hit);root[1]+=.003
   for sx,s in [(1,'l'),(-1,'r')]:
    bone=f'leg_{"h" if k=="hind" else "f"}{s}_03';name=f'{k}_claw_{s}_{j+1}'
    if k=='hind':
     o=bpy.data.objects.get(name)
     if o is None:raise RuntimeError('Missing retained claw '+name)
     w=world(o);oldroot=w[np.argsort(w[:,1])[-20:]].mean(0);delta=root*np.array([sx,1,1])-oldroot
     mat=o.matrix_world.copy();mat.translation+=Vector(delta);o.matrix_world=mat
    else:
     pts=np.array([(x,root[1]-.016*t,root[2]+.002*math.sin(math.pi*t)-(.008)*t*t) for t in np.linspace(0,1,20)])*np.array([sx,1,1])
     o,_=sk.sweep(name,pts,lambda i,t:.004*(1-i/19)**.75+.00012,segments=16);sk.bone_parent(o,rig,bone)
    result.append(o);nseg=20 if k=='hind' else 16;ww=world(o);centers=ww[:len(ww)//nseg*nseg].reshape(-1,nseg,3).mean(1);arc=float(np.linalg.norm(np.diff(centers,axis=0),axis=1).sum());info[name]={'rootM':(root*np.array([sx,1,1])).tolist(),'bone':bone,'spanM':float(np.linalg.norm(np.ptp(world(o),axis=0))),'arcLengthM':arc}
  if k=='fore':
   for sx,s in [(1,'l'),(-1,'r')]:
    # Small backward-facing dewclaw, entirely below the protected plane.
    band=p[region(p,k)&(abs(p[:,2]-.053)<.003)];c=band.mean(0);c[2]=.054
    hit=tree.ray_cast(Vector((float(c[0]),float(band[:,1].max()+.04),.054)),Vector((0,-1,0)))[0]
    if hit is None:raise RuntimeError('Missing dewclaw seat')
    c=np.array(hit);c[1]-=.0015
    pts=np.array([c+[0,.008*t-.003*t*t,-.003*t-.006*t*t] for t in np.linspace(0,1,16)])*np.array([sx,1,1])
    o,_=sk.sweep(f'fore_dewclaw_{s}',pts,lambda i,t:.0022*(1-i/15)**.8+.0001,segments=14);sk.bone_parent(o,rig,f'leg_f{s}_03');result.append(o)
    info[o.name]={'arcLengthM':float(np.linalg.norm(np.diff(pts,axis=0),axis=1).sum()),'rootM':pts[0].tolist()}
 return result,info

def export(path,objs,skin=True):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_skins=skin,export_animations=False,export_apply=False)

def metrics(body,base,rig,rigid,clawinfo):
 p=sk.co(body);tree=KDTree(len(p))
 for i,x in enumerate(p):tree.insert(Vector(x),i)
 tree.balance();protected=base[:,2]>=.065;d=np.array([tree.find(Vector(x))[2] for x in base[protected]])
 band=(base[:,2]>=.055)&(base[:,2]<.065);bd=np.array([tree.find(Vector(x))[2] for x in base[band]])
 m={'buildId':'B-jas4','displacementAtOrAbove65mm':{'maxM':float(d.max()),'vertices':int(protected.sum()),'method':'Original vertices to nearest result vertex; exact zero required.'},'declaredBlendBandM':[.055,.065],'blendBandDisplacement':{'maxM':float(bd.max()),'meanM':float(bd.mean())},'nonManifoldEdges':sk.nonmanifold_edges(body),'maxInfluences':max(len(v.groups) for v in body.data.vertices),'maxWeightSumError':max(abs(sum(g.weight for g in v.groups)-1) for v in body.data.vertices),'claws':clawinfo,'pawTypes':{},'triangles':{o.name:sk.tri_count(o) for o in [body]+rigid}}
 m['triangles']['wholeCreature']=sum(m['triangles'].values());m['nonManifoldEdgesByObject']={o.name:sk.nonmanifold_edges(o) for o in [body]+rigid};m['digitProfilesFile']=f'{TAG}_profiles.json'
 bt=sk.bvh(body)
 for k in ['hind','fore']:
  q=p[region(p,k)];b=base[region(base,k)];lo=q.min(0);hi=q.max(0);L=float(hi[1]-lo[1]);front=q[q[:,1]<lo[1]+.35*L];kn=float(front[:,2].max());heel=q[(abs(q[:,2]-.030)<.0015)&(q[:,1]>lo[1]+.65*L)]
  mir=q*np.array([-1,1,1]);ds=sk.nearest_dist(bt,mir);lower=mir[mir[:,2]<.055];lowerds=sk.nearest_dist(bt,lower)
  m['pawTypes'][k]={'lengthM':L,'widthM':float(np.ptp(q[:,0])),'lengthRatioToBase':L/float(np.ptp(b[:,1])),'widthRatioToBase':float(np.ptp(q[:,0])/np.ptp(b[:,0])),'knuckleHeightM':kn,'knuckleHeightFraction':kn/L,'clayKnuckleHeightFraction':.33 if k=='hind' else .32,'digitWidthFraction':None,'clayDigitWidthFraction':.15 if k=='hind' else .135,'heelWidthAt30mmM':float(np.ptp(heel[:,0])) if len(heel) else None,'leftRightAsymmetryMaxM':float(ds.max()),'leftRightAsymmetryBelow55mmMaxM':float(lowerds.max()),'toeDirection':'-Y; source alignment yaw recorded in placement.json'}
 # Measure digit sections by downward surface hits, excluding rigid claws.
 for k in ['hind','fore']:
  q=p[region(p,k)];lo=q.min(0);hi=q.max(0);L=hi[1]-lo[1];rows=[]
  for f in [.12,.16,.20,.24,.28,.32,.36,.40]:
   y=lo[1]+f*L;xs=np.linspace(lo[0],hi[0],600);hit=np.array([bt.ray_cast(Vector((float(x),float(y),.08)),Vector((0,0,-1)))[0] is not None for x in xs]);segments=[];start=None
   for i,h in enumerate(hit):
    if h and start is None:start=i
    if start is not None and (not h or i==len(xs)-1):
     segments.append(float(xs[i]-xs[start]));start=None
   rows.append({'fractionFromToe':f,'widthsM':segments})
  valid=[r for r in rows if len(r['widthsM'])==4]
  m['pawTypes'][k]['digitSections']=rows
  m['pawTypes'][k]['digitWidthFraction']=float(max(np.median(r['widthsM']) for r in valid)/L) if valid else None
  m['pawTypes'][k]['digitWidthDefinition']='Maximum median width of four separated vertical-ray silhouette intervals across sampled knuckle sections, excluding rigid claws.'
  m['pawTypes'][k]['clayMeasurementNote']='Hind supplied ratios 0.33 and 0.15. Fore side length 71 px and knuckle height 23 px. Front digit is about 16/73 of frontal paw width; rescaled using approved footprint W/L 0.615 gives 0.135. Cross-view ratio is approximate.'
 return m

def main():
 (OUT/f'{TAG}_placement.json').write_text(json.dumps(CFG,indent=2))
 body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST';base=sk.co(body).copy();log({k:[base[region(base,k)].min(0).tolist(),base[region(base,k)].max(0).tolist()] for k in ['hind','fore']})
 if '--baseline' not in A:
  src=body.copy();src.data=body.data.copy();bpy.context.collection.objects.link(src);src.hide_render=True
  for k in ['hind','fore']:
   paw=place_recon(k,base,src);graft(body,paw,k,src);log(k+' grafted')
  p=sk.co(body)
  for k in ['hind','fore']:
   mask=region(p,k);q=p[mask];b=base[region(base,k)];lo=q.min(0);hi=q.max(0);blo=b.min(0);bhi=b.max(0)
   mid=(blo[0]+bhi[0])/2;half=(bhi[0]-blo[0])/2*CFG[k].get('widthScale',1);blo[0]=mid-half;bhi[0]=mid+half;blo[1]=bhi[1]-(bhi[1]-blo[1])*CFG[k].get('lengthScale',1)
   CFG[k]['toeX']=[float((x-lo[0])/(hi[0]-lo[0])*(bhi[0]-blo[0])+blo[0]) for x in CFG[k]['toeX']]
   for ax in [0,1]:
    target=(q[:,ax]-lo[ax])/(hi[ax]-lo[ax])*(bhi[ax]-blo[ax])+blo[ax]
    w=np.clip((.058-q[:,2])/.008,0,1);p[mask,ax]+=(target-q[:,ax])*w
   maskr=(p[:,0]<0)&((p[:,1]>.025) if k=='hind' else (p[:,1]<.025))&(p[:,2]<.065);q=p[maskr].copy();q[:,0]*=-1
   for ax in [0,1]:
    target=(q[:,ax]-lo[ax])/(hi[ax]-lo[ax])*(bhi[ax]-blo[ax])+blo[ax];w=np.clip((.058-q[:,2])/.008,0,1);q[:,ax]+=(target-q[:,ax])*w
   q[:,0]*=-1;p[maskr]=q
  sk.set_co(body,p)
  transfer(src,body);bpy.data.objects.remove(src,do_unlink=True);log('weights transferred')
  newclaws,ci=claws(body,rig)
 else:newclaws=[o for o in bpy.data.objects if o.name.startswith('hind_claw_')];ci={}
 rigid=[o for o in bpy.data.objects if o.type=='MESH' and o!=body and o.parent==rig]
 scene=lookdev.setup_scene(engine='CYCLES');scene.cycles.samples=32 if '--final' in A else 16
 for o in [body]+rigid:lookdev.apply_clay(o)
 dark=lookdev._material('paw_claw_dark',(.12,.12,.12),.75)
 for o in newclaws:o.data.materials.clear();o.data.materials.append(dark)
 for p in body.data.polygons:p.use_smooth=True
 if body.data.has_custom_normals:body.data.normals_split_custom_set([(0,0,0)]*len(body.data.loops))
 cams=pawcams(base)
 if '--baseline' not in A:
  m=metrics(body,base,rig,rigid,ci);(OUT/f'measurements_{TAG}.json').write_text(json.dumps(m,indent=2));log('measured')
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{TAG}.blend'),compress=True)
 for n,c in cams.items():
  if n=='hind_paw_front':continue
  lookdev.render(c,str(OUT/'renders'/f'{TAG}_{n}.png'),1024)
 log('paw renders')
 if '--baseline' in A:
  full=lookdev.frame_cameras([body]+rigid);lookdev.render(full['side_left'],str(OUT/'renders'/'iter0_full_side_left.png'),1024);lookdev.render(full['side_left'],str(OUT/'renders'/'iter0_sprite_side_192.png'),192)
 if '--final' in A:
  for n,c in {**legcam.frame_legs(),**forecam.frame_forelegs()}.items():lookdev.render(c,str(OUT/'renders'/f'{n}.png'),1024)
  full=lookdev.frame_cameras([body]+rigid)
  for n,c in full.items():lookdev.render(c,str(OUT/'renders'/f'full_{n}.png'),1024)
  lookdev.render(full['side_left'],str(OUT/'renders'/'sprite_side_192.png'),192)
  q=base[region(base,'fore')];lo=q.min(0);hi=q.max(0);lo[1]=hi[1]-.045;hi[1]+=.018;lo[2]=.035;hi[2]=.071
  dc=lookdev.place_camera('lookdev_cam_dewclaw',(Vector(lo),Vector(hi)),145,12,margin=.12);lookdev.render(dc,str(OUT/'renders'/'fore_dewclaw_back.png'),1024)
  (OUT/f'{TAG}_profiles.json').write_text(json.dumps(PROFILE_LOG,indent=2))
  (OUT/'measurements.json').write_text(json.dumps(m,indent=2))
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paws.blend'),compress=True)
  export(OUT/'paws.glb',[body,rig]+rigid)
  part=sk.mesh_from('paws_part',[],[]);part.data=body.data.copy();sk.cut_keep(part,(0,0,.065),(0,0,1),False,True)
  lookdev.apply_clay(part);parts=[part]+[sk.evaluated_copy(o,o.name+'_export') for o in newclaws]
  export(OUT/'paws_part.glb',parts,False)
  for o in parts:bpy.data.objects.remove(o,do_unlink=True)
 LOG['seconds']=time.time()-T0;(OUT/f'blender_log_{TAG}.json').write_text(json.dumps(LOG,indent=2));log('done')
main()

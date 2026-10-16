"""B-23xc: inward toe detail on the unchanged pass 5 mesh."""
import bpy,bmesh,numpy as np,sys,json,time,runpy,math
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
T=time.time();HERE=Path('/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/sculpt');OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-paws/pass6')
sys.path[:0]=[str(HERE),str(HERE.parent/'roster')]
sys.argv=['build_paws.py','--','--out',str(OUT)]
ns={'__file__':str(HERE/'build_paws.py')};code=(OUT.parent/'pass4/previous_builder.py').read_text();exec(code.rsplit('\nmain()',1)[0],ns)
sk=ns['sk'];lookdev=ns['lookdev'];body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST'
P=sk.co(body).copy();p=P.copy();N=sk.normals(body);tree=sk.bvh(body)
weights=[[(g.group,g.weight) for g in v.groups] for v in body.data.vertices]
CFG={};claws=[];ci={}
def smoothstep(v):
 v=np.clip(v,0,1);return v*v*(3-2*v)
def select(p,k,s=1):return (p[:,0]*s>0)&(p[:,2]<.065)&((p[:,1]>.025) if k=='hind' else (p[:,1]<.025))
# Three paths follow local depressions in the generated surface. No vertex or weight is added.
for k in ['hind','fore']:
 q=P[select(P,k)];lo=q.min(0);hi=q.max(0);L=hi[1]-lo[1]
 distal=q[(q[:,1]<lo[1]+.30*L)&(q[:,1]>lo[1]+.12*L)];xmin=distal[:,0].min();xmax=distal[:,0].max();W=xmax-xmin
 centers=np.linspace(xmin+W*.125,xmax-W*.125,4)
 override=OUT/'toe_paths.json'
 cfg=json.loads(override.read_text()).get(k,{}) if override.exists() else {}
 centers=np.array(cfg.get('toeX',centers.tolist()))
 paths=cfg.get('paths',[[[float(lo[1]),float(x)],[float(lo[1]+.4*L),float(x)]] for x in (centers[:-1]+centers[1:])/2])
 CFG[k]={'toeX':centers.tolist(),'paths':paths,'lengthM':float(L),'cleftDepthM':.0025,'cleftHalfWidthM':.0016 if k=='hind' else .0020}
 for sign in [1,-1]:
  ids=np.flatnonzero(select(P,k,sign));v=P[ids];t=(v[:,1]-lo[1])/L
  # Only upward-facing skin. The original sole, front perimeter and side walls are fixed.
  fade=smoothstep((.4-t)/.07)*smoothstep((v[:,2]-.003)/.006)*smoothstep((.060-v[:,2])/.008)
  fade*=smoothstep((N[ids,2]-.10)/.40)
  # Preserve the side and front upper envelopes. Carving stays inside the outline.
  protect=np.ones(len(ids))
  for axis in [0,1]:
   bins=np.floor(v[:,axis]/.0015).astype(int);maxz={int(b):float(v[bins==b,2].max()) for b in np.unique(bins)}
   gap=np.array([maxz[int(b)] for b in bins])-v[:,2]
   protect=np.minimum(protect,.28+.72*smoothstep(gap/.003))
  d=np.zeros(len(ids))
  for path in paths:
   path=np.array(path);line=np.interp(v[:,1],path[:,0],path[:,1]);g=np.exp(-((v[:,0]*sign-line)/CFG[k]['cleftHalfWidthM'])**2)
   d=np.maximum(d,.0025*g*fade*protect)
  p[ids,2]-=d
# Relax only the added fore displacement, never the underlying generated coordinates.
D=P[:,2]-p[:,2];sm=sk.smooth_scalar(body,D,3,.5);f=(P[:,1]<.025);D[f]=np.minimum(sm[f],D[f]*1.2);p[:,2]=P[:,2]-D
sk.set_co(body,p)
# Do not recalculate or replace topology, skin weights, or source shading flags.
newtree=sk.bvh(body)
dark=lookdev._material('paw_claw_dark',(.12,.12,.12),.75)
for k in ['hind','fore']:
 q=P[select(P,k)];lo=q.min(0);hi=q.max(0);L=hi[1]-lo[1]
 for j,x in enumerate(CFG[k]['toeX']):
  # Find the toe's forward surface at a low root, then bury the thick base.
  z=.014 if k=='hind' else .012
  hits=[]
  for zz in np.linspace(z-.003,z+.003,7):
   h=newtree.ray_cast(Vector((float(x),float(lo[1]-.04),float(zz))),Vector((0,1,0)))[0]
   if h is not None and h.y<lo[1]+.45*L:hits.append((abs(zz-z),h))
  if not hits:raise RuntimeError('Missing toe seat '+k+str(j))
  root=np.array(min(hits,key=lambda a:a[0])[1]);root[1]+=.0035
  length=.25*.40*L
  pts=np.array([root+[0,-length*t,-min(.009,root[2]-.002)*t*t] for t in np.linspace(0,1,20)])
  for sign,s in [(1,'l'),(-1,'r')]:
   vv=pts*np.array([sign,1,1]);r=.0055 if k=='hind' else .0038
   if sign<0:
    h=newtree.ray_cast(Vector((float(vv[0,0]),float(lo[1]-.04),float(vv[0,2]))),Vector((0,1,0)))[0]
    if h is not None:vv[:,1]+=h.y+.0035-vv[0,1]
   o,_=sk.sweep(f'{k}_claw_{s}_{j+1}',vv,lambda i,t:r*(1-i/19)**.8+.00006,segments=20)
   for f in o.data.polygons:f.use_smooth=True
   sk.bone_parent(o,rig,f'leg_{"h" if k=="hind" else "f"}{s}_03');o.data.materials.append(dark);claws.append(o)
   ci[o.name]={'rootM':vv[0].tolist(),'arcLengthM':float(np.linalg.norm(np.diff(vv,axis=0),axis=1).sum()),'toeVisibleLengthM':float(.4*L),'bone':o.parent_bone,'rootRadiusM':r}
 if k=='fore':
  band=q[abs(q[:,2]-.053)<.003];c=band.mean(0);c[2]=.053
  h=newtree.ray_cast(Vector((float(c[0]),float(band[:,1].max()+.04),.053)),Vector((0,-1,0)))[0]
  if h is None:raise RuntimeError('No dewclaw root')
  c=np.array(h);c[1]-=.0015
  for sign,s in [(1,'l'),(-1,'r')]:
   pts=np.array([c+[0,.007*t-.001*t*t,-.003*t-.005*t*t] for t in np.linspace(0,1,16)])*np.array([sign,1,1])
   if sign<0:
    h=newtree.ray_cast(Vector((float(pts[0,0]),float(band[:,1].max()+.04),.053)),Vector((0,-1,0)))[0]
    if h is not None:pts[:,1]+=h.y-.0015-pts[0,1]
   o,_=sk.sweep(f'fore_dewclaw_{s}',pts,lambda i,t:.002*(1-i/15)**.8+.00006,segments=16)
   for f in o.data.polygons:f.use_smooth=True
   sk.bone_parent(o,rig,f'leg_f{s}_03');o.data.materials.append(dark);claws.append(o)
   ci[o.name]={'arcLengthM':float(np.linalg.norm(np.diff(pts,axis=0),axis=1).sum()),'rootM':pts[0].tolist(),'bone':o.parent_bone}
rigid=[o for o in bpy.context.scene.objects if o.type=='MESH' and o!=body and not o.name.startswith('lookdev_')]
p=sk.co(body);delta=np.linalg.norm(p-P,axis=1)
m={'buildId':'B-23xc','base':'pass5/paws.blend','bodyTopologyUnchanged':True,'bodyVertexCount':len(P),'weightsExactlyUnchanged':weights==[[(g.group,g.weight) for g in v.groups] for v in body.data.vertices],'maxInfluences':max(len(v.groups) for v in body.data.vertices),'nonManifoldEdges':sk.nonmanifold_edges(body),'displacementAtOrAbove65mmMaxM':float(delta[P[:,2]>=.065].max()),'declaredBlendBandM':None,'blendBandDisplacementM':0,'maximumCarvingM':float(delta.max()),'changedVertices':int((delta>0).sum()),'outwardDisplacementM':float(np.maximum(p[:,2]-P[:,2],0).max()),'pawTypes':{},'perPaw':{},'claws':ci,'clawMaterialLinearRGB':[.12]*3,'field':CFG}
# Rasterized orthographic triangle silhouettes on a common 0.2 mm grid.
body.data.calc_loop_triangles();tris=np.array([t.vertices[:] for t in body.data.loop_triangles])
def silhouette(a,tt,axes,origin,shape,step=.0002):
 xy=(a[:,axes]-origin)/step;mask=np.zeros(shape,dtype=bool)
 for tr in tt:
  v=xy[tr];low=np.maximum(np.floor(v.min(0)).astype(int),0);high=np.minimum(np.ceil(v.max(0)).astype(int),np.array(shape)-1)
  if np.any(high<low):continue
  xx,yy=np.meshgrid(np.arange(low[0],high[0]+1)+.5,np.arange(low[1],high[1]+1)+.5,indexing='ij');b=[]
  for j in range(3):
   u=v[j];w=v[(j+1)%3];b.append((xx-u[0])*(w[1]-u[1])-(yy-u[1])*(w[0]-u[0]))
  inside=((b[0]>=0)&(b[1]>=0)&(b[2]>=0))|((b[0]<=0)&(b[1]<=0)&(b[2]<=0))
  mask[low[0]:high[0]+1,low[1]:high[1]+1]|=inside
 return mask

def boundary(mask):
 inner=mask.copy();inner[1:,:]&=mask[:-1,:];inner[:-1,:]&=mask[1:,:];inner[:,1:]&=mask[:,:-1];inner[:,:-1]&=mask[:,1:]
 return np.argwhere(mask&~inner)
def haus(a,b):
 kd=KDTree(len(b))
 for i,v in enumerate(b):kd.insert(Vector((float(v[0]),float(v[1]),0)),i)
 kd.balance();return max(kd.find(Vector((float(v[0]),float(v[1]),0)))[2] for v in a)*.0002
for k in ['hind','fore']:
 for s in [1,-1]:
  mask=select(P,k,s);ids=np.flatnonzero(mask);a=P[mask];b=p[mask];lo=a.min(0);hi=a.max(0);before=np.ptp(a,axis=0);after=np.ptp(b,axis=0)
  tt=tris[np.all(mask[tris],axis=1)];index=np.full(len(P),-1);index[ids]=np.arange(len(ids));tt=index[tt]
  proof={}
  for name,axes in [('side',[1,2]),('front',[0,2]),('top',[0,1])]:
   origin=np.minimum(a[:,axes].min(0),b[:,axes].min(0))-.001;maximum=np.maximum(a[:,axes].max(0),b[:,axes].max(0))+.001;shape=tuple(np.ceil((maximum-origin)/.0002).astype(int)+1)
   aa=silhouette(a,tt,axes,origin,shape);bb=silhouette(b,tt,axes,origin,shape);ba=boundary(aa);bbd=boundary(bb)
   np.savez_compressed(OUT/f'silhouette_{k}_{s}_{name}.npz',before=aa,after=bb,pixelPitchM=.0002)
   proof[name]={'maxBoundaryDistanceM':max(haus(ba,bbd),haus(bbd,ba)),'pixelPitchM':.0002,'changedPixels':int(np.count_nonzero(aa!=bb))}
  key=k+('_l' if s==1 else '_r');m['perPaw'][key]={'beforeSizeXYZM':before.tolist(),'afterSizeXYZM':after.tolist(),'sizeDeltaXYZM':(after-before).tolist(),'silhouettes':proof,'carvingMaxM':float(delta[mask].max())}
  if s==1:
   L=before[1];kn=float(b[b[:,1]<lo[1]+.35*L,2].max());heel=b[(abs(b[:,2]-.03)<.002)&(b[:,1]>lo[1]+.65*L)]
   m['pawTypes'][k]={'lengthM':float(after[1]),'widthM':float(after[0]),'heightM':float(after[2]),'knuckleHeightFraction':kn/L,'clayKnuckleHeightFraction':.33 if k=='hind' else .32,'digitWidthFraction':float(np.median(np.diff(CFG[k]['toeX']))/L),'digitWidthDefinition':'Median toe center spacing divided by original paw length. Shallow clefts retain connected sole.','clayDigitWidthFraction':.15 if k=='hind' else .135,'heelWidthAt30mmM':float(np.ptp(heel[:,0])),'clawLengthsM':[v['arcLengthM'] for n,v in ci.items() if n.startswith(k+'_claw_l')],'leftRightAsymmetryMaxM':float(sk.nearest_dist(newtree,b*np.array([-1,1,1])).max())}
m['triangles']={o.name:sk.tri_count(o) for o in [body]+rigid};m['wholeTriangles']=sum(m['triangles'].values())
m['silhouettePass']=all(v['maxBoundaryDistanceM']<=.001 for q in m['perPaw'].values() for v in q['silhouettes'].values());m['sizePass']=all(max(abs(v) for v in q['sizeDeltaXYZM'])<=.001 for q in m['perPaw'].values())
(OUT/'measurements.json').write_text(json.dumps(m,indent=2));print('MEASURED',m['silhouettePass'],m['sizePass'],m['maximumCarvingM'],flush=True)
assert m['silhouettePass'] and m['sizePass'] and m['weightsExactlyUnchanged'] and m['nonManifoldEdges']==0 and m['displacementAtOrAbove65mmMaxM']==0 and m['wholeTriangles']<400000
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paws.blend'),compress=True)
ns['export'](OUT/'paws.glb',[body,rig]+rigid)
part=sk.mesh_from('paws_part',[],[]);part.data=body.data.copy();sk.cut_keep(part,(0,0,.065),(0,0,1),False,True)
parts=[part]+[sk.evaluated_copy(o,o.name+'_export') for o in claws];ns['export'](OUT/'paws_part.glb',parts,False)
for o in parts:bpy.data.objects.remove(o,do_unlink=True)
sys.argv=['compare_render.py','--','--out',str(OUT/'renders'),'--tag','pass6'];runpy.run_path(str(HERE/'compare_render.py'),run_name='__main__')
scene=bpy.context.scene;scene.cycles.samples=24
for n,c in ns['pawcams'](P).items():lookdev.render(c,OUT/'renders'/f'iter3_close_{n}.png',1024)
for n,c in {**ns['legcam'].frame_legs(),**ns['forecam'].frame_forelegs()}.items():lookdev.render(c,OUT/'renders'/f'pass6_{n}.png',1024)
full=lookdev.frame_cameras([body]+rigid)
for n,c in full.items():lookdev.render(c,OUT/'renders'/f'pass6_body_{n}.png',1024)
lookdev.render(full['side_left'],OUT/'renders'/'pass6_sprite_side_192.png',192)
q=P[select(P,'fore')];lo=q.min(0);hi=q.max(0);lo[1]=hi[1]-.045;hi[1]+=.018;lo[2]=.035;hi[2]=.071
cam=lookdev.place_camera('lookdev_cam_dewclaw',(Vector(lo),Vector(hi)),145,12,margin=.12);lookdev.render(cam,OUT/'renders'/'iter3_fore_dewclaw_back.png',1024)
(OUT/'timing.json').write_text(json.dumps({'blenderSeconds':time.time()-T,'gpuSeconds':0}));print('DONE',time.time()-T,flush=True)

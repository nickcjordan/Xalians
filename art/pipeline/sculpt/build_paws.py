"""B-dp38: clay-reconstructed paws with a protected 65 mm boundary."""
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
OUT=Path(arg('--out','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-paws/pass1'))
TAG=arg('--tag','iter1');OUT.mkdir(exist_ok=True);(OUT/'renders').mkdir(exist_ok=True)
CFG=json.loads((OUT/'placement.json').read_text())
LOG={}
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
  for n,a,e in [('side',90,0),('front_three_quarter',35,13),('front',0,8)]:
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
 A=order(A);B=order(B);i=j=0;n=len(A);m=len(B)
 def arc(loop):
  e=np.array([(loop[(i+1)%len(loop)].co-loop[i].co).length for i in range(len(loop))]);return np.r_[0,np.cumsum(e)/e.sum()]
 aa=arc(A);bb=arc(B)
 while i<n or j<m:
  if i<n and (j==m or aa[i+1]<bb[j+1]):vs=(A[i%n],A[(i+1)%n],B[j%m]);i+=1
  else:vs=(A[i%n],B[(j+1)%m],B[j%m]);j+=1
  bm.faces.new(vs)

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

def place_recon(kind,base):
 cfg=CFG[kind];o=gr.import_glb(OUT/cfg['run']/'shape.glb',kind+'_recon')
 sk.keep_largest(o)
 # Decimation retains reconstruction geometry; no authored soft volumes are added.
 m=o.modifiers.new('reconstruction_budget','DECIMATE');m.ratio=min(1,14000/sk.tri_count(o));applymod(o,m)
 p=sk.co(o);ang=math.radians(cfg['yaw']);R=np.array([[math.cos(ang),-math.sin(ang),0],[math.sin(ang),math.cos(ang),0],[0,0,1]])
 p=p@R.T;p-=p.min(0);p[:,2]*=cfg['height']/p[:,2].max()
 sk.set_co(o,p)
 if cfg.get('trim',0):
  xmin,xmax=p[:,0].min(),p[:,0].max();length=np.ptp(p[:,1]);centers=[];cuts=[]
  for j in range(4):
   xa=xmin+(xmax-xmin)*j/4;xb=xmin+(xmax-xmin)*(j+1)/4
   q=p[(p[:,0]>=xa)&(p[:,0]<=xb)];centers.append((xa+xb)/2);cuts.append(float(q[:,1].min()+length*cfg['trim']))
  d=p[:,1]-np.interp(p[:,0],centers,cuts);verts=p.tolist();faces=[];cache={}
  for poly in o.data.polygons:
   ids=list(poly.vertices);out=[]
   for ii,u in enumerate(ids):
    v=ids[(ii+1)%len(ids)];du,dv=d[u],d[v]
    if du>=0:out.append(u)
    if (du>=0)!=(dv>=0):
     key=tuple(sorted((u,v)))
     if key not in cache:
      t=du/(du-dv);cache[key]=len(verts);verts.append((p[u]+t*(p[v]-p[u])).tolist())
     out.append(cache[key])
   if len(out)>=3:faces.append(out)
  me=bpy.data.meshes.new('nail_trim');me.from_pydata(verts,[],faces);me.update();o.data=me
  clean(o)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free()
  p=sk.co(o)
 low=p[p[:,2]<.063];target=base[region(base,kind)];lo=target.min(0);hi=target.max(0)
 for ax in [0,1]:p[:,ax]=(p[:,ax]-low[:,ax].min())/np.ptp(low[:,ax])*(hi[ax]-lo[ax])+lo[ax]
 # Align the upper reconstruction collar to the base ankle while keeping toes fixed.
 band=base[region(base,kind)&(base[:,2]>.060)];dst=(band.min(0)+band.max(0))/2
 sec=p[abs(p[:,2]-.061)<.003];cen=(sec.min(0)+sec.max(0))/2
 t=np.clip((p[:,2]-.045)/.018,0,1);t=t*t*(3-2*t);t*=np.clip((p[:,1]-lo[1]-.60*(hi[1]-lo[1]))/(.25*(hi[1]-lo[1])),0,1)
 p[:,:2]+=(dst[:2]-cen[:2])*t[:,None]
 p[:,0]=(p[:,0]-p[:,0].min())/np.ptp(p[:,0])*(hi[0]-lo[0])+lo[0]
 sk.set_co(o,p)
 # Remove tiny disconnected reconstruction debris and close local scan holes.
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
 bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free()
 sk.voxel_remesh(o,.00065 if kind=='fore' else .0010);sk.keep_largest(o);sk.smooth(o,5,.25)
 pp=sk.co(o);yy=pp[:,1];tw=np.clip((yy.min()+.30*np.ptp(yy)-yy)/(.15*np.ptp(yy)),0,1);sk.smooth(o,35,.4,tw)
 m=o.modifiers.new('final_local_budget','DECIMATE');m.ratio=min(1,12000/sk.tri_count(o));applymod(o,m)
 sk.cut_keep(o,(0,0,.0640),(0,0,1),False,False)
 clean(o)
 return o

def graft(body,paw,kind):
 # Kept body starts at 63 mm. The original surface above 65 mm is never moved.
 test=lambda p:(p.y>.025 if kind=='hind' else p.y<.025)
 sk.cut_keep(body,(0,0,.0648),(0,0,1),True,False,region=test)
 bm=bmesh.new();bm.from_mesh(body.data)
 for sx in [1,-1]:
  AA=list({v for e in bm.edges if e.is_boundary and all(v.co.x*sx>0 and test(v.co) and abs(v.co.z-.0648)<1e-5 for v in e.verts) for v in e.verts})
  old=set(bm.verts);me=paw.data.copy()
  if sx<0:me.transform(Matrix.Diagonal((-1,1,1,1)))
  bm.from_mesh(me);bpy.data.meshes.remove(me);fresh=set(bm.verts)-old
  BB=list({v for e in bm.edges if e.is_boundary and all(v in fresh for v in e.verts) for v in e.verts})
  if not AA or not BB:raise RuntimeError(f'{kind} missing graft rings {len(AA)} {len(BB)}')
  # Ease the new upper ring toward the kept ring footprint, then bridge unequal loops.
  ca=sum((v.co for v in AA),Vector())/len(AA);cb=sum((v.co for v in BB),Vector())/len(BB)
  ra=np.array([tuple(v.co) for v in AA]);rb=np.array([tuple(v.co) for v in BB]);rat=np.ptp(ra,axis=0)[:2]/np.ptp(rb,axis=0)[:2]
  fymin=min(v.co.y for v in fresh);fymax=max(v.co.y for v in fresh)
  for v in fresh:
   w=np.clip((v.co.z-.058)/.006,0,1);w=w*w*(3-2*w);w*=np.clip((v.co.y-fymin-.55*(fymax-fymin))/(.25*(fymax-fymin)),0,1)
   for ax in [0,1]:v.co[ax]+=(ca[ax]+(v.co[ax]-cb[ax])*rat[ax]-v.co[ax])*w
  if sx<0:
   for v in AA+BB:v.co.x*=-1
  stitch(bm,AA,BB)
  if sx<0:
   for v in AA+BB:v.co.x*=-1
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free()
 bpy.data.objects.remove(paw,do_unlink=True)
 p=sk.co(body);w=np.clip((.065-p[:,2])/.003,0,1)*np.clip((p[:,2]-.058)/.003,0,1)*((p[:,1]>.025) if kind=='hind' else (p[:,1]<.025))
 sk.smooth(body,60,.40,w);clean(body)
 bm=bmesh.new();bm.from_mesh(body.data);boundary=[e for e in bm.edges if e.is_boundary and all(v.co.z<.065 for v in e.verts)]
 if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
 bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(body.data);bm.free()

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
    band=p[region(p,k)&(abs(p[:,2]-.053)<.003)];c=band.mean(0);c[1]=band[:,1].max()-.001;c[2]=.054
    pts=np.array([c+[0,.003*t,-.009*t] for t in np.linspace(0,1,16)])*np.array([sx,1,1])
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
 band=(base[:,2]>=.058)&(base[:,2]<.065);bd=np.array([tree.find(Vector(x))[2] for x in base[band]])
 m={'buildId':'B-dp38','displacementAtOrAbove65mm':{'maxM':float(d.max()),'vertices':int(protected.sum()),'method':'Original vertices to nearest result vertex; exact zero required.'},'declaredBlendBandM':[.058,.065],'blendBandDisplacement':{'maxM':float(bd.max()),'meanM':float(bd.mean())},'nonManifoldEdges':sk.nonmanifold_edges(body),'maxInfluences':max(len(v.groups) for v in body.data.vertices),'maxWeightSumError':max(abs(sum(g.weight for g in v.groups)-1) for v in body.data.vertices),'claws':clawinfo,'pawTypes':{},'triangles':{o.name:sk.tri_count(o) for o in [body]+rigid}}
 m['triangles']['wholeCreature']=sum(m['triangles'].values())
 bt=sk.bvh(body)
 for k in ['hind','fore']:
  q=p[region(p,k)];b=base[region(base,k)];lo=q.min(0);hi=q.max(0);L=float(hi[1]-lo[1]);front=q[q[:,1]<lo[1]+.35*L];kn=float(front[:,2].max());heel=q[(abs(q[:,2]-.030)<.0015)&(q[:,1]>lo[1]+.65*L)]
  mir=q*np.array([-1,1,1]);ds=sk.nearest_dist(bt,mir)
  m['pawTypes'][k]={'lengthM':L,'widthM':float(np.ptp(q[:,0])),'lengthRatioToBase':L/float(np.ptp(b[:,1])),'widthRatioToBase':float(np.ptp(q[:,0])/np.ptp(b[:,0])),'knuckleHeightM':kn,'knuckleHeightFraction':kn/L,'clayKnuckleHeightFraction':.33 if k=='hind' else .32,'digitWidthFraction':None,'clayDigitWidthFraction':.15 if k=='hind' else .23,'heelWidthAt30mmM':float(np.ptp(heel[:,0])) if len(heel) else None,'leftRightAsymmetryMaxM':float(ds.max()),'toeDirection':'-Y; source alignment yaw recorded in placement.json'}
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
  m['pawTypes'][k]['clayMeasurementNote']='Hind ratios supplied by pass 3. Fore manual estimate: side skin length 71 px, knuckle height 23 px; frontal digit width about 16 px. Cross-view pixel scales introduce uncertainty, so fore ratios are approximate.'
 return m

def main():
 (OUT/f'{TAG}_placement.json').write_text(json.dumps(CFG,indent=2))
 body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST';base=sk.co(body).copy();log({k:[base[region(base,k)].min(0).tolist(),base[region(base,k)].max(0).tolist()] for k in ['hind','fore']})
 if '--baseline' not in A:
  src=body.copy();src.data=body.data.copy();bpy.context.collection.objects.link(src);src.hide_render=True
  for k in ['hind','fore']:
   paw=place_recon(k,base);graft(body,paw,k);log(k+' grafted')
  p=sk.co(body)
  for k in ['hind','fore']:
   mask=region(p,k);q=p[mask];b=base[region(base,k)];lo=q.min(0);hi=q.max(0);blo=b.min(0);bhi=b.max(0)
   for ax in [0,1]:
    target=(q[:,ax]-lo[ax])/(hi[ax]-lo[ax])*(bhi[ax]-blo[ax])+blo[ax]
    w=np.clip((.065-q[:,2])/.006,0,1);p[mask,ax]+=(target-q[:,ax])*w
   maskr=(p[:,0]<0)&((p[:,1]>.025) if k=='hind' else (p[:,1]<.025))&(p[:,2]<.065);q=p[maskr].copy();q[:,0]*=-1
   for ax in [0,1]:
    target=(q[:,ax]-lo[ax])/(hi[ax]-lo[ax])*(bhi[ax]-blo[ax])+blo[ax];w=np.clip((.065-q[:,2])/.006,0,1);q[:,ax]+=(target-q[:,ax])*w
   q[:,0]*=-1;p[maskr]=q
  sk.set_co(body,p)
  transfer(src,body);bpy.data.objects.remove(src,do_unlink=True);log('weights transferred')
  newclaws,ci=claws(body,rig)
 else:newclaws=[o for o in bpy.data.objects if o.name.startswith('hind_claw_')];ci={}
 rigid=[o for o in bpy.data.objects if o.type=='MESH' and o!=body and o.parent==rig]
 scene=lookdev.setup_scene(engine='CYCLES');scene.cycles.samples=16
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
 if '--final' in A:
  for n,c in {**legcam.frame_legs(),**forecam.frame_forelegs()}.items():lookdev.render(c,str(OUT/'renders'/f'{n}.png'),1024)
  full=lookdev.frame_cameras([body]+rigid)
  for n,c in full.items():lookdev.render(c,str(OUT/'renders'/f'full_{n}.png'),1024)
  lookdev.render(full['side_left'],str(OUT/'renders'/'sprite_side_192.png'),192)
  (OUT/'measurements.json').write_text(json.dumps(m,indent=2))
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paws.blend'),compress=True)
  export(OUT/'paws.glb',[body,rig]+rigid)
  part=sk.mesh_from('paws_part',[],[]);part.data=body.data.copy();sk.cut_keep(part,(0,0,.065),(0,0,1),False,True)
  lookdev.apply_clay(part);parts=[part]+[sk.evaluated_copy(o,o.name+'_export') for o in newclaws]
  export(OUT/'paws_part.glb',parts,False)
  for o in parts:bpy.data.objects.remove(o,do_unlink=True)
 LOG['seconds']=time.time()-T0;(OUT/f'blender_log_{TAG}.json').write_text(json.dumps(LOG,indent=2));log('done')
main()

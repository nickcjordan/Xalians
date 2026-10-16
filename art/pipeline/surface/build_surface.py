"""B-rmyz surface authoring in Blender. Original body UVs and geometry are preserved."""
import bpy, bmesh, numpy as np, json, math, sys, os, zlib, struct, time, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).parent
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-surface/pass1')
SRC=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6')
sys.path.insert(0,str(HERE.parent/'roster'))
import lookdev
ITER=int(os.environ.get('SURFACE_ITER','1'))
S=2048
FUR_PATCH=None
def write(name,data): (OUT/name).write_text(json.dumps(data,indent=2))
def png(path,a):
 a=np.uint8(np.clip(a,0,1)*255+.5);h,w,c=a.shape
 def chunk(k,v):return struct.pack('>I',len(v))+k+v+struct.pack('>I',zlib.crc32(k+v)&0xffffffff)
 raw=b''.join(b'\0'+row.tobytes() for row in a[::-1])
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6 if c==4 else 2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,6))+chunk(b'IEND',b''))
def savepair(name,a):
 png(OUT/(name+'_2048.png'),a)
 b=a.reshape(1024,2,1024,2,a.shape[-1]).mean((1,3))
 if name=='normal':
  n=b[:,:,:3]*2-1;n/=np.maximum(np.linalg.norm(n,axis=2,keepdims=True),1e-6);b[:,:,:3]=n*.5+.5
 png(OUT/(name+'_1024.png'),b)
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
def hash2(x,y):return np.mod(np.sin(x*127.1+y*311.7)*43758.5453,1)
def noise(x,y):
 ix=np.floor(x);iy=np.floor(y);fx=smooth(0,1,x-ix);fy=smooth(0,1,y-iy)
 return (hash2(ix,iy)*(1-fx)+hash2(ix+1,iy)*fx)*(1-fy)+(hash2(ix,iy+1)*(1-fx)+hash2(ix+1,iy+1)*fx)*fy
def reference_fur(s,t):
 # Project an approved coat-detail sample with a smooth periodic crossfade.
 patch=FUR_PATCH;h,w=patch.shape;x=s*1750;y=t*1750
 ux=np.mod(x/w,1);uy=np.mod(y/h,1);wx=smooth(0,.12,ux)*(1-smooth(.88,1,ux));wy=smooth(0,.12,uy)*(1-smooth(.88,1,uy))
 result=np.zeros_like(s)
 for ox,weightx in ((0,wx),(w*.5,1-wx)):
  for oy,weighty in ((0,wy),(h*.5,1-wy)):
   xx=np.mod(x+ox,w-1);yy=np.mod(y+oy,h-1);ix=xx.astype(int);iy=yy.astype(int);fx=xx-ix;fy=yy-iy
   q=(patch[iy,ix]*(1-fx)+patch[iy,ix+1]*fx)*(1-fy)+(patch[iy+1,ix]*(1-fx)+patch[iy+1,ix+1]*fx)*fy
   result+=q*weightx*weighty
 return result
def fur(p,region):
 x,y,z=p.T;ax=np.abs(x)
 # Side and front projections share world positions at every UV seam.
 body=(region==0)&(z>.28)&(y>-.08)&(y<.34)
 length=np.where(z>.48,.009,np.where(body,.023,np.where(y<.04,.016,.035)))
 length=np.where((y<-.07)&(z>.41),.009,length)
 length=np.where((y<-.15)&(z<.49)&(z>.30),.032,length)
 cross=np.where(body,z*.94+y*.34+ax*.45,ax*.85+y*.52)
 along=np.where(body,y*.94-z*.34,-z+y*.18)
 tail=y>.34
 cross=np.where(tail,ax*.85+z*.60,cross);along=np.where(tail,y*1.3,along);length=np.where(tail,.020,length)
 width=np.where((y<-.07)&(z>.41),.0020,.0037)
 u=cross/width;v=along/length
 bend=noise(cross*19,along*44)*1.8
 fine=noise(u+bend,v*1.4)
 clump=noise(cross/.009+bend*.3,along/(length*1.4))
 # Continuous anisotropic noise avoids repeated cell-row seams and banding.
 procedural=fine*.72+clump*.28
 if FUR_PATCH is not None:
  authored=reference_fur(along*.023/length,cross)
  return authored*.82+procedural*.18
 return procedural
def coat(p,n,limb):
 x,y,z=p.T;ax=np.abs(x);ny=n[:,1]
 cloud=noise(y*22+ax*15,z*19)*.55+noise(y*65,z*60+ax*50)*.3+noise(y*8,z*10)*.15
 edge=(noise(y*140,z*130+ax*160)-.5)*.009
 # Projected side/front landmark masks traced from the approved sheets.
 bellyline=.294+.21*np.clip((y+.06)/.28,0,1)
 belly=(1-smooth(bellyline-.018,bellyline+.012,z+edge))*smooth(-.09,-.01,y)*(1-smooth(.21,.29,y))*(1-smooth(.15,.75,limb))
 throat=(1-smooth(-.157,-.123,y+edge))*smooth(.30,.43,z)*(1-smooth(.505,.54,z))
 chest=(1-smooth(-.115,-.065,y+edge))*smooth(.25,.32,z)*(1-smooth(.43,.49,z))*(1-smooth(.035,.072,ax))
 blaze=(1-smooth(.010,.020,ax+edge*.25))*smooth(.49,.535,z)*(1-smooth(.602,.635,z))*(1-smooth(-.195,-.155,y))
 muzzle=(1-smooth(-.259,-.235,y+edge*.25))*(1-smooth(.527,.548,z))
 chin=(1-smooth(-.20,-.155,y))*smooth(.466,.482,z)*(1-smooth(.496,.512,z))
 legcenter=np.where(y>.03,.105,.042)
 inner=(1-smooth(legcenter-.015,legcenter+.005,ax+edge))*(1-smooth(.29,.35,z))*smooth(.055,.10,z)*smooth(.05,.55,-n[:,0]*np.sign(x))
 hind=(y>.09)&(z<.34)
 backedge=.29-(z-.16)*.57
 feather=smooth(backedge-.025,backedge+.006,y+edge)*hind*(1-smooth(.13,.17,ax))
 white=np.maximum.reduce([belly,throat,chest,blaze,muzzle,chin,inner*.88,feather*.85])
 base=np.array([.38,.39,.40])[None,:]*(.82+cloud[:,None]*.40)
 pale=np.array([.80,.805,.79])[None,:]*(.91+cloud[:,None]*.13)
 c=base*(1-white[:,None])+pale*white[:,None]
 # Small dark nasal leather, no extra geometry.
 nose=(y<-.301)&(z>.497)&(z<.523)&(ax<.018)
 c[nose]=[.105,.085,.079]
 return c,white,nose
def components(o):
 adj=[[] for _ in o.data.vertices]
 for e in o.data.edges:
  a,b=e.vertices;adj[a].append(b);adj[b].append(a)
 left=set(range(len(adj)));parts=[]
 while left:
  q=[left.pop()];found=q.copy()
  while q:
   for j in adj[q.pop()]:
    if j in left:left.remove(j);q.append(j);found.append(j)
  parts.append(found)
 return sorted(parts,key=len,reverse=True)
def image_array(path):
 im=bpy.data.images.load(str(path),check_existing=False);im.colorspace_settings.name='Non-Color'
 return np.array(im.pixels[:],np.float32).reshape(S,S,4)
def pad(arr,mask,steps=10):
 filled=mask.copy()
 for _ in range(steps):
  accum=np.zeros_like(arr);count=np.zeros(mask.shape,np.float32)
  for axis,shift in ((0,1),(0,-1),(1,1),(1,-1)):
   valid=np.roll(filled,shift,axis);vals=np.roll(arr,shift,axis)
   if axis==0:valid[0 if shift==1 else -1]=False
   else:valid[:,0 if shift==1 else -1]=False
   accum+=vals*valid[:,:,None];count+=valid
  new=(~filled)&(count>0);arr[new]=accum[new]/count[new,None];filled|=new
 return filled
def raster(o,callback):
 mesh=o.data;mesh.calc_loop_triangles();mesh.calc_tangents();uv=mesh.uv_layers.active.data;rot=o.matrix_world.to_3x3()
 for tri in mesh.loop_triangles:
  uu=np.array([uv[i].uv[:] for i in tri.loops])*S;a,b,c=uu
  den=np.cross(b-a,c-a)
  if abs(den)<1e-10:continue
  lo=np.maximum(0,np.floor(uu.min(0)).astype(int));hi=np.minimum(S-1,np.ceil(uu.max(0)).astype(int))
  xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));x=xx.ravel()+.5;y=yy.ravel()+.5
  v=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/den;w=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/den;u=1-v-w
  inside=(u>=-1e-6)&(v>=-1e-6)&(w>=-1e-6)
  if not inside.any():continue
  weights=np.stack([u[inside],v[inside],w[inside]],1);xs=xx.ravel()[inside];ys=yy.ravel()[inside]
  p=weights@np.array([o.matrix_world@mesh.vertices[i].co for i in tri.vertices]);n=weights@np.array([rot@mesh.vertices[i].normal for i in tri.vertices]);n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-8)
  t=weights@np.array([rot@mesh.loops[i].tangent for i in tri.loops]);t-=n*np.sum(n*t,1)[:,None];t/=np.maximum(np.linalg.norm(t,axis=1,keepdims=True),1e-8)
  sign=np.sign(weights@np.array([mesh.loops[i].bitangent_sign for i in tri.loops]));bt=np.cross(n,t)*sign[:,None]
  callback(tri,xs,ys,p,n,t,bt,weights)
def findrect(mask,w,h):
 # Preserve all existing UVs by allocating cards only in unused atlas space.
 integral=np.pad(mask.astype(np.int32),((1,0),(1,0))).cumsum(0).cumsum(1)
 sums=integral[h:,w:]-integral[:-h,w:]-integral[h:,:-w]+integral[:-h,:-w]
 yy,xx=np.where(sums==0)
 if len(xx)==0:raise RuntimeError('No empty atlas rectangle '+str((w,h)))
 x,y=int(xx[0]),int(yy[0]);mask[y:y+h,x:x+w]=True
 return [x+4,y+4,w-8,h-8]
def uvrect(rect,u,v):
 x,y,w,h=rect;return ((x+u*w)/S,(y+v*h)/S)
def plume_atlas(reference,occupied,color,normal,orm):
 # Registered approved plume projection, tiled into existing empty UV gaps.
 h,w=512,256;u,v=np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
 sy=505-v*430;center=np.interp(sy,[75,150,250,350,450,505],[80,140,190,215,200,165]);sx=center+(u-.5)*260
 ix=np.clip((sx+1070).astype(int),0,1373);iy=np.clip((1145-(sy+80)).astype(int),0,1144)
 rgb=reference[iy,ix,:3].copy();bg=(reference[iy,np.full_like(ix,1075),:3]+reference[iy,np.full_like(ix,1365),:3])*.5
 delta=np.max(np.abs(rgb-bg),axis=2);corewidth=np.interp(sy,[75,170,250,350,430,505],[0,8,34,43,22,0])
 core=np.abs(sx-center+np.interp(sy,[75,250,350,505],[0,12,5,0]))<corewidth
 alpha=((delta>.115)|core).astype(float)
 # Fill enclosed matte holes and remove detached background flecks.
 from collections import deque
 def flood(mask,starts):
  seen=np.zeros(mask.shape,bool);q=deque(starts)
  while q:
   yy,xx=q.popleft()
   if yy<0 or xx<0 or yy>=h or xx>=w or seen[yy,xx] or not mask[yy,xx]:continue
   seen[yy,xx]=True;q.extend(((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)))
  return seen
 exterior=flood(alpha==0,[(0,i) for i in range(w)]+[(h-1,i) for i in range(w)]+[(j,0) for j in range(h)]+[(j,w-1) for j in range(h)])
 alpha[~exterior]=1
 connected=flood(alpha>0,[(h//2,w//2)]);alpha=connected.astype(float)
 edge=(delta<.25)&(~core)&(alpha>0);rgb[edge]=np.clip((rgb[edge]-.18*bg[edge])/.82,0,1)
 alpha[-2:]=0
 rgba=np.dstack([rgb,alpha]);png(OUT/'plume_projection.png',rgba)
 gray=rgb.mean(2);gy,gx=np.gradient(gray);nn=np.dstack([.5-gx*.8,.5-gy*.8,np.ones_like(gx)])
 tiles=[]
 for row in range(8):
  for col in range(4):
   tilealpha=alpha[row*64:(row+1)*64,col*64:(col+1)*64]
   if not np.any(tilealpha>.5):continue
   rect=findrect(occupied,72,72);x,y,ww,hh=rect
   xs=np.clip(np.arange(col*64-4,(col+1)*64+4),0,255);ys=np.clip(np.arange(row*64-4,(row+1)*64+4),0,511)
   color[y-4:y+68,x-4:x+68]=rgba[np.ix_(ys,xs)];normal[y-4:y+68,x-4:x+68,:3]=nn[np.ix_(ys,xs)];orm[y-4:y+68,x-4:x+68]=[1,.87,0]
   tiles.append({'col':col,'row':row,'rect':rect})
 return tiles
def author():
 global FUR_PATCH
 if ITER==-1:
  import runpy
  runpy.run_path(str(HERE/'qa_surface.py'),run_name='__main__');return
 if ITER==0:
  info={};im=bpy.data.images.get('Luceras_basecolor_1024');pix=np.array(im.pixels[:]).reshape(1024,1024,4)
  for o in bpy.data.objects:
   if o.type!='MESH' or not o.name.startswith('surface_'):continue
   uv=np.array([l.uv[:] for l in o.data.uv_layers.active.data]);ij=np.clip((uv*1024).astype(int),0,1023);cs=pix[ij[:,1],ij[:,0]]
   info[o.name]={'color_mean':cs.mean(0).tolist(),'color_examples':cs[:12].tolist(),'normal_examples':[list(n.vector) for n in list(o.data.corner_normals)[:12]],'geometry_normal_examples':[list(p.normal) for p in list(o.data.polygons)[:4]],'positions':[list(v.co) for v in list(o.data.vertices)[:5]]}
  write('card_diagnosis.json',info);return
 bpy.ops.wm.open_mainfile(filepath=str(SRC/'gamemesh.blend'))
 sample=bpy.data.images.load('/mnt/c/dev/art-data/pipeline/blobs/8a/8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9',check_existing=False);sample.colorspace_settings.name='Non-Color'
 sw,sh=sample.size;rgb=np.array(sample.pixels[:],np.float32).reshape(sh,sw,4)
 patch=rgb[sh-550:sh-450,430:610,:3].mean(2);lo,hi=np.percentile(patch,[2,98]);FUR_PATCH=np.clip((patch-lo)/(hi-lo),0,1);bpy.data.images.remove(sample)
 body=bpy.data.objects['game_body_horns_claws'];eyes=bpy.data.objects['game_eyes'];rig=bpy.data.objects['luceras_rig']
 parts=components(body);region=np.zeros(len(body.data.vertices),np.int32);partstats=[]
 limbweights=np.array([sum(g.weight for g in v.groups if body.vertex_groups[g.group].name.startswith('leg_')) for v in body.data.vertices])
 for i,ids in enumerate(parts):
  pts=np.array([body.matrix_world@body.data.vertices[j].co for j in ids]);kind=0 if i==0 else (1 if pts[:,2].max()>.5 else 2);region[ids]=kind
  partstats.append({'vertices':len(ids),'type':['body','horn','claw'][kind],'bounds':[pts.min(0).tolist(),pts.max(0).tolist()]})
 write('source_parts.json',partstats)
 normal=image_array(SRC/'normal_2048.png');ao=image_array(SRC/'ao_2048.png')
 color=np.ones((S,S,4),np.float32);color[:,:,:3]=[.27,.285,.30]
 orm=np.ones((S,S,3),np.float32);orm[:,:,0]=ao[:,:,0];orm[:,:,1]=.86;orm[:,:,2]=0
 occupied=np.zeros((S,S),bool)
 def paint(tri,xs,ys,p,n,t,bt,weights):
  kind=region[tri.vertices[0]];occupied[ys,xs]=True
  if kind==0:
   c,white,nose=coat(p,n,weights@limbweights[list(tri.vertices)]);r=np.zeros(len(p),int);hair=fur(p,r)
   c*=np.clip(.65+hair[:,None]*.70,.65,1.35);c[nose]=[.105,.085,.079];color[ys,xs,:3]=c
   # World-space strand derivatives transformed into the baked tangent basis.
   eps=.00035;grad=np.empty_like(p)
   for a in range(3):
    pp=p.copy();pp[:,a]+=eps;pm=p.copy();pm[:,a]-=eps
    grad[:,a]=(fur(pp,r)-fur(pm,r))/(2*eps)
   grad*=.00075;grad[nose]=0
   base=normal[ys,xs,:3]*2-1;base[:,:2]-=np.stack([np.sum(grad*t,1),np.sum(grad*bt,1)],1)*base[:,2,None]
   base/=np.maximum(np.linalg.norm(base,axis=1,keepdims=True),1e-8);normal[ys,xs,:3]=base*.5+.5
   orm[ys,xs,1]=np.where(nose,.39,.84+noise(p[:,1]*100,p[:,2]*100)*.09)
  elif kind==1:
   # Existing AO and sculpt normals retain real ridge locations.
   crest=smooth(.60,.98,ao[ys,xs,0]);variation=noise(p[:,1]*100,p[:,2]*100)
   color[ys,xs,:3]=np.array([.105,.085,.07])[None,:]+crest[:,None]*np.array([.065,.06,.052])[None,:]+variation[:,None]*.015
   orm[ys,xs,1]=.32+.10*(1-crest)
  else:color[ys,xs,:3]=[.12,.13,.14];orm[ys,xs,1]=.53
 raster(body,paint)
 padded=pad(color,occupied,10);pad(normal,occupied,10);pad(orm,occupied,10)
 rects={}
 for key,sz in [('eye',(112,112)),('tuft',(64,144)),('pale',(56,128)),('dark',(56,128)),('whisker',(20,128))]:rects[key]=findrect(padded,*sz)
 for key,rect in rects.items():
  x,y,w,h=rect;u,v=np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
  if key=='eye':continue
  strand=noise(u*25+np.sin(v*9)*.5,v*5)
  alpha=np.zeros_like(u)
  # Three narrow, irregular locks on each already narrow geometric tuft.
  for j in range(3):
   root=.22+j*.28;end=[.82,.99,.90][j];center=root+(j-1)*.035*v+.035*np.sin(v*5+j)*v
   width=(.19-.13*v)*(1-smooth(end-.20,end,v))
   lock=(np.abs(u-center)<width)&(v<end)
   alpha=np.maximum(alpha,lock.astype(float))
  if key=='whisker':alpha=(np.abs(u-.5)<(.34*(1-v)+.08)).astype(float)
  pale=smooth(.10,.65,v) if key=='tuft' else np.ones_like(v) if key in ('pale','whisker') else np.zeros_like(v)
  c=np.array([.26,.28,.30])[None,None,:]*(1-pale[:,:,None])+np.array([.81,.81,.79])[None,None,:]*pale[:,:,None]
  c*=.78+strand[:,:,None]*.23
  color[y:y+h,x:x+w,:3]=c;color[y:y+h,x:x+w,3]=alpha
  normal[y:y+h,x:x+w,:3]=np.stack([.5+np.cos(u*100+np.sin(v*12)*1.5)*.12,.5+np.sin(v*16)*.03,np.ones_like(v)*.98],2)
  orm[y:y+h,x:x+w]=[1,.86,0]
  # Four-pixel border is transparent, with opaque color dilation to avoid dark fringes.
  color[y-4:y+h+4,x-4:x,3]=0;color[y-4:y+h+4,x+w:x+w+4,3]=0;color[y-4:y,x-4:x+w+4,3]=0;color[y+h:y+h+4,x-4:x+w+4,3]=0
 # Eye atlas, planar iris projection is aligned to world horizontal on both eyes.
 rect=rects['eye'];x,y,w,h=rect;u,v=np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
 xx=(u-.5)*2;zz=(v-.5)*2;rr=np.sqrt(xx*xx+zz*zz);ang=np.arctan2(zz,xx)
 radial=.5+.5*np.sin(ang*75+np.sin(rr*33)*2);iris=np.stack([.55+radial*.20,.30+radial*.17,.08+radial*.07],2)
 iris*=1-smooth(.72,.98,rr)[:,:,None]*.8
 pupil=(np.abs(xx)<.64)&(np.abs(zz)<(.105+.045*(1-(xx/.65)**2)))
 iris[pupil]=[.007,.006,.004];color[y:y+h,x:x+w,:3]=iris;color[y:y+h,x:x+w,3]=1
 normal[y:y+h,x:x+w,:3]=[.5,.5,1];orm[y:y+h,x:x+w]=[1,.16,0]
 uv=eyes.data.uv_layers.active.data
 for poly in eyes.data.polygons:
  for li in poly.loop_indices:
   p=eyes.matrix_world@eyes.data.vertices[eyes.data.loops[li].vertex_index].co;side=1 if p.x>0 else -1
   center=Vector((side*.0335,-.23748,.5579));d=p-center
   horizontal=(d.x*side*.40+d.y*.916)/.017
   uv[li].uv=uvrect(rect,.5+horizontal*.49,.5+(d.z/.017)*.49)
 rects['plume_tiles']=plume_atlas(rgb,padded,color,normal,orm)
 write('atlas_allocations.json',rects)
 savepair('basecolor',color);savepair('normal',normal);savepair('orm',orm)
 make_materials(body,eyes)
 make_cards(body,rig,rects)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 measure(meshes,rig)
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes+[rig]:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=body
 bpy.ops.export_scene.gltf(filepath=str(OUT/'luceras_surface.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_all_influences=False,export_apply=False,export_yup=True,export_extras=True)
 # Cycles needs an explicit backface shader to match glTF single-sided cutouts.
 mat=body.data.materials[0];ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=next(n for n in ns if n.type=='BSDF_PRINCIPLED');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL')
 geo=ns.new('ShaderNodeNewGeometry');transparent=ns.new('ShaderNodeBsdfTransparent');mix=ns.new('ShaderNodeMixShader');ls.new(geo.outputs['Backfacing'],mix.inputs[0]);ls.new(bs.outputs['BSDF'],mix.inputs[1]);ls.new(transparent.outputs[0],mix.inputs[2]);ls.new(mix.outputs[0],out.inputs['Surface'])
 setup_proof(meshes)
 bpy.data.orphans_purge(do_recursive=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'surface.blend'))
 write('build_state.json',{'iteration':ITER,'time':time.time(),'blender':bpy.app.version_string,'source_blend_sha256':hashlib.sha256((SRC/'gamemesh.blend').read_bytes()).hexdigest(),'body_geometry_modified':False,'body_uv_modified':False,'eye_uv_change':'Planar atlas projection into unused body atlas space to share one base color.','fur_detail_reference':{'blob':'8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9','crop_pixels_top_left':[430,450,610,550],'method':'Approved coat detail projected through region-scaled flow fields, crossfaded periodically and combined with anisotropic procedural noise. Color and tangent normal authored in Blender at 2048.'}})
 render_views(['side','three_quarter','front','head','hind_leg','tail_plume'],preview=True)
def make_materials(body,eyes):
 images={}
 for key in ('basecolor','normal','orm'):
  im=bpy.data.images.load(str(OUT/(key+'_1024.png')),check_existing=False);im.name='Luceras_'+key+'_1024';im.colorspace_settings.name='sRGB' if key=='basecolor' else 'Non-Color';im.pack();images[key]=im
 for name,obj,iseye in [('Luceras_storm_slate',body,False),('Luceras_amber_eyes',eyes,True)]:
  mat=bpy.data.materials.new(name);mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
  bs=nodes.new('ShaderNodeBsdfPrincipled');out=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs['BSDF'],out.inputs['Surface'])
  bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.16 if iseye else .86
  if iseye:bs.inputs['Coat Weight'].default_value=.5;bs.inputs['Coat Roughness'].default_value=.08
  tex={}
  for k in images:tex[k]=nodes.new('ShaderNodeTexImage');tex[k].image=images[k];tex[k].label=k
  links.new(tex['basecolor'].outputs['Color'],bs.inputs['Base Color'])
  sep=nodes.new('ShaderNodeSeparateColor');links.new(tex['orm'].outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],bs.inputs['Roughness']);links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
  ng=bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
  if not any(i.name=='Occlusion' for i in ng.interface.items_tree):ng.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
  gn=nodes.new('ShaderNodeGroup');gn.node_tree=ng;links.new(sep.outputs['Red'],gn.inputs['Occlusion'])
  if not iseye:
   nm=nodes.new('ShaderNodeNormalMap');links.new(tex['normal'].outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
   # Greater-than is exported as glTF MASK, and is a hard cutout in Cycles.
   cut=nodes.new('ShaderNodeMath');cut.operation='GREATER_THAN';cut.inputs[1].default_value=.5;links.new(tex['basecolor'].outputs['Alpha'],cut.inputs[0]);links.new(cut.outputs[0],bs.inputs['Alpha'])
   mat.surface_render_method='DITHERED';mat.use_transparency_overlap=False
  mat.use_backface_culling=not iseye;obj.data.materials.clear();obj.data.materials.append(mat)
  for p in obj.data.polygons:p.material_index=0
def make_cards(body,rig,rects):
 rng=np.random.default_rng(731);records=[]
 bm=bmesh.new();bm.from_mesh(body.data);tree=BVHTree.FromBMesh(bm)
 def skin_at(p):
  hit=tree.find_nearest(Vector(p));face=body.data.polygons[hit[2]];v=min(face.vertices,key=lambda i:(body.data.vertices[i].co-hit[0]).length)
  weights=[(body.vertex_groups[g.group].name,g.weight) for g in body.data.vertices[v].groups if g.weight>1e-6];return weights
 def cards_object(name,cards):
  verts=[];faces=[];uvs=[];weights=[]
  custom=[]
  for start,end,width,axis,kind,skin in cards:
   start=Vector(start);end=Vector(end);axis=Vector(axis).normalized();mid=start.lerp(end,.55)
   if 'whisker' in name:mid+=Vector((0,.004,.003))
   k=len(verts);vs=[start-axis*width*.5,start+axis*width*.5,mid-axis*width*.48,mid+axis*width*.48,end]
   if 'tail' not in name and 'whisker' not in name:
    for vi in (0,1):
     hit=tree.find_nearest(vs[vi]);vs[vi]=hit[0]-hit[1]*.0006
   verts.extend(vs)
   normal=axis.cross(end-start).normalized()
   flip=('fringe' in name and normal.x*start.x<0) or ('chest' in name and normal.y>0) or ('whisker' in name and normal.y>0)
   localfaces=[(0,1,3,2),(2,3,4)]
   if flip:localfaces=[tuple(reversed(f)) for f in localfaces];normal=-normal
   faces.extend([tuple(k+i for i in f) for f in localfaces])
   uvlist=[uvrect(rects[kind],u,v) for u,v in [(0,0),(1,0),(0,.55),(1,.55),(.5,1)]]
   uvs.extend([uvlist[i] for f in localfaces for i in f]);weights.extend([skin]*5)
   if 'tail' in name:normal=(normal*.25+Vector((0,-.35,1.2))).normalized()
   elif 'fringe' in name:normal=Vector((1 if start.x>0 else -1,-.10,.12)).normalized()
   elif 'chest' in name:normal=Vector((0,-.8,.5)).normalized()
   custom.extend([normal]*5)
   if 'whisker' in name:
    kk=len(verts);verts.extend([p-normal*.000015 for p in vs]);weights.extend([skin]*5);custom.extend([-normal]*5)
    rev=[tuple(reversed(f)) for f in localfaces];faces.extend([tuple(kk+i for i in f) for f in rev]);uvs.extend([uvlist[i] for f in rev for i in f])
  me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(body.data.materials[0]);uv=me.uv_layers.new(name='UVMap')
  for i,v in enumerate(uvs):uv.data[i].uv=v
  for i,ws in enumerate(weights):
   for bone,w in ws:
    vg=o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone);vg.add([i],w,'REPLACE')
  mod=o.modifiers.new('Luceras skin','ARMATURE');mod.object=rig;o.parent=rig
  for p in me.polygons:p.use_smooth=True
  me.normals_split_custom_set_from_vertices(custom)
  records.append({'object':name,'cards':len(cards),'triangles':len(cards)*(6 if 'whisker' in name else 3),'two_sided_geometry':'whisker' in name})
  return o
 # Three curved cutout sheets, not a stack of overlapping feather-like blades.
 verts=[];faces=[];uvs=[];normals=[]
 base=Vector((-.0004,.696,.350));growth=Vector((0,-.055,.375))
 for angle in (0,math.pi/2):
  across=Vector((math.sin(angle),math.cos(angle),0));outward=across.cross(growth).normalized()
  for tile in rects['plume_tiles']:
   col,row,rect=tile['col'],tile['row'],tile['rect'];k=len(verts)
   tileuv=[]
   for du,dv in [(0,0),(1,0),(1,1),(0,1)]:
    u=(col+du)/4;v=(row+dv)/8;bulge=.006*math.sin(math.pi*u)*math.sin(math.pi*v)
    verts.append(base+growth*v+across*((u-.5)*.205)+outward*bulge)
    normals.append(outward)
    tileuv.append(uvrect(rect,du,dv))
   faces.extend([(k,k+1,k+2),(k,k+2,k+3)]);uvs.extend([tileuv[i] for i in (0,1,2,0,2,3)])
   kk=len(verts);verts.extend([p-outward*.0003 for p in verts[k:k+4]]);normals.extend([-outward]*4)
   faces.extend([(kk+2,kk+1,kk),(kk+3,kk+2,kk)]);uvs.extend([tileuv[i] for i in (2,1,0,3,2,0)])
 me=bpy.data.meshes.new('surface_tail_plume');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('surface_tail_plume',me);bpy.context.collection.objects.link(o);me.materials.append(body.data.materials[0]);uv=me.uv_layers.new(name='UVMap')
 for i,value in enumerate(uvs):uv.data[i].uv=value
 vg=o.vertex_groups.new(name='tail_06');vg.add(list(range(len(verts))),1,'REPLACE');mod=o.modifiers.new('Luceras skin','ARMATURE');mod.object=rig;o.parent=rig
 for p in me.polygons:p.use_smooth=True
 me.normals_split_custom_set_from_vertices(normals)
 records.append({'object':'surface_tail_plume','cards':2,'atlas_tiles_per_sheet':len(rects['plume_tiles']),'triangles':len(faces),'maximum_sheet_overlap':2,'two_sided_geometry':True})
 # Surface-rooted hind fringe follows the existing leg silhouette and skin weights.
 for sign,label in [(1,'l'),(-1,'r')]:
  cards=[]
  for j in range(20):
   z=.075+j*.0142
   hit=tree.ray_cast(Vector((sign*.30,.50,z)),Vector((-sign*.6,-.8,0)).normalized())
   if hit[0] is None:hit=tree.find_nearest(Vector((sign*.11,.25,z)))
   start=hit[0]-hit[1]*.001
   length=(.023+.015*math.sin(j/20*math.pi))*float(rng.uniform(.8,1.15));end=start+Vector((sign*.006,.018,-length))
   cards.append((start,end,.012*float(rng.uniform(.8,1.2)),Vector((0,.85,.45)),'tuft',skin_at(start)))
  cards_object('surface_hind_fringe_'+label,cards)
 cards=[]
 for j in range(20):
  x=(1 if j%2 else -1)*(.020+(j%3)*.006);z=.325+(j//2)*.013
  hit=tree.find_nearest(Vector((x,-.15,z)));start=hit[0]-hit[1]*.001;end=start+Vector((x*.12,-.007,-.022))
  cards.append((start,end,.010,(1,0,0),'pale',skin_at(start)))
 cards_object('surface_chest_ruff',cards)
 for sign,label in [(1,'l'),(-1,'r')]:
  cards=[]
  for j in range(7):
   start=Vector((sign*(.018+(j%3)*.003),-.292+(j%3)*.004,.497+(j//3)*.005))
   end=start+Vector((sign*(.092+.016*math.sin(j)), -.018-.010*j,(j-3)*.010))
   cards.append((start,end,.0016,(0,0,1),'whisker',[('head_01',1)]))
  cards_object('surface_whiskers_'+label,cards)
 bm.free();write('cards.json',records)
def measure(meshes,rig):
 counts={};influences=[];unweighted=0;sums=[];topology={}
 for o in meshes:
  o.data.calc_loop_triangles();counts[o.name]=len(o.data.loop_triangles)
  bm=bmesh.new();bm.from_mesh(o.data);topology[o.name]={'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'zero_area_faces':sum(f.calc_area()<1e-12 for f in bm.faces),'boundary_expected':o.name.startswith('surface_')};bm.free()
  for v in o.data.vertices:
   ws=[g.weight for g in v.groups if g.weight>1e-7];influences.append(len(ws));unweighted+=not bool(ws);sums.append(sum(ws))
 write('measurements.json',{'triangles_per_object':counts,'triangles_total':sum(counts.values()),'triangle_limit':12000,'joints':len(rig.data.bones),'materials':list(set(m.name for o in meshes for m in o.data.materials)),'material_limit':2,'max_influences':max(influences),'influence_limit':4,'unweighted_vertices':unweighted,'weight_sum_range':[min(sums),max(sums)],'texture_sizes':{'basecolor':[1024,1024],'normal':[1024,1024],'orm':[1024,1024],'authored':[2048,2048]},'cards':json.loads((OUT/'cards.json').read_text()),'body_decimation':False,'topology':topology})
def setup_proof(meshes):
 lookdev.setup_scene('CYCLES');scene=bpy.context.scene;scene.cycles.samples=24;scene.cycles.transparent_max_bounces=64
 bounds=lookdev.world_bounds(meshes);cams={}
 for key,az,el in [('side',90,0),('three_quarter',45,12),('front',0,4),('sprite',90,0)]:cams[key]=lookdev.place_camera('lookdev_'+key,bounds,az,el,.055)
 for key,lo,hi,az,el in [('head',(-.21,-.335,.43),(.21,.0,.76),35,7),('hind_leg',(-.04,.015,.0),(.20,.33,.41),70,5),('tail_plume',(-.12,.56,.27),(.12,.83,.75),80,0)]:cams[key]=lookdev.place_camera('lookdev_'+key,(Vector(lo),Vector(hi)),az,el,.06)
 write('cameras.json',{k:{'position':list(c.location),'quaternion':list(c.rotation_euler.to_quaternion()),'ortho_scale':c.data.ortho_scale,'shift':[c.data.shift_x,c.data.shift_y]} for k,c in cams.items()})
def render_views(views,preview=False):
 scene=bpy.context.scene;scene.cycles.samples=12 if preview else 32;scene.cycles.transparent_max_bounces=64
 for key in views:
  lookdev.render(bpy.data.objects['lookdev_'+key],OUT/((f'iter{ITER}_' if preview else 'lookdev_')+key+'.png'),512 if preview else (192 if key=='sprite' else 1024))
if __name__=='__main__':
 if '--render' in sys.argv:
  bpy.ops.wm.open_mainfile(filepath=str(OUT/'surface.blend'));render_views(['side','three_quarter','front','head','hind_leg','tail_plume','sprite'])
 else:
  author()
  control=OUT/'session_control.json'
  if control.exists():
   import runpy
   seen=0
   print('SURFACE_SESSION_READY',flush=True)
   while time.time()<json.loads(control.read_text()).get('expires',0):
    command=json.loads(control.read_text())
    if command.get('seq',0)>seen:
     seen=command['seq'];action=command.get('action')
     if action=='finish':break
     if action=='build':
      os.environ['SURFACE_ITER']=str(command['iteration'])
      namespace=runpy.run_path(str(HERE/'build_surface.py'),run_name='surface_session')
      namespace['author']()
     elif action=='render':
      bpy.ops.wm.open_mainfile(filepath=str(OUT/'surface.blend'))
      render_views(['side','three_quarter','front','head','hind_leg','tail_plume','sprite'])
     print('SURFACE_SESSION_READY',seen,flush=True)
    time.sleep(1)

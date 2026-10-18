"""B-gwvn: deterministic, surface-bound hair curves without sculpt topology edits.

Run in Blender 5.2.2 through the slot wrapper. --input accepts an identically
topologized rigged sculpt. All bindings use original vertex indices, triangle
barycentrics and a normal offset. No UV unwrap is required. Geometry Nodes samples
the evaluated surface and reconstructs each strand in the deformed triangle frame.
"""
import bpy, numpy as np, json, math, sys, time, hashlib, argparse, resource
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

HERE=Path(__file__).resolve().parent
BASE=Path('/mnt/c/dev/art-data/pipeline/codex-stream')
OUT=BASE/'luceras-groom/pass1'
SOURCE=BASE/'luceras-merge/revert-forelegs/luceras_sculpt.blend'
SURFACE=BASE/'luceras-surface/pass3'
ap=argparse.ArgumentParser();ap.add_argument('--input',default=str(SOURCE));ap.add_argument('--parameters',default=str(HERE/'parameters.json'));ap.add_argument('--out',default=str(OUT));ap.add_argument('--mode',default='build');ap.add_argument('--views',default='side,head');ap.add_argument('--iteration',default='1');args=ap.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=Path(args.out);OUT.mkdir(parents=True,exist_ok=True);P=json.loads(Path(args.parameters).read_text());rng=np.random.default_rng(P['seed'])
def write(n,d): (OUT/n).write_text(json.dumps(d,indent=2))
def unit(a): return a/np.maximum(np.linalg.norm(a,axis=-1,keepdims=True),1e-12)
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
def array(items,key,dim=3,dtype=np.float32):
 a=np.empty(len(items)*dim,dtype=dtype);items.foreach_get(key,a);return a.reshape(-1,dim) if dim>1 else a
def attr(data,name,values,typ='FLOAT',domain='POINT'):
 a=data.attributes.get(name) or data.attributes.new(name,typ,domain)
 key='vector' if typ=='FLOAT_VECTOR' else 'color' if typ=='FLOAT_COLOR' else 'value'
 a.data.foreach_set(key,np.asarray(values).ravel());return a
def signature(o):
 m=o.data;co=array(m.vertices,'co');vi=array(m.loops,'vertex_index',1,np.int32);starts=array(m.polygons,'loop_start',1,np.int32);sizes=array(m.polygons,'loop_total',1,np.int32)
 return {'vertices':len(m.vertices),'faces':len(m.polygons),'co_sha256':hashlib.sha256(co.tobytes()).hexdigest(),'topology_sha256':hashlib.sha256(vi.tobytes()+starts.tobytes()+sizes.tobytes()).hexdigest()}
def material(name,color,rough=.7):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;return m,b
def assign(o,m):
 o.data.materials.clear();o.data.materials.append(m)
 for f in o.data.polygons:f.material_index=0;f.use_smooth=True

def transfer(body):
 # Append only the original low-poly body. Hair cards are never sampled.
 with bpy.data.libraries.load(str(SURFACE/'surface.blend'),link=False) as (a,b):
  names=[n for n in a.objects if n.startswith('game_') and ('body' in n.lower() or 'luceras' in n.lower())]
  if not names: names=[n for n in a.objects if n=='luceras_body']
  print('TRANSFER candidates',names,flush=True);b.objects=names
 src=max([o for o in b.objects if o and o.type=='MESH'],key=lambda o:len(o.data.vertices))
 m=src.data;m.calc_loop_triangles();co=np.array([src.matrix_world@v.co for v in m.vertices]);tris=np.array([t.vertices for t in m.loop_triangles]);loops=np.array([t.loops for t in m.loop_triangles]);uv=array(m.uv_layers.active.data,'uv',2)
 adjacency=[[] for _ in co]
 for edge in m.edges:
  i,j=edge.vertices;adjacency[i].append(j);adjacency[j].append(i)
 unseen=set(range(len(co)));components=[]
 while unseen:
  seed=unseen.pop();todo=[seed];component=[seed]
  while todo:
   for j in adjacency[todo.pop()]:
    if j in unseen:unseen.remove(j);todo.append(j);component.append(j)
  components.append(component)
 body_ids=set(max(components,key=len));take=np.array([int(t[0]) in body_ids for t in tris]);tris=tris[take];loops=loops[take]
 tree=BVHTree.FromPolygons(co.tolist(),tris.tolist(),all_triangles=True)
 im=bpy.data.images.load(str(SURFACE/'basecolor_2048.png'),check_existing=False);im.colorspace_settings.name='Non-Color';pixels=np.array(im.pixels[:],np.float32).reshape(im.size[1],im.size[0],4)
 dst=np.array([body.matrix_world@v.co for v in body.data.vertices]);uvw=np.empty((len(dst),2));dist=np.empty(len(dst))
 for i,p in enumerate(dst):
  q,n,ti,d=tree.find_nearest(Vector(p));a,bb,c=co[tris[ti]];e=bb-a;f=c-a;v=np.array(q)-a;d00=e@e;d01=e@f;d11=f@f;den=max(d00*d11-d01*d01,1e-20);u=(d11*(v@e)-d01*(v@f))/den;w=(d00*(v@f)-d01*(v@e))/den
  bary=np.clip([1-u-w,u,w],0,1);bary/=sum(bary);uvw[i]=bary@uv[loops[ti]];dist[i]=d
 x=np.clip(uvw[:,0]*im.size[0]-.5,0,im.size[0]-1.001);y=np.clip(uvw[:,1]*im.size[1]-.5,0,im.size[1]-1.001);ix=x.astype(int);iy=y.astype(int);fx=(x-ix)[:,None];fy=(y-iy)[:,None]
 raw=(pixels[iy,ix]*(1-fx)+pixels[iy,ix+1]*fx)*(1-fy)+(pixels[iy+1,ix]*(1-fx)+pixels[iy+1,ix+1]*fx)*fy
 linear=np.where(raw[:,:3]<=.04045,raw[:,:3]/12.92,((raw[:,:3]+.055)/1.055)**2.4)
 attr(body.data,'coat_color',np.c_[linear,np.ones(len(linear))],'FLOAT_COLOR')
 write('pattern_transfer.json',{'source':'pass3/basecolor_2048.png','sha256':hashlib.sha256((SURFACE/'basecolor_2048.png').read_bytes()).hexdigest(),'source_object':src.name,'source_body_component_vertices':len(body_ids),'method':'Largest connected game-body component only, excluding horns and claws. Nearest triangle in world space, barycentric UV interpolation, bilinear basecolor sampling, explicit sRGB to linear conversion, stored at sculpt vertices. No pattern repaint.','max_projection_distance_m':float(dist.max()),'mean_projection_distance_m':float(dist.mean()),'uv_added':False,'attachment':'Stable original triangle vertex indices and barycentric frame, no UV required.'})
 bpy.data.objects.remove(src,do_unlink=True);bpy.data.images.remove(im)
 return linear

def zones(co,n,col,eyes):
 x,y,z=co.T;ax=abs(x);L=P['lengths'];length=np.full(len(co),L['body']);flow=np.tile([0.,1.,-.1],(len(co),1));lift=np.full(len(co),.55);density=np.ones(len(co));zone=np.zeros(len(co),np.int32)
 neck=(y<-.07)&(z>.40);head=(y<-.15)&(z>.49);legs=z<.32;hind=legs&(y>.04)&(z>.045);toe=z<.038;ear=(z>.585)&(ax>.038)&(y<-.12);shaft=y>.34;plume=(y>.59)&(z>.245)
 length[neck]=L['neck'];zone[neck]=1;flow[neck]=[0,.25,-1]
 length[head]=L['head'];zone[head]=2;flow[head]=[0,.5,-.55];lift[head]=.32
 length[legs]=L['leg'];zone[legs]=3;flow[legs]=[0,.1,-1]
 pale=col.mean(1)>.40
 bib=(y<-.07)&(z>.27)&(z<.475)&pale;belly=(y>-.08)&(y<.29)&(z>.27)&(z<.44)&pale
 length[bib]=L['bib'];zone[bib]=4;flow[bib]=[0,.05,-1];lift[bib]=.65
 length[belly]=L['belly'];zone[belly]=5;flow[belly]=[0,.65,-.9];lift[belly]=.6
 feather=hind&(n[:,1]>-.15);length[feather]=L['hind'];zone[feather]=6;flow[feather]=[0,.35,-1];lift[feather]=.65
 length[toe]=L['toes'];zone[toe]=7;flow[toe]=[0,-1,-.1];lift[toe]=.25
 length[ear]=L['ear'];zone[ear]=8;flow[ear]=np.c_[np.sign(x[ear])*.6,np.zeros(ear.sum()),np.ones(ear.sum())];lift[ear]=.25
 length[shaft]=L['shaft'];zone[shaft]=9;flow[shaft]=[0,1,.15];lift[shaft]=.4
 # Long narrow tufts fan upward from the ascending terminal tail shaft.
 length[plume]=(.065+.285*np.clip((y[plume]-.59)/.108,0,1))*L['plume']/.30;zone[plume]=10;flow[plume]=[0,.25,1];lift[plume]=.3;density[plume]=40+80*smooth(.65,.695,y[plume])
 # Keep the underside, bare nose, eye rims and toe soles clean.
 nose=(y<-.298)&(z>.493)&(z<.528)&(ax<.021)
 density[nose]=0;density[z<.004]=0
 for center,radius in eyes:
  d=np.linalg.norm(co-center,axis=1);density*=smooth(radius+.0008,radius+.005,d)
 density[head]*=1.7;density[toe]*=1.3;density[ear]*=1.5
 return length,unit(flow),lift,density,zone

def sample_roots(co,n,tris,count,density):
 tc=co[tris];areas=np.linalg.norm(np.cross(tc[:,1]-tc[:,0],tc[:,2]-tc[:,0]),axis=1)*.5
 weights=areas*density[tris].mean(1);weights/=sum(weights);ti=rng.choice(len(tris),count,p=weights);r=rng.random((count,2));s=np.sqrt(r[:,0]);bar=np.c_[1-s,s*(1-r[:,1]),s*r[:,1]];ids=tris[ti];root=np.einsum('ij,ijk->ik',bar,co[ids]);norm=unit(np.einsum('ij,ijk->ik',bar,n[ids]));return ti,ids,bar,root,norm

def bind_tree(body):
 t=bpy.data.node_groups.new('Luceras surface frame deformation','GeometryNodeTree');t.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');t.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry');ns=t.nodes;lk=t.links
 def node(typ):return ns.new(typ)
 def named(name,typ='FLOAT'):
  n=node('GeometryNodeInputNamedAttribute');n.data_type=typ;n.inputs['Name'].default_value=name;return n.outputs['Attribute']
 def vm(op,a,b=None):
  n=node('ShaderNodeVectorMath');n.operation=op;lk.new(a,n.inputs[0]);
  if b is not None:lk.new(b,n.inputs['Scale'] if op=='SCALE' else n.inputs[1])
  return n.outputs['Vector']
 info=node('GeometryNodeObjectInfo');info.transform_space='ORIGINAL';info.inputs['Object'].default_value=body;pos=node('GeometryNodeInputPosition');v=[]
 for suffix in ('a','b','c'):
  s=node('GeometryNodeSampleIndex');s.data_type='FLOAT_VECTOR';s.domain='POINT';lk.new(info.outputs['Geometry'],s.inputs['Geometry']);lk.new(pos.outputs['Position'],s.inputs['Value']);lk.new(named('bind_i'+suffix,'INT'),s.inputs['Index']);v.append(s.outputs['Value'])
 normal=vm('NORMALIZE',vm('CROSS_PRODUCT',vm('SUBTRACT',v[1],v[0]),vm('SUBTRACT',v[2],v[0])))
 tangent=vm('NORMALIZE',vm('SUBTRACT',v[1],v[0]));bitangent=vm('CROSS_PRODUCT',normal,tangent)
 total=vm('ADD',vm('ADD',vm('SCALE',v[0],named('bind_a')),vm('SCALE',v[1],named('bind_b'))),vm('SCALE',v[2],named('bind_c')));total=vm('ADD',total,vm('SCALE',normal,named('bind_height')));total=vm('ADD',total,vm('SCALE',tangent,named('bind_offset_x')));total=vm('ADD',total,vm('SCALE',bitangent,named('bind_offset_y')))
 gin=node('NodeGroupInput');gout=node('NodeGroupOutput');sp=node('GeometryNodeSetPosition');lk.new(gin.outputs['Geometry'],sp.inputs['Geometry']);lk.new(total,sp.inputs['Position']);lk.new(sp.outputs['Geometry'],gout.inputs['Geometry']);return t

def make_curves(name,coords,ids,co,colors,mat,body,tree,radii=None):
 count,pts,_=coords.shape;data=bpy.data.hair_curves.new(name);data.add_curves([pts]*count);data.attributes['position'].data.foreach_set('vector',coords.astype(np.float32).ravel())
 o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o);o.parent=body;o.matrix_parent_inverse=body.matrix_world.inverted();o.matrix_world=body.matrix_world.copy();data.surface=body
 data.materials.append(mat)
 # Root barycentrics follow translation; orthonormal offsets follow rotation.
 # Do not extrapolate distant hair tips with skin triangle scale or shear.
 tri=co[ids];a=tri[:,0];e=tri[:,1]-a;f=tri[:,2]-a;normal=unit(np.cross(e,f));tangent=unit(e);bitangent=np.cross(normal,tangent);rootrel=coords[:,0]-a;rel=coords-coords[:,0:1];d00=(e*e).sum(1);d01=(e*f).sum(1);d11=(f*f).sum(1);den=np.maximum(d00*d11-d01*d01,1e-24);de=(rootrel*e).sum(1);df=(rootrel*f).sum(1);bb=(d11*de-d01*df)/den;cc=(d00*df-d01*de)/den;height=(rel*normal[:,None,:]).sum(2)
 for j,s in enumerate('abc'):attr(data,'bind_i'+s,ids[:,j],'INT','CURVE')
 for s,values in [('a',1-bb-cc),('b',bb),('c',cc)]:attr(data,'bind_'+s,values,'FLOAT','CURVE')
 for s,values in [('height',height),('offset_x',(rel*tangent[:,None,:]).sum(2)),('offset_y',(rel*bitangent[:,None,:]).sum(2))]:attr(data,'bind_'+s,values.ravel())
 attr(data,'coat_color',np.c_[colors,np.ones(count)],'FLOAT_COLOR','CURVE')
 r=np.linspace(1,.025,pts)**.8
 if radii is None:radii=np.full(count,P['root_radius'])
 attr(data,'radius',(radii[:,None]*r[None,:]).ravel())
 mod=o.modifiers.new('Follow evaluated sculpt surface','NODES');mod.node_group=tree
 return o

def hair_material(pale):
 m=bpy.data.materials.new('Luceras Chiang storm coat');m.use_nodes=True;t=m.node_tree;t.nodes.clear();out=t.nodes.new('ShaderNodeOutputMaterial');h=t.nodes.new('ShaderNodeBsdfHairPrincipled');h.model='CHIANG';h.parametrization='COLOR';h.inputs['Roughness'].default_value=.58;h.inputs['Radial Roughness'].default_value=.65;h.inputs['Coat'].default_value=0
 at=t.nodes.new('ShaderNodeAttribute');at.attribute_name='coat_color';white=t.nodes.new('ShaderNodeAttribute');white.attribute_name='plume_white';info=t.nodes.new('ShaderNodeHairInfo');ramp=t.nodes.new('ShaderNodeMapRange');ramp.inputs['From Min'].default_value=.08;ramp.inputs['From Max'].default_value=.65;t.links.new(info.outputs['Intercept'],ramp.inputs['Value']);factor=t.nodes.new('ShaderNodeMath');factor.operation='MULTIPLY';t.links.new(white.outputs['Fac'],factor.inputs[0]);t.links.new(ramp.outputs['Result'],factor.inputs[1]);tip=t.nodes.new('ShaderNodeMixRGB');t.links.new(factor.outputs[0],tip.inputs[0]);tone=t.nodes.new('ShaderNodeAttribute');tone.attribute_name='plume_tone';dark=t.nodes.new('ShaderNodeMixRGB');dark.blend_type='MULTIPLY';dark.inputs[0].default_value=1;t.links.new(at.outputs['Color'],dark.inputs[1]);t.links.new(tone.outputs['Fac'],dark.inputs[2]);t.links.new(dark.outputs[0],tip.inputs[1]);tip.inputs[2].default_value=(*pale,1);mix=t.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(P['hair_color_scale'],)*3+(1,);bw=t.nodes.new('ShaderNodeRGBToBW');t.links.new(tip.outputs[0],bw.inputs[0]);response=t.nodes.new('ShaderNodeMapRange');response.inputs['From Min'].default_value=.08;response.inputs['From Max'].default_value=.55;response.inputs['To Min'].default_value=P.get('hair_dark_scale',P['hair_color_scale']);response.inputs['To Max'].default_value=P['hair_color_scale'];t.links.new(bw.outputs[0],response.inputs['Value']);t.links.new(response.outputs['Result'],mix.inputs[2]);t.links.new(tip.outputs[0],mix.inputs[1]);t.links.new(mix.outputs[0],h.inputs['Color']);t.links.new(h.outputs[0],out.inputs[0]);return m

def groom(body,col,eyes):
 m=body.data;co=array(m.vertices,'co');n=array(m.vertices,'normal');m.calc_loop_triangles();tris=np.array([t.vertices for t in m.loop_triangles],np.int32)
 le,flow,lift,dens,zone=zones(co,n,col,eyes)
 edges=array(m.edges,'vertices',2,np.int32);ea,eb=edges.T;degree=np.bincount(ea,minlength=len(co))+np.bincount(eb,minlength=len(co))+1
 for _ in range(6):
  le=(le+np.bincount(ea,weights=le[eb],minlength=len(co))+np.bincount(eb,weights=le[ea],minlength=len(co)))/degree
 le[zone==9]=np.minimum(le[zone==9],P['lengths']['shaft']*1.4)
 for name,val in [('fur_length',le),('fur_density',dens),('fur_clump',np.where(zone==10,.97,P['clump'])),('fur_frizz',np.where((zone==2)|(zone==10),.012,P['frizz']))]:attr(m,name,val)
 attr(m,'fur_comb',flow,'FLOAT_VECTOR');attr(m,'fur_region',zone,'INT');tree=bind_tree(body);mat=hair_material(np.median(col[col.mean(1)>.60],axis=0));N=P['points'];t=np.linspace(0,1,N)[None,:,None]
 def root_data(count,is_guide=False):
  dd=dens.copy()
  if is_guide:dd[zone==10]*=.20
  ti,ids,bar,root,norm=sample_roots(co,n,tris,count,dd);ln=(le[ids]*bar).sum(1);ff=unit(np.einsum('ij,ijk->ik',bar,flow[ids]));ll=(lift[ids]*bar).sum(1);cc=np.einsum('ij,ijk->ik',bar,col[ids]);zz=zone[ids[np.arange(len(ids)),bar.argmax(1)]]
  return ids,bar,root,norm,ln,ff,ll,cc,zz
 gi,gb,gr,gn,gl,gf,gv,gc,gz=root_data(P['guides'],True);gbase=gl.copy();gt=unit(gf-gn*(gf*gn).sum(1)[:,None]);gd=unit(gt*(1-gv[:,None])+gn*gv[:,None]);gl*=rng.uniform(.68,1.38,len(gl));gdelta=gd[:,None,:]*gl[:,None,None]*t
 gdelta+=gt[:,None,:]*gl[:,None,None]*t*t*.25
 gdelta[:,:,2]-=gl[:,None]*(t[0,:,0]**2)*.12
 plume=gz==10
 # Plume guides point up and fan in width, retaining a three-dimensional volume.
 if plume.any():
  u=np.clip((gr[plume,1]-.59)/.108,0,1);shape=np.sin(np.pi*u)**.65;fan=rng.choice([-1.,1.],plume.sum())*rng.uniform(.45,1,plume.sum());end=np.c_[rng.uniform(-1,1,plume.sum())*.055*shape,fan*(.018+.108*shape)+.015*u,.065+.285*u];end*=rng.uniform(.60,1.07,plume.sum())[:,None]*P['lengths']['plume']/.30;control=np.c_[end[:,0]*.15,np.full(plume.sum(),.012),end[:,2]*.62];branch=smooth(.45,1,t);gdelta[plume]=np.concatenate([end[:,None,:2]*branch,np.broadcast_to(end[:,None,2:3]*t,(len(end),N,1))],axis=2)+gn[plume,None,:]*.001*np.sin(np.pi*t)
  spine=rng.uniform(-1,1,(plume.sum(),3))*np.array([.025,.022,.005]);gdelta[plume]+=spine[:,None,:]*np.sin(np.pi*t)
  short=rng.random(plume.sum())<.28;pi=np.where(plume)[0][short];sd=unit(gn[pi]*.8+np.array([0,0,1.2]));gdelta[pi]=sd[:,None,:]*rng.uniform(.025,.065,(len(pi),1,1))*t
 gcoords=gr[:,None,:]+gdelta
 guide=make_curves('Luceras guides',gcoords,gi,co,gc,mat,body,tree);guide.hide_render=True;guide.hide_set(True)
 ci,cb,cr,cn,cl,cf,cv,cc,cz=root_data(P['children'])
 # Interpolate offsets from the three nearest guides within the same region.
 trees={}
 for z in np.unique(gz):
  inds=np.where(gz==z)[0];kd=KDTree(len(inds))
  for j in inds:kd.insert(gr[j],int(j))
  kd.balance();trees[int(z)]=kd
 nearest=np.empty((len(cr),3),np.int32);distance=np.empty((len(cr),3))
 for i,(r,z) in enumerate(zip(cr,cz)):
  hits=trees[int(z)].find_n(r,3)
  while len(hits)<3:hits.append(hits[-1])
  nearest[i]=[h[1] for h in hits];distance[i]=[h[2] for h in hits]
 weights=1/np.maximum(distance,.0003)**2;weights/=weights.sum(1)[:,None];delta=np.einsum('ij,ijkl->ikl',weights,gdelta[nearest]);clump=(array(m.attributes['fur_clump'].data,'value',1)[ci]*cb).sum(1)
 # Smooth interpolation plus local normal correction prevents crossed strands.
 targetn=unit(np.einsum('ij,ijk->ik',weights,gn[nearest]));dh=(delta*targetn[:,None,:]).sum(2);delta+= (cn-targetn)[:,None,:]*dh[:,:,None]
 delta*= (cl/np.maximum((weights*gbase[nearest]).sum(1),1e-6))[:,None,None]
 spread=gr[nearest[:,0]]-cr;spread-=cn*(spread*cn).sum(1)[:,None];spread*=np.minimum(1,np.minimum(.018,cl*.65)/np.maximum(np.linalg.norm(spread,axis=1),1e-9))[:,None]
 delta*=rng.uniform(.88,1.12,len(cr))[:,None,None]
 target=gdelta[nearest[:,0]]+spread[:,None,:];weight=t*t*clump[:,None,None];delta=delta*(1-weight)+target*weight
 plume_child=cz==10;delta[plume_child]=gdelta[nearest[plume_child,0]]+spread[plume_child,None,:]*t*t*.97
 # A volumetric lock is broad through its middle and tapers to a pointed tip.
 # The roots remain on the thin shaft; the width comes entirely from hair.
 u=np.clip((cr[plume_child,1]-.59)/.108,0,1);axis=unit(gdelta[nearest[plume_child,0],-1]);radial=rng.normal(size=(plume_child.sum(),3));radial=unit(radial-axis*(radial*axis).sum(1)[:,None]);width=(.005+.007*(1-u))*np.sqrt(rng.random(plume_child.sum()));delta[plume_child]+=radial[:,None,:]*width[:,None,None]*np.sin(np.pi*smooth(.40,1,t))**.8+radial[:,None,:]*.0008*t*t
 delta[plume_child]*=rng.uniform(.94,1.015,plume_child.sum())[:,None,None]
 frizz_amount=(array(m.attributes['fur_frizz'].data,'value',1)[ci]*cb).sum(1);frizz_amount[plume_child]=.055;phase=rng.uniform(0,6.28,(len(cr),1,3));frizz=np.sin(t*9+phase)*t*(1-t)*cl[:,None,None]*frizz_amount[:,None,None];delta+=frizz
 # Lift every non-root point outside its root tangent plane.
 hn=(delta*cn[:,None,:]).sum(2);minimum=cl[:,None]*t[0,:,0]*.10;correction=np.maximum(minimum-hn,0);correction[cz==10]=0;delta+=cn[:,None,:]*correction[:,:,None]
 distal_shaft=(cz==9)&(cr[:,1]>.55);delta[distal_shaft,:,2]=np.maximum(delta[distal_shaft,:,2],.002*t[0,:,0])
 delta[cz==10,:,2]=np.maximum(delta[cz==10,:,2],.012*t[0,:,0])
 coords=cr[:,None,:]+delta
 keep=np.ones(len(cr),bool)
 for center,radius in eyes:
  keep &= np.linalg.norm(coords-center[None,None,:],axis=2).min(1)>radius+.0008
 bare_nose=(coords[:,:,1]<-.300)&(coords[:,:,2]>.493)&(coords[:,:,2]<.528)&(abs(coords[:,:,0])<.020)
 keep &= ~bare_nose.any(1)
 culled=int((~keep).sum());ci,cb,cr,cn,cc,cz,coords,nearest=[v[keep] for v in (ci,cb,cr,cn,cc,cz,coords,nearest)]
 # Tail root color is transferred from the shaft; white terminal/underside locks
 # inherit the white sample of the approved atlas, with a per-strand tip gradient.
 plume=cz==10
 child=make_curves('Luceras interpolated coat',coords,ci,co,cc,mat,body,tree,np.where(cz==2,P['root_radius']*.65,P['root_radius']))
 attr(child.data,'plume_tone',np.where(plume,P.get('plume_dark_tone',.50),1.0),'FLOAT','CURVE')
 white_group=np.zeros(len(cr));white_group[plume]=((cr[plume,1]<.650)&(gdelta[nearest[plume,0],-1,1]<.015)).astype(float)*.95;attr(child.data,'plume_white',white_group,'FLOAT','CURVE')
 # Sparse white whiskers with surface-projected roots on each muzzle side.
 bv=BVHTree.FromPolygons(co.tolist(),tris.tolist(),all_triangles=True);wr=[];wi=[]
 for sign in (-1,1):
  for j in range(6):
   target=Vector((sign*(.019+j*.0005),-.284+(j%3)*.004,.508+(j//3)*.005));q,no,idx,dist=bv.find_nearest(target);q=np.array(q);end=np.array([sign*(.065+j*.006),-.020-j*.003,.018-j*.008]);curve=q[None,:]+t[0]*end[None,:];curve[:,2]-=t[0,:,0]**2*.01;wr.append(curve);wi.append(tris[idx])
 whiskmat=mat.copy();whiskmat.name='White Chiang whiskers';wh=next(n for n in whiskmat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfHairPrincipled')
 for link in list(wh.inputs['Color'].links):whiskmat.node_tree.links.remove(link)
 wh.inputs['Color'].default_value=(.80,.80,.80,1)
 whisk=make_curves('Luceras white whiskers',np.array(wr),np.array(wi),co,np.tile([.8,.8,.8],(12,1)),whiskmat,body,tree,np.full(12,.00030))
 write('groom_statistics.json',{'guides':len(gr),'children':len(cr),'whiskers':12,'rendered_strands':len(cr)+12,'culled_for_eye_or_nose_clearance':culled,'points_per_strand':N,'interpolation':'Three nearest same-region guides, inverse-square distance weights, normal correction, nearest-guide clumping and continuous strand frizz. Children are baked as editable hair curves.','attachment':'Geometry Nodes root barycentrics plus orthonormal triangle frames. Strand offsets rotate without skin scale or shear. Every root follows evaluated body vertices. Equivalent to Deform Curves on Surface without a UV map.','region_guide_counts':{str(z):int(sum(gz==z)) for z in np.unique(gz)},'region_child_counts':{str(z):int(sum(cz==z)) for z in np.unique(cz)},'left_children':int(sum(cr[:,0]>0)),'right_children':int(sum(cr[:,0]<0)),'nonfinite_points':int((~np.isfinite(coords)).sum()),'eye_clearance_min_m':min(float(np.linalg.norm(coords-c[None,None,:],axis=2).min()-r) for c,r in eyes),'root_colors_min_linear':cc.min(0).tolist(),'root_colors_max_linear':cc.max(0).tolist()})
 return [guide,child,whisk]

def eye_mat(o):
 m,b=material('Amber horizontal goat eye '+o.name,(.32,.14,.025),.18);t=m.node_tree;ns=t.nodes;lk=t.links;tex=ns.new('ShaderNodeTexCoord');sep=ns.new('ShaderNodeSeparateXYZ');lk.new(tex.outputs['Generated'],sep.inputs[0])
 def mathnode(op,a,bv):
  nd=ns.new('ShaderNodeMath');nd.operation=op
  if hasattr(a,'node'):lk.new(a,nd.inputs[0])
  else:nd.inputs[0].default_value=a
  nd.inputs[1].default_value=bv;return nd.outputs[0]
 z=mathnode('ABSOLUTE',mathnode('SUBTRACT',sep.outputs['Z'],.5),0);pupil=mathnode('LESS_THAN',z,.065)
 noise=ns.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=38;noise.inputs['Detail'].default_value=2;lk.new(tex.outputs['Generated'],noise.inputs['Vector']);ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.09,.027,.006,1);ramp.color_ramp.elements[1].color=(.60,.30,.055,1);lk.new(noise.outputs['Fac'],ramp.inputs[0]);mix=ns.new('ShaderNodeMixRGB');lk.new(pupil,mix.inputs[0]);lk.new(ramp.outputs[0],mix.inputs[1]);mix.inputs[2].default_value=(.001,.0008,.0006,1);lk.new(mix.outputs[0],b.inputs['Base Color']);b.inputs['Coat Weight'].default_value=1;b.inputs['Coat Roughness'].default_value=.035;assign(o,m)

def setup_materials(body,col):
 m,b=material('Transferred storm slate skin',(.2,.2,.2),.88);at=m.node_tree.nodes.new('ShaderNodeAttribute');at.attribute_name='coat_color';scale=m.node_tree.nodes.new('ShaderNodeMixRGB');scale.blend_type='MULTIPLY';scale.inputs[0].default_value=1;scale.inputs[2].default_value=(.65,.65,.65,1);m.node_tree.links.new(at.outputs['Color'],scale.inputs[1]);m.node_tree.links.new(scale.outputs[0],b.inputs['Base Color']);assign(body,m)
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or o==body:continue
  if 'eye' in o.name.lower():
   eye_mat(o)
   cornea=o.copy();cornea.data=o.data.copy();cornea.name='groom_cornea_'+o.name;bpy.context.scene.collection.objects.link(cornea);cornea.scale*=1.006
   cm,cb=material('Clear cornea '+o.name,(1,1,1),.025);cb.inputs['Transmission Weight'].default_value=1;cb.inputs['IOR'].default_value=1.38;assign(cornea,cm)
  elif 'horn' in o.name.lower():
   m,b=material('Matte dark brown horn '+o.name,(.018,.012,.008),.60);ns=m.node_tree.nodes;lk=m.node_tree.links;geo=ns.new('ShaderNodeNewGeometry');ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.51;ramp.color_ramp.elements[0].color=(.008,.006,.004,1);ramp.color_ramp.elements[1].position=.58;ramp.color_ramp.elements[1].color=(.045,.026,.012,1);lk.new(geo.outputs['Pointiness'],ramp.inputs[0]);lk.new(ramp.outputs[0],b.inputs['Base Color']);b.inputs['Metallic'].default_value=.10;assign(o,m)
  elif 'claw' in o.name.lower():m,b=material('Quiet dark claw '+o.name,(.016,.017,.019),.62);assign(o,m)
  elif 'whisker' in o.name.lower():o.hide_render=True

def studio():
 sys.path.insert(0,'/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/roster');import lookdev
 lookdev.setup_scene('CYCLES');s=bpy.context.scene;s.cycles.device='CPU';s.cycles.use_denoising=P['denoise'];s.cycles.max_bounces=6;s.cycles.diffuse_bounces=3;s.cycles.glossy_bounces=3;s.cycles.transmission_bounces=4;s.render.threads_mode='FIXED';s.render.threads=8
 s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1
 ground=bpy.data.objects['lookdev_ground'];ground.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.45,.45,.45,1)
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.45,.45,.45,1);bg.inputs['Strength'].default_value=.5
 wn=s.world.node_tree.nodes;wl=s.world.node_tree.links;camera_bg=wn.new('ShaderNodeBackground');camera_bg.inputs['Color'].default_value=(.53,.53,.53,1);camera_bg.inputs['Strength'].default_value=1;ray=wn.new('ShaderNodeLightPath');mix=wn.new('ShaderNodeMixShader');wl.new(ray.outputs['Is Camera Ray'],mix.inputs[0]);wl.new(bg.outputs[0],mix.inputs[1]);wl.new(camera_bg.outputs[0],mix.inputs[2]);wl.new(mix.outputs[0],wn.get('World Output').inputs['Surface'])
 gm=ground.data.materials[0];gb=gm.node_tree.nodes.get('Principled BSDF');gb.inputs['Emission Color'].default_value=(.18,.18,.18,1);gray=gm.node_tree.nodes.new('ShaderNodeLightPath');gm.node_tree.links.new(gray.outputs['Is Camera Ray'],gb.inputs['Emission Strength'])
 bpy.data.objects['lookdev_key'].data.energy=110;bpy.data.objects['lookdev_fill'].data.energy=50;bpy.data.objects['lookdev_rim'].data.energy=30
 for name,x in (('lookdev_key',1.6),('lookdev_fill',-2.4)):
  lamp=bpy.data.objects[name];lamp.location.x=x;lamp.rotation_euler=(Vector((0,0,.3))-lamp.location).to_track_quat('-Z','Y').to_euler()
 coll=bpy.data.collections.new('SWAPPABLE neutral studio');s.collection.children.link(coll)
 for o in list(s.objects):
  if o.name.startswith('lookdev_'):
   for c in list(o.users_collection):c.objects.unlink(o)
   coll.objects.link(o)
 cams=json.loads((SURFACE/'cameras.json').read_text());cams['portrait']=cams['head'].copy()
 for name,d in cams.items():
  data=bpy.data.cameras.new('groom_camera_'+name);data.type='ORTHO';data.ortho_scale=d['ortho_scale'];o=bpy.data.objects.new(data.name,data);coll.objects.link(o);o.location=d['position'];o.rotation_mode='QUATERNION';o.rotation_quaternion=d['quaternion'];data.shift_x=d['shift'][0];data.shift_y=d['shift'][1]
  if name in ('side','sprite'):data.ortho_scale=1.19;o.location.y=.23
  if name=='three_quarter':data.ortho_scale=1.18
 # Save a ready-to-render neutral scene at the required sheet height.
 s.camera=bpy.data.objects['groom_camera_side'];s.render.resolution_x=1374;s.render.resolution_y=1145;s.render.resolution_percentage=100;s.cycles.samples=P['samples_final']
 return s

def render_views(views,final=False):
 s=bpy.context.scene;measure=json.loads((OUT/'measurements.json').read_text()) if (OUT/'measurements.json').exists() else {'build_id':'B-gwvn','device':'CPU','peak_gpu_memory_gb':None,'gpu_memory_note':'CPU rendering selected explicitly. No Cycles GPU allocations. Total system GPU memory was not instrumented.','denoise':P['denoise'],'frames':[]}
 stats=json.loads((OUT/'groom_statistics.json').read_text());measure.update({k:stats[k] for k in ('guides','children','whiskers','rendered_strands')})
 for view in views:
  s.camera=bpy.data.objects['groom_camera_'+view];size=(192 if view=='sprite' else 512 if view=='portrait' else P['final_size'] if final else P['preview_size']);s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100
  if view in ('side','three_quarter'):s.render.resolution_x=1374 if final else round(size*1.2);s.render.resolution_y=1145 if final else size
  s.cycles.samples=P['samples_final'] if final else P['samples_preview'];name=('render_' if final else 'iter'+args.iteration+'_')+view+'.png';s.render.filepath=str(OUT/name);t0=time.perf_counter();bpy.ops.render.render(write_still=True);elapsed=time.perf_counter()-t0
  measure['frames'].append({'file':name,'view':view,'iteration':args.iteration,'stage':'final' if final else 'preview','guides':stats['guides'],'children':stats['children'],'width':s.render.resolution_x,'height':s.render.resolution_y,'seconds':elapsed,'samples':s.cycles.samples,'samples_definition':'Configured maximum per pixel','adaptive_sampling':s.cycles.use_adaptive_sampling,'adaptive_threshold':s.cycles.adaptive_threshold,'denoise':s.cycles.use_denoising,'device':s.cycles.device,'process_peak_host_memory_gb':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024**2});write('measurements.json',measure);print('RENDERED',name,elapsed,flush=True)

def build():
 t0=time.perf_counter();bpy.ops.wm.open_mainfile(filepath=args.input);body=bpy.data.objects['luceras_blockout'];original={o.name:signature(o) for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('lookdev_')};eyes=[]
 ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
 if len(ev.vertices)!=len(body.data.vertices) or not np.array_equal(array(ev.loops,'vertex_index',1,np.int32),array(body.data.loops,'vertex_index',1,np.int32)):
  raise RuntimeError('Surface binding requires topology-preserving modifiers and original vertex indices. Disable topology-changing modifiers before applying this groom.')
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and 'eye' in o.name.lower():eyes.append((np.array(body.matrix_world.inverted()@o.matrix_world.translation),.017))
 col=transfer(body);setup_materials(body,col);curves=groom(body,col,eyes);studio();after={name:signature(bpy.data.objects[name]) for name in original};write('geometry_check.json',{'unchanged':original==after,'before':original,'after':after,'source_sha256':hashlib.sha256(Path(args.input).read_bytes()).hexdigest(),'approved_source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()});bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'groom.blend'));write('build_state.json',{'build_id':'B-gwvn','blender':bpy.app.version_string,'seconds':time.perf_counter()-t0,'iteration':args.iteration,'input':args.input});render_views(args.views.split(','))
 if P.get('proof_each_build',True):deformation_proof()

def deformation_proof():
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'));body=bpy.data.objects['luceras_blockout'];hair=bpy.data.objects['Luceras interpolated coat'];before=signature(body);rest=array(body.data.vertices,'co');dg=bpy.context.evaluated_depsgraph_get();rest_hair=array(hair.evaluated_get(dg).data.attributes['position'].data,'vector')
 arm=bpy.data.armatures.new('Temporary groom bend armature');rig=bpy.data.objects.new('Temporary groom bend armature',arm);bpy.context.scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bone=arm.edit_bones.new('test_hind_bend');bone.head=(.15,.17,.42);bone.tail=(.15,.10,.02);fixed=arm.edit_bones.new('test_stationary');fixed.head=(0,0,0);fixed.tail=(0,0,.1);bpy.ops.object.mode_set(mode='OBJECT')
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or o.name.startswith('lookdev_'):continue
  co=np.array([o.matrix_world@v.co for v in o.data.vertices]);w=smooth(.03,.08,co[:,0])*smooth(-.03,.03,co[:,1])*(1-smooth(.30,.46,co[:,2]));inds=np.where(w>0)[0]
  if not len(inds):continue
  vg=o.vertex_groups.new(name='test_hind_bend');stationary=o.vertex_groups.new(name='test_stationary')
  for i in range(len(w)):
   if w[i]>0:vg.add([i],float(w[i]),'REPLACE')
   if w[i]<1:stationary.add([i],float(1-w[i]),'REPLACE')
  mod=o.modifiers.new('Temporary 18 degree hind bend','ARMATURE');mod.object=rig
 rig.pose.bones['test_hind_bend'].rotation_mode='XYZ';rig.pose.bones['test_hind_bend'].rotation_euler.x=math.radians(-18);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();surf=array(body.evaluated_get(dg).data.vertices,'co');ev=hair.evaluated_get(dg);coords=array(ev.data.attributes['position'].data,'vector');N=P['points'];ids=np.stack([array(hair.data.attributes['bind_i'+s].data,'value',1,np.int32) for s in 'abc'],axis=1);bar=np.stack([array(hair.data.attributes['bind_'+s].data,'value',1) for s in 'abc'],axis=1);expected=np.einsum('ij,ijk->ik',bar,surf[ids]);err=np.linalg.norm(coords[::N]-expected,axis=1);move=np.linalg.norm(coords-rest_hair,axis=1);restlen=np.linalg.norm(np.diff(rest_hair.reshape(-1,N,3),axis=1),axis=2).sum(1);posedlen=np.linalg.norm(np.diff(coords.reshape(-1,N,3),axis=1),axis=2).sum(1);length_error=np.abs(posedlen-restlen)
 write('deformation_check.json',{'method':'Temporary additional armature bends the left hind leg 18 degrees with complementary stationary and moving bone weights across a broad hip blend. Root barycentrics follow the surface; orthonormal triangle frames rotate strand offsets without stretching. Existing base coordinates remain unchanged.','max_root_attachment_error_m':float(err.max()),'mean_root_attachment_error_m':float(err.mean()),'max_strand_point_motion_m':float(move.max()),'max_strand_length_change_m':float(length_error.max()),'moved_strand_points':int(sum(move>1e-5)),'sculpt_base_geometry_unchanged':before==signature(body),'passed':bool(err.max()<.00002 and length_error.max()<.00002 and move.max()>.01 and before==signature(body))})
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'deformation_proof.blend'))
 # Save the proof under its own names and retain its measured render costs.
 s=bpy.context.scene
 measure=json.loads((OUT/'measurements.json').read_text())
 for view in ('side','hind_leg'):
  s.camera=bpy.data.objects['groom_camera_'+view];s.render.resolution_x=768;s.render.resolution_y=768;s.render.resolution_percentage=100;s.cycles.samples=32;s.render.filepath=str(OUT/('deformation_'+view+'.png'));t0=time.perf_counter();bpy.ops.render.render(write_still=True);measure['frames'].append({'file':'deformation_'+view+'.png','iteration':args.iteration,'stage':'deformation','width':768,'height':768,'seconds':time.perf_counter()-t0,'samples':32,'denoise':s.cycles.use_denoising,'device':'CPU'});write('measurements.json',measure)

if args.mode=='build':build()
elif args.mode=='render':
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'));render_views(args.views.split(','),True)
elif args.mode=='deform':deformation_proof()
elif args.mode=='deliver':
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'));render_views(args.views.split(','),True);deformation_proof()
elif args.mode=='diagnose':
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'deformation_proof.blend'))
 for o in bpy.context.scene.objects:
  if o.type=='CURVES':o.hide_render=True
 s=bpy.context.scene;s.camera=bpy.data.objects['groom_camera_hind_leg'];s.render.resolution_x=768;s.render.resolution_y=768;s.render.resolution_percentage=100;s.cycles.samples=24;s.render.filepath=str(OUT/'deformation_skin_hind_leg.png');bpy.ops.render.render(write_still=True)

elif args.mode=='diagnose_tail':
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'))
 for o in bpy.context.scene.objects:
  if o.type=='CURVES':o.hide_render=True
 s=bpy.context.scene;s.camera=bpy.data.objects['groom_camera_tail_plume'];s.render.resolution_x=768;s.render.resolution_y=768;s.render.resolution_percentage=100;s.cycles.samples=24;s.render.filepath=str(OUT/'tail_skin_only.png');bpy.ops.render.render(write_still=True)

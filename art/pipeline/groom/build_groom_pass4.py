"""B-spm3: deterministic, surface-bound hair curves without sculpt topology edits.

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
OUT=BASE/'luceras-groom/pass4'
SOURCE=BASE/'luceras-merge/revert-forelegs/luceras_sculpt.blend'
SURFACE=BASE/'luceras-surface/pass3'
ap=argparse.ArgumentParser();ap.add_argument('--input',default=str(SOURCE));ap.add_argument('--parameters',default=str(HERE/('parameters_pass4.json' if (HERE/'parameters_pass4.json').exists() else 'parameters.json')));ap.add_argument('--out',default=str(OUT));ap.add_argument('--mode',default='build');ap.add_argument('--views',default='side,head');ap.add_argument('--iteration',default='1');args=ap.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
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

def refine_pattern(body,col,eyes):
 co=array(body.data.vertices,'co');n=array(body.data.vertices,'normal');x,y,z=co.T
 pale=np.median(col[col.mean(1)>.60],axis=0);dark=np.array([.065,.060,.057])
 # Preserve atlas blaze/bib/flank placement; correct only instructed leg/paw masks.
 fore=(y<-.07)&(z>.055)&(z<.30)
 front=smooth(.05,-.55,n[:,1]);inner=smooth(.04,-.65,n[:,0]*np.sign(x))
 w=fore*np.maximum(front,inner)*.93
 col=col*(1-w[:,None])+pale*w[:,None]
 paw=(1-smooth(.030,.055,z))*smooth(.002,.010,z)
 col=col*(1-paw[:,None])+dark*paw[:,None]
 for center,radius in eyes:
  d=np.linalg.norm(co-center,axis=1);rim=(1-smooth(radius+.0005,radius+.0025,d))
  col=col*(1-rim[:,None]*.97)+np.array([.023,.020,.018])*rim[:,None]*.97
 # Slate plume roots, with the continuous underside selected per guide below.
 tail=(y>.55)&(z>.15);col[tail]=dark
 nose=(y<-.298)&(z>.493)&(z<.528)&(abs(x)<.021)
 edge=smooth(.012,.021,abs(x))*nose
 col=col*(1-edge[:,None]*.5)+pale*edge[:,None]*.5
 # Surface freckles at projected whisker pads, symmetric on the two muzzle sides.
 for sign in (-1,1):
  for j in range(14):
   c=np.array([sign*(.019+(j%4)*.0009),-.287+(j%5)*.003,.505+(j//5)*.004])
   dot=1-smooth(.0006,.0015,np.linalg.norm(co-c,axis=1))
   col=col*(1-dot[:,None]*.9)+dark*dot[:,None]*.9
 head=(y<-.15)&(z>.49)&(col.mean(1)<.35)
 col[head]*=P['face_skin_response']
 attr(body.data,'coat_color',np.c_[col,np.ones(len(col))],'FLOAT_COLOR')
 skin_gain=1+.65*(1-smooth(.42,.55,z))*smooth(-.12,-.03,y)*(1-smooth(.22,.32,y))*smooth(.26,.34,z)*(col.mean(1)<.35)
 skin_gain*=np.where(z<.043,P['paw_skin_response'],1)
 attr(body.data,'skin_gain',skin_gain)
 write('pattern_refinements.json',{'base':'Unchanged pass3 barycentric atlas transfer','corrections':['White foreleg fronts and insides with normal-based smooth masks','Dark gray paw tops below ankles','Dark eye fur rim','Slate plume root color','Symmetric whisker pad freckles'], 'mesh_positions_changed':False})
 return col

def zones(co,n,col,eyes):
 x,y,z=co.T;ax=abs(x);L=P['lengths'];length=np.full(len(co),L['body']);flow=np.tile([0.,1.,-.1],(len(co),1));lift=np.full(len(co),.52);density=np.ones(len(co));zone=np.zeros(len(co),np.int32)
 neck=(y<-.07)&(z>.40);head=(y<-.15)&(z>.49);legs=z<.32;hind=legs&(y>.04)&(z>.045);toe=z<.043;ear=(z>.585)&(ax>.038)&(y<-.12);shaft=y>.34;plume=(y>.625)&(z>.280)
 length[neck]=L['neck'];zone[neck]=1;flow[neck]=[0,.25,-1]
 length[head]=L['head'];zone[head]=2;flow[head]=[0,.5,-.55];lift[head]=.5
 length[legs]=L['leg'];zone[legs]=3;flow[legs]=[0,.1,-1]
 pale=col.mean(1)>.40
 bib=(y<-.07)&(z>.27)&(z<.475)&pale;belly=(y>-.08)&(y<.29)&(z>.27)&(z<.44)&pale
 length[bib]=L['bib'];zone[bib]=4;flow[bib]=[0,.05,-1];lift[bib]=.65
 length[belly]=L['belly'];zone[belly]=5;flow[belly]=[0,.65,-.9];lift[belly]=.6
 feather=hind&(n[:,1]>-.15);length[feather]=L['hind'];zone[feather]=6;flow[feather]=[0,.35,-1];lift[feather]=.65
 length[toe]=L['toes'];zone[toe]=7;flow[toe]=[0,-1,-.1];lift[toe]=.42
 length[ear]=L['ear'];zone[ear]=8;flow[ear]=np.c_[np.sign(x[ear])*.6,np.zeros(ear.sum()),np.ones(ear.sum())];lift[ear]=.25
 length[shaft]=L['shaft'];zone[shaft]=9;flow[shaft]=[0,1,.15];lift[shaft]=.4
 # Long narrow tufts fan upward from the ascending terminal tail shaft.
 length[plume]=(.035+.245*np.clip((y[plume]-.565)/.133,0,1))*L['plume']/.30;zone[plume]=10;flow[plume]=[0,.25,1];lift[plume]=.3;density[plume]=240
 # Keep the underside, bare nose, eye rims and toe soles clean.
 nose=(y<-.298)&(z>.493)&(z<.528)&(ax<.021)
 muzzle=(y<-.275)&(z>.48)&(z<.54)&~nose;flow[muzzle]=[0,-.8,-.3];length[muzzle]=.004;lift[muzzle]=.45
 density[nose]=0;density[z<.004]=0
 for center,radius in eyes:
  d=np.linalg.norm(co-center,axis=1);density*=smooth(radius+.0003,radius+.002,d);close=d<radius+.009;length[close]=np.minimum(length[close],.0032);lift[close]=.20
 density[head]*=2.4;density[toe]*=1.7;density[ear]*=1.5
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
 r=np.linspace(1,.015,pts)**.8
 if radii is None:radii=np.full(count,P['root_radius'])
 attr(data,'radius',(radii[:,None]*r[None,:]).ravel())
 mod=o.modifiers.new('Follow evaluated sculpt surface','NODES');mod.node_group=tree
 return o

def hair_material(pale):
 m=bpy.data.materials.new('Luceras fine wiry Chiang storm coat');m.use_nodes=True;t=m.node_tree;t.nodes.clear();ns=t.nodes;lk=t.links
 out=ns.new('ShaderNodeOutputMaterial');h=ns.new('ShaderNodeBsdfHairPrincipled');h.model='CHIANG';h.parametrization='COLOR';h.inputs['Roughness'].default_value=.42;h.inputs['Radial Roughness'].default_value=.38;h.inputs['Coat'].default_value=.12
 def at(name):
  n=ns.new('ShaderNodeAttribute');n.attribute_name=name;return n
 def mul(a,b):
  n=ns.new('ShaderNodeMixRGB');n.blend_type='MULTIPLY';n.inputs[0].default_value=1;lk.new(a,n.inputs[1]);lk.new(b,n.inputs[2]);return n.outputs[0]
 root=at('coat_color');info=ns.new('ShaderNodeHairInfo');white=at('plume_white');wstart=ns.new('ShaderNodeMapRange');wstart.interpolation_type='SMOOTHSTEP';wstart.inputs['From Min'].default_value=.20;wstart.inputs['From Max'].default_value=.50;lk.new(info.outputs['Intercept'],wstart.inputs['Value']);wmask=ns.new('ShaderNodeMath');wmask.operation='MULTIPLY';lk.new(white.outputs['Fac'],wmask.inputs[0]);lk.new(wstart.outputs['Result'],wmask.inputs[1])
 tip=ns.new('ShaderNodeMixRGB');lk.new(wmask.outputs[0],tip.inputs[0]);lk.new(root.outputs['Color'],tip.inputs[1]);tip.inputs[2].default_value=(*pale,1)
 bw=ns.new('ShaderNodeRGBToBW');lk.new(tip.outputs[0],bw.inputs[0]);response=ns.new('ShaderNodeMapRange');response.inputs['From Min'].default_value=.08;response.inputs['From Max'].default_value=.55;response.inputs['To Min'].default_value=P['hair_dark_scale'];response.inputs['To Max'].default_value=P['hair_color_scale'];lk.new(bw.outputs[0],response.inputs['Value'])
 ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.28,.28,.28,1);ramp.color_ramp.elements[1].position=.94;ramp.color_ramp.elements[1].color=(1.45,1.45,1.45,1);e=ramp.color_ramp.elements.new(.60);e.color=(.75,.75,.75,1);lk.new(info.outputs['Intercept'],ramp.inputs[0])
 darkr=ns.new('ShaderNodeValToRGB');darkr.color_ramp.elements[0].color=(P.get('dark_root',.28),)*3+(1,);darkr.color_ramp.elements[1].color=(P['dark_tip'],)*3+(1,);e=darkr.color_ramp.elements.new(.60);e.color=(P.get('dark_middle',.55),)*3+(1,);lk.new(info.outputs['Intercept'],darkr.inputs[0])
 darkmask=ns.new('ShaderNodeMapRange');darkmask.inputs['From Min'].default_value=.16;darkmask.inputs['From Max'].default_value=.50;lk.new(bw.outputs[0],darkmask.inputs['Value']);mixr=ns.new('ShaderNodeMixRGB');lk.new(darkmask.outputs['Result'],mixr.inputs[0]);lk.new(darkr.outputs['Color'],mixr.inputs[1]);lk.new(ramp.outputs['Color'],mixr.inputs[2])
 paw=at('paw_mask');paw_ramp=ns.new('ShaderNodeMixRGB');lk.new(paw.outputs['Fac'],paw_ramp.inputs[0]);lk.new(mixr.outputs[0],paw_ramp.inputs[1]);lk.new(ramp.outputs[0],paw_ramp.inputs[2]);tone=at('strand_tone');gain=at('coat_gain');color=mul(mul(mul(mul(tip.outputs[0],response.outputs['Result']),paw_ramp.outputs[0]),tone.outputs['Fac']),gain.outputs['Fac']);plume_tone=at('plume_tone');color=mul(color,plume_tone.outputs['Fac']);fade=ns.new('ShaderNodeMapRange');fade.interpolation_type='SMOOTHSTEP';fade.inputs['From Min'].default_value=.90;fade.inputs['From Max'].default_value=1;fade.inputs['To Min'].default_value=1;fade.inputs['To Max'].default_value=0;lk.new(info.outputs['Intercept'],fade.inputs['Value']);wf=ns.new('ShaderNodeMath');wf.operation='MULTIPLY';lk.new(wmask.outputs[0],wf.inputs[0]);lk.new(fade.outputs['Result'],wf.inputs[1]);pw=ns.new('ShaderNodeMixRGB');lk.new(wf.outputs[0],pw.inputs[0]);lk.new(color,pw.inputs[1]);ws=at('white_shade');lk.new(ws.outputs['Fac'],pw.inputs[2]);lk.new(pw.outputs[0],h.inputs['Color']);lk.new(h.outputs[0],out.inputs[0]);return m

def groom(body,col,eyes):
 m=body.data;co=array(m.vertices,'co');n=array(m.vertices,'normal');m.calc_loop_triangles();tris=np.array([t.vertices for t in m.loop_triangles],np.int32)
 le,flow,lift,dens,zone=zones(co,n,col,eyes)
 edges=array(m.edges,'vertices',2,np.int32);ea,eb=edges.T;degree=np.bincount(ea,minlength=len(co))+np.bincount(eb,minlength=len(co))+1
 for _ in range(6):
  le=(le+np.bincount(ea,weights=le[eb],minlength=len(co))+np.bincount(eb,weights=le[ea],minlength=len(co)))/degree
 le=np.minimum(le,np.where(co[:,2]<.10,.33*co[:,2]+.002,10))
 le[zone==9]=np.minimum(le[zone==9],P['lengths']['shaft']*1.4)
 for name,val in [('fur_length',le),('fur_density',dens),('fur_clump',np.where(zone==10,.998,P['clump'])),('fur_frizz',np.where((zone==2)|(zone==10),.018,P['frizz']))]:attr(m,name,val)
 attr(m,'fur_comb',flow,'FLOAT_VECTOR');attr(m,'fur_region',zone,'INT');tree=bind_tree(body);mat=hair_material(np.median(col[col.mean(1)>.60],axis=0));N=P['points'];t=np.linspace(0,1,N)[None,:,None]
 def root_data(count,is_guide=False):
  dd=dens.copy()
  if not is_guide:dd[(zone==0)|(zone==1)]*=P.get('body_child_density',1)
  if is_guide:
   dd[zone==10]*=(65*.115/120)*P['plume_guide_multiplier'];dd[(zone==0)|(zone==1)]*=4
  ti,ids,bar,root,norm=sample_roots(co,n,tris,count,dd);ln=(le[ids]*bar).sum(1);ff=unit(np.einsum('ij,ijk->ik',bar,flow[ids]));ll=(lift[ids]*bar).sum(1);cc=np.einsum('ij,ijk->ik',bar,col[ids]);zz=zone[ids[np.arange(len(ids)),bar.argmax(1)]]
  return ids,bar,root,norm,ln,ff,ll,cc,zz
 gi,gb,gr,gn,gl,gf,gv,gc,gz=root_data(P['guides'],True);gbase=gl.copy();gt=unit(gf-gn*(gf*gn).sum(1)[:,None]);gd=unit(gt*(1-gv[:,None])+gn*gv[:,None]);gl*=rng.uniform(.45,1.6,len(gl));bodyguide=(gz==0)|(gz==1);gd[bodyguide]=unit(gd[bodyguide]+rng.normal(0,.16,(bodyguide.sum(),3)));gdelta=gd[:,None,:]*gl[:,None,None]*t
 gdelta+=gt[:,None,:]*gl[:,None,None]*t*t*.25
 gdelta[:,:,2]-=gl[:,None]*(t[0,:,0]**2)*.12
 kink=rng.normal(0,.065,(len(gr),1,3))*gl[:,None,None];gdelta+=kink*np.sin(np.pi*t)*np.sin(3*np.pi*t)
 plume=gz==10
 # Plume guides point up and fan in width, retaining a three-dimensional volume.
 gwhite=np.zeros(len(gr))
 if plume.any():
  u=np.clip((gr[plume,1]-.565)/.133,0,1);v=rng.uniform(.06,1,plume.sum());v=np.maximum(v,(gr[plume,2]+.025-.295)/.345)
  fan=rng.uniform(-1,1,plume.sum());width=.100*np.sin(np.pi*v)**.75
  tips=np.c_[rng.uniform(-.032,.032,plume.sum())*np.sin(np.pi*v),.685-.145*v+fan*width,.295+.345*v]
  prng=np.random.default_rng(P['seed']+919)
  levels=np.repeat(np.arange(15),4);af=np.tile(np.array([-.86,-.30,.36,.92]),15)+prng.uniform(-.12,.12,60)
  av=np.clip((levels+.5)/15+prng.uniform(-.025,.025,60),.055,.995)
  aw=.100*np.sin(np.pi*av)**.75
  anchors=np.c_[prng.uniform(-.028,.028,60)*np.sin(np.pi*av),.685-.145*av+af*aw,.295+.345*av]
  choice=np.array([prng.choice(np.where(anchors[:,2]>r[2]+.025)[0]) for r in gr[plume]])
  tips=anchors[choice].copy();tips+=prng.normal(0,.0012,tips.shape)
  white_shell=(af[choice]<-.10)&(av[choice]<.72)
  tips[white_shell,0]=np.sign(gr[plume][white_shell,0])*(.024+.009*np.sin(np.pi*av[choice][white_shell]))
  p0=gr[plume];center=.685-.145*av[choice]
  p2=np.c_[tips[:,0]*.08,center+af[choice]*aw[choice]*.18,np.maximum(p0[:,2]+.008,tips[:,2]-.055)]
  core=p0[:,None,:]*(1-t)+p2[:,None,:]*t;branch=smooth(.70,1,t);curve=core*(1-branch)+tips[:,None,:]*branch
  gdelta[plume]=curve-p0[:,None,:];gwhite[plume]=white_shell.astype(float)
  kink=rng.uniform(-1,1,(plume.sum(),1,3))*.002;gdelta[plume]+=kink*np.sin(np.pi*t)*np.sin(2*np.pi*t)
  short=rng.random(plume.sum())<.04;pi=np.where(plume)[0][short];gdelta[pi]=unit(gn[pi]*.5+np.array([0,0,1]))[:,None,:]*rng.uniform(.008,.018,(len(pi),1,1))*t;gwhite[pi]=0
 gcoords=gr[:,None,:]+gdelta
 guide=make_curves('Luceras guides',gcoords[gz!=10],gi[gz!=10],co,gc[gz!=10],mat,body,tree);guide.hide_render=True;guide.hide_set(True)
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
 spread=gr[nearest[:,0]]-cr;spread-=cn*(spread*cn).sum(1)[:,None];spread*=np.minimum(1,np.minimum(.035,cl*1.4)/np.maximum(np.linalg.norm(spread,axis=1),1e-9))[:,None]
 delta*=rng.uniform(.70,1.25,len(cr))[:,None,None]
 clump*=rng.uniform(.94,1,len(gr))[nearest[:,0]];loose=rng.random(len(cr))<.08;clump[loose]*=.25
 target=gdelta[nearest[:,0]]+spread[:,None,:];weight=smooth(.05,1,t)*clump[:,None,None];delta=delta*(1-weight)+target*weight
 plume_child=cz==10
 delta[plume_child]=gdelta[nearest[plume_child,0]]+(gr[nearest[plume_child,0]]-cr[plume_child])[:,None,:]*smooth(0,1,t)
 axis=unit(gdelta[nearest[plume_child,0],-1]);b1=unit(np.cross(axis,np.tile([1.,0,0],(len(axis),1))));b2=unit(np.cross(axis,b1))
 sectors=rng.integers(0,6,len(axis));angle=sectors*(2*np.pi/6)+nearest[plume_child,0]*1.618
 radial=b1*np.cos(angle)[:,None]+b2*np.sin(angle)[:,None]
 jitter=rng.normal(size=radial.shape);jitter-=axis*(jitter*axis).sum(1)[:,None]
 radial=radial*.78+jitter*.11
 locklength=np.linalg.norm(np.diff(gdelta[nearest[plume_child,0]],axis=1),axis=2).sum(1)
 width=P.get('plume_lock_width',.0075)*rng.uniform(.55,1.20,len(axis))*np.minimum(1,locklength/.12)
 delta[plume_child]+=radial[:,None,:]*width[:,None,None]*np.sin(np.pi*smooth(.40,1,t))**1.2+radial[:,None,:]*rng.uniform(.00005,.0003,(len(axis),1,1))*t*t
 frizz_amount=(array(m.attributes['fur_frizz'].data,'value',1)[ci]*cb).sum(1)
 frizz_amount[plume_child]=.045
 phase=rng.uniform(0,6.28,(len(cr),1,3));frizz=np.sin(t*13+phase)*t*(1-t)*cl[:,None,None]*frizz_amount[:,None,None];delta+=frizz
 # Stagger the ends inside each lock so a tuft resolves into individual hairs.
 pd=delta[plume_child].copy();endtime=np.where(rng.random(len(pd))<.78,rng.uniform(.52,.95,len(pd)),rng.uniform(.96,1,len(pd)));sample=t[0,:,0][None,:]*endtime[:,None]*(N-1);left=np.minimum(sample.astype(int),N-2);frac=sample-left;rows=np.arange(len(pd))[:,None];delta[plume_child]=pd[rows,left]*(1-frac[:,:,None])+pd[rows,left+1]*frac[:,:,None]
 # Lift every non-root point outside its root tangent plane.
 hn=(delta*cn[:,None,:]).sum(2);minimum=cl[:,None]*t[0,:,0]*.10;correction=np.maximum(minimum-hn,0);correction[cz==10]=0;delta+=cn[:,None,:]*correction[:,:,None]
 distal_shaft=(cz==9)&(cr[:,1]>.55);delta[distal_shaft,:,2]=np.maximum(delta[distal_shaft,:,2],.002*t[0,:,0])
 delta[cz==10,:,2]=np.maximum(delta[cz==10,:,2],.012*t[0,:,0])
 coords=cr[:,None,:]+delta
 keep=np.ones(len(cr),bool)
 for center,radius in eyes:
  keep &= np.linalg.norm(coords-center[None,None,:],axis=2).min(1)>radius+.0003
 horn_culled=0
 for horn in [o for o in bpy.context.scene.objects if o.type=='MESH' and 'horn' in o.name.lower()]:
  hc=[body.matrix_world.inverted()@horn.matrix_world@v.co for v in horn.data.vertices];ht=BVHTree.FromPolygons(hc,[list(f.vertices) for f in horn.data.polygons]);candidates=np.where((cr[:,2]>.54)&(cr[:,1]<-.10))[0]
  for i in candidates:
   if not keep[i]:continue
   for point in coords[i,1:]:
    q,normal,idx,dist=ht.find_nearest(Vector(point))
    if q is not None and (Vector(point)-q).dot(normal)<-.0001:
     keep[i]=False;horn_culled+=1;break
 bare_nose=(coords[:,:,1]<-.303)&((coords[:,:,0]/.018)**2+((coords[:,:,2]-.5105)/.0155)**2<1)
 keep &= ~bare_nose.any(1)
 culled=int((~keep).sum());ci,cb,cr,cn,cc,cz,coords,nearest=[v[keep] for v in (ci,cb,cr,cn,cc,cz,coords,nearest)]
 # Tail root color is transferred from the shaft; white terminal/underside locks
 # inherit the white sample of the approved atlas, with a per-strand tip gradient.
 body_preservation_hash=hashlib.sha256(coords[(cz!=10)&(cz!=2)&(cz!=7)].astype(np.float32).tobytes()).hexdigest()
 transition=(cz==9)&(cr[:,1]>.61)
 coords[transition]=cr[transition,None,:]+cn[transition,None,:]*.002*t+np.array([0,.006,.002])[None,None,:]*t*(.65+.35*np.sin(np.arange(sum(transition))*1.65)**2)[:,None,None]
 keep_body=(cz!=10)&~((cz==7)&((np.arange(len(cz))%5)<2))
 ci,cb,cr,cn,cc,cz,coords,nearest=[v[keep_body] for v in (ci,cb,cr,cn,cc,cz,coords,nearest)]
 # Paw length returns to pass 2 while all other body strand points remain unchanged.
 paw=cz==7;pn=cn[paw];pf=np.tile([0.,-1.,-.1],(sum(paw),1));pt=unit(pf-pn*(pf*pn).sum(1)[:,None]);pl=P['paw_length']*(.72+.28*np.sin(np.arange(sum(paw))*1.71)**2);coords[paw]=cr[paw,None,:]+(pn*.30+pt*.75)[:,None,:]*pl[:,None,None]*t
 plume=cz==10
 child=make_curves('Luceras interpolated coat',coords,ci,co,cc,mat,body,tree,np.where(cz==10,P.get('plume_radius',.00018),np.where(cz==2,P['root_radius']*.75,P['root_radius'])))
 gain=1+P.get('flank_gain',.7)*(1-smooth(.42,.55,cr[:,2]))*smooth(-.12,-.03,cr[:,1])*(1-smooth(.22,.32,cr[:,1]))*smooth(.26,.34,cr[:,2])*(cc.mean(1)<.35)
 lum=cc.mean(1);compression=(P.get('dark_color_floor',0)+P.get('dark_color_slope',1)*lum)/np.maximum(lum,1e-6);compression=1+(compression-1)*(1-smooth(.16,.35,lum));compression=np.where((cz==7)|(cz==10),1,compression);gain*=compression
 gain*=np.where((cz==2)&(cc.mean(1)<.35),P['face_response'],1)
 gain*=np.where((cz==0)|(cz==1),P.get('body_response',1),1);gain*=np.where(cz==7,P.get('paw_response',1),1);attr(child.data,'coat_gain',gain,'FLOAT','CURVE')
 attr(child.data,'paw_mask',(cz==7).astype(float),'FLOAT','CURVE');attr(child.data,'white_shade',rng.uniform(.958,.999,len(cr)),'FLOAT','CURVE')
 tone=rng.uniform(.80,1.25,len(gr))[nearest[:,0]]*rng.uniform(.55,1.35,len(cr));dark=cc.mean(1)<.35;tone[dark]=rng.uniform(.88,1.08,len(gr))[nearest[dark,0]]*rng.uniform(.85,1.10,dark.sum());attr(child.data,'strand_tone',tone,'FLOAT','CURVE')
 attr(child.data,'plume_tone',np.where(plume,P.get('plume_dark_tone',.50),1.0),'FLOAT','CURVE')
 white_group=np.zeros(len(cr));white_group[plume]=gwhite[nearest[plume,0]];attr(child.data,'plume_white',white_group,'FLOAT','CURVE')
 # Sparse white whiskers with surface-projected roots on each muzzle side.
 bv=BVHTree.FromPolygons(co.tolist(),tris.tolist(),all_triangles=True);wr=[];wi=[];wn=[]
 for sign in (-1,1):
  for j in range(14):
   target=Vector((sign*(.019+(j%4)*.0009),-.287+(j%5)*.003,.505+(j//5)*.004));q,no,idx,dist=bv.find_nearest(target);q=np.array(q);end=np.array([sign*(.07+(j%7)*.007),-.025-(j%5)*.007,.027-j*.0048]);curve=q[None,:]+t[0]*end[None,:];curve[:,2]-=t[0,:,0]**2*.01;wr.append(curve);wi.append(tris[idx]);wn.append(np.array(no))
 whiskmat=mat.copy();whiskmat.name='White Chiang whiskers';wh=next(n for n in whiskmat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfHairPrincipled')
 for link in list(wh.inputs['Color'].links):whiskmat.node_tree.links.remove(link)
 wh.inputs['Color'].default_value=(.95,.95,.95,1);wt=whiskmat.node_tree;wo=next(n for n in wt.nodes if n.bl_idname=='ShaderNodeOutputMaterial');we=wt.nodes.new('ShaderNodeEmission');we.inputs['Color'].default_value=(.9,.9,.9,1);we.inputs['Strength'].default_value=.7;wm=wt.nodes.new('ShaderNodeMixShader');wm.inputs[0].default_value=.20;wt.links.new(wh.outputs[0],wm.inputs[1]);wt.links.new(we.outputs[0],wm.inputs[2]);wt.links.new(wm.outputs[0],wo.inputs[0])
 whisk=make_curves('Luceras white whiskers',np.array(wr),np.array(wi),co,np.tile([.8,.8,.8],(28,1)),whiskmat,body,tree,np.full(28,.00045))
 dots=np.array(wr)[:,0:1,:]+np.array([0,.0022,.0030])[None,:,None]*np.array(wn)[:,None,:]
 dotmat=whiskmat.copy();dotmat.name='Dark whisker follicles';dh=next(n for n in dotmat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfHairPrincipled');dh.inputs['Color'].default_value=(.015,.012,.010,1);do=next(n for n in dotmat.node_tree.nodes if n.bl_idname=='ShaderNodeOutputMaterial');dotmat.node_tree.links.new(dh.outputs[0],do.inputs[0])
 follicles=make_curves('Luceras whisker follicles',dots,np.array(wi),co,np.tile([.015,.012,.010],(28,1)),dotmat,body,tree,np.full(28,.00065));attr(follicles.data,'radius',np.tile([.00005,.00065,.0004],28))
 write('groom_statistics.json',{'guides':len(gr),'children':len(cr),'whiskers':28,'follicle_curves':28,'rendered_strands':len(cr)+56,'culled_for_bare_part_clearance':culled,'horn_intersection_culled':horn_culled,'points_per_strand':N,'interpolation':'Three nearest same-region guides, inverse-square distance weights, normal correction, nearest-guide clumping and continuous strand frizz. Children are baked as editable hair curves.','attachment':'Geometry Nodes root barycentrics plus orthonormal triangle frames. Strand offsets rotate without skin scale or shear. Every root follows evaluated body vertices. Equivalent to Deform Curves on Surface without a UV map.','region_guide_counts':{str(z):int(sum(gz==z)) for z in np.unique(gz)},'region_child_counts':{str(z):int(sum(cz==z)) for z in np.unique(cz)},'left_children':int(sum(cr[:,0]>0)),'right_children':int(sum(cr[:,0]<0)),'nonfinite_points':int((~np.isfinite(coords)).sum()),'eye_clearance_min_m':min(float(np.linalg.norm(coords-c[None,None,:],axis=2).min()-r) for c,r in eyes),'root_colors_min_linear':cc.min(0).tolist(),'root_colors_max_linear':cc.max(0).tolist()})
 author_details(body,co,tris,tree,eyes)
 stats=json.loads((OUT/'groom_statistics.json').read_text());stats['guides']=int(sum(gz!=10))+len(P['plume_tufts'])+P['lid_guides']*2;stats['children']=len(cr)+P['tuft_children']*len(P['plume_tufts'])+P['lid_guides']*2*P['lid_children'];stats['rendered_strands']=stats['children']+56;stats['region_child_counts']['10']=P['tuft_children']*len(P['plume_tufts']);stats['body_preservation_hash']=body_preservation_hash;stats['authored_plume_tufts']=len(P['plume_tufts']);stats['region_guide_counts']['10']=len(P['plume_tufts']);stats['eyelid_guides']=P['lid_guides']*2;write('groom_statistics.json',stats)
 return [guide,child,whisk]

def detail_hair_material(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;ns=m.node_tree.nodes;lk=m.node_tree.links;ns.clear();out=ns.new('ShaderNodeOutputMaterial');h=ns.new('ShaderNodeBsdfHairPrincipled');h.model='CHIANG';h.parametrization='COLOR';h.inputs['Color'].default_value=(*color,1);h.inputs['Roughness'].default_value=.43;h.inputs['Radial Roughness'].default_value=.38;h.inputs['Coat'].default_value=.08;at=ns.new('ShaderNodeAttribute');at.attribute_name='detail_tone';info=ns.new('ShaderNodeHairInfo');ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*[v*(.80 if name=='Authored plume white' else .48) for v in color],1);ramp.color_ramp.elements[1].color=(*[min(v*1.25,1) for v in color],1);lk.new(info.outputs['Intercept'],ramp.inputs[0]);mul=ns.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;lk.new(ramp.outputs[0],mul.inputs[1]);lk.new(at.outputs['Fac'],mul.inputs[2]);lk.new(mul.outputs[0],h.inputs['Color']);lk.new(h.outputs[0],out.inputs[0]);return m

def author_details(body,co,tris,tree,eyes):
 prng=np.random.default_rng(P['seed']+404);bv=BVHTree.FromPolygons(co.tolist(),tris.tolist(),all_triangles=True);N=17;t=np.linspace(0,1,N)[None,:,None]
 mats={c:detail_hair_material('Authored plume '+c,(P['plume_white_linear'],)*3 if c=='white' else (P['plume_dark_linear'],P['plume_dark_linear']*.94,P['plume_dark_linear']*.90)) for c in ('dark','white')}
 records=[]
 def project(points):
  roots=[];ids=[]
  for p in points:
   q,no,idx,d=bv.find_nearest(Vector(p));roots.append(q[:]);ids.append(tris[idx])
  return np.array(roots),np.array(ids)
 for tuft in P['plume_tufts']:
  u=tuft['station'];y=P['tuft_root_y_start']+P['tuft_root_y_span']*u;z=float(np.mean(co[(abs(co[:,1]-y)<.003)&(co[:,1]>.60),2]));angle=math.radians(tuft['angle']);direction=np.array([0,math.sin(angle),math.cos(angle)]);width=tuft['width'];length=tuft['length'];white=tuft['color']=='white';c=P['tuft_children']
  guide_root,guide_ids=project([[.003,y-(.002 if white else 0),z]])
  # One center guide per named tuft. Children never consult another tuft.
  guide=guide_root[:,None,:]+direction[None,None,:]*length*t
  guide[:,:,1]+=.018*np.sin(np.pi*t[0,:,0]);guide[:,:,0]=guide_root[:,0:1]*(1-t[0,:,0])
  g=make_curves('Plume guide '+tuft['name'],guide,guide_ids,co,np.ones((1,3)),mats[tuft['color']],body,tree);g.hide_render=True;g.hide_set(True)
  az=prng.uniform(0,math.tau,c);root_targets=np.c_[.004*np.cos(az),y+prng.uniform(-.004,.004,c),z+.004*np.sin(az)]
  roots,ids=project(root_targets)
  # Spread is a solid elliptical cross section, tapering into a pointed tuft.
  # Independent coherent end lengths avoid a single polished spear surface.
  groups=24;group=np.arange(c)%groups;ends=prng.uniform(.35,1,groups);ends[::9]=prng.uniform(.96,1,len(ends[::9]));v=np.minimum(1,ends[group]+prng.normal(0,.002,c));tt=t*v[:,None,None]
  sample=tt[:,:,0]*(N-1);left=np.minimum(sample.astype(int),N-2);frac=sample-left
  coords=guide[0,left]*(1-frac[:,:,None])+guide[0,left+1]*frac[:,:,None]+(roots-guide_root[0])[:,None,:]*(1-smooth(0,1,t))
  ga=prng.uniform(0,math.tau,groups);gr=np.sqrt(prng.random(groups));a=ga[group];rad=gr[group];cross=np.array([0,math.cos(angle),-math.sin(angle)])
  offset=np.c_[np.cos(a)*width*.65,np.zeros(c),np.zeros(c)]+np.sin(a)[:,None]*width*cross[None,:];offset*=rad[:,None]
  envelope=np.sin(np.pi*tt)**.70
  coords+=offset[:,None,:]*envelope
  jitter=prng.normal(0,1,(c,3));jitter-=direction[None,:]*(jitter*direction[None,:]).sum(1)[:,None];coords+=jitter[:,None,:]*.0018*np.sin(np.pi*t)**.8
  # Inner white tufts form the visible near and far shell of the lower band.
  if white:coords[:,:,0]+=np.sign(roots[:,0])[:,None]*.026*np.sin(np.pi*tt[:,:,0])
  phase=prng.uniform(0,6.28,(groups,1,3))[group];coords+=np.sin(tt*22+phase)*.0035*np.sin(np.pi*t);coords+=prng.normal(0,.00025,coords.shape)*np.sin(np.pi*t)
  color=np.tile([.8,.8,.8] if white else [.055,.052,.050],(c,1));h=make_curves('Plume tuft '+tuft['name'],coords,ids,co,color,mats[tuft['color']],body,tree,np.full(c,P['tuft_radius']));attr(h.data,'detail_tone',prng.uniform(.78,1.18,groups)[group] if white else prng.uniform(.45,1.45,groups)[group],'FLOAT','CURVE');h['tuft_name']=tuft['name'];h['interpolation']='Only this named guide, no inter-tuft interpolation';h['station']=u;attr(h.data,'tuft_id',np.full(c,len(records)),'INT','CURVE')
  records.append(dict(tuft,guide_root=guide_root[0].tolist(),guide_tip=guide[0,-1].tolist(),children=c))
 lidmat=detail_hair_material('Short dark slate eyelid rim',(.110,.100,.095));lidrecords=[]
 lr=next(n for n in lidmat.node_tree.nodes if n.bl_idname=='ShaderNodeValToRGB').color_ramp;lr.elements[0].color=(.075,.068,.064,1);lr.elements[1].color=(.012,.011,.010,1);le=lr.elements.new(.86);le.color=(.12,.11,.105,1)
 for ei,(center,radius) in enumerate(eyes):
  sign=1 if center[0]>0 else -1;outward=np.array([sign*.8,-.6,0]);horizontal=np.array([sign*.6,.8,0]);vertical=np.array([0,0,1]);count=P['lid_guides'];angles=np.linspace(0,2*np.pi,count,endpoint=False)
  def lid_paths(aa,jitter):
   radials=np.cos(aa)[:,None]*horizontal[None,:]+np.sin(aa)[:,None]*vertical[None,:]
   layer=(np.arange(len(aa))%P['lid_children'])/max(P['lid_children']-1,1)
   outer=center+radials*(.020+.006*layer[:,None])+outward*.001
   roots,ids=project(outer)
   # Wide open almond border follows the globe and overlaps only its perimeter.
   ew=P['lid_open_width']+.0013*layer;eh=np.where(np.sin(aa)>0,P['lid_open_height']-.001,P['lid_open_height'])+.0013*layer
   edge=horizontal[None,:]*np.cos(aa)[:,None]*ew[:,None]+vertical[None,:]*np.sin(aa)[:,None]*eh[:,None]
   depth=np.sqrt(np.maximum((radius+.0005)**2-(edge*edge).sum(1),0));end=center+edge+outward[None,:]*depth[:,None]
   coords=roots[:,None,:]*(1-t)+end[:,None,:]*t
   vec=coords-center;dist=np.linalg.norm(vec,axis=2);push=np.maximum(radius+.00045-dist,0)*smooth(0,.3,t[0,:,0]);coords+=unit(vec)*push[:,:,None]
   coords+=radials[:,None,:]*jitter[:,None,None]*np.sin(np.pi*t);coords+=horizontal[None,None,:]*np.sin(aa)[:,None,None]*.00045*np.sin(np.pi*t)
   return coords,ids
  coords,ids=lid_paths(angles,np.zeros(count));g=make_curves('Eyelid ring guides '+str(ei),coords,ids,co,np.tile([.02,.02,.02],(count,1)),lidmat,body,tree);g.hide_render=True;g.hide_set(True)
  aa=np.repeat(angles,P['lid_children'])+prng.uniform(-.014,.014,count*P['lid_children']);coords,ids=lid_paths(aa,prng.uniform(-.0005,.0005,len(aa)));h=make_curves('Eyelid short rim '+str(ei),coords,ids,co,np.tile([.02,.02,.02],(len(aa),1)),lidmat,body,tree,np.full(len(aa),P['lid_radius']))
  attr(h.data,'detail_tone',prng.uniform(.85,1.15,len(aa)),'FLOAT','CURVE');profile=(1-.3*t[0,:,0])*(1-smooth(.86,1,t[0,:,0]));attr(h.data,'radius',np.tile(profile*P['lid_radius'],len(aa)))
  lidrecords.append({'eye':ei,'guides':count,'children':len(aa),'minimum_surface_distance':float(np.linalg.norm(coords[:,2:]-center,axis=2).min()-radius),'opening_horizontal_radius':P['lid_open_width'],'opening_vertical_radius':P['lid_open_height']})
 # Short transition coat bridges the old plume mask to the authored plume base.
 tc=P['transition_children'];az=prng.uniform(0,math.tau,tc);yy=prng.uniform(.623,.644,tc);zz=.284+(yy-.623)*.50;roots,ids=project(np.c_[.005*np.cos(az),yy,zz+.005*np.sin(az)]);normal=unit(np.cross(co[ids[:,1]]-co[ids[:,0]],co[ids[:,2]]-co[ids[:,0]]));forward=np.tile([0.,1.,.55],(tc,1));tangent=unit(forward-normal*(forward*normal).sum(1)[:,None]);ln=prng.uniform(.003,.007,tc);coords=roots[:,None,:]+(normal*.25+tangent*.8)[:,None,:]*ln[:,None,None]*t
 th=make_curves('Plume shaft transition children',coords,ids,co,np.tile([.065,.060,.057],(tc,1)),mats['dark'],body,tree,np.full(tc,.000075));attr(th.data,'detail_tone',prng.uniform(.8,1.2,tc),'FLOAT','CURVE')
 gi=np.linspace(0,tc-1,P['transition_guides']).astype(int);tg=make_curves('Plume shaft transition guides',coords[gi],ids[gi],co,np.tile([.065,.060,.057],(len(gi),1)),mats['dark'],body,tree);tg.hide_render=True;tg.hide_set(True)
 write('authored_details.json',{'tufts':records,'eyelids':lidrecords,'method':'Explicit named guide per plume tuft, children only in their own tuft. Two mirrored eyelid rings projected to skin and routed outside eye sphere. All curves use evaluated surface triangle frames.'})


def eye_mat(o):
 m,b=material('Amber horizontal goat eye '+o.name,(.32,.14,.025),.28);t=m.node_tree;ns=t.nodes;lk=t.links;tex=ns.new('ShaderNodeTexCoord');sep=ns.new('ShaderNodeSeparateXYZ');lk.new(tex.outputs['Generated'],sep.inputs[0])
 def mathnode(op,a,bv):
  nd=ns.new('ShaderNodeMath');nd.operation=op
  if hasattr(a,'node'):lk.new(a,nd.inputs[0])
  else:nd.inputs[0].default_value=a
  nd.inputs[1].default_value=bv;return nd.outputs[0]
 xx=mathnode('SUBTRACT',sep.outputs['X'],.5);yy=mathnode('SUBTRACT',sep.outputs['Y'],.5);zz=mathnode('SUBTRACT',sep.outputs['Z'],.5)
 sign=1 if o.location.x>0 else -1
 add=ns.new('ShaderNodeMath');add.operation='ADD';lk.new(mathnode('MULTIPLY',xx,.6*sign),add.inputs[0]);lk.new(mathnode('MULTIPLY',yy,.8),add.inputs[1]);horizontal=add.outputs[0]
 add2=ns.new('ShaderNodeMath');add2.operation='ADD';lk.new(mathnode('POWER',mathnode('DIVIDE',horizontal,.25),2),add2.inputs[0]);lk.new(mathnode('POWER',mathnode('DIVIDE',zz,.125),2),add2.inputs[1]);pr=ns.new('ShaderNodeMapRange');pr.interpolation_type='SMOOTHSTEP';pr.inputs['From Min'].default_value=.65;pr.inputs['From Max'].default_value=1.20;pr.inputs['To Min'].default_value=1;pr.inputs['To Max'].default_value=0;lk.new(add2.outputs[0],pr.inputs['Value']);pupil=pr.outputs['Result']
 noise=ns.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=38;noise.inputs['Detail'].default_value=2;lk.new(tex.outputs['Generated'],noise.inputs['Vector']);ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.09,.027,.006,1);ramp.color_ramp.elements[1].color=(.42,.18,.025,1);angle=ns.new('ShaderNodeMath');angle.operation='ARCTAN2';lk.new(zz,angle.inputs[0]);lk.new(horizontal,angle.inputs[1]);wave=mathnode('SINE',mathnode('MULTIPLY',angle.outputs[0],83),0);bands=ns.new('ShaderNodeMath');bands.operation='MULTIPLY_ADD';lk.new(wave,bands.inputs[0]);bands.inputs[1].default_value=.20;lk.new(noise.outputs['Fac'],bands.inputs[2]);lk.new(bands.outputs[0],ramp.inputs[0]);rad=ns.new('ShaderNodeMath');rad.operation='ADD';lk.new(mathnode('POWER',horizontal,2),rad.inputs[0]);lk.new(mathnode('POWER',zz,2),rad.inputs[1]);rim=ns.new('ShaderNodeMapRange');rim.inputs['From Min'].default_value=.075;rim.inputs['From Max'].default_value=.18;rim.inputs['To Min'].default_value=1;rim.inputs['To Max'].default_value=.16;lk.new(rad.outputs[0],rim.inputs['Value']);iris=ns.new('ShaderNodeMixRGB');iris.blend_type='MULTIPLY';iris.inputs[0].default_value=1;lk.new(ramp.outputs[0],iris.inputs[1]);lk.new(rim.outputs['Result'],iris.inputs[2]);mix=ns.new('ShaderNodeMixRGB');lk.new(pupil,mix.inputs[0]);lk.new(iris.outputs[0],mix.inputs[1]);mix.inputs[2].default_value=(.001,.0008,.0006,1);facing=ns.new('ShaderNodeLayerWeight');edge=ns.new('ShaderNodeValToRGB');edge.color_ramp.elements[0].position=.18;edge.color_ramp.elements[0].color=(1,1,1,1);edge.color_ramp.elements[1].position=.65;edge.color_ramp.elements[1].color=(.08,.05,.025,1);lk.new(facing.outputs['Facing'],edge.inputs[0]);em=ns.new('ShaderNodeMixRGB');em.blend_type='MULTIPLY';em.inputs[0].default_value=1;lk.new(mix.outputs[0],em.inputs[1]);lk.new(edge.outputs[0],em.inputs[2]);upper=ns.new('ShaderNodeMapRange');upper.interpolation_type='SMOOTHSTEP';upper.inputs['From Min'].default_value=.0;upper.inputs['From Max'].default_value=.36;upper.inputs['To Min'].default_value=1;upper.inputs['To Max'].default_value=.85;lk.new(zz,upper.inputs['Value']);shade=ns.new('ShaderNodeMixRGB');shade.blend_type='MULTIPLY';shade.inputs[0].default_value=1;lk.new(em.outputs[0],shade.inputs[1]);lk.new(upper.outputs['Result'],shade.inputs[2]);lk.new(shade.outputs[0],b.inputs['Base Color']);b.inputs['Coat Weight'].default_value=0;b.inputs['Specular IOR Level'].default_value=.12;b.inputs['Coat Roughness'].default_value=.12;assign(o,m)

def setup_materials(body,col):
 m,b=material('Transferred storm slate skin',(.2,.2,.2),.88);at=m.node_tree.nodes.new('ShaderNodeAttribute');at.attribute_name='coat_color';scale=m.node_tree.nodes.new('ShaderNodeMixRGB');scale.blend_type='MULTIPLY';scale.inputs[0].default_value=1;scale.inputs[2].default_value=(.75,.75,.75,1);bw=m.node_tree.nodes.new('ShaderNodeRGBToBW');m.node_tree.links.new(at.outputs['Color'],bw.inputs[0]);sm=m.node_tree.nodes.new('ShaderNodeMapRange');sm.inputs['From Min'].default_value=.08;sm.inputs['From Max'].default_value=.55;sm.inputs['To Min'].default_value=.72;sm.inputs['To Max'].default_value=.55;m.node_tree.links.new(bw.outputs[0],sm.inputs['Value']);m.node_tree.links.new(sm.outputs['Result'],scale.inputs[2]);m.node_tree.links.new(at.outputs['Color'],scale.inputs[1]);sg=m.node_tree.nodes.new('ShaderNodeAttribute');sg.attribute_name='skin_gain';smix=m.node_tree.nodes.new('ShaderNodeMixRGB');smix.blend_type='MULTIPLY';smix.inputs[0].default_value=1;m.node_tree.links.new(scale.outputs[0],smix.inputs[1]);m.node_tree.links.new(sg.outputs['Fac'],smix.inputs[2]);m.node_tree.links.new(smix.outputs[0],b.inputs['Base Color']);assign(body,m)
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or o==body:continue
  if 'eye' in o.name.lower():
   eye_mat(o)
   cornea=o.copy();cornea.data=o.data.copy();cornea.name='groom_cornea_'+o.name;bpy.context.scene.collection.objects.link(cornea);cornea.scale*=1.006
   cm,cb=material('Clear cornea '+o.name,(1,1,1),.09);cb.inputs['Transmission Weight'].default_value=1;cb.inputs['IOR'].default_value=1.33;assign(cornea,cm)
  elif 'horn' in o.name.lower():
   co=array(o.data.vertices,'co');norm=array(o.data.vertices,'normal');ed=array(o.data.edges,'vertices',2,np.int32);a,bb=ed.T;degree=np.maximum(np.bincount(a,minlength=len(co))+np.bincount(bb,minlength=len(co)),1)
   avg=np.stack([np.bincount(a,weights=co[bb,k],minlength=len(co))+np.bincount(bb,weights=co[a,k],minlength=len(co)) for k in range(3)],axis=1)/degree[:,None]
   convex=((co-avg)*norm).sum(1);lo,hi=np.quantile(convex,[.65,.95]);crest=smooth(lo,hi,convex);attr(o.data,'horn_crest',crest)
   m,b=material('Matte dark brown horn '+o.name,(.018,.012,.008),.60);ns=m.node_tree.nodes;lk=m.node_tree.links;at=ns.new('ShaderNodeAttribute');at.attribute_name='horn_crest';ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.009,.007,.005,1);ramp.color_ramp.elements[1].color=(.060,.036,.017,1);lk.new(at.outputs['Fac'],ramp.inputs[0]);lk.new(ramp.outputs[0],b.inputs['Base Color']);b.inputs['Metallic'].default_value=.16
   rr=ns.new('ShaderNodeMapRange');rr.inputs['To Min'].default_value=.70;rr.inputs['To Max'].default_value=.34;lk.new(at.outputs['Fac'],rr.inputs['Value']);lk.new(rr.outputs['Result'],b.inputs['Roughness']);assign(o,m)
  elif 'claw' in o.name.lower():m,b=material('Quiet dark claw '+o.name,(.016,.017,.019),.62);assign(o,m)
  elif 'whisker' in o.name.lower():o.hide_render=True

def studio():
 sys.path.insert(0,'/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/roster');import lookdev
 lookdev.setup_scene('CYCLES');s=bpy.context.scene;s.cycles.device='CPU';s.cycles.use_denoising=P['denoise'];s.cycles.sample_clamp_indirect=3;s.cycles.sample_clamp_direct=6;s.cycles.max_bounces=16;s.cycles.diffuse_bounces=4;s.cycles.glossy_bounces=8;s.cycles.transmission_bounces=12;s.render.threads_mode='FIXED';s.render.threads=6
 s.cycles.denoiser='OPENIMAGEDENOISE'
 if hasattr(s.cycles,'denoising_use_gpu'):s.cycles.denoising_use_gpu=False
 s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1
 ground=bpy.data.objects['lookdev_ground'];ground.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.45,.45,.45,1)
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.45,.45,.45,1);bg.inputs['Strength'].default_value=.5
 wn=s.world.node_tree.nodes;wl=s.world.node_tree.links;camera_bg=wn.new('ShaderNodeBackground');camera_bg.inputs['Color'].default_value=(.53,.53,.53,1);camera_bg.inputs['Strength'].default_value=1;ray=wn.new('ShaderNodeLightPath');mix=wn.new('ShaderNodeMixShader');wl.new(ray.outputs['Is Camera Ray'],mix.inputs[0]);wl.new(bg.outputs[0],mix.inputs[1]);wl.new(camera_bg.outputs[0],mix.inputs[2]);wl.new(mix.outputs[0],wn.get('World Output').inputs['Surface'])
 gm=ground.data.materials[0];gb=gm.node_tree.nodes.get('Principled BSDF');gb.inputs['Emission Color'].default_value=(.18,.18,.18,1);gray=gm.node_tree.nodes.new('ShaderNodeLightPath');gm.node_tree.links.new(gray.outputs['Is Camera Ray'],gb.inputs['Emission Strength'])
 bpy.data.objects['lookdev_key'].data.shape='DISK';bpy.data.objects['lookdev_key'].data.size=2.3;bpy.data.objects['lookdev_fill'].data.shape='DISK';bpy.data.objects['lookdev_rim'].data.shape='DISK';bpy.data.objects['lookdev_key'].data.energy=110;bpy.data.objects['lookdev_fill'].data.energy=50;bpy.data.objects['lookdev_rim'].data.energy=30
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
  if name=='head':
   data.ortho_scale=.43;data.shift_x=.06;target=Vector((0,-.205,.585));o.location=target+Vector((.57,-.81,.13))*10;o.rotation_quaternion=(target-o.location).to_track_quat('-Z','Y')
 # Save a ready-to-render neutral scene at the required sheet height.
 s.camera=bpy.data.objects['groom_camera_side'];s.render.resolution_x=1374;s.render.resolution_y=1145;s.render.resolution_percentage=100;s.cycles.samples=P['samples_final']
 return s

def render_views(views,final=False):
 s=bpy.context.scene;measure=json.loads((OUT/'measurements.json').read_text()) if (OUT/'measurements.json').exists() else {'build_id':'B-spm3','device':'CPU','peak_gpu_memory_gb':None,'gpu_memory_note':'CPU rendering selected explicitly. No Cycles GPU allocations. Total system GPU memory was not instrumented.','denoise':P['denoise'],'frames':[]}
 stats=json.loads((OUT/'groom_statistics.json').read_text());measure.update({k:stats[k] for k in ('guides','children','whiskers','rendered_strands')})
 for view in views:
  s.camera=bpy.data.objects['groom_camera_'+view];size=(192 if view=='sprite' else 512 if view=='portrait' else P['final_size'] if final else P['preview_size']);s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100
  if view in ('side','three_quarter'):s.render.resolution_x=1374 if final else round(size*1.2);s.render.resolution_y=1145 if final else size
  s.cycles.samples=(P.get('samples_tail_final',P['samples_final']) if view=='tail_plume' else P['samples_final']) if final else P['samples_preview'];name=('render_' if final else 'iter'+args.iteration+'_')+view+'.png';s.render.filepath=str(OUT/name);t0=time.perf_counter();bpy.ops.render.render(write_still=True);elapsed=time.perf_counter()-t0
  measure['frames'].append({'file':name,'sha256':hashlib.sha256(Path(s.render.filepath).read_bytes()).hexdigest(),'view':view,'iteration':args.iteration,'stage':'final' if final else 'preview','build_state':json.loads((OUT/'build_state.json').read_text()),'guides':stats['guides'],'children':stats['children'],'width':s.render.resolution_x,'height':s.render.resolution_y,'seconds':elapsed,'samples':s.cycles.samples,'samples_definition':'Configured maximum per pixel','adaptive_sampling':s.cycles.use_adaptive_sampling,'adaptive_threshold':s.cycles.adaptive_threshold,'denoise':s.cycles.use_denoising,'device':s.cycles.device,'process_peak_host_memory_gb':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024**2});write('measurements.json',measure);print('RENDERED',name,elapsed,flush=True)

def saved_curve_checks(body,eyes):
 co=array(body.data.vertices,'co');items=[]
 for o in bpy.context.scene.objects:
  if o.type!='CURVES':continue
  d=o.data;count=len(d.curves);N=len(d.attributes['position'].data)//count;pos=array(d.attributes['position'].data,'vector');ids=np.stack([array(d.attributes['bind_i'+s].data,'value',1,np.int32) for s in 'abc'],axis=1);bar=np.stack([array(d.attributes['bind_'+s].data,'value',1) for s in 'abc'],axis=1);expected=np.einsum('ij,ijk->ik',bar,co[ids]);error=np.linalg.norm(pos[::N]-expected,axis=1)
  mins=[float(np.linalg.norm(pos-center,axis=1).min()-radius) for center,radius in eyes]
  nose=(pos[:,1]<-.303)&((pos[:,0]/.018)**2+((pos[:,2]-.5105)/.0155)**2<1)
  items.append({'object':o.name,'curves':count,'points_per_curve':N,'hidden_for_render':o.hide_render,'surface_is_sculpt':d.surface==body,'surface_deform_modifier':any(m.type=='NODES' and m.node_group is not None for m in o.modifiers),'nonfinite_points':int((~np.isfinite(pos)).sum()),'max_root_bind_error_m':float(error.max()),'eye_surface_clearance_m':mins,'points_in_bare_nose_mask':int(nose.sum()),'left_roots':int(sum(pos[::N,0]>0)),'right_roots':int(sum(pos[::N,0]<0))})
 rendered=[i for i in items if not i['hidden_for_render']]
 write('curve_checks.json',{'objects':items,'rendered_strands_actual':sum(i['curves'] for i in rendered),'hidden_guides_actual':sum(i['curves'] for i in items if i['hidden_for_render']),'all_finite':all(i['nonfinite_points']==0 for i in items),'all_surface_bound':all(i['surface_is_sculpt'] and i['surface_deform_modifier'] and i['max_root_bind_error_m']<.00002 for i in items),'bare_nose_clear_rendered':all(i['points_in_bare_nose_mask']==0 for i in rendered),'eye_clearance_rendered':min(min(i['eye_surface_clearance_m']) for i in rendered)})
 stats=json.loads((OUT/'groom_statistics.json').read_text());stats['rendered_strands']=sum(i['curves'] for i in rendered);stats['guides']=sum(i['curves'] for i in items if i['hidden_for_render']);stats['children']=stats['rendered_strands']-56;stats['transition_children']=P['transition_children'];stats['transition_guides']=P['transition_guides'];write('groom_statistics.json',stats)


def build():
 write('parameters_iter'+args.iteration+'.json',P);t0=time.perf_counter();bpy.ops.wm.open_mainfile(filepath=args.input);body=bpy.data.objects['luceras_blockout'];original={o.name:signature(o) for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('lookdev_')};eyes=[]
 ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
 if len(ev.vertices)!=len(body.data.vertices) or not np.array_equal(array(ev.loops,'vertex_index',1,np.int32),array(body.data.loops,'vertex_index',1,np.int32)):
  raise RuntimeError('Surface binding requires topology-preserving modifiers and original vertex indices. Disable topology-changing modifiers before applying this groom.')
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and 'eye' in o.name.lower():eyes.append((np.array(body.matrix_world.inverted()@o.matrix_world.translation),.017))
 col=refine_pattern(body,transfer(body),eyes);setup_materials(body,col);curves=groom(body,col,eyes);saved_curve_checks(body,eyes);studio();after={name:signature(bpy.data.objects[name]) for name in original};write('geometry_check.json',{'unchanged':original==after,'before':original,'after':after,'source_sha256':hashlib.sha256(Path(args.input).read_bytes()).hexdigest(),'approved_source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()});bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'groom.blend'));write('build_state.json',{'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'parameters_sha256':hashlib.sha256(Path(args.parameters).read_bytes()).hexdigest(),'build_id':'B-spm3','blender':bpy.app.version_string,'seconds':time.perf_counter()-t0,'iteration':args.iteration,'input':args.input});render_views(['tail_plume','head','side','three_quarter','front','hind_leg','portrait','sprite'] if P.get('deliver_on_build',False) else args.views.split(','),args.mode=='build_final' or P.get('deliver_on_build',False))
 if P.get('proof_each_build',True) or P.get('deliver_on_build',False):deformation_proof()

def deformation_proof():
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'));body=bpy.data.objects['luceras_blockout'];before=signature(body)
 curves=[o for o in bpy.context.scene.objects if o.type=='CURVES']
 for o in curves:o.hide_set(False)
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();rest={o.name:array(o.evaluated_get(dg).data.attributes['position'].data,'vector') for o in curves}
 arm=bpy.data.armatures.new('Temporary hind and tail proof');rig=bpy.data.objects.new('Temporary hind and tail proof',arm);bpy.context.scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,head,tail in [('proof_fixed',(0,0,0),(0,0,.1)),('proof_hind',(.15,.17,.42),(.15,.10,.02)),('proof_tail',(0,.55,.28),(0,.69,.35))]:
  b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 bpy.ops.object.mode_set(mode='OBJECT')
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or o.name.startswith('lookdev_'):continue
  co=np.array([o.matrix_world@v.co for v in o.data.vertices]);wt=smooth(.55,.64,co[:,1]);wh=smooth(.03,.08,co[:,0])*smooth(-.03,.03,co[:,1])*(1-smooth(.30,.46,co[:,2]))*(1-wt)
  if not np.any(wt+wh):continue
  for name,w in [('proof_fixed',1-wt-wh),('proof_tail',wt),('proof_hind',wh)]:
   vg=o.vertex_groups.new(name=name)
   for i in np.where(w>0)[0]:vg.add([int(i)],float(w[i]),'REPLACE')
  mod=o.modifiers.new('Temporary proof armature','ARMATURE');mod.object=rig
 for name,degrees in [('proof_hind',-18),('proof_tail',-12)]:
  b=rig.pose.bones[name];b.rotation_mode='XYZ';b.rotation_euler.x=math.radians(degrees)
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();surf=array(body.evaluated_get(dg).data.vertices,'co');checks=[]
 for o in curves:
  d=o.data;count=len(d.curves);N=len(d.attributes['position'].data)//count;coords=array(o.evaluated_get(dg).data.attributes['position'].data,'vector');ids=np.stack([array(d.attributes['bind_i'+s].data,'value',1,np.int32) for s in 'abc'],axis=1);bar=np.stack([array(d.attributes['bind_'+s].data,'value',1) for s in 'abc'],axis=1);expected=np.einsum('ij,ijk->ik',bar,surf[ids]);error=np.linalg.norm(coords[::N]-expected,axis=1);move=np.linalg.norm(coords-rest[o.name],axis=1);l0=np.linalg.norm(np.diff(rest[o.name].reshape(-1,N,3),axis=1),axis=2).sum(1);l1=np.linalg.norm(np.diff(coords.reshape(-1,N,3),axis=1),axis=2).sum(1)
  checks.append({'object':o.name,'curves':count,'points_per_curve':N,'root_error_max_m':float(error.max()),'strand_length_error_max_m':float(abs(l1-l0).max()),'max_point_motion_m':float(move.max()),'moved_points':int(sum(move>1e-5))})
 passed=before==signature(body) and all(c['root_error_max_m']<.00002 and c['strand_length_error_max_m']<.00002 for c in checks) and all(c['max_point_motion_m']>.01 for c in checks if c['object'].startswith('Plume tuft '))
 write('deformation_check.json',{'method':'Temporary armature bends one hind leg18degrees and the tail12degrees. Evaluate every guide, body strand, authored tuft, eyelid, whisker and follicle against the deformed surface. Original base coordinates unchanged.','passed':passed,'sculpt_base_geometry_unchanged':before==signature(body),'objects':checks})
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'deformation_proof.blend'));s=bpy.context.scene;measure=json.loads((OUT/'measurements.json').read_text())
 for view in ('side','hind_leg','tail_plume'):
  s.camera=bpy.data.objects['groom_camera_'+view];s.render.resolution_x=768;s.render.resolution_y=768;s.render.resolution_percentage=100;s.cycles.samples=32;s.cycles.use_denoising=True;s.render.filepath=str(OUT/('deformation_'+view+'.png'));t0=time.perf_counter();bpy.ops.render.render(write_still=True);measure['frames'].append({'file':'deformation_'+view+'.png','iteration':args.iteration,'stage':'deformation','width':768,'height':768,'seconds':time.perf_counter()-t0,'samples':32,'denoise':True,'device':'CPU'});write('measurements.json',measure)


write('invocation_'+args.mode+'_iter'+args.iteration+'.json',{'epoch':time.time(),'utc':time.strftime('%Y-%m-%d %H:%M:%S UTC',time.gmtime()),'iteration':args.iteration,'mode':args.mode})

if args.mode in ('build','build_final'):build()
elif args.mode=='render':
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'));render_views(args.views.split(','),True)
elif args.mode=='deform':deformation_proof()
elif args.mode=='deliver':
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'groom.blend'));bpy.context.scene.cycles.samples=P['samples_final'];bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'groom.blend'));render_views(args.views.split(','),True);deformation_proof()
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

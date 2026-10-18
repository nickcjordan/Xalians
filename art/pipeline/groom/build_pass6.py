import bpy,numpy as np,json,math,sys,time,hashlib,argparse,resource
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent
ap=argparse.ArgumentParser();ap.add_argument('--mode',default='build');ap.add_argument('--views',default='paws_front,fore_three_quarter,hind_three_quarter');ap.add_argument('--iteration',default='1');ap.add_argument('--input',default='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass5/groom.blend');ap.add_argument('--out',default='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass6');ap.add_argument('--parameters',default=str(HERE/'parameters.json'));args=ap.parse_args(sys.argv[sys.argv.index('--')+1:])
OUT=Path(args.out);OUT.mkdir(exist_ok=True,parents=True);P=json.loads(Path(args.parameters).read_text());rng=np.random.default_rng(P['seed'])
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
def fingerprint():
 result={}
 for o in bpy.context.scene.objects:
  if o.type=='MESH':result[o.name]=signature(o)
  elif o.type=='CURVES':
   h=hashlib.sha256()
   for a in o.data.attributes:
    if a.data_type not in ('FLOAT','FLOAT_VECTOR','FLOAT_COLOR','INT','BOOLEAN'):continue
    dim={'FLOAT_VECTOR':3,'FLOAT_COLOR':4}.get(a.data_type,1);key={'FLOAT_VECTOR':'vector','FLOAT_COLOR':'color'}.get(a.data_type,'value');v=array(a.data,key,dim,np.int32 if a.data_type in ('INT','BOOLEAN') else np.float32);h.update(v.tobytes())
   result[o.name]={'data_sha256':h.hexdigest(),'hide_render':o.hide_render,'materials':[m.name for m in o.data.materials]}
 return result

def cameras():
 coll=bpy.data.collections['SWAPPABLE neutral studio']
 specs={'paws_front':((0,-.01,.045),(0,-1,.07),.48),'fore_side':((.039,-.143,.045),(1,0,.16),.145),'fore_three_quarter':((.039,-.143,.045),(.62,-1,.38),.145),'hind_side':((.16,.091,.045),(1,0,.16),.19),'hind_three_quarter':((.16,.091,.045),(.72,-1,.38),.19)}
 for name,(target,view,scale) in specs.items():
  d=bpy.data.cameras.new('groom_camera_'+name);d.type='ORTHO';d.ortho_scale=scale;o=bpy.data.objects.new(d.name,d);coll.objects.link(o);target=Vector(target);o.location=target+Vector(view)*5;o.rotation_mode='QUATERNION';o.rotation_quaternion=(target-o.location).to_track_quat('-Z','Y')

def paw_color(root,co,col):
 # Extend the nearest existing lower-leg pattern downward, with smooth blend.
 candidates=np.where((co[:,2]>.060)&(co[:,2]<.095))[0];kd=KDTree(len(candidates))
 for j,i in enumerate(candidates):kd.insert(Vector(co[i]),j)
 kd.balance();q=root.copy();q[:,2]=.072
 idx=np.array([candidates[kd.find(Vector(v))[1]] for v in q]);return col[idx,:3]

def flow_at(r,n):
 centers=np.array(P['fore_toe_centers']+P['hind_toe_centers']);dist=np.linalg.norm(np.c_[abs(r[:,0]),r[:,1]][:,None,:]-centers[None,:,:],axis=2);order=np.argsort(dist,axis=1);target=centers[order[:,0]].copy();target[:,1]-=.013
 v=np.c_[(target[:,0]-abs(r[:,0]))*np.sign(r[:,0]),target[:,1]-r[:,1],np.full(len(r),-.002)]
 v=unit(v);leg=smooth(.035,.072,r[:,2]);v=unit(v*(1-leg[:,None])+np.array([0,.08,-1])*leg[:,None]);tangent=unit(v-n*(v*n).sum(1)[:,None])
 groove=1-smooth(.0002,.003,dist[np.arange(len(r)),order[:,1]]-dist[np.arange(len(r)),order[:,0]])
 length=P['toe_length']+(P['paw_length']-P['toe_length'])*smooth(.008,.035,r[:,2]);length+= (P['fringe_length']-P['paw_length'])*smooth(.035,.065,r[:,2]);length*=1-.15*groove
 return unit(tangent*.86+n*P['lift']),length,groove

def build():
 bpy.ops.wm.open_mainfile(filepath=args.input);before=fingerprint();body=bpy.data.objects['luceras_blockout'];m=body.data;co=array(m.vertices,'co');norm=array(m.vertices,'normal');m.calc_loop_triangles();tris=array(m.loop_triangles,'vertices',3,np.int32);col=array(m.attributes['coat_color'].data,'color',4)
 # Only point attributes under the lowest 95 mm may change. All mesh positions and topology stay exact.
 outside_color_hash=hashlib.sha256(col[co[:,2]>=P['max_root_height']].tobytes()).hexdigest();low=co[:,2]<P['max_root_height'];newcol=paw_color(co[low],co,col);blend=1-smooth(.045,.085,co[low,2]);col[low,:3]=col[low,:3]*(1-blend[:,None])+newcol*blend[:,None];attr(m,'coat_color',col,'FLOAT_COLOR')
 for name in ('skin_gain','toe_break'):
  if name in m.attributes:
   v=array(m.attributes[name].data,'value',1);v[low]=v[low]*(1-blend)+(1 if name=='skin_gain' else 0)*blend;attr(m,name,v)
 density=(1-smooth(.075,P['max_root_height'],co[:,2]))*smooth(.002,.006,co[:,2]);density[norm[:,2]<-.6]=0
 ti,gi,gb,gr,gn=sample_roots(co,norm,tris,P['guides'],density)
 ci,cids,cb,cr,cn=sample_roots(co,norm,tris,P['children'],density)
 # Suppress sole roots, and do not seed outside the authorized leg height.
 keep=(cr[:,2]>.003)&(cr[:,2]<P['max_root_height'])&(cn[:,2]>-.65);cids,cb,cr,cn=[v[keep] for v in (cids,cb,cr,cn)]
 gd,gl,_=flow_at(gr,gn);cd,cl,groove=flow_at(cr,cn);kd=KDTree(len(gr))
 for j,r in enumerate(gr):kd.insert(Vector(r),j)
 kd.balance();near=np.array([kd.find(Vector(r))[1] for r in cr]);direction=unit(cd*.83+gd[near]*.17);cl*=rng.uniform(.88,1.12,len(cr));cl=np.clip(cl,.005,.012)
 N=9;t=np.linspace(0,1,N)[None,:,None];coords=cr[:,None,:]+direction[:,None,:]*cl[:,None,None]*t
 # Small guide-correlated clumps and restrained frizz, rooted exactly on the surface.
 clump=(gr[near]-cr);clump-=cn*(clump*cn).sum(1)[:,None];coords+=clump[:,None,:]*.10*t*t
 noise=rng.normal(size=(len(cr),3));noise-=cn*(noise*cn).sum(1)[:,None];coords+=noise[:,None,:]*.00017*np.sin(t*np.pi*2.0)*t
 coords[:,:,2]=np.maximum(coords[:,:,2],.0011)
 mat=bpy.data.materials.new('Pass6 paw Chiang pattern');mat.use_nodes=True;ns=mat.node_tree.nodes;lk=mat.node_tree.links;ns.clear();out=ns.new('ShaderNodeOutputMaterial');h=ns.new('ShaderNodeBsdfHairPrincipled');h.model='CHIANG';h.parametrization='COLOR';h.inputs['Roughness'].default_value=.65;h.inputs['Radial Roughness'].default_value=.55;at=ns.new('ShaderNodeAttribute');at.attribute_name='coat_color';mul=ns.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;mul.inputs[2].default_value=(.63,.63,.63,1);lk.new(at.outputs['Color'],mul.inputs[1]);lk.new(mul.outputs[0],h.inputs['Color']);lk.new(h.outputs[0],out.inputs['Surface'])
 colors=np.einsum('ij,ijk->ik',cb,col[cids,:3]);tree=bind_tree(body);child=make_curves('Pass6 continuous paw children',coords,cids,co,colors,mat,body,tree)
 gc=gr[:,None,:]+gd[:,None,:]*gl[:,None,None]*t;guide=make_curves('Pass6 paw guides',gc,gi,co,np.einsum('ij,ijk->ik',gb,col[gi,:3]),mat,body,tree);guide.hide_render=True;guide.hide_set(True)
 cameras();after=fingerprint();write('preservation_check.json',{'all_inherited_mesh_positions_topology_and_curve_data_unchanged':all(after[k]==v for k,v in before.items()),'before':before,'after':{k:after[k] for k in before},'changed_body_point_attributes_only_below_m':P['max_root_height'],'outside_mask_coat_color_unchanged':outside_color_hash==hashlib.sha256(col[~low].tobytes()).hexdigest(),'material_nodes_outside_new_paw_material':'unchanged','lights_world_ground':'loaded unchanged from pass5'})
 write('paw_checks.json',{'children':len(cr),'guides':len(gr),'root_min':cr.min(0).tolist(),'root_max':cr.max(0).tolist(),'minimum_strand_z':float(coords[:,:,2].min()),'nonfinite_points':int((~np.isfinite(coords)).sum()),'left_children':int(sum(cr[:,0]>0)),'right_children':int(sum(cr[:,0]<0)),'attachment':'Original triangle barycentrics and evaluated orthonormal triangle frames','length_min':float(cl.min()),'length_max':float(cl.max())})
 s=bpy.context.scene;s.cycles.device='CPU';s.render.threads_mode='FIXED';s.render.threads=6;s.camera=bpy.data.objects['groom_camera_side'];bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'groom.blend'))

def deform():
 body=bpy.data.objects['luceras_blockout'];before=signature(body);o=bpy.data.objects['Pass6 continuous paw children'];dg=bpy.context.evaluated_depsgraph_get();rest=array(o.evaluated_get(dg).data.attributes['position'].data,'vector')
 arm=bpy.data.armatures.new('Temporary lower hind proof');rig=bpy.data.objects.new(arm.name,arm);bpy.context.scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,head,tail in [('proof_fixed',(0,0,0),(0,0,.1)),('proof_paw',(.16,.09,.095),(.16,.09,.015))]:
  b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 bpy.ops.object.mode_set(mode='OBJECT')
 for ob in list(bpy.context.scene.objects):
  if ob.type!='MESH' or ob.name.startswith('lookdev_'):continue
  co=np.array([ob.matrix_world@v.co for v in ob.data.vertices]);w=smooth(.08,.11,co[:,0])*smooth(0,.04,co[:,1])*(1-smooth(.06,.095,co[:,2]))
  if not np.any(w):continue
  for name,weights in [('proof_fixed',1-w),('proof_paw',w)]:
   vg=ob.vertex_groups.new(name=name)
   for i in np.where(weights>0)[0]:vg.add([int(i)],float(weights[i]),'REPLACE')
  mod=ob.modifiers.new('Temporary proof armature','ARMATURE');mod.object=rig
 bone=rig.pose.bones['proof_paw'];bone.rotation_mode='XYZ';bone.rotation_euler.x=math.radians(-16)
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();surf=array(body.evaluated_get(dg).data.vertices,'co');d=o.data;coords=array(o.evaluated_get(dg).data.attributes['position'].data,'vector');ids=np.stack([array(d.attributes['bind_i'+v].data,'value',1,np.int32) for v in 'abc'],axis=1);bar=np.stack([array(d.attributes['bind_'+v].data,'value',1) for v in 'abc'],axis=1);expected=np.einsum('ij,ijk->ik',bar,surf[ids]);err=np.linalg.norm(coords[::9]-expected,axis=1);move=np.linalg.norm(coords-rest,axis=1)
 write('deformation_check.json',{'base_mesh_unchanged':before==signature(body),'max_root_error_m':float(err.max()),'max_point_motion_m':float(move.max()),'moved_points':int(sum(move>1e-5)),'passed':before==signature(body) and float(err.max())<.00002 and float(move.max())>.005,'method':'Temporary 16 degree bone bend restricted to one hind paw and lowest 95 mm of leg; claws follow the same bone; evaluated hair roots compared with deformed surface barycentrics.'})
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'deformation_proof.blend'))

def render():
 if args.mode!='build':bpy.ops.wm.open_mainfile(filepath=args.input if args.mode=='baseline' else str(OUT/'groom.blend'))
 if args.mode=='baseline':cameras()
 if args.mode=='deform':deform()
 s=bpy.context.scene;s.cycles.device='CPU';s.render.threads_mode='FIXED';s.render.threads=6
 measure=json.loads((OUT/'measurements.json').read_text()) if (OUT/'measurements.json').exists() else {'build_id':'B-svtw','device':'CPU','frames':[]}
 for view in args.views.split(','):
  final=args.mode in ('final','baseline');size=900 if final else 600;w=size;h=size
  if view in ('side','three_quarter'):w,h=(1374,1145) if final else (900,750)
  if view=='paws_front':w,h=(1200,480) if final else (900,360)
  if view=='sprite':w=h=768
  s.camera=bpy.data.objects['groom_camera_'+view];s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100;s.cycles.samples=128 if view=='sprite' else P['samples_final'] if final else P['samples_preview'];s.cycles.use_denoising=view!='sprite'
  prefix='deformation_' if args.mode=='deform' else 'pass5_' if args.mode=='baseline' else 'render_' if final else 'iter'+args.iteration+'_';s.render.filepath=str(OUT/(prefix+view+'.png'));t0=time.perf_counter();bpy.ops.render.render(write_still=True)
  measure['frames'].append({'file':Path(s.render.filepath).name,'seconds':time.perf_counter()-t0,'width':w,'height':h,'samples_max':s.cycles.samples,'denoise':s.cycles.use_denoising,'device':s.cycles.device,'host_peak_gib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024**2});write('measurements.json',measure)
if args.mode=='build':build()
render()

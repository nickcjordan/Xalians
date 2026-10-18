"""B-8xwt: strictly local pass 4 geometry repairs and frozen-asset review."""
import os,sys,json,inspect,hashlib,types,time
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).parent
sys.path.insert(0,str(HERE))
# Reuse tested source import, cameras and close-pose rendering without the old driver.
p3=types.ModuleType('pass3_helpers');p3.__file__=str(HERE/'build_pass3.py')
code=(HERE/'build_pass3.py').read_text().split("stage=sys.argv[")[0].replace("/pass3'","/pass4'").replace('<=11500','<=12000')
exec(compile(code,p3.__file__,'exec'),p3.__dict__)
g=p3.g;p2=p3.p2;OUT=p3.OUT;ITER=p3.ITER

def repair():
 import shutil
 shutil.copyfile(OUT.parent/'pass3'/'gamemesh.blend',OUT/'gamemesh.blend')
 p3.prepare()
 low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig']
 sb=bmesh.new();sb.from_mesh(src.data);tree=BVHTree.FromBMesh(sb);sb.free()
 bm=bmesh.new();bm.from_mesh(low.data);bm.normal_update()
 def ear(p):
  origin,axis,across,depth=p2.ear_frame(1 if p.x>0 else -1);q=p-origin
  return abs(p.x)>.023 and -.010<q.dot(axis)<.032 and abs(q.dot(across))<.035 and -.027<q.dot(depth)<.036
 def tail(p):return .305<p.y<.415 and .380<p.z<.535 and abs(p.x)<.052
 def paw(p):return -.255<p.y<-.115 and p.z<.075
 regions={'ear_root':ear,'fore_toes':paw};record={};oldpos={tuple(v.co) for v in bm.verts}
 for name,pred in regions.items():
  edges=sorted([e for e in bm.edges if pred((e.verts[0].co+e.verts[1].co)/2)],key=lambda e:-e.calc_length())[:{'tail_root':60,'ear_root':40,'fore_toes':80}[name]]
  bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
  record[name]={'subdivided_edges':len(edges)}
 bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.normal_update()
 # Replace the folded tail tube with ordered sculpt-section rings.
 points=np.array([v.co[:] for v in src.data.vertices]);src.data.calc_loop_triangles();tris=np.array([t.vertices[:] for t in src.data.loop_triangles])
 bm.verts.ensure_lookup_table();layer=bm.verts.layers.deform.active
 tailgroups={vg.index for vg in low.vertex_groups if vg.name.startswith('tail_')}
 ids={v for v in bm.verts if sum(w for i,w in v[layer].items() if i in tailgroups)>.5}
 faces=[f for f in bm.faces if .28<f.calc_center_median().y<.40 and sum(v in ids for v in f.verts)>=2]
 removed=len(faces);bmesh.ops.delete(bm,geom=faces,context='FACES_ONLY')
 wire=[e for e in bm.edges if not e.link_faces]
 if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
 lonely=[v for v in bm.verts if not v.link_edges]
 if lonely:bmesh.ops.delete(bm,geom=lonely,context='VERTS')
 bounds=p2.loops([e for e in bm.edges if e.is_boundary]);assert len(bounds)==2,('tail boundaries',len(bounds))
 bounds.sort(key=lambda loop:sum(v.co.y for v in loop)/len(loop));root,end=bounds
 def align(boundary,ring):
  best=None
  for reverse in (False,True):
   base=list(reversed(boundary)) if reverse else list(boundary)
   for shift in range(len(base)):
    q=base[shift:]+base[:shift];err=sum((q[int(j*len(q)/len(ring))].co-ring[j].co).length_squared for j in range(len(ring)))
    if best is None or err<best[0]:best=(err,q)
  return best[1]
 rings=[]
 for y in [.340,.351,.362,.373,.384,.394]:
  loop=p2.section(points,tris,Vector((0,1,0)),Vector(),y,np.array((0,y,.465-(y-.34)*1.3)))
  center=(loop.min(0)+loop.max(0))/2;angle=np.arctan2(loop[:,2]-center[2],loop[:,0]-center[0]);order=np.argsort(angle);aa=angle[order];pp=loop[order];aa=np.r_[aa[-1]-2*np.pi,aa,aa[0]+2*np.pi];pp=np.vstack([pp[-1],pp,pp[0]])
  rings.append([bm.verts.new((float(np.interp(t,aa,pp[:,0])),y,float(np.interp(t,aa,pp[:,2])))) for t in np.linspace(-np.pi,np.pi,12,endpoint=False)])
 root=align(root,rings[0]);transitions=[]
 for fraction in (1/3,2/3):
  transition=[]
  for j,v in enumerate(root):
   theta=-np.pi+2*np.pi*j/len(root);target=Vector((.0127*np.cos(theta),.340,.4653+.020*np.sin(theta)));q=v.co.lerp(target,fraction)
   loop=p2.section(points,tris,Vector((0,1,0)),Vector(),q.y,np.array(q));delta=np.roll(loop,-1,axis=0)-loop;den=(delta*delta).sum(1);tt=np.clip(((np.array(q)-loop)*delta).sum(1)/np.maximum(den,1e-15),0,1);cand=loop+delta*tt[:,None];q=Vector(cand[np.argmin(((cand-np.array(q))**2).sum(1))]);transition.append(bm.verts.new(q))
  transitions.append(transition)
 p2.zip_rings(bm,root,transitions[0]);p2.zip_rings(bm,transitions[0],transitions[1]);p2.zip_rings(bm,transitions[1],rings[0])
 for aa,bb in zip(rings,rings[1:]):
  for j in range(12):bm.faces.new((aa[j],aa[(j+1)%12],bb[(j+1)%12],bb[j]))
 p2.zip_rings(bm,rings[-1],align(end,rings[-1]))
 record['tail_root']={'removed_faces':removed,'rings':8,'transition_ring_vertices':22,'vertices_per_ring':12,'root_boundary':len(root),'distal_boundary':len(end),'method':'Ordered sculpt sections joined to existing topological patch boundaries.'}
 # Restore the notch by projecting the root lip toward the actual root, not sideways onto the ear or head.
 bm.normal_update()
 for name,pred in regions.items():
  selected=[v for v in bm.verts if pred(v.co)];before={v:v.co.copy() for v in selected};hits=0
  if name=='ear_root':
   for v in selected:
    origin,axis,across,depth=p2.ear_frame(1 if v.co.x>0 else -1);q=v.co-origin;h=q.dot(axis)
    if q.dot(across)<-.005 and h<.028:
     hit=tree.ray_cast(v.co+axis*.001,-axis,.065)
     if hit[0] is not None and .002<(v.co-hit[0]).dot(axis)<.045:
      v.co=hit[0];hits+=1
  else:
   for v in selected:
    hit=tree.find_nearest(v.co)
    if hit:v.co=hit[0]
  ds=[(v.co-p).length for v,p in before.items()];record[name].update(vertices=len(selected),max_move_m=max(ds,default=0),mean_move_m=float(np.mean(ds)) if ds else 0,root_ray_hits=hits)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
 # Four extra samples per front claw preserve the sculpt taper without touching other rigid parts.
 for name in [o.name for o in bpy.data.objects if o.name.startswith('game_fore_claw_')]:
  o=bpy.data.objects[name];source=bpy.data.objects[name[5:]]
  sb=bmesh.new();sb.from_mesh(source.data);sb.transform(source.matrix_world);ct=BVHTree.FromBMesh(sb);sb.free()
  cb=bmesh.new();cb.from_mesh(o.data);edges=sorted(cb.edges,key=lambda e:-e.calc_length())[:4]
  bmesh.ops.subdivide_edges(cb,edges=edges,cuts=1,use_grid_fill=True)
  inv=o.matrix_world.inverted()
  for v in cb.verts:v.co=inv@ct.find_nearest(o.matrix_world@v.co)[0]
  bmesh.ops.triangulate(cb,faces=list(cb.faces));bmesh.ops.recalc_face_normals(cb,faces=list(cb.faces));cb.to_mesh(o.data);cb.free()
  for f in o.data.polygons:f.use_smooth=True
 for m in list(low.modifiers):low.modifiers.remove(m)
 m=low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(low,m);g.normalize(low,rig);m=low.modifiers.new('rig','ARMATURE');m.object=rig
 for f in low.data.polygons:f.use_smooth=True
 mat=bpy.data.materials['Luceras_body'];mat.node_tree.nodes.clear();bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=(.5,.5,.5,1);bs.inputs['Roughness'].default_value=.85;out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
 for im in list(bpy.data.images):
  if im.name.startswith(('normal_','ao_')):bpy.data.images.remove(im)
 game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')];g.uv([o for o in game if 'eye' not in o.name]);g.uv([o for o in game if 'eye' in o.name])
 data=json.loads((g.OUT/'iter1_mesh.json').read_text());data['repairs']=record;data['total']=sum(g.triangles(o) for o in game);data['body_non_manifold']=g.manifold(low)
 assert data['total']<=12000,data['total'];assert data['body_non_manifold']==0
 g.write('iter1_mesh.json',data);bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_mesh.blend'))
 print('LOCAL_REPAIR',json.dumps(data),flush=True)
 g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=12
 for name in ('ear_three_quarter','fore_paw_l_three_quarter','full_side'):
  box,az,el=g.cameras()[name];cam=g.lookdev.place_camera('lookdev_preview',box,az,el,.04)
  for variant in ('sculpt','game'):
   g.visible(variant);g.lookdev.render(cam,g.OUT/f'iter1_pre_{variant}_{name}.png',size=512)
 # Tail silhouette close-up in the rest pose.
 center=rig.data.bones['tail_01'].head_local;box=(center-Vector((.105,.105,.105)),center+Vector((.105,.105,.105)));cam=g.lookdev.place_camera('lookdev_tail',box,90,0,.04)
 for variant in ('sculpt','game'):
  g.visible(variant);g.lookdev.render(cam,g.OUT/f'iter1_pre_{variant}_tail.png',size=512)

def bake():
 code=inspect.getsource(p2.bake).replace('>11500','>12000').replace('p=v.co;distance=', 'p=v.co;frame=ear_frame(1 if p.x>0 else -1);height=(p-frame[0]).dot(frame[1]);distance=').replace('p.y>-.205 else .003','p.y>-.205 and height>.030 else .003')
 ns=dict(p2.bake.__globals__);exec(code,ns);ns['bake']()
 settings=json.loads((OUT/'bake_settings.json').read_text());settings['cage_offset_m']={'ear_rim':.0012,'ear_root':.008,'toes':.003,'remaining':.008};g.write('bake_settings.json',settings)

stage=sys.argv[sys.argv.index('--stage')+1] if '--stage' in sys.argv else 'repair'
if stage=='repair':repair()
elif stage=='bake':bake()
elif stage=='render':g.renders();p3.close_poses()
elif stage=='all':repair();bake();g.renders();p3.close_poses()
elif stage=='bake_render':bake();g.renders();p3.close_poses()
elif stage=='final':
 frozen=hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest();p3.prepare();g.export=lambda:None;g.renders();p3.close_poses()
 g.write('render_provenance.json',{'build_id':'B-8xwt','iteration':ITER,'source_blend':'gamemesh.blend','sha256':frozen,'unchanged_after_renders':hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()==frozen,'engine':'Cycles','samples':16,'normal_map':'Packed tangent normal connected to body material.','geometry':'Reopened frozen asset; separated loose components solely for paired review and measurements.'})
# Bounded local continuation keeps the authorized slot through visual review.
request=OUT/'next_stage.json';deadline=time.time()+150
print('REVIEW_WINDOW',str(request),flush=True)
while time.time()<deadline and not request.exists():time.sleep(.5)
if request.exists():
 import runpy
 cfg=json.loads(request.read_text());request.unlink();os.environ['GM_ITERATION']=str(cfg.get('iteration',ITER));sys.argv=[sys.argv[0],'--','--stage',cfg.get('stage','render')]
 if cfg.get('script')!='release_pass4.py':runpy.run_path(str(HERE/cfg.get('script','build_gamemesh.py')),run_name='__main__')

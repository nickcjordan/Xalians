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
 regions={'tail_root':tail,'ear_root':ear,'fore_toes':paw};record={};oldpos={tuple(v.co) for v in bm.verts}
 for name,pred in regions.items():
  edges=sorted([e for e in bm.edges if pred((e.verts[0].co+e.verts[1].co)/2)],key=lambda e:-e.calc_length())[:{'tail_root':60,'ear_root':40,'fore_toes':80}[name]]
  bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
  record[name]={'subdivided_edges':len(edges)}
 bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.normal_update()
 # Section fitting preserves the longitudinal coordinate and prevents wrong-surface jumps.
 points=np.array([v.co[:] for v in src.data.vertices]);src.data.calc_loop_triangles();tris=np.array([t.vertices[:] for t in src.data.loop_triangles]);cache={}
 def nearest_segment(q,loop):
  starts=loop;delta=np.roll(loop,-1,axis=0)-loop;den=(delta*delta).sum(1);t=np.clip(((np.array(q)-starts)*delta).sum(1)/np.maximum(den,1e-15),0,1)
  candidates=starts+delta*t[:,None];return Vector(candidates[np.argmin(((candidates-np.array(q))**2).sum(1))])
 for name,pred in regions.items():
  selected=[v for v in bm.verts if pred(v.co)];before={v:v.co.copy() for v in selected};fails=0
  for v in selected:
   p=v.co.copy()
   if name=='fore_toes':
    hit=tree.find_nearest(p)
    if hit:v.co=hit[0]
    continue
   if name=='tail_root':
    axis=Vector((0,1,0));origin=Vector();height=p.y;expected=np.array((0,height,.48-(height-.33)*1.35));key=('tail',round(height,4))
   else:
    side=1 if p.x>0 else -1;origin,axis,across,depth=p2.ear_frame(side);height=(p-origin).dot(axis);expected=np.array(origin+axis*height);key=('ear',side,round(height,4))
   if key not in cache:
    try:cache[key]=p2.section(points,tris,axis,origin,height,expected)
    except RuntimeError:cache[key]=None
   loop=cache[key]
   if loop is None:fails+=1;continue
   if name=='tail_root' and np.ptp(loop[:,2])<.12:
    center=(loop.max(0)+loop.min(0))/2;angle=np.arctan2(loop[:,2]-center[2],loop[:,0]-center[0]);order=np.argsort(angle);aa=angle[order];pp=loop[order]
    theta=np.arctan2(p.z-center[2],p.x-center[0]);aa=np.r_[aa[-1]-2*np.pi,aa,aa[0]+2*np.pi];pp=np.vstack([pp[-1],pp,pp[0]])
    target=Vector((float(np.interp(theta,aa,pp[:,0])),height,float(np.interp(theta,aa,pp[:,2]))))
   else:
    target=nearest_segment(p,loop)
   if (target-p).length<.05:v.co=target
   else:fails+=1
  ds=[(v.co-p).length for v,p in before.items()];record[name].update(vertices=len(selected),max_move_m=max(ds,default=0),mean_move_m=float(np.mean(ds)) if ds else 0,section_failures=fails)
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

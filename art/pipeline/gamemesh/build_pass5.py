"""B-sgkc: source-only weighted Collapse decimation and frozen asset evidence."""
import sys,os,json,types,hashlib,inspect,time
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
HERE=Path(__file__).parent
sys.path.insert(0,str(HERE))
import importlib,build_pass1,build_pass2
importlib.reload(build_pass1.lookdev);importlib.reload(build_pass1);importlib.reload(build_pass2)
p3=types.ModuleType('review_helpers');p3.__file__=str(HERE/'build_pass3.py')
code=(HERE/'build_pass3.py').read_text().split("stage=sys.argv[")[0].replace("/pass3'","/pass5'")
exec(compile(code,p3.__file__,'exec'),p3.__dict__)
g=p3.g;p2=p3.p2;OUT=p3.OUT;ITER=p3.ITER
# Restrict cycle search to the local bend, avoiding neighboring anatomy.
ring_code=('def verify_final_rings'+(HERE/'build_pass2.py').read_text().split('def verify_final_rings')[1].split('def mesh():')[0]).replace('<.35','<(0.10 if name.startswith("neck_") or name.endswith("_01") and name.startswith("leg_") else 0.045 if name.startswith("tail_") else 0.065)')
exec(ring_code,p2.__dict__)

def check_topology(o):
 bm=bmesh.new();bm.from_mesh(o.data)
 r={'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'inconsistent_winding_edges':sum(not e.is_contiguous for e in bm.edges if e.is_manifold),'zero_area_faces':sum(f.calc_area()<1e-14 for f in bm.faces),'signed_volume_m3':bm.calc_volume(signed=True)}
 bm.free();return r

def mesh():
 from datetime import datetime,timezone
 deadline=os.environ.get('GM_EDIT_DEADLINE')
 if deadline and datetime.now(timezone.utc).isoformat()>deadline:raise RuntimeError('User geometry edit cutoff reached before mesh start')
 assert (OUT/'sculpt_check.json').exists()
 bpy.ops.wm.open_mainfile(filepath=g.SOURCE)
 rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='POSE';rig.hide_set(False);rig.hide_viewport=False;g.clips.Poser(rig).reset();bpy.context.view_layer.update()
 src=bpy.data.objects['luceras_blockout'];originals=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('lookdev_')]
 low=g.duplicate(src,'game_body');low.modifiers.clear();low.vertex_groups.clear()
 before=check_topology(low)
 # Only repair inconsistent source winding on the working copy, without moving vertices.
 if before['inconsistent_winding_edges'] or before['signed_volume_m3']<0:
  bm=bmesh.new();bm.from_mesh(low.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free()
 vg=low.vertex_groups.new(name='detail_density');collapse=low.vertex_groups.new(name='collapse_control');counts={'1.0':0,'0.4':0,'0.1':0}
 joints=[b.head_local for b in rig.data.bones if b.name.startswith(('leg_','neck_'))]
 for v in low.data.vertices:
  p=v.co
  detail=(p.y<-.10 and p.z>.43) or p.z<.09 or (p.y>.285 and p.y<.54 and p.z>.27)
  joint=min((p-q).length for q in joints)<.065
  w=1. if detail else .4 if joint else .1
  vg.add([v.index],w,'REPLACE');collapse.add([v.index],1-.95*w,'REPLACE');counts[str(w)]+=1
 m=low.modifiers.new('Weighted Collapse X','DECIMATE');m.decimate_type='COLLAPSE';m.use_collapse_triangulate=True;m.use_symmetry=True;m.symmetry_axis='X';m.vertex_group=collapse.name;m.vertex_group_factor=float(os.environ.get('GM_DENSITY_FACTOR','0.001'))
 target=int(os.environ.get('GM_BODY_TARGET','9500'));m.ratio=target/g.triangles(low)
 deps=bpy.context.evaluated_depsgraph_get();history=[]
 for i in range(4):
  bpy.context.view_layer.update();ev=low.evaluated_get(deps);ev.data.calc_loop_triangles();n=len(ev.data.loop_triangles);history.append({'ratio':m.ratio,'triangles':n})
  if abs(n-target)<8:break
  m.ratio*=target/max(n,1)
 g.apply(low,m);low.vertex_groups.clear()
 after=check_topology(low)
 assert after['non_manifold_edges']==0,after
 assert after['zero_area_faces']==0,after
 if after['inconsistent_winding_edges']:
  bm=bmesh.new();bm.from_mesh(low.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free()
 m=low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(low,m);fixed=g.normalize(low,rig);m=low.modifiers.new('rig','ARMATURE');m.object=rig
 bodymat=g.material('Luceras_body',(.5,.5,.5));eyemat=g.material('Luceras_eyes',(.12,.12,.12));g.assign(low,bodymat)
 game=[low];pairs=[(src,low)];removed=[]
 for source in originals:
  if source==src:continue
  if 'whisker' in source.name:removed.append(source.name);continue
  if not any(k in source.name for k in ('horn','eye','claw')):continue
  o=g.duplicate(source,'game_'+source.name)
  for mod in list(o.modifiers):
   if mod.type=='ARMATURE':o.modifiers.remove(mod)
   else:g.apply(o,mod)
  target=600 if 'horn' in source.name else 180 if 'eye' in source.name else 24
  if g.triangles(o)>target:
   mod=o.modifiers.new('Collapse silhouette','DECIMATE');mod.decimate_type='COLLAPSE';mod.use_collapse_triangulate=True;mod.ratio=target/g.triangles(o);g.apply(o,mod)
  g.bind_rigid(o,rig,source.parent_bone);g.assign(o,eyemat if 'eye' in source.name else bodymat);game.append(o);pairs.append((source,o))
 total=sum(g.triangles(o) for o in game);assert total<=11500,total
 g.uv([o for o in game if 'eye' not in o.name]);g.uv([o for o in game if 'eye' in o.name])
 for o in originals:o.hide_render=True;o.hide_set(True)
 for o in list(bpy.data.objects):
  if o.name.startswith('lookdev_'):bpy.data.objects.remove(o,do_unlink=True)
 data={'method':'Collapse decimation from approved sculpt. X symmetry and triangulate enabled. No remesh, smoothing, projection or patches.','density_weights':counts,'collapse_control':'1 - 0.95 * importance, so high importance increases collapse cost without locking any vertex.','weight_semantics_reference':'https://raw.githubusercontent.com/blender/blender/main/source/blender/bmesh/tools/bmesh_decimate_collapse.cc','vertex_group_factor':float(os.environ.get('GM_DENSITY_FACTOR','0.001')),'ratio_trials':history,'body_triangles':g.triangles(low),'total':total,'pairs':[(a.name,b.name) for a,b in pairs],'removed_whiskers':removed,'topology_before':before,'topology_after':check_topology(low),'unweighted_repaired':fixed,'uv_method':'Smart project 66 degrees, average island scale, pack fraction margin 8/1024. Automatic seams, underside preference not guaranteed.'}
 g.write('iter1_mesh.json',data);g.write('iter1_decimation.json',data);bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_mesh.blend'));print('MESH_RESULT',json.dumps(data),flush=True)

def bake():
 # Small matched-part cages reduce crossed rays on the thin sculpt features.
 code=inspect.getsource(p2.bake).replace("distance=.0012 if dst.name=='game_body' and abs(p.x)>.045 and p.z>.59 and p.y>-.205 else .003 if dst.name=='game_body' and p.z<.05 else .008", "distance=.004 if dst.name=='game_body' and abs(p.x)>.035 and p.z>.585 and p.y<-.10 else .004 if dst.name=='game_body' and p.z<.09 else .008")
 ns=dict(p2.bake.__globals__);exec(code,ns);ns['bake']()
 data=json.loads((OUT/'bake_settings.json').read_text());data['cage_offset_m']={'ears':.004,'paws':.004,'remaining':.008};g.write('bake_settings.json',data)

def final():
 bpy.ops.wm.open_mainfile(filepath=str(g.OUT/'iter1_baked.blend'));g.export()
 frozen=hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()
 p3.prepare();g.write('iter1_mesh.json',dict(json.loads((g.OUT/'iter1_decimation.json').read_text()),pairs=json.loads((g.OUT/'iter1_mesh.json').read_text())['pairs']));p2.joint_rings(bpy.data.objects['game_body'],bpy.data.objects['luceras_rig']);g.export=lambda:None;g.renders();p3.close_poses()
 g.write('render_provenance.json',{'build_id':'B-sgkc','iteration':ITER,'source_blend':'gamemesh.blend','sha256':frozen,'unchanged_after_renders':hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()==frozen,'engine':'Cycles','samples':16,'normal_map':'Packed tangent normal connected to body material.','geometry':'Reopened frozen exported asset. Loose components separated for review without coordinate, weight, UV or topology edits.'})

stage=sys.argv[sys.argv.index('--stage')+1] if '--stage' in sys.argv else 'all'
if stage=='mesh':mesh()
elif stage=='bake':bake()
elif stage=='final':final()
elif stage=='nearest':
 import shutil,surface_normal_bake
 for name in ('baked.blend','mesh.json','decimation.json'):shutil.copyfile(OUT/f'iter3_{name}',g.OUT/f'iter1_{name}')
 surface_normal_bake.run(g);final()
elif stage=='rebake':
 import shutil
 source_iteration=int(os.environ.get('GM_GEOMETRY_ITERATION','2'))
 for name in ('mesh.blend','mesh.json','decimation.json'):shutil.copyfile(OUT/f'iter{source_iteration}_{name}',g.OUT/f'iter1_{name}')
 bake();final()
elif stage=='all':
 import surface_normal_bake
 mesh();bake();surface_normal_bake.run(g);final()
# Brief local review window permits an explicit next iteration under the same lock.
request=OUT/'next_stage.json';deadline=time.time()+90
print('REVIEW_WINDOW',flush=True)
while time.time()<deadline and not request.exists():time.sleep(.5)
if request.exists():
 import runpy
 cfg=json.loads(request.read_text());request.unlink()
 os.environ['GM_ITERATION']=str(cfg.get('iteration',ITER))
 for key,value in cfg.get('environment',{}).items():os.environ[key]=str(value)
 sys.argv=[sys.argv[0],'--','--stage',cfg.get('stage','all')]
 if cfg.get('stage')!='release':runpy.run_path(str(HERE/cfg.get('script','build_gamemesh.py')),run_name='__main__')

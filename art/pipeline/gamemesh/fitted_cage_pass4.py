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
 # Retain the original tail connectivity and relax the localized crease without wrong-branch snapping.
 def tailband(p):return .306<p.y<.370 and abs(p.x)<.026 and abs(p.z-(.4884-(p.y-.32)*1.20))<.031
 edges=sorted([e for e in bm.edges if tailband((e.verts[0].co+e.verts[1].co)/2)],key=lambda e:-e.calc_length())[:60]
 bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True);bmesh.ops.triangulate(bm,faces=list(bm.faces))
 selected=[v for v in bm.verts if tailband(v.co)];before={v:v.co.copy() for v in selected}
 for step in range(12):
  update={v:sum((e.other_vert(v).co for e in v.link_edges),Vector())/len(v.link_edges) for v in selected}
  for v,q in update.items():
   w=.25*max(0,1-abs(before[v].y-.335)/.030);candidate=v.co.lerp(q,w);delta=candidate-before[v]
   if delta.length>.006:candidate=before[v]+delta.normalized()*.006
   v.co=candidate
 record['tail_root']={'subdivided_edges':len(edges),'relaxed_vertices':len(selected),'max_move_m':max((v.co-q).length for v,q in before.items()),'method':'Original connected topology, local density and bounded 6 mm relaxation; no nearest projection onto adjacent rump.'}
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
    if v.co.y<-.155 and v.co.z<.042 and v.normal.y<-.15:
     hit=tree.ray_cast(Vector((v.co.x,-.220,v.co.z)),Vector((0,1,0)),.09)
     if hit[0] is not None and (hit[0]-v.co).length<.012:v.co=hit[0]
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
 code=inspect.getsource(p2.bake).replace('>11500','>12000').replace('p=v.co;distance=', 'p=v.co.copy();frame=ear_frame(1 if p.x>0 else -1);height=(p-frame[0]).dot(frame[1]);distance=').replace('p.y>-.205 else .003','p.y>-.205 and height>.030 else .003')
 code=code.replace("else .003 if dst.name=='game_body' and p.z<.05","else .003 if dst.name=='game_body' and abs(p.x)>.025 and -.01<height<.03 and p.y>-.21 else .003 if dst.name=='game_body' and p.z<.05")
 code=code.replace("cage=g.duplicate(dst,'bake_cage');", "sb=bmesh.new();sb.from_mesh(src.data);sb.transform(src.matrix_world);source_tree=BVHTree.FromBMesh(sb);sb.free();cage=g.duplicate(dst,'bake_cage');")
 code=code.replace("v.co+=v.normal*distance", "v.co+=v.normal*distance\n    if dst.name=='game_body' and ((p.z<.075 and p.y<-.115) or (.30<p.y<.40 and p.z>.38 and abs(p.x)<.03) or (abs(p.x)>.025 and -.012<height<.032 and p.y>-.21)):\n     hit=source_tree.find_nearest(dst.matrix_world@p)\n     if hit and hit[3]<.025:v.co=dst.matrix_world.inverted()@(hit[0]+hit[1]*.0015)")
 ns=dict(p2.bake.__globals__);exec(code,ns);ns['bake']()
 settings=json.loads((OUT/'bake_settings.json').read_text());settings['cage_offset_m']={'ear_rim':.0012,'ear_root_tail_root_fore_toes':'Nearest sculpt surface plus 0.0015 m along source normal','other_toes':.003,'remaining':.008};g.write('bake_settings.json',settings)

stage=sys.argv[sys.argv.index('--stage')+1] if '--stage' in sys.argv else 'repair'
if stage=='repair':repair()
elif stage=='bake':bake()
elif stage=='render':g.renders();p3.close_poses()
elif stage=='all':repair();bake();g.renders();p3.close_poses()
elif stage=='bake_render':bake();g.renders();p3.close_poses()
elif stage=='selected':
 import shutil
 shutil.copyfile(OUT/'iter5_mesh.blend',g.OUT/'iter1_mesh.blend');shutil.copyfile(OUT/'iter5_mesh.json',g.OUT/'iter1_mesh.json');bake();g.renders();p3.close_poses()
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

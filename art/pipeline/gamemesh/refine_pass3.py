"""B-db8w iteration 4: side-aware ear fit, tail-section fit, toe-seat density."""
import sys,os,json,inspect,runpy,math
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3');g.ITERATION=int(os.environ.get('GM_ITERATION','4'));g.OUT=g.IterationOutput(str(OUT));p2.OUT=g.OUT
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter3_review.blend'))
low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset();bpy.context.view_layer.update()
points=[v.co.copy() for v in src.data.vertices];src.data.calc_loop_triangles();tris=[tuple(t.vertices) for t in src.data.loop_triangles];full=BVHTree.FromPolygons(points,tris,all_triangles=True)
bm=bmesh.new();bm.from_mesh(low.data);bm.normal_update();record={}
for side in (1,-1):
 origin,axis,across,depth=p2.ear_frame(side)
 trees={sign:BVHTree.FromPolygons(points,[tuple(p.vertices) for p in src.data.polygons if p.normal.dot(depth)*sign>.05]) for sign in (1,-1)}
 selected=[v for v in bm.verts if v.co.x*side>.025 and -.008<(v.co-origin).dot(axis)<.034 and abs((v.co-origin).dot(across))<.035 and -.024<(v.co-origin).dot(depth)<.035]
 normals={v:v.normal.copy() for v in selected};before=[v.co.copy() for v in selected]
 for step in range(6):
  update={v:sum((e.other_vert(v).co for e in v.link_edges),Vector())/len(v.link_edges) for v in selected if v.link_edges}
  for v in selected:
   q=v.co.lerp(update.get(v,v.co),.12);tree=trees[1 if normals[v].dot(depth)>0 else -1];hit=tree.find_nearest(q)
   if hit and hit[3]<.025:v.co=q.lerp(hit[0],.55)
 record['ear_'+str(side)]={'vertices':len(selected),'max_move_m':max([(v.co-q).length for v,q in zip(selected,before)],default=0)}
# Fit the tail to its own closed sculpt sections, avoiding the adjacent haunch surface.
arr=np.array(points);triarr=np.array(tris);triarr=triarr[(arr[triarr,1].max(1)>.33)&(arr[triarr,1].min(1)<.46)]
cache={};moved=[]
for v in bm.verts:
 if not (.35<v.co.y<.44 and abs(v.co.x)<.05 and v.co.z>.37):continue
 y=float(v.co.y);key=round(y,5)
 if key not in cache:
  try:loop=p2.section(arr,triarr,Vector((0,1,0)),Vector(),y,np.array((0,y,.46)))
  except RuntimeError:continue
  if np.ptp(loop[:,2])>.10:continue
  cache[key]=loop
 loop=cache[key];center=(loop.min(0)+loop.max(0))/2;angle=np.arctan2(loop[:,2]-center[2],loop[:,0]-center[0]);order=np.argsort(angle);angle=angle[order];loop=loop[order]
 aa=np.r_[angle[-1]-2*math.pi,angle,angle[0]+2*math.pi];pp=np.vstack([loop[-1],loop,loop[0]]);theta=math.atan2(v.co.z-center[2],v.co.x-center[0]);q=Vector((float(np.interp(theta,aa,pp[:,0])),y,float(np.interp(theta,aa,pp[:,2]))));moved.append((v.co-q).length);v.co=q
record['tail_sections']={'vertices':len(moved),'sections':len(cache),'max_move_m':max(moved,default=0)}
# More toe-seat and instep sampling, paid for by flat torso edges.
flat=[];used=set()
for e in sorted(list(bm.edges),key=lambda e:e.calc_length()):
 c=(e.verts[0].co+e.verts[1].co)/2
 if e.is_manifold and -.04<c.y<.11 and .33<c.z<.51 and all(v not in used for v in e.verts) and e.calc_face_angle()<.14:
  flat.append(e);used.update(e.verts)
  if len(flat)>=48:break
if flat:bmesh.ops.collapse(bm,edges=flat,uvs=True)
candidates=[]
for e in bm.edges:
 c=(e.verts[0].co+e.verts[1].co)/2
 if .025<c.y<.13 and c.z<.07:candidates.append(e)
edges=sorted(candidates,key=lambda e:-e.calc_length())[:len(flat)];old={tuple(v.co) for v in bm.verts}
bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
new=[v for v in bm.verts if tuple(v.co) not in old]
for v in new:v.co=full.find_nearest(v.co)[0]
record['toe_density']={'flat_collapses':len(flat),'subdivided_edges':len(edges),'new_vertices':len(new)}
bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
for m in list(low.modifiers):low.modifiers.remove(m)
m=low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(low,m);g.normalize(low,rig);m=low.modifiers.new('rig','ARMATURE');m.object=rig
mat=bpy.data.materials['Luceras_body'];mat.node_tree.nodes.clear();bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=(.5,.5,.5,1);bs.inputs['Roughness'].default_value=.85;out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
for im in list(bpy.data.images):
 if im.name.startswith(('normal_','ao_')):bpy.data.images.remove(im)
game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')];g.uv([o for o in game if 'eye' not in o.name]);g.uv([o for o in game if 'eye' in o.name])
data=json.loads((OUT/'iter3_mesh.json').read_text());data['iteration4']=record;data['total']=sum(g.triangles(o) for o in game);assert data['total']<=11500,data['total'];assert g.manifold(low)==0;g.write('iter1_mesh.json',data);bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_mesh.blend'))
code=inspect.getsource(p2.bake).replace('p=v.co;distance=', 'p=v.co;frame=ear_frame(1 if p.x>0 else -1);height=(p-frame[0]).dot(frame[1]);distance=').replace('p.y>-.205 else .003','p.y>-.205 and height>.030 else .003');ns=dict(p2.bake.__globals__);exec(code,ns);ns['bake']()
settings=json.loads((OUT/'bake_settings.json').read_text());settings['cage_offset_m']={'ear_rim':.0012,'ear_root':.008,'toes':.003,'remaining':.008};g.write('bake_settings.json',settings)
sys.argv=[sys.argv[0],'--','--stage','render'];runpy.run_path(str(Path(__file__).with_name('build_gamemesh.py')),run_name='__main__')

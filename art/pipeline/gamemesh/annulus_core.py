"""B-db8w iteration 2: repair the identified ear-root fold and rebuild bake shader."""
import sys,json,os
from pathlib import Path
import bpy,bmesh,numpy as np,math
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3')
g.ITERATION=int(os.environ.get('GM_ITERATION','2'));g.OUT=g.IterationOutput(str(OUT));p2.OUT=g.OUT
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_review.blend'))
low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset()
bm=bmesh.new();bm.from_mesh(low.data);records=[]
import ear_annulus
records=ear_annulus.repair(bm,src)
# Regularize the two folded hip creases and the tail bridge, preserving source proximity.
from mathutils.bvhtree import BVHTree
sb=bmesh.new();sb.from_mesh(src.data);tree=BVHTree.FromBMesh(sb);sb.free()
seeds=set();opposed=[]
for f in bm.faces:
 c=f.calc_center_median();hit=tree.find_nearest(c)
 if c.y>0 and c.z>.25 and hit and f.normal.dot(hit[1])<0:
  seeds.update(f.verts);opposed.append(list(c))
# Include the compressed bridge around the anatomical tail root.
seeds.update(v for v in bm.verts if .315<v.co.y<.375 and v.co.z>.425 and abs(v.co.x)<.045)
region=set(seeds)
for k in range(2):region.update(e.other_vert(v) for v in list(region) for e in v.link_edges)
before={v:v.co.copy() for v in region}
for k in range(14):
 updates={v:sum((e.other_vert(v).co for e in v.link_edges),Vector())/len(v.link_edges) for v in region if v.link_edges}
 for v,q in updates.items():
  v.co=v.co.lerp(q,.40 if v in seeds else .15)
  hit=tree.find_nearest(v.co)
  if hit:v.co=v.co.lerp(hit[0],.65)
regularization_max=max([(v.co-q).length for v,q in before.items()],default=0)
bm.normal_update()
# Exchange a small number of flat torso edges for edges across the damaged bends.
flat=[];used=set()
for e in sorted(list(bm.edges),key=lambda e:e.calc_length()):
 c=(e.verts[0].co+e.verts[1].co)/2
 if e.is_manifold and -.03<c.y<.12 and c.z>.35 and c.z<.52 and all(v not in used and v not in region for v in e.verts) and e.calc_face_angle()<.12:
  flat.append(e);used.update(e.verts)
  if len(flat)>=36:break
if flat:bmesh.ops.collapse(bm,edges=flat,uvs=True)
edges=[e for e in bm.edges if all(v in region and v.is_valid for v in e.verts) and e.calc_length()>.007]
edges=sorted(edges,key=lambda e:-e.calc_length())[:len(flat)]
old={tuple(v.co) for v in bm.verts}
if edges:bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
new=[v for v in bm.verts if tuple(v.co) not in old]
for v in new:
 hit=tree.find_nearest(v.co)
 if hit:v.co=hit[0]
records.append({'hip_tail_opposed_centers_before':opposed,'bend_vertices_regularized':len(region),'flat_edges_collapsed':len(flat),'bend_edges_subdivided':len(edges),'new_bend_vertices':len(new),'max_regularization_m':regularization_max})
points=[v.co.copy() for v in src.data.vertices];src.data.calc_loop_triangles();tris=[tuple(t.vertices) for t in src.data.loop_triangles];full=tree;record={}
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

records.append(record)
# Pay for root samples from flat torso surfaces only.
excess=sum(len(f.verts)-2 for f in bm.faces)-8988
flat=[];used=set();bm.normal_update()
for e in sorted(list(bm.edges),key=lambda e:e.calc_length()):
 c=(e.verts[0].co+e.verts[1].co)/2
 if len(flat)>=max(0,(excess+1)//2):break
 if e.is_manifold and -.05<c.y<.13 and .28<c.z<.53 and e.calc_face_angle()<.3 and all(v not in used for v in e.verts):flat.append(e);used.update(e.verts)
if flat:bmesh.ops.collapse(bm,edges=flat,uvs=True)
records.append({'additional_root_budget_collapses':len(flat),'excess_triangles_before':excess})
bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
for m in list(low.modifiers):low.modifiers.remove(m)
m=low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(low,m);fixed=g.normalize(low,rig)
m=low.modifiers.new('rig','ARMATURE');m.object=rig
mat=bpy.data.materials['Luceras_body'];mat.node_tree.nodes.clear();bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=(.5,.5,.5,1);bs.inputs['Roughness'].default_value=.85;out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
for im in list(bpy.data.images):
 if im.name.startswith(('normal_','ao_')):bpy.data.images.remove(im)
game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')]
g.uv([o for o in game if 'eye' not in o.name]);g.uv([o for o in game if 'eye' in o.name])
data=json.loads((OUT/'iter1_mesh.json').read_text());data['ear_root_repair']=records;data['weight_repairs']=fixed;data['total']=sum(g.triangles(o) for o in game);data['body_non_manifold']=g.manifold(low);assert data['total']<=11500,data['total'];assert data['body_non_manifold']==0;g.write('iter1_mesh.json',data)
bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_mesh.blend'))
import inspect
code=inspect.getsource(p2.bake)
code=code.replace("p=v.co;distance=", "p=v.co;frame=ear_frame(1 if p.x>0 else -1);height=(p-frame[0]).dot(frame[1]);distance=")
code=code.replace("p.y>-.205 else .003", "p.y>-.205 and height>.030 else .003")
namespace=dict(p2.bake.__globals__);exec(code,namespace);namespace['bake']()
settings=json.loads((OUT/'bake_settings.json').read_text());settings['cage_offset_m']={'ear_rim':.0012,'ear_root':.008,'toes':.003,'remaining':.008};g.write('bake_settings.json',settings)
import runpy
sys.argv=[sys.argv[0],'--','--stage','render']
runpy.run_path(str(Path(__file__).with_name('build_gamemesh.py')),run_name='__main__')

"""B-db8w iteration 2: repair the identified ear-root fold and rebuild bake shader."""
import sys,json,os
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3')
g.ITERATION=int(os.environ.get('GM_ITERATION','2'));g.OUT=g.IterationOutput(str(OUT));p2.OUT=g.OUT
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_review.blend'))
low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset()
bm=bmesh.new();bm.from_mesh(low.data);records=[]
for side in (1,-1):
 origin,axis,across,depth=p2.ear_frame(side);relax=[]
 for v in bm.verts:
  q=v.co-origin;h=q.dot(axis);d=q.dot(depth)
  if v.co.x*side>.02 and abs(q.dot(across))<.035 and -.020<d<.030 and -.006<h<.030:
   relax.append((v,.45*max(0,1-abs(h-.012)/.018)))
 before=[v.co.copy() for v,w in relax]
 for step in range(16):
  updates={v:sum((e.other_vert(v).co for e in v.link_edges),Vector())/len(v.link_edges) for v,w in relax if v.link_edges}
  for v,w in relax:
   if v in updates:v.co=v.co.lerp(updates[v],w)
 delta=[(v.co-p).length for (v,w),p in zip(relax,before)]
 records.append({'side':side,'vertices':len(relax),'max_moved_m':max(delta,default=0),'mean_moved_m':sum(delta)/max(1,len(delta))})
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

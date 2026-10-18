"""B-csbd local folded-sliver repair, preserving the pass5 surface elsewhere."""
import sys,os,json,types,hashlib,shutil
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
from mathutils.geometry import barycentric_transform
HERE=Path(__file__).parent;sys.path.insert(0,str(HERE))
p3=types.ModuleType('review_helpers');p3.__file__=str(HERE/'build_pass3.py')
exec(compile((HERE/'build_pass3.py').read_text().split('stage=sys.argv[')[0].replace("/pass3'","/pass6'"),p3.__file__,'exec'),p3.__dict__)
g=p3.g;p2=p3.p2;OUT=p3.OUT;BASE=OUT.parent/'pass5'
def scan(bm):
 bm.normal_update();bm.faces.index_update();bm.verts.index_update()
 return {'vertices':len(bm.verts),'faces':len(bm.faces),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'zero_area_faces':sum(f.calc_area()<1e-14 for f in bm.faces),'inconsistent_winding_edges':sum(e.is_manifold and not e.is_contiguous for e in bm.edges),'sharp_fold_candidates':[{'center':list(f.calc_center_median()),'area':f.calc_area()} for f in bm.faces if all(e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.8 for e in f.edges)]}
def repair():
 for n in ('gamemesh.blend','sculpt_check.json','normal_2048.png','normal_1024.png','ao_2048.png','ao_1024.png','bake_settings.json'):
  shutil.copyfile(BASE/n,OUT/n)
 p3.prepare();o=bpy.data.objects['game_body'];bm=bmesh.new();bm.from_mesh(o.data);bm.normal_update();before=scan(bm);coords={tuple(v.co) for v in bm.verts};changes=[];affected=set()
 # Remove the closed six-face folded pocket attached to the four-face neck edge.
 pocket=[f for f in bm.faces if all(abs(v.co.x)<.0045 and -.1301<v.co.y<-.1282 and .5292<v.co.z<.5329 for v in f.verts)]
 assert len(pocket)==6,len(pocket)
 affected.update(tuple(v.co) for f in pocket for v in f.verts);changes.append({'region':'lower_neck','removed_folded_pocket_faces':len(pocket)})
 bmesh.ops.delete(bm,geom=pocket,context='FACES')
 loose=[v for v in bm.verts if not v.link_faces]
 if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
 bm.normal_update()
 # Degree-three sliver fans can be replaced by their unchanged boundary triangle.
 for label,pt in [('left_upper_thigh',(.092674613,.258967072,.478033841)),('lower_chin',(-.000322819,-.20525074,.442163467)),('right_cheek',(-.052708462,-.20207645,.566795647)),('left_thigh_landing',(.0913358703,.216931507,.507839024))]:
  if label in ('left_upper_thigh','right_cheek','left_thigh_landing'):v=min(bm.verts,key=lambda v:(v.co-Vector(pt)).length)
  else:
   fs=[f for f in bm.faces if (f.calc_center_median()-Vector(pt)).length<.001]
   vs=[v for f in fs for v in f.verts if len(v.link_edges)==3];v=vs[0] if vs else None
  if v is None:changes.append({'region':label,'action':'No safe degree-three local dissolve found'});continue
  assert len(v.link_edges)==3
  affected.update(tuple(w.co) for f in v.link_faces for w in f.verts)
  changes.append({'region':label,'removed_vertex_m':list(v.co),'replaced_faces':len(v.link_faces),'new_faces':1})
  uv=bm.loops.layers.uv.active
  uv_options={w:[loop[uv].uv.copy() for loop in w.link_loops] for w in bm.verts}
  donor=max(v.link_faces,key=lambda f:f.calc_area());donor_pts=[l.vert.co.copy() for l in donor.loops];donor_uv=[Vector((*l[uv].uv,0)) for l in donor.loops];oldfaces=set(bm.faces)
  bmesh.ops.dissolve_verts(bm,verts=[v],use_face_split=False,use_boundary_tear=False);bm.normal_update()
  rebuilt=[f for f in bm.faces if f not in oldfaces]
  assert len(rebuilt)==1
  for loop in rebuilt[0].loops:
   mapped=barycentric_transform(loop.vert.co,*donor_pts,*donor_uv);loop[uv].uv=min(uv_options[loop.vert],key=lambda uv:(uv-mapped.xy).length)
  changes[-1]['uv_repair']='Use exact existing boundary UV corners nearest the largest removed fan island.'
  changes[-1]['donor_uv']=[list(x.xy) for x in donor_uv]
  changes[-1]['new_uv']=[list(l[uv].uv) for l in rebuilt[0].loops]
 after=scan(bm);assert after['non_manifold_edges']==0,after
 bm.to_mesh(o.data);bm.free();o.data.update()
 # Transfer weights only on retained vertices incident to the repaired patches.
 src=bpy.data.objects['luceras_blockout'];tmp=g.duplicate(o,'weight_transfer');tmp.modifiers.clear();tmp.vertex_groups.clear()
 m=tmp.modifiers.new('Nearest face interpolated','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(tmp);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(tmp,m);g.normalize(tmp,bpy.data.objects['luceras_rig'])
 ids=[v.index for v in o.data.vertices if tuple(v.co) in affected]
 for group in o.vertex_groups:group.remove(ids)
 for i in ids:
  for w in tmp.data.vertices[i].groups:
   name=tmp.vertex_groups[w.group].name;vg=o.vertex_groups.get(name) or o.vertex_groups.new(name=name);vg.add([i],w.weight,'REPLACE')
 bpy.data.objects.remove(tmp,do_unlink=True)
 for f in o.data.polygons:f.use_smooth=True
 data={'before':before,'after':after,'changes':changes,'retained_vertices_moved':sum(tuple(v.co) not in coords for v in o.data.vertices),'weights_retransferred_vertices':len(ids),'affected_vertex_coordinates':[list(x) for x in affected],'protected_parts':'Horns, ears, paws and tail geometry untouched. Sharp-fold candidates in protected thin surfaces are reported, not automatically classified as faults.'}
 g.write('local_repair.json',data);print('LOCAL_REPAIR',json.dumps(data),flush=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_baked.blend'))
def bake():
 import surface_normal_bake
 surface_normal_bake.run(g)
 # Refresh body AO in its existing atlas; rigid-part texels retain the prior bake.
 bpy.ops.wm.open_mainfile(filepath=str(g.OUT/'iter1_baked.blend'))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.bake.use_selected_to_active=True;scene.render.bake.use_clear=False;scene.render.bake.margin=8;scene.render.bake.use_cage=False;scene.render.bake.cage_extrusion=.008;scene.render.bake.max_ray_distance=.025
 mat=bpy.data.materials['Luceras_body'];im=bpy.data.images.get('ao_2048') or bpy.data.images.load(str(OUT/'ao_2048.png'));im.name='ao_2048';im.colorspace_settings.name='Non-Color';mat.node_tree.nodes['AO_bake'].image=im;mat.node_tree.nodes.active=mat.node_tree.nodes['AO_bake']
 src=bpy.data.objects['luceras_blockout'];dst=bpy.data.objects['game_body']
 for o in bpy.data.objects:
  if o.type=='MESH':o.hide_render=o.name.startswith('game_')
 dst.hide_render=False;g.select(dst,[src]);bpy.ops.object.bake(type='AO');im.filepath_raw=str(OUT/'ao_2048.png');im.save()
 old=bpy.data.images.get('ao_1024')
 if old:bpy.data.images.remove(old,do_unlink=True)
 small=im.copy();small.name='ao_1024';small.scale(1024,1024);small.filepath_raw=str(OUT/'ao_1024.png');small.save();mat.node_tree.nodes['AO_bake'].image=small
 localize_maps()
 g.write('pass6_bake.json',{'normal':'Same oriented-nearest method as pass5, refreshed body after local repair. Rigid atlas retained.','ao':'Body-only selected-to-active Cycles 16 samples, 0.008m extrusion, 0.025m max ray, 8px padding at2048. Existing rigid atlas retained.'})
 bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_baked.blend'))
def localize_maps():
 import numpy as np
 o=bpy.data.objects['game_body'];o.data.calc_loop_triangles();uv=o.data.uv_layers.active.data
 affected={tuple(x) for x in json.loads((OUT/'local_repair.json').read_text())['affected_vertex_coordinates']};size=2048;mask=np.zeros((size,size),bool)
 for tri in o.data.loop_triangles:
  if not any(tuple(o.data.vertices[i].co) in affected for i in tri.vertices):continue
  pts=np.array([uv[i].uv[:] for i in tri.loops])*size;a,b,c=pts;den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  if abs(den)<1e-10:continue
  lo=np.maximum(0,np.floor(pts.min(axis=0)).astype(int));hi=np.minimum(size-1,np.ceil(pts.max(axis=0)).astype(int));xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));x=xx+.5;y=yy+.5
  v=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/den;w=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/den
  mask[yy,xx]|=(v>=0)&(w>=0)&(v+w<=1)
 for step in range(8):
  old=mask.copy()
  mask[1:]|=old[:-1];mask[:-1]|=old[1:];mask[:,1:]|=old[:,:-1];mask[:,:-1]|=old[:,1:]
 mat=bpy.data.materials['Luceras_body']
 for kind,node in [('normal','NORMAL_bake'),('ao','AO_bake')]:
  high=bpy.data.images.get(kind+'_2048') or bpy.data.images.load(str(OUT/(kind+'_2048.png')),check_existing=False);high.colorspace_settings.name='Non-Color';base=bpy.data.images.load(str(BASE/(kind+'_2048.png')),check_existing=False);base.colorspace_settings.name='Non-Color'
  a=np.array(high.pixels[:],dtype=np.float32).reshape(size,size,4);b=np.array(base.pixels[:],dtype=np.float32).reshape(size,size,4);a[~mask]=b[~mask];high.pixels.foreach_set(a.ravel());high.filepath_raw=str(OUT/(kind+'_2048.png'));high.save();bpy.data.images.remove(base)
  old=bpy.data.images.get(kind+'_1024');bpy.data.images.remove(old,do_unlink=True);small=high.copy();small.name=kind+'_1024';small.scale(1024,1024)
  base=bpy.data.images.load(str(BASE/(kind+'_1024.png')),check_existing=False);base.colorspace_settings.name='Non-Color';a=np.array(small.pixels[:],dtype=np.float32).reshape(1024,1024,4);b=np.array(base.pixels[:],dtype=np.float32).reshape(1024,1024,4);smask=mask.reshape(1024,2,1024,2).any(axis=(1,3));a[~smask]=b[~smask];small.pixels.foreach_set(a.ravel());small.filepath_raw=str(OUT/(kind+'_1024.png'));small.save();mat.node_tree.nodes[node].image=small;bpy.data.images.remove(base)
 g.write('local_bake_mask.json',{'scope':'Only UV triangles incident to repaired vertices, plus8-pixel2048 padding. All other texels restored exactly from pass5 at both sizes.','texels2048':int(mask.sum()),'texels1024':int(smask.sum())})
def final():
 bpy.ops.wm.open_mainfile(filepath=str(g.OUT/'iter1_baked.blend'));g.export();frozen=hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()
 p3.prepare();p2.joint_rings(bpy.data.objects['game_body'],bpy.data.objects['luceras_rig']);g.export=lambda:None;g.renders();p3.close_poses()
 g.write('render_provenance.json',{'build_id':'B-csbd','source_blend':'gamemesh.blend','sha256':frozen,'unchanged_after_renders':hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()==frozen,'engine':'Cycles','samples':16,'geometry':'All checks from reopened frozen delivered file.'})
stage=os.environ.get('GM_STAGE','all')
if stage=='all':repair();bake();final()
elif stage=='repair':repair()
elif stage=='bake_final':bake();final()
elif stage=='final':final()

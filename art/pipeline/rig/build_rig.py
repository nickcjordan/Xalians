"""B-v3g9 source-preserving rig build. Run only through the shared slot."""
import bpy, bmesh, numpy as np, json, sys, math, hashlib, os, time
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent
PIPE=HERE.parent
sys.path.insert(0,str(PIPE/'gamemesh'))
import build_pass1 as g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-rig/pass1')
SCULPT=Path(g.SOURCE)
GAME=OUT.parent.parent/'luceras-gamemesh/pass6/gamemesh.blend'
POSES=['rest','crouch','leap','landing','head_left_up','tail_side_up','foreleg_step','breath_in']
JOINTS={'shoulder':'leg_fl_01','elbow':'leg_fl_02','hip':'leg_hl_01','hock':'leg_hl_03','neck':'neck_01','tail_base':'tail_01'}
def write(n,d): (OUT/n).write_text(json.dumps(d,indent=2))
def select(o):
 bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
def coords(o,evaluated=False): return g.block.verts_np(o,evaluated)
def fingerprint(o):
 m=o.data
 h=hashlib.sha256()
 for collection,prop,size,dtype in [(m.vertices,'co',3,np.float32),(m.loops,'vertex_index',1,np.int32),(m.polygons,'loop_start',1,np.int32),(m.polygons,'loop_total',1,np.int32)]:
  a=np.empty(len(collection)*size,dtype=dtype);collection.foreach_get(prop,a);h.update(a.tobytes())
 uv={}
 for layer in m.uv_layers:
  a=np.empty(len(layer.data)*2,dtype=np.float32);layer.data.foreach_get('uv',a);uv[layer.name]=hashlib.sha256(a.tobytes()).hexdigest()
 return dict(geometry_sha256=h.hexdigest(),uv_sha256=uv,vertices=len(m.vertices),polygons=len(m.polygons),components=g.components(o))
def meshes(kind): return [o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('body_kind')==kind]
def load():
 bpy.ops.wm.open_mainfile(filepath=str(GAME))
 rig=bpy.data.objects['luceras_rig'];rig.animation_data_clear();g.clips.Poser(rig).reset();rig.data.pose_position='POSE'
 for o in list(bpy.data.objects):
  if o.type=='MESH' and o.name.startswith('game_'):o['body_kind']='game'
  elif o!=rig:bpy.data.objects.remove(o,do_unlink=True)
 before={o.name:fingerprint(o) for o in meshes('game')}
 with bpy.data.libraries.load(str(SCULPT),link=False) as (a,b):b.objects=[n for n in a.objects if not n.startswith('lookdev_')]
 imported=[o for o in b.objects if o]
 for o in imported:bpy.context.scene.collection.objects.link(o)
 bpy.context.view_layer.update()
 bind_positions={o.name:coords(o,True) for o in imported if o.type=='MESH'}
 for o in imported:
  if o.type!='MESH':continue
  o['body_kind']='sculpt';before[o.name]=fingerprint(o)
  world=o.matrix_world.copy();bone=o.parent_bone if o.parent_type=='BONE' else None
  o.parent=rig;o.parent_type='OBJECT';o.parent_bone='';o.matrix_world=world
  if bone:g.bind_rigid(o,rig,bone)
  else:
   for m in o.modifiers:
    if m.type=='ARMATURE':m.object=rig;m.use_deform_preserve_volume=False
 for o in imported:
  if o.type=='ARMATURE':bpy.data.objects.remove(o,do_unlink=True)
 for kind in ('sculpt','game'):
  coll=bpy.data.collections.new('BODY_'+kind.upper());bpy.context.scene.collection.children.link(coll)
  for o in meshes(kind):
   for c in list(o.users_collection):c.objects.unlink(o)
   coll.objects.link(o);o.hide_render=False;o.hide_viewport=False;o.hide_set(False)
 rig.show_in_front=True
 # Chest expansion may translate the attachments, but must not scale the head or legs.
 for n in ('neck_01','leg_fl_01','leg_fr_01'):rig.data.bones[n].inherit_scale='NONE'
 bpy.context.view_layer.update()
 bind_errors={o.name:float(np.max(np.abs(coords(o,True)-bind_positions[o.name]))) for o in meshes('sculpt')}
 write('bind_preservation.json',dict(world_coordinate_max_error_m=bind_errors,passed=max(bind_errors.values())<1e-6))
 assert max(bind_errors.values())<1e-6
 write('geometry_before.json',before)
 return rig
def weights(o,names):
 a=np.zeros((len(o.data.vertices),len(names)),dtype=np.float64);mapping={vg.index:names.index(vg.name) for vg in o.vertex_groups if vg.name in names}
 for v in o.data.vertices:
  for w in v.groups:
   if w.group in mapping:a[v.index,mapping[w.group]]=w.weight
 return a
def setweights(o,a,names,limit=4):
 a[a<1e-6]=0
 if limit is not None:
  order=np.argsort(a,axis=1)[:,:-limit];np.put_along_axis(a,order,0,axis=1)
 sums=a.sum(axis=1);assert np.all(sums>0),o.name
 a/=sums[:,None]
 o.vertex_groups.clear();groups=[o.vertex_groups.new(name=n) for n in names]
 for j,vg in enumerate(groups):
  for i in np.flatnonzero(a[:,j]>0):vg.add([int(i)],float(a[i,j]),'REPLACE')
 return a
def refine(rig):
 src=bpy.data.objects['luceras_blockout'];names=[b.name for b in rig.data.bones];a=weights(src,names);original=a.copy();p=coords(src)
 def smoothstep(v):
  v=np.clip(v,0,1);return v*v*(3-2*v)
 sternum=smoothstep((p[:,1]+.055)/.07)*smoothstep((.17-p[:,1])/.07)*smoothstep((p[:,2]-.22)/.09)*smoothstep((.49-p[:,2])/.08)
 sternum*=smoothstep((.095-abs(p[:,0]))/.045)
 fore=[i for i,n in enumerate(names) if n.startswith(('leg_fl_','leg_fr_'))]
 removed=a[:,fore].sum(axis=1)*sternum
 a[:,fore]*=1-sternum[:,None];a[:,names.index('spine_05')]+=removed
 e=np.empty(len(src.data.edges)*2,dtype=np.int32);src.data.edges.foreach_get('vertices',e);e=e.reshape(-1,2)
 mask=np.zeros(len(p));regions={}
 for b in rig.data.bones:
  if b.name.startswith('leg_'):rad=.12 if b.name.endswith('01') else .07
  elif b.name in ('neck_01','neck_02','tail_01','tail_02'):rad=.11
  else:continue
  distance=np.linalg.norm(p-np.array(rig.matrix_world@b.head_local),axis=1)
  f=np.clip(1-distance/rad,0,1);f=f*f*(3-2*f);mask=np.maximum(mask,f);regions[b.name]=int(np.sum(f>0))
 # Diffuse only weights, across existing surface edges. Geometry never changes.
 degree=np.bincount(e.ravel(),minlength=len(p)).clip(1)
 count=int(os.environ.get('RIG_SMOOTH','80'))
 for step in range(count):
  avg=np.zeros_like(a)
  np.add.at(avg,e[:,0],a[e[:,1]]);np.add.at(avg,e[:,1],a[e[:,0]])
  a+=(avg/degree[:,None]-a)*(.65*mask[:,None])
  if step%10==0:print('WEIGHT_DIFFUSION',step,count,flush=True)
 # Lock ear blades to their base bones. The small root transition remains blended.
 ears={}
 for side in ('l','r'):
  i,j=names.index('ear_'+side+'_01'),names.index('ear_'+side+'_02')
  ear=original[:,i]+original[:,j]
  rigid=ear>.55
  a[:,i]+=a[:,j];a[:,j]=0;a[rigid]=0;a[rigid,i]=1
  ears[side]=int(rigid.sum())
 # Symmetry uses nearest mirrored surface samples and swaps named side groups.
 kd=KDTree(len(p))
 for i,x in enumerate(p):kd.insert(x,i)
 kd.balance();swap=[]
 for n in names:
  other=n.replace('_fl_','_fr_').replace('_hl_','_hr_') if ('_fl_' in n or '_hl_' in n) else n.replace('_fr_','_fl_').replace('_hr_','_hl_') if ('_fr_' in n or '_hr_' in n) else n.replace('_l','_r') if '_l' in n else n.replace('_r','_l') if '_r' in n else n
  swap.append(names.index(other) if other in names else names.index(n))
 pairs=[]
 for i in np.flatnonzero(p[:,0]>.00001):
  q=p[i].copy();q[0]*=-1;_,j,d=kd.find(q)
  if d<.001:
   avg=(a[i]+a[j,swap])*.5;a[i]=avg;a[j]=avg[swap];pairs.append((int(i),j,float(d)))
 for _ in range(6):
  for i,j,d in pairs:
   avg=(a[i]+a[j,swap])*.5;a[i]=avg;a[j]=avg[swap]
 a=setweights(src,a,names,limit=None)
 # Barycentric sampling from the final sculpt, only for the game body's largest component.
 src.data.calc_loop_triangles();tri=np.array([t.vertices[:] for t in src.data.loop_triangles]);tree=BVHTree.FromPolygons(p.tolist(),tri.tolist(),all_triangles=True)
 transfer={}
 for obj in meshes('game'):
  if len(obj.data.vertices)<1000:continue
  old=weights(obj,names);pts=coords(obj)
  adjacency=[[] for v in obj.data.vertices]
  for ed in obj.data.edges:
   x,y=ed.vertices;adjacency[x].append(y);adjacency[y].append(x)
  remaining=set(range(len(pts)));parts=[]
  while remaining:
   stack=[remaining.pop()];part=[]
   while stack:
    v=stack.pop();part.append(v)
    for j in adjacency[v]:
     if j in remaining:remaining.remove(j);stack.append(j)
   parts.append(part)
  ids=max(parts,key=len);ds=[]
  for i in ids:
   hit,normal,idx,d=tree.find_nearest(pts[i]);ids3=tri[idx];v0,v1,v2=p[ids3];u=v1-v0;v=v2-v0;w=np.array(hit)-v0
   uu=u@u;uv=u@v;vv=v@v;wu=w@u;wv=w@v;den=uu*vv-uv*uv
   if abs(den)<1e-20:co=np.array([1,0,0])
   else:
    b=(vv*wu-uv*wv)/den;c=(uu*wv-uv*wu)/den;co=np.clip([1-b-c,b,c],0,1);co/=co.sum()
   old[i]=co@a[ids3];ds.append(d)
  setweights(obj,old,names);transfer[obj.name]=dict(vertices=len(ids),max_surface_distance_m=max(ds),mean_surface_distance_m=float(np.mean(ds)))
 write('weight_refinement.json',dict(iterations=count,sternum_reassigned_vertices=int(np.sum(removed>1e-5)),regions=regions,rigid_ear_vertices=ears,mirrored_pairs=len(pairs),game_transfer=transfer,changed_sculpt_vertices=int(np.sum(np.max(abs(a-original),axis=1)>1e-5))))
def pose(rig,name):
 poser=g.clips.Poser(rig);poser.reset()
 if name in g.block.POSES:g.block.POSES[name](poser,rig)
 elif name=='head_left_up':
  poser.rot('neck_01',Vector((0,0,1)),math.radians(10));poser.rot('neck_02',Vector((0,0,1)),math.radians(10));poser.rot('head_01',Vector((0,0,1)),math.radians(20));poser.rot('neck_02',Vector((-1,0,0)),math.radians(10));poser.rot('head_01',Vector((-1,0,0)),math.radians(15))
  bpy.context.view_layer.update();head=rig.pose.bones['head_01']
  head.matrix=Matrix.Translation(head.head)@Matrix.Rotation(math.radians(40),4,'Z')@Matrix.Rotation(math.radians(-25),4,'X')@head.bone.matrix_local.to_3x3().to_4x4()
 elif name=='tail_side_up':
  for i in range(1,7):poser.rot(f'tail_{i:02}',Vector((0,0,1)),math.radians(15 if i<4 else 8));poser.rot(f'tail_{i:02}',Vector((1,0,0)),math.radians(10))
 elif name=='foreleg_step':poser.plant_feet({'fl_up':.11,'fl_fwd':.06},bpy.context.view_layer)
 elif name=='breath_in':
  for n in ('spine_03','spine_04','spine_05'):rig.pose.bones[n].scale=(1.045,1.0,1.03)
 bpy.context.view_layer.update()
def visible(kind):
 for k in ('sculpt','game'):
  for o in meshes(k):o.hide_render=k!=kind
def renders(rig,prefix,full=True):
 g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16
 for kind in ('sculpt','game'):
  for o in meshes(kind):g.lookdev.apply_clay(o)
 baked=prefix=='final' and bpy.data.actions.get('review.poses') is not None
 if baked:
  rig['controls_enabled']=0.;rig.update_tag();rig.animation_data_create();rig.animation_data.action=bpy.data.actions['review.poses']
  for k in ('sculpt','game'):
   for o in meshes(k):o.hide_set(False)
  bpy.context.scene.frame_set(1)
 else:pose(rig,'rest')
 box=(Vector((-.36,-.60,-.12)),Vector((.36,.90,1.12)))
 cams={}
 for name in (POSES if full else ['rest','crouch','leap']):
  if baked:bpy.context.scene.frame_set(1+POSES.index(name)*10);bpy.context.view_layer.update()
  else:pose(rig,name)
  if full:
   bounds=[coords(o,True) for k in ('sculpt','game') for o in meshes(k)]
   box=(Vector(np.min(np.array([p.min(axis=0) for p in bounds]),axis=0)),Vector(np.max(np.array([p.max(axis=0) for p in bounds]),axis=0)))
  cam=g.lookdev.place_camera('lookdev_pose',box,65 if name in ('head_left_up','tail_side_up','breath_in') else 90,10 if name in ('head_left_up','tail_side_up','breath_in') else 0,.04)
  for kind in ('sculpt','game'):visible(kind);g.lookdev.render(cam,OUT/f'{prefix}_{name}_{kind}.png',size=896 if full else 512)
  if name=='rest':
   from bpy_extras.object_utils import world_to_camera_view
   cams['side']={b.name:{'head':list(world_to_camera_view(bpy.context.scene,cam,rig.matrix_world@b.head_local)),'tail':list(world_to_camera_view(bpy.context.scene,cam,rig.matrix_world@b.tail_local))} for b in rig.data.bones}
   for view,az in [('front',0),('three_quarter',45)]:
    cam=g.lookdev.place_camera('lookdev_'+view,box,az,8,.04)
    for kind in ('sculpt','game'):visible(kind);g.lookdev.render(cam,OUT/f'{prefix}_rest_{view}_{kind}.png',size=896 if full else 640)
    cams[view]={b.name:{'head':list(world_to_camera_view(bpy.context.scene,cam,rig.matrix_world@b.head_local)),'tail':list(world_to_camera_view(bpy.context.scene,cam,rig.matrix_world@b.tail_local))} for b in rig.data.bones}
  if name in ('crouch','leap'):
   for label,bone in dict(JOINTS,neck_under_jaw='head_01').items():
    center=rig.matrix_world@rig.pose.bones[bone].head;r=.105 if label in ('shoulder','hip','neck','tail_base') else .075
    cam=g.lookdev.place_camera('lookdev_crop',(center-Vector((r,r,r)),center+Vector((r,r,r))),135 if label=='tail_base' else 65 if label=='neck_under_jaw' else 90,30 if label=='tail_base' else 0,.04)
    for kind in ('sculpt','game'):visible(kind);g.lookdev.render(cam,OUT/f'{prefix}_{name}_{label}_{kind}.png',size=512 if full else 384)
 write(prefix+'_camera_joints.json',cams)
 pose(rig,'rest')
def check_geometry():
 before=json.loads((OUT/'geometry_before.json').read_text());after={o.name:fingerprint(o) for kind in ('sculpt','game') for o in meshes(kind)}
 write('geometry_preservation.json',dict(all_exact=before==after,objects={n:dict(exact=before.get(n)==v,**v) for n,v in after.items()}));assert before==after
def main():
 stage=sys.argv[sys.argv.index('--stage')+1] if '--stage' in sys.argv else 'build'
 if stage in ('baseline','build'):
  rig=load()
  if stage=='build':refine(rig)
  check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('baseline.blend' if stage=='baseline' else 'weighted.blend')))
  renders(rig,'iter0' if stage=='baseline' else 'iter'+os.environ.get('RIG_ITERATION','1'),full=False)
  if stage=='build':
   sys.path.insert(0,str(HERE))
   import controls
   controls.main()
   import measure
   try:measure.main()
   except AssertionError as error:print('MEASUREMENT_CHECK_FAILED',str(error),flush=True)
   bpy.ops.wm.open_mainfile(filepath=str(OUT/'rig.blend'));renders(bpy.data.objects['luceras_rig'],'final',full=True)
 elif stage=='render':
  bpy.ops.wm.open_mainfile(filepath=str(OUT/'rig.blend'));renders(bpy.data.objects['luceras_rig'],'final',full=True)
if __name__=='__main__':main()

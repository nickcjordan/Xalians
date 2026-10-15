"""Apply a coordinate-only region delta, refusing absent or ambiguous matches before mutation.
Run with a target blend loaded and --delta FILE --meta FILE --output FILE [--proof REFERENCE_BLEND].
"""
import bpy,sys,argparse,json,time,hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector,kdtree
p=argparse.ArgumentParser();p.add_argument('--delta',required=True);p.add_argument('--meta',required=True);p.add_argument('--output',required=True);p.add_argument('--proof');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
def scene_signature():
 result={}
 for obj in bpy.data.objects:
  if obj.name.startswith('lookdev_'):continue
  d={'type':obj.type,'matrix_world':[list(row) for row in obj.matrix_world],'parent':obj.parent.name if obj.parent else None,'parent_bone':obj.parent_bone}
  if obj.type=='MESH':
   co=np.empty(len(obj.data.vertices)*3);obj.data.vertices.foreach_get('co',co)
   d.update(co_hash=hashlib.sha256(co.tobytes()).hexdigest(),vertex_count=len(obj.data.vertices),faces=hashlib.sha256(str([tuple(f.vertices) for f in obj.data.polygons]).encode()).hexdigest(),edges=hashlib.sha256(str([tuple(e.vertices) for e in obj.data.edges]).encode()).hexdigest(),weights=hashlib.sha256(str([(v.index,[(g.group,g.weight) for g in v.groups]) for v in obj.data.vertices]).encode()).hexdigest(),groups=[g.name for g in obj.vertex_groups],modifiers=[(m.name,m.type) for m in obj.modifiers],materials=[m.name if m else None for m in obj.data.materials],face_materials=hashlib.sha256(str([(f.material_index,f.use_smooth) for f in obj.data.polygons]).encode()).hexdigest())
  if obj.type=='ARMATURE':d['bones']=[(b.name,list(b.head_local),list(b.tail_local),b.parent.name if b.parent else None) for b in obj.data.bones]
  result[obj.name]=d
 return result

t0=time.time();baseline_signature=scene_signature();meta=json.loads(Path(a.meta).read_text());o=bpy.data.objects.get(meta['body_object'])
if o is None or o.type!='MESH':raise RuntimeError('Body object absent: '+meta['body_object'])
z=np.load(a.delta,allow_pickle=False);base=z['base_co'];new=z['new_co']
if base.shape!=new.shape or base.ndim!=2 or base.shape[1]!=3 or len(base)!=meta['count'] or not np.isfinite(base).all() or not np.isfinite(new).all():raise RuntimeError('Invalid delta arrays or count')
P=np.empty(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',P);P=P.reshape(-1,3)
tree=kdtree.KDTree(len(P))
for i,co in enumerate(P):tree.insert(co,i)
tree.balance();matches=[];errors=[]
for row,co in enumerate(base):
 hits=tree.find_range(Vector(co),1e-6)
 if len(hits)!=1:errors.append({'row':row,'base_co':co.tolist(),'match_count':len(hits)})
 else:matches.append(hits[0][1])
if errors or len(set(matches))!=len(matches):
 report={'status':'refused','errors':errors,'duplicate_target_matches':len(matches)-len(set(matches))};Path(a.output+'.refused.json').write_text(json.dumps(report,indent=2));raise RuntimeError(json.dumps(report)[:3000])
P[matches]=new;o.data.vertices.foreach_set('co',P.ravel());o.data.update()
bpy.ops.wm.save_as_mainfile(filepath=a.output,compress=True)
if a.proof:
 actual=np.empty(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',actual)
 faces=[tuple(f.vertices) for f in o.data.polygons];edges=[tuple(e.vertices) for e in o.data.edges]
 bpy.ops.wm.open_mainfile(filepath=a.proof);ref=bpy.data.objects[meta['body_object']];expected=np.empty(len(ref.data.vertices)*3);ref.data.vertices.foreach_get('co',expected)
 md=float(np.max(np.linalg.norm((actual-expected).reshape(-1,3),axis=1)))
 reference_signature=scene_signature()
 scope_differences=[]
 for name,before in baseline_signature.items():
  after=reference_signature.get(name)
  for key,value in before.items():
   if name==meta['body_object'] and key=='co_hash':continue
   if after is None or after.get(key)!=value:scope_differences.append({'object':name,'field':key})
 proof={'status':'pass' if md==0 and not scope_differences and faces==[tuple(f.vertices) for f in ref.data.polygons] and edges==[tuple(e.vertices) for e in ref.data.edges] else 'fail','max_distance_m':md,'all_body_coordinates_equal':bool(np.array_equal(actual,expected)),'vertex_count':len(expected)//3,'delta_count':len(base),'faces_equal':faces==[tuple(f.vertices) for f in ref.data.polygons],'edges_equal':edges==[tuple(e.vertices) for e in ref.data.edges],'tolerance_m':1e-6,'blender_seconds':time.time()-t0,'outside_body_objects_and_all_topology_weights_transforms_material_assignments_unchanged':not scope_differences,'scope_differences':scope_differences}
 Path(a.output).with_name('delta_proof.json').write_text(json.dumps(proof,indent=2))
 if scope_differences or md!=0 or not proof['faces_equal'] or not proof['edges_equal']:raise RuntimeError('Delta proof failed')

"""Audit frozen geometry, weights, pose sanity and shared deformation."""
import bpy, numpy as np, json, sys
from pathlib import Path
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
import build_rig as r
def symmetry(o,names):
 p=r.coords(o);a=r.weights(o,names);kd=KDTree(len(p))
 for i,v in enumerate(p):kd.insert(v,i)
 kd.balance();swap=[]
 for n in names:
  other=n.replace('_fl_','_fr_').replace('_hl_','_hr_') if ('_fl_' in n or '_hl_' in n) else n.replace('_fr_','_fl_').replace('_hr_','_hl_') if ('_fr_' in n or '_hr_' in n) else n.replace('_l','_r') if '_l' in n else n.replace('_r','_l') if '_r' in n else n
  swap.append(names.index(other) if other in names else names.index(n))
 errors=[];distances=[]
 for i in np.flatnonzero(p[:,0]>.00001):
  q=p[i].copy();q[0]*=-1;_,j,d=kd.find(q)
  if d<.001:errors.append(float(np.max(abs(a[i]-a[j,swap]))));distances.append(d)
 return dict(tolerance_m=.001,matched_pairs=len(errors),positive_side_vertices=int(np.sum(p[:,0]>.00001)),max_weight_difference=max(errors,default=0),mean_weight_difference=float(np.mean(errors)) if errors else 0)
def main():
 bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'weighted.blend'));rig=bpy.data.objects['luceras_rig'];names=[b.name for b in rig.data.bones]
 facts=dict(joints=len(names),joint_limit=40,sprite_only_bones=[],bones=[dict(name=b.name,parent=b.parent.name if b.parent else None,deform=b.use_deform,sprite_only=False,head=list(b.head_local),tail=list(b.tail_local)) for b in rig.data.bones],bodies={})
 for kind in ('sculpt','game'):
  objects=[]
  for o in r.meshes(kind):
   a=r.weights(o,names);inf=(a>1e-8).sum(axis=1);sums=a.sum(axis=1);m=r.g.block.mesh_stats(o)
   m.update(name=o.name,max_influences=int(inf.max()),unweighted_vertices=int(np.sum(inf==0)),weight_sum_min=float(sums.min()),weight_sum_max=float(sums.max()),shape_keys=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [],component_vertex_counts=r.g.components(o))
   if o.name=='luceras_blockout' or kind=='game':m['bilateral_weight_symmetry']=symmetry(o,names)
   objects.append(m)
  facts['bodies'][kind]=dict(objects=objects,mesh_objects=len(objects),parts=sum(len(x['component_vertex_counts']) for x in objects),triangles=sum(x['triangles'] for x in objects),vertices=sum(x['vertices'] for x in objects),max_influences=max(x['max_influences'] for x in objects),unweighted_vertices=sum(x['unweighted_vertices'] for x in objects),shape_keys=sum(len(x['shape_keys']) for x in objects))
 poses={};rest={o.name:r.coords(o,True) for k in ('sculpt','game') for o in r.meshes(k)};edges={};references={}
 for k in ('sculpt','game'):
  for o in r.meshes(k):
   e=np.array([ed.vertices[:] for ed in o.data.edges]);length=np.linalg.norm(rest[o.name][e[:,0]]-rest[o.name][e[:,1]],axis=1);edges[o.name]=(e,length)
 for name in r.POSES:
  r.pose(rig,name);entry={};references[name]={}
  for k in ('sculpt','game'):
   result=[]
   for o in r.meshes(k):
    p=r.coords(o,True);references[name][o.name]=p;e,l=edges[o.name];ratio=np.linalg.norm(p[e[:,0]]-p[e[:,1]],axis=1)/np.maximum(l,1e-12)
    rigid_part=o.name!='luceras_blockout' and k=='sculpt'
    absolute_edge_error=float(np.max(abs(np.linalg.norm(p[e[:,0]]-p[e[:,1]],axis=1)-l))) if rigid_part else None
    result.append(dict(name=o.name,finite=bool(np.all(np.isfinite(p))),bounds_min=p.min(axis=0).tolist(),bounds_max=p.max(axis=0).tolist(),vertices_farther_than_3m=int(np.sum(np.linalg.norm(p,axis=1)>3)),vertices_at_origin=int(np.sum(np.linalg.norm(p,axis=1)<1e-8)),edge_stretch_p99=float(np.quantile(ratio,.99)),edge_stretch_max=float(ratio.max()),rigid_edge_error=float(np.max(abs(ratio-1))) if rigid_part else None,rigid_absolute_edge_error_m=absolute_edge_error,rigid_resolved_edge_relative_error=float(np.max(abs(ratio[l>.0001]-1))) if rigid_part and np.any(l>.0001) else None))
   entry[k]=result
  poses[name]=entry
 facts['pose_checks']=poses
 volumes={}
 for obj in [bpy.data.objects['luceras_blockout'],bpy.data.objects['game_body_horns_claws']]:
  obj.data.calc_loop_triangles();vt=np.array([t.vertices[:] for t in obj.data.loop_triangles]);restvolume=abs(r.g.block.closed_volume(rest[obj.name],vt));volumes[obj.name]={}
  for name in r.POSES:
   volume=abs(r.g.block.closed_volume(references[name][obj.name],vt));volumes[obj.name][name]=dict(volume_m3=float(volume),change_fraction=float(volume/restvolume-1))
 facts['whole_closed_volume_per_pose']=volumes
 # Surface correspondence compares how the two bodies move at matching rest locations.
 source=bpy.data.objects['luceras_blockout'];source.data.calc_loop_triangles();tri=np.array([t.vertices[:] for t in source.data.loop_triangles]);sp=rest[source.name];tree=BVHTree.FromPolygons(sp.tolist(),tri.tolist(),all_triangles=True)
 correspondence=[];obj=bpy.data.objects['game_body_horns_claws'];a=r.weights(obj,names)
 # Exclude the rigid horn and claw islands by identifying the largest mesh component.
 adjacency=[[] for v in obj.data.vertices]
 for e in obj.data.edges:
  i,j=e.vertices;adjacency[i].append(j);adjacency[j].append(i)
 remaining=set(range(len(adjacency)));parts=[]
 while remaining:
  stack=[remaining.pop()];part=[]
  while stack:
   v=stack.pop();part.append(v)
   for j in adjacency[v]:
    if j in remaining:remaining.remove(j);stack.append(j)
  parts.append(part)
 bodyids=max(parts,key=len)
 for i in bodyids:
  hit,_,idx,d=tree.find_nearest(rest[obj.name][i]);ids=tri[idx];v0,v1,v2=sp[ids];uv=np.stack([v1-v0,v2-v0],axis=1);bc=np.linalg.lstsq(uv,np.array(hit)-v0,rcond=None)[0];co=np.clip([1-bc.sum(),bc[0],bc[1]],0,1);co/=sum(co);correspondence.append((i,ids,co))
 paired={}
 for name in r.POSES:
  sc=references[name][source.name];gp=references[name][obj.name];error=[]
  for i,ids,co in correspondence:error.append(float(np.linalg.norm((gp[i]-rest[obj.name][i])-co@(sc[ids]-sp[ids]))))
  paired[name]=dict(mean_motion_difference_m=float(np.mean(error)),p95_motion_difference_m=float(np.quantile(error,.95)),max_motion_difference_m=max(error),samples=len(error))
 facts['sculpt_game_correspondence']=paired
 # Every disconnected game island except the body should retain its edge lengths.
 rigid_ids=set(i for part in parts if part is not bodyids for i in part)
 e,l=edges[obj.name];mask=np.array([int(i) in rigid_ids and int(j) in rigid_ids for i,j in e]);rigid={}
 for name in r.POSES:
  p=references[name][obj.name];ratio=np.linalg.norm(p[e[mask,0]]-p[e[mask,1]],axis=1)/l[mask];rigid[name]=float(np.max(abs(ratio-1)))
 facts['game_rigid_island_max_edge_relative_error']=rigid
 eye_errors={}
 for name in r.POSES:
  errors=[]
  for eye in [o for o in r.meshes('game') if 'eye' in o.name]:
   e,l=edges[eye.name];p=references[name][eye.name];ratio=np.linalg.norm(p[e[:,0]]-p[e[:,1]],axis=1)/np.maximum(l,1e-12);errors.append(float(np.max(abs(ratio-1))))
  eye_errors[name]=max(errors,default=0)
 facts['game_eye_max_edge_relative_error']=eye_errors
 ear_checks={}
 body=bpy.data.objects['luceras_blockout'];wa=r.weights(body,names);e,l=edges[body.name]
 for side in ('l','r'):
  j=names.index('ear_'+side+'_01');rigid_verts=wa[:,j]>.999999;edge_mask=rigid_verts[e[:,0]]&rigid_verts[e[:,1]];per={}
  for name in r.POSES:
   p=references[name][body.name];length=np.linalg.norm(p[e[edge_mask,0]]-p[e[edge_mask,1]],axis=1);per[name]=float(np.max(abs(length-l[edge_mask])))
  ear_checks[side]=dict(rigid_vertices=int(rigid_verts.sum()),rigid_edges=int(edge_mask.sum()),max_absolute_edge_error_m=per)
 facts['ear_blade_rigidity']=ear_checks
 r.check_geometry()
 bpy.ops.wm.open_mainfile(filepath=str(r.OUT/'rig.blend'));rig=bpy.data.objects['luceras_rig']
 for k in ('sculpt','game'):
  for o in r.meshes(k):o.hide_set(False)
 bpy.context.view_layer.update()
 opening_errors={o.name:float(np.max(abs(r.coords(o,True)-references['rest'][o.name]))) for k in ('sculpt','game') for o in r.meshes(k)}
 facts['opening_control_enabled_rest_error_m']=opening_errors
 rig['controls_enabled']=0.;rig.update_tag();rig.animation_data_create();rig.animation_data.action=bpy.data.actions['review.poses']
 final_error={}
 for i,name in enumerate(r.POSES):
  bpy.context.scene.frame_set(1+i*10);bpy.context.view_layer.update();final_error[name]={}
  for k in ('sculpt','game'):
   for o in r.meshes(k):final_error[name][o.name]=float(np.max(abs(r.coords(o,True)-references[name][o.name])))
 facts['final_saved_rig_pose_max_coordinate_errors_m']=final_error
 facts['checks']=dict(joints=len(names)<=40,game_influences=facts['bodies']['game']['max_influences']<=4,all_weighted=all(x['unweighted_vertices']==0 for x in facts['bodies'].values()),game_triangles=facts['bodies']['game']['triangles']==11478,final_saved_rig_matches=max(v for d in final_error.values() for v in d.values())<1e-5,game_rigid_parts=max(rigid.values())<.001,game_eyes_rigid=max(eye_errors.values())<.001,finite_no_flying=all(o['finite'] and o['vertices_farther_than_3m']==0 for p in poses.values() for k in p.values() for o in k))
 facts['checks']['opening_control_rest_matches']=max(opening_errors.values())<.0002
 facts['checks']['ear_blades_rigid']=max(v for d in ear_checks.values() for v in d['max_absolute_edge_error_m'].values())<1e-6
 facts['rigid_tolerance']={'absolute_edge_error_m':1e-6,'relative_error_for_edges_over_0_1_mm':.001,'reason':'Single precision evaluated coordinates can create large relative errors on micron-length edges. Require both an absolute bound and relative accuracy on resolved edges.'}
 facts['checks']['sculpt_rigid_parts']=max(o['rigid_absolute_edge_error_m'] for p in poses.values() for o in p['sculpt'] if o['rigid_absolute_edge_error_m'] is not None)<1e-6 and max(o['rigid_resolved_edge_relative_error'] for p in poses.values() for o in p['sculpt'] if o['rigid_resolved_edge_relative_error'] is not None)<.001
 r.write('measurements.json',facts);r.check_geometry();assert all(facts['checks'].values()),facts['checks']
if __name__=='__main__':main()

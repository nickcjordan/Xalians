"""Independent saved-file numerical proof for B-tx7x."""
import bpy,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path('/mnt/c/dev/art-data/pipeline/codex-stream');O=R/'luceras-hindpaw/pass1'
def co(o):
 p=np.empty(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',p);return p.reshape(-1,3)
def hashval(x):return hashlib.sha256(repr(x).encode()).hexdigest()
def sig():
 result={}
 for o in bpy.data.objects:
  d={'type':o.type,'matrix':np.array(o.matrix_world).tolist(),'parent':o.parent.name if o.parent else None,'bone':o.parent_bone,'hide_render':o.hide_render,'modifiers':[(m.name,m.type) for m in o.modifiers]}
  if o.type=='MESH':d.update(co=hashlib.sha256(co(o).tobytes()).hexdigest(),topology=hashval(([e.vertices[:] for e in o.data.edges],[p.vertices[:] for p in o.data.polygons])),weights=hashval([[(g.group,g.weight) for g in v.groups] for v in o.data.vertices]),materials=[m.name if m else None for m in o.data.materials],face_attributes=hashval([(p.material_index,p.use_smooth) for p in o.data.polygons]))
  result[o.name]=d
 return result
bpy.ops.wm.open_mainfile(filepath=str(R/'luceras-merge/revert-forelegs/luceras_sculpt.blend'));baseline=sig();body=bpy.data.objects['luceras_blockout'];P=co(body);body.data.calc_loop_triangles();tri=np.array([t.vertices[:] for t in body.data.loop_triangles]);E=np.array([e.vertices[:] for e in body.data.edges])
bpy.ops.wm.open_mainfile(filepath=str(O/'luceras_sculpt.blend'));actual=sig();body=bpy.data.objects['luceras_blockout'];Q=co(body)
body.data.calc_loop_triangles();newtri=np.array([t.vertices[:] for t in body.data.loop_triangles]);assert np.array_equal(tri,newtri), 'Groom triangle index order changed'
diffs=[]
for name,v in baseline.items():
 for key,val in v.items():
  if (name=='luceras_blockout' and key=='co') or (name.startswith('hind_claw_') and key=='matrix'):continue
  if actual.get(name,{}).get(key)!=val:diffs.append([name,key])
assert not diffs, diffs
assert set(baseline)==set(actual)
region=(abs(P[:,0])>.04)&(P[:,1]>.025)&(P[:,1]<.34)&(P[:,2]<.13)
localtri=tri[region[tri].all(1)]
def meshcheck(V):
 bvh=BVHTree.FromPolygons(V.tolist(),localtri.tolist(),all_triangles=True)
 overlaps=bvh.overlap(bvh)
 pairs=[(i,j) for i,j in overlaps if i<j and not set(localtri[i])&set(localtri[j])]
 cross=np.cross(V[localtri[:,1]]-V[localtri[:,0]],V[localtri[:,2]]-V[localtri[:,0]])
 area=np.linalg.norm(cross,axis=1)/2
 ed=np.sort(np.concatenate([localtri[:,[0,1]],localtri[:,[1,2]],localtri[:,[2,0]]]),axis=1)
 return {'nonadjacent_triangle_overlap_count':len(pairs),'overlap_sample':pairs[:30],'degenerate_triangles_below_1e_14_m2':int((area<1e-14).sum()),'minimum_triangle_area_m2':float(area.min())},bvh
bc,_=meshcheck(P);qc,bt=meshcheck(Q)
# Mesh boundaries across the complete body. Region boundary itself is intentional and excluded.
ed=np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1);unique,cnt=np.unique(ed,axis=0,return_counts=True)
bodytree=BVHTree.FromPolygons(Q.tolist(),tri.tolist(),all_triangles=True)
mask=region&(P[:,2]<.065)
sym=np.array([bodytree.find_nearest(Vector((-p[0],p[1],p[2])))[3] for p in Q[mask]])
claws={}
for o in bpy.data.objects:
 if not o.name.startswith('hind_claw_'):continue
 C=np.array([o.matrix_world@v.co for v in o.data.vertices]);sd=[]
 for p in C:
  h,n,_,dist=bodytree.find_nearest(Vector(p));sd.append(float((Vector(p)-h).dot(n)))
 sd=np.array(sd);claws[o.name]={'vertices_inside_skin':int((sd<0).sum()),'vertices_outside_skin':int((sd>0).sum()),'maximum_outside_distance_m':float(sd.max()),'deepest_embed_m':float(-sd.min()),'min_z_m':float(C[:,2].min()),'mesh_coordinates_unchanged':baseline[o.name]['co']==actual[o.name]['co']}
z=np.load(O/'hindpaw_region_delta.npz');replay=P.copy();replay[z['vertex_indices']]=z['new_co'];reverse=Q.copy();reverse[z['vertex_indices']]=z['base_co']
proof={'loop_triangle_indices_exact':bool(np.array_equal(tri,newtri)),'loop_triangle_before_sha256':hashlib.sha256(tri.astype('<i4').tobytes()).hexdigest(),'loop_triangle_after_sha256':hashlib.sha256(newtri.astype('<i4').tobytes()).hexdigest(),'scope_differences':diffs,'same_object_set':True,'body_vertex_count':len(Q),'outside_region_max_displacement_m':float(np.linalg.norm(Q[~region]-P[~region],axis=1).max()),'delta_replay_exact':bool(np.array_equal(replay,Q)),'delta_reverse_exact':bool(np.array_equal(reverse,P)),'all_mesh_topology_weights_materials_unchanged':True,'body_boundary_edges':int((cnt==1).sum()),'body_nonmanifold_edges':int((cnt!=2).sum()),'region_baseline':bc,'region_repaired':qc,'mirror_surface_error_full_strength_m':{'max':float(sym.max()),'mean':float(sym.mean()),'p95':float(np.quantile(sym,.95))},'claws':claws}
(O/'verification.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof),flush=True)
# Compare saved paw surfaces against the authority, including source asymmetry.
bpy.ops.wm.open_mainfile(filepath=str(R/'luceras-compare/generated.blend'));g=bpy.data.objects['luceras_blockout'];G=co(g);g.data.calc_loop_triangles();GT=[t.vertices[:] for t in g.data.loop_triangles];gt=BVHTree.FromPolygons(G.tolist(),GT,all_triangles=True)
fit={}
for side,sign in [('left',1),('right',-1)]:
 ids=np.flatnonzero(mask&(P[:,0]*sign>0));ds=np.array([gt.find_nearest(Vector(p))[3] for p in Q[ids]])
 gp=G[(G[:,0]*sign>.04)&(G[:,1]>.025)&(G[:,1]<.34)&(G[:,2]<.065)]
 back=np.array([bodytree.find_nearest(Vector(p))[3] for p in gp])
 fit[side]={'repaired_to_generated_max_m':float(ds.max()),'repaired_to_generated_mean_m':float(ds.mean()),'generated_to_repaired_max_m':float(back.max()),'generated_to_repaired_mean_m':float(back.mean())}
proof['generated_surface_fit_below_65mm']=fit
(O/'verification.json').write_text(json.dumps(proof,indent=2));print('SOURCE_FIT',json.dumps(fit),flush=True)


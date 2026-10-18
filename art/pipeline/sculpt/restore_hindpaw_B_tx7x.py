"""B-tx7x coordinate-only hind paw restoration with topology correspondence proof."""
import bpy,sys,json,hashlib,time,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path('/mnt/c/dev/art-data/pipeline/codex-stream');OUT=ROOT/'luceras-hindpaw/pass1'
BASE=ROOT/'luceras-merge/revert-forelegs/luceras_sculpt.blend';GEN=ROOT/'luceras-compare/generated.blend'
def co(o):
 p=np.empty(len(o.data.vertices)*3,dtype=np.float64);o.data.vertices.foreach_get('co',p);return p.reshape(-1,3)
def edges(o):return np.array([e.vertices[:] for e in o.data.edges],dtype=np.int32)
def topology(o):
 h=hashlib.sha256();h.update(np.array([len(o.data.vertices)],dtype='<i8').tobytes())
 for prop,attr in [(o.data.edges,'vertices'),(o.data.loops,'vertex_index'),(o.data.polygons,'loop_total')]:
  n=len(prop)*(2 if attr=='vertices' else 1);a=np.empty(n,dtype='<i4');prop.foreach_get(attr,a);h.update(a.tobytes())
 return h.hexdigest()
def reg(p,s=0):return ((p[:,0]*s>.04) if s else (abs(p[:,0])>.04))&(p[:,1]>.025)&(p[:,1]<.34)&(p[:,2]<.13)
def ss(x):x=np.clip(x,0,1);return x*x*(3-2*x)
bpy.ops.wm.open_mainfile(filepath=str(GEN));g=bpy.data.objects['luceras_blockout'];G=co(g);GE=edges(g);GF=[p.vertices[:] for p in g.data.polygons];gtree=BVHTree.FromPolygons(G.tolist(),GF)
bpy.ops.wm.open_mainfile(filepath=str(BASE));o=bpy.data.objects['luceras_blockout'];P=co(o);Q=P.copy();E=edges(o);before=topology(o)
correspondence={};pairs=[]
for sign in [1,-1]:
 ai=np.flatnonzero(reg(P,sign));gi=np.flatnonzero(reg(G,sign));assert len(ai)==len(gi)
 am=np.full(len(P),-1);gm=np.full(len(G),-1);am[ai]=np.arange(len(ai));gm[gi]=np.arange(len(gi))
 ae=am[E];ge=gm[GE];sa=set(map(tuple,np.sort(ae[(ae>=0).all(1)],axis=1)));sg=set(map(tuple,np.sort(ge[(ge>=0).all(1)],axis=1)));assert sa==sg
 target=G[gi].copy()
 # Right side follows the same left surface, retaining its existing vertex layout.
 if sign<0:
  for k,p in enumerate(target):target[k]=np.array(gtree.find_nearest(Vector((-p[0],p[1],p[2])))[0])*[-1,1,1]
 w=ss((.12-P[ai,2])/.055)
 Q[ai]=P[ai]+w[:,None]*(target-P[ai])
 correspondence[str(sign)]={'vertices':len(ai),'edges':len(sa),'local_edge_connectivity_exact':True}
 pairs.extend(zip(ai.tolist(),gi.tolist()))
o.data.vertices.foreach_set('co',Q.ravel());o.data.update();Q=co(o)
assert before==topology(o)
bpy.context.view_layer.update()
bodytree=BVHTree.FromPolygons(Q.tolist(),[p.vertices[:] for p in o.data.polygons])
claws=[]
for side,sign in [('l',1),('r',-1)]:
 for j,x in enumerate([.140,.165,.182,.199],1):
  c=bpy.data.objects[f'hind_claw_{side}_{j}'];old=c.matrix_world.copy();C=np.array([old@v.co for v in c.data.vertices]);center=C.mean(0)
  # Rigid yaw aligns the inherited shaft to its toe. Mesh and scale stay untouched.
  xy=C[:,:2]-center[:2];vals,vec=np.linalg.eigh(xy.T@xy);axis=vec[:,-1]
  if axis[1]>0:axis=-axis
  yaw=np.arctan2(-1.,0.)-np.arctan2(axis[1],axis[0]);R=Matrix.Rotation(float(yaw),4,'Z')
  rotated=(np.array(R)[:3,:3]@(C-center).T).T+center
  front=rotated[rotated[:,1]<rotated[:,1].min()+.001];tip=front.mean(0)
  z=.014
  hit=bodytree.ray_cast(Vector((sign*x,0,z)),Vector((0,1,0)))[0]
  assert hit is not None
  offset=np.array([sign*x-tip[0],float(hit.y)-.007-rotated[:,1].min(),z-tip[2]])
  transform=Matrix.Translation(Vector(offset+center))@R@Matrix.Translation(Vector(-center))
  c.matrix_world=transform@old;bpy.context.view_layer.update()
  claws.append({'object':c.name,'base_matrix_world':[list(r) for r in old],'new_matrix_world':[list(r) for r in c.matrix_world],'toe_center_x_m':sign*x,'front_skin_at_claw_height_m':list(hit),'nominal_exposed_tip_m':.007,'rigid_yaw_radians':float(yaw),'mesh_sha256':hashlib.sha256(co(c).tobytes()).hexdigest()})
d=np.linalg.norm(Q-P,axis=1);moved=np.flatnonzero(d>0);allowed=reg(P)
np.savez_compressed(OUT/'hindpaw_region_delta.npz',base_co=P[moved],new_co=Q[moved],vertex_indices=moved)
meta={'body_object':o.name,'count':len(moved),'buildId':'B-tx7x','defectId':'D-qkpg','coordinate_space':'body local meters','topology_sha256':before,'region':{'abs_x_gt':.04,'y_open_interval':[.025,.34],'z_lt':.13,'full_strength_below_z':.065,'falloff_zero_at_z':.12}}
(OUT/'hindpaw_region_delta.json').write_text(json.dumps(meta,indent=2));(OUT/'hind_claw_transforms.json').write_text(json.dumps(claws,indent=2))
metrics={'buildId':'B-tx7x','vertex_count':len(P),'face_count':len(o.data.polygons),'moved_vertex_count':len(moved),'maximum_displacement_m':float(d.max()),'mean_moved_displacement_m':float(d[moved].mean()),'mean_all_displacement_m':float(d.mean()),'outside_region_vertex_count':int((~allowed).sum()),'outside_region_max_displacement_m':float(d[~allowed].max()),'at_or_above_falloff_max_displacement_m':float(d[P[:,2]>=.12].max()),'fore_paws_max_displacement_m':float(d[P[:,1]<=.025].max()),'topology_before_sha256':before,'topology_after_sha256':topology(o),'correspondence':correspondence,'claw_count':len(claws)}
(OUT/'measurements.json').write_text(json.dumps(metrics,indent=2))
np.savez_compressed(OUT/'repair_arrays.npz',base=P,new=Q,allowed=allowed,pairs=np.array(pairs),edges=E)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'luceras_sculpt.blend'),compress=True)
print('REPAIR',json.dumps(metrics),flush=True)
import runpy
sys.argv=['hindpaw_proof_render.py','--','repaired']
runpy.run_path(str(Path(__file__).with_name('hindpaw_proof_render.py')),run_name='__main__')
runpy.run_path(str(Path(__file__).with_name('verify_hindpaw_B_tx7x.py')),run_name='__main__')
sys.argv=['hindpaw_proof_render.py','--','generated','approved']
runpy.run_path(str(Path(__file__).with_name('hindpaw_proof_render.py')),run_name='__main__')

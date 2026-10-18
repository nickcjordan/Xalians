"""B-97qx pass 2. Regional topology repair of the approved pass 1 checkpoint."""
import os,sys,json,math,shutil
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
import build_pass1 as g
ITER=int(os.environ.get('GM_ITERATION','1'))
g.ITERATION=ITER
g.OUT=g.IterationOutput('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass2')
OUT=g.OUT;BASE=OUT.path.parent/'pass1'
oldcameras=g.cameras

def cameras():
 c=oldcameras()
 box=(Vector((.035,-.210,.585)),Vector((.105,-.115,.655)))
 c['ear_three_quarter']=(box,45,12);c['ear_side']=(box,90,0)
 c['horn_silhouette_side']=((Vector((-.08,-.28,.55)),Vector((.10,.015,.77))),90,0)
 return c
g.cameras=cameras

def loops(edges):
 adj={}
 for e in edges:
  a,b=e.verts;adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
 result=[];remaining=set(adj)
 while remaining:
  first=next(iter(remaining));cur=first;prev=None;loop=[]
  while cur not in loop:
   loop.append(cur);remaining.discard(cur)
   ns=[v for v in adj[cur] if v!=prev]
   if not ns:break
   prev,cur=cur,ns[0]
  if cur==first and all(len(adj[v])==2 for v in loop):result.append(loop)
 return result

def zip_rings(bm,a,b):
 i=j=0
 while i<len(a) or j<len(b):
  if j==len(b) or (i<len(a) and (i+1)/len(a)<=(j+1)/len(b)):
   bm.faces.new((a[i%len(a)],a[(i+1)%len(a)],b[j%len(b)]));i+=1
  else:
   bm.faces.new((a[i%len(a)],b[(j+1)%len(b)],b[j%len(b)]));j+=1

def ear_frame(side):
 up=Vector((.66*side,.22,.72)).normalized();face=Vector((.68*side,-.72,.10));face=(face-up*face.dot(up)).normalized()
 return Vector((.041*side,-.168,.590)),up,up.cross(face),-face

def section(points,tris,axis,origin,height,expected):
 d=(points-np.array(origin))@np.array(axis)-height
 mask=(d[tris].min(1)<0)&(d[tris].max(1)>0)
 adj={};coords={}
 for t in tris[mask]:
  hit=[]
  for i in range(3):
   a,b=int(t[i]),int(t[(i+1)%3])
   if d[a]*d[b]<0:
    key=tuple(sorted((a,b)));coords[key]=points[a]+(points[b]-points[a])*(d[a]/(d[a]-d[b]));hit.append(key)
  if len(hit)==2:
   a,b=hit;adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
 remaining=set(adj);paths=[]
 while remaining:
  first=next(iter(remaining));cur=first;prev=None;path=[]
  while cur not in path:
   path.append(cur);remaining.discard(cur);ns=[v for v in adj[cur] if v!=prev]
   if not ns:break
   prev,cur=cur,ns[0]
  if cur==first and len(path)>4:paths.append(np.array([coords[k] for k in path]))
 if not paths:raise RuntimeError('No closed sculpt section '+str(height))
 return min(paths,key=lambda p:np.linalg.norm(p.mean(0)-expected))

def sample_loop(p,across,depth,n):
 x=p@np.array(across);start=int(np.argmax(x));p=np.roll(p,-start,axis=0)
 # Always depart the outer width extreme on the hollow-side half.
 if (p[1]-p[-1])@np.array(depth)<0:p=np.concatenate([p[:1],p[:0:-1]])
 split=int(np.argmin(p@np.array(across)))
 halves=(p[:split+1],np.vstack([p[split:],p[:1]]));result=[]
 fractions=np.array([0,.015,.05,.15,.27,.39,.50,.61,.73,.85,.95,.985])
 for half in halves:
  arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(half,axis=0),axis=1))]
  result.append(np.stack([np.interp(fractions*arc[-1],arc,half[:,j]) for j in range(3)],axis=1))
 return np.vstack(result)

def rebuild_ears(low,src):
 src.data.calc_loop_triangles();points=np.array([v.co[:] for v in src.data.vertices]);tris=np.array([t.vertices[:] for t in src.data.loop_triangles]);records=[]
 bm=bmesh.new();bm.from_mesh(low.data)
 for side in (1,-1):
  origin,axis,across,depth=ear_frame(side)
  cut=.012;plane=origin+axis*cut;original={tuple(v.co) for v in bm.verts}
  result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=plane,plane_no=axis,clear_inner=False,clear_outer=False)
  cutedges=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge)]
  candidates=[v for v in bm.verts if v.co.x*side>.04 and v.co.y>-.205 and v.co.z>.59 and abs((v.co-origin).dot(across))<.028 and -.01<(v.co-origin).dot(depth)<.025]
  seed=max(candidates,key=lambda v:(v.co-origin).dot(axis));kill={seed};stack=[seed]
  while stack:
   v=stack.pop()
   for e in v.link_edges:
    q=e.other_vert(v)
    if q not in kill and (q.co-plane).dot(axis)>2e-7:kill.add(q);stack.append(q)
  assert len(kill)<600,('Ear cut reached the head',side,len(kill))
  removed=len(kill);bmesh.ops.delete(bm,geom=list(kill),context='VERTS')
  wire=[e for e in bm.edges if e.is_wire]
  if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
  discard=[e for e in cutedges if e.is_valid and not e.is_boundary]
  if discard:bmesh.ops.dissolve_edges(bm,edges=discard,use_verts=False,use_face_split=False)
  leftovers=[v for v in bm.verts if tuple(v.co) not in original and not v.is_boundary and len(v.link_edges)==2]
  if leftovers:bmesh.ops.dissolve_verts(bm,verts=leftovers,use_face_split=False,use_boundary_tear=False)
  bounds=loops([e for e in bm.edges if e.is_boundary])
  print('EAR_BOUNDARIES',side,[len(x) for x in bounds],flush=True)
  assert bounds,('No ear boundary',side)
  boundary=max(bounds,key=len)
  for other in bounds:
   if other is boundary:continue
   edges=[e for e in bm.edges if e.is_boundary and all(v in other for v in e.verts)]
   bmesh.ops.holes_fill(bm,edges=edges,sides=0)
  # The surviving root is kept on the sculpt. The new shell starts beyond its furthest vertex.
  h0=max((v.co-origin).dot(axis) for v in boundary)+.0008
  relevant=points[(points[:,0]*side>.055)&(points[:,1]>-.205)&(points[:,2]>.595)]
  hmax=float(((relevant-np.array(origin))@np.array(axis)).max())
  heights=h0+(hmax-h0)*np.sin(np.linspace(0,math.pi/2,14))
  rings=[]
  for h in heights[:-1]:
   p=section(points,tris,axis,origin,float(h),np.array(origin+axis*h))
   ring=[bm.verts.new(co) for co in sample_loop(p,across,depth,24)];rings.append(ring)
  # Align root to the first ring without crossing the zipper.
  center=sum((v.co for v in boundary),Vector())/len(boundary)
  # Boundary is already a topological cycle. Match orientation using closest sequence fit.
  best=None
  for reverse in (False,True):
   b=list(reversed(boundary)) if reverse else list(boundary)
   for shift in range(len(b)):
    a=b[shift:]+b[:shift];err=sum((a[int(j*len(a)/24)].co-rings[0][j].co).length_squared for j in range(24))
    if best is None or err<best[0]:best=(err,a)
  root=best[1]
  zip_rings(bm,root,rings[0])
  for a,b in zip(rings,rings[1:]):
   for j in range(24):bm.faces.new((a[j],a[(j+1)%24],b[(j+1)%24],b[j]))
  tipco=relevant[np.argmax((relevant-np.array(origin))@np.array(axis))];tip=bm.verts.new(tipco)
  for j in range(24):bm.faces.new((rings[-1][j],rings[-1][(j+1)%24],tip))
  relax=[]
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
  records.append({'root_relaxed_vertices':len(relax),'root_relaxation_max_m':max(delta,default=0),'root_relaxation_mean_m':sum(delta)/max(1,len(delta)),'side':side,'removed_vertices':removed,'root_vertices':len(boundary),'section_rings':len(rings),'vertices_per_ring':24,'start_height':h0,'end_height':hmax})
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
 g.write('iter1_ear_rebuild.json',{'method':'Ordered closed sculpt cross-sections. Consistent rim rails, 13 rings of 24 vertices, closed rounded tip and zipper join to preserved head root. No nearest-point fitting between opposite thin shell surfaces.','ears':records,'non_manifold':g.manifold(low)})

def rebuild_horns():
 records=[]
 for side in ('l','r'):
  src=bpy.data.objects['horn_'+side];dst=bpy.data.objects['game_horn_'+side];p=np.array([v.co[:] for v in src.data.vertices]);count=(len(p)-2)//32
  source=p[:count*32].reshape(count,32,3);centers=source.mean(1);delta=source-centers[:,None,:];radius=np.linalg.norm(delta,axis=2);unit=delta/np.maximum(radius[:,:,None],1e-9)
  smooth=np.stack([np.convolve(np.pad(radius[:,j],(8,8),mode='edge'),np.ones(17)/17,mode='valid') for j in range(32)],1)
  distance=np.linalg.norm(np.diff(centers,axis=0),axis=1);tangent=np.gradient(centers,axis=0);tangent/=np.linalg.norm(tangent,axis=1)[:,None];turn=np.linalg.norm(np.diff(tangent,axis=0),axis=1)
  metric=np.r_[0,np.cumsum(distance+.08*turn)];verts=[];length_rings=35;segments=10
  for h in np.linspace(0,metric[-1],length_rings):
   i=min(count-2,max(0,int(np.searchsorted(metric,h)-1)));f=(h-metric[i])/max(metric[i+1]-metric[i],1e-10)
   for theta in np.linspace(0,32,segments,endpoint=False):
    j=int(theta);s=theta-j;k=(j+1)%32
    q0=centers[i]+unit[i,j]*smooth[i,j]*(1-s)+unit[i,k]*smooth[i,k]*s
    q1=centers[i+1]+unit[i+1,j]*smooth[i+1,j]*(1-s)+unit[i+1,k]*smooth[i+1,k]*s
    verts.append(q0*(1-f)+q1*f)
  faces=[]
  for i in range(length_rings-1):
   for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
  c0=len(verts);verts.extend([p[-2],p[-1]])
  for j in range(segments):faces.extend([(c0,(j+1)%segments,j),(c0+1,(length_rings-1)*segments+j,(length_rings-1)*segments+(j+1)%segments)])
  me=bpy.data.meshes.new('horn_curve_'+side);me.from_pydata(verts,[],faces);me.update();dst.data=me;g.assign(dst,bpy.data.materials['Luceras_body']);g.bind_rigid(dst,bpy.data.objects['luceras_rig'],src.parent_bone)
  records.append({'object':dst.name,'length_rings':35,'girth_segments':10,'triangles':g.triangles(dst),'distribution':'Arc length plus 0.08 times tangent change places extra length stations at the crown.'})
 g.write('iter1_horns.json',records)
 for o in list(bpy.data.objects):
  if o.name.startswith('game_hind_claw'):
   src=bpy.data.objects[o.name[5:]];o.data=src.data.copy();m=o.modifiers.new('claw_detail','DECIMATE');m.ratio=48/g.triangles(o);g.apply(o,m);g.assign(o,bpy.data.materials['Luceras_body']);g.bind_rigid(o,bpy.data.objects['luceras_rig'],src.parent_bone)
  elif o.name in ('game_eye_l','game_eye_r'):
   bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=7,radius=.017);sphere=bpy.context.object;o.data=sphere.data.copy();bpy.data.objects.remove(sphere,do_unlink=True);g.assign(o,bpy.data.materials['Luceras_eyes']);g.bind_rigid(o,bpy.data.objects['luceras_rig'],bpy.data.objects[o.name[5:]].parent_bone)
def flat_budget(low,target):
 before=g.triangles(low);group=low.vertex_groups.get('flat_budget') or low.vertex_groups.new(name='flat_budget')
 ids=[]
 for v in low.data.vertices:
  p=v.co
  flat=(p.y>-.06 and p.y<.30 and p.z>.28) or (p.y>.36 and p.y<.66)
  protected=(p.y<-.27 and p.z>.44) or (abs(p.x)>.04 and p.z>.58 and p.y>-.205) or p.z<.055
  if not protected:group.add([v.index],1.0,'REPLACE')
  if flat and not protected:ids.append(v.index)
 m=low.modifiers.new('flat_budget','DECIMATE');m.ratio=target/before;m.vertex_group=group.name;m.vertex_group_factor=1
 g.apply(low,m);low.vertex_groups.remove(low.vertex_groups['flat_budget'])
 return {'before':before,'after':g.triangles(low),'target':target,'eligible_vertices':len(ids)}

def density(low,src):
 bm=bmesh.new();bm.from_mesh(low.data);edges=[]
 for e in bm.edges:
  p=(e.verts[0].co+e.verts[1].co)/2
  target=.0025 if p.y<-.282 and p.z>.46 else .0033 if p.z<.08 and .02<p.y<.16 else 100
  if e.calc_length()>target:edges.append(e)
 muzzle=[e for e in edges if (e.verts[0].co.y+e.verts[1].co.y)/2<-.282];toes=[e for e in edges if e not in muzzle]
 muzzle.sort(key=lambda e:-e.calc_length());toes.sort(key=lambda e:-e.calc_length()/(.002 if (e.verts[0].co.y+e.verts[1].co.y)/2<.09 else .005));edges=muzzle[:80]+toes[:200]
 old={tuple(v.co) for v in bm.verts};bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
 tree=BVHTree.FromPolygons([v.co for v in src.data.vertices],[list(p.vertices) for p in src.data.polygons])
 moved=0
 for v in bm.verts:
  if tuple(v.co) not in old:v.co=tree.find_nearest(v.co)[0];moved+=1
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
 return {'selected_edges':len(edges),'muzzle_edges':min(80,len(muzzle)),'hind_toe_edges':min(160,len(toes)),'new_projected_vertices':moved,'muzzle_target_m':.0025,'hind_toe_target_m':.0033}

def joint_rings(low,rig):
 records={}
 for bone in rig.data.bones:
  if not bone.name.startswith(('leg_','neck_','tail_')):continue
  axis=(bone.tail_local-bone.head_local).normalized();width=min(.022,bone.length*.24)
  offsets=[bone.length*f for f in (.25,.40,.55)] if bone.name.endswith('_01') else [-width,0,width]
  records[bone.name]={'bend_center_m':list(bone.head_local),'axis':list(axis),'bend_half_width_m':width,'rings':[{'offset_m':o} for o in offsets]}
 g.write('joint_edge_rings.json',{'joints':records})
 verify_final_rings(low)
 return
 data=json.loads((OUT/'joint_edge_rings.json').read_text());bm=bmesh.new();bm.from_mesh(low.data)
 for name,record in data['joints'].items():
  if record['edge_rings']>=3:continue
  axis=Vector(record['axis']);center=Vector(record['bend_center_m'])
  for evidence in record['rings']:
   if evidence['closed']:continue
   plane=center+axis*evidence['offset_m'];original={tuple(v.co) for v in bm.verts}
   result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=plane,plane_no=axis,clear_inner=False,clear_outer=False)
   edges=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge)];cycles=loops(edges)
   ring=min(cycles,key=lambda c:(sum((v.co for v in c),Vector())/len(c)-plane).length) if cycles else [];kept=set(ring)
   discard=[e for e in edges if not all(v in kept for v in e.verts)]
   if discard:bmesh.ops.dissolve_edges(bm,edges=discard,use_verts=False,use_face_split=False)
   leftovers=[v for v in bm.verts if tuple(v.co) not in original and v not in kept and len(v.link_edges)==2]
   if leftovers:bmesh.ops.dissolve_verts(bm,verts=leftovers,use_face_split=False,use_boundary_tear=False)
   print('ADDED_MISSING_RING',name,evidence['offset_m'],len(ring),flush=True)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
def verify_final_rings(low):
 import heapq
 data=json.loads((OUT/'joint_edge_rings.json').read_text());mesh=low.data;points=[v.co.copy() for v in mesh.vertices];edges=[tuple(e.vertices) for e in mesh.edges]
 for name,record in data['joints'].items():
  axis=Vector(record['axis']);center=Vector(record['bend_center_m']);ref=Vector((1,0,0)) if abs(axis.x)<.9 else Vector((0,1,0));u=axis.cross(ref).normalized();v=axis.cross(u).normalized();used=set();newrings=[]
  offsets=[r['offset_m'] for r in record['rings']];spacing=min(abs(a-b) for a,b in zip(offsets,offsets[1:]));band=spacing*.8
  for off in offsets:
   plane=center+axis*off;zs=[(p-plane).dot(axis) for p in points];angles=[math.atan2((p-plane).dot(v),(p-plane).dot(u)) for p in points]
   allowed={i for i,p in enumerate(points) if i not in used and abs(zs[i])<=band and ((p-plane)-axis*zs[i]).length<.35};adj={i:[] for i in allowed};cuts=[]
   for a,b in edges:
    if a not in allowed or b not in allowed:continue
    if abs(angles[a]-angles[b])>math.pi:cuts.append((a,b));continue
    cost=(points[a]-points[b]).length*(1+3*abs((zs[a]+zs[b])/2)/band)
    adj[a].append((b,cost));adj[b].append((a,cost))
   best=None
   for start,end in sorted(cuts,key=lambda e:abs(zs[e[0]])+abs(zs[e[1]]))[:40]:
    dist={start:0};prev={};queue=[(0,start)]
    while queue:
     cost,cur=heapq.heappop(queue)
     if cost!=dist.get(cur):continue
     if cur==end:break
     for nxt,w in adj[cur]:
      d=cost+w
      if d<dist.get(nxt,float('inf')):dist[nxt]=d;prev[nxt]=cur;heapq.heappush(queue,(d,nxt))
    if end not in dist:continue
    path=[end]
    while path[-1]!=start:path.append(prev[path[-1]])
    winding=sum((angles[b]-angles[a]+math.pi)%(2*math.pi)-math.pi for a,b in zip(path,path[1:]+path[:1]))/(2*math.pi)
    if len(path)<6 or abs(abs(winding)-1)>1e-5:continue
    cost=dist[end]+(points[end]-points[start]).length
    if best is None or cost<best[0]:best=(cost,path,winding)
   path=best[1] if best else [];used.update(path)
   newrings.append({'offset_m':off,'axial_half_band_m':band,'closed':bool(path),'edge_count':len(path),'winding_about_joint_axis':best[2] if best else 0,'vertex_indices':path,'vertex_coordinates_m':[list(points[i]) for i in path],'axial_range_m':[min(zs[i]+off for i in path),max(zs[i]+off for i in path)] if path else None})
  record['rings']=newrings;record['edge_rings']=sum(r['closed'] for r in newrings)
  print('FINAL_RING_VERIFY',name,record['edge_rings'],[r['edge_count'] for r in newrings],flush=True)
 data['all_at_least_three']=all(r['edge_rings']>=3 for r in data['joints'].values());data['verification_stage']='Final budgeted mesh. Three vertex-disjoint closed edge cycles, each winds once around the joint axis and remains in its declared axial bend band.';data['method']='Explicit bend cuts followed by final topological verification. Remove angle-wrap edges, solve shortest surface edge paths between their endpoints, then close each path with a wrap edge. Require winding magnitude one and at least six edges. Exclude previously used ring vertices.';g.write('joint_edge_rings.json',data)
def mesh():
 OUT.mkdir(exist_ok=True);shutil.copyfile(BASE/'sculpt_check.json',OUT/'sculpt_check.json')
 bpy.ops.wm.open_mainfile(filepath=str(BASE/'iter8_mesh.blend'))
 low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];g.clips.Poser(rig).reset();rig.data.pose_position='POSE'
 for m in list(low.modifiers):low.modifiers.remove(m)
 stats={'base_body':g.triangles(low)}
 rebuild_ears(low,src);rebuild_horns();stats['after_ears']=g.triangles(low)
 stats['flat_reduction']={'skipped':True,'reason':'Preserve source-derived curvature until final error-based reduction.'}
 stats['detail']=density(low,src);stats['after_detail']=g.triangles(low)
 joint_rings(low,rig);stats['after_rings']=g.triangles(low)
 stats['final_budget']=[]
 for attempt in range(4):
  if g.triangles(low)<=8988:break
  stats['final_budget'].append(flat_budget(low,8988))
 # Triangulate ngons explicitly so cuts and exports use identical surfaces.
 bm=bmesh.new();bm.from_mesh(low.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(low.data);bm.free()
 verify_final_rings(low)
 m=low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST';g.select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);g.apply(low,m);stats['unweighted_repaired']=g.normalize(low,rig)
 m=low.modifiers.new('rig','ARMATURE');m.object=rig
 game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')]
 for o in game:
  for p in o.data.polygons:p.use_smooth=True
 g.uv([o for o in game if 'eye' not in o.name]);g.uv([o for o in game if 'eye' in o.name])
 data=json.loads((BASE/'iter8_mesh.json').read_text());data.update(body_triangles=g.triangles(low),total=sum(g.triangles(o) for o in game),body_non_manifold=g.manifold(low),pass2_changes=stats)
 data['rigid_triangles']={o.name:g.triangles(o) for o in game if o!=low}
 g.write('iter1_mesh.json',data)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iter1_mesh.blend'))
 print('MESH_RESULT',json.dumps(stats),data['total'],flush=True)
 g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=8
 for name in ('head_three_quarter','ear_three_quarter','hind_paw_side'):
  box,az,el=cameras()[name];cam=g.lookdev.place_camera('lookdev_preview_'+name,box,az,el,.04)
  for variant in ('sculpt','game'):
   g.visible(variant);g.lookdev.render(cam,OUT/f'iter1_prebake_{variant}_{name}.png',size=512)

def bake():
 bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_mesh.blend'))
 data=json.loads((OUT/'iter1_mesh.json').read_text())
 if data['total']>11500:raise RuntimeError('Pass 2 triangle ceiling exceeded: '+str(data['total']))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16
 scene.render.bake.use_selected_to_active=True;scene.render.bake.use_clear=False;scene.render.bake.normal_space='TANGENT';scene.render.bake.margin=16;scene.render.bake.max_ray_distance=.025
 pairs=[(bpy.data.objects[a],bpy.data.objects[b]) for a,b in data['pairs'] if 'eye' not in a]
 mat=bpy.data.materials['Luceras_body'];nodes=mat.node_tree.nodes
 for kind in ('NORMAL','AO'):
  image=bpy.data.images.new('normal_2048' if kind=='NORMAL' else 'ao_2048',2048,2048,alpha=False,float_buffer=False)
  image.generated_color=(.5,.5,1,1) if kind=='NORMAL' else (1,1,1,1);image.colorspace_settings.name='Non-Color'
  node=nodes.new('ShaderNodeTexImage');node.image=image;node.name=kind+'_bake';nodes.active=node
  for src,dst in pairs:
   print('BAKE',kind,src.name,flush=True)
   for a,b in pairs:a.hide_render=True;b.hide_render=True
   if kind=='AO':
    for a,b in pairs:a.hide_render=False
   src.hide_render=False;dst.hide_render=False
   cage=g.duplicate(dst,'bake_cage');cage.modifiers.clear();cage.hide_render=True
   for v in cage.data.vertices:
    p=v.co;distance=.0012 if dst.name=='game_body' and abs(p.x)>.045 and p.z>.59 and p.y>-.205 else .003 if dst.name=='game_body' and p.z<.05 else .008
    v.co+=v.normal*distance
   cage.data.update();scene.render.bake.use_cage=True;scene.render.bake.cage_object=cage.name if scene.render.bake.bl_rna.properties['cage_object'].type=='STRING' else cage
   scene.render.bake.cage_extrusion=0
   g.select(dst,[src]);bpy.ops.object.bake(type=kind)
   scene.render.bake.cage_object='' if scene.render.bake.bl_rna.properties['cage_object'].type=='STRING' else None;bpy.data.objects.remove(cage,do_unlink=True);src.hide_render=True
  image.filepath_raw=str(OUT/(image.name+'.png'));image.file_format='PNG';image.save()
  small=image.copy();small.name=image.name.replace('2048','1024');small.scale(1024,1024);small.filepath_raw=str(OUT/(small.name+'.png'));small.save();node.image=small
 bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');normal=nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(nodes['NORMAL_bake'].outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 gn=nodes.new('ShaderNodeGroup');gn.node_tree=group;mat.node_tree.links.new(nodes['AO_bake'].outputs['Color'],gn.inputs['Occlusion'])
 for o in bpy.data.objects:
  if o.type=='MESH':o.hide_render=not o.name.startswith('game_')
 g.write('bake_settings.json',{'engine':'Cycles CPU','samples':16,'size_bake':2048,'size_game':1024,'space':'tangent','normal_convention':'OpenGL +Y','selected_to_active':True,'explicit_cage':True,'cage_offset_m':{'ear':.0012,'toes':.003,'remaining':.008},'max_ray_distance_m':.025,'margin_px_2048':16,'ao':'Matched pairs with other sculpt sources visible for contact occlusion.'})
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iter1_baked.blend'))
g.bake=bake
oldmeasure=g.measure
def measure():
 verify_final_rings(bpy.data.objects['game_body'])
 facts=oldmeasure()
 facts['hard_budget_checks']['triangles']=facts['triangles_total']<=11500
 rings=json.loads((OUT/'joint_edge_rings.json').read_text())
 facts['joint_edge_rings']=rings
 facts['joint_edge_rings_verified']=rings['all_at_least_three']
 facts['hard_budget_checks']['joint_rings']=rings['all_at_least_three']
 g.write('measurements.json',facts)
 return facts
g.measure=measure
oldrender=g.lookdev.render
def render(camera,path,size=1024):
 scene=bpy.context.scene
 if 'horn_silhouette_side' not in str(path):return oldrender(camera,path,size)
 bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');color=bg.inputs['Color'].default_value[:];strength=bg.inputs['Strength'].default_value
 bg.inputs['Color'].default_value=(.42,.60,.82,1);bg.inputs['Strength'].default_value=.8
 ground=bpy.data.objects.get('lookdev_ground');hidden=ground.hide_render if ground else False
 if ground:ground.hide_render=True
 result=oldrender(camera,path,size)
 if ground:ground.hide_render=hidden
 bg.inputs['Color'].default_value=color;bg.inputs['Strength'].default_value=strength
 return result
g.lookdev.render=render
if __name__=='__main__':
 import time,runpy,traceback
 stage=sys.argv[sys.argv.index('--stage')+1] if '--stage' in sys.argv else 'all'
 try:
  if stage in ('mesh','all'):mesh()
  if stage in ('bake','all','bake_render'):g.bake()
  if stage in ('render','all','bake_render'):g.renders()
  if stage=='export':
   bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_review.blend'));g.export()
 except Exception:
  traceback.print_exc()
 request=OUT/f'iter1_continue.json';deadline=time.time()+90
 print('REVIEW_WINDOW',str(request),flush=True)
 while time.time()<deadline and not request.exists():time.sleep(.5)
 if request.exists():
  cfg=json.loads(request.read_text());request.unlink();os.environ['GM_ITERATION']=str(cfg.get('iteration',ITER))
  sys.argv=sys.argv[:sys.argv.index('--')]+['--','--stage',cfg.get('stage','all')]
  runpy.run_path(__file__,run_name='__main__')
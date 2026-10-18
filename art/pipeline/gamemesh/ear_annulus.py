"""Ordered annulus triangulation for the ear-root bridge."""
import math
import bmesh
from mathutils import Vector
import build_pass2 as p2

def repair(bm,src):
 records=[]
 for side in (1,-1):
  origin,axis,across,depth=p2.ear_frame(side)
  crossed={f for f in bm.faces if min((v.co-origin).dot(axis) for v in f.verts)<.0124 and max((v.co-origin).dot(axis) for v in f.verts)>.0124}
  seed=min(crossed,key=lambda f:(f.calc_center_median()-(origin+axis*.013)).length)
  selected={seed};stack=[seed]
  while stack:
   f=stack.pop()
   for e in f.edges:
    for q in e.link_faces:
     if q in crossed and q not in selected:selected.add(q);stack.append(q)
  bridge=list(selected)
  if not bridge:raise RuntimeError('No original ear annulus '+str(side))
  bmesh.ops.delete(bm,geom=bridge,context='FACES_ONLY')
  wire=[e for e in bm.edges if e.is_wire]
  if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
  loops=p2.loops([e for e in bm.edges if e.is_boundary])
  if len(loops)!=2:raise RuntimeError('Expected two annulus boundaries '+str([len(a) for a in loops]))
  loops.sort(key=lambda a:sum((v.co-origin).dot(axis) for v in a)/len(a));a,b=loops;m,n=len(a),len(b);best=None
  for reverse in (False,True):
   base=list(reversed(b)) if reverse else b[:]
   for shift in range(n):
    ring=base[shift:]+base[:shift];dp=[[float('inf')]*(n+1) for _ in range(m+1)];prev={};dp[0][0]=0
    for i in range(m+1):
     for j in range(n+1):
      if i<m:
       cost=dp[i][j]+(a[(i+1)%m].co-ring[j%n].co).length_squared
       if cost<dp[i+1][j]:dp[i+1][j]=cost;prev[i+1,j]=(i,j,'a')
      if j<n:
       cost=dp[i][j]+(a[i%m].co-ring[(j+1)%n].co).length_squared
       if cost<dp[i][j+1]:dp[i][j+1]=cost;prev[i,j+1]=(i,j,'b')
    if best is None or dp[m][n]<best[0]:best=(dp[m][n],ring,prev)
  _,b,prev=best;steps=[];i,j=m,n
  while i or j:
   pi,pj,kind=prev[i,j];steps.append((pi,pj,kind));i,j=pi,pj
  for i,j,kind in reversed(steps):
   if kind=='a':bm.faces.new((a[i%m],a[(i+1)%m],b[j%n]))
   else:bm.faces.new((a[i%m],b[(j+1)%n],b[j%n]))
  records.append({'side':side,'removed_bridge_faces':len(bridge),'head_boundary_vertices':m,'ear_boundary_vertices':n,'added_bridge_triangles':len(steps),'method':'Minimum-squared-cross-edge dynamic triangulation of two ordered closed boundary loops. No vertex displacement.'})
 # Add intermediate samples across long bridge edges, then fit only those samples.
 from mathutils.bvhtree import BVHTree
 points=[v.co.copy() for v in src.data.vertices]
 full=BVHTree.FromPolygons(points,[tuple(f.vertices) for f in src.data.polygons])
 edges=[]
 for e in bm.edges:
  c=(e.verts[0].co+e.verts[1].co)/2
  side=1 if c.x>0 else -1;origin,axis,across,depth=p2.ear_frame(side)
  hs=[(v.co-origin).dot(axis) for v in e.verts]
  if min(hs)>.0119 and max(hs)<.0129 and abs(c.x)>.015 and c.z>.57 and e.calc_length()>.006:edges.append(e)
 old={tuple(v.co) for v in bm.verts}
 if edges:bmesh.ops.subdivide_edges(bm,edges=edges,cuts=2,use_grid_fill=True)
 bm.normal_update();new=[v for v in bm.verts if tuple(v.co) not in old]
 for v in new:
  hits=full.find_nearest_range(v.co,.04)
  valid=[h for h in hits if h[1].dot(v.normal)>.0]
  if valid:v.co=min(valid,key=lambda h:h[3])[0]
 records.append({'bridge_edges_subdivided':len(edges),'bridge_new_vertices':len(new)})
 return records

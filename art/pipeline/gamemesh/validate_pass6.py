"""Read-only frozen geometry audit including both thighs and protected-part equality."""
import bpy,bmesh,json,hashlib,sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh');OUT=P/'pass6'
def inspect(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));o=bpy.data.objects['game_body_horns_claws'];bm=bmesh.new();bm.from_mesh(o.data);bm.normal_update();bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table()
 # Body is the largest connected component; horns/claws remain disconnected.
 todo=set(bm.verts);components=[]
 while todo:
  seed=todo.pop();part={seed};stack=[seed]
  while stack:
   for e in stack.pop().link_edges:
    for v in e.verts:
     if v in todo:todo.remove(v);part.add(v);stack.append(v)
  components.append(part)
 body=max(components,key=len);faces=[f for f in bm.faces if f.verts[0] in body];edges=[e for e in bm.edges if e.verts[0] in body]
 def region(p):
  if p.z<.10:return 'paws_protected'
  if p.y>.30:return 'tail_or_root_protected'
  if p.z>.58 and p.y<-.10 and abs(p.x)>.035:return 'ears_protected'
  if p.y>.12 and p.z>.25:return 'left_thigh' if p.x>0 else 'right_thigh'
  if p.y<-.10:return 'head_neck'
  return 'torso_legs'
 folded={}
 for e in edges:
  if e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.8:
   p=(e.verts[0].co+e.verts[1].co)/2;folded.setdefault(region(p),[]).append({'center':list(p),'dot':e.link_faces[0].normal.dot(e.link_faces[1].normal)})
 tree=BVHTree.FromPolygons([v.co for v in bm.verts],[[v.index for v in f.verts] for f in faces]);pairs=tree.overlap(tree);collisions={}
 for a,b in pairs:
  if a>=b or set(faces[a].verts)&set(faces[b].verts):continue
  p=faces[a].calc_center_median();collisions.setdefault(region(p),[]).append([list(p),list(faces[b].calc_center_median())])
 uv=bm.loops.layers.uv.active
 def sig(f):return sorted((tuple(v.co) for v in f.verts))
 records={str(sorted(tuple(v.co) for v in f.verts)):sorted((tuple(l.vert.co),tuple(l[uv].uv)) for l in f.loops) for f in bm.faces}
 protected={str(sig(f)):records[str(sig(f))] for f in bm.faces if f.verts[0] not in body or all(region(v.co) in ('paws_protected','tail_or_root_protected','ears_protected') for v in f.verts)}
 result={'body_vertices':len(body),'body_faces':len(faces),'body_non_manifold_edges':sum(not e.is_manifold for e in edges),'zero_area_faces':sum(f.calc_area()<1e-14 for f in faces),'inconsistent_winding_edges':sum(e.is_manifold and not e.is_contiguous for e in edges),'near_opposed_edge_candidates_by_region':folded,'nonadjacent_BVH_overlap_candidates_by_region':collisions,'body_components':1,'disconnected_rigid_components':len(components)-1}
 return result,records,protected
before,old,protected=inspect(P/'pass5/gamemesh.blend');after,new,protectednew=inspect(OUT/'gamemesh.blend')
result={'before':before,'after':after,'protected_face_geometry_and_uv_identical':protected==protectednew,'retained_face_uvs_changed':sum(old[k]!=new[k] for k in old.keys()&new.keys()),'removed_faces':len(old.keys()-new.keys()),'added_faces':len(new.keys()-old.keys()),'scan_limitations':'BVH triangle overlap and near-opposed adjacent normals are candidate tests. Thin folded ear rims and contact surfaces can trigger them. Shared-vertex pairs excluded from overlap test. Not a proof of absence of every self-intersection.','blend_sha256':hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()}
(OUT/'frozen_geometry_audit.json').write_text(json.dumps(result,indent=2));print('AUDIT_SUMMARY',json.dumps({k:v for k,v in result.items() if k not in ('before','after')}));print('COUNTS',json.dumps({p:{k:{r:len(v) for r,v in d[k].items()} for k in ('near_opposed_edge_candidates_by_region','nonadjacent_BVH_overlap_candidates_by_region')} for p,d in [('before',before),('after',after)]}))

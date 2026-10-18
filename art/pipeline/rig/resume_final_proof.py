"""Continue final proof after a recorded measurement failure. No asset edits."""
import bpy,sys,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
import pass2_additional_checks
rig=p.openfile(p.OUT/'rig.blend');o=bpy.data.objects['game_body_horns_claws'];edges=np.array([e.vertices[:] for e in o.data.edges]);adj=[[] for _ in o.data.vertices]
for i,j in edges:adj[i].append(j);adj[j].append(i)
todo=set(range(len(adj)));parts=[]
while todo:
 stack=[todo.pop()];part=[]
 while stack:
  i=stack.pop();part.append(i)
  for j in adj[i]:
   if j in todo:todo.remove(j);stack.append(j)
 parts.append(part)
refs=np.load(p.OUT/'blender_game_vertices.npz');rest=refs['rest__'+o.name];names=[b.name for b in rig.data.bones];weights=p.r.weights(o,names);audit=[]
for part in sorted(parts,key=len)[:-1]:
 ids=np.array(part);inside=np.zeros(len(adj),bool);inside[ids]=True;e=edges[inside[edges[:,0]]&inside[edges[:,1]]];length=np.linalg.norm(rest[e[:,0]]-rest[e[:,1]],axis=1);errors={}
 for pose in p.r.POSES:
  q=refs[pose+'__'+o.name];err=np.linalg.norm(q[e[:,0]]-q[e[:,1]],axis=1)-length;errors[pose]={'max_absolute_edge_error_m':float(abs(err).max()),'max_relative_edge_error':float((abs(err)/np.maximum(length,1e-12)).max())}
 audit.append({'vertices':len(ids),'rest_center_m':rest[ids].mean(axis=0).tolist(),'influences':{n:float(weights[ids,j].max()) for j,n in enumerate(names) if weights[ids,j].max()>0},'errors':errors})
p.write('rigid_island_audit.json',audit)
pass2_additional_checks.main()
rig=p.openfile(p.OUT/'rig.blend');p.r.renders(rig,'final',True);p.detail(rig,'after')

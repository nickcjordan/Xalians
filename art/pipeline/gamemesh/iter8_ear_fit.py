import os,runpy,bpy,numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
os.environ['GM_ITERATION']='8'
g=runpy.run_path('/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/gamemesh/build_gamemesh.py',run_name='module')
p='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1/'
bpy.ops.wm.open_mainfile(filepath=p+'iter7_mesh.blend')
low=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout']
records=[]
for side in (-1,1):
 def ear(p):return p.x*side>.045 and p.z>.60 and p.y<-.10
 lv=[v for v in low.data.vertices if ear(v.co)]
 sv=[v.co.copy() for v in src.data.vertices if ear(v.co)]
 adj={v.index:[] for v in lv}
 for edge in low.data.edges:
  a,b=edge.vertices
  if a in adj:adj[a].append(low.data.vertices[b])
  if b in adj:adj[b].append(low.data.vertices[a])
 for iteration in range(32):
  smooth={v.index:sum((w.co for w in adj[v.index]),Vector())/len(adj[v.index]) for v in lv if adj[v.index]}
  for v in lv:
   if v.index in smooth:v.co=v.co.lerp(smooth[v.index],.18)
  kd=KDTree(len(lv))
  for i,v in enumerate(lv):kd.insert(v.co,i)
  kd.balance();sums=[Vector() for v in lv];counts=[0]*len(lv)
  for pnt in sv:
   co,i,d=kd.find(pnt);sums[i]+=pnt;counts[i]+=1
  for i,v in enumerate(lv):
   if counts[i]:v.co=v.co.lerp(sums[i]/counts[i],.35)
 records.append({'side':side,'vertices':len(lv),'samples':len(sv)})
low.data.update()
m=low.modifiers.new('refitted_weights','DATA_TRANSFER');m.object=src;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST'
g['apply'](low,m);g['normalize'](low,bpy.data.objects['luceras_rig'])
game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')]
g['uv']([o for o in game if 'eye' not in o.name])
g['write']('iter8_ear_fit.json',{'method':'Thirty-two damped Laplacian and centroidal surface fitting steps on ear vertices. Experimental, must pass visual review.','regions':records})
bpy.ops.wm.save_as_mainfile(filepath=p+'iter8_mesh.blend')
g['bake']();g['renders']()

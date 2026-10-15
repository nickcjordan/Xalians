"""Compare saved 12d with its parent, including all held mesh and hair data."""
import sys,json,hashlib
from pathlib import Path
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values

def digest(a): return hashlib.sha256(a.tobytes()).hexdigest()
def material_graph(mat):
 if not mat.use_nodes:return dict(name=mat.name,diffuse=list(mat.diffuse_color))
 nodes=[]
 for n in mat.node_tree.nodes:
  inputs=[]
  for sock in n.inputs:
   v=getattr(sock,'default_value',None)
   if v is None:continue
   if isinstance(v,(str,int,float,bool)):value=v
   elif isinstance(v,bpy.types.ID):value=v.name
   else:
    try:value=list(v)
    except TypeError:value=str(v)
   inputs.append((sock.identifier,value))
  nodes.append(dict(name=n.name,type=n.bl_idname,inputs=inputs,attribute=getattr(n,'attribute_name',None),operation=getattr(n,'operation',None),blend=getattr(n,'blend_type',None)))
 links=sorted((l.from_node.name,l.from_socket.identifier,l.to_node.name,l.to_socket.identifier) for l in mat.node_tree.links)
 return dict(nodes=nodes,links=links)

def snapshot(path, changed):
 bpy.ops.wm.open_mainfile(filepath=str(path/'surface.blend'))
 result={'materialGraphs':{m.name:material_graph(m) for m in bpy.data.materials if m.use_nodes}}
 for ob in bpy.data.objects:
  if ob.type!='MESH':continue
  me=ob.data; attrs={}
  for a in me.attributes:
   if a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','BOOLEAN'):continue
   w=3 if a.data_type=='FLOAT_VECTOR' else 1
   v=np.empty(len(a.data)*w,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
   a.data.foreach_get('vector' if w==3 else 'value',v);attrs[a.name]=digest(v)
  loops=np.empty(len(me.loops),np.int32);me.loops.foreach_get('vertex_index',loops)
  result[ob.name]=dict(attributes=attrs,topology=digest(loops),materials=[m.name if m else None for m in me.materials],matrix=[list(v) for v in ob.matrix_world])
 cu=bpy.data.objects['Akinza fur'].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
 starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts)
 pm=np.repeat(changed,np.diff(np.r_[starts,len(cu.points)]));attrs={}
 for a in cu.attributes:
  if a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','BOOLEAN'):continue
  w=3 if a.data_type=='FLOAT_VECTOR' else 1
  v=np.empty(len(a.data)*w,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
  a.data.foreach_get('vector' if w==3 else 'value',v);v=v.reshape(-1,w)
  if a.name in ('position','radius'):v=v[~(changed if a.domain=='CURVE' else pm)]
  attrs[a.name]=digest(v)
 result['fur']=dict(matrix=[list(v) for v in bpy.data.objects['Akinza fur'].matrix_world],protectedAttributes=attrs,starts=digest(starts),roots=digest(values(cu,'position','vector',3)[starts]),materials=[m.name if m else None for m in cu.materials])
 return result
args=sys.argv[sys.argv.index('--')+1:];p=Path(args[0]);base=Path(args[1]) if len(args)>1 else p.parent/'s12b2'; changed=np.load(p/'patch-evidence.npz')['changed']
a=snapshot(base,changed);b=snapshot(p,changed);assert a==b,'Held saved data differs'
(p/'saved-protection-check.json').write_text(json.dumps(dict(equal=True,baseline=str(base),protected=b),indent=2))
print('SAVED_PROTECTION_PASS',flush=True)

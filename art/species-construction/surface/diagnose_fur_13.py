"""Read-only inventory for the saved eye materials and their geometry."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
p=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(p/'surface.blend'))
result={}
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    co=np.empty(len(ob.data.vertices)*3,np.float32);ob.data.vertices.foreach_get('co',co);co=co.reshape(-1,3)
    result[ob.name]=dict(vertices=len(co),bounds=[co.min(0).tolist(),co.max(0).tolist()],materials=[m.name for m in ob.data.materials],attributes=[(a.name,a.domain,a.data_type) for a in ob.data.attributes])
result['materials']={m.name:[dict(name=n.name,type=n.bl_idname,attribute=getattr(n,'attribute_name',None),color=list(n.inputs['Base Color'].default_value) if 'Base Color' in n.inputs else None) for n in m.node_tree.nodes] for m in bpy.data.materials if m.use_nodes}
(p.parent/'13-inventory.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))

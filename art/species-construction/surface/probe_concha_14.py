"""Read ear-base thickness before the localized concha operation."""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

asm = Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(asm/'akinza.blend'))
skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o:len(o.data.vertices))
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
records=[]
print('SKIN',skin.name,len(skin.data.vertices),flush=True)
for u in (.035,.055,.075,.095):
    for v in (-.005,.015,.035):
        x,z=.17+.8*u-.6*v,.64+.6*u+.8*v
        front=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)),2)
        back=bvh.ray_cast(Vector((x,1,z)),Vector((0,-1,0)),2)
        print('EAR',u,v,'xz',x,z,'front',tuple(front[0]) if front[0] else None,'back',tuple(back[0]) if back[0] else None,flush=True)
        records.append(dict(u=u,v=v,front=list(front[0]) if front[0] else None,back=list(back[0]) if back[0] else None))
out=Path(sys.argv[-1]);out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(records,indent=2))

"""Read-only source mask and exact local topology export for the fix pass."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from refine_ear_root_12b2 import values
from concha_fix14_paths import baseline
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
source=baseline(work)
bpy.ops.wm.open_mainfile(filepath=str(source/'surface.blend'))
info=json.loads((source/'surface-info.json').read_text())
skin=bpy.data.objects[info['skin']];me=skin.data
me.calc_loop_triangles()
tri=np.empty(len(me.loop_triangles)*3,np.int32);me.loop_triangles.foreach_get('vertices',tri)
cu=bpy.data.objects['Akinza fur'].data
s=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',s)
data=dict(tri=tri.reshape(-1,3),starts=s)
for name in ('radius','cupm','pale','fur_tone','fur_guided','strlen','nrm'):
 a=cu.attributes.get(name)
 if a is not None:data[name]=values(cu,name,'vector' if a.data_type=='FLOAT_VECTOR' else 'value',3 if a.data_type=='FLOAT_VECTOR' else 1)
np.savez_compressed(work/'14-fix-probe.npz',**data)
print('FIX_PROBE_EXPORTED',flush=True)

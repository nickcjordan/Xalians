"""Cull only diagnosed rogue hairs; preserve every coordinate and other attribute."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
before,out=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
cu=bpy.data.objects['Akinza fur'].data
selection=np.load(out/'cull-selection.npz')['changed']
starts=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',starts)
radius=np.empty(len(cu.points),np.float32);cu.attributes['radius'].data.foreach_get('value',radius)
mask=np.repeat(selection,np.diff(np.r_[starts,len(cu.points)]));radius[mask]=0
cu.attributes['radius'].data.foreach_set('value',radius)
out.mkdir(parents=True,exist_ok=True)
np.savez_compressed(out/'patch-evidence.npz',changed=selection)
info=json.loads((before/'surface-info.json').read_text());info.update(parent=str(before),rogue13b=dict(culled=int(selection.sum()),method='zero radius only, fixed local envelope and flow diagnostic'))
(out/'surface-info.json').write_text(json.dumps(info,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('ROGUE_CULL_SAVED',int(selection.sum()),flush=True)

import sys, json, shutil
from pathlib import Path
import bpy
import numpy as np
src, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
cu = bpy.data.objects['Akinza fur'].data
st = np.empty(len(cu.curves), np.int32); cu.curves.foreach_get('first_point_index', st)
counts = np.diff(np.r_[st, len(cu.points)])
rad = np.empty(len(cu.points), np.float32); cu.attributes['radius'].data.foreach_get('value', rad)
m = np.zeros(len(st), bool); m[420420:425342] = True
rad[np.repeat(m, counts)] = 0; cu.attributes['radius'].data.foreach_set('value', rad)
shutil.copy(src / 'surface-info.json', out / 'surface-info.json')
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('NOPOOF_SAVED', flush=True)

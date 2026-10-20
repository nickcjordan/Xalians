"""Step 19: save s12-18 with the default gray poof color (geometry untouched).

  blender -b --python build_ear_poof_19.py -- <s12-18 dir> <out dir>
"""
import sys
import json
import hashlib
from pathlib import Path
import bpy
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ear_poof_color_19 as color

before, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
assert not (out / 'surface.blend').exists()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
cu = bpy.data.objects['Akinza fur'].data
pos = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', pos)
def get(name):
    a = cu.attributes[name]
    v = np.empty(len(a.data), np.float32)
    a.data.foreach_get('value', v)
    return v
prior = dict(np.load(before / 'patch-evidence.npz'))
evidence = dict(baseTone=get('fur_tone'), baseCupm=get('cupm'), band=prior['band'])
default = color.options()['default']
color.apply(evidence, default)
after = np.empty(len(cu.points) * 3, np.float32)
cu.points.foreach_get('position', after)
assert np.array_equal(pos, after), 'Geometry must not change'
info = json.loads((before / 'surface-info.json').read_text())
info.update(parent=str(before))
info['earPoofColor19'] = dict(sourceSha256=hashlib.sha256((before / 'surface.blend').read_bytes()).hexdigest(),
                              default=default, options=color.options()['options'], geometryExact=True,
                              config='art/species-construction/surface/akinza-ear-poof-colors.json')
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
np.savez_compressed(out / 'patch-evidence.npz', **prior, baseTone=evidence['baseTone'], baseCupm=evidence['baseCupm'])
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('EAR_POOF_19_SAVED', default, flush=True)

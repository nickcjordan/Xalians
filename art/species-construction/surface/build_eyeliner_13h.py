"""One saved ribbon build from the held 13g surface."""
import sys
import json
from pathlib import Path
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from ribbon_eyeliner_13h import build, apply

args = sys.argv[sys.argv.index('--')+1:]
dense = '--experimental-dense' in args
if dense:args.remove('--experimental-dense')
before, after = map(Path, args)
after.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
records, patch = build(experimental_dense=dense)
apply()
np.savez_compressed(after/'ribbon-evidence.npz', **patch)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(after/'surface.blend'))
info = json.loads((before/'surface-info.json').read_text())
info['eyeliner'] = 'G1-ribbon'
info['ribbon13h'] = records
from clip_ribbon_fur_13h import EDGE_FUR
if bpy.data.objects.get(EDGE_FUR):
    info['additionalFurObjects'] = [*info.get('additionalFurObjects', []), EDGE_FUR]
systems = [bpy.data.objects[name].data for name in ['Akinza fur', *info.get('additionalFurObjects', [])]]
info['strands'] = sum(len(data.curves) for data in systems)
info['strandPoints'] = sum(len(data.points) for data in systems)
info['ribbon13hMethod'] = ('Experimental dense segment clipping and lower skin-gap hair' if dense else 'Visible-outline strip with sparse control-point radius caps; known fur defects remain')
(after/'surface-info.json').write_text(json.dumps(info, indent=2))
print('13H_RIBBON_SAVED', records, flush=True)

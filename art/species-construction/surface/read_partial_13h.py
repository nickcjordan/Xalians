"""Read-only recovery probe, with no construction or save operation."""
import sys
import json
from pathlib import Path
import bpy

source, out = map(Path, sys.argv[sys.argv.index('--')+1:])
result = dict(source=str(source), readable=False)
try:
    opened = bpy.ops.wm.open_mainfile(filepath=str(source))
    result['operatorResult'] = list(opened)
    result['readable'] = 'FINISHED' in opened
    result['objects'] = {o.name: dict(type=o.type, points=len(o.data.points) if o.type=='CURVES' else None,
                                    vertices=len(o.data.vertices) if o.type=='MESH' else None)
                         for o in bpy.data.objects}
except RuntimeError as error:
    result['error'] = str(error)
(out/'partial-recovery.json').write_text(json.dumps(result, indent=2))
print('PARTIAL_READ_ONLY_PROBE', result, flush=True)

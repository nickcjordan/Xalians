"""Akinza game mesh pass 1: rebake the AO map from a saved build (gamemesh.blend), one part at a time.

  run_blender.py gamemesh_ao.py <log> -- <work dir> [--size 2048] [--out-size 1024]

Iteration 2's build baked AO with every part selected at once, which writes only the active object's texels, so every
part but the body (eyes, claws, nose) came out black. This repeats the AO step (gamemesh_common.bake_ao) on the saved
game mesh without touching its geometry, UVs or the other maps; gamemesh_build.py now bakes AO the same way.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gamemesh_common as gm  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('work', type=Path)
p.add_argument('--size', type=int, default=2048)
p.add_argument('--out-size', type=int, default=1024)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(a.work/'gamemesh.blend'))
game = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('game_')]
info = gm.bake_ao(game, a.size, a.work, a.out_size)
b = json.loads((a.work/'build.json').read_text())
b.setdefault('bake', {})['AO'] = dict(info, rebake='gamemesh_ao.py, one part at a time')
(a.work/'build.json').write_text(json.dumps(b, indent=1))
print('AO_DONE', json.dumps(info), flush=True)

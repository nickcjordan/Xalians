"""Render current views and record actual saved cheek/tuft fiber scales."""
import json
import sys
from pathlib import Path
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from refine_ear_root_12b2 import values
import review_fur_13
import render_surface

args = sys.argv[sys.argv.index('--') + 1:]
surface = Path(args[args.index('--surface') + 1])
out = Path(args[args.index('--out') + 1])
out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(surface / 'surface.blend'))
cu = bpy.data.objects['Akinza fur'].data
s = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', s)
r = values(cu, 'position', 'vector', 3)[s]
rad = values(cu, 'radius')[s]
cheek = (abs(r[:, 0]) > .06) & (abs(r[:, 0]) < .14) & (r[:, 2] > .54) & (r[:, 2] < .60) & (r[:, 1] < -.05) & (rad > 0)
tuft = bpy.data.objects['Akinza canal tuft 13g'].data
ts = np.empty(len(tuft.curves), np.int32)
tuft.curves.foreach_get('first_point_index', ts)
report = {}
for name, radii in [('nativeCheek', rad[cheek]), ('dedicatedTuft', values(tuft, 'radius')[ts])]:
    report[name] = dict(count=len(radii), rootRadiusPercentiles=np.percentile(radii, [0, 25, 50, 75, 100]).tolist(),
                        medianNormalViewDiameterPixels=float(np.median(radii) * 2 * 1024 / 1.35))
(out / 'hair-scale.json').write_text(json.dumps(report, indent=2) + '\n')
render_surface.main()

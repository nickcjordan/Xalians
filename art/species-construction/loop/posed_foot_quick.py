"""Quick posed foot-band check for a body component, without assembling (R09.9 stand-in).

  python art/species-construction/loop/posed_foot_quick.py <body-dir> --joints <baseline posed dir> --out NAME

Dumps the body's skin below the baseline's neck cut (the baseline's head above it), skins it with the baseline's
joints, poses it with art/species-construction/rig/akinza-sheet-pose.json (angles only) and prints the numpy
posed IoU per view for the foot, shin and thigh bands plus the mean foot band. Numpy rasters, not the Blender
masks; it tracks the packet's posed-fit.json within a few thousandths. The packet's own posed fit decides.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import loop_tools as lt  # noqa: E402
import rig_core as rc  # noqa: E402
import rig_fit as rf  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('body')
p.add_argument('--joints', required=True)
p.add_argument('--out', required=True)
p.add_argument('--bands', default='foot,shin,thigh')
a = p.parse_args()
body = lt.work(a.body)
out = lt.WORK/'scratch-r12'/a.out
out.mkdir(parents=True, exist_ok=True)
lt.dump_vertices(body/'shape.glb', out/'verts.npz', f'posed-foot-quick-{a.out}-dump.log')
skin, parts, _ = lt.load_dump(out/'verts.npz')
joints = json.loads((Path(a.joints)/'joints.json').read_text())
base_skin, _, _ = lt.load_dump(Path(a.joints)/'verts.npz')
cut = joints['head_base'][2]
skin = np.concatenate([skin[skin[:, 2] < cut], base_skin[base_skin[:, 2] >= cut]])
idx, w = rc.compute_weights(skin, joints)
idx = idx.astype(int)
pose = rc.load_json(lt.SHEET_POSE)
posed = rf.pose_points(skin, idx, w, joints, pose['bones'], pose.get('rootDepthShift', 0.0))
res = rf.evaluate(posed, True)
bands = a.bands.split(',')
summary = {v: {b: round(float(res[v][2][b]['iou']), 4) for b in bands} for v in rf.VIEWS}
for b in bands:
    summary[b+' mean'] = round(float(np.mean([res[v][2][b]['iou'] for v in rf.VIEWS])), 4)
print(json.dumps(summary))
(out/'summary.json').write_text(json.dumps(summary, indent=1))

from PIL import Image  # noqa: E402
pictures = [rf.overlay_half(res[v][0], res[v][1], v, f'{v} (posed)', True) for v in rf.VIEWS]
sheet = Image.new('RGB', (lt.FIT_GRID*3, lt.FIT_GRID), 'white')
for k, picture in enumerate(pictures):
    sheet.paste(picture, (lt.FIT_GRID*k, 0))
sheet.save(out/'posed-fit.png')

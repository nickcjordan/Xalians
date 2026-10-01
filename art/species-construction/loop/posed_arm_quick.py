"""Quick posed arm-band check for a body component, without assembling (R07.6 stand-in).

  python art/species-construction/loop/posed_arm_quick.py <body-dir> --joints <posed dir with joints.json> --out NAME [--pose FILE]

Dumps the body's skin (below the neck cut; the baseline's head above it), takes every joint from a baseline assembly's posed/joints.json except the arm joints,
which come from the body's fairing record (armJoints, .R is the -x side, .L mirrors it), refits the sheet pose
(or starts from --pose with a short arm-only search), and prints the numpy posed scores per view and band.
It skips the head, so only the arm, trunk and thigh bands mean anything; the packet's own posed fit decides.
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
p.add_argument('--pose')
p.add_argument('--step', type=int, default=5, help='use every Nth skin vertex for the fit')
a = p.parse_args()
body = lt.work(a.body)
out = lt.WORK/'scratch-r07'/a.out
out.mkdir(parents=True, exist_ok=True)
lt.dump_vertices(body/'shape.glb', out/'verts.npz', f'posed-quick-{a.out}-dump.log')
skin, parts, _ = lt.load_dump(out/'verts.npz')
joints = json.loads((Path(a.joints)/'joints.json').read_text())
# the figure needs its head for the canonical frame: keep the baseline skin above the neck cut
base_skin, _, _ = lt.load_dump(Path(a.joints)/'verts.npz')
cut = joints['head_base'][2]
skin = np.concatenate([skin[skin[:, 2] < cut], base_skin[base_skin[:, 2] >= cut]])
record = json.loads((body/'fairing.json').read_text())
for name, value in record['armJoints'].items():
    joints[name] = list(value)
    joints[name[:-1]+'L'] = [-value[0], value[1], value[2]]
joints['shoulder.L'][1] = joints['shoulder.R'][1]
idx, w = rc.compute_weights(skin, joints)
idx = idx.astype(int)
sel = np.arange(0, len(skin), a.step)
if a.pose:
    pose = json.loads(Path(a.pose).read_text())['bones']
else:
    vec, shift, best = rf.fit_pose(skin[sel], idx[sel], w[sel], joints, log=lambda *_: None)
    pose = rf.build_pose(vec)
    (out/'pose.json').write_text(json.dumps({'bones': pose, 'shift': shift, 'objective': best}, indent=1))
    root = shift
posed = rf.pose_points(skin, idx, w, joints, pose, root if not a.pose else (0.0, 0.0))
res = rf.evaluate(posed, True)
summary = {v: {b: res[v][2][b]['iou'] for b in ('arm', 'trunk', 'thigh')} for v in rf.VIEWS}
summary['arm mean'] = round(float(np.mean([res[v][2]['arm']['iou'] for v in rf.VIEWS])), 4)
print(json.dumps(summary))
pictures = [rf.overlay_half(res[v][0], res[v][1], v, f'{v} (posed)', True) for v in rf.VIEWS]
from PIL import Image  # noqa: E402
sheet = Image.new('RGB', (lt.FIT_GRID*3, lt.FIT_GRID), 'white')
for k, picture in enumerate(pictures):
    sheet.paste(picture, (lt.FIT_GRID*k, 0))
sheet.save(out/'posed-fit.png')
(out/'summary.json').write_text(json.dumps(summary, indent=1))

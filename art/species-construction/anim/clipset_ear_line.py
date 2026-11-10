"""Fix pass 4: each clip frame's ears against Night Stalk's ear line on screen (numpy, no Blender). Numbers only.

  python art/species-construction/anim/clipset_ear_line.py <clipset bake> <approved bake> <rig dir> [--clips hurt,guard_in,guard,guard_out]
      [--out <json>]

Per frame and ear: the angle between the ear_1 world rotation and Night Stalk f18's (its line as drawn at the side camera,
an orthographic view, so the ear's direction and outline on screen follow its world rotation alone) and f10's (the middle
of its sweep); and the ear's turn beyond f18's own pose relative to the head (XYZ Euler degrees of f18's ear_1 rotation
undone from the frame's, in the ear's local frame), the extra swing the frame's head orientation asks for. Writes
<clipset bake>/ear-line.json (or --out)."""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('bake', type=Path)
p.add_argument('approved', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('--clips', default='hurt,guard_in,guard,guard_out')
p.add_argument('--out', type=Path, default=None)
a = p.parse_args()
J = json.loads((a.rig/'joints.json').read_text())
B = rc.ANIM_BONES
EARS = ('ear_1.L', 'ear_1.R')


def world(pose):
    T = rc.bone_transforms(J, pose, bones=B)
    return {e: T[e][0] for e in EARS}


def ang(M):
    return math.degrees(math.acos(max(-1., min(1., (np.trace(M)-1)/2))))


stalk = json.loads((a.approved/'stalk'/'poses.json').read_text())
S18, S10 = world(stalk[18]['pose']), world(stalk[10]['pose'])
L18 = {e: rc.euler_matrix(*stalk[18]['pose'][e]) for e in EARS}
out = dict(units='degrees', stalk18_head_world_deg=round(ang(rc.bone_transforms(J, stalk[18]['pose'], bones=B)['head'][0]), 3),
           stalk10_head_world_deg=round(ang(rc.bone_transforms(J, stalk[10]['pose'], bones=B)['head'][0]), 3))
for clip in a.clips.split(','):
    rows = []
    for fr in json.loads((a.bake/clip/'poses.json').read_text()):
        Wd = world(fr['pose'])
        rows.append(dict(frame=fr['frame'],
                         vs_stalk18_screen={e: round(ang(S18[e].T@Wd[e]), 2) for e in EARS},
                         vs_stalk10_screen={e: round(ang(S10[e].T@Wd[e]), 2) for e in EARS},
                         beyond_f18_relative_xyz={e: [round(float(v), 2) for v in rc.euler_from_matrix(L18[e].T@rc.euler_matrix(*fr['pose'].get(e, (0, 0, 0))))] for e in EARS},
                         beyond_f18_relative_angle={e: round(ang(L18[e].T@rc.euler_matrix(*fr['pose'].get(e, (0, 0, 0)))), 2) for e in EARS}))
    on = [r for r in rows if r['vs_stalk18_screen']['ear_1.L'] < .05]
    out[clip] = dict(perFrame=rows, framesOnF18Line=[r['frame'] for r in on],
                     beyondF18OnLine={e: dict(min=[min(r['beyond_f18_relative_xyz'][e][i] for r in on) for i in range(3)],
                                              max=[max(r['beyond_f18_relative_xyz'][e][i] for r in on) for i in range(3)],
                                              angle_max=max(r['beyond_f18_relative_angle'][e] for r in on)) for e in EARS} if on else None)
    print(clip, 'on the f18 line', out[clip]['framesOnF18Line'], json.dumps(out[clip]['beyondF18OnLine']), flush=True)
    print('   per frame L: vs18', [r['vs_stalk18_screen']['ear_1.L'] for r in rows], 'vs10', [r['vs_stalk10_screen']['ear_1.L'] for r in rows], flush=True)
dst = a.out or a.bake/'ear-line.json'
dst.write_text(json.dumps(out, indent=1))
print('wrote', dst)

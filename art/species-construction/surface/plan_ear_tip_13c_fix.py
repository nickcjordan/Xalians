"""Measure projected tip overhang against the actual ear silhouette."""
import argparse
import json
from pathlib import Path
import numpy as np
from scipy.spatial import ConvexHull
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('before', type=Path)
parser.add_argument('out', type=Path)
parser.add_argument('--soft-transition', action='store_true')
parser.add_argument('--verify-after', type=Path, help='Measure saved selected tips against this fixed before envelope.')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
d = np.load(args.before / 'r/evidence.npz')
roots = d['roots']; points = d['points']; starts = d['starts']
ends = np.r_[starts[1:] - 1, len(points) - 1]
co = d['co']; active = np.load(args.before / 'r/collision-evidence.npz')['active']
az, el = np.deg2rad([155, 24])
camera = np.array([np.sin(az)*np.cos(el), -np.cos(az)*np.cos(el), np.sin(el)])
right = np.cross(-camera, [0, 0, 1]); right /= np.linalg.norm(right)
up = np.cross(right, -camera)
target = np.array([.395, .015, .837])

def project(p):
    p = p.copy(); p[:, 0] = abs(p[:, 0]); p -= target
    return np.column_stack([p @ right, p @ up])

ear = (co[:, 0] > .30) & (co[:, 2] > .73)
skin2 = project(co[ear]); hull = ConvexHull(skin2)
outline = skin2[hull.vertices]

def overhang(p):
    q = project(p); inside = np.ones(len(q), bool)
    for equation in hull.equations:
        inside &= q @ equation[:2] + equation[2] <= 1e-9
    dist = np.full(len(q), np.inf)
    for a, b in zip(outline, np.roll(outline, -1, axis=0)):
        v = b-a; t = np.clip((q-a) @ v / np.dot(v, v), 0, 1)
        dist = np.minimum(dist, np.linalg.norm(q-a-t[:, None]*v, axis=1))
    return np.where(inside, -dist, dist)

root_distance = overhang(roots); tip_distance = overhang(points[ends])
n = d['curve_nrm'].copy(); n[:, 0] *= np.sign(roots[:, 0])
visible = n @ camera > .05
ear_roots = (abs(roots[:, 0]) > .32) & (roots[:, 2] > .74) & active
root2 = project(roots)
# Sample the exposed outer arc in the actual crop, excluding the artificial
# medial and bottom seams introduced by cropping skin before the hull.
outer_arc = (root2[:, 0] > 0) & (root2[:, 0] < .075) & (root2[:, 1] > 0) & (root2[:, 1] < .080)
rim = ear_roots & visible & outer_arc & (abs(root_distance) < .008)
median = float(np.median(tip_distance[rim & (tip_distance > 0)]))
tip2 = project(points[ends])
# This band surrounds the anatomical apex and includes the long brush below
# it in the exact review crop; selection is by tip excess, not a root box.
limit=.1125 if args.soft_transition else .025
apex_tips = ear_roots & (tip2[:, 0] < limit) & (tip2[:, 1] < .080) & (tip2[:, 1] > -.14)
strength=np.ones(len(roots))
if args.soft_transition:
    fade=np.clip(tip2[:,0]/.1125,0,1)
    strength=1-fade*fade*(3-2*fade)
target_overhang=median+(1-strength)*np.maximum(0,tip_distance-median)
selected = apex_tips & (tip_distance > target_overhang + .001)
np.savez_compressed(args.out/'tip-plan.npz', selected=selected,
                    rim=rim, overhang=tip_distance, rootOverhang=root_distance,
                    outline=outline, median=median,target=target_overhang,strength=strength)
report = dict(method='projected convex skin silhouette at exact ear-tip camera',
              medianRimOverhang=median, selected=int(selected.sum()),
              left=int((selected & (roots[:, 0] < 0)).sum()),
              right=int((selected & (roots[:, 0] > 0)).sum()),softTransition=args.soft_transition,
              coreSelected=int((selected&(strength>.999)).sum()))
(args.out/'tip-plan.json').write_text(json.dumps(report, indent=2)+'\n')
im = Image.open(args.before/'r/ear-tip-close.png').convert('RGB')
draw = ImageDraw.Draw(im)
pixels = lambda q: [(float(500+x*4000), float(500-y*4000)) for x,y in q]
draw.line(pixels(np.vstack([outline, outline[0]])), fill='#338dcc', width=2)
for i in np.where(selected & (roots[:, 0] > 0))[0]:
    draw.line(pixels(project(points[starts[i]:ends[i]+1])), fill='#db9b24', width=1)
im.save(args.out/'tip-plan-overlay.png')
if args.verify_after is not None:
    saved=np.load(args.verify_after/'r/evidence.npz')
    assert np.array_equal(starts,saved['starts'])
    assert np.array_equal(roots,saved['roots'])
    after_overhang=overhang(saved['points'][ends[selected]])
    check=dict(selected=int(selected.sum()),median=median,
               remainingAboveTargetPlus1mm=int((after_overhang>target_overhang[selected]+.001).sum()),
               maximumAfter=float(after_overhang.max()),
               maximumBefore=float(tip_distance[selected].max()))
    (args.verify_after/'tip-envelope-check.json').write_text(json.dumps(check,indent=2)+'\n')
    print(json.dumps(check))
print(json.dumps(report))

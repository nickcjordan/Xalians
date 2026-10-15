"""Count actual ear strand tips projected over the existing blue sheet mask.

Projection is along the anatomical front axis onto XZ; a .003 outline
tolerance excludes tips outside the ear. Depth excludes tips behind the sheet.
Front roots use normalY < -.05. White roots use cupm < .1. All-face white
counts also catch back-rim crossers that a front-only count cannot detect.
The side-camera diagnostic counts curves with exported controlpoints over the
upper cup, not exact continuous-segment intersections; rendered review decides.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree


def measure(path):
    d = np.load(path)
    co, normal, roots = d['co'], d['normal'], d['roots']
    starts, points, cup = d['starts'], d['points'], d['attr_cupm']
    nearest = cKDTree(co).query(roots, workers=-1)[1]
    ends = np.r_[starts[1:]-1, len(points)-1]
    tips = points[ends]
    sheet = (np.abs(co[:, 0]) > .12) & (co[:, 2] > .53) & (normal[:, 1] < -.05)
    candidates = np.where(sheet)[0]
    dist, idx = cKDTree(co[candidates][:, [0, 2]]).query(tips[:, [0, 2]], workers=-1)
    idx = candidates[idx]
    over = (dist < .003) & (cup[idx] > .5) & (tips[:, 1] < co[idx, 1]+.005)
    ear = (np.abs(roots[:, 0]) > .12) & (roots[:, 2] > .53)
    front = ear & (normal[nearest, 1] < -.05)
    white = cup[nearest] < .1
    long = np.linalg.norm(tips-roots, axis=1) > .02
    # Stable actual curve IDs identified by independent full-size side review.
    ids = [462, 463, 465, 476, 478, 480, 482, 551, 552, 556]
    # The side review sees the +X ear. A back-rim hair can be in front of
    # that cup in this camera even when it is behind it on the anatomical Y axis.
    el = np.deg2rad(8)
    up = np.array([-np.sin(el), 0, np.cos(el)])
    toward = np.array([np.cos(el), 0, np.sin(el)])
    side = (co[:, 0] > .12) & (co[:, 2] > .53) & (normal@toward > .05)
    side_idx = np.where(side)[0]
    plane = np.column_stack((co[:, 1], co@up))
    curve_ids = np.where((roots[:, 0] > .12) & (roots[:, 2] > .80) & white & long)[0]
    point_ids = np.concatenate([np.arange(starts[i]+1, ends[i]+1) for i in curve_ids])
    owner = np.concatenate([np.full(ends[i]-starts[i], j) for j, i in enumerate(curve_ids)])
    pp = points[point_ids]
    distance, jj = cKDTree(plane[side_idx]).query(np.column_stack((pp[:, 1], pp@up)), workers=-1)
    jj = side_idx[jj]
    covers = ((distance < .0015) & (cup[jj] > .5) & (co[jj, 2] > .78)
              & (pp@toward > co[jj]@toward-.001))
    crossing_curves = curve_ids[np.unique(owner[covers])]
    return dict(front_rooted_strands=int(front.sum()), front_rooted_tips_over_cup=int((front & over).sum()),
                white_front_tips_over_cup=int((front & white & over).sum()),
                long_white_front_tips_over_cup=int((front & white & long & over).sum()),
                white_all_face_tips_over_cup=int((ear & white & over).sum()),
                long_white_all_face_tips_over_cup=int((ear & white & long & over).sum()),
                side_upper_cup_white_crossers=int(len(crossing_curves)),
                traced_side_crossers=[i for i in ids if i in set(crossing_curves.tolist())],
                known_offender_tips={str(i): tips[i].tolist() for i in ids})


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--before', type=Path, required=True)
    p.add_argument('--after', type=Path, required=True)
    p.add_argument('--original-12c', type=Path)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    result = dict(method=__doc__, before=measure(a.before), after=measure(a.after))
    if a.original_12c:
        result['original_12c'] = measure(a.original_12c)
    a.out.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))

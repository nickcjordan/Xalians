"""Quick check outside Blender: how many solid components a spec makes, and which parts each holds.

    python art/studio/blockout/hypnopet/components.py <spec.json> [--voxel 0.003]

Evaluates the smooth union on a coarse grid (art/studio/parts), labels the inside voxels with scipy and
prints, per component, its voxel count and the parts whose own field is negative there. Coarse: a
connection thinner than the voxel can be missed or invented, so blockout.py stays the judge.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import parts  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec', type=Path)
    ap.add_argument('--voxel', type=float, default=0.003)
    a = ap.parse_args()
    spec = json.loads(a.spec.read_text(encoding='utf-8'))
    insts = parts.instances(spec)
    origin, field, info = parts.build_field(insts, a.voxel)
    inside = field < 0
    lab, n = ndimage.label(inside)
    print(f'{n} component(s) at voxel {a.voxel}')
    for c in range(1, n+1):
        idx = np.argwhere(lab == c)
        pts = origin+idx*a.voxel
        sample = pts[:: max(1, len(pts)//4000)]
        owners = sorted({i.key for i in insts if (i.sdf(sample) < 0).any()})
        print(f'  component {c}: {len(idx)} voxels, z {pts[:, 2].min():.3f} to {pts[:, 2].max():.3f}, parts {owners}')


if __name__ == '__main__':
    main()

"""Per-region geometry change of a candidate assembly against the baseline assembly.

    python art/species-construction/loop/region_shift.py <baseline assembly> <candidate assembly> --owned R07[,R08] [--species akinza]

Nearest-vertex displacement both ways between the two assembled figures (every mesh: skin, eyes,
mouth, claws), in figure heights, per region zone, as recipe.py contain measures one step. A vertex
inside an owned region's zone counts only for the owned regions, so a forepaw rebuilt in front of the
thigh is not charged to the legs. A region with no zone (the whole figure) gets no row.

The judge's geometry carry (LOOP-v3 v3.9) reads this: a non-target region whose maximum
displacement is at or below the carry tolerance did not move, so it keeps its visual results even
when its images changed (round 25: the critic regraded unchanged legs because the new forepaw showed
in the leg views). Prints one JSON line; --out also writes it.
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
CARRY_TOL = .004   # figure heights: recipe_sweep's CONTAIN_TOL, twice the remesh noise floor


def shift(base_glb, cand_glb, zones, frame, owned):
    import numpy as np
    from scipy.spatial import cKDTree
    import recipe as rc
    import recipe_steps as rs
    floor, height = frame.get('floorZ', -.957), frame.get('fixedHeight', rc.FIGURE_HEIGHT)
    cand = rs.glb_vertices(cand_glb, skin_only=False)
    base = rs.glb_vertices(base_glb, skin_only=False)
    d_cb, _ = cKDTree(base).query(cand)
    d_bc, _ = cKDTree(cand).query(base)
    points, dist = np.concatenate([cand, base]), np.concatenate([d_cb, d_bc])/height
    own_mask = np.zeros(len(points), bool)
    for r in owned:
        if isinstance(zones.get(r), dict):
            own_mask |= rc.in_zone(points, zones[r], floor, height)
    out = {}
    for r, zone in zones.items():
        if not isinstance(zone, dict):
            continue
        member = rc.in_zone(points, zone, floor, height)
        sel = member if r in owned else member & ~own_mask
        out[r] = ({'vertices': int(sel.sum()), 'p95': round(float(np.percentile(dist[sel], 95)), 5), 'max': round(float(dist[sel].max()), 5)}
                  if sel.any() else {'vertices': 0, 'p95': 0.0, 'max': 0.0})
    return out


def assembly_glb(work, name):
    p = Path(name)
    if p.suffix == '.glb':
        return p
    p = p if p.is_dir() else work/p.name
    return p/'akinza.glb' if (p/'akinza.glb').is_file() else next(p.glob('*.glb'))


def main(argv=None):
    import species as sp
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    p.add_argument('baseline')
    p.add_argument('candidate')
    p.add_argument('--owned', default='', help='comma-separated owned (target) regions')
    p.add_argument('--species', default='akinza')
    p.add_argument('--out')
    a = p.parse_args(argv)
    s = sp.load(a.species)
    owned = [r for r in a.owned.split(',') if r]
    rows = shift(assembly_glb(s.work, a.baseline), assembly_glb(s.work, a.candidate), s['zones'], s['frame'], owned)
    report = {'baseline': Path(a.baseline).name, 'candidate': Path(a.candidate).name, 'owned': owned, 'unit': 'figureHeight',
              'carryTol': CARRY_TOL, 'regions': rows, 'unmoved': sorted(r for r, v in rows.items() if r not in owned and v['max'] <= CARRY_TOL)}
    line = json.dumps(report)
    if a.out:
        Path(a.out).write_text(json.dumps(report, indent=1), encoding='utf-8')
    print(line)


if __name__ == '__main__':
    main()

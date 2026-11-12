"""Akinza eyelids: numeric checks of the lids (numpy, no Blender).

  python art/species-construction/anim/eyelids_checks.py <lids dir> <maps dir> <probe dir> <rig dir> <rest npz> <out json>
      [--frames <bake dir>:<clip>:<frame>,...]

1. Per state (open, half, squint, closed) and eye, in rest space (surface units, reported in rig mm = surface mm x the rig
   scale): the lid sheets' height over the skin past the fur line (negative: under the skin; the lid shows only inside the
   opening and over the bare skin between the rim and the face fur), the lowest lid height over the globe inside the
   opening and the lowest clearance over the iris, how many lid-fur strands show, whether the ribbon moved, how many face
   fur points get their radius back, and whether the catch light shows. Open must show nothing: every sheet vertex under
   the skin or inside the globe, no lid fur, ribbon and radii untouched, catch light on.
2. Registration in a pose: the lids follow the head bone rigidly (as the eyes, nose and mouth do in clip_frames.py). For each
   --frames entry, the posed skin of every vertex within 0.11 of an eye centre (rig_core.posed_skin with the rig's corrective
   keys and the bake's shape keys) against the head bone's rigid transform of its rest position: the largest and 99th
   percentile gap in rig mm. A gap here would open between a lid and the face skin around it.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import eyelids_core as ec  # noqa: E402
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402


def state_checks(Ls, M, s):
    out = {}
    for name, st in ec.STATES.items():
        out[name] = {}
        for e in ec.EYES:
            E = Ls.eyes[e]
            rs, rg = M[e+'__rs'], M[e+'__rg']
            g = Ls.state_geometry(e, **st)
            row = {}
            for which in ('upper', 'lower'):
                X = g[which]
                th, ph, r = E.angles(X)
                rsk = E.grid(np.where(np.isfinite(rs), rs, 9.), th, ph)
                rgl = E.grid(rg, th, ph)
                skin_over = rsk > rgl+1e-5
                fU, fL = E.furlines(th)
                past = (ph > fU+1.5) if which == 'upper' else (ph < fL-1.5)
                inside = ~skin_over
                h_skin = (r-rsk)*1000*s
                h_globe = (r-rgl)*1000*s
                row[which] = dict(
                    over_skin_past_fur_line_max_mm=round(float(h_skin[skin_over & past].max()), 3) if (skin_over & past).any() else None,
                    over_skin_anywhere_max_mm=round(float(h_skin[skin_over].max()), 3) if skin_over.any() else None,
                    over_globe_in_opening_min_mm=round(float(h_globe[inside].min()), 3) if inside.any() else None,
                    vertices_in_opening=int(inside.sum()))
            fr = g['fur_radius'].reshape(-1, 9)
            row['lid_fur_strands_shown'] = int((fr[:, 0] > 0).sum())
            row['ribbon_moved'] = g['ribbon'] is not None
            if g['ribbon'] is not None:
                row['ribbon_largest_move_mm'] = round(float(np.linalg.norm(g['ribbon']-E.rib['rest'], axis=2).max())*1000*s, 2)
            row['face_fur_points_radius_restored'] = 0 if g['caps'] is None else int(np.sum(g['caps'][1] != E.capdata['r_now']))
            row['catch_light_shown'] = g['catch']
            out[name][e] = row
    return out


def registration(lids, rig_dir, rest_npz, specs):
    rig = json.loads((rig_dir/'rig.json').read_text())
    J = json.loads((rig_dir/'joints.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    wt = np.load(rig_dir/'weights.npz')
    idx = wt['idx'].astype(int)
    w = np.round(wt['w'].astype(np.float64)*4096)/4096
    w /= w.sum(1, keepdims=True)
    KEYS = json.loads((rig_dir/'correctives.json').read_text())['keys']
    cz = np.load(rig_dir/'correctives.npz')
    DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
    rest_src = np.load(rest_npz)['src'].astype(np.float64)
    rest_m = s*(rest_src-off)
    C = np.array([lids.eyes[e].c for e in ec.EYES])
    near = np.flatnonzero(np.min(np.linalg.norm(rest_src[:, None, :]-C[None], axis=2), axis=1) < 0.11)
    # the lid zone: skin within 2 degrees of the band a lid covers (rim to fur line), front of the eye, near its surface
    zone = np.zeros(len(rest_src), bool)
    for e in ec.EYES:
        E = lids.eyes[e]
        th, ph, r = E.angles(rest_src[near])
        fU, fL = E.furlines(th)
        rU, rL, _ = E.curves(th)
        ok = (th > E.thm-3) & (th < E.thl+3) & (((ph > rU-1) & (ph < fU+2)) | ((ph < rL+1) & (ph > fL-2)))
        ok &= r < E.grid(E.rg, th, ph)+0.012
        zone[near[ok]] = True
    zone = np.flatnonzero(zone)
    out = []
    for spec in specs:
        bake, clip, frame = spec.rsplit(':', 2)
        frames = json.loads((Path(bake)/clip/'poses.json').read_text())
        fr = next(f for f in frames if f['frame'] == int(frame))
        shapes = ac.load_shapes(Path(bake))
        P, _, vals = rc.posed_skin(ac.apply_shapes(rest_m, fr, shapes), idx, w, J, fr['pose'], fr['lift'], KEYS, DELTAS)
        T = rc.bone_transforms(J, fr['pose'], bones=rc.ANIM_BONES, root_translate=tuple(rc.lift_vec(fr['lift'])))
        Rb, tb = T['head']
        rigid = rest_m[near]@Rb.T+tb
        gap = np.linalg.norm(P[near]-rigid, axis=1)*1000
        gz = np.linalg.norm(P[zone]-(rest_m[zone]@Rb.T+tb), axis=1)*1000
        out.append(dict(frame=spec, vertices_within_011=int(len(near)), gap_max_mm=round(float(gap.max()), 4),
                        gap_p99_mm=round(float(np.quantile(gap, .99)), 4), lid_zone_vertices=int(len(zone)),
                        lid_zone_gap_max_mm=round(float(gz.max()), 4), lid_zone_gap_p99_mm=round(float(np.quantile(gz, .99)), 4),
                        head_region_correctives_active=sorted(k for k, v in vals.items() if v > 0 and k.startswith(('head', 'neck', 'ear', 'jaw')))))
        print('registration', out[-1], flush=True)
    return out, s


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for n in ('lids', 'maps', 'probe', 'rig', 'rest', 'out'):
        p.add_argument(n, type=Path)
    p.add_argument('--frames', default='')
    a = p.parse_args()
    Ls = ec.Lids(a.lids)
    M = np.load(a.maps/'maps.npz')
    rig = json.loads((a.rig/'rig.json').read_text())
    sc = rig['transform']['scale']
    res = dict(scale=sc, states=state_checks(Ls, M, sc))
    print(json.dumps(res['states'], indent=1))
    if a.frames:
        res['registration'], _ = registration(Ls, a.rig, a.rest, a.frames.split(','))
    a.out.write_text(json.dumps(res, indent=1))
    print('EYELIDS_CHECKS_DONE')

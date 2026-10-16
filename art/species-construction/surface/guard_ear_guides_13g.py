"""Repair local ear outliers against the unchanged complete artifact tests."""
import json
import subprocess
from pathlib import Path
import numpy as np
from mathutils import Vector


def guard(before, out, points, starts, counts, radius, strlen, strlen_domain,
          rim, replaced, children, child_radii, tree, bvh, skin_normal, earw):
    here = Path(__file__).resolve().parent
    base = dict(np.load(before / 'r/evidence.npz'))
    old_col = dict(np.load(before / 'r/collision-evidence.npz'))
    old_flags = np.load(before / 'r/sweep-flags.npz')
    old_rogue = np.load(before / 'r/rogue-flags.npz')['rogue']
    n = len(starts)
    child_starts = len(points) + np.arange(len(children)) * children.shape[1]
    all_starts = np.r_[starts, child_starts]
    all_counts = np.r_[counts, np.full(len(children), children.shape[1])]
    all_roots = np.r_[points[starts], children[:, 0]]
    nearest = np.r_[old_col['nearest'], [tree.find(Vector(q))[1] for q in children[:, 0]]].astype(np.int32)
    col = {key: np.r_[v, np.zeros(len(children), dtype=v.dtype)] for key, v in old_col.items()}
    col['nearest'] = nearest
    pre = out / 'pre-save'
    pre.mkdir(exist_ok=True)
    root_tree = __import__('mathutils.kdtree', fromlist=['KDTree']).KDTree(int(replaced.sum()))
    for j, i in enumerate(np.where(replaced)[0]):
        root_tree.insert(Vector(all_roots[i]), j)
    root_tree.balance()
    history = []

    def win(p):
        p = str(p.resolve())
        assert p.startswith('/mnt/')
        return p[5].upper() + ':' + p[6:]

    def prefix(path, target):
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
        q = np.linspace(0, min(target, arc[-1]), len(path))
        return np.column_stack([np.interp(q, arc, path[:, k]) for k in range(3)])

    for iteration in range(16):
        all_points = np.r_[points, children.reshape(-1, 3)]
        active = np.r_[np.maximum.reduceat(radius, starts) > 0, child_radii.max(1) > 0]
        col['active'] = active
        selected = np.r_[rim, np.ones(len(children), bool)] & active
        for i in np.where(selected)[0]:
            path = all_points[all_starts[i]:all_starts[i] + all_counts[i]]
            col['penetration'][i] = 0
            col['intersections'][i] = 0
            col['max_clearance'][i] = 0
            col['tip_nearest'][i] = tree.find(Vector(path[-1]))[1]
            for a, b in zip(path[:-1], path[1:]):
                delta = b - a
                length = np.linalg.norm(delta)
                eps = min(.0002, length * .15)
                if length > 1e-7 and bvh.ray_cast(Vector(a + delta / length * eps), Vector(delta / length), max(0, length - 2 * eps))[0] is not None:
                    col['intersections'][i] += 1
                for q in (b, (a + b) * .5):
                    hit = bvh.find_nearest(Vector(q))
                    key = 'penetration' if np.dot(q - np.array(hit[0]), np.array(hit[1])) < 0 else 'max_clearance'
                    col[key][i] = max(col[key][i], hit[3])
        data = dict(base)
        for key in ('curve_nrm', 'curve_combp', 'curve_comb_flow'):
            if key not in data:
                continue
            extra = skin_normal[nearest[n:]] if key == 'curve_nrm' else children[:, 1] - children[:, 0] if key == 'curve_combp' else np.ones(len(children))
            data[key] = np.r_[data[key], extra]
        data.update(points=all_points, roots=all_roots, starts=all_starts,
                    first=all_points[all_starts + 1] - all_roots)
        np.savez_compressed(pre / 'evidence.npz', **data)
        np.savez_compressed(pre / 'collision-evidence.npz', **col)
        # These local ear scopes cannot overlap the separate eye/nose/claw
        # bounding boxes. A fresh full saved obstacle sweep is still required.
        for script in ('analyze_sweep_12d.py', 'rogue_hairs_13.py'):
            with (pre / f'{iteration}-{script}.log').open('w') as log:
                subprocess.run(['/mnt/c/Python314/python.exe', win(here / script), win(pre)], stdout=log, stderr=subprocess.STDOUT, check=True)
        flags = np.load(pre / 'sweep-flags.npz')
        rogue = np.load(pre / 'rogue-flags.npz')['rogue']
        new = np.zeros(len(all_starts), bool)
        report = {}
        for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
            f = old_rogue if key == 'rogue' else old_flags[key]
            g = rogue if key == 'rogue' else flags[key]
            mask = np.r_[g[:n] & ~f, g[n:]]
            new |= mask
            report[key] = int(mask.sum())
        history.append(report)
        (out / 'guard-history.json').write_text(json.dumps(history, indent=2) + '\n')
        print('13G_GUARD', iteration, report, flush=True)
        if not new.any():
            break
        for i in np.where(new)[0]:
            if i < n:
                root = all_roots[i]
                distal = abs(root[0]) > .30 and root[2] > .74
                upper = abs(root[0]) > .25 and root[2] > .80
                if not (distal or upper):
                    opening = .15 < abs(root[0]) < .28 and .62 < root[2] < .77 and earw[i] > .98
                    assert opening and root_tree.find(Vector(root))[2] < .018, 'New flag outside authorized ear scopes'
                    radius[starts[i]:starts[i] + counts[i]] = 0
                    replaced[i] = True
                    continue
                assert earw[i] > .98
                rim[i] = True
                sl = slice(starts[i], starts[i] + counts[i])
                path = points[sl].copy()
            else:
                path = children[i - n].copy()
            target = min(float(flags['length'][i]) * .82, max(.006, float(flags['neighborMedian'][i]) * 1.7))
            path = prefix(path, target)
            if flags['collision'][i]:
                for j in range(1, len(path)):
                    hit = bvh.find_nearest(Vector(path[j]))
                    signed = np.dot(path[j] - np.array(hit[0]), np.array(hit[1]))
                    if signed < .0004 * (iteration + 1):
                        path[j] = np.array(hit[0]) + np.array(hit[1]) * .0005 * (iteration + 1)
            if i < n:
                points[sl] = path
                length = np.linalg.norm(np.diff(path, axis=0), axis=1).sum()
                strlen[sl if strlen_domain == 'POINT' else i] = length
            else:
                children[i - n] = path
    else:
        raise AssertionError('Dedicated ear guard did not converge; no save')
    return points, radius, strlen, rim, replaced, children

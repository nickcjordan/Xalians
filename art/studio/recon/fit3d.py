"""3D fit of a blockout to a reconstruction inside one region: the reference role of experiment X30.

    from fit3d import reference_points, fit
    ref = reference_points(glb, box)            # surface points of the reconstruction in the studio frame
    m = fit(spec, ref, box)                     # two-way distances in meters

The reconstruction (art/studio/recon/reconstruct.py) is brought into the studio frame as recon_scene.py does.
Inside the region box (x0, y0, z0, x1, y1, z1; the left side, x > 0, since parts mirror), the fit compares
two point sets: the reconstruction's surface samples, measured against the blockout's whole field (union_at),
and the blockout's surface (field zero level, sampled on a grid and projected), measured against the
reconstruction's points (nearest neighbor). Both directions matter: one says where the blockout is missing
volume, the other where it has volume the reference lacks. A floor cut (z below `floor`) drops the flat plate the
model copies from a drawing's ground shadow.
"""
import numpy as np
from scipy.spatial import cKDTree

import parts

CAP = 0.04


def studio_frame(v, height=0.658, center_y=0.005):
    v = np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)
    lo, hi = v.min(0), v.max(0)
    s = height/(hi[2]-lo[2])
    return (v-[(lo[0]+hi[0])/2, (lo[1]+hi[1])/2, lo[2]])*s+[0, center_y, 0]


def in_box(p, box):
    b = np.asarray(box, float)
    return np.all((p >= b[:3]) & (p <= b[3:]), axis=1)


def reference_points(glb, box, n=1_500_000, floor=0.006, seed=5):
    import trimesh
    m = trimesh.load(glb, force='mesh')
    mesh = trimesh.Trimesh(studio_frame(np.asarray(m.vertices, float)), m.faces, process=False)
    pts, _ = trimesh.sample.sample_surface(mesh, n, seed=seed)
    keep = in_box(pts, box) & (pts[:, 2] > floor)
    return pts[keep]


def blockout_points(insts, box, step=0.0025, band=0.002):
    b = np.asarray(box, float)
    axes = [np.arange(b[i], b[i+3]+step/2, step) for i in range(3)]
    X, Y, Z = np.meshgrid(*axes, indexing='ij')
    q = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    f = parts.union_at(insts, q)
    near = q[np.abs(f) < band]
    return parts.project_to_surface(insts, near, h=0.0005, iterations=3, max_step=0.003)


def fit(spec, ref, box, ref_tree=None, sample=20000, seed=1):
    insts = [i for i in parts.instances(spec) if not i.separate]
    rng = np.random.default_rng(seed)
    r = ref if len(ref) <= sample else ref[rng.choice(len(ref), sample, replace=False)]
    # distances are capped: a reference point far from every blockout piece (union_at's far value) counts as a
    # plain miss of CAP, not as a thousand meters
    d_ref = np.minimum(np.abs(parts.union_at(insts, r)), CAP)      # reference surface to the blockout
    bp = blockout_points(insts, box)
    bp = bp[in_box(bp, box)]
    tree = ref_tree or cKDTree(ref)
    d_blk = np.minimum(tree.query(bp, workers=-1)[0], CAP) if len(bp) else np.array([CAP])
    return {'refToBlockoutMean': float(d_ref.mean()), 'refToBlockoutP90': float(np.percentile(d_ref, 90)),
            'blockoutToRefMean': float(d_blk.mean()), 'blockoutToRefP90': float(np.percentile(d_blk, 90)),
            'missedRef': float((d_ref >= CAP).mean()), 'score': float(d_ref.mean()+d_blk.mean()),
            'points': [int(len(r)), int(len(bp))]}

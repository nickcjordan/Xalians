"""grid: a sampled signed distance field (for example a reconstruction, art/studio/recon/mesh_to_grid.py), clipped.

params:
    file      path of an .npz with origin (3,), voxel (scalar) and values (nx, ny, nz) in meters, negative inside
    sha256    the file's sha256 (checked on load, so a spec always means the same shape)
    clip      {"center": [x, y, z], "radii": [rx, ry, rz], "blend": k}: the field is kept only inside this
              ellipsoid, joined to it by a smooth intersection of radius k (the cut edge is rounded, not sheared)
    offset    optional [x, y, z] added to the grid's position (default none)
    cuts      optional list of {"center", "radii", "blend", "rotation"} ellipsoids removed from the field (smooth
              subtraction; rotation is optional Blender-style XYZ Euler degrees, so a cut can follow a leaning part):
              for example the face region when the face comes from its own finer grid, or a reconstruction's own
              horn where an authored horn goes

Outside the grid the field reads as far away. Trilinear sampling in numpy only, so it also runs inside Blender.
"""
import hashlib
from pathlib import Path

import numpy as np

from .common import BIG, euler_matrix, smax

_GRIDS = {}


def _load(params):
    path = str(Path(params['file']))
    if path not in _GRIDS:
        data = Path(path).read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if params.get('sha256') and params['sha256'] != digest:
            raise ValueError(f'grid {path}: sha256 {digest} does not match the spec')
        z = np.load(path)
        vals = np.asarray(z['values'], np.float32)
        vals.setflags(write=False)
        _GRIDS[path] = (np.asarray(z['origin'], float), float(z['voxel']), vals)
    return _GRIDS[path]


def _clip(params):
    c = params['clip']
    r = np.asarray(c['radii'], float)
    if r.shape != (3,) or (r <= 0).any():
        raise ValueError('grid clip radii must be three positive numbers')
    return np.asarray(c['center'], float), r, float(c.get('blend', 0.0))


def _ellipsoid(c, r, pts):
    u = (pts-c)/r
    k0 = np.linalg.norm(u, axis=1)
    k1 = np.linalg.norm(u/r, axis=1)
    return np.where(k1 > 1e-12, k0*(k0-1.0)/np.maximum(k1, 1e-12), -r.min())


def sample(params, pts):
    origin, voxel, vals = _load(params)
    off = np.asarray(params.get('offset', (0, 0, 0)), float)
    g = (pts-origin-off)/voxel
    n = np.array(vals.shape)
    inside = np.all((g >= 0) & (g <= n-1), axis=1)
    out = np.full(len(pts), BIG)
    if inside.any():
        q = g[inside]
        i0 = np.minimum(np.floor(q).astype(int), n-2)
        t = q-i0
        x0, y0, z0 = i0[:, 0], i0[:, 1], i0[:, 2]
        acc = np.zeros(len(q))
        for dx in (0, 1):
            wx = t[:, 0] if dx else 1-t[:, 0]
            for dy in (0, 1):
                wy = t[:, 1] if dy else 1-t[:, 1]
                for dz in (0, 1):
                    wz = t[:, 2] if dz else 1-t[:, 2]
                    acc += wx*wy*wz*vals[x0+dx, y0+dy, z0+dz]
        out[inside] = acc
    return out


def sdf(params, pts):
    pts = np.asarray(pts, float)
    c, r, k = _clip(params)
    d = smax(sample(params, pts), _ellipsoid(c, r, pts), k)
    for cut in params.get('cuts', []):
        cr = np.asarray(cut['radii'], float)
        if cr.shape != (3,) or (cr <= 0).any():
            raise ValueError('grid cut radii must be three positive numbers')
        cc = np.asarray(cut['center'], float)
        local = pts
        if cut.get('rotation'):
            rot = euler_matrix(cut['rotation'])
            local = (pts-cc)@rot+cc                  # world to the cut's frame (rows times R = R transposed)
        d = smax(d, -_ellipsoid(cc, cr, local), float(cut.get('blend', 0.0)))
    return d


def bounds(params):
    origin, voxel, vals = _load(params)
    off = np.asarray(params.get('offset', (0, 0, 0)), float)
    glo, ghi = origin+off, origin+off+voxel*(np.array(vals.shape)-1)
    c, r, _ = _clip(params)
    return np.maximum(glo, c-r), np.minimum(ghi, c+r)

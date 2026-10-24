"""Warp a reconstruction grid: smooth space deformations that change proportions without editing details.

    python art/studio/recon/grid_warp.py --grid <grid.npz> --out <grid.npz> --warps <warps.json>

warps.json is a list applied in order, each one a forward map of space:
    {"kind": "slab", "axis": "y", "from": a, "to": b, "factor": f, "ramp": r}
        stretch everything between a and b along the axis by f (f > 1 lengthens), with the local scale easing in
        and out over r at both ends; everything beyond b shifts by the added length; nothing before a moves.
        Lengthening a torso between the forelegs and the hind legs moves the whole rear without touching a leg.
        Optional "exclude": a list of boxes ({"box": [[x0, x1], [y0, y1], [z0, z1]], "ramp": [rx, ry, rz]}) where
        the displacement fades to nothing (an ear hanging beside the stretched belly stays put).
    {"kind": "scale", "pivot": [x, y, z], "factors": [fx, fy, fz], "region": {"center", "radii", "fade"}}
        scale about the pivot inside a soft ellipsoid region (weight 1 inside 1 - fade of its radii, 0 at the
        ellipsoid), for example a foot lengthened forward from its heel.
    {"kind": "rotate", "pivot": [x, y, z], "axis": [ax, ay, az], "degrees": a, "region": {...}}
        A region is a soft ellipsoid {"center", "radii", "fade"} or a soft box {"box", "ramp"}.
        rotate about an axis through the pivot inside a soft region, for example an ear swung back from its root.

Each warp is one pass over the grid, in order. The new field at each lattice point p is the old field at W^-1(p)
(fixed-point iteration for the region warps), multiplied by the local shrink so it stays close to a true distance.
A region warp with "detach": true and a mask region (grid_mask.py) moves a detached piece on its own: the rest of
the field keeps the piece taken out, and the result is the union, so no ghost of the piece stays where it was.
Why (experiment X33, Hypnopet): the critic measured the reconstruction's torso and hind feet short and its ears
hanging straight where the sheet rakes them back; the reconstruction's details stay, only proportions change.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

AX = {'x': 0, 'y': 1, 'z': 2}


def smooth01(t):
    t = np.clip(t, 0.0, 1.0)
    return t*t*(3-2*t)


def box_weight(box, pts):
    """1 inside the box [[x0, x1], [y0, y1], [z0, z1]] shrunk by its ramps, 0 outside it, smooth between."""
    w = np.ones(len(pts))
    ramp = box.get('ramp', [0.01, 0.01, 0.01])
    for k in range(3):
        lo, hi = box['box'][k]
        w *= smooth01((pts[:, k]-lo)/ramp[k])*smooth01((hi-pts[:, k])/ramp[k])
    return w


_MASKS = {}


def region_weight(reg, pts):
    if 'box' in reg:
        return box_weight(reg, pts)
    if 'mask' in reg:
        if reg['mask'] not in _MASKS:
            m = np.load(reg['mask'])
            _MASKS[reg['mask']] = (np.asarray(m['origin'], float), float(m['voxel']), np.asarray(m['values'], np.float32))
        o, v, vals = _MASKS[reg['mask']]
        w = trilinear(o, v, vals, pts, 0.0).astype(float)
        if 'box' in reg.get('and', {}):
            w *= box_weight(reg['and'], pts)
        return np.clip(w, 0.0, 1.0)
    c, r = np.asarray(reg['center'], float), np.asarray(reg['radii'], float)
    e = np.linalg.norm((pts-c)/r, axis=1)
    fade = float(reg.get('fade', 0.3))
    return smooth01((1.0-e)/fade)


def slab_table(w):
    a, b, f, ramp = float(w['from']), float(w['to']), float(w['factor']), float(w.get('ramp', 0.01))
    t = np.linspace(a-0.05, b+0.05, 4001)
    s = 1.0+(f-1.0)*smooth01((t-a)/ramp)*smooth01((b-t)/ramp)
    fwd = np.concatenate([[0.0], np.cumsum((s[1:]+s[:-1])/2*np.diff(t))])+t[0]
    return t, fwd, s


def slab_inverse_excluding(w, pts):
    """Inverse of a slab whose displacement is switched off inside its exclude boxes (an ear hanging beside the
    stretched belly). Displacement u(y) = fwd(y) - y; forward y' = y + h(p) u(y) with h = 1 - exclusion; the
    inverse is the fixed point y = y' - h u(y), a contraction because h u' < factor - 1."""
    k = AX[w['axis']]
    t, fwd, s = slab_table(w)
    disp = fwd-t
    tail = fwd[-1]-t[-1]
    q = pts.copy()
    for _ in range(40):
        h = 1.0-np.max(np.stack([region_weight(b, q) for b in w['exclude']]), axis=0)
        yk = q[:, k]
        u = np.where(yk < t[0], 0.0, np.where(yk > t[-1], tail, np.interp(yk, t, disp)))
        q[:, k] = pts[:, k]-h*u
    sc = np.ones(len(pts))
    inside = (q[:, k] >= t[0]) & (q[:, k] <= t[-1])
    sc[inside] = np.interp(q[inside, k], t, s)
    return q, sc


def slab_inverse(w, coords):
    t, fwd, s = slab_table(w)
    lo, hi = t[0], t[-1]
    out = np.where(coords < lo, coords, coords-(fwd[-1]-hi))       # past the range: shifted by the added length
    inside = (coords >= lo) & (coords <= fwd[-1])
    out[inside] = np.interp(coords[inside], fwd, t)
    scale = np.ones_like(coords)
    scale[inside] = np.interp(out[inside], t, s)
    return out, scale


def rot_matrix(axis, deg):
    k = np.asarray(axis, float)
    k = k/np.linalg.norm(k)
    a = np.radians(deg)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3)+np.sin(a)*K+(1-np.cos(a))*K@K


def region_forward(w, q):
    pivot = np.asarray(w['pivot'], float)
    if w['kind'] == 'scale':
        T = pivot+(q-pivot)*np.asarray(w['factors'], float)
    else:
        T = pivot+(q-pivot)@rot_matrix(w['axis'], w['degrees']).T
    return q+region_weight(w['region'], q)[:, None]*(T-q)


def region_inverse(w, p, iterations=25):
    """Fixed-point inverse of a soft region warp, computed only for points that can be affected: inside the
    region's ellipsoid grown by the largest displacement the warp can make."""
    reg = w['region']
    if 'mask' in reg:
        m = np.load(reg['mask'])
        o, v, vals = np.asarray(m['origin'], float), float(m['voxel']), m['values']
        idx = np.argwhere(vals > 0.01)
        lo, hi = o+idx.min(0)*v, o+idx.max(0)*v
        reg = {'box': np.stack([lo, hi], axis=1).tolist()}
    if 'box' in reg:
        b = np.asarray(reg['box'], float)
        c, r = b.mean(axis=1), (b[:, 1]-b[:, 0])/2
    else:
        c, r = np.asarray(reg['center'], float), np.asarray(reg['radii'], float)
    probe = c+np.array([[sx*r[0], sy*r[1], sz*r[2]] for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)])
    pivot = np.asarray(w['pivot'], float)
    if w['kind'] == 'scale':
        moved = pivot+(probe-pivot)*np.asarray(w['factors'], float)
    else:
        moved = pivot+(probe-pivot)@rot_matrix(w['axis'], w['degrees']).T
    reach = np.linalg.norm(moved-probe, axis=1).max()
    if 'box' in reg:
        near = np.all(np.abs(p-c) < r+reach, axis=1)
    else:
        near = np.linalg.norm((p-c)/(r+reach), axis=1) < 1.0
    q = p.copy()
    if near.any():
        sub = p[near].copy()
        target = p[near]
        for _ in range(iterations):
            sub = sub-(region_forward(w, sub)-target)*0.8
        q[near] = sub
    return q


def trilinear(origin, voxel, vals, pts, far):
    g = (pts-origin)/voxel
    n = np.array(vals.shape)
    inside = np.all((g >= 0) & (g <= n-1), axis=1)
    out = np.full(len(pts), far, np.float32)
    if inside.any():
        q = g[inside]
        i0 = np.minimum(np.floor(q).astype(int), n-2)
        t = q-i0
        acc = np.zeros(len(q))
        for dx in (0, 1):
            wx = t[:, 0] if dx else 1-t[:, 0]
            for dy in (0, 1):
                wy = t[:, 1] if dy else 1-t[:, 1]
                for dz in (0, 1):
                    wz = t[:, 2] if dz else 1-t[:, 2]
                    acc += wx*wy*wz*vals[i0[:, 0]+dx, i0[:, 1]+dy, i0[:, 2]+dz]
        out[inside] = acc
    return out


def load_mask(path, shape):
    m = np.load(path)
    vals = np.asarray(m['values'], np.float32)
    out = np.zeros(shape, np.float32)
    n = np.minimum(vals.shape, shape)
    out[:n[0], :n[1], :n[2]] = vals[:n[0], :n[1], :n[2]]
    return out


def apply(w, origin, voxel, vals, grow):
    """One warp as a pass over the whole grid; returns the new values (grown along y by `grow` meters)."""
    shape = np.array(vals.shape)
    shape[1] += int(np.ceil(max(grow, 0)/voxel))+2 if grow > 0 else 0
    axes = [origin[i]+np.arange(shape[i])*voxel for i in range(3)]
    out = np.empty(tuple(shape), np.float32)
    far = float(vals.max())
    detach = w['kind'] != 'slab' and w.get('detach') and 'mask' in w['region']
    if detach:
        # the piece moves on its own: the rest keeps the field with the piece taken out, the piece is the field
        # inside its mask, carried by the warp; the result is their union (no ghost of the piece where it was)
        core = load_mask(w['region']['mask'], vals.shape) > 0.5
        piece_vals = np.where(core, vals, np.float32(0.02))
        rest_vals = np.where(core, np.float32(0.02), vals)
    Y, Z = np.meshgrid(axes[1], axes[2], indexing='ij')
    for i in range(shape[0]):
        p = np.stack([np.full(Y.size, axes[0][i]), Y.ravel(), Z.ravel()], axis=1)
        if w['kind'] == 'slab':
            if w.get('exclude'):
                q, sc = slab_inverse_excluding(w, p)
            else:
                q = p.copy()
                k = AX[w['axis']]
                q[:, k], sc = slab_inverse(w, q[:, k])
            out[i] = (trilinear(origin, voxel, vals, q, far)*np.minimum(sc, 1.0)).reshape(Y.shape)
            continue
        # a detached piece moves as a whole: its weight is only the taper box (smooth over centimeters), never
        # the mask, whose millimeter-scale edge would fold the map (sculpt-13: islands where the inverse failed)
        ww = {**w, 'region': w['region'].get('and', {'box': [[-9, 9], [-9, 9], [-9, 9]], 'ramp': [1, 1, 1]})}             if detach else w
        q = region_inverse(ww, p)
        sc = np.ones(len(p))
        if w['kind'] == 'scale':
            f = np.asarray(w['factors'], float)
            if f.min() < 1:
                sc = 1+region_weight(ww['region'], q)*(f.min()-1)
        if detach:
            rest = trilinear(origin, voxel, rest_vals, p, 0.02)
            piece = trilinear(origin, voxel, piece_vals, q, 0.02)*sc
            out[i] = np.minimum(rest, piece).reshape(Y.shape)
        else:
            out[i] = (trilinear(origin, voxel, vals, q, far)*sc).reshape(Y.shape)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--grid', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--warps', type=Path, required=True)
    a = ap.parse_args()
    warps = json.loads(a.warps.read_text())
    z = np.load(a.grid)
    origin, voxel, vals = np.asarray(z['origin'], float), float(z['voxel']), np.asarray(z['values'], np.float32)
    record = json.loads(str(z['record'])) if 'record' in z.files else {}
    for w in warps:                                      # each warp is its own pass, in order
        grow = (slab_table(w)[1][-1]-slab_table(w)[0][-1]) if w['kind'] == 'slab' else 0.0
        vals = apply(w, origin, voxel, vals, grow)
        print('applied', w['kind'], vals.shape, flush=True)
    record['warped'] = {'from': str(a.grid), 'fromSha256': hashlib.sha256(a.grid.read_bytes()).hexdigest(),
                        'warps': warps}
    a.out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(a.out, origin=origin, voxel=np.float64(voxel), values=vals, record=json.dumps(record))
    print('wrote', a.out, vals.shape)


if __name__ == '__main__':
    main()

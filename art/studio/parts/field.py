"""Sparse evaluation and smooth union of part instances on one grid (numpy only)."""
import numpy as np

from .common import BIG, smin, smax

CHUNK = 300000


def _lerp_axis(arr, coarse, n, axis):
    """Linearly resample `arr` along `axis` from the coarse sample positions to every index 0..n-1."""
    i = np.arange(n)
    j = np.clip(np.searchsorted(coarse, i, side='right')-1, 0, len(coarse)-2)
    t = (i-coarse[j])/(coarse[j+1]-coarse[j])
    shape = [1, 1, 1]
    shape[axis] = n
    t = t.reshape(shape)
    return np.take(arr, j, axis=axis)*(1-t)+np.take(arr, j+1, axis=axis)*t


def _eval_chunks(fn, pts):
    out = np.empty(len(pts), np.float32)
    for s in range(0, len(pts), CHUNK):
        out[s:s+CHUNK] = fn(pts[s:s+CHUNK])
    return out


def sample_region(fn, origin, voxel, i0, shape, band, stride=4):
    """Distance values of `fn` on the grid block starting at index i0 with `shape` voxels.

    A coarse lattice (every `stride` voxels) is evaluated and interpolated; points whose interpolated
    magnitude is inside `band` are then evaluated exactly. Far from the surface the interpolated value is
    kept, which is safe for a smooth union because a value farther than the blend radius cannot change it.
    """
    nx, ny, nz = shape
    cs = [np.unique(np.concatenate([np.arange(0, n, stride), [n-1]])) for n in shape]
    gx, gy, gz = np.meshgrid(*[origin[a]+(i0[a]+cs[a])*voxel for a in range(3)], indexing='ij')
    coarse = _eval_chunks(fn, np.stack([gx.ravel(), gy.ravel(), gz.ravel()], axis=1)).reshape(len(cs[0]), len(cs[1]), len(cs[2]))
    block = coarse
    for a in range(3):
        block = _lerp_axis(block, cs[a], shape[a], a)
    block = block.astype(np.float32)
    near = np.argwhere(np.abs(block) < band)
    if len(near):
        pts = origin+(near+np.asarray(i0))*voxel
        block[near[:, 0], near[:, 1], near[:, 2]] = _eval_chunks(fn, pts)
    return block, int(len(near))


def _skin(insts):
    """Separate instances (their own objects, "separate": true) take no part in the skin's field."""
    return [i for i in insts if not getattr(i, 'separate', False)]


def _ordered(insts):
    """Skin instances in evaluation order: every add (spec order), then every carve, then every add-after."""
    insts = _skin(insts)
    return ([i for i in insts if i.op == 'add'], [i for i in insts if i.op == 'carve'],
            [i for i in insts if i.op == 'add-after'])


def build_field(insts, voxel, stride=4):
    """Smooth union of all instances, in three passes: the adds are combined first (spec order, each with its own
    blend), then each carve is smoothly subtracted from that union (smooth max of the union and the negated
    shape, its own blend), then each add-after is added on top, so a part can sit inside a carved hollow
    without being carved. Separate instances are left out. Returns (origin, field float32 (nx,ny,nz), info)."""
    insts = _skin(insts)
    if not insts:
        raise ValueError('no skin instances to build')
    bnds = [i.bounds() for i in insts]
    kmax = max(i.blend for i in insts)
    grown = [b for i, b in zip(insts, bnds) if i.op != 'carve'] or bnds       # a carve never makes the skin bigger
    glo = np.min([b[0] for b in grown], axis=0)-kmax-6*voxel
    ghi = np.max([b[1] for b in grown], axis=0)+kmax+6*voxel
    origin = np.floor(glo/voxel)*voxel          # snapped to the world lattice: a rebuild samples unchanged parts at identical points
    dims = np.ceil((ghi-origin)/voxel).astype(int)+1
    field = np.full(tuple(dims), BIG, np.float32)
    exact = 0
    by_inst = dict(zip((id(i) for i in insts), bnds))
    for inst in [i for group in _ordered(insts) for i in group]:
        lo, hi = by_inst[id(inst)]
        pad = inst.blend+4*voxel
        i0 = np.maximum(np.floor((lo-pad-origin)/voxel).astype(int), 0)
        i1 = np.minimum(np.ceil((hi+pad-origin)/voxel).astype(int)+1, dims)
        if (i1 <= i0).any():
            continue
        shape = tuple(i1-i0)
        band = inst.blend+3*voxel+1.8*stride*voxel
        block, n = sample_region(inst.sdf, origin, voxel, i0, shape, band, stride)
        exact += n
        # outside the padded box the instance is farther than its blend radius, so it contributes nothing
        sl = tuple(slice(a, b) for a, b in zip(i0, i1))
        if inst.op == 'carve':
            field[sl] = smax(field[sl], -block, inst.blend).astype(np.float32)
        else:
            field[sl] = smin(field[sl], block, inst.blend).astype(np.float32)
    return origin, field, {'dims': [int(d) for d in dims], 'exactEvaluations': exact}


def ownership(insts, keys, pts):
    """For each point the index (into `keys`) of the part with the smallest distance, and a weight in
    [0, 1]: how decisively that part owns the point, (second smallest - smallest) / blend, clamped.
    0 is the seam between two parts, 1 is the inside of one part's own territory.

    Carves: each add's distance is first carved by the same smooth max the field uses, so inside a carved
    hollow the adds' own distances are pushed out to the hollow's wall, and the carving instance's part claims
    the wall (its distance there is the distance to its own shape's surface). Add-afters are measured as plain
    adds, after the carving."""
    best = np.full(len(pts), BIG)
    second = np.full(len(pts), BIG)
    which = np.zeros(len(pts), np.int32)
    per_key = np.full((len(keys), len(pts)), BIG)

    def near_mask(inst):
        lo, hi = inst.bounds()
        pad = inst.blend*2
        return np.all((pts >= lo-pad) & (pts <= hi+pad), axis=1)

    adds, carves, afters = _ordered(insts)
    for inst in adds:
        near = near_mask(inst)
        if near.any():
            k = keys.index(inst.key)
            per_key[k, near] = np.minimum(per_key[k, near], inst.sdf(pts[near]))
    for inst in carves:
        near = near_mask(inst)
        if near.any():
            d = inst.sdf(pts[near])
            per_key[:, near] = smax(per_key[:, near], -d[None, :], inst.blend)
            k = keys.index(inst.key)
            # the carving part owns the wall within half its blend of its shape's surface (a tie with the carved
            # adds, which sit exactly on that wall, would otherwise go to whichever part is listed first)
            per_key[k, near] = np.minimum(per_key[k, near], np.abs(d)-0.5*inst.blend)
    for inst in afters:
        near = near_mask(inst)
        if near.any():
            k = keys.index(inst.key)
            per_key[k, near] = np.minimum(per_key[k, near], inst.sdf(pts[near]))
    order = np.argsort(per_key, axis=0)
    which = order[0].astype(np.int32)
    best = np.take_along_axis(per_key, order[:1], axis=0)[0]
    if len(keys) > 1:
        second = np.take_along_axis(per_key, order[1:2], axis=0)[0]
    blend = max(i.blend for i in _skin(insts))
    weight = np.clip((second-best)/max(blend, 1e-9), 0.0, 1.0)
    return which, weight.astype(np.float32)


def union_at(insts, pts):
    """The same combination as build_field (adds, then carves, then add-afters), evaluated directly at arbitrary
    points (instances whose padded box does not contain a point are treated as far away, exactly as in the
    grid)."""
    out = np.full(len(pts), BIG)
    for group in _ordered(insts):
        for inst in group:
            lo, hi = inst.bounds()
            pad = inst.blend+0.02
            near = np.all((pts >= lo-pad) & (pts <= hi+pad), axis=1)
            if near.any():
                if inst.op == 'carve':
                    out[near] = smax(out[near], -inst.sdf(pts[near]), inst.blend)
                else:
                    out[near] = smin(out[near], inst.sdf(pts[near]), inst.blend)
    return out


def project_to_surface(insts, pts, h=0.001, iterations=3, max_step=0.004):
    """Newton steps that move each point onto the zero level of the smooth union (central-difference
    gradient). Removes the voxel-scale ripple a grid mesher leaves, which shows as ribs under grazing light."""
    pts = pts.copy()
    eye = np.eye(3)*h
    for _ in range(iterations):
        f = union_at(insts, pts)
        g = np.stack([(union_at(insts, pts+eye[a])-union_at(insts, pts-eye[a]))/(2*h) for a in range(3)], axis=1)
        gg = np.maximum(np.einsum('ij,ij->i', g, g), 1e-12)
        step = (f/gg)[:, None]*g
        mag = np.linalg.norm(step, axis=1)
        step *= np.minimum(1.0, max_step/np.maximum(mag, 1e-12))[:, None]     # never more than one voxel
        pts -= step
    return pts

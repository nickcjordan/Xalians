"""Strand fur that follows a posed skin (plan step 2, decision 3), shared by the furred renders.

bind(skin_rest, tris, fur_object) stores every strand's root triangle (nearest skin triangle to its root),
the root's barycentric coordinates, and every point in that triangle's rest frame (edge, bitangent, normal).
rebuild(binding, skin_posed) returns the strand points for a posed skin. Strand order never changes, and
the coat pattern reads the curves' stored `rest` attribute, so it stays on the body.
"""
import numpy as np
from mathutils.bvhtree import BVHTree


def _frames(X, T):
    v0, v1, v2 = X[T[:, 0]], X[T[:, 1]], X[T[:, 2]]
    e1 = v1-v0
    e1 /= np.linalg.norm(e1, axis=1, keepdims=True)
    nrm = np.cross(v1-v0, v2-v0)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    return np.stack([e1, np.cross(nrm, e1), nrm], 2)


def _bary(X, T, P):
    v0, v1, v2 = X[T[:, 0]], X[T[:, 1]], X[T[:, 2]]
    e0, e1, d = v1-v0, v2-v0, P-v0
    d00, d01, d11 = (e0*e0).sum(1), (e0*e1).sum(1), (e1*e1).sum(1)
    d20, d21 = (d*e0).sum(1), (d*e1).sum(1)
    den = d00*d11-d01*d01
    b1 = (d11*d20-d01*d21)/den
    b2 = (d00*d21-d01*d20)/den
    return np.stack([1-b1-b2, b1, b2], 1)


def bind(skin_rest, tris, fur):
    fm = np.array(fur.matrix_world)
    attr = fur.data.attributes['position']
    pts = np.empty(len(fur.data.points)*3, np.float32)
    attr.data.foreach_get('vector', pts)
    pts = pts.reshape(-1, 3).astype(np.float64)@fm[:3, :3].T+fm[:3, 3]
    offs = np.empty(len(fur.data.curves)+1, np.int32)
    fur.data.curve_offset_data.foreach_get('value', offs)
    roots = pts[offs[:-1]]
    bvh = BVHTree.FromPolygons(skin_rest.tolist(), tris.tolist(), all_triangles=True)
    tri_of = np.array([bvh.find_nearest(r)[2] for r in roots], np.int64)
    Tr = tris[tri_of]
    B = _bary(skin_rest, Tr, roots)
    anchor = (B[:, :, None]*skin_rest[Tr]).sum(1)
    curve_of = np.repeat(np.arange(len(roots)), np.diff(offs))
    local = np.einsum('nji,nj->ni', _frames(skin_rest, Tr)[curve_of], pts-anchor[curve_of])
    return dict(Tr=Tr, B=B, curve_of=curve_of, local=local, rest=pts, fm=fm, attr=attr, fur=fur)


def rebuild(b, skin_posed):
    F1 = _frames(skin_posed, b['Tr'])
    anc = (b['B'][:, :, None]*skin_posed[b['Tr']]).sum(1)
    return anc[b['curve_of']]+np.einsum('nij,nj->ni', F1[b['curve_of']], b['local'])


def write(b, world_points):
    fm = b['fm']
    loc = (world_points-fm[:3, 3])@np.linalg.inv(fm[:3, :3]).T
    b['attr'].data.foreach_set('vector', loc.astype(np.float32).ravel())
    b['fur'].data.update_tag()

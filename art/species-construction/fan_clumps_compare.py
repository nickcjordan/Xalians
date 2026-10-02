"""Equivalence check of two ear fan clump builds (slow original against fast version), numpy and scipy, no Blender.

  python art/species-construction/fan_clumps_compare.py <dirA> <dirB> [--json out.json]

Reads shape.glb of each directory (a head skin exported by the builders: head-local units) and reports vertex and face counts, bounds,
and the symmetric surface distance (each vertex of one mesh to the other's triangles, exact point to triangle distance on the
triangles around its nearest vertex), mean, 99th percentile and max, in figure heights (head-local divided by 3.721, the figure height
of 1.8605 world units at head scale .50). Also one closed component and non-manifold edges from the faces.
"""
import argparse
import json
import struct
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

S = 3.721


def read_glb(path):
    data = Path(path).read_bytes()
    jlen, _ = struct.unpack_from('<II', data, 12)
    gltf = json.loads(data[20:20+jlen])
    off = 20+jlen
    blen, _ = struct.unpack_from('<II', data, off)
    blob = data[off+8:off+8+blen]
    verts, faces = [], []
    base = 0
    for mesh in gltf['meshes']:
        for prim in mesh['primitives']:
            def acc(i):
                a = gltf['accessors'][i]
                bv = gltf['bufferViews'][a['bufferView']]
                dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
                n = {'SCALAR': 1, 'VEC3': 3}[a['type']]
                start = bv.get('byteOffset', 0)+a.get('byteOffset', 0)
                arr = np.frombuffer(blob, dtype=dt, count=a['count']*n, offset=start)
                return arr.reshape(-1, n) if n > 1 else arr
            v = acc(prim['attributes']['POSITION']).astype(np.float64)
            f = acc(prim['indices']).reshape(-1, 3).astype(np.int64)+base
            verts.append(v)
            faces.append(f)
            base += len(v)
    return np.concatenate(verts), np.concatenate(faces)


def weld(verts, faces):
    """glTF splits vertices at material and normal seams: merge identical positions."""
    key = np.round(verts*1e6).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return verts[first], inv[faces]


def topology(faces, nv):
    e = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    e.sort(axis=1)
    uniq, counts = np.unique(e, axis=0, return_counts=True)
    parent = np.arange(nv)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    lab = np.arange(nv)
    while True:
        la, lb = lab[uniq[:, 0]], lab[uniq[:, 1]]
        diff = la != lb
        if not diff.any():
            break
        np.minimum.at(lab, np.maximum(la[diff], lb[diff]), np.minimum(la[diff], lb[diff]))
        while True:
            nxt = lab[lab]
            if np.array_equal(nxt, lab):
                break
            lab = nxt
    used = np.zeros(nv, bool)
    used[faces.ravel()] = True
    return {'components': int(len(np.unique(lab[used]))), 'nonManifoldEdges': int((counts != 2).sum())}


def point_tri_dist(p, a, b, c):
    """Distance from points p (n,3) to triangles (a, b, c) (n,3 each), Ericson's closest point."""
    ab, ac, ap = b-a, c-a, p-a
    d1, d2 = (ab*ap).sum(1), (ac*ap).sum(1)
    bp = p-b
    d3, d4 = (ab*bp).sum(1), (ac*bp).sum(1)
    cp = p-c
    d5, d6 = (ab*cp).sum(1), (ac*cp).sum(1)
    vc = d1*d4-d3*d2
    vb = d5*d2-d1*d6
    va = d3*d6-d5*d4
    out = np.empty((len(p), 3))
    # default: interior
    den = 1./np.maximum(va+vb+vc, 1e-300)
    v, w = vb*den, vc*den
    q = a+ab*v[:, None]+ac*w[:, None]
    def put(mask, val):
        out[mask] = val[mask]
    out[:] = q
    m = (d1 <= 0) & (d2 <= 0); put(m, a)
    m2 = (d3 >= 0) & (d4 <= d3) & ~m; put(m2, b)
    m3 = (d6 >= 0) & (d5 <= d6) & ~m & ~m2; put(m3, c)
    done = m | m2 | m3
    mab = (vc <= 0) & (d1 >= 0) & (d3 <= 0) & ~done
    t = d1/np.maximum(d1-d3, 1e-300); put(mab, a+ab*t[:, None])
    done |= mab
    mac = (vb <= 0) & (d2 >= 0) & (d6 <= 0) & ~done
    t = d2/np.maximum(d2-d6, 1e-300); put(mac, a+ac*t[:, None])
    done |= mac
    mbc = (va <= 0) & ((d4-d3) >= 0) & ((d5-d6) >= 0) & ~done
    t = (d4-d3)/np.maximum((d4-d3)+(d5-d6), 1e-300); put(mbc, b+(c-b)*t[:, None])
    return np.linalg.norm(p-out, axis=1)


def surface_distance(vq, vt, ft, chunk=400_000):
    """Distance of each query point to the triangle mesh (vt, ft): the triangles around the nearest few vertices."""
    tree = cKDTree(vt)
    # vertex -> incident triangles (CSR)
    flat = ft.ravel()
    order = np.argsort(flat, kind='stable')
    tri_of = order//3
    starts = np.r_[0, np.cumsum(np.bincount(flat, minlength=len(vt)))]
    best = np.full(len(vq), np.inf)
    for i in range(0, len(vq), chunk):
        q = vq[i:i+chunk]
        _, nn = tree.query(q, k=3)
        cur = np.full(len(q), np.inf)
        for col in range(nn.shape[1]):
            v = nn[:, col]
            cnt = starts[v+1]-starts[v]
            qi = np.repeat(np.arange(len(q)), cnt)
            pos = np.arange(cnt.sum())-np.repeat(np.cumsum(cnt)-cnt, cnt)
            tri = tri_of[starts[v][qi]+pos]
            d = point_tri_dist(q[qi], vt[ft[tri, 0]], vt[ft[tri, 1]], vt[ft[tri, 2]])
            np.minimum.at(cur, qi, d)
        best[i:i+chunk] = cur
    return best


def compare(dir_a, dir_b):
    va, fa = read_glb(Path(dir_a)/'shape.glb')
    vb, fb = read_glb(Path(dir_b)/'shape.glb')
    va, fa = weld(va, fa)
    vb, fb = weld(vb, fb)
    out = {'a': str(dir_a), 'b': str(dir_b),
           'verticesA': int(len(va)), 'verticesB': int(len(vb)), 'facesA': int(len(fa)), 'facesB': int(len(fb)),
           'vertexDiffPercent': round(100*abs(len(va)-len(vb))/len(va), 4),
           'faceDiffPercent': round(100*abs(len(fa)-len(fb))/len(fa), 4)}
    ba = np.array([va.min(0), va.max(0)])
    bb = np.array([vb.min(0), vb.max(0)])
    out['boundsDiffFigureHeights'] = round(float(np.abs(ba-bb).max()/S), 7)
    da = surface_distance(va, vb, fb)/S
    db = surface_distance(vb, va, fa)/S
    both = np.concatenate([da, db])
    out['surfaceDistanceFigureHeights'] = {
        'symmetricMean': round(float(.5*(da.mean()+db.mean())), 8), 'p99': round(float(np.percentile(both, 99)), 7),
        'max': round(float(both.max()), 7), 'meanAtoB': round(float(da.mean()), 8), 'meanBtoA': round(float(db.mean()), 8)}
    out['topologyB'] = topology(fb, len(vb))
    out['topologyA'] = topology(fa, len(va))
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('a')
    ap.add_argument('b')
    ap.add_argument('--json')
    args = ap.parse_args()
    result = compare(args.a, args.b)
    print(json.dumps(result, indent=1))
    if args.json:
        Path(args.json).write_text(json.dumps(result, indent=1)+'\n')

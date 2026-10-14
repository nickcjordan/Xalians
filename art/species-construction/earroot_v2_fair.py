"""Ear roots v2, stage 2 (numpy only): the back of each ear rolled smoothly into the skull near its root.

After the closing of ear roots v1 (earroot_v1_field, run without the fill blur that left part of the old crease behind) the
skull and the ear's back meet in a wide circular fillet. Where that fillet meets the flat back of the ear the curvature
steps from about 1/.085 to zero, and from behind that step still reads as a soft vertical line. Nick approved the ears'
look; the coordinator (2026-10-13, under REFINEMENT rule 1, an approval protects the look, not the implementation) cleared
a slight convex roll on the back of the ear near its root, with the front-view outline, rim, angle and inner ear held.

Method: a weighted umbrella (uniform Laplacian) smoothing of the skin vertices that face backward near the rear ear root,
repeated `iterations` times with step `factor`. A flat plane is a fixed point of it, so the ear's back away from the root,
the rim and the front face (never selected) do not move; where curvature steps, the smoothing spreads it, so the back of
the ear rolls into the fillet and the curvature ramps instead of stepping.

  w(v) = max over sides of ellipsoid(c, s, fade) * rear(n_y)    rear: smootherstep of the y component of the vertex normal
                                                                from rearGate[0] to rearGate[1]
  repeat: V <- V + factor * w * (mean of neighbours - V)
By position, never by vertex index.
"""
import numpy as np


def smootherstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t*t*t*(t*(6*t-15)+10)


def vertex_normals(V, tris):
    fn = np.cross(V[tris[:, 1]]-V[tris[:, 0]], V[tris[:, 2]]-V[tris[:, 0]])
    N = np.zeros_like(V)
    for i in range(3):
        np.add.at(N, tris[:, i], fn)
    return N/(np.linalg.norm(N, axis=1, keepdims=True)+1e-20)


def fair(V, tris, spec, log=print):
    fs = spec['fair']
    N = vertex_normals(V, tris)
    w = np.zeros(len(V))
    for m in fs['masks']:
        for side in ((1, -1) if m.get('mirror', True) else (1,)):
            c = np.array(m['c'], float)*np.array([side, 1, 1])
            e = np.sqrt((((V-c)/np.array(m['s'], float))**2).sum(1))
            w = np.maximum(w, smootherstep((m['fade'][1]-e)/(m['fade'][1]-m['fade'][0])))
    g0, g1 = fs['rearGate']
    w = w*smootherstep((N[:, 1]-g0)/(g1-g0))
    sel = np.where(w > 0)[0]
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    e = np.unique(np.sort(e, 1), axis=0)
    m = np.zeros(len(V), bool)
    m[sel] = True
    e = e[m[e[:, 0]] | m[e[:, 1]]]
    e = np.concatenate([e, e[:, ::-1]])
    e = e[m[e[:, 0]]]
    deg = np.bincount(e[:, 0], minlength=len(V)).astype(float)
    V1 = V.copy()
    ws = (fs['factor']*w[sel])[:, None]
    for _ in range(int(fs['iterations'])):
        acc = np.zeros((len(V), 3))
        np.add.at(acc, e[:, 0], V1[e[:, 1]])
        V1[sel] += ws*(acc[sel]/np.maximum(deg[sel], 1)[:, None]-V1[sel])
    log(f'faired {len(sel)} vertices x {fs["iterations"]}')
    return V1, w

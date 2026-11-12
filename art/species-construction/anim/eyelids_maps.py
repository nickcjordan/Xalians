"""Akinza eyelids: ray maps of each eye's socket at rest (no render).

  run_blender.py eyelids_maps.py <log> -- <surface dir> <out dir> [--step 0.5]

Per eye globe (head_eye_globe_1 is the creature's left, +X, the near side in the side view; head_eye_globe_-1 its right),
an eye frame: c the globe's bounds centre, f the forward axis (c toward the iris-and-pupil part's vertex mean), up the
world +Z made perpendicular to f, lat = sign(c.x) * (up x f), so +theta turns toward the outer (lateral) corner for both
eyes. On a grid of yaw theta (about up, from f toward lat) and pitch phi (toward up), each direction
d = cos(phi) (cos(theta) f + sin(theta) lat) + sin(phi) up is cast from c:
  rg   the globe's outermost surface (cast back toward c from 0.2 out), surface world units;
  rs   the first skin surface outward of rg - 4 mm (nan when none within 0.3); rs < rg is inside the eye opening (the skin
       passes under the globe), rs > rg is skin over the globe;
  ri, rc  the iris-and-pupil part's and the catch light's outermost surfaces (nan when missed).
Writes <out>/maps.npz (theta, phi in degrees; per eye `<eye>__<name>`, and `<eye>__frame` rows c, f, up, lat) and
<out>/maps.json.
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--')+1:]
src, out = Path(argv[0]), Path(argv[1])
step = float(argv[argv.index('--step')+1]) if '--step' in argv else 0.5
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src/'surface.blend'))
dg = bpy.context.evaluated_depsgraph_get()
skin = bpy.data.objects['akinza_continuous_construction']


def bvh_world(o):
    m = o.data
    mw = o.matrix_world
    return BVHTree.FromPolygons([tuple(mw@v.co) for v in m.vertices], [tuple(p.vertices) for p in m.polygons], all_triangles=False)


SK = bvh_world(skin)
th = np.arange(-110, 110+1e-9, step)
ph = np.arange(-100, 100+1e-9, step)
A, info = dict(theta=th, phi=ph), dict(step=step, eyes={})
for side in ('1', '-1'):
    g = bpy.data.objects['head_eye_globe_'+side]
    ir = bpy.data.objects['head_iris_and_pupil_'+side]
    cl = bpy.data.objects['catch light head_iris_and_pupil_'+side]
    G, I, C = bvh_world(g), bvh_world(ir), bvh_world(cl)
    gv = np.array([tuple(g.matrix_world@v.co) for v in g.data.vertices])
    iv = np.array([tuple(ir.matrix_world@v.co) for v in ir.data.vertices])
    c = (gv.min(0)+gv.max(0))/2
    f = iv.mean(0)-c
    f /= np.linalg.norm(f)
    up = np.array([0., 0., 1.])-f[2]*f
    up /= np.linalg.norm(up)
    lat = np.sign(c[0])*np.cross(up, f)
    rg = np.full((len(ph), len(th)), np.nan)
    rs, ri, rc = rg.copy(), rg.copy(), rg.copy()
    cv = Vector(tuple(c))

    def outer(tree, d, far=0.2):
        h = tree.ray_cast(cv+Vector(tuple(d*far)), Vector(tuple(-d)), far)
        return far-h[3] if h[0] is not None else np.nan
    for i, p in enumerate(np.radians(ph)):
        for j, t in enumerate(np.radians(th)):
            d = np.cos(p)*(np.cos(t)*f+np.sin(t)*lat)+np.sin(p)*up
            r = outer(G, d)
            rg[i, j] = r
            ri[i, j] = outer(I, d)
            rc[i, j] = outer(C, d)
            if np.isfinite(r):
                o = r-.004
                h = SK.ray_cast(cv+Vector(tuple(d*o)), Vector(tuple(d)), .3)
                if h[0] is not None:
                    rs[i, j] = o+h[3]
    k = 'eye'+side
    A[k+'__rg'], A[k+'__rs'], A[k+'__ri'], A[k+'__rc'] = rg, rs, ri, rc
    A[k+'__frame'] = np.array([c, f, up, lat])
    info['eyes'][k] = dict(centre=c.tolist(), forward=f.tolist(), up=up.tolist(), lat=lat.tolist(),
                           opening_cells=int(np.sum(rs < rg)), globe_cells=int(np.isfinite(rg).sum()))
    print('eye', k, info['eyes'][k], flush=True)
np.savez_compressed(out/'maps.npz', **A)
(out/'maps.json').write_text(json.dumps(info, indent=1))
print('EYELIDS_MAPS_DONE')

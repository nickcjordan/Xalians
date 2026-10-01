"""Front-view measurements of the R03 fan front on a head blend (geometry check, not a critic image).

Run through loop_tools.py blender: measure_fan_front.py --scene <head.blend> --out <json>
Reports, per side, how much of the spec's cup polygon the pale inner-ear material covers in the front view (union of the pale,
front-facing faces' centres on a .001 grid, each cell dilated by its face size), the pale footprint area, the pale faces' share
that lies outside the polygon, and the profile (left view) pale area. Cup polygons are the R03 spec's (section 1).
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
import numpy as np

p = argparse.ArgumentParser()
p.add_argument('--scene', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
K, Z0, Y0 = 3.721, .537, .04
CUPS = {'L': [(.100, .066), (.113, .062), (.146, .053), (.185, .041), (.199, .043), (.194, .071), (.173, .097), (.155, .111), (.141, .134),
              (.125, .147), (.104, .170), (.100, .168)],
        'R': [(-.100, .087), (-.113, .084), (-.147, .070), (-.179, .061), (-.186, .063), (-.185, .090), (-.173, .113), (-.161, .130),
              (-.144, .146), (-.107, .171), (-.100, .166)]}
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
mesh = head.data
pale_idx = [i for i, m in enumerate(mesh.materials) if m and 'pale inner-ear' in m.name.lower()]
n = len(mesh.polygons)
mats = np.empty(n, np.int32); mesh.polygons.foreach_get('material_index', mats)
cent = np.empty(n*3, np.float32); mesh.polygons.foreach_get('center', cent); cent = cent.reshape(-1, 3)
norm = np.empty(n*3, np.float32); mesh.polygons.foreach_get('normal', norm); norm = norm.reshape(-1, 3)
area = np.empty(n, np.float32); mesh.polygons.foreach_get('area', area)
pale = np.isin(mats, pale_idx)
xf, yf, df = cent[:, 0]/K, (Z0-cent[:, 2])/K, (cent[:, 1]-Y0)/K


def inside(poly, px, py):
    poly = np.array(poly)
    ins = np.zeros(px.shape, bool)
    for i in range(len(poly)):
        a, b = poly[i], poly[(i+1) % len(poly)]
        cond = (a[1] > py) != (b[1] > py)
        xint = a[0]+(py-a[1])*(b[0]-a[0])/np.where(b[1] != a[1], b[1]-a[1], 1)
        ins ^= cond & (px < xint)
    return ins


g = .001
gx, gy = np.meshgrid(np.arange(-.30, .30, g), np.arange(-.01, .22, g), indexing='ij')
out = {'paleFaces': int(pale.sum()), 'paleMaterials': pale_idx}
for name, sgn in (('L', 1), ('R', -1)):
    sel = pale & (norm[:, 1] < 0) & (np.sign(xf) == sgn)
    covered = np.zeros(gx.shape, bool)
    r = int(np.ceil(np.sqrt(np.median(area[sel]) if sel.any() else 1e-6)/K/g))+1   # dilate by one face
    ix = np.round((xf[sel]+.30)/g).astype(int); iy = np.round((yf[sel]+.01)/g).astype(int)
    for dx in range(-r, r+1):
        for dy in range(-r, r+1):
            jx = np.clip(ix+dx, 0, gx.shape[0]-1); jy = np.clip(iy+dy, 0, gx.shape[1]-1)
            covered[jx, jy] = True
    poly = inside(CUPS[name], gx, gy)
    out[name] = {'cupArea': float(poly.sum()*g*g), 'paleFootprintArea': float(covered.sum()*g*g),
                 'coverOfCup': float((covered & poly).sum()/max(poly.sum(), 1)),
                 'outsideCup': float((covered & ~poly).sum()/max(covered.sum(), 1)),
                 'paleFacesFront': int(sel.sum())}
    # profile: faces facing the +x (L) or -x (R) side, area in the (df, y) plane
    side = pale & (norm[:, 0]*sgn > 0)
    cov2 = np.zeros((int(.2/g), int(.23/g)), bool)
    ix = np.round((df[side]+.1)/g).astype(int); iy = np.round((yf[side]+.01)/g).astype(int)
    ok = (ix >= 0) & (ix < cov2.shape[0]) & (iy >= 0) & (iy < cov2.shape[1])
    cov2[ix[ok], iy[ok]] = True
    out[name]['profilePaleArea'] = float(cov2.sum()*g*g)
args.out.write_text(json.dumps(out, indent=1)+'\n')
print(json.dumps(out))

"""Author layered coat locks on the rear of the Akinza ear fan, in field space.

Run with Blender: -b --factory-startup --python author_rear_locks_field.py --
  --scene <head.blend> --out <new-dir> [options]

The rear of the fan is a thin smooth sheet with a straight lip, where the preferred first sheet's back
view shows a thick, layered coat whose outline breaks into pointed tips. The same lock construction as
author_fan_locks_field.py is laid on the back (+y) of the fan instead of the front:

  1. The skin becomes an OpenVDB level set. The rear surface of the fan (the last solid met from behind,
     per (x, z) column, sub-voxel accurate) is the floor the locks lie on; the fan outline is a mask.
  2. Optional swell: a bounded dilation of the rear of the fan (weighted in x, z and y) so the rear wall
     reads as a rounded coat mass rather than a plate.
  3. Row locks: rings around the skull, spaced by arc length, flowing outward and up, staggered so they
     shingle. Roots inside the skull dome (and a margin) are skipped so the dome is unchanged.
  4. Fringe locks: traced along the whole fan outline, rooted inside it on the rear face and pointing
     outward past it, so the rear rim breaks into pointed tips. Tip heights are capped so the figure
     does not grow taller.
  5. The locks join the skin with a small smooth union, the field is meshed once, and the skin must
     remain one closed connected solid.

Eyes, lids, nose and mouth are separate objects and do not move; nothing in front of the fan changes.
Akinza-specific. Every parameter and every lock is recorded in rear-locks.json.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--seed', type=int, default=23)
parser.add_argument('--normal-sigma', type=float, default=.05, help='smoothing of the rear floor for lock orientation')
parser.add_argument('--root', type=float, nargs=2, default=[.31, -.03], help='flow center (x, z), head-local')
parser.add_argument('--root-blend', type=float, default=.008)
parser.add_argument('--dome', type=float, nargs=3, default=[.33, .08, .46], help='skull dome ellipse half-width, center z, half-height (locks keep out)')
parser.add_argument('--x-min', type=float, default=.40, help='no lock is rooted nearer the midline than this')
# Bevel: a bounded erosion of the rear half of the roof's top edge, so the rear rim is a rounded shoulder that
# lock tips rise from, instead of a straight lip.
parser.add_argument('--bevel', type=float, default=0., help='erosion of the rear top edge, head-local (0 = off)')
parser.add_argument('--bevel-band', type=float, default=.06, help='depth below the local top over which the bevel acts')
parser.add_argument('--bevel-y', type=float, nargs=2, default=[.09, .15], help='weight ramps from 0 to 1 between these y values')
parser.add_argument('--bevel-x', type=float, nargs=4, default=[.42, .55, .95, 1.06], help='ramp in, full, ramp out start, out end')
# Swell: bounded dilation of the rear of the fan.
parser.add_argument('--swell', type=float, default=0., help='dilation of the rear fan wall, head-local (0 = off)')
parser.add_argument('--swell-x', type=float, nargs=4, default=[.36, .50, .90, 1.04], help='ramp in, full, ramp out start, out end')
parser.add_argument('--swell-z', type=float, nargs=4, default=[-.16, -.04, .36, .50], help='ramp in, full, ramp out start, out end')
parser.add_argument('--swell-follow-low', type=float, nargs=2, default=None, help='the lower ramp follows the fan lower edge: weight rises from (lowest solid z at that x + first value) over the second value')
parser.add_argument('--swell-y', type=float, nargs=2, default=[.08, .15], help='weight ramps from 0 to 1 between these y values')
# Push: a heightfield extrusion of the rear of the fan, so the rear wall stands as deep as the skull dome instead of a thin sheet
# with the dome sticking out behind it. The target depth is a wide blur of the rear floor (which fills the dome-to-wall corner)
# plus a constant, ramped in x; the added depth rounds off toward the fan outline like a pillow.
parser.add_argument('--push', type=float, default=0., help='extra rear depth of the fan wall, head-local (0 = off)')
parser.add_argument('--push-x', type=float, nargs=4, default=[.22, .42, .85, 1.05], help='ramp in, full, ramp out start, out end')
parser.add_argument('--push-sigma', type=float, default=.12, help='blur radius of the target depth envelope')
parser.add_argument('--push-round', type=float, default=.08, help='distance inside the outline over which the added depth rounds off')
parser.add_argument('--push-max', type=float, default=.17, help='largest depth added to any column')
parser.add_argument('--push-fill', type=float, default=0., help='blur radius of a fill-only blur that closes the dome-to-wall corner (0 = off)')
parser.add_argument('--push-fill-x', type=float, nargs=4, default=[.12, .22, .50, .65], help='ramp in, full, ramp out start, out end of the fill')
parser.add_argument('--push-blend', type=float, default=.012, help='smooth union radius between the extrusion and the skin')
# Row locks.
parser.add_argument('--rings', type=float, nargs='*', default=[.36, .50, .64, .78, .92])
parser.add_argument('--ring-spacing', type=float, default=.11)
parser.add_argument('--ring-length', type=float, default=.22)
parser.add_argument('--ring-width', type=float, default=.05)
parser.add_argument('--ring-thickness', type=float, default=.018)
parser.add_argument('--ring-lift', type=float, default=.035)
parser.add_argument('--ring-lift-step', type=float, default=.0, help='extra lift per ring outward')
parser.add_argument('--ring-up', type=float, default=.25, help='blend of straight up into the radial flow')
parser.add_argument('--ring-angle-min', type=float, default=-80.)
parser.add_argument('--ring-angle-max', type=float, default=112.)
parser.add_argument('--ring-inset', type=float, default=.03, help='a row lock root must lie this far inside the outline')
parser.add_argument('--ring-tip-slack', type=float, default=.0, help='a row lock tip may stand this far beyond the outline')
# Shingles: low relief leaves pressed into the rear wall by shifting its surface back (no protruding blades), laid out
# on the same rings as the row locks. When --shingle-amp is above zero the rings place shingles instead of row locks.
parser.add_argument('--shingle-amp', type=float, default=0., help='relief height of a shingle at its tip, head-local (0 = off)')
parser.add_argument('--shingle-base', type=float, default=.3, help='fraction of the amplitude at a shingle root')
parser.add_argument('--shingle-edge', type=float, default=.35, help='fraction of the shingle half width over which its side rounds off')
parser.add_argument('--shingle-fade', type=float, default=.03, help='relief fades to zero over this distance inside the fan outline')
parser.add_argument('--shingle-y', type=float, nargs=2, default=[.05, .015], help='the shift acts from this far below the rear floor (zero) to this far (full)')
parser.add_argument('--shingle-floor-min', type=float, default=-9., help='no relief where the rear floor is nearer the front than this y (steep end and rim slopes)')
parser.add_argument('--shingle-x-fade', type=float, nargs=2, default=[9., 10.], help='relief fades out between these |x| values (the outer end face stays smooth)')
parser.add_argument('--shingle-blend', type=float, default=.004, help='smooth union radius between the relief and the skin')
parser.add_argument('--shingle-slope-max', type=float, default=9., help='relief fades out where the rear floor slope (rise per run) passes this')
parser.add_argument('--shingle-taper', type=float, default=2.0, help='exponent of the width falloff toward the tip')
# Cap shingles: the same relief leaves laid over the skull dome, on rings around a center on the midline, so the dome carries the
# coat too. They need the rear floor from x = --floor-x0, which the fan-only default (.25) does not cover.
parser.add_argument('--floor-x0', type=float, default=.25, help='smallest |x| of the rear floor grid (the default keeps earlier runs reproducible)')
parser.add_argument('--cap-rings', type=float, nargs='*', default=[])
parser.add_argument('--cap-center', type=float, nargs=2, default=[0., -.08])
parser.add_argument('--cap-angle', type=float, nargs=2, default=[-100., 100.])
parser.add_argument('--cap-spacing', type=float, default=.065)
parser.add_argument('--cap-length', type=float, default=.15)
parser.add_argument('--cap-width', type=float, default=.058)
parser.add_argument('--cap-amp', type=float, default=.04)
parser.add_argument('--cap-lattice', action='store_true', help='place cap shingles on a jittered lattice flowing down and out from the midline instead of on rings')
parser.add_argument('--cap-ellipse', type=float, nargs=3, default=[.37, .08, .46], help='lattice sites lie inside this ellipse: half-width, center z, half-height')
parser.add_argument('--push-smooth', type=float, default=.0, help='blur radius applied to the rounded-edge distance and the added depth (0 = the first, terraced version)')
parser.add_argument('--cap-up', type=float, default=.1)
# Fringe locks along the outline.
parser.add_argument('--edge-spacing', type=float, default=.10, help='arc spacing of fringe locks along the outline (0 = off)')
parser.add_argument('--edge-rows', type=int, default=2)
parser.add_argument('--edge-inset', type=float, default=.12, help='root distance inside the outline, first row')
parser.add_argument('--edge-row-step', type=float, default=.09)
parser.add_argument('--edge-out', type=float, default=.015, help='how far a fringe lock tip stands beyond the outline')
parser.add_argument('--edge-out-top', type=float, default=.0, help='extra reach of fringe tips where the outline faces up')
parser.add_argument('--edge-top-ramp', type=float, default=1.0, help='fraction of --edge-out-top at the inner end (x .45); it rises to the full value by x .95')
parser.add_argument('--edge-end-thin', type=float, default=2.0, help='where the outline faces outward (normal x above this fraction... 2 = off), every other fringe lock is skipped')
parser.add_argument('--edge-end-skip', type=float, default=2.0, help='no fringe lock where the outline normal x exceeds this (2 = off): the outer end face stays smooth from the side')
parser.add_argument('--edge-width', type=float, default=.05)
parser.add_argument('--edge-thickness', type=float, default=.016)
parser.add_argument('--edge-lift', type=float, default=.03)
parser.add_argument('--edge-radial', type=float, default=.35)
parser.add_argument('--edge-up', type=float, default=.0, help='upward blend of the fringe direction')
parser.add_argument('--edge-center', type=float, nargs=2, default=[.70, .15])
parser.add_argument('--edge-x-min', type=float, default=.42)
parser.add_argument('--edge-max-facing', type=float, default=.55)
parser.add_argument('--lock-cap', type=float, default=None, help='no lock tip rises above this height')
parser.add_argument('--lock-cap-inner', type=float, default=None, help='cap for tips at the inner end of the fan; the cap rises to --lock-cap by --cap-x1')
parser.add_argument('--cap-x', type=float, nargs=2, default=[.45, .95], help='x where the cap starts to rise and where it reaches --lock-cap')
# Rim locks: leaf tips rooted a little below the rear top edge and standing up past it, so the rear rim breaks into tips.
parser.add_argument('--rim-spacing', type=float, default=0., help='arc spacing along x of rim locks (0 = off)')
parser.add_argument('--rim-x', type=float, nargs=2, default=[.46, .92], help='x range of the rim locks')
parser.add_argument('--rim-rise', type=float, nargs=2, default=[.02, .05], help='how far a tip stands above the rear top edge, at the inner and outer end')
parser.add_argument('--rim-inset', type=float, default=.05, help='root depth below the rear top edge, first row')
parser.add_argument('--rim-rows', type=int, default=2)
parser.add_argument('--rim-row-step', type=float, default=.06)
parser.add_argument('--rim-dir-x', type=float, default=.35, help='outward lean of a rim lock (fraction of the up direction)')
parser.add_argument('--rim-floor-min', type=float, default=.12, help='the rear top edge is the highest z where the rear floor is at least this far back')
parser.add_argument('--rim-width', type=float, default=.05)
parser.add_argument('--rim-thickness', type=float, default=.02)
parser.add_argument('--rim-lift', type=float, default=.015)
parser.add_argument('--tip-x-max', type=float, default=None, help='no lock tip reaches beyond this |x|, so the fan span does not grow')
parser.add_argument('--no-rows', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before rear locks')
before = mesh_stats(head)

VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M@v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = max(16, int(math.ceil((args.swell+.03)/VS)))  # the level-set band must hold the dilation
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
hi[1] += int(round(.10/VS))  # room behind for the swell and lifted locks
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
X, Y, Z = [(lo[i]+np.arange(shape[i]))*VS for i in range(3)]


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def gauss2d(a, sigma):
    radius = int(math.ceil(3*sigma))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)/sigma)**2)
    kernel /= kernel.sum()
    for axis in (0, 1):
        moved = np.moveaxis(a, axis, 0)
        padded = np.pad(moved, [(radius, radius), (0, 0)], mode='edge')
        out = np.zeros_like(moved)
        for k, w in enumerate(kernel):
            out += w*padded[k:k+moved.shape[0]]
        a = np.moveaxis(out, 0, axis)
    return a


def dome_value(px, pz):
    a, cz, b = args.dome
    return np.sqrt((px/a)**2+((pz-cz)/b)**2)


# 1b. Bevel of the rear top edge (erosion, weighted).
bevel_record = {'applied': args.bevel > 0}
if args.bevel > 0:
    solid_all = field < 0
    # local top surface per (x, y) column: the highest solid voxel, read from the top down
    top_idx = solid_all.shape[2]-1-np.argmax(solid_all[:, :, ::-1], axis=2)
    top_z = np.where(solid_all.any(axis=2), Z[top_idx], -9.0)
    del solid_all
    valid = top_z > -8
    filled = np.where(valid, top_z, 0.0)
    smooth_top = gauss2d(filled, .03/VS)
    smooth_w = gauss2d(valid.astype(np.float64), .03/VS)
    top_z = np.where(smooth_w > .5, smooth_top/np.maximum(smooth_w, 1e-6), -9.0)
    ax = np.abs(X)
    x0, x1, x2, x3 = args.bevel_x
    wx = smoothstep((ax-x0)/(x1-x0))*(1-smoothstep((ax-x2)/(x3-x2)))
    wy = smoothstep((Y-args.bevel_y[0])/(args.bevel_y[1]-args.bevel_y[0]))
    wz = smoothstep((Z[None, None, :]-(top_z[:, :, None]-args.bevel_band))/args.bevel_band)
    bevel_weight = (wx[:, None, None]*wy[None, :, None]*wz).astype(np.float32)
    field = (field+args.bevel*bevel_weight).astype(np.float32)
    bevel_record['maximumWeight'] = float(bevel_weight.max())
    del bevel_weight, wz, top_z

# 2. Swell of the rear wall.
swell_record = {'applied': args.swell > 0}
shaped = field
if args.swell > 0:
    ax = np.abs(X)
    x0, x1, x2, x3 = args.swell_x
    z0, z1, z2, z3 = args.swell_z
    wx = smoothstep((ax-x0)/(x1-x0))*(1-smoothstep((ax-x2)/(x3-x2)))
    wz = smoothstep((Z-z0)/(z1-z0))*(1-smoothstep((Z-z2)/(z3-z2)))
    wy = smoothstep((Y-args.swell_y[0])/(args.swell_y[1]-args.swell_y[0]))
    if args.swell_follow_low is not None:
        rear_solid = (field < 0) & (Y[None, :, None] > .10) & (Y[None, :, None] < .30)
        has_z = rear_solid.any(axis=1)
        low_idx = np.argmax(has_z, axis=1)
        low_z = np.where(has_z.any(axis=1), Z[low_idx], 9.0)
        del rear_solid, has_z
        low_z = np.where(np.abs(X) > .3, low_z, 9.0)
        wl = smoothstep((Z[None, :]-(low_z[:, None]+args.swell_follow_low[0]))/args.swell_follow_low[1])
        wz_up = 1-smoothstep((Z-z2)/(z3-z2))
        weight = (wx[:, None, None]*wy[None, :, None]*(wl*wz_up[None, :])[:, None, :]).astype(np.float32)
    else:
        weight = (wx[:, None, None]*wy[None, :, None]*wz[None, None, :]).astype(np.float32)
    reach = BAND-.012
    fade = 1-smoothstep((field-reach)/.006)  # keep the far background untouched
    shaped = (field-args.swell*weight*fade).astype(np.float32)
    swell_record['maximumWeight'] = float(weight.max())
    del weight


# 2b. Push: rear extrusion of the fan wall.
push_record = {'applied': args.push > 0}
if args.push > 0:
    ax = np.abs(X)
    pr = np.where((Z > -.30) & (Z < .74))[0]
    q0, q1 = pr[0], pr[-1]+1
    psub = shaped[:, :, q0:q1]
    psolid = psub < 0
    phas = psolid.any(axis=1)
    plast = len(Y)-1-np.argmax(psolid[:, ::-1, :], axis=1)
    plast = np.clip(plast, 0, len(Y)-2)
    p_in = np.take_along_axis(psub, plast[:, None, :], axis=1)[:, 0, :]
    p_out = np.take_along_axis(psub, (plast+1)[:, None, :], axis=1)[:, 0, :]
    p_t = np.clip(p_in/np.where(p_in != p_out, p_in-p_out, 1), 0, 1)
    pfloor = np.where(phas, Y[plast]+p_t*(Y[plast+1]-Y[plast]), 0.0)
    del psolid, p_in, p_out
    sig = args.push_sigma/VS
    base = gauss2d(pfloor*phas, sig)/np.maximum(gauss2d(phas.astype(np.float64), sig), 1e-6)
    x0, x1, x2, x3 = args.push_x
    wxp = smoothstep((ax-x0)/(x1-x0))*(1-smoothstep((ax-x2)/(x3-x2)))
    target = base+args.push*wxp[:, None]
    extra = np.clip(target-pfloor, 0, args.push_max)*wxp[:, None]
    # distance inside the outline, by repeated erosion, for the rounded back edge
    depth_p = np.zeros(phas.shape)
    er = phas.copy()
    for _ in range(int(math.ceil(args.push_round/VS))+1):
        if not er.any():
            break
        depth_p += er
        e2 = er.copy()
        e2[1:] &= er[:-1]
        e2[:-1] &= er[1:]
        e2[:, 1:] &= er[:, :-1]
        e2[:, :-1] &= er[:, 1:]
        er = e2
    if args.push_fill > 0:
        gsum = pfloor+extra
        sf = args.push_fill/VS
        gb = gauss2d(gsum*phas, sf)/np.maximum(gauss2d(phas.astype(np.float64), sf), 1e-6)
        f0, f1, f2, f3 = args.push_fill_x
        wf = smoothstep((ax-f0)/(f1-f0))*(1-smoothstep((ax-f2)/(f3-f2)))
        extra = np.maximum(extra, np.clip(gb-pfloor, 0, args.push_max)*wf[:, None])
    if args.push_smooth > 0:
        depth_p = gauss2d(depth_p, args.push_smooth/VS)
    tt_p = np.clip(depth_p*VS/args.push_round, 0, 1)
    extra = extra*np.sin(.5*np.pi*tt_p)*phas
    extra = gauss2d(extra, (args.push_smooth*1.5 if args.push_smooth > 0 else .010)/VS)*phas
    rows_p = np.where((extra > .0015).any(axis=1))[0]
    pslab = np.full(shape, BAND, dtype=np.float32)
    Ysub = Y[:, None]
    for i in rows_p:
        top = pfloor[i]+extra[i]
        bottom = pfloor[i]-.03
        dd = np.maximum(Ysub-top[None, :], bottom[None, :]-Ysub)
        off = .03*(1-smoothstep(extra[i]/.008))  # pushes the slab away where the added depth vanishes, so no cliff edge
        pslab[i, :, q0:q1] = np.where(phas[i][None, :], np.clip(dd+off[None, :], -BAND, BAND), BAND)
    shaped = smin(shaped, pslab, args.push_blend).astype(np.float32)
    del pslab
    push_record.update({'maximumAdded': float(extra.max()), 'columns': int((extra > .0015).sum()),
                        'meanAddedWhereApplied': float(extra[extra > .0015].mean()) if (extra > .0015).any() else 0.0})

# 1. The floor: the rear surface of the fan, last solid met from behind (+y), per (x, z) column.
cols = np.where((X > args.floor_x0-1e-6) & (X < 1.10))[0]
rows = np.where((Z > -.24) & (Z < .72))[0]
c0, c1, r0, r1 = cols[0], cols[-1]+1, rows[0], rows[-1]+1
sub = shaped[c0:c1, :, r0:r1]
solid = sub < 0
has = solid.any(axis=1)
last = len(Y)-1-np.argmax(solid[:, ::-1, :], axis=1)
last = np.clip(last, 0, len(Y)-2)
f_in = np.take_along_axis(sub, last[:, None, :], axis=1)[:, 0, :]
f_out = np.take_along_axis(sub, (last+1)[:, None, :], axis=1)[:, 0, :]
t_cross = np.clip(f_in/np.where(f_in != f_out, f_in-f_out, 1), 0, 1)
floor_sub = np.where(has, Y[last]+t_cross*(Y[last+1]-Y[last]), np.nan)
del solid, f_out, f_in
SX, SZ = X[c0:c1], Z[r0:r1]
floor_filled = np.where(has, floor_sub, 0.0).astype(np.float64)
known = has.copy()
for _ in range(400):
    if known.all():
        break
    grown_sum = np.zeros_like(floor_filled)
    grown_cnt = np.zeros(floor_filled.shape)
    for axis in (0, 1):
        for shift in (1, -1):
            v = np.roll(np.where(known, floor_filled, 0.0), shift, axis=axis)
            c = np.roll(known.astype(float), shift, axis=axis)
            grown_sum += v
            grown_cnt += c
    fresh = (~known) & (grown_cnt > 0)
    floor_filled = np.where(fresh, grown_sum/np.maximum(grown_cnt, 1), floor_filled)
    known = known | fresh
floor_smooth = gauss2d(floor_filled, args.normal_sigma/VS)
gxs = np.gradient(floor_smooth, VS, axis=0)
gzs = np.gradient(floor_smooth, VS, axis=1)
depth_in = np.zeros(has.shape)
eroded = has.copy()
for _ in range(60):
    if not eroded.any():
        break
    depth_in += eroded
    e = eroded.copy()
    e[1:] &= eroded[:-1]
    e[:-1] &= eroded[1:]
    e[:, 1:] &= eroded[:, :-1]
    e[:, :-1] &= eroded[:, 1:]
    eroded = e
depth_in = depth_in*VS


def at(arr, x, z):
    i = int(np.clip(round((abs(x)-SX[0])/VS), 0, len(SX)-1))
    k = int(np.clip(round((z-SZ[0])/VS), 0, len(SZ)-1))
    return float(arr[i, k])


# 3-4. Author the locks (right side; mirrored to the left).
rng = np.random.default_rng(args.seed)
rx, rz = args.root
shingles = []
locks, skipped = [], {'insideDome': 0, 'tooShallow': 0, 'tipOutside': 0, 'leavesFloor': 0, 'nearMidline': 0}


def add_lock(kind, x, z, direction2, length, width, thickness, lift, flat=False):
    """direction2 is the in-plane (x, z) direction; the lock is projected onto the rear floor's tangent plane."""
    y = at(floor_filled, x, z)
    gx, gz = at(gxs, x, z), at(gzs, x, z)
    slope = np.array([-np.clip(gx, -1.2, 1.2), 1.0, -np.clip(gz, -1.2, 1.2)])
    normal = slope/np.linalg.norm(slope)
    if flat:
        normal = np.array([0., 1., 0.])
    d = np.array([direction2[0], 0.0, direction2[1]])
    d = d-normal*d.dot(normal)
    d /= np.linalg.norm(d)
    if args.lock_cap is not None and d[2] > 1e-6:
        cap = args.lock_cap
        if args.lock_cap_inner is not None:
            tip_x = abs(x+d[0]*length)
            cap = args.lock_cap_inner+(args.lock_cap-args.lock_cap_inner)*float(smoothstep((tip_x-args.cap_x[0])/(args.cap_x[1]-args.cap_x[0])))
        reach = (cap-z-normal[2]*lift)/d[2]
        length = min(length, max(reach, .05))
    if args.tip_x_max is not None and d[0] > 1e-6:
        length = min(length, max((args.tip_x_max-abs(x))/d[0], .04))
    locks.append({'kind': kind, 'root': [x, y, z], 'normal': normal.tolist(), 'direction': d.tolist(),
                  'length': float(length), 'width': float(width), 'thickness': float(thickness), 'lift': float(lift)})


def root_ok(px, pz):
    if abs(px) < args.x_min:
        skipped['nearMidline'] += 1
        return False
    if dome_value(px, pz) < 1.0:
        skipped['insideDome'] += 1
        return False
    return True


if not args.no_rows and args.rings:
    for ri, r in enumerate(args.rings):
        step = args.ring_spacing/r
        theta = math.radians(args.ring_angle_min)+rng.uniform(0, 1)*step*(.5+.5*(ri % 2))
        while theta < math.radians(args.ring_angle_max):
            th = theta+rng.uniform(-.15, .15)*step
            px = rx+r*math.cos(th)
            pz = rz+r*math.sin(th)
            theta += step
            if not root_ok(px, pz):
                continue
            if args.shingle_amp > 0:
                if at(depth_in, px, pz) < .004:
                    skipped['tooShallow'] += 1
                    continue
                radial = np.array([math.cos(th), math.sin(th)])
                d2 = radial*(1-args.ring_up)+np.array([0, 1.])*args.ring_up
                d2 /= np.linalg.norm(d2)
                shingles.append((px, pz, float(d2[0]), float(d2[1]), args.ring_length*rng.uniform(.92, 1.08),
                                 args.ring_width*rng.uniform(.92, 1.1), args.shingle_amp*rng.uniform(.85, 1.1)))
                continue
            if at(depth_in, px, pz) < args.ring_inset:
                skipped['tooShallow'] += 1
                continue
            radial = np.array([math.cos(th), math.sin(th)])
            d2 = radial*(1-args.ring_up)+np.array([0, 1.])*args.ring_up
            d2 /= np.linalg.norm(d2)
            length = args.ring_length*rng.uniform(.92, 1.08)
            tip2 = np.array([px, pz])+d2*length
            probe = tip2-d2*args.ring_tip_slack
            if at(depth_in, probe[0], probe[1]) <= 0:
                skipped['tipOutside'] += 1
                continue
            add_lock('row', px, pz, d2, length, args.ring_width*rng.uniform(.92, 1.1), args.ring_thickness,
                     args.ring_lift+ri*args.ring_lift_step)

cap_placed = 0
if args.cap_lattice and args.shingle_amp > 0:
    rng_cap = np.random.default_rng(args.seed+1)
    ea, ecz, eb = args.cap_ellipse
    ddx, ddz = args.cap_spacing, args.cap_spacing*.8
    for row, zc in enumerate(np.arange(ecz-eb, ecz+eb, ddz)):
        for xc in np.arange(ddx*.5*(row % 2), ea, ddx):
            px = xc+rng_cap.uniform(-.25, .25)*ddx
            pz = zc+rng_cap.uniform(-.25, .25)*ddz
            if px < 0 or (px/ea)**2+((pz-ecz)/eb)**2 >= 1 or at(depth_in, px, pz) < .02:
                continue
            wing, part = min(1.0, px/.40), min(1.0, px/.12)
            d2 = np.array([part, -(.30+.6*(1-part))+.10*wing])
            d2 /= np.linalg.norm(d2)
            shingles.append((px, pz, float(d2[0]), float(d2[1]), args.cap_length*rng_cap.uniform(.9, 1.1),
                             args.cap_width*rng_cap.uniform(.9, 1.1), args.cap_amp*rng_cap.uniform(.85, 1.1)))
            cap_placed += 1
elif args.cap_rings and args.shingle_amp > 0:
    rng_cap = np.random.default_rng(args.seed+1)
    ccx, ccz = args.cap_center
    for ri, r in enumerate(args.cap_rings):
        step = args.cap_spacing/r
        theta = math.radians(args.cap_angle[0])+rng_cap.uniform(0, 1)*step*(.5+.5*(ri % 2))
        while theta < math.radians(args.cap_angle[1]):
            th = theta+rng_cap.uniform(-.15, .15)*step
            px = ccx+r*math.cos(th)
            pz = ccz+r*math.sin(th)
            theta += step
            if px < 0 or at(depth_in, px, pz) < .02:
                continue
            radial = np.array([math.cos(th), math.sin(th)])
            d2 = radial*(1-args.cap_up)+np.array([0, 1.])*args.cap_up
            d2 /= np.linalg.norm(d2)
            shingles.append((px, pz, float(d2[0]), float(d2[1]), args.cap_length*rng_cap.uniform(.92, 1.08),
                             args.cap_width*rng_cap.uniform(.92, 1.1), args.cap_amp*rng_cap.uniform(.85, 1.1)))
            cap_placed += 1

edge_record = {'applied': args.edge_spacing > 0, 'placed': 0}
if args.edge_spacing > 0:
    cx, cz = args.edge_center
    hm = gauss2d(has.astype(np.float64), .012/VS)
    hgx = np.gradient(hm, VS, axis=0)
    hgz = np.gradient(hm, VS, axis=1)
    outline = []
    for phi in np.arange(-180., 180., .25):
        cs, sn = math.cos(math.radians(phi)), math.sin(math.radians(phi))
        rs = np.arange(0., 1.2, VS)
        ii = np.clip(np.round((np.maximum(np.abs(cx+rs*cs), .25)-SX[0])/VS).astype(int), 0, len(SX)-1)
        kk = np.clip(np.round((cz+rs*sn-SZ[0])/VS).astype(int), 0, len(SZ)-1)
        leave = np.where(~has[ii, kk])[0]
        if not len(leave) or leave[0] == 0:
            continue
        rb = rs[leave[0]]
        outline.append((cx+rb*cs, cz+rb*sn))
    outline = np.array(outline)
    seg = np.r_[0., np.cumsum(np.hypot(*np.diff(outline, axis=0).T))]
    for row in range(args.edge_rows):
        inset = args.edge_inset+row*args.edge_row_step
        marks = np.arange(args.edge_spacing*(.5 if row == 0 else 1.0), seg[-1], args.edge_spacing)
        for mi, m in enumerate(marks):
            P = np.array([np.interp(m, seg, outline[:, 0]), np.interp(m, seg, outline[:, 1])])
            if P[0] < args.edge_x_min:
                continue
            N = -np.array([at(hgx, P[0], P[1]), at(hgz, P[0], P[1])])
            if np.linalg.norm(N) < 1e-9:
                continue
            N /= np.linalg.norm(N)
            if N[0] > args.edge_end_thin and (mi+row) % 2 == 1:
                continue
            if N[0] > args.edge_end_skip:
                continue
            rad = P-np.array([rx, rz])
            rad /= np.linalg.norm(rad)
            d2 = N*(1-args.edge_radial)+rad*args.edge_radial+np.array([0., args.edge_up])
            d2 /= np.linalg.norm(d2)
            root = P-N*inset
            if not root_ok(root[0], root[1]):
                continue
            if at(depth_in, root[0], root[1]) < .02:
                skipped['tooShallow'] += 1
                continue
            fn = np.array([-at(gxs, root[0], root[1]), 1.0, -at(gzs, root[0], root[1])])
            fn[0] = np.clip(fn[0], -1.2, 1.2)
            fn[2] = np.clip(fn[2], -1.2, 1.2)
            fn /= np.linalg.norm(fn)
            facing = abs(float(np.array([d2[0], 0., d2[1]])@fn))
            if facing > args.edge_max_facing:
                skipped['leavesFloor'] += 1
                continue
            ramp = args.edge_top_ramp+(1-args.edge_top_ramp)*float(smoothstep((P[0]-.45)/.5))
            out_reach = args.edge_out+args.edge_out_top*ramp*max(float(N[1]), 0.0)
            length = (inset+out_reach)/max(float(d2@N), .55)*rng.uniform(.95, 1.05)
            add_lock('edge%d' % row, float(root[0]), float(root[1]), d2, length,
                     args.edge_width*rng.uniform(.92, 1.08)*(1-.1*row), args.edge_thickness, args.edge_lift)
            edge_record['placed'] += 1
    edge_record['outlinePoints'] = int(len(outline))

shingle_record = {'applied': bool(shingles), 'count': len(shingles)}
if shingles:
    hs = np.zeros((len(SX), len(SZ)))
    for px, pz, dx, dz, L, W, A in shingles:
        ext = L+W+.01
        i0, i1 = max(0, int((px-ext-SX[0])/VS)), min(len(SX), int((px+ext-SX[0])/VS)+1)
        k0, k1 = max(0, int((pz-ext-SZ[0])/VS)), min(len(SZ), int((pz+ext-SZ[0])/VS)+1)
        gx, gz = np.meshgrid(SX[i0:i1]-px, SZ[k0:k1]-pz, indexing='ij')
        u = gx*dx+gz*dz
        w = -gx*dz+gz*dx
        t = np.clip(u/L, 0, 1)
        omega = W*np.clip(1-t**args.shingle_taper, 0, 1)**.6+1e-6
        side = smoothstep((1-np.abs(w)/omega)/args.shingle_edge)
        head_edge = smoothstep(u/(.06*L+1e-6))
        h = A*(args.shingle_base+(1-args.shingle_base)*t)*side*head_edge*((u >= 0) & (u <= L))
        hs[i0:i1, k0:k1] = np.maximum(hs[i0:i1, k0:k1], h)
    hs *= smoothstep(depth_in/args.shingle_fade)
    hs *= smoothstep((floor_smooth-args.shingle_floor_min)/.04)
    hs *= (1-smoothstep((np.abs(SX)[:, None]-args.shingle_x_fade[0])/(args.shingle_x_fade[1]-args.shingle_x_fade[0])))
    slope = np.hypot(gxs, gzs)
    hs *= 1-smoothstep((slope-args.shingle_slope_max)/.4)
    front_y = np.where(has, Y[np.argmax(sub < 0, axis=1)], 0.0)
    thick = np.where(has, floor_smooth-front_y, 0.0)  # wall thickness: the shift must not reach the front face
    hs *= smoothstep((thick-.05)/.04)
    ax_i = np.clip(np.round((np.abs(X)-SX[0])/VS).astype(int), 0, len(SX)-1)
    ok_x = (np.abs(X) >= SX[0]) & (np.abs(X) <= SX[-1])
    H = np.zeros((len(X), len(Z)), dtype=np.float32)
    FL = np.zeros((len(X), len(Z)), dtype=np.float32)
    H[np.ix_(ok_x, np.arange(r0, r1))] = hs[ax_i[ok_x], :]
    FL[np.ix_(ok_x, np.arange(r0, r1))] = floor_smooth[ax_i[ok_x], :]
    TH = np.zeros((len(X), len(Z)), dtype=np.float32)
    TH[np.ix_(ok_x, np.arange(r0, r1))] = thick[ax_i[ok_x], :]
    # The relief is a slab of solid laid on the measured rear floor: from just under the floor to the floor plus the
    # relief height, unioned with the skin. (Shifting the field along y instead left hatch stripes on the steep end.)
    FLR = np.zeros((len(X), len(Z)), dtype=np.float32)
    FLR[np.ix_(ok_x, np.arange(r0, r1))] = floor_filled[ax_i[ok_x], :]
    slab = np.full(shape, BAND, dtype=np.float32)
    for i in np.where(ok_x & (H.max(axis=1) > .0015))[0]:
        top = FLR[i]+H[i]-.002
        bottom = FLR[i]-.02
        d = np.maximum(Y[:, None]-top[None, :], bottom[None, :]-Y[:, None])
        slab[i] = np.where(H[i][None, :] > .0015, np.clip(d, -BAND, BAND), BAND)
    shaped = smin(shaped, slab, args.shingle_blend).astype(np.float32)
    del slab
    shingle_record['maximumRelief'] = float(hs.max())
    shingle_record['coveredColumns'] = int((hs > .001).sum())

rim_record = {'applied': args.rim_spacing > 0, 'placed': 0}
if args.rim_spacing > 0:
    for j, x in enumerate(np.arange(args.rim_x[0], args.rim_x[1], args.rim_spacing)):
        for row in range(args.rim_rows):
            xr = x+(args.rim_spacing*.5 if row % 2 else 0.0)+rng.uniform(-.008, .008)
            if xr > args.rim_x[1]:
                continue
            ci = int(np.clip(round((xr-SX[0])/VS), 0, len(SX)-1))
            ks = np.where(has[ci, :] & (floor_filled[ci, :] > args.rim_floor_min))[0]
            if not len(ks):
                continue
            ztop = float(SZ[ks[-1]])
            tt = float(np.clip((xr-args.rim_x[0])/(args.rim_x[1]-args.rim_x[0]), 0, 1))
            rise = args.rim_rise[0]+(args.rim_rise[1]-args.rim_rise[0])*tt
            inset = args.rim_inset+row*args.rim_row_step
            d2 = np.array([args.rim_dir_x, 1.0])
            d2 /= np.linalg.norm(d2)
            zr = ztop-inset
            if at(depth_in, xr, zr) < .01:
                skipped['tooShallow'] += 1
                continue
            add_lock('rim%d' % row, xr, zr, d2, (inset+rise)/d2[1]*rng.uniform(.95, 1.05),
                     args.rim_width*rng.uniform(.92, 1.08), args.rim_thickness, args.rim_lift, flat=True)
            rim_record['placed'] += 1

lock_field = np.full(shape, BAND, dtype=np.float32)
for lock in locks:
    for side in (1, -1):
        r = np.array(lock['root'], dtype=float)
        n = np.array(lock['normal'], dtype=float)
        d = np.array(lock['direction'], dtype=float)
        if side < 0:
            r[0] = -r[0]
            n[0] = -n[0]
            d[0] = -d[0]
        b = np.cross(d, n)
        L, W, T, lift = lock['length'], lock['width'], lock['thickness'], lock['lift']
        tip = r+d*L+n*lift
        reach = W+.03
        low = np.minimum(r, tip)-reach
        high = np.maximum(r, tip)+reach
        a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
        z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
        sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
        grids = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(sl)]
        GX, GY, GZ = np.meshgrid(*grids, indexing='ij')
        qx, qy, qz = GX-r[0], GY-r[1], GZ-r[2]
        u = qx*d[0]+qy*d[1]+qz*d[2]
        v = qx*n[0]+qy*n[1]+qz*n[2]
        w = qx*b[0]+qy*b[1]+qz*b[2]
        tt = np.clip(u/L, 0, 1)
        vv = v-lift*tt*tt
        omega = W*np.sin(np.pi*tt**.6)**1.1+.003
        tau = T*(1-.6*tt)+.003
        ell = np.sqrt((w/omega)**2+(vv/tau)**2)
        value = (ell-1)*np.minimum(omega, tau)
        along = np.abs(u-np.clip(u, 0, L))
        value = np.where((value < 0) & (along == 0), value, np.hypot(np.maximum(value, 0), along))
        lock_field[sl] = np.minimum(lock_field[sl], value.astype(np.float32))

combined = np.minimum(smin(shaped, lock_field, args.root_blend), BAND).astype(np.float32)
del lock_field, shaped

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with rear locks')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh)
bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse@vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)


def remove_floating_pieces(obj, min_vertices):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen, dropped = set(bm.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex)
                        group.add(vertex)
                        queue.append(vertex)
        if len(group) < min_vertices:
            dropped.append({'vertices': len(group)})
            bmesh.ops.delete(bm, geom=list(group), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return dropped


removed_pieces = remove_floating_pieces(head, 20000)
require_single_closed_mesh(head, args.out, 'Head skin with rear locks')
after = mesh_stats(head)

rng2 = np.random.default_rng(1)
sample = rng2.choice(len(mesh.vertices), size=min(60000, len(mesh.vertices)), replace=False)
outside, inside = [], []
for index in sample:
    co = M@mesh.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    (inside if (abs(co.x) > .30 and co.y > .04 and co.z > -.25) else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)
top_after = float(max((M@v.co).z for v in mesh.vertices))
top_before = float(points[:, 2].max())

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Ear fan rear: layered row and fringe locks on the back of the fan joined by a smooth union; face objects and the front of the fan preserved',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'swell': swell_record, 'push': push_record, 'capShinglesPlaced': cap_placed, 'bevel': bevel_record, 'shingles': shingle_record, 'rim': rim_record, 'skinTopZ': {'before': top_before, 'after': top_after}, 'edge': edge_record,
    'lockCount': len(locks), 'lockSkipped': skipped, 'locks': locks,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces, 'skinBefore': before, 'skinAfter': after,
    'deviationOutsideRearWindow': {'samples': int(len(outside)), 'maximum': float(outside.max()) if len(outside) else None,
                                   'p99': float(np.percentile(outside, 99)) if len(outside) else None},
    'deviationInsideRearWindow': {'samples': int(len(inside)), 'maximum': float(inside.max()) if len(inside) else None,
                                  'mean': float(inside.mean()) if len(inside) else None},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'rear-locks.json').write_text(json.dumps(summary, indent=2)+'\n')
print('rear locks ok', json.dumps({'before': before, 'after': after, 'locks': len(locks), 'skipped': skipped}))

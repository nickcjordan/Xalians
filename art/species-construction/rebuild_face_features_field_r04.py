"""Akinza face features rebuilt in field space (loop round 3, R02): eyes in shallow sockets, a seated nose, tufts.

Run with Blender: -b --factory-startup --python rebuild_face_features_field.py --
  --scene <head.blend> --spec <face-features.json> --out <new-dir>

Every option is opt-in; an absent key does nothing, so earlier runs stay reproducible. Head-local coordinates (the
assembly places the head at scale .50, offset (0, -.02, .635)). The head skin becomes an OpenVDB level set, every skin
edit changes the field, and it is meshed once, so nothing is cut and smoothed afterwards.

  lower_smooth   windowed Gaussian morph over the lower face and jaw (removes the crust of small lumps).
  chin_smooth    the same morph over the chin so the chin knob melts into the muzzle.
  bridge         forward advection of the nose bridge and the nose as one rounded wedge: a table of (z, target y) at
                 x = 0 sets the profile; the shift is s(z) times a lateral falloff, smoothed along z.
  eye            the old eye pocket is filled with a thin-plate-spline face surface fitted to the skin around it, a
                 shallow elliptical socket is cut by a smooth max (rim rounded, upper rim undercut by `shear`), and new
                 eye parts are built: a dome (white) conforming to the face surface that stands proud of the rim
                 plane at its apex and sits behind the rim at its edge, a dark lid band painted as a second material
                 on the dome with angle-dependent width (heavy upper outer, thin lower inner), and a thin iris lens.
  tufts          leaf-shaped cheek tufts (root on the cheek, lifted tip), joined by a smooth union.
  nose_pad       the separate nose shell is replaced by a thin conformal dark decal whose rim is buried in the skin.

The mouth curves follow the surface displacement in y, as in shape_face_field.py. Akinza-specific.
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
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
spec = json.loads(args.spec.read_text())
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
scene_objects = {o.name: o for o in bpy.context.scene.objects}
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before face features')
before = mesh_stats(head)
VS = spec['voxel']
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = 12
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid
record = {}


def box_slices(low, high):
    a = np.clip(np.floor(np.array(low)/VS).astype(int)-lo, 0, np.array(shape)-1)
    b = np.clip(np.ceil(np.array(high)/VS).astype(int)-lo+1, 0, np.array(shape))
    return tuple(slice(int(i), int(j)) for i, j in zip(a, b))


def coordinates(slices):
    axes = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(slices)]
    return np.meshgrid(*axes, indexing='ij')


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def gaussian(volume, sigma):
    radius = int(math.ceil(3*sigma/VS))
    offsets = np.arange(-radius, radius+1)
    kernel = np.exp(-.5*(offsets*VS/sigma)**2)
    kernel /= kernel.sum()
    out = volume.astype(np.float32)
    for axis in range(3):
        padded = np.pad(out, [(radius, radius) if a == axis else (0, 0) for a in range(3)], mode='edge')
        acc = np.zeros_like(out)
        for k, w in zip(offsets, kernel):
            index = [slice(None)]*3
            index[axis] = slice(radius+int(k), radius+int(k)+out.shape[axis])
            acc += np.float32(w)*padded[tuple(index)]
        out = acc
    return out


def front_hit(tree, x, z, y0=-1.0):
    hit, _, _, _ = tree.ray_cast(Vector((float(x), y0, float(z))), Vector((0, 1, 0)))
    return None if hit is None else float(hit.y)


def windowed_blur(name, cfg):
    """Weighted morph of the field to its Gaussian blur inside a smooth-edged box (|x| range, mirrored)."""
    for side in (1, -1):
        xs = sorted([side*cfg['x'][0], side*cfg['x'][1]])
        pad = 3*cfg['sigma']+cfg['fade']
        sl = box_slices([xs[0]-pad, cfg['y'][0]-pad, cfg['z'][0]-pad], [xs[1]+pad, cfg['y'][1]+pad, cfg['z'][1]+pad])
        X, Y, Z = coordinates(sl)
        native = field[sl].copy()
        blurred = native
        for _ in range(cfg.get('passes', 1)):
            blurred = gaussian(blurred, cfg['sigma'])
        ax = np.abs(X)
        f = cfg['fade']
        w = (smoothstep((ax-cfg['x'][0])/f)*smoothstep((cfg['x'][1]-ax)/f)
             * smoothstep((Z-cfg['z'][0])/f)*smoothstep((cfg['z'][1]-Z)/f)
             * smoothstep((Y-cfg['y'][0])/f)*smoothstep((cfg['y'][1]-Y)/f)).astype(np.float32)
        change = w*(blurred-native)
        field[sl] = native+change
        record.setdefault(name, []).append({'side': side, 'maximumFieldChange': float(np.abs(change).max())})


def windowed_blur_centered(name, cfg):
    """The same morph for a window centred on the midline (x in [-half, half]); used for the chin."""
    pad = 3*cfg['sigma']+cfg['fade']
    h = cfg['half_width']
    sl = box_slices([-h-pad, cfg['y'][0]-pad, cfg['z'][0]-pad], [h+pad, cfg['y'][1]+pad, cfg['z'][1]+pad])
    X, Y, Z = coordinates(sl)
    native = field[sl].copy()
    blurred = native
    for _ in range(cfg.get('passes', 1)):
        blurred = gaussian(blurred, cfg['sigma'])
    f = cfg['fade']
    w = (smoothstep((h-np.abs(X))/f) * smoothstep((Z-cfg['z'][0])/f)*smoothstep((cfg['z'][1]-Z)/f)
         * smoothstep((Y-cfg['y'][0])/f)*smoothstep((cfg['y'][1]-Y)/f)).astype(np.float32)
    change = w*cfg.get('strength', 1.0)*(blurred-native)
    field[sl] = native+change
    record[name] = {'maximumFieldChange': float(np.abs(change).max())}


# ---------------------------------------------------------------------------------------------------------------
# Bridge and nose: forward advection F'(x, y, z) = F(x, y + s(x, z), z). The profile table gives the target front y at
# x = 0; the old front y comes from a ray, so the shift is whatever the table needs.
bridge_shift = None
if spec.get('bridge'):
    cfg = spec['bridge']
    rows = cfg['table']                      # [[z, target_y or null], ...] from the top (large z) down
    zs_t = np.array([r[0] for r in rows], dtype=float)
    shifts = []
    for z, target in rows:
        if target is None:
            shifts.append(0.0)
            continue
        old_y = front_hit(old_tree, 1e-4, z)
        shifts.append(max(0.0, old_y-target))
    shifts = np.array(shifts)
    order = np.argsort(zs_t)
    zs_t, shifts = zs_t[order], shifts[order]
    zz = np.arange(zs_t[0]-.05, zs_t[-1]+.05, VS/2)
    profile = np.interp(zz, zs_t, shifts, left=0.0, right=0.0)
    sig = cfg.get('profile_sigma', .006)
    kern_n = int(math.ceil(3*sig/(VS/2)))
    kernel = np.exp(-.5*((np.arange(-kern_n, kern_n+1)*(VS/2))/sig)**2)
    kernel /= kernel.sum()
    profile = np.convolve(np.pad(profile, kern_n, mode='edge'), kernel, mode='valid')

    def shift_profile(z):
        return np.interp(z, zz, profile, left=0.0, right=0.0)

    lat = cfg['lateral']                     # {"upper": [flat, zero], "lower": [flat, zero], "z": [upper_z, lower_z]}

    def lateral(x, z):
        t = np.clip((lat['z'][0]-z)/(lat['z'][0]-lat['z'][1]), 0, 1)
        flat = lat['upper'][0]*(1-t)+lat['lower'][0]*t
        zero = lat['upper'][1]*(1-t)+lat['lower'][1]*t
        return 1-smoothstep((np.abs(x)-flat)/(zero-flat))

    def bridge_shift(x, z):
        return shift_profile(z)*lateral(x, z)

    peak = float(profile.max())
    margin = peak+3*VS
    zlo, zhi = float(zs_t[0])-.06, float(zs_t[-1])+.06
    xr = lat['upper'][1]+.02
    sl = box_slices([-xr, -.5, zlo], [xr, -.12, zhi])
    X, Y, Z = coordinates(sl)
    s = bridge_shift(X[:, 0, :], Z[:, 0, :]).astype(np.float32)[:, None, :]
    sub = field[sl].copy()
    j = np.arange(sub.shape[1], dtype=np.float32)[None, :, None]+s/VS
    j = np.clip(j, 0, sub.shape[1]-1)
    j0 = np.minimum(np.floor(j).astype(np.int64), sub.shape[1]-2)
    frac = (j-j0).astype(np.float32)
    a = np.take_along_axis(sub, np.broadcast_to(j0, sub.shape), axis=1)
    b = np.take_along_axis(sub, np.broadcast_to(j0+1, sub.shape), axis=1)
    field[sl] = a*(1-frac)+b*frac
    record['bridge'] = {'peakShift': peak, 'tableShifts': [[float(z), float(v)] for z, v in zip(zs_t, shifts)]}

# ---------------------------------------------------------------------------------------------------------------
# Lower face crust and chin knob.
if spec.get('lower_smooth'):
    windowed_blur('lowerSmooth', spec['lower_smooth'])
if spec.get('chin_smooth'):
    windowed_blur_centered('chinSmooth', spec['chin_smooth'])


# ---------------------------------------------------------------------------------------------------------------
# Eyes.
def tps_fit(P, vals, lam):
    n = len(P)
    D = np.linalg.norm(P[:, None, :]-P[None, :, :], axis=2)
    K = np.where(D > 0, D**2*np.log(np.maximum(D, 1e-30)), 0.0)
    A = np.zeros((n+3, n+3))
    A[:n, :n] = K+lam*np.eye(n)
    A[:n, n] = 1
    A[:n, n+1:] = P
    A[n, :n] = 1
    A[n+1:, :n] = P.T
    coef = np.linalg.solve(A, np.concatenate([vals, np.zeros(3)]))
    return P, coef


def tps_eval(model, Q):
    P, coef = model
    n = len(P)
    out = np.empty(len(Q))
    for i in range(0, len(Q), 4000):
        q = Q[i:i+4000]
        D = np.linalg.norm(q[:, None, :]-P[None, :, :], axis=2)
        K = np.where(D > 0, D**2*np.log(np.maximum(D, 1e-30)), 0.0)
        out[i:i+len(q)] = K@coef[:n]+coef[n]+q@coef[n+1:]
    return out


def interp_angle(table_deg, table_val, alpha):
    """Periodic linear interpolation of a table given at angles in degrees (from the top, + toward the outer corner)."""
    d = np.array(table_deg, dtype=float)
    v = np.array(table_val, dtype=float)
    o = np.argsort(d)
    d, v = d[o], v[o]
    deg = (np.degrees(alpha)+180) % 360-180
    return np.interp(deg, np.concatenate([d-360, d, d+360]), np.concatenate([v, v, v]))


def smooth_periodic(values, passes):
    out = values.copy()
    for _ in range(passes):
        out = (np.roll(out, 1)+2*out+np.roll(out, -1))/4
    return out


eye_state = {}
if spec.get('eye'):
    E = spec['eye']
    for side in (1, -1):
        cxo, czo = side*E['old']['center'][0], E['old']['center'][1]
        axo, azo = E['old']['semi']
        th = np.linspace(0, 2*np.pi, E['ring_angles'], endpoint=False)
        pts, vals = [], []
        for rr in np.linspace(E['ring'][0], E['ring'][1], E['ring_count']):
            for t in th:
                x, z = cxo+rr*axo*np.cos(t), czo+rr*azo*np.sin(t)
                y = front_hit(old_tree, x, z)
                if y is None:
                    continue
                if bridge_shift is not None:
                    y = y-float(bridge_shift(np.array(x), np.array(z)))
                pts.append((x, z))
                vals.append(y)
        pts, vals = np.array(pts), np.array(vals)
        model = tps_fit(pts, vals, E.get('lambda', 1e-7))
        eye_state[side] = {'model': model, 'ringSamples': len(pts)}

        # Fill: G = signed distance to the fitted face surface (negative behind it), unioned in a weighted window.
        reach = E['fill_reach']
        sl = box_slices([cxo-axo*reach, -.5, czo-azo*reach], [cxo+axo*reach, E['fill_y_max'], czo+azo*reach])
        X, Y, Z = coordinates(sl)
        hgrid = tps_eval(model, np.stack([X[:, 0, :].ravel(), Z[:, 0, :].ravel()], axis=1)).reshape(X[:, 0, :].shape)
        gx, gz = np.gradient(hgrid, VS, VS)
        norm = np.sqrt(1+gx**2+gz**2)
        G = ((hgrid[:, None, :]-Y)/norm[:, None, :]).astype(np.float32)
        r_o = np.sqrt(((X[:, 0, :]-cxo)/axo)**2+((Z[:, 0, :]-czo)/azo)**2)
        w = smoothstep((E['fill_fade'][1]-r_o)/(E['fill_fade'][1]-E['fill_fade'][0])).astype(np.float32)[:, None, :]
        native = field[sl].copy()
        field[sl] = native+w*(np.minimum(native, G)-native)
        eye_state[side]['fillWindow'] = {'maxChange': float(np.abs(field[sl]-native).max())}
        # Optional: blur an annulus around the old opening so the seam between the old lip and the fitted surface
        # leaves no crease. r = [start, full, full_end, end] in units of the old ellipse.
        bb = E.get('blend_blur')
        if bb:
            pad = 3*bb['sigma']
            sl2 = box_slices([cxo-axo*bb['r'][3]-pad, -.5, czo-azo*bb['r'][3]-pad],
                             [cxo+axo*bb['r'][3]+pad, E['fill_y_max'], czo+azo*bb['r'][3]+pad])
            X2, Y2, Z2 = coordinates(sl2)
            ro2 = np.sqrt(((X2-cxo)/axo)**2+((Z2-czo)/azo)**2)
            r4 = bb['r']
            w2 = (smoothstep((ro2-r4[0])/(r4[1]-r4[0]))*smoothstep((r4[3]-ro2)/(r4[3]-r4[2]))).astype(np.float32)
            base = field[sl2].copy()
            blurred = base
            for _ in range(bb.get('passes', 1)):
                blurred = gaussian(blurred, bb['sigma'])
            field[sl2] = base+w2*(blurred-base)
            eye_state[side]['blendBlur'] = {'maxChange': float(np.abs(field[sl2]-base).max())}

    def face_y(side, x, z):
        return tps_eval(eye_state[side]['model'], np.stack([np.atleast_1d(x).ravel(), np.atleast_1d(z).ravel()], axis=1))

    ap = E['aperture']
    ac, asemi = ap['center'], ap['semi']

    def edge_e(alpha):
        """Depth of the dome edge behind the face surface at the aperture, by angle from the top."""
        top, bottom = E['edge_behind']
        return bottom+(top-bottom)*(1+np.cos(alpha))/2

    def dome_y(side, x, z, r, alpha):
        e_edge = edge_e(alpha)
        e = e_edge-(e_edge+E['apex_proud'])*(1-r**2)
        return face_y(side, x, z).reshape(np.shape(x)) + e

    # Cut the socket.
    for side in (1, -1):
        cx, cz = side*ac[0], ac[1]
        reach = 1.35
        sl = box_slices([cx-asemi[0]*reach, -.5, cz-asemi[1]*reach], [cx+asemi[0]*reach, E['fill_y_max'], cz+asemi[1]*reach])
        X, Y, Z = coordinates(sl)
        x2, z2 = X[:, 0, :], Z[:, 0, :]
        u = (x2-cx)/asemi[0]
        v = (z2-cz)/asemi[1]
        r = np.sqrt(u**2+v**2)
        alpha = np.arctan2(side*u, v)       # from the top, + toward the outer corner
        yface = face_y(side, x2, z2).reshape(r.shape)
        e_edge = edge_e(alpha)
        yg = yface+e_edge-(e_edge+E['apex_proud'])*(1-np.minimum(r, 1.3)**2)
        floor_y = (yg+E['floor_behind']).astype(np.float32)
        # shear: the opening moves up with depth, so the upper rim overhangs
        zs = Z-E['shear']*(Y-yface[:, None, :])
        us = (X-cx)/asemi[0]
        vs = (zs-cz)/asemi[1]
        rs = np.sqrt(us**2+vs**2)
        grad = np.sqrt((us/asemi[0])**2+(vs/asemi[1])**2)/np.maximum(rs, 1e-6)
        ell = ((rs-1)/np.maximum(grad, 1e-6)).astype(np.float32)
        floor_f = (Y-floor_y[:, None, :]).astype(np.float32)
        cutter = -smin(-ell, -floor_f, E['floor_blend'])         # smooth max(ell, floor_f)
        native = field[sl].copy()
        field[sl] = np.clip(-smin(-native, cutter, E['rim_blend']), -BAND, BAND).astype(np.float32)
        eye_state[side]['socket'] = {'maxChange': float(np.abs(field[sl]-native).max())}
        ss = E.get('socket_smooth')
        if ss:
            # Optional (round 4): blur an annulus around the cut rim so the lid edge is one soft lip, not a stepped
            # crescent. r = [start, full, full_end, end] in units of the aperture ellipse.
            pad = 3*ss['sigma']
            r4 = ss['r']
            sl2 = box_slices([cx-asemi[0]*r4[3]-pad, -.5, cz-asemi[1]*r4[3]-pad],
                             [cx+asemi[0]*r4[3]+pad, E['fill_y_max'], cz+asemi[1]*r4[3]+pad])
            X2, Y2, Z2 = coordinates(sl2)
            ro2 = np.sqrt(((X2-cx)/asemi[0])**2+((Z2-cz)/asemi[1])**2)
            w2 = (smoothstep((ro2-r4[0])/(r4[1]-r4[0]))*smoothstep((r4[3]-ro2)/(r4[3]-r4[2]))).astype(np.float32)
            base = field[sl2].copy()
            blurred = base
            for _ in range(ss.get('passes', 1)):
                blurred = gaussian(blurred, ss['sigma'])
            field[sl2] = base+w2*(blurred-base)
            eye_state[side]['socketSmooth'] = {'maxChange': float(np.abs(field[sl2]-base).max())}

# ---------------------------------------------------------------------------------------------------------------
# Tufts.
tuft_records = []
if spec.get('tufts'):
    T = spec['tufts']
    lock_field = np.full(shape, BAND, dtype=np.float32)
    for tuft in T['list']:
        for side in (1, -1):
            x0, z0 = side*tuft['root'][0], tuft['root'][1]
            x1, z1 = side*tuft['tip'][0], tuft['tip'][1]
            y0 = front_hit(old_tree, x0, z0)
            if y0 is None:
                continue
            hit, normal, _, _ = old_tree.ray_cast(Vector((x0, -1.0, z0)), Vector((0, 1, 0)))
            n = np.array(normal, dtype=float)
            n /= np.linalg.norm(n)
            d = np.array([x1-x0, 0.0, z1-z0])
            d = d-n*d.dot(n)
            d /= np.linalg.norm(d)
            b = np.cross(d, n)
            root = np.array([x0, y0, z0])-n*T['bury']
            L, Wr, Tr, lift = tuft['length'], tuft['width_root'], tuft['thick_root'], tuft['lift']
            tip = root+d*L+n*lift
            reach = Wr+lift+.03
            sl = box_slices(np.minimum(root, tip)-reach, np.maximum(root, tip)+reach)
            X, Y, Z = coordinates(sl)
            qx, qy, qz = X-root[0], Y-root[1], Z-root[2]
            uu = qx*d[0]+qy*d[1]+qz*d[2]
            vv = qx*n[0]+qy*n[1]+qz*n[2]
            ww = qx*b[0]+qy*b[1]+qz*b[2]
            t = np.clip(uu/L, 0, 1)
            vv = vv-lift*t*t
            taper = np.maximum(1-t**T['taper_power'], 0)**T.get('taper_exponent', 1.0)
            Wt = np.maximum(Wr*taper, T['tip_radius'])
            Tt = np.maximum(Tr*taper**T.get('thickness_exponent', 1.0), T['tip_radius'])
            rho = np.sqrt((ww/Wt)**2+(vv/Tt)**2)
            gradient = np.sqrt((ww/Wt**2)**2+(vv/Tt**2)**2)/np.maximum(rho, 1e-6)
            sdf = (rho-1)/np.maximum(gradient, 1e-6)
            along = uu-np.clip(uu, 0, L)
            sdf = np.where(along != 0, np.sqrt(np.maximum(sdf, 0)**2+along**2), sdf)
            lock_field[sl] = np.minimum(lock_field[sl], sdf.astype(np.float32))
            tuft_records.append({'side': side, 'root': root.tolist(), 'normal': n.tolist(), 'direction': d.tolist(), **tuft})
    field = np.minimum(smin(field, lock_field, T['blend']), BAND).astype(np.float32)
    del lock_field
    record['tufts'] = len(tuft_records)

# ---------------------------------------------------------------------------------------------------------------
# Mesh the field once.
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(field, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with face features')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
require_single_closed_mesh(head, args.out, 'Head skin with face features')
mesh = head.data
mesh.calc_loop_triangles()
new_points = np.array([M @ v.co for v in mesh.vertices], dtype=np.float32)
new_tris = np.empty(len(mesh.loop_triangles)*3, dtype=np.int32)
mesh.loop_triangles.foreach_get('vertices', new_tris)
new_tree = BVHTree.FromPolygons([tuple(q) for q in new_points], new_tris.reshape(-1, 3).tolist())

# ---------------------------------------------------------------------------------------------------------------
# New eye parts.
checks = {}
if spec.get('eye'):
    E = spec['eye']
    mat_white = bpy.data.materials['Ocular white']
    mat_iris = bpy.data.materials['Charcoal iris and black pupil']
    mat_band = bpy.data.materials['Upper emphasized eyelid']
    for name in list(scene_objects):
        if name.startswith(('eye_globe_', 'iris_and_pupil_', 'upper_emphasized_lid_')):
            bpy.data.objects.remove(scene_objects[name], do_unlink=True)
    ap = E['aperture']
    ac, asemi = ap['center'], ap['semi']
    eye_width = 2*asemi[0]
    NA, NR = E['angular'], E['radial']
    band_deg = [r[0] for r in E['band_percent']]
    band_pct = [r[1] for r in E['band_percent']]
    alphas = np.linspace(0, 2*np.pi, NA, endpoint=False)
    band_width = smooth_periodic(interp_angle(band_deg, band_pct, alphas), 3)/100*eye_width
    # radial width of the band: width along the ray, from the normal width of the ellipse
    rho_edge = np.sqrt((asemi[0]*np.sin(alphas))**2+(asemi[1]*np.cos(alphas))**2)
    rb = 1-band_width/np.maximum(rho_edge, 1e-6)
    for side in (1, -1):
        cx, cz = side*ac[0], ac[1]
        # dome rings: interior (0..rb), band (rb..1), hidden border (1..hidden)
        radial = []
        for j in range(NA):
            row = list(np.linspace(0, rb[j], NR[0]+1))
            row += list(np.linspace(rb[j], 1.0, NR[1]+1)[1:])
            row += list(np.linspace(1.0, E['hidden_radius'], NR[2]+1)[1:])
            radial.append(row)
        radial = np.array(radial)
        K = radial.shape[1]
        rr = radial.ravel()
        al = np.repeat(alphas, K)
        x = cx+side*asemi[0]*rr*np.sin(al)
        z = cz+asemi[1]*rr*np.cos(al)
        yy = dome_y(side, x, z, rr, al)
        dome_vertices = np.stack([x, yy, z], axis=1)
        # back cap: one ring behind the hidden border and a centre point
        back_offset = E['dome_back']
        ring_idx = np.arange(NA)*K+(K-1)
        back_ring = dome_vertices[ring_idx].copy()
        back_ring[:, 1] += back_offset
        centre = np.array([[cx, float(dome_vertices[0, 1])+back_offset+E['dome_back_centre'], cz]])
        verts = np.concatenate([dome_vertices, back_ring, centre])
        faces_d = []
        for j in range(NA):
            j2 = (j+1) % NA
            for k in range(K-1):
                a, b, c, d = j*K+k, j2*K+k, j2*K+k+1, j*K+k+1
                faces_d.append((b, c, d) if k == 0 else (a, b, c, d))
            bj, bj2 = len(dome_vertices)+j, len(dome_vertices)+j2
            faces_d.append((j*K+K-1, j2*K+K-1, bj2, bj))
            faces_d.append((bj, bj2, len(dome_vertices)+NA))
        mesh_g = bpy.data.meshes.new(f'eye_globe_{side}')
        mesh_g.from_pydata(verts.tolist(), [], faces_d)
        mesh_g.update()
        bmg = bmesh.new(); bmg.from_mesh(mesh_g)
        bmesh.ops.remove_doubles(bmg, verts=list(bmg.verts), dist=1e-7)
        bmesh.ops.recalc_face_normals(bmg, faces=list(bmg.faces))
        bmg.to_mesh(mesh_g); bmg.free()
        # material by face centroid: the band starts at the per-angle radius rb
        globe = bpy.data.objects.new(f'eye_globe_{side}', mesh_g)
        bpy.context.scene.collection.objects.link(globe)
        mesh_g.materials.append(mat_white)
        mesh_g.materials.append(mat_band)
        for poly in mesh_g.polygons:
            poly.use_smooth = True
            c = poly.center
            u = (c.x-cx)*side/asemi[0]
            v = (c.z-cz)/asemi[1]
            r = math.hypot(u, v)
            a = math.atan2(u, v) % (2*math.pi)
            idx = int(round(a/(2*math.pi)*NA)) % NA
            poly.material_index = 1 if r >= rb[idx]-1e-6 else 0
        # iris lens
        icx, icz = side*E['iris']['center'][0], E['iris']['center'][1]
        ia, ib = E['iris']['semi']
        pa, pb = E['iris']['pupil']
        NI = (96, 18)
        lens_verts, lens_faces = [], []
        for j in range(NI[0]):
            ang = 2*math.pi*j/NI[0]
            for k in range(NI[1]+1):
                s = k/NI[1]
                px = icx+ia*s*math.sin(ang)
                pz = icz+ib*s*math.cos(ang)
                ux, uz = (px-cx)*side/asemi[0], (pz-cz)/asemi[1]
                rg = math.hypot(ux, uz)
                alg = math.atan2(ux, uz)
                yg = float(dome_y(side, np.array([px]), np.array([pz]), np.array([rg]), np.array([alg]))[0])
                thick = E['lens_front']*(1-s**2)-E['lens_edge_behind']
                lens_verts.append((px, yg-thick, pz))
        base = len(lens_verts)
        for j in range(NI[0]):
            ang = 2*math.pi*j/NI[0]
            for k in range(NI[1]+1):
                s = k/NI[1]
                px = icx+ia*s*math.sin(ang)
                pz = icz+ib*s*math.cos(ang)
                ux, uz = (px-cx)*side/asemi[0], (pz-cz)/asemi[1]
                rg = math.hypot(ux, uz)
                alg = math.atan2(ux, uz)
                yg = float(dome_y(side, np.array([px]), np.array([pz]), np.array([rg]), np.array([alg]))[0])
                lens_verts.append((px, yg+E['lens_back'], pz))
        for j in range(NI[0]):
            j2 = (j+1) % NI[0]
            for k in range(NI[1]):
                a, b, c, d = j*(NI[1]+1)+k, j2*(NI[1]+1)+k, j2*(NI[1]+1)+k+1, j*(NI[1]+1)+k+1
                lens_faces.append((a, b, c, d))
                lens_faces.append((base+d, base+c, base+b, base+a))
            lens_faces.append((j*(NI[1]+1)+NI[1], base+j*(NI[1]+1)+NI[1], base+j2*(NI[1]+1)+NI[1], j2*(NI[1]+1)+NI[1]))
        mesh_i = bpy.data.meshes.new(f'iris_and_pupil_{side}')
        mesh_i.from_pydata(lens_verts, [], lens_faces)
        mesh_i.update()
        bmi = bmesh.new(); bmi.from_mesh(mesh_i)
        bmesh.ops.remove_doubles(bmi, verts=list(bmi.verts), dist=1e-7)
        bmesh.ops.recalc_face_normals(bmi, faces=list(bmi.faces))
        bmi.to_mesh(mesh_i); bmi.free()
        iris = bpy.data.objects.new(f'iris_and_pupil_{side}', mesh_i)
        bpy.context.scene.collection.objects.link(iris)
        mesh_i.materials.append(mat_iris)
        colors = mesh_i.color_attributes.new(name='IrisColor', type='FLOAT_COLOR', domain='CORNER')
        for poly in mesh_i.polygons:
            poly.use_smooth = True
        for loop in mesh_i.loops:
            px, _, pz = mesh_i.vertices[loop.vertex_index].co
            pr = math.hypot((px-icx)/pa, (pz-icz)/pb)
            t = max(0, min(1, (pr-.96)/.08))
            blend = t*t*(3-2*t)
            radial_i = min(1, ((px-icx)/ia)**2+((pz-icz)/ib)**2)
            charcoal = .004+.011*(1-radial_i)
            gray = .0007*(1-blend)+charcoal*blend
            colors.data[loop.index].color = (gray, gray, gray, 1)
        # checks
        gv = np.array([v.co for v in mesh_g.vertices])
        iv = np.array([v.co for v in mesh_i.vertices])
        edge_idx = [j*K+NR[0]+NR[1] for j in range(NA)]
        checks.setdefault('eyes', {})[str(side)] = {
            'frontmostGlobeY': float(gv[:, 1].min()), 'frontmostIrisY': float(iv[:, 1].min()),
            'frontmostWorldY': float(min(gv[:, 1].min(), iv[:, 1].min())*.5-.02),
            'apertureX': [float(min(dome_vertices[edge_idx, 0])), float(max(dome_vertices[edge_idx, 0]))],
            'apertureZ': [float(min(dome_vertices[edge_idx, 2])), float(max(dome_vertices[edge_idx, 2]))],
            'globe': mesh_stats(globe), 'iris': mesh_stats(iris)}
        # rim depth at 12 angles: skin front y just outside the aperture against the dome edge
        depths = []
        for deg in range(0, 360, 30):
            a = math.radians(deg)
            rho = 1.0+E['rim_probe']
            px = cx+side*asemi[0]*rho*math.sin(a)
            pz = cz+asemi[1]*rho*math.cos(a)
            ys = front_hit(new_tree, px, pz)
            pe = float(dome_y(side, np.array([px]), np.array([pz]), np.array([rho]), np.array([a]))[0])
            depths.append({'deg': deg, 'skinY': ys, 'domeEdgeY': pe, 'rimInFrontOfGlobe': None if ys is None else pe-ys})
        checks['eyes'][str(side)]['rimDepth'] = depths

# ---------------------------------------------------------------------------------------------------------------
# Nose decal.
if spec.get('nose_pad'):
    P = spec['nose_pad']
    mat_nose = bpy.data.materials['Rounded animal nose']
    if 'nose_finish' in scene_objects:
        bpy.data.objects.remove(scene_objects['nose_finish'], do_unlink=True)
    top_z, apex_z, half = P['top_z'], P['apex_z'], P['half_width']
    corners = np.array([(-half, top_z), (half, top_z), (0.0, apex_z)])
    # incentre and inradius of the triangle; the rounded outline is the triangle shrunk by the corner radius and
    # then grown by it (a Minkowski sum with a disc), sampled by direction
    sides_len = [np.linalg.norm(corners[(i+1) % 3]-corners[(i+2) % 3]) for i in range(3)]
    incentre = sum(sides_len[i]*corners[i] for i in range(3))/sum(sides_len)
    area = abs(np.cross(corners[1]-corners[0], corners[2]-corners[0]))/2
    inradius = 2*area/sum(sides_len)
    rc = P['corner_radius']
    inner = incentre+(corners-incentre)*((inradius-rc)/inradius)
    cxn, czn = float(incentre[0]), float(incentre[1])
    outline = []
    for ang in np.linspace(0, 2*np.pi, P['outline_points'], endpoint=False):
        direction = np.array([math.cos(ang), math.sin(ang)])
        support = inner[int(np.argmax(inner@direction))]
        outline.append(support+rc*direction)
    outline = np.array(outline)
    M_O = len(outline)
    rings = P['rings']
    decal_vertices = [(cxn, 0.0, czn)]
    ring_scales = [i/rings for i in range(1, rings+1)]
    for sc_ in ring_scales:
        for (ox, oz) in outline:
            decal_vertices.append((cxn+(ox-cxn)*sc_, 0.0, czn+(oz-czn)*sc_))
    dv = np.array(decal_vertices)
    def hit_normal(x, z):
        hit, normal, _, _ = new_tree.ray_cast(Vector((float(x), -1.0, float(z))), Vector((0, 1, 0)))
        return hit, normal
    smoothed_n = {}
    for i in range(len(dv)):
        hit, _ = hit_normal(dv[i, 0], dv[i, 2])
        if hit is None:
            hit = Vector((dv[i, 0], float(dv[:i, 1].mean()) if i else -.3, dv[i, 2]))
        acc = Vector((0, 0, 0))
        for ox, oz in [(0, 0), (.004, 0), (-.004, 0), (0, .004), (0, -.004)]:
            h2, n2 = hit_normal(dv[i, 0]+ox, dv[i, 2]+oz)
            if h2 is not None:
                if n2.y > 0:
                    n2 = -n2
                acc += n2
        acc.normalize()
        s_ = 0.0 if i == 0 else ring_scales[(i-1)//M_O]
        t_ = smoothstep((s_-P['bury_start'])/(1-P['bury_start']))
        offset = P['lift']*(1-t_)-P['bury']*t_
        dv[i] = (hit.x+acc.x*offset, hit.y+acc.y*offset, hit.z+acc.z*offset)
    nose_faces = []
    for j in range(M_O):
        j2 = (j+1) % M_O
        nose_faces.append((0, 1+j, 1+j2))
    for rg in range(rings-1):
        for j in range(M_O):
            j2 = (j+1) % M_O
            a, b = 1+rg*M_O+j, 1+rg*M_O+j2
            nose_faces.append((a, b, b+M_O, a+M_O))
    mesh_n = bpy.data.meshes.new('nose_finish')
    mesh_n.from_pydata(dv.tolist(), [], nose_faces)
    mesh_n.update()
    bmn = bmesh.new(); bmn.from_mesh(mesh_n)
    bmn.faces.ensure_lookup_table()
    for face in bmn.faces:
        if face.normal.y > 0:
            face.normal_flip()
    bmn.to_mesh(mesh_n); bmn.free()
    nose = bpy.data.objects.new('nose_finish', mesh_n)
    bpy.context.scene.collection.objects.link(nose)
    mesh_n.materials.append(mat_nose)
    for poly in mesh_n.polygons:
        poly.use_smooth = True
    checks['nose'] = {'decalVertices': len(dv), 'outlinePoints': M_O}

# Mouth curves follow the surface displacement in y.
follow = {}
if spec.get('philtrum_top_z') is not None and 'closed_mouth_2' in bpy.data.objects:
    # The philtrum line ends under the nose pad: drop the part of the tube above the pad's apex.
    obj = bpy.data.objects['closed_mouth_2']
    bmp = bmesh.new(); bmp.from_mesh(obj.data)
    drop = [v for v in bmp.verts if (obj.matrix_world @ v.co).z > spec['philtrum_top_z']]
    bmesh.ops.delete(bmp, geom=drop, context='VERTS')
    bmp.to_mesh(obj.data); bmp.free()
    follow['closed_mouth_2_trimmed_vertices'] = len(drop)
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH' or not obj.name.startswith('closed_mouth') or not len(obj.data.vertices):
        continue
    deltas = []
    for vertex in obj.data.vertices:
        w = obj.matrix_world @ vertex.co
        a, b = front_hit(old_tree, w.x, w.z), front_hit(new_tree, w.x, w.z)
        deltas.append(0.0 if a is None or b is None else b-a)
    deltas = np.array(deltas)
    for vertex, delta in zip(obj.data.vertices, deltas):
        vertex.co.y += float(delta)
    follow[obj.name] = {'maxDelta': float(deltas.max()), 'minDelta': float(deltas.min())}

# Profile and outline checks on the new skin.
profile_rows = {}
for z in spec.get('profile_probe_z', []):
    profile_rows[f'{z:.4f}'] = front_hit(new_tree, 1e-4, z)
checks['midlineFrontY'] = profile_rows
outline_rows = {}
for y_fit in spec.get('outline_probe_fit_y', []):
    z = .537-3.721*y_fit
    sel = (np.abs(new_points[:, 2]-z) < .004) & (new_points[:, 1] < .05)
    outline_rows[f'{y_fit:.3f}'] = float(np.abs(new_points[sel, 0]).max()/3.721) if sel.any() else None
checks['frontHalfWidthFit'] = outline_rows

rng = np.random.default_rng(1)
sample = rng.choice(len(new_points), size=min(60000, len(new_points)), replace=False)
outside = []
for index in sample:
    co = Vector(new_points[int(index)])
    if abs(co.x) > .5 or co.z > .30 or co.z < -.36 or co.y > .05:
        _, _, _, distance = old_tree.find_nearest(co)
        outside.append(distance)
outside = np.array(outside)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'face-features.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Eyes rebuilt in shallow sockets, seated nose wedge and pad, cheek tufts; other regions untouched',
    'spec': spec, 'record': record, 'tufts': tuft_records, 'checks': checks, 'follow': follow,
    'removedFlecks': removed_flecks, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'deviationOutsideFace': {'samples': int(len(outside)), 'maximum': float(outside.max()) if len(outside) else None,
                             'p99': float(np.percentile(outside, 99)) if len(outside) else None},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')

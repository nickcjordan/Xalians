"""B-5wvn (groom pass 10): one continuous tail pattern, dark on top and white underneath along the whole tail.

Coat color only (plus an optional small length floor on the white underside strands of the thin shaft). No geometry,
binding, plume, rig or motion change.

1. Tail centerline: Catmull-Rom through the tail bone joints (tail_01 head .. tail_06 tail), refined by sculpt cross
   section centroids, so every tail vertex gets an arc position a and a local frame.
2. Side of the tail: U = -normalize(cross(x, T)) is the underside in the tail's own frame (the same 180 deg azimuth the
   pass 9 plume uses for its shaft white band). Where the tail hangs from the rump U faces the backs of the thighs;
   along the bottom of the J it faces down; in the rising part it faces away from the body, into the plume's white core.
   side = cos(angle between the vertex's radial direction and U).
3. Mask on the sculpt (vertex attribute tail_pattern): white where side > cos(half width), the half width following a
   profile along the tail (wide at the root, narrower along the shaft, widening into the plume). Plus a rump bridge:
   posterior-facing rump under the tail root, narrowing in x, joining the existing white backs of the hind thighs.
4. Skin coat_color is blended to the existing pale skin color by the mask; body coat strands take the mask at their root
   (barycentric), plus a cell noise and a per-strand jitter for a fur-broken edge, and are switched to the existing pale
   hair color and gain. Existing white is never darkened.

Usage: blender -b --python build_tailpattern_pass10.py -- --mode build|render --input IN.blend --out DIR
       --parameters tail_pattern_parameters.json [--views v1,v2] [--final 0|1] [--prefix name_]
"""
import bpy, numpy as np, json, math, sys, time, hashlib, argparse, resource
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree

ap = argparse.ArgumentParser()
ap.add_argument('--mode', default='build'); ap.add_argument('--input', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--parameters', required=True); ap.add_argument('--views', default=''); ap.add_argument('--final', type=int, default=0)
ap.add_argument('--prefix', default='')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
OUT = Path(args.out); OUT.mkdir(parents=True, exist_ok=True)
P = json.loads(Path(args.parameters).read_text())
rng = np.random.default_rng(P['seed'])


def write(n, d): (OUT / n).write_text(json.dumps(d, indent=1))
def unit(a): return a / np.maximum(np.linalg.norm(a, axis=-1, keepdims=True), 1e-12)
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a); return a.reshape(-1, n) if n > 1 else a
def setattr_(data, name, values, typ='FLOAT', domain='POINT'):
    a = data.attributes.get(name) or data.attributes.new(name, typ, domain)
    key = 'vector' if typ == 'FLOAT_VECTOR' else 'color' if typ == 'FLOAT_COLOR' else 'value'
    a.data.foreach_set(key, np.asarray(values, np.float32).ravel()); return a
def sha(a): return hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()


def catmull(pts, n):
    pts = np.asarray(pts, float); Q = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]]); out = []
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1]); return np.array(out)


def centerline(body, rig, co, tw):
    inv = body.matrix_world.inverted()
    bones = ['tail_0%d' % i for i in range(1, 7)]
    joints = [inv @ (rig.matrix_world @ rig.data.bones[b].head_local) for b in bones] + [inv @ (rig.matrix_world @ rig.data.bones['tail_06'].tail_local)]
    poly = catmull(np.array([j[:] for j in joints]), 24)
    near = co[tw > .3]; T = unit(np.gradient(poly, axis=0)); C = poly.copy()
    for i, (p, t) in enumerate(zip(poly, T)):
        rel = near - p; along = rel @ t; sel = (np.abs(along) < .003) & (np.linalg.norm(rel, axis=1) < P.get('slice_radius_m', .018))
        if sel.sum() >= 8: C[i] = near[sel].mean(0)
    C[:, 0] = 0.0  # the tail lies on the mid plane
    for _ in range(4): C[1:-1] = .5 * C[1:-1] + .25 * (C[:-2] + C[2:])
    print('CENTERLINE shift from bone line mm', np.round(np.linalg.norm(C - poly, axis=1)[::8] * 1000, 1).tolist(), flush=True)
    a = np.r_[0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    return C, unit(np.gradient(C, axis=0)), a


def tail_mask(body, rig):
    m = body.data; co = arr(m.vertices, 'co'); nrm = arr(m.vertices, 'normal')
    names = {g.index: g.name for g in body.vertex_groups}; tw = np.zeros(len(co))
    tail_ids = {i for i, n in names.items() if n.startswith('tail_')}
    for v in m.vertices:
        for g in v.groups:
            if g.group in tail_ids: tw[v.index] += g.weight
    C, T, a = centerline(body, rig, co, tw)
    kd = KDTree(len(C))
    for i, c in enumerate(C): kd.insert(c, i)
    kd.balance()
    cand = np.where((tw > .02) | ((co[:, 1] > P['bridge']['y_min']) & (co[:, 2] > P['bridge']['z'][0])))[0]
    side = np.full(len(co), -1.0); arc = np.full(len(co), -1.0)
    X = np.array([1.0, 0, 0])
    for i in cand:
        _, j, _ = kd.find(co[i]); r = co[i] - C[j]; r -= T[j] * (r @ T[j]); rn = np.linalg.norm(r)
        if rn < 1e-6: continue
        U = -np.cross(X, T[j]); U /= np.linalg.norm(U)
        side[i] = (r / rn) @ U; arc[i] = a[j]
    L = a[-1]; u = np.clip(arc / L, 0, 1)
    half = np.interp(u, P['band_u'], P['band_half_deg'])
    edge = P['band_edge']
    band = smooth(np.cos(np.radians(half)) - edge, np.cos(np.radians(half)) + edge, side) * (arc >= 0)
    tail_part = band * smooth(.05, .5, tw)
    # rump bridge: posterior-facing rump under the tail root, narrowing in |x| toward the root
    B = P['bridge']; x, y, z = co.T
    zt = smooth(B['z'][0], B['z'][0] + B['z_soft'], z) * (1 - smooth(B['z'][1] - B['z_soft'], B['z'][1], z))
    width = np.interp(z, B['width_z'], B['width_x'])
    xm = 1 - smooth(width * .75, width, np.abs(x))
    post = smooth(B['ny'][0], B['ny'][1], nrm[:, 1])
    bridge = zt * xm * post * smooth(B['y_min'], B['y_min'] + .02, y) * (1 - smooth(B.get('tw_cut', [.3, .6])[0], B.get('tw_cut', [.3, .6])[1], tw))
    M = np.clip(np.maximum(tail_part, bridge), 0, 1)
    tv = tw > .5
    for k in range(10):
        q = tv & (arc >= a[-1] * k / 10) & (arc < a[-1] * (k + 1) / 10)
        if q.sum(): print('SIDE tenth', k, int(q.sum()), np.round(np.percentile(side[q], [5, 25, 50, 75, 95]), 2).tolist(), flush=True)
    return M, dict(co=co, tw=tw, side=side, arc=arc, L=float(L), C=C, bridge=bridge, tail_part=tail_part)


def build():
    t0 = time.perf_counter(); bpy.ops.wm.open_mainfile(filepath=args.input)
    body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']; m = body.data
    co0 = arr(m.vertices, 'co'); topo0 = arr(m.loops, 'vertex_index', 1, np.int32)
    M, info = tail_mask(body, rig)
    setattr_(m, 'tail_pattern', M)
    col = arr(m.attributes['coat_color'].data, 'color', 4)
    pale_skin = np.median(col[col[:, :3].mean(1) > .6, :3], axis=0)
    w = M * (col[:, :3].mean(1) < .6)
    col[:, :3] = col[:, :3] * (1 - w[:, None]) + pale_skin * w[:, None]
    setattr_(m, 'coat_color', col, 'FLOAT_COLOR')
    # skin gain: the skin shader scales pale skin to about 0.55; white_skin_gain lifts the newly white skin to read as the coat white
    if 'skin_gain' in m.attributes:
        sg = arr(m.attributes['skin_gain'].data, 'value', 1); setattr_(m, 'skin_gain', sg * (1 - w) + P.get('white_skin_gain', 1.0) * w)
    # body coat strands
    o = bpy.data.objects['Luceras interpolated coat']; d = o.data; nc = len(d.curves); N = len(d.attributes['position'].data) // nc
    ids = np.stack([arr(d.attributes['bind_i' + s].data, 'value', 1, np.int32) for s in 'abc'], 1)
    bar = np.stack([arr(d.attributes['bind_' + s].data, 'value', 1) for s in 'abc'], 1)
    mr = (M[ids] * bar).sum(1)
    pos = arr(d.attributes['position'].data, 'vector').reshape(nc, N, 3); root = pos[:, 0]
    cell = np.floor(root / P['noise_cell_m']).astype(np.int64); hsh = (cell[:, 0] * 73856093) ^ (cell[:, 1] * 19349663) ^ (cell[:, 2] * 83492791)
    cn = (np.random.default_rng(P['seed']).random(1 << 20)[np.abs(hsh) % (1 << 20)] - .5) * 2
    jit = mr + P['noise_cell'] * cn * (mr > .02) * (mr < .98) + rng.normal(0, P['noise_strand'], nc) * (mr > .02) * (mr < .98)
    ms = smooth(.5 - P['strand_edge'], .5 + P['strand_edge'], jit) * (mr > .02)
    cc = arr(d.attributes['coat_color'].data, 'color', 4); gain = arr(d.attributes['coat_gain'].data, 'value', 1)
    pale = cc[:, :3].mean(1) > .3
    pale_hair = np.median(cc[pale, :3], axis=0); pale_gain = float(np.median(gain[pale]))
    ms = ms * (~pale)
    before = {'coat_color_sha256': sha(cc), 'coat_gain_sha256': sha(gain), 'position_sha256': sha(pos)}
    cc[:, :3] = cc[:, :3] * (1 - ms[:, None]) + pale_hair * ms[:, None]; gain = gain * (1 - ms) + pale_gain * ms
    setattr_(d, 'coat_color', cc, 'FLOAT_COLOR', 'CURVE'); setattr_(d, 'coat_gain', gain, 'FLOAT', 'CURVE'); setattr_(d, 'tail_pattern', ms, 'FLOAT', 'CURVE')
    # optional: length floor on white underside strands of the thin shaft (offsets scaled about the root)
    lengthened = 0
    LF = P.get('underside_length_floor')
    if LF:
        seglen = np.linalg.norm(np.diff(pos, axis=1), axis=2).sum(1)
        sel = (ms > .5) & (root[:, 1] > LF['y_min']) & (seglen < LF['min_m']) & (seglen > 1e-4)
        f = np.where(sel, np.clip(LF['min_m'] / np.maximum(seglen, 1e-6), 1, LF['max_scale']), 1.0)
        for k in ('bind_height', 'bind_offset_x', 'bind_offset_y'):
            v = arr(d.attributes[k].data, 'value', 1).reshape(nc, N); setattr_(d, k, v * f[:, None])
        pos = root[:, None] + (pos - root[:, None]) * f[:, None, None]; setattr_(d, 'position', pos, 'FLOAT_VECTOR'); lengthened = int(sel.sum())
    unchanged = sha(arr(m.vertices, 'co')) == sha(co0) and sha(arr(m.loops, 'vertex_index', 1, np.int32)) == sha(topo0)
    tailv = info['tw'] > .3
    stats = {'build_id': P['build_id'], 'input': args.input, 'tail_length_m': info['L'],
             'mask': {'attribute': 'tail_pattern (sculpt POINT float) and tail_pattern (coat CURVE float)', 'tail_vertices': int(tailv.sum()),
                      'tail_vertices_white_gt_half': int((M[tailv] > .5).sum()), 'bridge_vertices_gt_half': int((info['bridge'] > .5).sum()),
                      'white_fraction_by_tail_tenth': [round(float((M[tailv & (info['arc'] >= info['L'] * k / 10) & (info['arc'] < info['L'] * (k + 1) / 10)] > .5).mean()), 3) for k in range(10)]},
             'pale_skin_linear': pale_skin.tolist(), 'pale_hair_linear': pale_hair.tolist(), 'pale_gain': pale_gain,
             'coat_strands': nc, 'coat_strands_switched_white_gt_half': int((ms > .5).sum()), 'coat_strands_partial': int(((ms > .02) & (ms < .98)).sum()),
             'underside_strands_lengthened': lengthened, 'before': before, 'body_geometry_unchanged': bool(unchanged), 'seconds': time.perf_counter() - t0,
             'centerline': np.round(info['C'][::12], 4).tolist()}
    write('tail_pattern_build.json', stats)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'groom.blend'))
    print('BUILT', json.dumps({k: stats[k] for k in ('mask', 'coat_strands_switched_white_gt_half', 'underside_strands_lengthened', 'body_geometry_unchanged')}), flush=True)


# ---------------------------------------------------------------- render
def cameras():
    s = bpy.context.scene; body = bpy.data.objects['luceras_blockout']; M = body.matrix_world; cams = {}
    def cam(name, rot, scale, target):
        o = bpy.data.objects.get(name)
        if o is None:
            cd = bpy.data.cameras.new(name); o = bpy.data.objects.new(name, cd); s.collection.objects.link(o)
        o.data.type = 'ORTHO'; o.data.ortho_scale = scale; o.data.dof.use_dof = False; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
        o.location = target - (rot @ Vector((0, 0, -1))) * 6; o.data.clip_end = 30; return o
    qs = bpy.data.objects['groom_camera_side'].rotation_quaternion.copy()
    fwd = (qs @ Vector((0, 0, -1))).normalized()
    cams['plume_side'] = cam('review_plume_side', qs, .5, M @ Vector((0, .675, .48)))
    cams['tail_side'] = cam('review_tail_side', qs, P['tail_side_scale'], M @ Vector(P['tail_side_target']))
    off = (-fwd) * P['below_dir'][0] + Vector((0, P['below_dir'][1], 0)) + Vector((0, 0, P['below_dir'][2]))
    cams['tail_below'] = cam('review_tail_below', (-off.normalized()).to_track_quat('-Z', 'Y'), P['below_scale'], M @ Vector(P['below_target']))
    if 'rump_dir' in P:
        o2 = Vector(P['rump_dir']).normalized()
        cams['rump_back'] = cam('review_rump_back', (-o2).to_track_quat('-Z', 'Y'), P['rump_scale'], M @ Vector(P['rump_target']))
    return cams


def render():
    bpy.ops.wm.open_mainfile(filepath=args.input); s = bpy.context.scene; cams = cameras()
    s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
    mp = OUT / 'render_times.json'; measure = json.loads(mp.read_text()) if mp.exists() else {'build_id': P['build_id'], 'frames': []}
    final = bool(args.final); ground = bpy.data.objects.get('lookdev_ground')
    for view in [v for v in args.views.split(',') if v]:
        s.camera = cams[view] if view in cams else bpy.data.objects['groom_camera_' + view]
        w = h = 900 if final else 640
        if view in ('side', 'three_quarter'): w, h = (1374, 1145) if final else (916, 763)
        if view == 'sprite': w = h = 768
        if ground is not None: ground.hide_render = view in ('tail_below', 'rump_back')  # the camera is under the ground plane
        s.render.resolution_x = w; s.render.resolution_y = h; s.render.resolution_percentage = 100
        if view == 'sprite': s.cycles.samples = 128; s.cycles.use_denoising = False
        else: s.cycles.samples = P['samples_final'] if final else P['samples_preview']; s.cycles.use_denoising = True
        name = args.prefix + view + '.png'; s.render.filepath = str(OUT / name); t0 = time.perf_counter(); bpy.ops.render.render(write_still=True); sec = time.perf_counter() - t0
        print('RENDERED', name, round(sec, 1), flush=True)
        measure['frames'].append({'file': name, 'seconds': sec, 'width': w, 'height': h, 'samples_max': s.cycles.samples, 'denoise': s.cycles.use_denoising, 'device': 'CPU 6 threads', 'host_peak_gib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024 ** 2, 'input': args.input})
        mp.write_text(json.dumps(measure, indent=1))


if args.mode == 'build': build()
elif args.mode == 'render': render()

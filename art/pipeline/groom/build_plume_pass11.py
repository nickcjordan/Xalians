"""B-vbkd (groom pass 11, derived from build_plume_pass9.py): the plume white core becomes the same tufted hair as the dark tufts.

Pass 11 change: the 90,000 long straight white core strands are gone. The white band (same placement and width as pass 9:
center turning from 180 deg on the shaft underside to +/-90 deg on the plume sides, half width 75 deg tapering to 14 deg at
u 0.70, from y 0.48) is filled with tufts made by the same tuft generator as the dark tufts (same clump shape, waviness,
sub-clumps, length profile, frizz, thickness, points and material), colored white. Dark tufts are generated first with the
same seed and parameters, so they are identical to pass 9. The input may already carry a plume: every Plume object and the
old spine proxy are removed and rebuilt.

Pass 9 notes:

Opens a groom.blend that already carries the reapplied pass 7 groom, removes every pass 5 plume object and hides the
pass 5 plume children (plume_tone > 1.01) at evaluation, then builds the plume outward from a spine:

1. Spine. The sculpt's tail centerline (mesh slices along the tail bones) from spine_mesh_start_y to the tail tip,
   continued by a smooth curve through spine_extension_yz up to the plume tip (sheet proportions).
2. Spine proxy. A thin hidden tube mesh (luceras_plume_spine) along the spine. On the sculpt part its radius is the
   tail's own radius, so roots sit on the tail surface; beyond the sculpt it is a thin core. It carries the rig's
   vertex groups: the sculpt part copies the nearest tail vertex's weights, the extension is weighted 1.0 to tail_06,
   and an Armature modifier binds it to luceras_rig, so the spine is part of the tail chain.
3. Tufts. Pointed clumps authored per station along the spine, at fixed azimuths around it (front edge, back-lateral,
   back), angled out and tip-ward, length from a short-long-short profile. Children are generated only inside their
   own tuft. A separate white core of shorter strands lies along the spine on its inner (concave) face.
4. Every plume strand binds to a proxy triangle (barycentric root plus triangle frame offsets, the pass 5 method),
   so the plume follows the posed tail.

Usage: blender -b --python build_plume_pass8.py -- --mode build|render --input IN.blend --out DIR
       --parameters plume_parameters.json --views v1,v2 --iteration N --final 0|1 [--tag name]
"""
import bpy, numpy as np, json, math, sys, time, hashlib, argparse, resource
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ap = argparse.ArgumentParser()
ap.add_argument('--mode', default='build')
ap.add_argument('--input', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--parameters', required=True)
ap.add_argument('--views', default='')
ap.add_argument('--iteration', default='1')
ap.add_argument('--final', type=int, default=0)
ap.add_argument('--tag', default='')
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
def attr(data, name, values, typ='FLOAT', domain='POINT'):
    a = data.attributes.get(name) or data.attributes.new(name, typ, domain)
    key = 'vector' if typ == 'FLOAT_VECTOR' else 'color' if typ == 'FLOAT_COLOR' else 'value'
    a.data.foreach_set(key, np.asarray(values).ravel()); return a
def signature(o):
    m = o.data; co = arr(m.vertices, 'co'); vi = arr(m.loops, 'vertex_index', 1, np.int32)
    return {'vertices': len(m.vertices), 'co_sha256': hashlib.sha256(co.tobytes()).hexdigest(), 'topology_sha256': hashlib.sha256(vi.tobytes()).hexdigest()}


# ---------------------------------------------------------------- spine
def catmull(pts, n):
    pts = np.asarray(pts, float); P0 = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]]); out = []
    for i in range(1, len(P0) - 2):
        p0, p1, p2, p3 = P0[i - 1], P0[i], P0[i + 1], P0[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1]); return np.array(out)


def resample(line, n):
    seg = np.linalg.norm(np.diff(line, axis=0), axis=1); a = np.r_[0, np.cumsum(seg)]; s = np.linspace(0, a[-1], n)
    return np.stack([np.interp(s, a, line[:, k]) for k in range(3)], 1), s


def build_spine(body, rig):
    inv = body.matrix_world.inverted()
    joints = [inv @ (rig.matrix_world @ rig.data.bones[b].head_local) for b in ('tail_03', 'tail_04', 'tail_05', 'tail_06')]
    joints.append(inv @ (rig.matrix_world @ rig.data.bones['tail_06'].tail_local)); joints = np.array([j[:] for j in joints])
    poly = catmull(joints, 20); co = arr(body.data.vertices, 'co'); near = co[(co[:, 1] > .44) & (co[:, 2] > .2) & (np.abs(co[:, 0]) < .03)]
    T = unit(np.gradient(poly, axis=0)); centers = []; radii = []
    for p, t in zip(poly, T):
        rel = near - p; along = rel @ t; sel = (np.abs(along) < .0025) & (np.linalg.norm(rel, axis=1) < .03)
        if sel.sum() < 6: continue
        c = near[sel].mean(0); r = np.median(np.linalg.norm((near[sel] - c) - np.outer((near[sel] - c) @ t, t), axis=1))
        if c[1] < P['spine_mesh_start_y'] or r < .0028: continue
        centers.append(c); radii.append(r)
    centers = np.array(centers); radii = np.array(radii)
    keep = np.r_[True, np.diff(centers[:, 1]) > -1] ; centers = centers[keep]; radii = radii[keep]
    # light smoothing of the mesh centerline
    for _ in range(3): centers[1:-1] = .5 * centers[1:-1] + .25 * (centers[:-2] + centers[2:])
    mesh_end = len(centers)
    ext = np.array([[0, y, z] for y, z in P['spine_extension_yz']], float)
    tangent = unit(centers[-1] - centers[-4])
    lead = centers[-1] + tangent * np.linalg.norm(ext[0] - centers[-1]) * .5
    ctrl = np.vstack([centers[-1], lead, ext]); extc = catmull(ctrl, 16)[1:]
    line = np.vstack([centers, extc]); rad = np.r_[radii, np.zeros(len(extc))]
    mesh_arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))][mesh_end - 1]
    S, a = resample(line, P['spine_samples'])
    r_mesh = np.interp(a, np.r_[0, np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))][:mesh_end], radii)
    ext_u = np.clip((a - mesh_arc) / max(a[-1] - mesh_arc, 1e-6), 0, 1)
    R = np.where(a <= mesh_arc, r_mesh, P['ext_radius'][0] + (P['ext_radius'][1] - P['ext_radius'][0]) * ext_u)
    # keep the extension radius continuous with the tail tip
    R = np.where(a <= mesh_arc, R, np.minimum(R, r_mesh[a <= mesh_arc][-1]))
    for _ in range(4): S[1:-1] = np.where((a[1:-1] > mesh_arc)[:, None], .5 * S[1:-1] + .25 * (S[:-2] + S[2:]), S[1:-1])
    T = unit(np.gradient(S, axis=0)); X = np.tile([1., 0, 0], (len(S), 1)); X = unit(X - T * (X * T).sum(1)[:, None]); F = unit(np.cross(X, T))
    return dict(S=S, T=T, X=X, F=F, R=R, a=a, mesh_arc=float(mesh_arc), mesh_end_point=centers[-1].tolist(), length=float(a[-1]))


def spine_proxy(body, rig, sp):
    K = 10; S, X, F, R = sp['S'], sp['X'], sp['F'], sp['R']; n = len(S)
    ang = np.linspace(0, 2 * np.pi, K, endpoint=False)
    verts = (S[:, None, :] + R[:, None, None] * (np.cos(ang)[None, :, None] * F[:, None, :] + np.sin(ang)[None, :, None] * X[:, None, :])).reshape(-1, 3)
    verts = np.vstack([verts, S[-1] + sp['T'][-1] * .001])
    tris = []
    for i in range(n - 1):
        for k in range(K):
            a, b, c, d = i * K + k, i * K + (k + 1) % K, (i + 1) * K + (k + 1) % K, (i + 1) * K + k
            tris += [(a, b, c), (a, c, d)]
    tip = len(verts) - 1
    for k in range(K): tris.append(((n - 1) * K + k, (n - 1) * K + (k + 1) % K, tip))
    me = bpy.data.meshes.new('luceras_plume_spine'); me.from_pydata(verts.tolist(), [], tris); me.update()
    o = bpy.data.objects.new('luceras_plume_spine', me); bpy.context.scene.collection.objects.link(o)
    o.parent = body.parent; o.parent_type = 'OBJECT'; o.matrix_parent_inverse = body.matrix_parent_inverse.copy(); o.matrix_world = body.matrix_world.copy()
    o.hide_render = True; o.display_type = 'WIRE'
    # weights: sculpt part copies the nearest tail vertex, extension is weighted to the last tail bone
    co = arr(body.data.vertices, 'co'); kd = KDTree(len(co))
    for i, c in enumerate(co): kd.insert(c, i)
    kd.balance(); groups = {g.index: g.name for g in body.vertex_groups}; vg = {}
    on_mesh = np.repeat(sp['a'] <= sp['mesh_arc'], K).tolist() + [False]
    blend = np.repeat(smooth(sp['mesh_arc'] - .015, sp['mesh_arc'], sp['a']), K).tolist() + [1.0]
    ext_u = np.clip((sp['a'] - sp['mesh_arc']) / max(sp['a'][-1] - sp['mesh_arc'], 1e-6), 0, 1)
    share05 = (np.repeat(P.get('ext_tail05_share', 0.0) * smooth(0, 1, ext_u), K).tolist() + [P.get('ext_tail05_share', 0.0)])
    for i, v in enumerate(verts):
        _, j, _ = kd.find(v); w = {groups[g.group]: g.weight for g in body.data.vertices[j].groups if g.weight > 1e-4 and groups[g.group].startswith(('tail_', 'spine_'))}
        tot = sum(w.values()) or 1.0; w = {k: x / tot * (1 - blend[i]) for k, x in w.items()}
        w['tail_06'] = w.get('tail_06', 0) + blend[i] * (1 - share05[i]); w['tail_05'] = w.get('tail_05', 0) + blend[i] * share05[i]
        for k, x in w.items():
            if x <= 0: continue
            if k not in vg: vg[k] = o.vertex_groups.new(name=k)
            vg[k].add([i], float(x), 'REPLACE')
    am = next((m for m in body.modifiers if m.type == 'ARMATURE'), None)
    mod = o.modifiers.new('Tail chain', 'ARMATURE'); mod.object = rig
    if am is not None: mod.use_deform_preserve_volume = am.use_deform_preserve_volume
    o['role'] = 'Hidden plume spine proxy: surface for every plume strand; sculpt part weighted like the tail, extension weighted to tail_06 blending toward tail_05 along its length (ext_tail05_share)'
    return o, np.array(verts), np.array(tris, np.int32)


def bind_tree(surface):
    t = bpy.data.node_groups.new('Plume spine frame deformation', 'GeometryNodeTree')
    t.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); t.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    ns = t.nodes; lk = t.links
    def named(name, typ='FLOAT'):
        n = ns.new('GeometryNodeInputNamedAttribute'); n.data_type = typ; n.inputs['Name'].default_value = name; return n.outputs['Attribute']
    def vm(op, a, b=None):
        n = ns.new('ShaderNodeVectorMath'); n.operation = op; lk.new(a, n.inputs[0])
        if b is not None: lk.new(b, n.inputs['Scale'] if op == 'SCALE' else n.inputs[1])
        return n.outputs['Vector']
    info = ns.new('GeometryNodeObjectInfo'); info.transform_space = 'ORIGINAL'; info.inputs['Object'].default_value = surface
    pos = ns.new('GeometryNodeInputPosition'); v = []
    for s in 'abc':
        smp = ns.new('GeometryNodeSampleIndex'); smp.data_type = 'FLOAT_VECTOR'; smp.domain = 'POINT'
        lk.new(info.outputs['Geometry'], smp.inputs['Geometry']); lk.new(pos.outputs['Position'], smp.inputs['Value']); lk.new(named('bind_i' + s, 'INT'), smp.inputs['Index']); v.append(smp.outputs['Value'])
    normal = vm('NORMALIZE', vm('CROSS_PRODUCT', vm('SUBTRACT', v[1], v[0]), vm('SUBTRACT', v[2], v[0])))
    tangent = vm('NORMALIZE', vm('SUBTRACT', v[1], v[0])); bit = vm('CROSS_PRODUCT', normal, tangent)
    tot = vm('ADD', vm('ADD', vm('SCALE', v[0], named('bind_a')), vm('SCALE', v[1], named('bind_b'))), vm('SCALE', v[2], named('bind_c')))
    tot = vm('ADD', tot, vm('SCALE', normal, named('bind_height'))); tot = vm('ADD', tot, vm('SCALE', tangent, named('bind_offset_x'))); tot = vm('ADD', tot, vm('SCALE', bit, named('bind_offset_y')))
    gi = ns.new('NodeGroupInput'); go = ns.new('NodeGroupOutput'); sp = ns.new('GeometryNodeSetPosition')
    lk.new(gi.outputs['Geometry'], sp.inputs['Geometry']); lk.new(tot, sp.inputs['Position']); lk.new(sp.outputs['Geometry'], go.inputs['Geometry']); return t


def make_curves(name, coords, tri_idx, vco, tris, body, surface, tree, mat, radius, extra):
    count, pts, _ = coords.shape; d = bpy.data.hair_curves.new(name); d.add_curves([pts] * count)
    d.attributes['position'].data.foreach_set('vector', coords.astype(np.float32).ravel())
    o = bpy.data.objects.new(name, d); bpy.context.scene.collection.objects.link(o)
    o.parent = body; o.matrix_parent_inverse = body.matrix_world.inverted(); o.matrix_world = body.matrix_world.copy(); d.surface = surface
    d.materials.append(mat)
    ids = tris[tri_idx]; tri = vco[ids]; a = tri[:, 0]; e = tri[:, 1] - a; f = tri[:, 2] - a
    normal = unit(np.cross(e, f)); tangent = unit(e); bit = np.cross(normal, tangent); rootrel = coords[:, 0] - a; rel = coords - coords[:, 0:1]
    d00 = (e * e).sum(1); d01 = (e * f).sum(1); d11 = (f * f).sum(1); den = np.maximum(d00 * d11 - d01 * d01, 1e-24)
    de = (rootrel * e).sum(1); df = (rootrel * f).sum(1); bb = (d11 * de - d01 * df) / den; cc = (d00 * df - d01 * de) / den
    for j, s in enumerate('abc'): attr(d, 'bind_i' + s, ids[:, j], 'INT', 'CURVE')
    for s, val in (('a', 1 - bb - cc), ('b', bb), ('c', cc)): attr(d, 'bind_' + s, val, 'FLOAT', 'CURVE')
    for s, val in (('height', (rel * normal[:, None, :]).sum(2)), ('offset_x', (rel * tangent[:, None, :]).sum(2)), ('offset_y', (rel * bit[:, None, :]).sum(2))): attr(d, 'bind_' + s, val.ravel())
    r = (np.linspace(1, .12, pts) ** .9)
    attr(d, 'radius', (radius[:, None] * r[None, :]).ravel())
    for k, (typ, val) in extra.items(): attr(d, k, val, typ, 'CURVE')
    mod = o.modifiers.new('Follow plume spine', 'NODES'); mod.node_group = tree
    return o


def plume_material(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; ns = m.node_tree.nodes; lk = m.node_tree.links; ns.clear()
    out = ns.new('ShaderNodeOutputMaterial'); h = ns.new('ShaderNodeBsdfHairPrincipled'); h.model = 'CHIANG'; h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = P.get('hair_roughness', .5); h.inputs['Radial Roughness'].default_value = .5; h.inputs['Coat'].default_value = 0.0; h.inputs['IOR'].default_value = P.get('hair_ior', 1.55)
    col = ns.new('ShaderNodeAttribute'); col.attribute_name = 'plume_color'; tone = ns.new('ShaderNodeAttribute'); tone.attribute_name = 'detail_tone'
    info = ns.new('ShaderNodeHairInfo'); mr = ns.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = P['tip_light']
    lk.new(info.outputs['Intercept'], mr.inputs['Value'])
    m1 = ns.new('ShaderNodeVectorMath'); m1.operation = 'SCALE'; lk.new(col.outputs['Color'], m1.inputs[0]); lk.new(mr.outputs['Result'], m1.inputs['Scale'])
    m2 = ns.new('ShaderNodeVectorMath'); m2.operation = 'SCALE'; lk.new(m1.outputs['Vector'], m2.inputs[0]); lk.new(tone.outputs['Fac'], m2.inputs['Scale'])
    wr = ns.new('ShaderNodeAttribute'); wr.attribute_name = 'white_root'; fade = ns.new('ShaderNodeMapRange'); fade.interpolation_type = 'SMOOTHSTEP'
    fade.inputs['From Min'].default_value = P.get('white_root_fade', [.3, .6])[0]; fade.inputs['From Max'].default_value = P.get('white_root_fade', [.3, .6])[1]; fade.inputs['To Min'].default_value = 1; fade.inputs['To Max'].default_value = 0
    lk.new(info.outputs['Intercept'], fade.inputs['Value']); fm = ns.new('ShaderNodeMath'); fm.operation = 'MULTIPLY'; lk.new(fade.outputs['Result'], fm.inputs[0]); lk.new(wr.outputs['Fac'], fm.inputs[1])
    mix = ns.new('ShaderNodeMixRGB'); lk.new(fm.outputs[0], mix.inputs[0]); lk.new(m2.outputs['Vector'], mix.inputs[1]); mix.inputs[2].default_value = (*P['white_linear'], 1)
    lk.new(mix.outputs[0], h.inputs['Color']); lk.new(h.outputs[0], out.inputs[0]); return m


# ---------------------------------------------------------------- tufts
def frame_at(sp, a):
    i = np.clip(np.searchsorted(sp['a'], a), 1, len(sp['a']) - 1); w = (a - sp['a'][i - 1]) / max(sp['a'][i] - sp['a'][i - 1], 1e-9)
    g = lambda k: (1 - w) * sp[k][i - 1] + w * sp[k][i]
    return g('S'), unit(g('T')), unit(g('X')), unit(g('F')), float(g('R'))


def bump(u):
    return np.sin(np.pi * np.clip(u, 0, 1) ** P['profile_power'])


def author_tufts(sp, vco, tris, bvh):
    a0 = sp['a'][np.argmin(np.abs(sp['S'][:, 1] - P['plume_start_y']) + (sp['S'][:, 2] < .26) * 9)]
    A = sp['length']; N = P['tuft_points']; t = np.linspace(0, 1, N)
    stations = np.linspace(0, 1, P['stations'] + 1)[:-1] + .5 / P['stations'] * 0
    coords_all = []; tri_all = []; wroot = []; tuft_id = []; tone = []; records = []; lengths_all = []; white = []
    def tuft(root, d0, dtip, L, width, tid, u, phi, n, phi_base=0, is_white=False):
        # center line: direction blends from d0 to dtip along the tuft
        dirs = unit(d0[None] * (1 - smooth(0, 1, t))[:, None] + dtip[None] * smooth(0, 1, t)[:, None])
        seg = np.vstack([np.zeros(3), np.cumsum(dirs[:-1] * (L / (N - 1)), 0)]); center = root + seg
        b1 = unit(np.cross(d0, [0, 0, 1.0]) if abs(d0[2]) < .95 else np.cross(d0, [0, 1.0, 0])); b2 = np.cross(d0, b1)
        # flame tongue: the center line waves and curls (two phase-shifted sines across the tuft)
        wa = P.get('tuft_wave', 0.0) * L * rng.uniform(.6, 1.4); fq = rng.uniform(.8, 1.6); ph0 = rng.uniform(0, 2 * np.pi); curl = P.get('tuft_curl', 0.0) * rng.choice([-1, 1])
        center = center + (np.sin(2 * np.pi * fq * t + ph0)[:, None] * b1[None] + curl * np.sin(2 * np.pi * fq * t + ph0 + np.pi / 2)[:, None] * b2[None]) * (wa * t)[:, None]
        width = width * rng.uniform(*P.get('tuft_width_jitter', [1, 1]))
        # sub-clumps: each child belongs to one sub-clump that forks off and ends at its own point
        ns_ = int(rng.integers(P.get('subclumps', [1, 1])[0], P.get('subclumps', [1, 1])[1] + 1)); sub = rng.integers(0, ns_, n); sub[0] = 0
        sa = rng.uniform(0, 2 * np.pi, ns_); sr = np.r_[0, rng.uniform(.25, .5, ns_ - 1)] * width; sv = np.r_[1, rng.uniform(.62, .92, ns_ - 1)]
        soff = (np.cos(sa)[:, None] * b1 + np.sin(sa)[:, None] * b2) * sr[:, None]
        ang = rng.uniform(0, 2 * np.pi, n); rad = np.sqrt(rng.random(n)); off = (np.cos(ang)[:, None] * b1 + np.sin(ang)[:, None] * b2) * (rad * width * P.get('subclump_spread', 1.0))[:, None]
        v = np.clip(sv[sub] * (1 - .30 * rad ** 1.6) + rng.normal(0, .04, n), .4, 1.0); v[0] = 1.0
        tt = t[None, :] * v[:, None]; idx = tt * (N - 1); l = np.minimum(idx.astype(int), N - 2); fr = idx - l
        c = center[l] * (1 - fr[..., None]) + center[l + 1] * fr[..., None]
        env = (1 - tt / np.maximum(v[:, None], 1e-3)) ** 1.1 * (1 + .55 * np.sin(np.pi * np.minimum(tt / .5, 1)))
        fork = smooth(0, .55, tt)[..., None] * (1 + .4 * tt[..., None])
        c = c + off[:, None, :] * env[..., None] + soff[sub][:, None, :] * fork
        jit = rng.normal(0, 1, (n, 1, 3)) * min(.0012, L * .012) * np.sin(np.pi * t)[None, :, None]
        wave = np.sin(tt * 14 + rng.uniform(0, 6.3, (n, 1)))[..., None] * (b1 * .5 + b2 * .5)[None, None] * min(.0009, L * .01)
        c = c + jit + wave
        # bind each child root to the nearest proxy triangle (projected onto the tube)
        tri = []
        for k in range(n):
            q, _, ti, _ = bvh.find_nearest(Vector(c[k, 0])); tri.append(ti)
            shift = np.array(q[:]) - c[k, 0]; c[k] += shift * (1 - smooth(0, .25, t))[:, None]
        wroot.append(np.full(n, P.get('white_root_by_azimuth', {}).get(str(abs(int(round(phi_base)))), 0.0) * float(np.interp(u, P.get('white_root_u', [0, 1]), P.get('white_root_ramp', [1, 1]))) if u < 1 else 0.0))
        white.append(np.full(n, is_white)); coords_all.append(c); tri_all.extend(tri); tuft_id.append(np.full(n, tid)); tone.append(np.full(n, rng.uniform(.8, 1.2)) * rng.uniform(.9, 1.1, n)); lengths_all.append(np.full(n, L))
        records.append({'tuft': tid, 'u': round(float(u), 4), 'azimuth_deg': phi, 'length_m': round(float(L), 4), 'width_m': round(float(width), 4), 'children': int(n), 'white': bool(is_white), 'root': np.round(root, 4).tolist(), 'tip': np.round(center[-1], 4).tolist()})
    tid = 0
    for si, u in enumerate(stations):
        a = a0 + u * (A - a0); S, T, X, F, R = frame_at(sp, a)
        fl = np.interp(u, [0, 1], P['length_floor']) if isinstance(P['length_floor'], list) else P['length_floor']; prof = fl + (1 - fl) * bump(u)
        out = math.radians(np.interp(u, P.get('out_angle_u', [0, .5, 1]), P['out_angle_deg']))
        stag = P['azimuth_stagger'] * (1 if si % 2 else -1)
        for phi in P['tuft_azimuths'] + (P.get('crest_azimuths', []) if u >= P.get('crest_u', 2) else []):
            ph = phi + stag + rng.uniform(-6, 6); pr = math.radians(ph)
            radial = math.cos(pr) * F + math.sin(pr) * X
            L = P['length_max'] * prof * P['azimuth_length'][str(abs(phi))] * rng.uniform(.9, 1.08)
            if phi in P.get('crest_azimuths', []): L *= smooth(P['crest_u'], P['crest_u'] + .12, u) * .6 + .4
            if abs(phi) < 90: L *= np.interp(u, P.get('front_ramp_u', [0, 1]), P.get('front_ramp', [1, 1]))
            if u < .02: L *= .8
            o_ = min(out * (P.get('front_out_scale', 1.0) if abs(phi) < 90 else 1.0), math.radians(80))
            d0 = unit(math.cos(o_) * T + math.sin(o_) * radial); outt = o_ * (1 - P['tip_bend'])
            # tip direction uses the spine tangent further up the plume, so the tuft sweeps tip-ward
            _, T2, _, _, _ = frame_at(sp, min(a + L * .8, A)); dtip = unit(math.cos(outt) * T2 + math.sin(outt) * radial)
            width = np.clip(P['tuft_width'][2] * L, P['tuft_width'][0], P['tuft_width'][1])
            n = max(40, int(P['tuft_children'] * (L / P['length_max']) ** .6))
            root = S + radial * R * .85
            tuft(root, d0, dtip, L, width, tid, u, ph, n, phi); tid += 1
    S, T, X, F, R = frame_at(sp, A - .004)
    for L, tilt in P['tip_tufts']:
        tr = math.radians(tilt); d = unit(math.cos(tr) * T + math.sin(tr) * F)
        tuft(S, d, d, L, np.clip(P['tuft_width'][2] * L, P['tuft_width'][0], P['tuft_width'][1]) * .8, tid, 1.0, tilt, int(P['tuft_children'] * .7)); tid += 1
    # white band: the same tufts, authored along the spine on the pass 9 white band and colored white
    WT = P['white_tufts']; aw = sp['a'][np.argmin(np.abs(sp['S'][:, 1] - P['white_start_y']) + (sp['S'][:, 2] < .25) * 9)]
    aend = a0 + P['white_end_u'] * (A - a0); wst = np.linspace(aw, aend, WT['stations'])
    wc_, wh_ = P['white_band']['center'], P['white_band']['half']
    for si, a in enumerate(wst):
        S, T, X, F, R = frame_at(sp, a); u = (a - a0) / (A - a0); uc = max(u, 0.0)
        cen = float(np.interp(a, [a0 + P['white_band']['turn'][0], a0 + P['white_band']['turn'][1]], wc_)); half = float(np.interp(uc, P['white_band']['taper_u'], wh_))
        fl = np.interp(uc, [0, 1], P['length_floor']); prof = fl + (1 - fl) * bump(uc)
        shaft = a < a0
        offs = WT['shaft_offsets'] if shaft else WT['offsets']
        stag = WT['stagger'] * (1 if si % 2 else -1)
        az = sorted({round((sg * (cen + o * half) + 180) % 360 - 180, 1) for o in offs for sg in (1, -1)})
        for phi in az:
            ph = phi + stag * (half / 75) + rng.uniform(-4, 4); pr = math.radians(ph); radial = math.cos(pr) * F + math.sin(pr) * X
            if shaft:
                L = np.interp(a, [aw, a0], P['white_shaft_length']) * rng.uniform(.9, 1.1); o_ = math.radians(P['white_shaft_out_deg'])
            else:
                L = P['length_max'] * prof * WT['length'] * rng.uniform(.9, 1.08) * (1 - WT['end_taper'] * smooth(.5, 1, u / P['white_end_u']))
                o_ = math.radians(np.interp(u, P.get('out_angle_u', [0, .5, 1]), P['out_angle_deg'])) * WT['out_scale']
            d0 = unit(math.cos(o_) * T + math.sin(o_) * radial); outt = o_ * (1 - P['tip_bend'])
            _, T2, _, _, _ = frame_at(sp, min(a + L * .8, A)); dtip = unit(math.cos(outt) * T2 + math.sin(outt) * radial)
            width = np.clip(P['tuft_width'][2] * L, P['tuft_width'][0], P['tuft_width'][1])
            n = max(WT['min_children'], int(P['tuft_children'] * (L / P['length_max']) ** .6))
            tuft(S + radial * R * .85, d0, dtip, L, width, tid, u, ph, n, 0, True); tid += 1
    author_tufts.wroot = np.concatenate(wroot); author_tufts.white = np.concatenate(white)
    return np.concatenate(coords_all), np.array(tri_all), np.concatenate(tuft_id), np.concatenate(tone), records, a0


def author_white(sp, vco, tris, bvh, a0):
    N = P['tuft_points']; t = np.linspace(0, 1, N); n = P['white_children']; lock = P['white_lock']; groups = n // lock
    aw = sp['a'][np.argmin(np.abs(sp['S'][:, 1] - P['white_start_y']) + (sp['S'][:, 2] < .25) * 9)]
    A = sp['length']; aend = a0 + P['white_end_u'] * (A - a0)
    ga = np.sort(rng.uniform(aw, aend, groups)); gu = (ga - a0) / (A - a0)
    wc_, wh_ = P['white_band']['center'], P['white_band']['half']
    cen = np.interp(ga, [a0 + P['white_band']['turn'][0], a0 + P['white_band']['turn'][1]], wc_); half = np.interp(gu, P['white_band']['taper_u'], wh_)
    gphi = rng.choice([-1, 1], groups) * (cen + rng.uniform(-1, 1, groups) * half)
    coords = np.zeros((groups * lock, N, 3)); tri = np.zeros(groups * lock, int); tone = np.zeros(groups * lock)
    for g in range(groups):
        a = ga[g]; S, T, X, F, R = frame_at(sp, a); u = np.clip((a - a0) / (A - a0), 0, 1)
        lu = P['white_length'][0] + (P['white_length'][1] - P['white_length'][0]) * smooth(0, .3, u) * (1 - .6 * smooth(.55, 1, u / P['white_end_u']))
        if a < a0: lu = P['white_shaft_length'][0] + (P['white_shaft_length'][1] - P['white_shaft_length'][0]) * smooth(aw, a0, a)
        pr = math.radians(gphi[g]); radial = math.cos(pr) * F + math.sin(pr) * X; out = math.radians(P['white_out_deg'] if a >= a0 else P.get('white_shaft_out_deg', 30))
        d = unit(math.cos(out) * T + math.sin(out) * radial); dt = unit(math.cos(out * .45) * T + math.sin(out * .45) * radial)
        dirs = unit(d[None] * (1 - t)[:, None] + dt[None] * t[:, None]); center = S + radial * R * .9 + np.vstack([np.zeros(3), np.cumsum(dirs[:-1] * (lu / (N - 1)), 0)])
        b2 = np.cross(d, radial);
        for k in range(lock):
            i = g * lock + k; aoff = rng.normal(0, .0016); poff = rng.normal(0, .06)
            v = np.clip(1 - abs(rng.normal(0, .18)), .5, 1)
            c = center + T * aoff + b2 * poff * R * 4 * (1 - t)[:, None] ** 1.3
            c = c[0] + (c - c[0]) * v
            c += rng.normal(0, 1, 3) * .0006 * np.sin(np.pi * t)[:, None]
            q, _, ti, _ = bvh.find_nearest(Vector(c[0])); c += (np.array(q[:]) - c[0]) * (1 - smooth(0, .25, t))[:, None]
            coords[i] = c; tri[i] = ti; tone[i] = rng.uniform(.88, 1.06)
    return coords, tri, tone


def hide_old_plume(body):
    removed = []
    for o in list(bpy.data.objects):
        if o.name.startswith('Plume ') or o.name.startswith('luceras_plume_spine'):
            removed.append(o.name); bpy.data.objects.remove(o)
    t = bpy.data.node_groups.new('Hide pass 5 plume children', 'GeometryNodeTree')
    t.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); t.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    ns = t.nodes; lk = t.links; gi = ns.new('NodeGroupInput'); go = ns.new('NodeGroupOutput'); dl = ns.new('GeometryNodeDeleteGeometry'); dl.domain = 'CURVE'
    na = ns.new('GeometryNodeInputNamedAttribute'); na.data_type = 'FLOAT'; na.inputs['Name'].default_value = 'plume_tone'
    cmp = ns.new('FunctionNodeCompare'); cmp.data_type = 'FLOAT'; cmp.operation = 'GREATER_THAN'; cmp.inputs[1].default_value = 1.01
    lk.new(na.outputs['Attribute'], cmp.inputs[0]); lk.new(gi.outputs['Geometry'], dl.inputs['Geometry']); lk.new(cmp.outputs['Result'], dl.inputs['Selection']); lk.new(dl.outputs['Geometry'], go.inputs['Geometry'])
    hidden = []
    for o in bpy.data.objects:
        if o.type == 'CURVES' and 'plume_tone' in o.data.attributes and not any(m.name.startswith('Hide pass 5 plume') for m in o.modifiers):
            m = o.modifiers.new('Hide pass 5 plume', 'NODES'); m.node_group = t
            vals = arr(o.data.attributes['plume_tone'].data, 'value', 1); hidden.append({'object': o.name, 'plume_curves_hidden': int((vals > 1.01).sum())})
    return removed, hidden


def build():
    t0 = time.perf_counter(); bpy.ops.wm.open_mainfile(filepath=args.input)
    body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']; before = signature(body)
    removed, hidden = hide_old_plume(body)
    sp = build_spine(body, rig); proxy, vco, tris = spine_proxy(body, rig, sp)
    bvh = BVHTree.FromPolygons(vco.tolist(), tris.tolist(), all_triangles=True); tree = bind_tree(proxy)
    coords, tri, tid, tone, records, a0 = author_tufts(sp, vco, tris, bvh)
    mat = plume_material('Plume tufts'); wm = author_tufts.white; wr = author_tufts.wroot
    col = np.where(wm[:, None], np.array(P['white_linear'])[None], np.array(P['dark_linear'])[None])
    objs = {}
    for name, sel in (('Plume tufts dark', ~wm), ('Plume tufts white', wm)):
        k = int(sel.sum())
        objs[name] = make_curves(name, coords[sel], tri[sel], vco, tris, body, proxy, tree, mat, np.full(k, P['tuft_radius']),
                                 {'tuft_id': ('INT', tid[sel]), 'detail_tone': ('FLOAT', tone[sel]), 'white_root': ('FLOAT', wr[sel]), 'plume_color': ('FLOAT_COLOR', np.c_[col[sel], np.ones(k)])})
    n = int((~wm).sum()); m = int(wm.sum()); wc = coords[wm]
    sc = bpy.data.objects.new('Plume spine curve', bpy.data.hair_curves.new('Plume spine curve')); sc.data.add_curves([len(sp['S'])]); sc.data.attributes['position'].data.foreach_set('vector', sp['S'].astype(np.float32).ravel())
    bpy.context.scene.collection.objects.link(sc); sc.parent = body; sc.matrix_parent_inverse = body.matrix_world.inverted(); sc.matrix_world = body.matrix_world.copy(); sc.hide_render = True
    # bind the reference spine curve to the proxy too, so it follows the rig
    sc_tri = np.array([bvh.find_nearest(Vector(sp['S'][0]))[2]]); sc.data.surface = proxy
    ids = tris[sc_tri]; a = vco[ids[:, 0]]; e = vco[ids[:, 1]] - a; f = vco[ids[:, 2]] - a; nrm = unit(np.cross(e, f)); tg = unit(e); bt = np.cross(nrm, tg)
    rel = sp['S'][None] - sp['S'][0]
    for j, s in enumerate('abc'): attr(sc.data, 'bind_i' + s, ids[:, j], 'INT', 'CURVE')
    # spine root lies on the tube axis: express its root by barycentric of the nearest triangle plus a normal height
    q = np.array(bvh.find_nearest(Vector(sp['S'][0]))[0][:]); d00 = (e * e).sum(1); d01 = (e * f).sum(1); d11 = (f * f).sum(1); den = d00 * d11 - d01 * d01
    rr = q - a; bb = (d11 * (rr * e).sum(1) - d01 * (rr * f).sum(1)) / den; cc = (d00 * (rr * f).sum(1) - d01 * (rr * e).sum(1)) / den
    for s, val in (('a', 1 - bb - cc), ('b', bb), ('c', cc)): attr(sc.data, 'bind_' + s, val, 'FLOAT', 'CURVE')
    rel = sp['S'][None] - q
    for s, val in (('height', (rel * nrm[:, None, :]).sum(2)), ('offset_x', (rel * tg[:, None, :]).sum(2)), ('offset_y', (rel * bt[:, None, :]).sum(2))): attr(sc.data, 'bind_' + s, val.ravel())
    mm = sc.modifiers.new('Follow plume spine', 'NODES'); mm.node_group = tree
    after = signature(body)
    stats = {'build_id': P['build_id'], 'removed_pass5_plume_objects': removed, 'hidden_pass5_plume_children': hidden,
             'spine': {'samples': len(sp['S']), 'length_m': sp['length'], 'on_sculpt_m': sp['mesh_arc'], 'extension_m': sp['length'] - sp['mesh_arc'], 'mesh_end_point': sp['mesh_end_point'], 'tip': sp['S'][-1].round(4).tolist(), 'plume_start_arc_m': float(a0)},
             'tufts': len(records), 'white_tufts': int(sum(r['white'] for r in records)), 'dark_strands': int(n), 'white_tuft_strands': int(m), 'white_core_strands': 0, 'points_per_strand': P['tuft_points'],
             'proxy': {'vertices': len(vco), 'triangles': len(tris), 'vertex_groups': [g.name for g in proxy.vertex_groups], 'armature': rig.name},
             'body_unchanged': before == after, 'seconds': time.perf_counter() - t0,
             'checks': {'nonfinite': int((~np.isfinite(coords)).sum()), 'left_dark': int((coords[~wm][:, 0, 0] > 0).sum()), 'right_dark': int((coords[~wm][:, 0, 0] < 0).sum()),
                        'left_white': int((wc[:, 0, 0] > 0).sum()), 'right_white': int((wc[:, 0, 0] < 0).sum()), 'min_z_m': float(coords[..., 2].min()),
                        'plume_top_z_m': float(coords[..., 2].max()), 'plume_y_extent_m': [float(coords[..., 1].min()), float(coords[..., 1].max())], 'plume_x_extent_m': [float(coords[..., 0].min()), float(coords[..., 0].max())]}}
    write('plume_build.json', stats); write('plume_tufts.json', {'method': 'One center line per tuft from its station on the spine; children generated only inside their own tuft', 'tufts': records})
    np.savez(OUT / 'plume_spine.npz', S=sp['S'], T=sp['T'], F=sp['F'], X=sp['X'], R=sp['R'], a=sp['a'])
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'groom.blend'))
    print('BUILT', json.dumps({k: stats[k] for k in ('tufts', 'white_tufts', 'dark_strands', 'white_tuft_strands', 'spine', 'checks')}), flush=True)


# ---------------------------------------------------------------- render
def review_cameras():
    s = bpy.context.scene; body = bpy.data.objects['luceras_blockout']; M = body.matrix_world
    C = M @ Vector((0, .675, .48)); cams = {}
    def cam(name, rot, scale, target=C):
        o = bpy.data.objects.get(name)
        if o is None:
            cd = bpy.data.cameras.new(name); o = bpy.data.objects.new(name, cd); s.collection.objects.link(o)
        o.data.type = 'ORTHO'; o.data.ortho_scale = scale; o.data.dof.use_dof = False; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
        o.location = target - (rot @ Vector((0, 0, -1))) * 6; o.data.clip_end = 30; return o
    q = lambda name: bpy.data.objects[name].rotation_quaternion.copy()
    cams['plume_side'] = cam('review_plume_side', q('groom_camera_side'), .5)
    cams['plume_threeq'] = cam('review_plume_threeq', q('groom_camera_three_quarter'), .5)
    cams['plume_front'] = cam('review_plume_front', q('groom_camera_front'), .5)
    cams['plume_back'] = cam('review_plume_back', Vector((0, -1, 0)).to_track_quat('-Z', 'Y'), .5)
    top = Matrix(((-1, 0, 0), (0, -1, 0), (0, 0, 1))).to_quaternion()  # looking down -z, image up = -y (head up)
    cams['plume_top'] = cam('review_plume_top', top, .4, M @ Vector((0, .67, .5)))
    cams['neck'] = cam('review_neck', q('groom_camera_three_quarter'), .26, M @ Vector((0, -.15, .49)))
    return cams


def render():
    bpy.ops.wm.open_mainfile(filepath=args.input); s = bpy.context.scene; cams = review_cameras()
    s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
    mp = OUT / 'render_times.json'; measure = json.loads(mp.read_text()) if mp.exists() else {'build_id': P['build_id'], 'frames': []}
    final = bool(args.final); prefix = args.tag or (('render_' if final else 'iter' + args.iteration + '_'))
    for view in [v for v in args.views.split(',') if v]:
        if view in cams: s.camera = cams[view]; w = h = (900 if final else 640)
        else: s.camera = bpy.data.objects['groom_camera_' + view]; w = h = 900
        if view in ('side', 'three_quarter'): w, h = (1374, 1145) if final else (916, 763)
        if view == 'front': w, h = (1374, 1145) if final else (916, 763)
        if view == 'sprite': w = h = 768
        s.render.resolution_x = w; s.render.resolution_y = h; s.render.resolution_percentage = 100
        if view == 'sprite': s.cycles.samples = 128; s.cycles.use_denoising = False
        else: s.cycles.samples = P['samples_final'] if final else P['samples_preview']; s.cycles.use_denoising = True
        name = prefix + view + '.png'; s.render.filepath = str(OUT / name); t0 = time.perf_counter(); bpy.ops.render.render(write_still=True); sec = time.perf_counter() - t0
        print('RENDERED', name, round(sec, 1), flush=True)
        measure['frames'].append({'file': name, 'seconds': sec, 'width': w, 'height': h, 'samples_max': s.cycles.samples, 'denoise': s.cycles.use_denoising, 'device': 'CPU 6 threads', 'host_peak_gib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024 ** 2, 'input': args.input})
        mp.write_text(json.dumps(measure, indent=1))


if args.mode == 'build': build()
elif args.mode == 'render': render()

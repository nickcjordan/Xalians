"""B-j5p6 pass 7: paw groom adapted to the welded skeleton-first paws (B-yqgg pass 3 sculpt), on top of the pass 5 groom.
Derived from pass 6 build_paws.py (B-svtw). Toe lengths, length taper and lift follow the new knuckle domes, dip and toe curl.

Input: a groom.blend produced by pass5 build_groom.py (see REAPPLY.md).
Changes, all limited to the lowest leg (z < max_root_height):
  * hides the pass 5 toe strands (paw_mask == 1) with a Delete Geometry node after the surface-follow modifier,
  * extends the lower-leg coat color down over the paw skin and darkens the grooves between toes,
  * rebuilds toe_break on the paw from the claw-derived toe axes (shader-only crease, no mesh change),
  * adds dense surface-bound paw strands: combed along each toe toward its claw, parted at the grooves,
    tapering 5 mm at the toes to a longer fringe at the back of wrist and hock.
Mesh positions and topology are never changed. Toe axes come from the claw objects, so the same script
works on any identically topologized sculpt with claws placed at the toe tips.
"""
import bpy, numpy as np, json, math, sys, time, hashlib, argparse, resource
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--mode', default='build')
ap.add_argument('--views', default='paws_front,hind_three_quarter,fore_three_quarter')
ap.add_argument('--iteration', default='1')
ap.add_argument('--final', type=int, default=0)
ap.add_argument('--input', default=str(HERE / 'base' / 'groom.blend'))
ap.add_argument('--out', default=str(HERE))
ap.add_argument('--parameters', default=str(HERE / 'parameters.json'))
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
OUT = Path(args.out); OUT.mkdir(exist_ok=True, parents=True)
P = json.loads(Path(args.parameters).read_text())
rng = np.random.default_rng(P['seed'])


def write(n, d): (OUT / n).write_text(json.dumps(d, indent=2))
def unit(a): return a / np.maximum(np.linalg.norm(a, axis=-1, keepdims=True), 1e-12)
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def array(items, key, dim=3, dtype=np.float32):
    a = np.empty(len(items) * dim, dtype=dtype); items.foreach_get(key, a); return a.reshape(-1, dim) if dim > 1 else a
def attr(data, name, values, typ='FLOAT', domain='POINT'):
    a = data.attributes.get(name) or data.attributes.new(name, typ, domain)
    key = 'vector' if typ == 'FLOAT_VECTOR' else 'color' if typ == 'FLOAT_COLOR' else 'value'
    a.data.foreach_set(key, np.asarray(values).ravel()); return a


def signature(o):
    m = o.data; co = array(m.vertices, 'co'); vi = array(m.loops, 'vertex_index', 1, np.int32)
    return {'vertices': len(m.vertices), 'faces': len(m.polygons), 'co_sha256': hashlib.sha256(co.tobytes()).hexdigest(), 'topology_sha256': hashlib.sha256(vi.tobytes()).hexdigest()}


def curve_fingerprint():
    out = {}
    for o in bpy.context.scene.objects:
        if o.type == 'MESH': out[o.name] = signature(o)
        elif o.type == 'CURVES':
            h = hashlib.sha256()
            for a in o.data.attributes:
                if a.data_type not in ('FLOAT', 'FLOAT_VECTOR', 'FLOAT_COLOR', 'INT', 'BOOLEAN'): continue
                dim = {'FLOAT_VECTOR': 3, 'FLOAT_COLOR': 4}.get(a.data_type, 1); key = {'FLOAT_VECTOR': 'vector', 'FLOAT_COLOR': 'color'}.get(a.data_type, 'value')
                h.update(array(a.data, key, dim, np.int32 if a.data_type in ('INT', 'BOOLEAN') else np.float32).tobytes())
            out[o.name] = {'data_sha256': h.hexdigest(), 'hide_render': o.hide_render}
    return out


def toe_axes(body):
    """One axis per claw: base point (where the claw leaves the toe) and the horizontal toe direction."""
    inv = body.matrix_world.inverted(); axes = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or 'claw' not in o.name.lower() or 'dew' in o.name.lower(): continue
        v = np.array([inv @ (o.matrix_world @ p.co) for p in o.data.vertices])
        c = v.mean(0); _, _, vt = np.linalg.svd(v - c); d = vt[0]
        if d[1] > 0: d = -d  # toes point forward, -y
        s = (v - c) @ d; tip = v[s.argmax()]; base = v[s.argmin()]
        dh = np.array([d[0], d[1], 0.]); dh /= np.linalg.norm(dh)
        axes.append({'name': o.name, 'tip': tip, 'base': base, 'dir': dh, 'fore': bool(c[1] < -0.05)})
    return axes


def toe_field(r, axes):
    """Distances from roots to every toe line (segment running back from the claw base), xy only."""
    # toe lines run back from the exposed claw tip (the claw shaft is embedded inside the toe)
    base = np.array([a['tip'] for a in axes]); d = np.array([a['dir'] for a in axes])
    back = np.array([P['fore_toe_length'] if a['fore'] else P['hind_toe_length'] for a in axes])
    rel = r[:, None, :2] - base[None, :, :2]
    s = -(rel * d[None, :, :2]).sum(2)  # distance behind the claw base along the toe
    sc = np.clip(s, -0.002, back[None, :])
    closest = base[None, :, :2] - sc[..., None] * d[None, :, :2]
    dist = np.linalg.norm(r[:, None, :2] - closest, axis=2)
    order = np.argsort(dist, axis=1); idx = np.arange(len(r))
    i1, i2 = order[:, 0], order[:, 1]
    d1, d2 = dist[idx, i1], dist[idx, i2]
    s1 = s[idx, i1]
    along = smooth(-0.004, 0.0, s1) * (1 - smooth(back[i1] * .75, back[i1] + .004, s1))
    groove = (1 - smooth(0.0, P['groove_width'], d2 - d1)) * along * (1 - smooth(P['groove_reach'][0], P['groove_reach'][1], d1))
    # the side of the own toe line the root is on, so parted fur leans toward its own toe crest
    away = r[:, :2] - closest[idx, i1]
    toe_w = along * (1 - smooth(P['toe_top_z'], P['toe_top_z'] + .012, r[:, 2]))
    # toe tip weight: 1 on the knuckle dome and curl, fading through the dip behind it
    tipw = (1 - smooth(back[i1] * P['tip_fade'][0], back[i1] * P['tip_fade'][1], s1)) * smooth(-0.004, 0.0, s1) * (1 - smooth(P['toe_top_z'], P['toe_top_z'] + .012, r[:, 2]))
    near_claw = 1 - smooth(P['claw_clear'][0], P['claw_clear'][1], np.linalg.norm(r[:, None, :] - np.array([a['tip'] for a in axes])[None], axis=2).min(1))
    return dict(i1=i1, d1=d1, s1=s1, groove=groove, toe_w=toe_w, tipw=tipw, away=away, near_claw=near_claw, dir=d[i1])


def paw_region(co):
    return (co[:, 2] < P['max_root_height'])


def lower_leg_color(points, co, col):
    """Nearest lower-leg coat color above the paw, so paws continue the leg coat."""
    cand = np.where((co[:, 2] > P['color_source_z'][0]) & (co[:, 2] < P['color_source_z'][1]))[0]
    kd = KDTree(len(cand))
    for j, i in enumerate(cand): kd.insert(Vector((co[i, 0], co[i, 1], 0.)), j)
    kd.balance()
    out = np.empty((len(points), 3))
    for k, p in enumerate(points):
        found = kd.find_n(Vector((p[0], p[1], 0.)), 6)
        out[k] = col[[cand[f[1]] for f in found], :3].mean(0)
    return out


def bind_tree(body):
    t = bpy.data.node_groups.new('Pass7 paw surface frame', 'GeometryNodeTree')
    t.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); t.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    ns = t.nodes; lk = t.links
    def named(name, typ='FLOAT'):
        n = ns.new('GeometryNodeInputNamedAttribute'); n.data_type = typ; n.inputs['Name'].default_value = name; return n.outputs['Attribute']
    def vm(op, a, b=None):
        n = ns.new('ShaderNodeVectorMath'); n.operation = op; lk.new(a, n.inputs[0])
        if b is not None: lk.new(b, n.inputs['Scale'] if op == 'SCALE' else n.inputs[1])
        return n.outputs['Vector']
    info = ns.new('GeometryNodeObjectInfo'); info.transform_space = 'ORIGINAL'; info.inputs['Object'].default_value = body
    pos = ns.new('GeometryNodeInputPosition'); v = []
    for s in 'abc':
        n = ns.new('GeometryNodeSampleIndex'); n.data_type = 'FLOAT_VECTOR'; n.domain = 'POINT'
        lk.new(info.outputs['Geometry'], n.inputs['Geometry']); lk.new(pos.outputs['Position'], n.inputs['Value']); lk.new(named('bind_i' + s, 'INT'), n.inputs['Index']); v.append(n.outputs['Value'])
    normal = vm('NORMALIZE', vm('CROSS_PRODUCT', vm('SUBTRACT', v[1], v[0]), vm('SUBTRACT', v[2], v[0])))
    tangent = vm('NORMALIZE', vm('SUBTRACT', v[1], v[0])); bit = vm('CROSS_PRODUCT', normal, tangent)
    tot = vm('ADD', vm('ADD', vm('SCALE', v[0], named('bind_a')), vm('SCALE', v[1], named('bind_b'))), vm('SCALE', v[2], named('bind_c')))
    tot = vm('ADD', tot, vm('SCALE', normal, named('bind_height'))); tot = vm('ADD', tot, vm('SCALE', tangent, named('bind_offset_x'))); tot = vm('ADD', tot, vm('SCALE', bit, named('bind_offset_y')))
    gi = ns.new('NodeGroupInput'); go = ns.new('NodeGroupOutput'); sp = ns.new('GeometryNodeSetPosition')
    lk.new(gi.outputs['Geometry'], sp.inputs['Geometry']); lk.new(tot, sp.inputs['Position']); lk.new(sp.outputs['Geometry'], go.inputs['Geometry'])
    return t


def hide_tree():
    t = bpy.data.node_groups.new('Pass7 hide pass5 toe strands', 'GeometryNodeTree')
    t.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); t.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    ns = t.nodes; lk = t.links
    gi = ns.new('NodeGroupInput'); go = ns.new('NodeGroupOutput')
    na = ns.new('GeometryNodeInputNamedAttribute'); na.data_type = 'FLOAT'; na.inputs['Name'].default_value = 'paw_mask'
    cmp = ns.new('FunctionNodeCompare'); cmp.data_type = 'FLOAT'; cmp.operation = 'GREATER_THAN'; cmp.inputs[1].default_value = .5
    lk.new(na.outputs['Attribute'], cmp.inputs[0])
    dg = ns.new('GeometryNodeDeleteGeometry'); dg.domain = 'CURVE'
    lk.new(gi.outputs['Geometry'], dg.inputs['Geometry']); lk.new(cmp.outputs[0], dg.inputs['Selection']); lk.new(dg.outputs[0], go.inputs['Geometry'])
    return t


def make_curves(name, coords, ids, co, colors, mat, body, tree, radius):
    count, pts, _ = coords.shape
    data = bpy.data.hair_curves.new(name); data.add_curves([pts] * count)
    data.attributes['position'].data.foreach_set('vector', coords.astype(np.float32).ravel())
    o = bpy.data.objects.new(name, data); bpy.context.scene.collection.objects.link(o)
    o.parent = body; o.matrix_parent_inverse = body.matrix_world.inverted(); o.matrix_world = body.matrix_world.copy(); data.surface = body
    data.materials.append(mat)
    tri = co[ids]; a = tri[:, 0]; e = tri[:, 1] - a; f = tri[:, 2] - a
    normal = unit(np.cross(e, f)); tangent = unit(e); bit = np.cross(normal, tangent)
    rootrel = coords[:, 0] - a; rel = coords - coords[:, 0:1]
    d00 = (e * e).sum(1); d01 = (e * f).sum(1); d11 = (f * f).sum(1); den = np.maximum(d00 * d11 - d01 * d01, 1e-24)
    de = (rootrel * e).sum(1); df = (rootrel * f).sum(1); bb = (d11 * de - d01 * df) / den; cc = (d00 * df - d01 * de) / den
    for j, s in enumerate('abc'): attr(data, 'bind_i' + s, ids[:, j], 'INT', 'CURVE')
    for s, v in [('a', 1 - bb - cc), ('b', bb), ('c', cc)]: attr(data, 'bind_' + s, v, 'FLOAT', 'CURVE')
    for s, v in [('height', (rel * normal[:, None, :]).sum(2)), ('offset_x', (rel * tangent[:, None, :]).sum(2)), ('offset_y', (rel * bit[:, None, :]).sum(2))]: attr(data, 'bind_' + s, v.ravel())
    attr(data, 'coat_color', np.c_[colors, np.ones(count)], 'FLOAT_COLOR', 'CURVE')
    taper = np.linspace(1, .08, pts) ** .9
    attr(data, 'radius', (radius[:, None] * taper[None, :]).ravel())
    m = o.modifiers.new('Follow evaluated sculpt surface', 'NODES'); m.node_group = tree
    return o


def hair_material():
    mat = bpy.data.materials.new('Pass7 paw Chiang pattern'); mat.use_nodes = True
    ns = mat.node_tree.nodes; lk = mat.node_tree.links; ns.clear()
    out = ns.new('ShaderNodeOutputMaterial'); h = ns.new('ShaderNodeBsdfHairPrincipled'); h.model = 'CHIANG'; h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = P['hair_roughness']; h.inputs['Radial Roughness'].default_value = .55; h.inputs['Coat'].default_value = 0.0
    at = ns.new('ShaderNodeAttribute'); at.attribute_name = 'coat_color'
    # pass 7: tips slightly lighter than roots (sheet fur shows lighter tips over a darker base)
    info = ns.new('ShaderNodeHairInfo'); ramp = ns.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1); ramp.color_ramp.elements[1].color = (P['tip_light'],) * 3 + (1,)
    mul = ns.new('ShaderNodeMixRGB'); mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
    lk.new(info.outputs['Intercept'], ramp.inputs[0]); lk.new(at.outputs['Color'], mul.inputs[1]); lk.new(ramp.outputs[0], mul.inputs[2])
    lk.new(mul.outputs[0], h.inputs['Color']); lk.new(h.outputs[0], out.inputs['Surface'])
    return mat


def sample_roots(co, n, tris, count, density):
    tc = co[tris]; areas = np.linalg.norm(np.cross(tc[:, 1] - tc[:, 0], tc[:, 2] - tc[:, 0]), axis=1) * .5
    w = areas * density[tris].mean(1); w /= w.sum(); ti = rng.choice(len(tris), count, p=w)
    r = rng.random((count, 2)); s = np.sqrt(r[:, 0]); bar = np.c_[1 - s, s * (1 - r[:, 1]), s * r[:, 1]]
    ids = tris[ti]; root = np.einsum('ij,ijk->ik', bar, co[ids]); nn = unit(np.einsum('ij,ijk->ik', bar, n[ids]))
    return ids, bar, root, nn


def build():
    bpy.ops.wm.open_mainfile(filepath=args.input)
    before = curve_fingerprint()
    body = bpy.data.objects['luceras_blockout']; m = body.data
    co = array(m.vertices, 'co'); nrm = array(m.vertices, 'normal')
    m.calc_loop_triangles(); tris = array(m.loop_triangles, 'vertices', 3, np.int32)
    col = array(m.attributes['coat_color'].data, 'color', 4)
    axes = toe_axes(body)
    write('toe_axes.json', [{k: (v.tolist() if hasattr(v, 'tolist') else v) for k, v in a.items()} for a in axes])

    # 1. Hide the pass 5 toe strands (zone 7) on every inherited curve object that carries paw_mask.
    ht = hide_tree(); hidden = []
    for o in bpy.context.scene.objects:
        if o.type == 'CURVES' and 'paw_mask' in o.data.attributes:
            pm = array(o.data.attributes['paw_mask'].data, 'value', 1)
            mod = o.modifiers.new('Pass7 hide pass5 toe strands', 'NODES'); mod.node_group = ht
            hidden.append({'object': o.name, 'hidden_curves': int((pm > .5).sum()), 'total_curves': len(pm)})

    # 2. Paw skin: continue the lower-leg coat; darken grooves; rebuild toe_break.
    low = paw_region(co); outside_hash = hashlib.sha256(col[~low].tobytes()).hexdigest()
    leg = lower_leg_color(co[low], co, col)
    blend = 1 - smooth(P['color_blend_z'][0], P['color_blend_z'][1], co[low, 2])
    fv = toe_field(co[low], axes)
    skin = col[low, :3] * (1 - blend[:, None]) + leg * blend[:, None]
    # Sheet: paws are dark gray even under the white fore-leg fronts. Pale leg color darkens toward the toes.
    src = col[(co[:, 2] > P['color_source_z'][0]) & (co[:, 2] < P['color_source_z'][1]), :3]
    dark_ref = np.median(src[src.mean(1) < np.percentile(src.mean(1), 35)], axis=0)
    pale = smooth(.18, .35, skin.mean(1)); dp = (1 - smooth(P['dark_paw_z'][0], P['dark_paw_z'][1], co[low, 2])) * pale
    skin = skin * (1 - dp[:, None]) + dark_ref * dp[:, None]
    skin *= (1 - P['groove_skin_dark'] * fv['groove'])[:, None]
    col[low, :3] = skin; attr(m, 'coat_color', col, 'FLOAT_COLOR')
    if 'toe_break' in m.attributes:
        tb = array(m.attributes['toe_break'].data, 'value', 1); tb[low] = fv['groove']; attr(m, 'toe_break', tb)

    # 3. New paw strands.
    z = co[:, 2]
    dens = (1 - smooth(P['max_root_height'] - .015, P['max_root_height'], z)) * smooth(.0015, .004, z)
    dens[nrm[:, 2] < P['sole_normal_z']] = 0
    fvall = toe_field(co, axes)
    dens *= 1 - P['groove_density_cut'] * fvall['groove']
    ids, bar, r, n = sample_roots(co, nrm, tris, P['children'], dens)
    keep = (r[:, 2] > .002) & (r[:, 2] < P['max_root_height']) & (n[:, 2] > P['sole_normal_z'])
    ids, bar, r, n = ids[keep], bar[keep], r[keep], n[keep]
    f = toe_field(r, axes); N = len(r)
    zr = r[:, 2]
    # Direction: on toes, along the toe toward its claw and slightly down; on the leg, down the leg.
    toe_dir = np.c_[f['dir'][:, :2], np.full(N, -.35)]
    # Part: roots in a groove lean out of it. Converge: roots on a toe lean toward that toe's crest line,
    # so hair piles into a ridge along each digit and leaves the groove between digits open.
    side = unit(f['away']); dist_c = np.linalg.norm(f['away'], axis=1)
    conv = P['converge'] * smooth(.0008, .004, dist_c) * (1 - f['groove'])
    part = np.c_[side * (f['groove'] * P['part_strength'] - conv)[:, None], np.zeros(N)]
    toe_dir = unit(toe_dir + part)
    leg_dir = np.tile(np.array([0, .10, -1.]), (N, 1))
    hind = r[:, 1] > 0
    leg_dir[hind] = [0, .25, -1.]
    w = f['toe_w'][:, None]
    # paw top behind the toes: comb forward and down so fur flows from leg onto paw without a line
    paw_top = (1 - smooth(P['fringe_z'][0], P['fringe_z'][1], zr))[:, None] * (1 - w)
    fwd = np.c_[f['dir'][:, :2] * .8, np.full(N, -.6)]
    d = unit(leg_dir * (1 - w - paw_top) + toe_dir * w + fwd * paw_top)
    tang = unit(d - n * (d * n).sum(1)[:, None])
    lift = P['lift'] + P['knuckle_lift'] * f['toe_w'] * (1 - f['groove'])
    direction = unit(tang + n * lift[:, None])
    # Length taper: toes -> paw -> wrist/hock fringe; back fringe longer.
    # pass 7: toe length on the dome and curl (tipw), foot length elsewhere, fringe only above the foot
    L = P['paw_length'] + (P['toe_length'] - P['paw_length']) * f['tipw']
    L += (P['fringe_length'] - P['paw_length']) * smooth(P['fringe_z'][0], P['fringe_z'][1], zr)
    backside = smooth(.1, .6, n[:, 1] * np.where(hind, 1, 1))  # +y normals = back of wrist / hock
    L += P['back_fringe_extra'] * backside * smooth(P['fringe_z'][0] - .01, P['fringe_z'][0] + .01, zr) * (1 - smooth(.07, .09, zr))
    L *= 1 - P['groove_length_cut'] * f['groove']
    L *= 1 - P['claw_length_cut'] * f['near_claw']
    L *= rng.uniform(.8, 1.2, N)
    # pass 7: sparse longer tufts on the foot (not on the toe domes) so the outline is softly tufty like the sheet
    tuft = (rng.random(N) < P['tuft_fraction']) * (1 - f['tipw'])
    L *= 1 + (P['tuft_scale'] - 1) * tuft
    PTS = P['points']; t = np.linspace(0, 1, PTS)[None, :, None]
    coords = r[:, None, :] + direction[:, None, :] * L[:, None, None] * t
    # droop: tips settle toward the surface tangent (tufts lie down, softer outline)
    coords += (tang - direction)[:, None, :] * (L * P['droop'])[:, None, None] * t ** 2
    # clumps: pull toward a nearby clump center, giving small tufts that break the outline
    kd = KDTree(N); step = max(1, N // P['clumps'])
    centers = np.arange(0, N, step)
    for j, i in enumerate(centers): kd.insert(Vector(r[i]), j)
    kd.balance()
    near = np.array([centers[kd.find(Vector(p))[1]] for p in r])
    tipc = coords[near, -1]
    pull = P['clump'] * (1 - .7 * f['toe_w'])
    coords += (tipc - coords[:, -1])[:, None, :] * pull[:, None, None] * t ** 1.6
    noise = rng.normal(size=(N, PTS, 3)) * P['frizz']; coords += noise * t
    coords[:, 0] = r
    coords[:, :, 2] = np.maximum(coords[:, :, 2], .0012)
    # color: root color from the (now continued) skin pattern, small per-strand tone variation
    rootcol = np.einsum('ij,ijk->ik', bar, col[ids, :3])
    tone = rng.uniform(.82, 1.12, N) * P['hair_color_scale']
    # pass 7: per-clump tone so the foot reads as coarse tufts of slightly different value, as on the sheet
    ctone = 1 + P['clump_tone'] * rng.uniform(-1, 1, N)
    tone *= ctone[near]
    crest = f['toe_w'] * (1 - smooth(.001, .005, dist_c)) * (1 - f['groove'])
    colors = rootcol * tone[:, None] * (1 - P['groove_hair_dark'] * f['groove'])[:, None] * (1 + P['crest_light'] * crest)[:, None]
    radius = np.full(N, P['root_radius']) * rng.uniform(.8, 1.15, N)
    mat = hair_material(); tree = bind_tree(body)
    make_curves('Pass7 paw fur', coords, ids, co, colors, mat, body, tree, radius)

    # cameras (same framing as the stopped attempt / Nick's crop)
    coll = bpy.data.collections['SWAPPABLE neutral studio']
    specs = {'paws_front': ((0, -.01, .045), (0, -1, .07), .48), 'fore_side': ((.037, -.143, .045), (1, 0, .16), .145), 'fore_three_quarter': ((.037, -.143, .045), (.62, -1, .38), .145), 'hind_side': ((.145, .091, .045), (1, 0, .16), .19), 'hind_three_quarter': ((.145, .091, .045), (.72, -1, .38), .19)}
    for name, (tg, view, scale) in specs.items():
        if ('groom_camera_' + name) in bpy.data.objects: continue
        dcam = bpy.data.cameras.new('groom_camera_' + name); dcam.type = 'ORTHO'; dcam.ortho_scale = scale
        o = bpy.data.objects.new(dcam.name, dcam); coll.objects.link(o); tg = Vector(tg); o.location = tg + Vector(view) * 5
        o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = (tg - o.location).to_track_quat('-Z', 'Y')

    after = curve_fingerprint()
    write('preservation_check.json', {
        'inherited_mesh_positions_topology_and_curve_data_unchanged': all(after[k] == v for k, v in before.items() if not (k == 'luceras_blockout')) and after['luceras_blockout'] == before['luceras_blockout'],
        'coat_color_above_paw_region_unchanged': outside_hash == hashlib.sha256(col[~low].tobytes()).hexdigest(),
        'paw_region_max_z_m': P['max_root_height'], 'pass5_toe_strands_hidden': hidden,
        'note': 'Inherited curve data is untouched; pass 5 toe strands are removed at evaluation by a Delete Geometry modifier on paw_mask.'})
    write('paw_checks.json', {'strands': int(N), 'points': PTS, 'length_min_m': float(L.min()), 'length_max_m': float(L.max()), 'length_median_toe_m': float(np.median(L[f['toe_w'] > .6])) if (f['toe_w'] > .6).any() else None,
                               'min_point_z_m': float(coords[:, :, 2].min()), 'nonfinite': int((~np.isfinite(coords)).sum()), 'left': int((r[:, 0] > 0).sum()), 'right': int((r[:, 0] < 0).sum()),
                               'toe_axes': len(axes), 'groove_roots': int((f['groove'] > .5).sum()),
                               'groove_vertices_fore': int(((fvall['groove'] > .5) & (co[:, 1] < -.05)).sum()), 'groove_vertices_hind': int(((fvall['groove'] > .5) & (co[:, 1] > 0)).sum()),
                               'toe_vertices_fore': int(((fvall['toe_w'] > .5) & (co[:, 1] < -.05)).sum()), 'toe_vertices_hind': int(((fvall['toe_w'] > .5) & (co[:, 1] > 0)).sum())})
    s = bpy.context.scene; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'groom.blend'))


def render():
    if args.mode != 'build': bpy.ops.wm.open_mainfile(filepath=str(OUT / 'groom.blend'))
    s = bpy.context.scene; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
    mp = OUT / 'measurements_frames.json'
    measure = json.loads(mp.read_text()) if mp.exists() else {'build_id': 'B-j5p6', 'frames': []}
    final = bool(args.final)
    for view in [v for v in args.views.split(',') if v]:
        w = h = 900 if final else 600
        if view in ('side', 'three_quarter', 'front'): w, h = (1374, 1145) if final else (916, 763)
        if view == 'paws_front': w, h = (1200, 480) if final else (900, 360)
        if view == 'sprite': w = h = 768
        s.camera = bpy.data.objects['groom_camera_' + view]
        s.render.resolution_x = w; s.render.resolution_y = h; s.render.resolution_percentage = 100
        if view == 'sprite':
            s.cycles.samples = 128; s.cycles.use_denoising = False
        else:
            s.cycles.samples = P['samples_final'] if final else P['samples_preview']; s.cycles.use_denoising = True
        name = ('render_' if final else 'iter' + args.iteration + '_') + view + '.png'
        s.render.filepath = str(OUT / name); t0 = time.perf_counter(); bpy.ops.render.render(write_still=True)
        sec = time.perf_counter() - t0
        print('RENDERED', name, sec)
        measure['frames'].append({'file': name, 'seconds': sec, 'width': w, 'height': h, 'samples_max': s.cycles.samples, 'denoise': s.cycles.use_denoising, 'device': 'CPU 6 threads', 'host_peak_gib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024 ** 2})
        mp.write_text(json.dumps(measure, indent=2))


if args.mode == 'build': build()
render()

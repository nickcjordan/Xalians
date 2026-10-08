"""Build a furred, shaded Blender scene from a finished construction assembly.

Run headless through the loop harness (it takes a Blender slot lock):

  python art/species-construction/loop/loop_tools.py blender art/species-construction/surface/build_surface.py \
      --log surface-build -- --asm <assembly dir> --out <out dir> [--settings <json>] [--strands N]

Reads <asm>/akinza.blend, leaves the skin geometry untouched, writes per-vertex fur attributes from the
species zones (fur_length, fur_density, fur_clump, fur_curl, pale, pad, comb), adds a Geometry Nodes hair
system on a separate Curves object, rebuilds the surface materials in grayscale, and saves <out>/surface.blend.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SPECIES_JSON = ROOT/'docs/design/species-construction/akinza/loop/species.json'


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x*x*(3.0-2.0*x)


def unit(v):
    n = np.linalg.norm(v, axis=1, keepdims=True)
    return v/np.maximum(n, 1e-9)


# ---------------------------------------------------------------- attributes

def membership(co, box, floor, height, margin):
    at = (floor+height-co[:, 2])/height
    x = co[:, 0]/height
    if box.get('symmetricX'):
        x = np.abs(x)
    y = co[:, 1]/height
    d2 = np.zeros(len(co))
    for v, (lo, hi) in ((at, box['at']), (x, box['x']), (y, box['y'])):
        out = np.maximum(np.maximum(lo-v, v-hi), 0.0)
        d2 = np.maximum(d2, out)
    return smoothstep(1.0-d2/max(margin, 1e-6))


def edge_smooth(values, edges, n, iterations):
    a, b = edges[:, 0], edges[:, 1]
    deg = np.bincount(a, minlength=n)+np.bincount(b, minlength=n)+1.0
    for _ in range(iterations):
        s = values.copy()
        s += np.bincount(a, weights=values[b], minlength=n)+np.bincount(b, weights=values[a], minlength=n)
        values = s/deg
    return values


def tail_centerline(co, edges, tail_m, root, fallback):
    """Comb along the tails: geodesic distance from the tail root over the skin graph (restricted to the
    tail zones), then the surface gradient of that distance."""
    n = len(co)
    mask = tail_m > 0.15
    a, b = edges[:, 0], edges[:, 1]
    ok = mask[a] & mask[b]
    a, b = a[ok], b[ok]
    el = np.linalg.norm(co[a]-co[b], axis=1)
    idx = np.where(mask)[0]
    dist_root = np.linalg.norm(co[idx]-root, axis=1)
    d = np.full(n, np.inf)
    seeds = idx[dist_root < dist_root.min()+0.03]
    d[seeds] = np.linalg.norm(co[seeds]-co[seeds].mean(axis=0), axis=1)*0
    for it in range(1200):
        new = d.copy()
        np.minimum.at(new, b, d[a]+el)
        np.minimum.at(new, a, d[b]+el)
        if np.array_equal(new, d):
            break
        d = new
    print('tail geodesic: iterations', it, 'reached', int(np.isfinite(d[mask]).sum()), 'of', int(mask.sum()))
    grad = np.zeros((n, 3))
    fin = np.isfinite(d[a]) & np.isfinite(d[b])
    a2, b2, el2 = a[fin], b[fin], el[fin]
    dd = (d[b2]-d[a2])/(el2**2)
    vec = co[b2]-co[a2]
    np.add.at(grad, a2, vec*dd[:, None])
    np.add.at(grad, b2, vec*dd[:, None])
    norm = np.linalg.norm(grad, axis=1)
    good = np.isfinite(d) & (norm > 1e-9)
    out = fallback.copy()
    out[good] = grad[good]/norm[good, None]
    return out


def write_attribute(me, name, data, kind='FLOAT'):
    if name in me.attributes:
        me.attributes.remove(me.attributes[name])
    attr = me.attributes.new(name, kind, 'POINT')
    attr.data.foreach_set('value' if kind == 'FLOAT' else 'vector', np.asarray(data, dtype=np.float32).ravel())


def compute_attributes(skin, cfg, species):
    me = skin.data
    n = len(me.vertices)
    co = np.empty(n*3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(n, 3)
    mw = np.array(skin.matrix_world)
    co = co@mw[:3, :3].T+mw[:3, 3]
    nrm = np.empty(n*3)
    me.vertex_normals.foreach_get('vector', nrm)
    nrm = unit(nrm.reshape(n, 3)@mw[:3, :3].T)
    frame = species['frame']
    floor, height = frame['floorZ'], frame['fixedHeight']
    zones = species['zones']
    sign = np.where(co[:, 0] < 0, -1.0, 1.0)

    edges = np.empty(len(me.edges)*2, dtype=np.int32)
    me.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    ear_root = np.array(cfg['earRoot'])
    nose = np.array(cfg['noseTip'])
    tail_root = np.array(cfg['tailRoot'])
    directions = {
        'down': np.tile([0.0, 0.0, -1.0], (n, 1)),
        'face': unit(unit(co-nose)+np.array([0, 0.3, -0.25])),
        'ear': unit(unit(co-ear_root*np.stack([sign, np.ones(n), np.ones(n)], 1))+np.array([0, 0, 0.35])),
        'tail': unit(co-tail_root),
    }
    names = list(cfg['groups'])
    weights = np.zeros((len(names), n))
    for i, name in enumerate(names):
        g = cfg['groups'][name]
        if g.get('everywhere'):
            m = np.ones(n)
        else:
            boxes = [zones[z] for z in g['zones']] if 'zones' in g else [g['box']]
            m = np.zeros(n)
            for box in boxes:
                m = np.maximum(m, membership(co, box, floor, height, g.get('margin', 0.02)))
        weights[i] = m*g['priority']
    wsum = weights.sum(axis=0)
    wn = weights/np.maximum(wsum, 1e-9)

    def blend(key, default=0.0):
        return sum(wn[i]*cfg['groups'][nm].get(key, default) for i, nm in enumerate(names))

    if 'tails' in names and cfg.get('tailCenterline', True):
        directions['tail'] = tail_centerline(co, edges, weights[names.index('tails')]/cfg['groups']['tails']['priority'],
                                             tail_root, directions['tail'])
    length, density = blend('length'), blend('density')
    clump, curl, group_pale = blend('clump'), blend('curl'), blend('pale')
    comb = unit(sum(wn[i, :, None]*directions[cfg['groups'][nm]['comb']] for i, nm in enumerate(names)))

    # pale mask: vertices of faces in the pale slot, spread a little, plus the chest group
    loops = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', loops)
    starts = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_start', starts)
    totals = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_total', totals)
    mat = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('material_index', mat)
    face_of_loop = np.repeat(np.arange(len(me.polygons)), totals)
    pale_loops = mat[face_of_loop] == cfg['paleSlot']
    pale = np.zeros(n)
    pale[loops[pale_loops]] = 1.0
    at_all = (floor+height-co[:, 2])/height
    pale *= (at_all < cfg.get('paleSlotMaxAt', 0.3))
    edges = np.empty(len(me.edges)*2, dtype=np.int32)
    me.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    pale = edge_smooth(pale, edges, n, cfg['paleSmoothing'])
    pale = np.clip(np.maximum(smoothstep(pale*cfg.get('paleGain', 2.2)), group_pale*cfg.get('groupPaleGain', 1.0)), 0, 1)
    # cup interior from geometry: forward-facing skin inside the ear zones, plus a soft chest patch
    ears_i = names.index('ears')
    ear_m = weights[ears_i]/cfg['groups']['ears']['priority']
    cup = ear_m*smoothstep((-nrm[:, 1]-cfg['cup']['normalMin'])/cfg['cup']['normalSpan'])
    pale = np.maximum(pale, cup*cfg['cup']['strength'])
    cb = cfg['chestPale']
    chest = membership(co, cb['box'], floor, height, cb['margin'])*cb['strength']
    pale = np.maximum(pale, chest)
    print('pale vertices >0.5:', int((pale > 0.5).sum()), 'of', n)

    # keep-outs: distance to eyes, nose, mouth, claws
    for key, ko in cfg['keepOut'].items():
        if not isinstance(ko, dict):
            continue
        objs = [o for o in bpy.data.objects if o.type == 'MESH' and ko['match'] in o.name]
        pts = []
        for o in objs:
            m = np.array(o.matrix_world)
            v = np.empty(len(o.data.vertices)*3)
            o.data.vertices.foreach_get('co', v)
            vp = v.reshape(-1, 3)@m[:3, :3].T+m[:3, 3]
            if 'frontOnly' in ko:
                vn = np.empty(len(o.data.vertices)*3)
                o.data.vertex_normals.foreach_get('vector', vn)
                vn = unit(vn.reshape(-1, 3)@m[:3, :3].T)
                vp = vp[-vn[:, 1] > ko['frontOnly']]
            pts.append(vp)
        if not pts:
            continue
        pts = np.concatenate(pts)
        if len(pts) == 0:
            continue
        step = max(1, len(pts)//4000)
        pts = pts[::step]
        near = np.ones(n)
        lo, hi = pts.min(axis=0)-ko['outer'], pts.max(axis=0)+ko['outer']
        cand = np.where(np.all((co >= lo) & (co <= hi), axis=1))[0]
        tree = KDTree(len(pts))
        for i, p in enumerate(pts):
            tree.insert(Vector(p), i)
        tree.balance()
        for i in cand:
            near[i] = tree.find(Vector(co[i]))[2]
        ramp = smoothstep((near-ko['inner'])/max(ko['outer']-ko['inner'], 1e-6))
        density *= ramp
        length *= cfg['keepOut'].get('lengthFloor', 1.0)+(1.0-cfg['keepOut'].get('lengthFloor', 1.0))*ramp
        print(f'keepout {key}: {len(pts)} points, {len(cand)} skin vertices touched')

    pad = ((co[:, 2] < floor+cfg['pads']['belowFloor']) & (nrm[:, 2] < cfg['pads']['normalZ'])).astype(float)
    pad = edge_smooth(pad, edges, n, 2)
    pad = np.clip(pad*1.5, 0, 1)
    density *= 1.0-pad

    write_attribute(me, 'fur_length', length)
    write_attribute(me, 'fur_density', density)
    write_attribute(me, 'fur_clump', clump)
    write_attribute(me, 'fur_curl', curl)
    write_attribute(me, 'pale', pale)
    write_attribute(me, 'fur_tone', blend('tone', 1.0))
    write_attribute(me, 'pad', pad)
    write_attribute(me, 'comb', comb, 'FLOAT_VECTOR')

    # density-weighted surface area, to turn a strand budget into a density
    poly_area = np.empty(len(me.polygons))
    me.polygons.foreach_get('area', poly_area)
    poly_density = np.add.reduceat(density[loops], starts)/totals
    weighted = float((poly_area*poly_density).sum())
    print(f'surface area {poly_area.sum():.3f}, density weighted {weighted:.3f}, length mean {length.mean():.4f}')
    return weighted


# ---------------------------------------------------------------- geometry nodes

class Builder:
    def __init__(self, tree):
        self.tree = tree

    def node(self, kind, **props):
        nd = self.tree.nodes.new(kind)
        for k, v in props.items():
            if hasattr(nd, k):
                setattr(nd, k, v)
            else:  # menu properties became sockets in newer Blender
                nd.inputs[k.title()].default_value = v.title() if k == 'mode' else v
        return nd

    def set(self, nd, key, value):
        sock = nd.inputs[key]
        if isinstance(value, bpy.types.NodeSocket):
            self.tree.links.new(value, sock)
        else:
            sock.default_value = value

    def vm(self, op, a, b=None, scale=None):
        nd = self.node('ShaderNodeVectorMath', operation=op)
        self.set_idx(nd, 0, a)
        if b is not None:
            self.set_idx(nd, 1, b)
        if scale is not None:
            self.set_idx(nd, 3, scale)
        return nd.outputs['Vector'] if op not in ('DOT_PRODUCT', 'LENGTH') else nd.outputs['Value']

    def m(self, op, a, b=None, c=None):
        nd = self.node('ShaderNodeMath', operation=op)
        self.set_idx(nd, 0, a)
        if b is not None:
            self.set_idx(nd, 1, b)
        if c is not None:
            self.set_idx(nd, 2, c)
        return nd.outputs['Value']

    def set_idx(self, nd, i, value):
        sock = nd.inputs[i]
        if isinstance(value, bpy.types.NodeSocket):
            self.tree.links.new(value, sock)
        else:
            sock.default_value = value

    def named(self, name, kind):
        nd = self.node('GeometryNodeInputNamedAttribute', data_type=kind)
        nd.inputs['Name'].default_value = name
        return nd.outputs['Attribute']

    def store(self, geo, name, value, kind):
        nd = self.node('GeometryNodeStoreNamedAttribute', data_type=kind, domain='POINT')
        self.tree.links.new(geo, nd.inputs['Geometry'])
        nd.inputs['Name'].default_value = name
        self.set(nd, 'Value', value)
        return nd.outputs['Geometry']


def build_hair_tree(skin, cfg, density_per_area, hair_mat):
    tree = bpy.data.node_groups.new('AkinzaFur', 'GeometryNodeTree')
    tree.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    tree.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    b = Builder(tree)
    gin = b.node('NodeGroupInput')
    gout = b.node('NodeGroupOutput')
    info = b.node('GeometryNodeObjectInfo', transform_space='ORIGINAL')
    info.inputs['Object'].default_value = skin
    dist = b.node('GeometryNodeDistributePointsOnFaces', distribute_method='RANDOM')
    tree.links.new(info.outputs['Geometry'], dist.inputs['Mesh'])
    dist.inputs['Seed'].default_value = cfg['seed']
    b.set(dist, 'Density', b.m('MULTIPLY', b.named('fur_density', 'FLOAT'), density_per_area))
    points, normal = dist.outputs['Points'], dist.outputs['Normal']

    # point stage: strand frame
    comb = b.named('comb', 'FLOAT_VECTOR')
    tangent = b.vm('SUBTRACT', comb, b.vm('SCALE', normal, scale=b.vm('DOT_PRODUCT', comb, normal)))
    tangent = b.vm('NORMALIZE', tangent)
    rnd = b.node('FunctionNodeRandomValue', data_type='FLOAT_VECTOR')
    rnd.inputs['Min'].default_value = (-1, -1, -1)
    rnd.inputs['Max'].default_value = (1, 1, 1)
    rnd.inputs['Seed'].default_value = cfg['seed']+1
    jitter = b.vm('SCALE', rnd.outputs['Value'], scale=cfg['dirJitter'])
    lift = cfg['lift']
    direction = b.vm('ADD', b.vm('ADD', b.vm('SCALE', tangent, scale=1.0-lift), b.vm('SCALE', normal, scale=lift)), jitter)
    direction = b.vm('NORMALIZE', direction)
    rl = b.node('FunctionNodeRandomValue', data_type='FLOAT')
    rl.inputs['Min'].default_value = 1.0-cfg['lengthJitter']  # Min (float)
    rl.inputs['Max'].default_value = 1.0+cfg['lengthJitter']  # Max (float)
    rl.inputs['Seed'].default_value = cfg['seed']+2
    strlen = b.m('MULTIPLY', b.named('fur_length', 'FLOAT'), rl.outputs['Value'])
    pos = b.node('GeometryNodeInputPosition').outputs['Position']

    g = points
    g = b.store(g, 'root', pos, 'FLOAT_VECTOR')
    g = b.store(g, 'dirv', direction, 'FLOAT_VECTOR')
    g = b.store(g, 'combp', tangent, 'FLOAT_VECTOR')
    g = b.store(g, 'strlen', strlen, 'FLOAT')

    # strand template: a unit line resampled to N points, instanced at every point
    line = b.node('GeometryNodeCurvePrimitiveLine', mode='POINTS')
    line.inputs['Start'].default_value = (0, 0, 0)
    line.inputs['End'].default_value = (0, 0, 1)
    res = b.node('GeometryNodeResampleCurve', mode='COUNT')
    tree.links.new(line.outputs['Curve'], res.inputs['Curve'])
    res.inputs['Count'].default_value = cfg['points']
    iop = b.node('GeometryNodeInstanceOnPoints')
    tree.links.new(g, iop.inputs['Points'])
    tree.links.new(res.outputs['Curve'], iop.inputs['Instance'])
    realize = b.node('GeometryNodeRealizeInstances')
    tree.links.new(iop.outputs['Instances'], realize.inputs['Geometry'])

    # curve stage: shape each strand from its stored frame
    t = b.node('GeometryNodeSplineParameter').outputs['Factor']
    root = b.named('root', 'FLOAT_VECTOR')
    dirv = b.named('dirv', 'FLOAT_VECTOR')
    combp = b.named('combp', 'FLOAT_VECTOR')
    sl = b.named('strlen', 'FLOAT')
    t2 = b.m('MULTIPLY', t, t)
    along = b.vm('SCALE', dirv, scale=b.m('MULTIPLY', sl, t))
    droop = b.vm('SCALE', combp, scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t2), cfg['droop']))
    gravity = b.vm('SCALE', _const_vec(b, (0, 0, -1)), scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t2), cfg['gravity']))
    # curl: a wave along the strand
    nz = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
    nz.inputs['Scale'].default_value = cfg['curlScale']
    nz.inputs['Detail'].default_value = 1.0
    b.set(nz, 'Vector', b.vm('ADD', root, along))
    wave = b.vm('SUBTRACT', nz.outputs['Color'], (0.5, 0.5, 0.5))
    wave = b.vm('SCALE', wave, scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t), b.m('MULTIPLY', b.named('fur_curl', 'FLOAT'), 2.0)))
    # clump: neighbors share a lean, so tips gather
    cz = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
    cz.inputs['Scale'].default_value = cfg['clumpScale']
    cz.inputs['Detail'].default_value = 0.0
    b.set(cz, 'Vector', root)
    lean = b.vm('SUBTRACT', cz.outputs['Color'], (0.5, 0.5, 0.5))
    lean = b.vm('SCALE', lean, scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t2), b.m('MULTIPLY', b.named('fur_clump', 'FLOAT'), 2.0)))
    total = b.vm('ADD', b.vm('ADD', b.vm('ADD', b.vm('ADD', root, along), droop), b.vm('ADD', gravity, wave)), lean)
    setpos = b.node('GeometryNodeSetPosition')
    tree.links.new(realize.outputs['Geometry'], setpos.inputs['Geometry'])
    tree.links.new(total, setpos.inputs['Position'])
    radius = b.m('MULTIPLY', cfg['rootRadius'], b.m('SUBTRACT', 1.0, b.m('MULTIPLY', t, cfg['taper'])))
    scr = b.node('GeometryNodeSetCurveRadius')
    tree.links.new(setpos.outputs['Geometry'], scr.inputs['Curve'])
    tree.links.new(radius, scr.inputs['Radius'])
    smat = b.node('GeometryNodeSetMaterial')
    tree.links.new(scr.outputs['Curve'], smat.inputs['Geometry'])
    smat.inputs['Material'].default_value = hair_mat
    tree.links.new(smat.outputs['Geometry'], gout.inputs['Geometry'])
    return tree


def _const_vec(b, v):
    nd = b.node('FunctionNodeInputVector')
    nd.vector = v
    return nd.outputs['Vector']


# ---------------------------------------------------------------- materials

def clear(mat):
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    return mat.node_tree


def attr_node(tree, name, kind='GEOMETRY'):
    nd = tree.nodes.new('ShaderNodeAttribute')
    nd.attribute_type = kind
    nd.attribute_name = name
    return nd


def gray_mix(tree, pale_socket, a, bgray):
    mix = tree.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (a, a, a, 1)
    mix.inputs[7].default_value = (bgray, bgray, bgray, 1)
    tree.links.new(pale_socket, mix.inputs[0])
    return mix.outputs[2]


def hair_material(cfg):
    mc = cfg['materials']
    mat = bpy.data.materials.new('Akinza hair')
    tree = clear(mat)
    pale = attr_node(tree, 'pale')
    base = gray_mix(tree, pale.outputs['Fac'], mc['hairGray'], mc['hairPale'])
    info = tree.nodes.new('ShaderNodeHairInfo')
    ramp = tree.nodes.new('ShaderNodeMapRange')
    ramp.inputs['To Min'].default_value = mc['rootDarken']
    ramp.inputs['To Max'].default_value = 1.0
    tree.links.new(info.outputs['Intercept'], ramp.inputs['Value'])
    mul = tree.nodes.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs[0].default_value = 1.0
    tree.links.new(base, mul.inputs[6])
    tone = attr_node(tree, 'fur_tone')
    tmul = tree.nodes.new('ShaderNodeMath')
    tmul.operation = 'MULTIPLY'
    tree.links.new(ramp.outputs['Result'], tmul.inputs[0])
    tree.links.new(tone.outputs['Fac'], tmul.inputs[1])
    tree.links.new(tmul.outputs['Value'], mul.inputs[7])
    hair = tree.nodes.new('ShaderNodeBsdfHairPrincipled')
    hair.model = 'CHIANG'
    hair.parametrization = 'COLOR'
    tree.links.new(mul.outputs[2], hair.inputs['Color'])
    hair.inputs['Roughness'].default_value = mc['hairRoughness']
    hair.inputs['Radial Roughness'].default_value = mc['radialRoughness']
    hair.inputs['Coat'].default_value = 0.0
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(hair.outputs['BSDF'], out.inputs['Surface'])
    return mat


def skin_material(mat, cfg, always_pale):
    mc = cfg['materials']
    tree = clear(mat)
    pale = attr_node(tree, 'pale')
    pad = attr_node(tree, 'pad')
    if always_pale:
        color = (mc['skinPale'],)*3+(1,)
        base_in = color
    else:
        base_in = None
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    if always_pale:
        bsdf.inputs['Base Color'].default_value = base_in
    else:
        tree.links.new(gray_mix(tree, pale.outputs['Fac'], mc['skinGray'], mc['skinPale']), bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8
    pad_bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    pad_bsdf.inputs['Base Color'].default_value = (0.03, 0.03, 0.03, 1)
    pad_bsdf.inputs['Roughness'].default_value = 0.25
    mixs = tree.nodes.new('ShaderNodeMixShader')
    tree.links.new(pad.outputs['Fac'], mixs.inputs[0])
    tree.links.new(bsdf.outputs['BSDF'], mixs.inputs[1])
    tree.links.new(pad_bsdf.outputs['BSDF'], mixs.inputs[2])
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(mixs.outputs['Shader'], out.inputs['Surface'])


def nose_material(mat):
    tree = clear(mat)
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.03, 0.03, 0.03, 1)
    bsdf.inputs['Roughness'].default_value = 0.2
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


def add_catch_lights(cfg):
    cl = cfg['catchLight']
    mat = bpy.data.materials.new('Catch light')
    tree = clear(mat)
    em = tree.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = cl['strength']
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(em.outputs['Emission'], out.inputs['Surface'])
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and 'iris' in o.name]:
        pts = np.array([o.matrix_world@v.co for v in o.data.vertices])
        lo, hi = pts.min(axis=0), pts.max(axis=0)
        c = (lo+hi)/2
        bpy.ops.mesh.primitive_uv_sphere_add(radius=cl['radius'], location=(c[0]+cl['dx'], lo[1]+cl['radius']*0.15, c[2]+cl['dz']))
        sph = bpy.context.object
        sph.name = 'catch light '+o.name
        sph.scale = (1, 0.35, 1)
        sph.data.materials.append(mat)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--asm', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--settings', type=Path, default=HERE/'akinza-surface.json')
    parser.add_argument('--strands', type=int)
    args = parser.parse_args(sys.argv[len(sys.argv)-sys.argv[::-1].index('--'):])
    cfg = json.loads(args.settings.read_text())
    if args.strands:
        cfg['strands'] = args.strands
    species = json.loads(SPECIES_JSON.read_text())
    args.out.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(args.asm/'akinza.blend'))
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    skin = max(meshes, key=lambda o: len(o.data.vertices))
    n_verts, n_polys = len(skin.data.vertices), len(skin.data.polygons)
    print('skin', skin.name, n_verts, n_polys)

    weighted = compute_attributes(skin, cfg, species)

    for slot, mat in enumerate(skin.data.materials):
        skin_material(mat, cfg, always_pale=(slot == cfg['paleSlot']))
    for o in meshes:
        if 'nose' in o.name:
            for mat in o.data.materials:
                nose_material(mat)

    add_catch_lights(cfg)
    hair_mat = hair_material(cfg)
    curves = bpy.data.hair_curves.new('Akinza fur')
    fur = bpy.data.objects.new('Akinza fur', curves)
    bpy.context.scene.collection.objects.link(fur)
    tree = build_hair_tree(skin, cfg, cfg['strands']/weighted, hair_mat)
    mod = fur.modifiers.new('Fur', 'NODES')
    mod.node_group = tree

    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = fur.evaluated_get(dg)
    cu = ev.data
    count = len(cu.curves)
    print('strands', count, 'points', len(cu.points), 'attrs', [a.name for a in cu.attributes])
    # the skin geometry must be unchanged
    assert len(skin.data.vertices) == n_verts and len(skin.data.polygons) == n_polys
    (args.out/'surface-info.json').write_text(json.dumps({'strands': count, 'strandPoints': len(cu.points),
                                                         'skin': skin.name, 'skinVertices': n_verts, 'settings': cfg}, indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'surface.blend'))
    print('saved', args.out/'surface.blend')


if __name__ == '__main__':
    main()

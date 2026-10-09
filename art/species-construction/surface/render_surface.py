"""Render the furred Akinza scene from a fixed set of views with a fixed neutral three-point rig.

  python art/species-construction/loop/loop_tools.py blender art/species-construction/surface/render_surface.py \
      --log surface-render -- --surface <dir with surface.blend> --out <image dir> [--samples 32] [--views front,side]

The rig turns with the camera (key left and above, fill right, rim behind) so every view is lit the same way.
Writes one PNG per view plus index.json (images, strand count, per-view and total seconds).
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector

CENTER = Vector((0.0, 0.16, -0.03))
VIEWS = {
    # name: (azimuth degrees from the front toward +x, elevation degrees, target, ortho scale (tall side), width, height)
    'front': (0, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'threequarter': (38, 8, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'side': (90, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'back': (180, 4, Vector((0.0, 0.16, -0.03)), 2.05, 768, 1024),
    'head': (0, 3, Vector((0.0, -0.05, 0.6)), 1.3, 1024, 1024),
    'forepaw': (0, 10, Vector((0.36, -0.11, -0.17)), 0.22, 1024, 1024),
    'hindpaw': (0, 14, Vector((0.39, -0.12, -0.9)), 0.34, 1024, 1024),
    'face': (0, 2, Vector((0.0, -0.15, 0.62)), 0.5, 1024, 1024),
}


def setup_world(scene):
    world = bpy.data.worlds.new('surface world')
    scene.world = world
    tree = world.node_tree
    tree.nodes.clear()
    light = tree.nodes.new('ShaderNodeBackground')
    light.inputs['Color'].default_value = (0.5, 0.5, 0.5, 1)
    light.inputs['Strength'].default_value = 0.6
    plain = tree.nodes.new('ShaderNodeBackground')
    plain.inputs['Color'].default_value = (0.93, 0.93, 0.93, 1)
    plain.inputs['Strength'].default_value = 1.0
    lp = tree.nodes.new('ShaderNodeLightPath')
    mix = tree.nodes.new('ShaderNodeMixShader')
    out = tree.nodes.new('ShaderNodeOutputWorld')
    tree.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
    tree.links.new(light.outputs['Background'], mix.inputs[1])
    tree.links.new(plain.outputs['Background'], mix.inputs[2])
    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])


def make_rig():
    rig = []
    for name, energy, size in (('key', 3.2, 6), ('fill', 1.1, 6), ('rim', 2.4, 4)):
        data = bpy.data.lights.new(name, 'SUN')
        data.energy = energy
        data.angle = math.radians(size)
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        rig.append(obj)
    return rig


def aim(obj, target):
    direction = target-obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def place(camera, rig, view):
    az, el, target, scale, w, h = view
    a, e = math.radians(az), math.radians(el)
    cam_dir = Vector((math.sin(a)*math.cos(e), -math.cos(a)*math.cos(e), math.sin(e)))
    camera.location = target+cam_dir*8.0
    aim(camera, target)
    camera.data.type, camera.data.ortho_scale = 'ORTHO', scale
    # basis: right and up as seen from the camera
    forward = (target-camera.location).normalized()
    right = forward.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(forward).normalized()
    toward_camera = -forward
    spots = {
        'key': (toward_camera*0.8-right*0.9+up*0.9),
        'fill': (toward_camera*0.9+right*1.0+up*0.15),
        'rim': (-toward_camera*0.9+right*0.4+up*1.0),
    }
    for obj in rig:
        obj.location = target+spots[obj.name].normalized()*6.0
        aim(obj, target)
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = w, h


def lin(hexstr, scale=1.0):
    h = hexstr.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16)/255.0
        out.append((c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4)*scale)
    return (*out, 1.0)


class MatBuilder:
    def __init__(self, tree):
        self.t = tree

    def node(self, kind, **props):
        n = self.t.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def put(self, n, i, v):
        if isinstance(v, bpy.types.NodeSocket):
            self.t.links.new(v, n.inputs[i])
        else:
            n.inputs[i].default_value = v

    def attr(self, name):
        n = self.node('ShaderNodeAttribute', attribute_type='GEOMETRY', attribute_name=name)
        return n

    def m(self, op, a, b=None, c=None, clamp=False):
        n = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        self.put(n, 0, a)
        if b is not None:
            self.put(n, 1, b)
        if c is not None:
            self.put(n, 2, c)
        return n.outputs['Value']

    def vm(self, op, a, b=None, scale=None):
        n = self.node('ShaderNodeVectorMath', operation=op)
        self.put(n, 0, a)
        if b is not None:
            self.put(n, 1, b)
        if scale is not None:
            self.put(n, 3, scale)
        return n.outputs['Value'] if op in ('DOT_PRODUCT', 'LENGTH', 'DISTANCE') else n.outputs['Vector']

    def ramp(self, v, lo, hi):
        n = self.node('ShaderNodeMapRange')
        n.clamp = True
        self.put(n, 'From Min', lo)
        self.put(n, 'From Max', hi)
        self.put(n, 'Value', v)
        return n.outputs['Result']


def pattern_factor(hair, kind, params):
    """Blue amount 0..1 per strand from the rest-position coordinate, so the pattern stays on the body when posed."""
    b = MatBuilder(hair)
    rest = b.attr('rest').outputs['Vector']
    dorsal = b.attr('dorsal').outputs['Fac']
    ptail = b.attr('ptail').outputs['Fac']
    pmask = b.attr(params.get('maskAttr', 'pmask')).outputs['Fac']
    if kind == 'ice':
        warp = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
        warp.inputs['Scale'].default_value = params.get('warpScale', 6.0)
        b.put(warp, 'Vector', rest)
        coord = b.vm('ADD', rest, b.vm('SCALE', b.vm('SUBTRACT', warp.outputs['Color'], (0.5, 0.5, 0.5)), scale=params.get('warp', 0.16)))
        cells = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='F1')
        cells.inputs['Scale'].default_value = params.get('scale', 6.5)
        b.put(cells, 'Vector', coord)
        sep = b.node('ShaderNodeSeparateColor')
        hair.links.new(cells.outputs['Color'], sep.inputs['Color'])
        gate = b.ramp(sep.outputs['Red'], params.get('gate', 0.4), params.get('gate', 0.4)+0.08)
        edge = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='DISTANCE_TO_EDGE')
        edge.inputs['Scale'].default_value = params.get('scale', 6.5)
        b.put(edge, 'Vector', coord)
        soft = b.ramp(edge.outputs['Distance'], 0.0, params.get('edgeSoft', 0.22))
        f = b.m('MULTIPLY', gate, soft)
    elif kind == 'stripes':
        axis = b.vm('DOT_PRODUCT', rest, params.get('axis', (0.25, 0.35, 1.0)))
        warp = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
        warp.inputs['Scale'].default_value = params.get('warpScale', 4.0)
        b.put(warp, 'Vector', rest)
        if params.get('tailAxis'):  # on the tails, bands are rings along each tail's own length (geodesic distance from the root)
            tailpos = b.attr('tailpos').outputs['Fac']
            tmask = b.ramp(ptail, 0.4, 0.6)
            axis = b.m('ADD', b.m('MULTIPLY', axis, b.m('SUBTRACT', 1.0, tmask)), b.m('MULTIPLY', tailpos, tmask))
        phase = b.m('MULTIPLY', b.m('ADD', axis, b.m('MULTIPLY', warp.outputs['Factor'], params.get('warp', 0.22))), params.get('freq', 6.28318/0.17))
        wave = b.m('ADD', b.m('MULTIPLY', b.m('SINE', phase), 0.5), 0.5)
        band = b.ramp(wave, params.get('lo', 0.4), params.get('hi', 0.68))
        if params.get('wrap'):
            f = band
            if params.get('fadeAttr'):
                f = b.m('MULTIPLY', band, b.attr(params['fadeAttr']).outputs['Fac'])
        else:
            f = b.m('MULTIPLY', band, b.m('ADD', 0.3, b.m('MULTIPLY', dorsal, 0.7)))
    elif kind == 'tiger':
        PI = 3.14159265
        arc = b.attr('arc').outputs['Fac']
        angle = b.attr('angle').outputs['Fac']
        belly = b.attr('bellyf').outputs['Fac']
        axis = b.vm('DOT_PRODUCT', rest, (0.25, 0.35, 1.0))
        tailpos = b.attr('tailpos').outputs['Fac']
        tmask = b.ramp(ptail, 0.4, 0.6)
        axis = b.m('ADD', b.m('MULTIPLY', axis, b.m('SUBTRACT', 1.0, tmask)), b.m('MULTIPLY', b.m('MULTIPLY', tailpos, tmask), params.get('period', 0.17)/params.get('tailPeriod', params.get('period', 0.17))))
        warp = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
        warp.inputs['Scale'].default_value = 4.0
        b.put(warp, 'Vector', rest)
        h = b.m('MULTIPLY', b.m('ADD', axis, b.m('MULTIPLY', warp.outputs['Factor'], 0.2)), 1.0/params.get('period', 0.17))
        row = b.m('FLOOR', h)
        v = b.m('FRACT', h)
        odd = b.m('MODULO', row, 2.0)
        wob = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
        wob.inputs['Scale'].default_value = 7.0
        b.put(wob, 'Vector', rest)
        sepx = b.node('ShaderNodeSeparateXYZ')
        hair.links.new(rest, sepx.inputs['Vector'])
        side = b.m('GREATER_THAN', sepx.outputs['X'], 0.0)  # the two flanks get different seeds
        q = b.m('ADD', b.m('ADD', b.m('ADD', arc, b.m('MULTIPLY', odd, 0.5)), b.m('MULTIPLY', side, 0.23)),
                b.m('MULTIPLY', b.m('SUBTRACT', wob.outputs['Factor'], 0.5), params.get('irregular', 0.7)))
        seg = b.m('FLOOR', q)
        u = b.m('FRACT', q)
        comb3 = b.node('ShaderNodeCombineXYZ')
        b.put(comb3, 'X', b.m('ADD', b.m('ADD', b.m('MULTIPLY', row, 0.37), 1.3), b.m('MULTIPLY', side, 5.1)))
        b.put(comb3, 'Y', b.m('ADD', b.m('MULTIPLY', seg, 0.53), 2.1))
        b.put(comb3, 'Z', b.m('ADD', 0.7, b.m('MULTIPLY', side, 3.3)))
        wn3 = b.node('ShaderNodeTexWhiteNoise', noise_dimensions='3D')
        hair.links.new(comb3.outputs['Vector'], wn3.inputs['Vector'])
        sp = b.node('ShaderNodeSeparateColor')
        hair.links.new(wn3.outputs['Color'], sp.inputs['Color'])
        rr, gg, bb = sp.outputs['Red'], sp.outputs['Green'], sp.outputs['Blue']
        gate = b.m('SUBTRACT', 1.0, b.ramp(rr, params.get('presence', 0.86), params.get('presence', 0.86)+0.05))
        wvar = b.m('ADD', 0.8, b.m('MULTIPLY', gg, 0.4))
        fork = b.m('SUBTRACT', 1.0, b.ramp(bb, params.get('forkFrac', 0.15), params.get('forkFrac', 0.15)+0.04))
        endflag = b.ramp(b.m('FRACT', b.m('MULTIPLY', gg, 17.3)), 0.45, 0.55)
        uf = b.m('ADD', u, b.m('MULTIPLY', endflag, b.m('SUBTRACT', 1.0, b.m('MULTIPLY', u, 2.0))))
        taper = b.m('POWER', b.m('MAXIMUM', b.m('SUBTRACT', 1.0, b.m('ABSOLUTE', b.m('SUBTRACT', b.m('MULTIPLY', u, 2.0), 1.0))), 0.0), params.get('taperPower', 1.3))
        v2 = b.m('ADD', v, b.m('MULTIPLY', b.m('SINE', b.m('ADD', b.m('MULTIPLY', q, 6.2832), b.m('MULTIPLY', row, 1.7))), 0.07))
        if params.get('narrow') == 'field':
            mw = b.m('SUBTRACT', 1.0, b.ramp(belly, 0.0, params.get('fieldRamp', 0.5)))
        else:
            mw = b.m('SUBTRACT', 1.0, b.m('MULTIPLY', b.ramp(angle, 2.4, 3.1416), 0.6))
        hw = b.m('MULTIPLY', b.m('MULTIPLY', b.m('MULTIPLY', taper, wvar), b.m('MULTIPLY', gate, mw)), params.get('halfWidth', 0.3))

        def stripe(off, w):
            d = b.m('ABSOLUTE', b.m('SUBTRACT', b.m('SUBTRACT', v2, 0.5), off))
            val = b.m('SUBTRACT', 1.0, b.ramp(d, b.m('MULTIPLY', w, 0.9), b.m('ADD', b.m('MULTIPLY', w, 1.0), 0.006)))
            return b.m('MULTIPLY', val, b.ramp(w, 0.015, 0.05))
        hw_main = b.m('MULTIPLY', hw, b.m('SUBTRACT', 1.0, b.m('MULTIPLY', fork, b.ramp(uf, 0.35, 0.6))))
        hw_br = b.m('MULTIPLY', b.m('MULTIPLY', hw, 0.6), b.m('MULTIPLY', fork, b.ramp(uf, 0.3, 0.55)))
        delta = b.m('MAXIMUM', b.m('MULTIPLY', b.m('SUBTRACT', uf, 0.35), 0.5), 0.0)
        f = b.m('MAXIMUM', stripe(0.0, hw_main), b.m('MAXIMUM', stripe(delta, hw_br), stripe(b.m('MULTIPLY', delta, -1.0), hw_br)))
    else:  # spots
        cells = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='F1')
        cells.inputs['Scale'].default_value = params.get('scale', 13.0)
        cells.inputs['Randomness'].default_value = 1.0
        b.put(cells, 'Vector', rest)
        sep = b.node('ShaderNodeSeparateColor')
        hair.links.new(cells.outputs['Color'], sep.inputs['Color'])
        dist = cells.outputs['Distance']
        r1 = params.get('spotR', 0.3)
        spot = b.m('SUBTRACT', 1.0, b.ramp(dist, r1-0.07, r1+0.05))
        inner = b.ramp(dist, r1*0.45, r1*0.45+0.07)
        outer = b.m('SUBTRACT', 1.0, b.ramp(dist, r1+0.08, r1+0.2))
        ring = b.m('MULTIPLY', inner, outer)
        rosette = b.ramp(sep.outputs['Green'], 0.45, 0.55)
        shape = b.m('ADD', b.m('MULTIPLY', spot, b.m('SUBTRACT', 1.0, rosette)), b.m('MULTIPLY', ring, rosette))
        dens = b.m('ADD', params.get('base', 0.12), b.m('ADD', b.m('MULTIPLY', dorsal, params.get('dorsal', 0.5)), b.m('MULTIPLY', ptail, params.get('tail', 0.45))))
        gate = b.ramp(b.m('SUBTRACT', dens, sep.outputs['Red']), 0.0, 0.08)
        f = b.m('MULTIPLY', shape, gate)
    if params.get('earOff'):
        earw = b.attr('earw').outputs['Fac']
        f = b.m('MULTIPLY', f, b.m('SUBTRACT', 1.0, b.ramp(earw, 0.05, 0.4)))
    return b.m('MULTIPLY', f, pmask)


def apply_pattern(pal, hair, mix_node):
    params = pal.get('patternParams', {})
    f = pattern_factor(hair, pal['pattern'], params)
    blend = hair.nodes.new('ShaderNodeMix')
    blend.data_type = 'RGBA'
    hair.links.new(f, blend.inputs[0])
    blend.inputs[7].default_value = lin(pal['blue'])
    if params.get('afterPale'):  # pattern drawn over the finished coat/pale mix, so it reaches the bib
        targets = [l.to_socket for l in mix_node.outputs[2].links]
        hair.links.new(mix_node.outputs[2], blend.inputs[6])
        for t in targets:
            hair.links.new(blend.outputs[2], t)
    else:
        blend.inputs[6].default_value = lin(pal['coat'])
        hair.links.new(blend.outputs[2], mix_node.inputs[6])
    if params.get('wash'):  # faint cool wash outside the pale field so its edge reads
        wb = MatBuilder(hair)
        wmix = hair.nodes.new('ShaderNodeMix')
        wmix.data_type = 'RGBA'
        wmix.inputs[6].default_value = lin(pal['coat'])
        wmix.inputs[7].default_value = lin(params['wash'])
        hair.links.new(wb.m('SUBTRACT', 1.0, wb.attr('bellyf').outputs['Fac']), wmix.inputs[0])
        src = mix_node.inputs[6].default_value
        mix_node.inputs[6].default_value = lin(pal['coat'])
        hair.links.new(wmix.outputs[2], mix_node.inputs[6])


def apply_palette(pal, factor):
    """Recolor the hair, the skin under it and the iris; the grayscale structure (roots, tone, pale mask) stays."""
    skin = max([o for o in bpy.data.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
    hair = bpy.data.materials['Akinza hair'].node_tree

    def mix_node(tree):
        for n in tree.nodes:
            if n.bl_idname == 'ShaderNodeMix' and n.data_type == 'RGBA' and n.blend_type == 'MIX':
                return n
    if 'rootLift' in pal:
        for n in hair.nodes:
            if n.bl_idname == 'ShaderNodeMapRange' and n.inputs['Value'].is_linked and n.inputs['Value'].links[0].from_node.bl_idname == 'ShaderNodeHairInfo':
                n.inputs['To Min'].default_value = pal['rootLift']
    if 'diffuseShare' in pal:
        for n in hair.nodes:
            if n.bl_idname == 'ShaderNodeMix' and n.data_type == 'FLOAT':
                n.inputs[2].default_value = pal['diffuseShare']
    if pal.get('earLift'):  # ears and crown: treat like pale strands for root darkening and diffuse share, so they read white
        lift = MatBuilder(hair)
        for n in list(hair.nodes):
            if n.bl_idname == 'ShaderNodeMix' and n.data_type == 'FLOAT' and n.inputs[0].is_linked                     and n.inputs[0].links[0].from_node.bl_idname == 'ShaderNodeAttribute':
                src = n.inputs[0].links[0].from_socket
                hair.links.new(lift.m('MAXIMUM', src, lift.attr('fur_guided').outputs['Fac']), n.inputs[0])
    m = mix_node(hair)
    m.inputs[6].default_value = lin(pal['coat'])
    m.inputs[7].default_value = lin(pal['pale'])
    if 'pattern' in pal:
        apply_pattern(pal, hair, m)
    if 'tip' in pal:  # icy tips on the long fur (ears and tails), strongest at the strand ends
        info = [n for n in hair.nodes if n.bl_idname == 'ShaderNodeHairInfo'][0]
        ends = hair.nodes.new('ShaderNodeMapRange')
        ends.inputs['From Min'].default_value, ends.inputs['From Max'].default_value = pal.get('tipEnds', (0.15, 0.85))
        hair.links.new(info.outputs['Intercept'], ends.inputs['Value'])
        ln = hair.nodes.new('ShaderNodeAttribute')
        ln.attribute_type, ln.attribute_name = 'GEOMETRY', 'fur_length'
        longp = hair.nodes.new('ShaderNodeMapRange')
        longp.inputs['From Min'].default_value, longp.inputs['From Max'].default_value = pal['tipFrom'], pal['tipTo']
        hair.links.new(ln.outputs['Fac'], longp.inputs['Value'])
        fac = hair.nodes.new('ShaderNodeMath')
        fac.operation = 'MULTIPLY'
        hair.links.new(ends.outputs['Result'], fac.inputs[0])
        hair.links.new(longp.outputs['Result'], fac.inputs[1])
        tipmix = hair.nodes.new('ShaderNodeMix')
        tipmix.data_type = 'RGBA'
        hair.links.new(fac.outputs['Value'], tipmix.inputs[0])
        tipmix.inputs[7].default_value = lin(pal['tip'])
        # splice before the root/tone multiply: coat color -> tip mix -> multiply
        mult = [n for n in hair.nodes if n.bl_idname == 'ShaderNodeMix' and n.blend_type == 'MULTIPLY'][0]
        src = mult.inputs[6].links[0].from_socket
        hair.links.new(src, tipmix.inputs[6])
        hair.links.new(tipmix.outputs[2], mult.inputs[6])
    for slot, mat in enumerate(skin.data.materials):
        t = mat.node_tree
        mm = mix_node(t)
        if mm:
            mm.inputs[6].default_value = lin(pal['coat'], factor)
            mm.inputs[7].default_value = lin(pal['pale'], 0.85)
        for n in t.nodes:
            if n.bl_idname == 'ShaderNodeBsdfPrincipled' and not n.inputs['Base Color'].is_linked and n.inputs['Base Color'].default_value[0] > 0.1:
                n.inputs['Base Color'].default_value = lin(pal['pale'], 0.85)
    iris = bpy.data.materials['Charcoal iris and black pupil'].node_tree
    vc = [n for n in iris.nodes if n.bl_idname == 'ShaderNodeVertexColor'][0]
    bsdf = [n for n in iris.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'][0]
    bw = iris.nodes.new('ShaderNodeRGBToBW')
    iris.links.new(vc.outputs['Color'], bw.inputs['Color'])
    ramp = iris.nodes.new('ShaderNodeMapRange')
    ramp.inputs['From Max'].default_value = 0.0125
    iris.links.new(bw.outputs['Val'], ramp.inputs['Value'])
    tint = iris.nodes.new('ShaderNodeMix')
    tint.data_type, tint.blend_type = 'RGBA', 'MULTIPLY'
    tint.inputs[0].default_value = 1.0
    iris.links.new(ramp.outputs['Result'], tint.inputs[6])
    tint.inputs[7].default_value = lin(pal['iris'])
    iris.links.new(tint.outputs[2], bsdf.inputs['Base Color'])
    iris.links.new(tint.outputs[2], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = 0.35


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--surface', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--views', default=','.join(VIEWS))
    parser.add_argument('--device', default='CPU')
    parser.add_argument('--palette', default=None)
    parser.add_argument('--hide-fur', action='store_true')
    parser.add_argument('--alpha', action='store_true', help='transparent background, RGBA (silhouette measures)')
    parser.add_argument('--debug-scale', type=float, default=1.0)
    parser.add_argument('--debug-attr', default=None, help='show this skin attribute as emission, fur hidden')
    args = parser.parse_args(sys.argv[len(sys.argv)-sys.argv[::-1].index('--'):])
    t_all = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(args.surface/'surface.blend'))
    args.out.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 2
    scene.cycles.transmission_bounces = 2
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.render.film_transparent = bool(args.alpha)
    if args.alpha:
        scene.render.image_settings.color_mode = 'RGBA'
    for ob in list(bpy.data.objects):
        if ob.type in ('CAMERA', 'LIGHT'):
            bpy.data.objects.remove(ob)
    if args.hide_fur:
        for ob in bpy.data.objects:
            if ob.name == 'Akinza fur':
                ob.hide_render = True
    if args.debug_attr:
        for ob in bpy.data.objects:
            if ob.name == 'Akinza fur':
                ob.hide_render = True
            if ob.type == 'MESH' and len(ob.data.vertices) > 500000:
                for mat in ob.data.materials:
                    t = mat.node_tree
                    t.nodes.clear()
                    a = t.nodes.new('ShaderNodeAttribute')
                    a.attribute_name = args.debug_attr
                    e = t.nodes.new('ShaderNodeEmission')
                    o = t.nodes.new('ShaderNodeOutputMaterial')
                    m = t.nodes.new('ShaderNodeMath')
                    m.operation = 'MULTIPLY'
                    m.inputs[1].default_value = args.debug_scale
                    t.links.new(a.outputs['Fac'], m.inputs[0])
                    t.links.new(m.outputs['Value'], e.inputs['Color'])
                    t.links.new(e.outputs['Emission'], o.inputs['Surface'])
        scene.view_settings.view_transform = 'Standard'
    if args.palette:
        pals = json.loads((Path(__file__).resolve().parent/'akinza-palettes.json').read_text())
        apply_palette(pals[args.palette], pals[args.palette].get('skinFactor', pals['skinFactor']))
    setup_world(scene)
    rig = make_rig()
    cam_data = bpy.data.cameras.new('surface camera')
    camera = bpy.data.objects.new('surface camera', cam_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    info_path = args.surface/'surface-info.json'
    info = json.loads(info_path.read_text()) if info_path.is_file() else {}
    records = []
    for name in args.views.split(','):
        place(camera, rig, VIEWS[name])
        bpy.context.view_layer.update()
        scene.render.filepath = str(args.out/f'{name}.png')
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        seconds = round(time.time()-t0, 1)
        print(f'rendered {name} in {seconds}s')
        records.append({'view': name, 'image': f'{name}.png', 'seconds': seconds,
                        'resolution': [scene.render.resolution_x, scene.render.resolution_y]})
    total = round(time.time()-t_all, 1)
    (args.out/'index.json').write_text(json.dumps({
        'strands': info.get('strands'), 'strandPoints': info.get('strandPoints'), 'samples': args.samples,
        'engine': 'CYCLES CPU with denoise', 'images': records, 'renderSecondsTotal': round(sum(r['seconds'] for r in records), 1),
        'wallSecondsIncludingLoad': total}, indent=2))


if __name__ == '__main__':
    main()

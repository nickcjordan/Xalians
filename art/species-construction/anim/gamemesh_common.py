"""Blender helpers for the Akinza game mesh (gamemesh-pass1-brief.md). Imported by gamemesh_*.py inside Blender."""
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
SKIN = 'akinza_continuous_construction'
FUR = 'Akinza fur'


def open_look(surface):
    """The fur of record with palette T7 and the eyeliner of record, as clip_frames.py --look fur sets it up."""
    for p in (HERE.parent, HERE.parent/'surface', HERE, HERE.parents[1]/'pipeline/roster'):
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))
    bpy.ops.wm.open_mainfile(filepath=str(Path(surface)/'surface.blend'))
    for ob in list(bpy.data.objects):
        if ob.type in ('CAMERA', 'LIGHT'):
            bpy.data.objects.remove(ob)
    import render_surface as render
    from eyeliner_styles import configured
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    pals = json.loads((HERE.parent/'surface'/'akinza-palettes.json').read_text())
    render.apply_palette(pals['T7'], pals['T7'].get('skinFactor', pals['skinFactor']))
    configured(None)
    fur = bpy.data.objects.get(FUR)
    for o in bpy.data.objects:
        if o.type == 'CURVES' and o is not fur:
            o.hide_render = True
    return sc


def world_co(o):
    c = np.empty(len(o.data.vertices)*3, np.float32)
    o.data.vertices.foreach_get('co', c)
    m = np.array(o.matrix_world)
    return c.reshape(-1, 3).astype(np.float64)@m[:3, :3].T+m[:3, 3]


def set_world_co(o, X):
    mi = np.linalg.inv(np.array(o.matrix_world))
    o.data.vertices.foreach_set('co', (np.asarray(X)@mi[:3, :3].T+mi[:3, 3]).astype(np.float32).ravel())
    o.data.update()


def tris_of(o):
    o.data.calc_loop_triangles()
    t = np.empty(len(o.data.loop_triangles)*3, np.int32)
    o.data.loop_triangles.foreach_get('vertices', t)
    return t.reshape(-1, 3)


def select(o, others=()):
    bpy.ops.object.select_all(action='DESELECT')
    for p in [o, *others]:
        p.hide_set(False)
        p.hide_viewport = False
        p.select_set(True)
    bpy.context.view_layer.objects.active = o


def triangles(o):
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)


def duplicate(o, name):
    n = o.copy()
    n.data = o.data.copy()
    n.name = name
    n.data.name = name
    n.parent = None
    n.matrix_world = o.matrix_world.copy()
    bpy.context.scene.collection.objects.link(n)
    return n


def apply(o, m):
    select(o)
    bpy.ops.object.modifier_apply(modifier=m.name)


def topology(o, fold_dot=-.8):
    """Closed-surface counts: non-manifold edges, boundary edges, zero-area faces, inconsistent winding, folded faces
    (every edge's two faces bend back past fold_dot), connected components."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.normal_update()
    nonman = sum(not e.is_manifold for e in bm.edges)
    boundary = sum(e.is_boundary for e in bm.edges)
    zero = sum(f.calc_area() < 1e-12 for f in bm.faces)
    wind = sum(e.is_manifold and not e.is_contiguous for e in bm.edges)
    folded = 0
    sharp_edges = 0
    for e in bm.edges:
        if e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal) < fold_dot:
            sharp_edges += 1
    for f in bm.faces:
        if all(e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal) < fold_dot for e in f.edges):
            folded += 1
    # components
    seen = set()
    comps = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]
        seen.add(v.index)
        n = 0
        while stack:
            x = stack.pop()
            n += 1
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index)
                    stack.append(y)
        comps.append(n)
    vol = bm.calc_volume(signed=True)
    out = dict(vertices=len(bm.verts), faces=len(bm.faces), nonManifoldEdges=nonman, boundaryEdges=boundary,
               zeroAreaFaces=zero, inconsistentWindingEdges=wind, sharpFoldEdges=sharp_edges, foldedFaces=folded,
               components=len(comps), componentSizes=sorted(comps, reverse=True)[:8], signedVolume=vol)
    bm.free()
    return out


def smart_uv(objects, margin=.004, pack_margin=6/1024):
    select(objects[0], objects[1:])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin, area_weight=0., correct_aspect=True,
                             scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=pack_margin)
    bpy.ops.object.mode_set(mode='OBJECT')


def _const_rgb(tree, rgba):
    n = tree.nodes.new('ShaderNodeRGB')
    n.outputs[0].default_value = tuple(rgba[:3])+(1.,)
    return n.outputs[0]


def _input_color(tree, sock):
    if sock.is_linked:
        return sock.links[0].from_socket
    v = sock.default_value
    return _const_rgb(tree, list(v) if hasattr(v, '__len__') else (v, v, v, 1))


def _color_of(tree, sock, notes):
    """The base color a shader output draws with, as a color socket (None for a fully transparent branch)."""
    n = sock.node
    t = n.bl_idname
    if t == 'ShaderNodeBsdfPrincipled':
        return _input_color(tree, n.inputs['Base Color'])
    if t == 'ShaderNodeBsdfHairPrincipled':
        if n.parametrization != 'COLOR':
            notes.append(f'{n.name}: parametrization {n.parametrization}, Color input used')
        return _input_color(tree, n.inputs['Color'])
    if t in ('ShaderNodeBsdfDiffuse', 'ShaderNodeBsdfHair', 'ShaderNodeBsdfGlossy', 'ShaderNodeBsdfTranslucent',
             'ShaderNodeEmission', 'ShaderNodeBsdfRefraction', 'ShaderNodeBsdfGlass', 'ShaderNodeBsdfSheen',
             'ShaderNodeSubsurfaceScattering', 'ShaderNodeBsdfToon', 'ShaderNodeBsdfAnisotropic', 'ShaderNodeBsdfMetallic'):
        key = 'Color' if 'Color' in n.inputs else 'Base Color'
        return _input_color(tree, n.inputs[key])
    if t == 'ShaderNodeBsdfTransparent' or t == 'ShaderNodeHoldout':
        return None
    if t in ('ShaderNodeMixShader', 'ShaderNodeAddShader'):
        a_in, b_in = (n.inputs[1], n.inputs[2]) if t == 'ShaderNodeMixShader' else (n.inputs[0], n.inputs[1])
        a = _color_of(tree, a_in.links[0].from_socket, notes) if a_in.is_linked else None
        b = _color_of(tree, b_in.links[0].from_socket, notes) if b_in.is_linked else None
        if a is None or b is None:
            return a if b is None else b
        mix = tree.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        if t == 'ShaderNodeMixShader':
            if n.inputs[0].is_linked:
                tree.links.new(n.inputs[0].links[0].from_socket, mix.inputs[0])
            else:
                mix.inputs[0].default_value = n.inputs[0].default_value
        else:
            mix.inputs[0].default_value = .5
        tree.links.new(a, mix.inputs[6])
        tree.links.new(b, mix.inputs[7])
        return mix.outputs[2]
    if t == 'NodeReroute':
        return _color_of(tree, n.inputs[0].links[0].from_socket, notes)
    if t == 'ShaderNodeGroup':
        notes.append(f'{n.name}: group shader, gray used')
        return _const_rgb(tree, (.5, .5, .5))
    notes.append(f'{n.name}: unknown shader {t}, gray used')
    return _const_rgb(tree, (.5, .5, .5))


def rewire_base_color_emission(materials=None):
    """Every material's surface output becomes Emission(base color, strength 1), so a bake reads the paint, no light."""
    done = {}
    for m in (materials or bpy.data.materials):
        if not m or not m.use_nodes:
            continue
        tree = m.node_tree
        outs = [n for n in tree.nodes if n.bl_idname == 'ShaderNodeOutputMaterial' and n.inputs['Surface'].is_linked]
        if not outs:
            continue
        o = next((n for n in outs if n.is_active_output), outs[0])
        notes = []
        col = _color_of(tree, o.inputs['Surface'].links[0].from_socket, notes)
        em = tree.nodes.new('ShaderNodeEmission')
        em.inputs['Strength'].default_value = 1.
        if col is None:
            em.inputs['Color'].default_value = (0, 0, 0, 1)
            notes.append('transparent: black')
        else:
            tree.links.new(col, em.inputs['Color'])
        for k in ('Volume', 'Displacement'):
            if k in o.inputs and o.inputs[k].is_linked:
                tree.links.remove(o.inputs[k].links[0])
        tree.links.new(em.outputs[0], o.inputs['Surface'])
        for other in tree.nodes:
            if other.bl_idname == 'ShaderNodeOutputMaterial':
                other.is_active_output = other is o
        done[m.name] = notes
    return done


def bake_target(o, name, size, colorspace='sRGB', float_buffer=False):
    img = bpy.data.images.get(name)
    if img:
        bpy.data.images.remove(img)
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=float_buffer)
    img.colorspace_settings.name = colorspace
    mat = bpy.data.materials.new('bake_'+name+'_'+o.name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = img
    mat.node_tree.nodes.active = node
    o.data.materials.clear()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.material_index = 0
    return img


def bake_selected(active, sources, size, kind, extrusion=.01, max_ray=.03, samples=4, margin=4, image=None,
                  colorspace='sRGB', normal_space='TANGENT', selected=True):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    b = sc.render.bake
    b.use_selected_to_active = selected
    b.cage_extrusion = extrusion
    b.max_ray_distance = max_ray
    b.margin = margin
    b.margin_type = 'EXTEND'
    b.use_clear = True
    b.normal_space = normal_space
    img = image or bake_target(active, f'{kind.lower()}_{active.name}', size, colorspace,
                               float_buffer=(kind == 'NORMAL'))
    for o in [active, *sources]:
        o.hide_render = False
    select(active, sources if selected else ())
    if kind == 'EMIT':
        bpy.ops.object.bake(type='EMIT')
    elif kind == 'NORMAL':
        bpy.ops.object.bake(type='NORMAL', normal_space=normal_space)
    elif kind == 'AO':
        bpy.ops.object.bake(type='AO')
    else:
        raise ValueError(kind)
    return img


def uv_coverage(o, size, uv_name=None, faces=None):
    """Texels whose centers lie inside one of the object's UV triangles (rows = image rows from the bottom, as
    Blender's pixel buffer)."""
    me = o.data
    me.calc_loop_triangles()
    uvl = me.uv_layers[uv_name] if uv_name else me.uv_layers.active
    uv = np.empty(len(me.loops)*2, np.float32)
    uvl.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    lt = np.empty(len(me.loop_triangles)*3, np.int32)
    me.loop_triangles.foreach_get('loops', lt)
    lt = lt.reshape(-1, 3)
    if faces is not None:
        pi = np.empty(len(me.loop_triangles), np.int32)
        me.loop_triangles.foreach_get('polygon_index', pi)
        lt = lt[np.isin(pi, faces)]
    return raster_uv(uv[lt]*size, size)


def raster_uv(P, size):
    """P (n,3,2) triangle corners in texel units -> bool mask (size, size), [row, col]."""
    mask = np.zeros((size, size), bool)
    for a, b, c in P:
        lo = np.maximum(0, np.floor(np.minimum(np.minimum(a, b), c)).astype(int))
        hi = np.minimum(size-1, np.ceil(np.maximum(np.maximum(a, b), c)).astype(int))
        if (hi < lo).any():
            continue
        xx, yy = np.meshgrid(np.arange(lo[0], hi[0]+1)+.5, np.arange(lo[1], hi[1]+1)+.5)
        den = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        if abs(den) < 1e-12:
            continue
        v = ((xx-a[0])*(c[1]-a[1])-(yy-a[1])*(c[0]-a[0]))/den
        w = ((b[0]-a[0])*(yy-a[1])-(b[1]-a[1])*(xx-a[0]))/den
        ins = (v >= -1e-6) & (w >= -1e-6) & (v+w <= 1+1e-6)
        mask[lo[1]:hi[1]+1, lo[0]:hi[0]+1] |= ins
    return mask


def _px(img):
    px = np.empty(img.size[0]*img.size[1]*4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(img.size[1], img.size[0], 4)


def fill_px(px, valid, iters=48):
    """Unfilled texels take the mean of their filled 4-neighbors, repeated (padding)."""
    px = px.copy()
    valid = valid.copy()
    for _ in range(iters):
        acc = np.zeros_like(px[..., :3])
        cnt = np.zeros(valid.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sv = np.roll(valid, (dy, dx), (0, 1))
            acc += np.roll(px[..., :3], (dy, dx), (0, 1))*sv[..., None]
            cnt += sv
        new = (~valid) & (cnt > 0)
        px[new, :3] = acc[new]/cnt[new, None]
        valid |= new
        if valid.all():
            break
    return px


def bake_ao(game, size, work, out_size, distance=.12, samples=32):
    """Ambient occlusion of the game mesh on itself (every game part an occluder, nothing else rendered), baked one
    part at a time into its own image and composited by UV coverage. Saves ao_<size>.png and ao.png."""
    sc = bpy.context.scene
    if sc.world is None:
        sc.world = bpy.data.worlds.new('ao world')
    sc.world.light_settings.distance = distance
    for o in bpy.data.objects:
        o.hide_render = o not in game
    final = np.zeros((size, size, 4), np.float32)
    final[..., 3] = 1
    have = np.zeros((size, size), bool)
    means = {}
    for o in game:
        img = bake_selected(o, [], size, 'AO', samples=samples, margin=2, colorspace='Non-Color', selected=False)
        px = _px(img)
        mk = uv_coverage(o, size)
        final[mk] = px[mk]
        have |= mk
        means[o.name] = round(float(px[mk][:, 0].mean()), 4) if mk.any() else None
        bpy.data.images.remove(img)
    final = fill_px(final, have)
    final[..., 3] = 1
    out = bpy.data.images.new('ao_full', size, size, alpha=False)
    out.colorspace_settings.name = 'Non-Color'
    out.pixels.foreach_set(final.ravel())
    out.filepath_raw = str(Path(work)/f'ao_{size}.png')
    out.file_format = 'PNG'
    out.save()
    small = out.copy()
    small.scale(out_size, out_size)
    small.filepath_raw = str(Path(work)/'ao.png')
    small.file_format = 'PNG'
    small.save()
    return dict(meanPerPart=means)

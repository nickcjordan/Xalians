"""Akinza game mesh: base color by projecting renders of the scene as drawn onto the game mesh's texels (Blender).

Cycles will not bake selected-to-active from a Curves object, so the coat's color is read from what the camera sees:
orthographic renders of the scene with every material rewired to emission of its own base color (no light; the fur
of record included, palette T7 and the eyeliner of record applied), from the 26 directions of a cube's faces, edges
and corners. A texel takes the views in which its point on the game mesh is the first mesh surface the camera meets
(a planar depth render of the meshes alone, fur hidden; within --tol), weighted by (n . d)^3.
"""
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

import gamemesh_common as gm


def texel_points(objs, size):
    """Every texel center inside a UV triangle of the objects: (row, col) from the image bottom, the world point and
    the interpolated corner normal there."""
    R, Cc, P, N = [], [], [], []
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        mw = np.array(o.matrix_world)
        co = gm.world_co(o)
        nl = len(me.loops)
        uv = np.empty(nl*2, np.float32)
        me.uv_layers.active.data.foreach_get('uv', uv)
        uv = uv.reshape(-1, 2).astype(np.float64)*size
        lv = np.empty(nl, np.int32)
        me.loops.foreach_get('vertex_index', lv)
        cn = np.empty(nl*3, np.float32)
        me.corner_normals.foreach_get('vector', cn)
        cn = cn.reshape(-1, 3).astype(np.float64)@mw[:3, :3].T
        lt = np.empty(len(me.loop_triangles)*3, np.int32)
        me.loop_triangles.foreach_get('loops', lt)
        for l3 in lt.reshape(-1, 3):
            a, b, c = uv[l3]
            lo = np.maximum(0, np.floor(np.minimum(np.minimum(a, b), c)).astype(int))
            hi = np.minimum(size-1, np.ceil(np.maximum(np.maximum(a, b), c)).astype(int))
            den = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
            if abs(den) < 1e-12 or (hi < lo).any():
                continue
            xx, yy = np.meshgrid(np.arange(lo[0], hi[0]+1)+.5, np.arange(lo[1], hi[1]+1)+.5)
            v = ((xx-a[0])*(c[1]-a[1])-(yy-a[1])*(c[0]-a[0]))/den
            w = ((b[0]-a[0])*(yy-a[1])-(b[1]-a[1])*(xx-a[0]))/den
            ins = (v >= -1e-6) & (w >= -1e-6) & (v+w <= 1+1e-6)
            if not ins.any():
                continue
            v, w = v[ins], w[ins]
            u = 1-v-w
            pts = co[lv[l3]]
            R.append((yy[ins]-.5).astype(np.int32))
            Cc.append((xx[ins]-.5).astype(np.int32))
            P.append(u[:, None]*pts[0]+v[:, None]*pts[1]+w[:, None]*pts[2])
            nn = u[:, None]*cn[l3[0]]+v[:, None]*cn[l3[1]]+w[:, None]*cn[l3[2]]
            N.append(nn/np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-12))
    return np.concatenate(R), np.concatenate(Cc), np.concatenate(P), np.concatenate(N)


def lin_to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= .0031308, 12.92*x, 1.055*np.power(x, 1/2.4)-.055)


def _load_exr(path, res):
    img = bpy.data.images.load(path, check_existing=False)
    px = np.empty(res*res*4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(res, res, 4)


def projection_color(targets, size, fur, meshes, out_dir, res=1280, samples=8, tol=.008, log=None):
    """Returns (sRGB colors (size, size, 3), weight (size, size), info)."""
    sc = bpy.context.scene
    rows, cols, P, N = texel_points(targets, size)
    lo = np.min([gm.world_co(o).min(0) for o in meshes], 0)
    hi = np.max([gm.world_co(o).max(0) for o in meshes], 0)
    center = (lo+hi)/2
    ortho = float(np.linalg.norm(hi-lo))*1.02
    cam = bpy.data.objects.new('proj cam', bpy.data.cameras.new('proj cam'))
    sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho
    cam.data.clip_end = 40
    sc.camera = cam
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.cycles.use_adaptive_sampling = False
    sc.cycles.max_bounces = 0
    sc.cycles.filter_width = 1.0
    sc.render.use_persistent_data = True
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'OPEN_EXR'
    sc.render.image_settings.color_depth = '32'
    sc.render.image_settings.color_mode = 'RGB'
    world = bpy.data.worlds.new('proj world')
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Strength'].default_value = 0.
    sc.world = world
    dm = bpy.data.materials.new('proj depth')
    dm.use_nodes = True
    nt = dm.node_tree
    for n in list(nt.nodes):
        if n.bl_idname != 'ShaderNodeOutputMaterial':
            nt.nodes.remove(n)
    outn = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputMaterial')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    sub = nt.nodes.new('ShaderNodeMath')
    sub.operation = 'SUBTRACT'
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(geo.outputs['Position'], dot.inputs[0])
    nt.links.new(dot.outputs['Value'], sub.inputs[1])
    nt.links.new(sub.outputs[0], em.inputs['Color'])
    nt.links.new(em.outputs[0], outn.inputs['Surface'])
    dirs = []
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for k in (-1, 0, 1):
                if i or j or k:
                    d = np.array([i, j, k], float)
                    dirs.append(d/np.linalg.norm(d))
    acc = np.zeros((len(P), 3))
    wsum = np.zeros(len(P))
    fur_render = fur.hide_render
    hidden = {o: o.hide_render for o in bpy.data.objects}
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = o not in meshes
    stats = []
    for vi, d in enumerate(dirs):
        t0 = time.time()
        loc = center+d*15
        cam.location = Vector(tuple(loc))
        cam.rotation_euler = Vector(tuple(-d)).to_track_quat('-Z', 'Y' if abs(d[2]) > .99 else 'Z').to_euler()
        bpy.context.view_layer.update()
        Minv = np.array(cam.matrix_world.inverted())
        lc = P@Minv[:3, :3].T+Minv[:3, 3]
        col = np.floor((lc[:, 0]/ortho+.5)*res).astype(int)
        row = np.floor((lc[:, 1]/ortho+.5)*res).astype(int)
        depth = -lc[:, 2]
        inside = (col >= 0) & (col < res) & (row >= 0) & (row < res)
        col, row = np.clip(col, 0, res-1), np.clip(row, 0, res-1)
        # planar depth along the view axis: dot(p - cam, -d) = dot(cam, d) - dot(p, d)
        sub.inputs[0].default_value = float(np.dot(loc, d))
        dot.inputs[1].default_value = tuple(float(x) for x in d)
        bpy.context.view_layer.material_override = dm
        fur.hide_render = True
        f = str(Path(out_dir)/f'proj_depth_{vi:02d}.exr')
        sc.render.filepath = f
        bpy.ops.render.render(write_still=True)
        D = _load_exr(f, res)[..., 0]
        bpy.context.view_layer.material_override = None
        fur.hide_render = fur_render
        f = str(Path(out_dir)/f'proj_color_{vi:02d}.exr')
        sc.render.filepath = f
        bpy.ops.render.render(write_still=True)
        Cimg = _load_exr(f, res)[..., :3]
        ndot = N@d
        dd = D[row, col]
        vis = inside & (ndot > .2) & (dd > 0) & (np.abs(dd-depth) < tol)
        wv = np.where(vis, ndot**3, 0.)
        acc += wv[:, None]*Cimg[row, col]
        wsum += wv
        stats.append(dict(view=vi, dir=[round(float(x), 3) for x in d], visible=int(vis.sum()), seconds=round(time.time()-t0, 1)))
        if log:
            log('projection', stats)
    sc.render.use_persistent_data = False
    for o, h in hidden.items():
        o.hide_render = h
    colors = np.zeros((size, size, 3))
    weight = np.zeros((size, size))
    ok = wsum > 0
    colors[rows[ok], cols[ok]] = lin_to_srgb(acc[ok]/wsum[ok, None])
    weight[rows, cols] = wsum
    return colors, weight, dict(texels=int(len(P)), seen=int(ok.sum()), orthoScale=ortho, res=res)

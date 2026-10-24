"""Readiness rig test: retopologize a blockout, rig it from a skeleton file, pose it, measure and render the damage.

    python art/studio/runner.py blender --log rig-test art/studio/readiness/rig_test.py -- \
        --build <blockout build dir> --skeleton <skeleton.json> --out <dir> \
        [--retopo <cache.npz>] [--faces 16000] [--weights auto | --weights-from <other out dir>]

Steps, all deterministic:
1. Retopology: Blender's Quadriflow on the skin (symmetric, fixed seed) to about --faces quads. The result is
   cached in --retopo, so arms that share a body share the same surface.
2. Skeleton: the skeleton file's bones; joints with a "snap" radius move to the centroid of the dense skin's
   cross-section there (left side and midline only, then mirrored), so one skeleton fits bodies built different
   ways. Every joint's distance moved and its depth inside the skin go in metrics.json.
3. Weights: Blender's automatic (heat) weights, or --weights-from another arm's rigged mesh, copied by nearest
   face (the "regions from the authored blockout" route). Separate objects (eyes) are bone-parented rigidly.
   Automatic weights are then cleaned (--clean-margin, default 1 cm; 0 turns it off): a vertex keeps a limb chain's
   weight only while that chain's nearest bone is within the margin of the nearest limb chain's, and the weight it
   drops goes to the core bone the chain hangs from. Heat weights let the two forelegs, the tail and the haunches,
   and the jaw and the shoulders share vertices (audit-3: 3 percent of the skin), so one limb dragged another; the
   rule is continuous in position, so it leaves no seam where two chains meet. With --dense the weights solved on
   the proxy are carried to the build's own skin by nearest face and that skin is posed, measured and rendered: a
   2.5 mm voxel proxy stair-steps thin features (lip edges, lid rims) that the build does not have, and the audit
   should judge the surface that ships. A bone with "weightBelow" (a
   polyline of [y, z] points in the side view) keeps weight only below that line, fading over "weightRamp" either
   side (default 4 mm), the rest going
   to its parent: the lower jaw carries nothing above the lip line (audit-4: an open mouth tore the upper lip).
4. Poses: the skeleton file's fixed poses. Per pose: crushed share (surface area in faces whose area fell below a
   quarter of rest), stretched share (above four times), new self-intersecting face pairs (pairs that do not
   share a vertex and did not touch at rest), and the chains those bad faces belong to.
5. Bleed: vertices carrying weight above 0.1 from two different limb chains at once (core, the spine to the
   head, mixes with anything), listed by chain pair.
Renders (Workbench, orthographic, fixed frame): rest with the bones drawn through a see-through skin, each pose in
clay, each pose with crushed faces in blue and stretched in amber (gray is within 2x), and the bleed vertices
in amber on gray. Output: metrics.json, rigged.blend, renders/*.png.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

FRAME = {'center': (0.0, 0.0, 0.33), 'scale': 0.8}
VIEWS = {'side': (1, 0, 0), 'threequarter': (0.75, -0.66, 0.2), 'front': (0, -1, 0.12)}
# the deformation audit's eight cameras (alignment decision 9): every side of the body, so nothing hides
AUDIT_VIEWS = {'side': (1, 0, 0), 'side-right': (-1, 0, 0), 'front': (0, -1, 0.12), 'back': (0, 1, 0.12),
               'threequarter': (0.75, -0.66, 0.2), 'threequarter-right': (-0.75, -0.66, 0.2),
               'rear-threequarter': (0.7, 0.7, 0.15), 'top': (0.001, -0.25, 1.0)}
VIEWS.update(AUDIT_VIEWS)
CRUSH, STRETCH = 0.25, 4.0
BLEED = 0.1


def args():
    argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--build', type=Path, required=True)
    ap.add_argument('--skeleton', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--retopo', type=Path)
    ap.add_argument('--faces', type=int, default=16000)
    ap.add_argument('--voxel', type=float, default=0.004, help='voxel remesh size when Quadriflow refuses the skin')
    ap.add_argument('--weights-from', type=Path)
    ap.add_argument('--clean-margin', type=float, default=0.01, help='weight cleanup margin in meters (0: off)')
    ap.add_argument('--smooth', type=int, default=60, help='Laplacian weight smoothing passes on the build skin '
                    'before it is cleaned there (with --dense)')
    ap.add_argument('--dense', action='store_true', help='pose and render the build skin itself, with the weights '
                    'solved on the remeshed proxy carried over by nearest face')
    ap.add_argument('--label', default='')
    ap.add_argument('--audit', action='store_true', help='deformation audit: eight cameras, clay, curvature and '
                    'flag looks per pose, and the plausibility limits in the skeleton file')
    return ap.parse_args(argv)


def mesh_arrays(me):
    v = np.empty(len(me.vertices)*3)
    me.vertices.foreach_get('co', v)
    return v.reshape(-1, 3)


def retopo(skin, cache, faces, voxel):
    if cache and cache.is_file():
        z = np.load(cache)
        verts, counts, idx = z['verts'], z['counts'], z['idx']
        method = str(z['method'])
    else:
        t0 = time.time()
        bpy.context.view_layer.objects.active = skin
        skin.select_set(True)
        method = 'quadriflow'
        try:
            r = bpy.ops.object.quadriflow_remesh(mode='FACES', target_faces=faces, use_mesh_symmetry=True,
                                                 use_preserve_sharp=False, use_preserve_boundary=False,
                                                 smooth_normals=False, seed=0)
            if 'FINISHED' not in r or len(skin.data.polygons) > faces*3:
                raise RuntimeError(f'quadriflow returned {r}')
        except Exception as e:                                  # noqa: BLE001
            print('quadriflow failed, voxel remesh instead:', e, flush=True)
            method = 'voxel'
            skin.data.remesh_voxel_size = voxel
            bpy.ops.object.voxel_remesh()
        me = skin.data
        verts = mesh_arrays(me)
        counts = np.array([len(p.vertices) for p in me.polygons])
        idx = np.concatenate([np.array(p.vertices) for p in me.polygons])
        if cache:
            cache.parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(cache, verts=verts, counts=counts, idx=idx, method=method,
                                minutes=(time.time()-t0)/60)
        print(f'retopo {method}: {len(verts)} verts, {len(counts)} faces, {(time.time()-t0)/60:.1f} min', flush=True)
    me = bpy.data.meshes.new('body')
    polys, k = [], 0
    for c in counts:
        polys.append([int(i) for i in idx[k:k+c]])
        k += c
    me.from_pydata([tuple(p) for p in verts], [], polys)
    me.update()
    ob = bpy.data.objects.new('body', me)
    bpy.context.scene.collection.objects.link(ob)
    return ob, method


def mirrored(bones):
    out = []
    for b in bones:
        if not b['mirror']:
            out.append(dict(b))
            continue
        for side, sx in (('L', 1), ('R', -1)):
            c = dict(b)
            c['name'] = f"{b['name']}_{side}"
            c['head'] = [sx*b['head'][0], *b['head'][1:]]
            c['tail'] = [sx*b['tail'][0], *b['tail'][1:]]
            if b['parent'] and any(o['name'] == b['parent'] and o['mirror'] for o in bones):
                c['parent'] = f"{b['parent']}_{side}"
            c['side'] = side
            out.append(c)
    return out


def inside(bvh, pts):
    out = np.zeros(len(pts), bool)
    for n, p in enumerate(pts):
        loc, normal, _, _ = bvh.find_nearest(Vector(p))
        out[n] = loc is not None and (Vector(p)-loc).dot(normal) < 0
    return out


def section_centroid(bvh, j, d, r):
    """Centroid of the skin's cross-section through j perpendicular to d: a square of points (spacing h, out to
    2r) tested inside the skin, flood-filled from the inside point nearest j, so a neighbouring part of the
    same slice (the body beside a leg, an ear against a cheek) is not counted unless it is joined to it."""
    u = np.cross(d, [0, 0, 1] if abs(d[2]) < 0.9 else [1, 0, 0])
    u /= np.linalg.norm(u)
    w = np.cross(d, u)
    h = min(r/8, 0.002)
    n = int(math.ceil(2*r/h))
    ii, kk = np.meshgrid(np.arange(-n, n+1), np.arange(-n, n+1), indexing='ij')
    pts = j+(ii.ravel()[:, None]*u+kk.ravel()[:, None]*w)*h
    ins = inside(bvh, pts).reshape(ii.shape)
    if not ins.any():
        return None, 0
    dist = (ii**2+kk**2).astype(float)
    dist[~ins] = np.inf
    seed = np.unravel_index(int(np.argmin(dist)), ii.shape)
    region = np.zeros_like(ins)
    stack = [seed]
    while stack:
        a, b = stack.pop()
        if a < 0 or b < 0 or a >= ins.shape[0] or b >= ins.shape[1] or region[a, b] or not ins[a, b]:
            continue
        region[a, b] = True
        stack += [(a+1, b), (a-1, b), (a, b+1), (a, b-1)]
    sel = region.ravel()
    return pts[sel].mean(axis=0), int(sel.sum())


def snap_joints(bones, bvh):
    """Move snapped joints (a bone's tail with a snap radius, and so its connected child's head) to the centroid
    of the skin's cross-section there. Left side and midline only; right copies are mirrored afterwards."""
    moved = {}
    for b in bones:
        r = b['snap'].get('tail')
        if not r:
            continue
        j = np.array(b['tail'], float)
        d = j-np.array(b['head'], float)
        d /= np.linalg.norm(d)
        kids = [c for c in bones if c['parent'] == b['name'] and c.get('connect')]
        if kids:
            k = np.array(kids[0]['tail'], float)-j
            d = d+k/np.linalg.norm(k)
            d /= np.linalg.norm(d)
        start = j.copy()
        for _ in range(2):
            c, count = section_centroid(bvh, j, d, r)
            if c is None:
                break
            j = c
        if b['head'][0] > 0:
            j[0] = max(j[0], 0.0)
        elif abs(b['head'][0]) < 1e-9:
            j[0] = 0.0
        moved[b['name']] = j-start
        b['tail'] = j.tolist()
        for c in bones:
            if c['parent'] == b['name'] and c.get('connect'):
                c['head'] = j.tolist()
    return {k: float(np.linalg.norm(v)) for k, v in moved.items()}


def build_armature(spec, bvh):
    base = [dict(b) for b in spec['bones']]
    snapped = snap_joints(base, bvh)
    bones = mirrored(base)
    arm = bpy.data.armatures.new('rig')
    ob = bpy.data.objects.new('rig', arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for b in bones:
        e = arm.edit_bones.new(b['name'])
        e.head, e.tail = Vector(b['head']), Vector(b['tail'])
        e.roll = 0.0
        eb[b['name']] = e
    for b in bones:
        if b['parent']:
            eb[b['name']].parent = eb[b['parent']]
            eb[b['name']].use_connect = bool(b.get('connect'))
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob, bones, snapped


def depth(bvh, p):
    loc, normal, _, dist = bvh.find_nearest(Vector(p))
    if loc is None:
        return None
    return float(math.copysign(dist, (Vector(p)-loc).dot(normal)))


def weights(body, rig, src_dir):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    if src_dir is None:
        body.select_set(True)
        rig.select_set(True)
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        return 'auto'
    with bpy.data.libraries.load(str(src_dir/'rigged.blend')) as (src, dst):
        dst.objects = ['body']
    other = dst.objects[0]
    other.name = 'source-body'
    other.parent = None
    bpy.context.scene.collection.objects.link(other)
    for m in list(other.modifiers):
        other.modifiers.remove(m)
    for g in other.vertex_groups:
        body.vertex_groups.new(name=g.name)
    m = body.modifiers.new('transfer', 'DATA_TRANSFER')
    m.object = other
    m.use_vert_data = True
    m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'
    m.layers_vgroup_select_src = 'ALL'
    m.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier='transfer')
    bpy.data.objects.remove(other)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE')
    return f'from {src_dir.name}'


def carry_weights(proxy, dense, rig):
    """Copy the proxy's vertex groups to the dense skin by nearest-face interpolation, bind the dense skin to the
    rig, and drop the proxy. Returns the dense skin, renamed 'body'."""
    for g in proxy.vertex_groups:
        dense.vertex_groups.new(name=g.name)
    m = dense.modifiers.new('transfer', 'DATA_TRANSFER')
    m.object = proxy
    m.use_vert_data = True
    m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'
    m.layers_vgroup_select_src = 'ALL'
    m.layers_vgroup_select_dst = 'NAME'
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = dense
    dense.select_set(True)
    bpy.ops.object.modifier_apply(modifier='transfer')
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.data.objects.remove(proxy)
    dense.name = 'body'
    dense.data.name = 'body'
    dense.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE')
    return dense


def seg_dist(P, a, b):
    ab = b-a
    t = np.clip(((P-a)@ab)/max(float(ab@ab), 1e-12), 0.0, 1.0)
    return np.linalg.norm(P-(a+np.outer(t, ab)), axis=1)


def smooth_columns(body, W, iterations, alpha=0.5):
    """Laplacian smoothing of the weight columns over the mesh edges, `iterations` passes."""
    n = len(body.data.vertices)
    E = np.empty(len(body.data.edges)*2, np.int64)
    body.data.edges.foreach_get('vertices', E)
    E = E.reshape(-1, 2)
    deg = np.maximum(np.bincount(E[:, 0], minlength=n)+np.bincount(E[:, 1], minlength=n), 1)
    for i in np.nonzero(W.any(axis=0))[0]:
        w = W[:, i].copy()
        for _ in range(iterations):
            s = np.bincount(E[:, 0], weights=w[E[:, 1]], minlength=n)+np.bincount(E[:, 1], weights=w[E[:, 0]], minlength=n)
            w = (1.0-alpha)*w+alpha*s/deg
        W[:, i] = w
    return W


def clean_weights(body, bones, margin, smooth=0):
    """Rules on the weights, in order: an optional smoothing (`smooth` Laplacian passes over the mesh edges, for
    the sawtooth that carrying weights by nearest face leaves and the hard edges heat weights leave at a limb's
    root); a limb chain keeps its weight on a vertex only while its nearest bone is within `margin` of the nearest
    limb chain's (fading linearly across the margin); near its root a sided chain (left or right) fades to nothing
    over 2 cm toward the midline and carries none across it; a bone with "weightBelow" or "weightAbove" (side-view
    polylines of [y, z]) keeps weight only on that side of its line, fading over "weightRamp" either side. Dropped
    weight goes to the core bone the chain hangs from (the bone's parent for the line rules). Returns the share of
    vertices changed."""
    names = [b['name'] for b in bones]
    chains = [chain_of(b) for b in bones]
    by = {b['name']: b for b in bones}
    W0 = weight_matrix(body, names)
    W = W0/np.maximum(W0.sum(axis=1, keepdims=True), 1e-9)
    if smooth:
        W = smooth_columns(body, W, smooth)
    P = np.array([v.co[:] for v in body.data.vertices])
    limb = sorted(set(chains)-{'core'})
    D = np.full((len(P), len(limb)), np.inf)
    for i, b in enumerate(bones):
        if chains[i] == 'core':
            continue
        k = limb.index(chains[i])
        D[:, k] = np.minimum(D[:, k], seg_dist(P, np.array(b['head'], float), np.array(b['tail'], float)))
    CW = np.stack([W[:, [i for i, c in enumerate(chains) if c == u]].sum(axis=1) for u in limb], axis=1)
    present = CW > 1e-4
    dmin = np.where(present, D, np.inf).min(axis=1)
    F = np.clip((dmin[:, None]+margin-D)/margin, 0.0, 1.0)
    F = np.where(present, F, 1.0)
    root = {}
    for k, u in enumerate(limb):
        first = next(b for b in bones if chain_of(b) == u and (not b['parent'] or chain_of(by[b['parent']]) != u))
        root[u] = names.index(first['parent'])
        if u.endswith('_L') or u.endswith('_R'):
            # near the limb's root only (within 4 to 6 cm of its first bone: the chest between the upper forelegs,
            # the rump between the thighs): a forepaw stands 1.5 cm from the midline and must keep its own weight
            # (audit-11: faded everywhere, the paws' inner edges stayed with the chest and tore into spikes)
            sx = P[:, 0] if u.endswith('_L') else -P[:, 0]
            t = np.clip(sx/0.02, 0.0, 1.0)
            side = t*t*(3-2*t)
            dr = seg_dist(P, np.array(first['head'], float), np.array(first['tail'], float))
            n = np.clip((0.06-dr)/0.02, 0.0, 1.0)
            near = n*n*(3-2*n)
            F[:, k] *= 1.0-near*(1.0-side)
    W2 = W.copy()
    for i, c in enumerate(chains):
        if c == 'core':
            continue
        k = limb.index(c)
        drop = W[:, i]*(1.0-F[:, k])
        W2[:, i] -= drop
        W2[:, root[c]] += drop
    for i, b in enumerate(bones):
        for key, sign in (('weightBelow', 1.0), ('weightAbove', -1.0)):
            line = b.get(key)
            if not line:
                continue
            L = np.asarray(line, float)
            zc = np.interp(P[:, 1], L[:, 0], L[:, 1])
            ramp = float(b.get('weightRamp', 0.004))
            keep = np.clip(sign*(zc-P[:, 2])/ramp*0.5+0.5, 0.0, 1.0)
            drop = W2[:, i]*(1.0-keep)
            W2[:, i] -= drop
            W2[:, names.index(b['parent'])] += drop
    W2 /= np.maximum(W2.sum(axis=1, keepdims=True), 1e-9)
    changed = np.abs(W2-W0/np.maximum(W0.sum(axis=1, keepdims=True), 1e-9)).max(axis=1) > 1e-3
    groups = {g.name: g for g in body.vertex_groups}
    for i, n in enumerate(names):
        col = W2[:, i]
        if not np.any(np.abs(col-W0[:, i]) > 1e-6):
            continue
        g = groups.get(n) or body.vertex_groups.new(name=n)
        g.remove([int(v) for v in np.nonzero(W0[:, i] > 0)[0]])
        q = np.round(col*1000).astype(int)
        for level in np.unique(q[q > 0]):
            g.add([int(v) for v in np.nonzero(q == level)[0]], level/1000.0, 'REPLACE')
    return float(changed.mean())


def weight_matrix(body, names):
    w = np.zeros((len(body.data.vertices), len(names)))
    col = {g.index: names.index(g.name) for g in body.vertex_groups if g.name in names}
    for v in body.data.vertices:
        for g in v.groups:
            if g.group in col:
                w[v.index, col[g.group]] = g.weight
    return w


def chain_of(b):
    c = b['chain']
    return f"{c}_{b['side']}" if b.get('side') else c


def pose(rig, bones, steps):
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    order = [b['name'] for b in bones]
    for name, axis, deg in sorted(steps, key=lambda s: order.index(s[0])):
        pb = rig.pose.bones[name]
        if axis == 'move':
            pb.matrix = Matrix.Translation(Vector(deg)) @ pb.matrix
            bpy.context.view_layer.update()
            continue
        a = Vector({'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[axis[-1]])
        if axis[0] == 'p' and pb.parent:                 # an axis carried by the parent's pose so far ('px' after
            par = pb.parent                              # a neck turn is the head's own pitch, not a roll)
            a = (par.matrix.to_3x3() @ par.bone.matrix_local.to_3x3().inverted()) @ a
        h = pb.matrix.translation.copy()
        pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, a) @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()


def evaluated(body):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    v = mesh_arrays(me)
    areas = np.empty(len(me.polygons))
    me.polygons.foreach_get('area', areas)
    ev.to_mesh_clear()
    return v, areas


def overlaps(v, polys):
    tree = BVHTree.FromPolygons([tuple(p) for p in v], polys, all_triangles=False)
    sets = [set(p) for p in polys]
    return {(i, j) if i < j else (j, i) for i, j in tree.overlap(tree) if i != j and not (sets[i] & sets[j])}


def color_attr(me, name, rgb_per_poly):
    if name in me.color_attributes:
        me.color_attributes.remove(me.color_attributes[name])
    at = me.color_attributes.new(name, 'BYTE_COLOR', 'CORNER')
    cols = np.repeat(rgb_per_poly, [len(p.vertices) for p in me.polygons], axis=0)
    at.data.foreach_set('color', np.c_[cols, np.ones(len(cols))].ravel())
    me.color_attributes.active_color = at
    return at


def distortion_colors(ratio):
    gray, blue, amber = np.array([0.62, 0.62, 0.62]), np.array([0.05, 0.25, 0.95]), np.array([1.0, 0.62, 0.05])
    lr = np.log2(np.maximum(ratio, 1e-6))
    t = np.clip((np.abs(lr)-1.0)/1.0, 0, 1)[:, None]
    tgt = np.where((lr < 0)[:, None], blue, amber)
    return gray*(1-t)+tgt*t


def setup_render(out_size=900):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x = sc.render.resolution_y = out_size
    sc.render.film_transparent = True
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.show_cavity = False
    sc.view_settings.view_transform = 'Standard'
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = FRAME['scale']
    co = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    return co


def render(co, view, path, mode, cavity=False):
    sc = bpy.context.scene
    sc.display.shading.show_cavity = cavity
    if cavity:                                         # the curvature look: ridges light, valleys dark
        sc.display.shading.cavity_type = 'BOTH'
        sc.display.shading.curvature_ridge_factor = 2.0
        sc.display.shading.curvature_valley_factor = 2.0
        sc.display.shading.cavity_ridge_factor = 2.0
        sc.display.shading.cavity_valley_factor = 2.0
    d = Vector(VIEWS[view]).normalized()
    c = Vector(FRAME['center'])
    co.location = c+d*2.0
    co.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    sh = sc.display.shading
    sh.color_type = mode
    sh.single_color = (0.78, 0.74, 0.7)
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def flag_colors(ratio, bad_faces, n):
    """Audit flags per face: crushed blue, stretched amber (as distortion_colors), self-intersecting near black."""
    cols = distortion_colors(ratio)
    for i in bad_faces:
        cols[i] = (0.03, 0.03, 0.03)
    return cols


def check_limits(spec, steps):
    """Per bone and world axis, the pose's total rotation against the skeleton file's plausibility limits
    (degrees, from real-animal reference). Returns the violations."""
    lim = spec.get('limits', {})
    total = {}
    for bone, axis, deg in steps:
        if axis == 'move':
            continue
        key = bone[:-2] if bone[-2:] in ('_L', '_R') else bone
        total[(bone, key, axis[-1])] = total.get((bone, key, axis[-1]), 0.0)+deg
    out = []
    for (bone, key, axis), deg in total.items():
        rng = lim.get(key, {}).get(axis)
        if rng and not rng[0] <= deg <= rng[1]:
            out.append({'bone': bone, 'axis': axis, 'degrees': deg, 'limit': rng, 'source': lim.get(key, {}).get('source', '')})
    return out


def bone_sticks(rig):
    bm = bmesh.new()
    for pb in rig.pose.bones:
        h, t = rig.matrix_world @ pb.head, rig.matrix_world @ pb.tail
        ln = (t-h).length
        mat = Matrix.Translation(h) @ (t-h).to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Translation((0, 0, ln/2))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.006, radius2=0.003, depth=ln, matrix=mat)
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.007, matrix=Matrix.Translation(h))
    me = bpy.data.meshes.new('sticks')
    bm.to_mesh(me)
    ob = bpy.data.objects.new('sticks', me)
    ob.color = (1.0, 0.55, 0.0, 1)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def main():
    a = args()
    t0 = time.time()
    a.out.mkdir(parents=True, exist_ok=True)
    (a.out/'renders').mkdir(exist_ok=True)
    spec = json.loads(a.skeleton.read_text())
    bpy.ops.wm.open_mainfile(filepath=str(a.build/'blockout.blend'))
    skin = bpy.data.objects['skin']
    dense_bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
    separate = [o for o in bpy.data.objects if o.name != 'skin' and o.type == 'MESH']
    dense = None
    if a.dense:
        dense = skin.copy()
        dense.data = skin.data.copy()
        dense.name = 'dense'
        bpy.context.scene.collection.objects.link(dense)
    body, method = retopo(skin, a.retopo, a.faces, a.voxel)
    if skin.name in bpy.data.objects:
        bpy.data.objects.remove(skin)
    rig, bones, snapped = build_armature(spec, dense_bvh)
    joints = {}
    shafts = {}
    for b in bones:
        joints[b['name']+'.head'] = depth(dense_bvh, b['head'])
        joints[b['name']+'.tail'] = depth(dense_bvh, b['tail'])
        # the whole shaft, not only its ends: a bone can leave the skin between two joints that are inside it
        # (audit-9: the shin crossed the air notch under the haunch with both ends inside)
        h, t = np.array(b['head'], float), np.array(b['tail'], float)
        out = [depth(dense_bvh, (h+(t-h)*f).tolist()) for f in np.linspace(0.1, 0.9, 9)]
        worst = max((d for d in out if d is not None), default=None)
        if worst is not None and worst > 0:
            shafts[b['name']] = round(float(worst), 4)
    wmode = weights(body, rig, a.weights_from)
    cleaned = None
    if a.weights_from is None and a.clean_margin > 0:
        cleaned = clean_weights(body, bones, a.clean_margin)
        wmode += f', cleaned (margin {a.clean_margin*100:.1f} cm, {100*cleaned:.1f}% of vertices changed)'
    if dense is not None:
        body = carry_weights(body, dense, rig)
        method += ' proxy; posed on the build skin'
        wmode += ', carried to the build skin by nearest face'
        if a.weights_from is None and a.clean_margin > 0:
            # cleaned again on the build skin: where the proxy closed a gap thinner than its voxel (the corners of
            # an open mouth), nearest-face carrying hands one lip the other lip's weights (audit-7: a torn upper lip)
            clean_weights(body, bones, a.clean_margin, smooth=a.smooth)
            wmode += f' and cleaned there again after {a.smooth} smoothing passes'
    for o in separate:
        bone = spec.get('separate', {}).get(o.name)
        if bone:
            mw = o.matrix_world.copy()
            o.parent, o.parent_type, o.parent_bone = rig, 'BONE', bone
            o.matrix_world = mw
    names = [b['name'] for b in bones]
    chains = [chain_of(b) for b in bones]
    W = weight_matrix(body, names)
    polys = [list(p.vertices) for p in body.data.polygons]
    unweighted = int((W.sum(axis=1) < 1e-6).sum())

    # bleed: weight above BLEED from two non-core chains
    uniq = sorted(set(chains)-{'core'})
    CW = np.stack([W[:, [i for i, c in enumerate(chains) if c == u]].sum(axis=1) for u in uniq], axis=1)
    hot = CW > BLEED
    bleed_mask = hot.sum(axis=1) >= 2
    pairs = {}
    for vi in np.nonzero(bleed_mask)[0]:
        cs = [uniq[k] for k in np.nonzero(hot[vi])[0]]
        for i in range(len(cs)):
            for j in range(i+1, len(cs)):
                key = f'{cs[i]}+{cs[j]}'
                pairs[key] = pairs.get(key, 0)+1
    dominant_poly = []
    allchains = sorted(set(chains))
    CWall = np.stack([W[:, [i for i, c in enumerate(chains) if c == u]].sum(axis=1) for u in allchains], axis=1)
    for p in polys:
        dominant_poly.append(allchains[int(CWall[p].sum(axis=0).argmax())])
    dominant_poly = np.array(dominant_poly)

    co = setup_render()
    rest_v, rest_a = evaluated(body)
    rest_pairs = overlaps(rest_v, polys)
    total = rest_a.sum()
    sticks = bone_sticks(rig)
    others = [o for o in bpy.data.objects if o.type == 'MESH' and o != sticks]
    for o in others:
        o.hide_render = True
    for view in ('side', 'front', 'threequarter'):
        render(co, view, a.out/'renders'/f'bones-{view}.png', 'OBJECT')
    for o in others:
        o.hide_render = False
    bpy.data.objects.remove(sticks)
    color_attr(body.data, 'bleed', np.where(bleed_mask[np.array([p[0] for p in polys])][:, None],
                                            np.array([1.0, 0.62, 0.05]), np.array([0.62, 0.62, 0.62])))
    for view in ('side', 'front'):
        render(co, view, a.out/'renders'/f'bleed-{view}.png', 'VERTEX')

    results = {}
    for pname, steps in spec['poses'].items():
        pose(rig, bones, steps)
        v, ar = evaluated(body)
        ratio = ar/np.maximum(rest_a, 1e-12)
        crushed, stretched = ratio < CRUSH, ratio > STRETCH
        new_pairs = overlaps(v, polys)-rest_pairs
        bad_faces = set(i for pr in new_pairs for i in pr)
        where = {}
        for i in np.nonzero(crushed | stretched)[0]:
            where[dominant_poly[i]] = where.get(dominant_poly[i], 0.0)+float(rest_a[i]/total)
        hit = {}
        for i in bad_faces:
            hit[dominant_poly[i]] = hit.get(dominant_poly[i], 0)+1
        results[pname] = {
            'crushedShare': float(rest_a[crushed].sum()/total), 'stretchedShare': float(rest_a[stretched].sum()/total),
            'distortedByChain': {k: round(x, 5) for k, x in sorted(where.items(), key=lambda kv: -kv[1])},
            'newIntersectingPairs': len(new_pairs),
            'intersectingFacesByChain': dict(sorted(hit.items(), key=lambda kv: -kv[1])),
            'p95AreaChange': float(np.percentile(np.abs(np.log2(np.maximum(ratio, 1e-6))), 95)),
        }
        results[pname]['limitViolations'] = check_limits(spec, steps)
        low = int(np.argmin(v[:, 2]))
        results[pname]['lowestZ'] = float(v[low, 2])           # below -0.005 is a limb through the floor
        results[pname]['lowestChain'] = allchains[int(CWall[low].argmax())]
        print(pname, json.dumps(results[pname]), flush=True)
        color_attr(body.data, 'distort', flag_colors(ratio, bad_faces, len(polys)) if a.audit else distortion_colors(ratio))
        for view in (AUDIT_VIEWS if a.audit else ('side', 'threequarter', 'front')):
            render(co, view, a.out/'renders'/f'{pname}-{view}.png', 'SINGLE')
            render(co, view, a.out/'renders'/f'{pname}-distort-{view}.png', 'VERTEX')
            if a.audit:
                render(co, view, a.out/'renders'/f'{pname}-curvature-{view}.png', 'SINGLE', cavity=True)
    pose(rig, bones, [])
    for view in (AUDIT_VIEWS if a.audit else ('side', 'threequarter', 'front')):
        render(co, view, a.out/'renders'/f'rest-{view}.png', 'SINGLE')
        if a.audit:
            render(co, view, a.out/'renders'/f'rest-curvature-{view}.png', 'SINGLE', cavity=True)
    if a.audit:                                        # the setup check: bones over the rest mesh, every side
        sticks = bone_sticks(rig)
        others = [o for o in bpy.data.objects if o.type == 'MESH' and o != sticks]
        for o in others:
            o.hide_render = True
        for view in ('side-right', 'back', 'top', 'threequarter-right'):
            render(co, view, a.out/'renders'/f'bones-{view}.png', 'OBJECT')
        for o in others:
            o.hide_render = False
        bpy.data.objects.remove(sticks)

    m = {'label': a.label, 'build': str(a.build), 'skeleton': str(a.skeleton), 'retopo': method,
         'vertices': len(body.data.vertices), 'faces': len(polys), 'weights': wmode, 'unweightedVertices': unweighted,
         'restIntersectingPairs': len(rest_pairs), 'jointSnapMeters': snapped,
         'jointDepthMeters': joints, 'jointsOutsideSkin': sorted(k for k, d in joints.items() if d is not None and d > 0),
         'shaftsOutsideSkin': shafts,
         'bleedVertices': int(bleed_mask.sum()), 'bleedShare': float(bleed_mask.mean()),
         'bleedByPair': dict(sorted(pairs.items(), key=lambda kv: -kv[1])), 'poses': results,
         'thresholds': {'crush': CRUSH, 'stretch': STRETCH, 'bleed': BLEED}, 'minutes': (time.time()-t0)/60}
    (a.out/'metrics.json').write_text(json.dumps(m, indent=1), encoding='utf-8')
    for o in [o for o in bpy.data.objects if o.type == 'CAMERA']:
        bpy.data.objects.remove(o)
    bpy.ops.wm.save_as_mainfile(filepath=str(a.out/'rigged.blend'))
    print('done', f"{m['minutes']:.1f} min", flush=True)


main()

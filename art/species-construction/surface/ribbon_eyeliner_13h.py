"""External matte lid ribbons, fitted to the saved eye's visible outline."""
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

PREFIX = 'Akinza G1 ribbon '


def sparse_caps():
    """Retained build 2 control-point caps, without rebuilding any curves."""
    fur = bpy.data.objects['Akinza fur'].data
    points = np.empty(len(fur.points)*3, np.float32)
    fur.attributes['position'].data.foreach_get('vector', points)
    points = points.reshape(-1, 3)
    radius = np.empty(len(fur.points), np.float32)
    fur.attributes['radius'].data.foreach_get('value', radius)
    original = radius.copy()
    angle = np.deg2rad(2.)
    up = np.array((0., np.sin(angle), np.cos(angle)))
    projected = np.column_stack((points[:, 0], points@up))
    for ob in [o for o in bpy.data.objects if o.name.startswith(PREFIX)]:
        rows = np.array([v.co[:] for v in ob.data.vertices]).reshape(1024, 9, 3)
        inner = np.column_stack((rows[:, 0, 0], rows[:, 0]@up))
        outer = np.column_stack((rows[:, -1, 0], rows[:, -1]@up))
        outward = outer-inner
        width = np.linalg.norm(outward, axis=1)
        outward /= width[:, None]
        tree = KDTree(len(inner))
        for i, p in enumerate(inner):tree.insert(Vector((*p, 0)), i)
        tree.balance()
        eye = bpy.data.objects[ob.name[len(PREFIX):]]
        center_y = float(np.mean([v.co.y for v in eye.data.vertices]))
        margin = float(width.max())+.004
        lo, hi = inner.min(0)-margin, inner.max(0)+margin
        ids = np.where(((projected>lo)&(projected<hi)).all(1)&(points[:, 1]<center_y))[0]
        for i in ids:
            _, j, _ = tree.find(Vector((*projected[i], 0)))
            d = np.dot(projected[i]-inner[j], outward[j])
            if -radius[i]-.00008 < d < width[j]+radius[i]+.00008:
                radius[i] = min(radius[i], max(0, max(-d, d-width[j], 0)-.000025))
    fur.attributes['radius'].data.foreach_set('value', radius)
    changed = np.where(radius != original)[0]
    return dict(changedPoints=changed, originalRadius=original[changed])


def build(experimental_dense=False):
    skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    skin_tree = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
    elevation = np.deg2rad(2.)
    toward = np.array((0., -np.cos(elevation), np.sin(elevation)))
    up = np.array((0., np.sin(elevation), np.cos(elevation)))

    def projection(p):
        return np.column_stack((p[:, 0], p @ up))

    def front(bvh, uv):
        origin = np.array((uv[0], 0., 0.)) + up*uv[1] + toward*2
        return bvh.ray_cast(Vector(origin), Vector(-toward), 4)
    mat = bpy.data.materials.get('G1 ribbon charcoal') or bpy.data.materials.new('G1 ribbon charcoal')
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (.018, .018, .018, 1)
    bs.inputs['Roughness'].default_value = .58
    fur_ob = bpy.data.objects['Akinza fur']
    if not fur_ob.data.attributes.get('radius') and fur_ob.modifiers:
        # Fresh construction surfaces still carry evaluated geometry nodes.
        # Materialize only this render's coat before applying local radii.
        evaluated = fur_ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.copy()
        fur_ob.modifiers.clear()
        fur_ob.data = evaluated
    records = []
    for eye in [o for o in bpy.data.objects if o.name.startswith('head_eye_globe_')]:
        box = np.array([v.co[:] for v in eye.data.vertices])
        tree = BVHTree.FromObject(eye, bpy.context.evaluated_depsgraph_get())
        projected_box = projection(box)
        c2 = (projected_box.min(0)+projected_box.max(0))/2
        theta = np.linspace(-np.pi, np.pi, 1024, endpoint=False)
        limit = float(np.linalg.norm(projected_box.max(0)-projected_box.min(0)))
        contour = []
        for angle in theta:
            direction = np.array((np.cos(angle), np.sin(angle)))
            low, high = 0., limit
            last = None
            for _ in range(24):
                distance = (low+high)/2
                uv = c2 + direction*distance
                eh, sh = front(tree, uv), front(skin_tree, uv)
                visible = eh[0] is not None and (sh[0] is None or eh[3] < sh[3])
                if visible:
                    low, last = distance, np.array(eh[0])
                else:
                    high = distance
            assert last is not None, 'Eye center is not visible from the close camera'
            contour.append(last)
        contour = np.array(contour)
        # Remove submillimeter triangulation noise without changing the outline.
        for _ in range(5):
            contour = (np.roll(contour, 1, axis=0) + 2*contour + np.roll(contour, -1, axis=0)) / 4
        projected = projection(contour)
        tangent = np.roll(projected, -1, axis=0) - np.roll(projected, 1, axis=0)
        outward2 = np.column_stack((tangent[:, 1], -tangent[:, 0]))
        outward2 /= np.linalg.norm(outward2, axis=1)[:, None]
        outward = np.column_stack((outward2[:, 0], np.zeros(len(theta)), np.zeros(len(theta)))) + outward2[:, 1, None]*up
        outward /= np.linalg.norm(outward, axis=1)[:, None]
        # Counterclockwise image-plane traversal has this outward normal.
        assert np.mean(np.sum(outward2 * (projected-c2), axis=1)) > 0
        upper = np.clip((np.sin(theta) + .18) / .48, 0, 1)
        upper = upper*upper*(3-2*upper)
        outer = np.clip((abs(contour[:, 0]) - .0847464) / .067866, 0, 1)
        # A's widest visible band is about 35 pixels at the .20 m / 1000 px
        # close camera. Its signed surface-distance threshold is not a
        # projected width, so measure this external strip in the image plane.
        width = .00035*(1-upper) + .0075*(.85+.15*outer)*upper
        rows = []
        for p, n, w in zip(contour, outward, width):
            row = []
            for f in np.linspace(0, 1, 9):
                q = p + n*(.000025 + w*f)
                uv = projection(q[None])[0]
                depths = []
                for bvh in (skin_tree, tree):
                    hit = front(bvh, uv)
                    if hit[0] is not None:
                        depths.append(np.dot(np.array(hit[0]), toward))
                depth = max(depths) if depths else np.dot(p, toward)
                q = np.array((uv[0], 0., 0.)) + up*uv[1] + toward*(depth+.00015)
                row.append(q)
            rows.append(row)
        vertices = np.array(rows)
        faces = [(i*9+j, ((i+1)%len(theta))*9+j, ((i+1)%len(theta))*9+j+1, i*9+j+1)
                 for i in range(len(theta)) for j in range(8)]
        mesh = bpy.data.meshes.new(PREFIX + eye.name)
        mesh.from_pydata(vertices.reshape(-1, 3).tolist(), [], faces)
        mesh.materials.append(mat)
        ob = bpy.data.objects.new(PREFIX + eye.name, mesh)
        bpy.context.scene.collection.objects.link(ob)
        for p in mesh.polygons:
            p.use_smooth = True
        records.append(dict(eye=eye.name, contourSamples=len(contour), widthMin=float(width.min()),
                            widthMax=float(width.max())))
    if not experimental_dense:
        return records, sparse_caps()
    # Attempt 3 crashed during serialization. This path is retained for
    # diagnosis and requires explicit opt-in; it is not the default builder.
    from clip_ribbon_fur_13h import clip, edge_fur
    patch, trees = clip()
    patch.update(edge_fur(trees))
    return records, patch


def apply():
    """Select saved ribbons and remove the inherited painted band."""
    from eyeliner_styles import remove_outer
    remove_outer()
    for ob in bpy.data.objects:
        if ob.name.startswith(PREFIX):
            ob.hide_render = False
    mat = bpy.data.materials['Upper emphasized eyelid']
    t = mat.node_tree
    t.nodes.clear()
    bs = t.nodes.new('ShaderNodeBsdfPrincipled')
    source = bpy.data.materials['Ocular white'].node_tree.nodes.get('Principled BSDF')
    for name in ('Base Color', 'Roughness', 'Coat Weight', 'Coat Roughness'):
        bs.inputs[name].default_value = source.inputs[name].default_value
    output = t.nodes.new('ShaderNodeOutputMaterial')
    t.links.new(bs.outputs[0], output.inputs['Surface'])
    skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    for sm in skin.data.materials:
        t = sm.node_tree
        for node in t.nodes:
            if node.bl_idname == 'ShaderNodeMath' and node.operation == 'MAXIMUM' and node.inputs[1].is_linked:
                src = node.inputs[1].links[0].from_node
                if src.bl_idname == 'ShaderNodeMapRange' and src.inputs['Value'].is_linked and getattr(src.inputs['Value'].links[0].from_node, 'attribute_name', '') == 'eyed':
                    t.links.remove(node.inputs[1].links[0])
                    node.inputs[1].default_value = 0

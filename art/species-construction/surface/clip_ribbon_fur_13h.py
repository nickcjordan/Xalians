"""Clip finite-width hair segments against the three actual ribbon projections."""
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

PREFIX = 'Akinza G1 ribbon '
EDGE_FUR = 'Akinza eyelid edge fur 13h'


def values(attribute):
    types = {'FLOAT': (1, 'value', np.float32), 'FLOAT_VECTOR': (3, 'vector', np.float32),
             'INT': (1, 'value', np.int32), 'INT8': (1, 'value', np.int32), 'BOOLEAN': (1, 'value', np.int32),
             'FLOAT_COLOR': (4, 'color', np.float32), 'BYTE_COLOR': (4, 'color', np.float32)}
    width, field, dtype = types[attribute.data_type]
    data = np.empty(len(attribute.data)*width, dtype)
    attribute.data.foreach_get(field, data)
    return data.reshape(-1, width), field


def projectors():
    result = []
    for ob in [o for o in bpy.data.objects if o.name.startswith(PREFIX)]:
        mesh = ob.data
        mesh.calc_loop_triangles()
        points = np.array([v.co[:] for v in mesh.vertices])
        base_triangles = np.array([t.vertices[:] for t in mesh.loop_triangles])
        world = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
        for azimuth, elevation in [(0, 2), (0, 3), (35, 8)]:
            triangles = base_triangles
            az, el = np.deg2rad((azimuth, elevation))
            toward = np.array((np.sin(az)*np.cos(el), -np.cos(az)*np.cos(el), np.sin(el)))
            right = np.array((np.cos(az), np.sin(az), 0.))
            up = np.cross(toward, right)
            projected = np.column_stack((points@right, points@up, np.zeros(len(points))))
            tri = projected[triangles, :2]
            u, v = tri[:, 1]-tri[:, 0], tri[:, 2]-tri[:, 0]
            area = u[:, 0]*v[:, 1]-u[:, 1]*v[:, 0]
            triangles = triangles[abs(area)>1e-13]
            tree = BVHTree.FromPolygons(projected.tolist(), triangles.tolist(), all_triangles=True)
            result.append((tree, world, right, up, toward, points[triangles], projected[triangles, :2]))
    return result


def limit(path, radius, trees):
    clipped = radius.copy()
    for tree, world, right, up, toward, tri3, tri2 in trees:
        uv = np.column_stack((path@right, path@up))
        depths = path@toward
        for i, p in enumerate(uv):
            r = float(clipped[i])
            if r <= 0:
                continue
            near, _, face, distance = tree.find_nearest(Vector((*p, 0)), r+.0001)
            if near is None:
                continue
            near2 = np.array(near)[:2]
            origin = right*near2[0]+up*near2[1]+toward*2
            hit = world.ray_cast(Vector(origin), Vector(-toward), 4)
            if hit[0] is not None:
                depth = np.dot(np.array(hit[0]), toward)
            else:
                a, b, c = tri2[face]
                weights = np.linalg.solve(np.column_stack((b-a, c-a)), near2-a)
                p3 = tri3[face, 0]+weights[0]*(tri3[face, 1]-tri3[face, 0])+weights[1]*(tri3[face, 2]-tri3[face, 0])
                depth = np.dot(p3, toward)
            if depths[i]+r >= depth-.00001:
                clipped[i] = min(r, max(0, distance-.000075))
    return clipped


def guard(path, radius, trees):
    """Also cap interpolated segment envelopes, before any final save."""
    radius = limit(path, radius, trees)
    for _ in range(8):
        mid = (path[:-1]+path[1:])/2
        r = (radius[:-1]+radius[1:])/2
        capped = limit(mid, r, trees)
        bad = r-capped > .000001
        if not bad.any():
            return radius
        factor = np.ones(len(radius))
        scale = np.clip(capped[bad]/np.maximum(r[bad], 1e-15), 0, 1)
        ids = np.where(bad)[0]
        np.minimum.at(factor, ids, scale)
        np.minimum.at(factor, ids+1, scale)
        radius *= factor
    assert np.max((radius[:-1]+radius[1:])/2-limit((path[:-1]+path[1:])/2, (radius[:-1]+radius[1:])/2, trees)) <= .000001
    return radius


def clip():
    ob = bpy.data.objects['Akinza fur']
    old = ob.data
    points = values(old.attributes['position'])[0]
    radius = values(old.attributes['radius'])[0][:, 0]
    starts = np.empty(len(old.curves), np.int32)
    old.curves.foreach_get('first_point_index', starts)
    counts = np.diff(np.r_[starts, len(points)])
    low = np.minimum.reduceat(points, starts)
    high = np.maximum.reduceat(points, starts)
    candidate = np.zeros(len(starts), bool)
    for ribbon in [o for o in bpy.data.objects if o.name.startswith(PREFIX)]:
        box = np.array([v.co[:] for v in ribbon.data.vertices])
        candidate |= (high >= box.min(0)-.005).all(1) & (low <= box.max(0)+.005).all(1)
    trees = projectors()
    extra_low, extra_high, extra_t, extra_radius = [], [], [], []
    changed = np.zeros(len(starts), bool)
    new_counts = counts.copy()
    radius_changes = {}
    for curve in np.where(candidate)[0]:
        s, n = int(starts[curve]), int(counts[curve])
        source, target, weight = [], [], []
        for i in range(s, s+n-1):
            subdivisions = max(1, int(np.ceil(np.linalg.norm(points[i+1]-points[i])/.000075)))
            for t in np.linspace(0, 1, subdivisions, endpoint=False):
                source.append(i)
                target.append(i+1)
                weight.append(float(t))
        source.append(s+n-1)
        target.append(s+n-1)
        weight.append(0.)
        source, target, weight = np.array(source), np.array(target), np.array(weight, np.float32)
        sampled = points[source]*(1-weight[:, None])+points[target]*weight[:, None]
        sampled_radius = radius[source]*(1-weight)+radius[target]*weight
        clipped = guard(sampled, sampled_radius, trees)
        if not np.any(clipped < sampled_radius-1e-10):
            continue
        changed[curve] = True
        new_counts[curve] = len(sampled)
        for lo, hi, t, r in zip(source, target, weight, clipped):
            if t == 0:
                if r < radius[lo]:
                    radius_changes[int(lo)] = float(r)
            else:
                extra_low.append(lo)
                extra_high.append(hi)
                extra_t.append(t)
                extra_radius.append(r)
    extra_low = np.array(extra_low, np.int32)
    extra_high = np.array(extra_high, np.int32)
    extra_t = np.array(extra_t, np.float32)
    # Stable insertion order retains every original point bit for bit.
    source_low = np.r_[np.arange(len(points)), extra_low]
    source_high = np.r_[np.arange(len(points)), extra_high]
    fraction = np.r_[np.zeros(len(points), np.float32), extra_t]
    order = np.lexsort((fraction, source_low))
    source_low, source_high, fraction = source_low[order], source_high[order], fraction[order]
    point_map = np.empty(len(points), np.int32)
    original_slots = np.where(fraction == 0)[0]
    point_map[source_low[original_slots]] = original_slots
    assert len(source_low) == int(new_counts.sum())
    new = bpy.data.hair_curves.new('Akinza segment clipped lid fur')
    new.add_curves(new_counts.tolist())
    for a in old.attributes:
        data, field = values(a)
        result = data
        if a.domain == 'POINT':
            if data.dtype.kind == 'f':
                result = data[source_low]*(1-fraction[:, None])+data[source_high]*fraction[:, None]
                result[original_slots] = data[source_low[original_slots]]
            else:
                result = data[np.where(fraction<.5, source_low, source_high)]
        attr = new.attributes.get(a.name) or new.attributes.new(a.name, a.data_type, a.domain)
        attr.data.foreach_set(field, result.astype(data.dtype).ravel())
    clipped_radius = values(new.attributes['radius'])[0][:, 0]
    changed_points = np.array(list(radius_changes), np.int32)
    for i, r in radius_changes.items():
        clipped_radius[point_map[i]] = r
    inserted_slots = np.where(fraction > 0)[0]
    # extra arrays were recorded in source order; apply the same stable sort.
    extra_order = order[order >= len(points)]-len(points)
    clipped_radius[inserted_slots] = np.array(extra_radius, np.float32)[extra_order]
    new.attributes['radius'].data.foreach_set('value', clipped_radius)
    curve_type = new.attributes.get('curve_type') or new.attributes.new('curve_type', 'INT8', 'CURVE')
    spline_types = np.zeros(len(starts), np.int32)
    if old.attributes.get('curve_type'):
        spline_types = values(old.attributes['curve_type'])[0][:, 0]
    spline_types[changed] = 1
    if old.attributes.get('curve_type'):
        assert np.all(values(old.attributes['curve_type'])[0][changed] == 1), 'Affected native hairs must already be poly'
    curve_type.data.foreach_set('value', spline_types)
    for mat in old.materials:
        new.materials.append(mat)
    for key in old.keys():
        new[key] = old[key]
    ob.data = new
    print('EXACT_RIBBON_CLIP', int(changed.sum()), 'curves', len(extra_low), 'inserted points', flush=True)
    return dict(changedPoints=changed_points, originalRadius=radius[changed_points],
                pointMap=point_map, sourceLow=source_low[inserted_slots],
                sourceHigh=source_high[inserted_slots], fraction=fraction[inserted_slots],
                insertedSlots=inserted_slots, originalStarts=starts, changedCurves=changed,
                originalCounts=counts, originalHadCurveType=np.array(bool(old.attributes.get('curve_type')))), trees


def edge_fur(trees):
    """Fill only exposed lower-lid skin that has no nearby native hair roots."""
    native = bpy.data.objects['Akinza fur'].data
    points = values(native.attributes['position'])[0]
    starts = np.empty(len(native.curves), np.int32)
    native.curves.foreach_get('first_point_index', starts)
    radius = values(native.attributes['radius'])[0][:, 0]
    active = np.maximum.reduceat(radius, starts) > 0
    ids = np.where(active)[0]
    root_tree = KDTree(len(ids))
    for j, i in enumerate(ids):
        root_tree.insert(Vector(points[starts[i]]), j)
    root_tree.balance()
    skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    skin_tree = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
    angle = np.deg2rad(2.)
    toward = np.array((0., -np.cos(angle), np.sin(angle)))
    up = np.array((0., np.sin(angle), np.cos(angle)))
    rng = np.random.default_rng(13008)
    paths, radii, nearest, normals = [], [], [], []

    def front(tree, uv):
        origin = np.array((uv[0], 0., 0.))+up*uv[1]+toward*2
        return tree.ray_cast(Vector(origin), Vector(-toward), 4)

    for ribbon in [o for o in bpy.data.objects if o.name.startswith(PREFIX)]:
        rows = np.array([v.co[:] for v in ribbon.data.vertices]).reshape(1024, 9, 3)
        edge = rows[:, -1]
        inner = rows[:, 0]
        uv = np.column_stack((edge[:, 0], edge@up))
        inside = np.column_stack((inner[:, 0], inner@up))
        outward = uv-inside
        outward /= np.linalg.norm(outward, axis=1)[:, None]
        eye = bpy.data.objects[ribbon.name[len(PREFIX):]]
        eye_tree = BVHTree.FromObject(eye, bpy.context.evaluated_depsgraph_get())
        for i in range(0, 512, 3):
            direction = outward[i]
            tangent = np.array((-direction[1], direction[0]))
            for offset in np.arange(.00075, .0053, .0011):
                root_uv = uv[i]+direction*(offset+rng.uniform(-.00006, .00006))+tangent*rng.uniform(-.0002, .0002)
                hit, eye_hit = front(skin_tree, root_uv), front(eye_tree, root_uv)
                if hit[0] is None or (eye_hit[0] is not None and eye_hit[3] <= hit[3]):
                    continue
                root = np.array(hit[0])
                _, index, distance = root_tree.find(Vector(root))
                if distance < .0010:
                    continue
                path = []
                length = rng.uniform(.0019, .0027)
                wiggle = rng.uniform(-.00018, .00018)
                for t in np.linspace(0, 1, 9):
                    q = root_uv+direction*(length*t)+tangent*(wiggle*np.sin(np.pi*t))
                    surface = front(skin_tree, q)
                    if surface[0] is None:
                        break
                    path.append(np.array(surface[0])+toward*(.00003+.00055*np.sin(np.pi*t/2)))
                if len(path) != 9:
                    continue
                path = np.array(path)
                arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
                if arc[-1] > .006:
                    continue
                sample = np.linspace(0, arc[-1], max(9, int(np.ceil(arc[-1]/.000075))+1))
                path = np.column_stack([np.interp(sample, arc, path[:, k]) for k in range(3)])
                t = sample/arc[-1]
                r = rng.uniform(.00056, .00065)*(1-t)**1.25+.000001
                r = guard(path.astype(np.float32), r.astype(np.float32), trees)
                if not np.any(r > .00005):
                    continue
                paths.append(path)
                radii.append(r)
                nearest.append(ids[index])
                normals.append(np.array(hit[1]))
    if not paths:
        return dict(edgePoints=np.empty((0, 3), np.float32), edgeRadius=np.empty(0, np.float32), edgeStarts=np.empty(0, np.int32))
    counts = np.array([len(p) for p in paths])
    first = np.r_[0, np.cumsum(counts)[:-1]]
    nearest = np.array(nearest)
    roots = np.array([p[0] for p in paths], np.float32)
    data = bpy.data.hair_curves.new(EDGE_FUR)
    data.add_curves(counts.tolist())
    for a in native.attributes:
        if a.name in ('position', 'radius', 'curve_type'):
            continue
        source, field = values(a)
        result = source[nearest] if a.domain == 'CURVE' else np.repeat(source[starts[nearest]], counts, axis=0)
        if a.name in ('root', 'rest'):
            result = roots if a.domain == 'CURVE' else np.repeat(roots, counts, axis=0)
        elif a.name == 'pale':
            result = np.ones_like(result)
        elif a.name in ('cupm', 'pmask', 'ptail', 'earw'):
            result = np.zeros_like(result)
        elif a.name == 'nrm':
            result = np.array(normals) if a.domain == 'CURVE' else np.repeat(normals, counts, axis=0)
        elif a.name in ('strlen', 'fur_length'):
            lengths = np.array([np.linalg.norm(np.diff(p, axis=0), axis=1).sum() for p in paths])[:, None]
            result = lengths if a.domain == 'CURVE' else np.repeat(lengths, counts, axis=0)
        attr = data.attributes.get(a.name) or data.attributes.new(a.name, a.data_type, a.domain)
        attr.data.foreach_set(field, result.astype(source.dtype).ravel())
    all_points = np.concatenate(paths).astype(np.float32)
    all_radius = np.concatenate(radii).astype(np.float32)
    data.attributes['position'].data.foreach_set('vector', all_points.ravel())
    attr = data.attributes.get('radius') or data.attributes.new('radius', 'FLOAT', 'POINT')
    attr.data.foreach_set('value', all_radius)
    attr = data.attributes.get('curve_type') or data.attributes.new('curve_type', 'INT8', 'CURVE')
    attr.data.foreach_set('value', np.ones(len(paths), np.int32))
    data.materials.append(bpy.data.materials['Akinza hair'])
    ob = bpy.data.objects.new(EDGE_FUR, data)
    bpy.context.scene.collection.objects.link(ob)
    print('LOWER_LID_EDGE_FUR', len(paths), 'short hairs on visible skin gaps', flush=True)
    return dict(edgePoints=all_points, edgeRadius=all_radius, edgeStarts=first.astype(np.int32))

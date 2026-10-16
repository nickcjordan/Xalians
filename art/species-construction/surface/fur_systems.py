"""Read every visible coat system declared by a saved surface manifest."""
import json
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree


def systems(surface):
    info = json.loads((surface / 'surface-info.json').read_text())
    names = ['Akinza fur', *info.get('additionalFurObjects', [])]
    return [bpy.data.objects[name].evaluated_get(bpy.context.evaluated_depsgraph_get()).data for name in names]


def paths(surface):
    points, starts, radius = [], [], []
    offset = 0
    for cu in systems(surface):
        p = np.empty(len(cu.points) * 3, np.float32)
        cu.points.foreach_get('position', p)
        s = np.empty(len(cu.curves), np.int32)
        cu.curves.foreach_get('first_point_index', s)
        r = np.empty(len(cu.attributes['radius'].data), np.float32)
        cu.attributes['radius'].data.foreach_get('value', r)
        assert len(r) == len(cu.points)
        points.append(p.reshape(-1, 3))
        starts.append(s + offset)
        radius.append(r)
        offset += len(cu.points)
    return np.concatenate(points), np.concatenate(starts), np.concatenate(radius)


def append_evidence(surface, data):
    all_systems = systems(surface)
    if len(all_systems) == 1:
        return
    points, starts, _ = paths(surface)
    original = len(data['starts'])
    extra_roots = points[starts[original:]]
    tree = KDTree(len(data['co']))
    for i, p in enumerate(data['co']):
        tree.insert(Vector(p), i)
    tree.balance()
    nearest = np.array([tree.find(Vector(p))[1] for p in extra_roots])
    for key in ('curve_nrm', 'curve_combp', 'curve_comb_flow'):
        if key not in data:
            continue
        if key == 'curve_nrm':
            extra = data['normal'][nearest]
        elif key == 'curve_combp':
            extra = points[starts[original:] + 1] - extra_roots
        else:
            extra = np.ones(len(extra_roots), np.float32)
        data[key] = np.concatenate([data[key], extra])
    data.update(points=points, starts=starts, roots=points[starts], first=points[starts + 1] - points[starts])

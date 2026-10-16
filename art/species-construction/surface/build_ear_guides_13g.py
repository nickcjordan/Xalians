"""Dedicated designed canal guides and children, with a graded ear-tip finish."""
import sys
import json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
CHILDREN_PER_EAR = 1100
sys.path.insert(0, str(HERE))
from refine_ear_root_12b2 import values

before, out, archive = map(Path, sys.argv[sys.argv.index('--') + 1:])
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(before / 'surface.blend'))
bpy.context.preferences.filepaths.save_version = 0
info = json.loads((before / 'surface-info.json').read_text())
skin = bpy.data.objects[info['skin']]
bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
co = values(skin.data, 'position', 'vector', 3)
normal = np.empty(co.size, np.float32)
skin.data.vertex_normals.foreach_get('vector', normal)
normal = normal.reshape(-1, 3)
tree = KDTree(len(co))
for i, q in enumerate(co):
    tree.insert(Vector(q), i)
tree.balance()
fur = bpy.data.objects['Akinza fur'].data
starts = np.empty(len(fur.curves), np.int32)
fur.curves.foreach_get('first_point_index', starts)
counts = np.diff(np.r_[starts, len(fur.points)])
points = values(fur, 'position', 'vector', 3)
old = points.copy()
roots = points[starts].copy()
radius = values(fur, 'radius')
old_radius = radius.copy()
strlen = values(fur, 'strlen')
active = np.maximum.reduceat(radius, starts) > 0

# The previous pass recorded exact canal furnishing IDs. Suppress those paths
# rather than trying to coax the same short surface coat into a new silhouette.
prior = np.load(archive / 's12-13c-fix3-superseded-13e/patch-evidence.npz')
replaced = prior['tuft'] & active
for i in np.where(replaced)[0]:
    radius[starts[i]:starts[i] + counts[i]] = 0

# Restore the uncut trajectory, then resample its prefix to a continuously
# graded length. This removes the shared cut plane without straight extensions.
original = np.load(archive / 's12-13b-superseded-13c/r/evidence.npz')
assert np.array_equal(starts, original['starts'])
original_points = original['points']
x = abs(roots[:, 0])
z = roots[:, 2]
along = .8 * x + .6 * z
across = (z - .64) * .8 - (x - .17) * .6
rim = active & (((x > .32) & (z > .74)) |
                ((x > .26) & (z > .82) & (across > .060) & (roots[:, 1] > .025)))
nearest = np.array([tree.find(Vector(q))[1] for q in roots])
earw = values(skin.data, 'earw')[nearest]
rim &= earw > .98
cupm = values(skin.data, 'cupm')[nearest]
rim &= (cupm < .15) | prior['rim']
rng = np.random.default_rng(131607)
targets = np.zeros(len(starts), np.float32)
for i in np.where(rim)[0]:
    sl = slice(starts[i], starts[i] + counts[i])
    path = original_points[sl]
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    # The anatomical point is at the largest lateral/upward ear coordinate.
    w = np.clip((along[i] - .813) / .085, 0, 1)
    w = w * w * (3 - 2 * w)
    target = (.016 * (1 - w) + .007 * w) * rng.uniform(.8, 1.2)
    # Blend into the held upper rim over 30 mm, avoiding a new scope seam.
    upper = across[i] > .060 and z[i] > .82 and roots[i, 1] > .025
    edge = np.clip(min((x[i] - (.26 if upper else .32)) / .045,
                       (z[i] - (.80 if upper else .74)) / .04), 0, 1)
    edge = edge * edge * (3 - 2 * edge)
    current = np.linalg.norm(np.diff(old[sl], axis=0), axis=1).sum()
    target = current * (1 - edge) + min(target, arc[-1]) * edge
    sample = np.linspace(0, target, counts[i])
    points[sl] = np.column_stack([np.interp(sample, arc, path[:, k]) for k in range(3)])
    # Preserve each original fine taper, independently of the cut length.
    t = np.linspace(0, 1, counts[i])
    radius[sl] = old_radius[starts[i]] * (1 - t) ** 1.35 + .000001 * t
    targets[i] = target
    if fur.attributes['strlen'].domain == 'POINT':
        strlen[sl] = target
    else:
        strlen[i] = target

fur.points.foreach_set('position', points.ravel())
fur.attributes['radius'].data.foreach_set('value', radius)
fur.attributes['strlen'].data.foreach_set('value', strlen)

material = bpy.data.materials.new('Akinza dedicated white canal hair')
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
hair = nodes.new('ShaderNodeBsdfHairPrincipled')
hair.model = 'CHIANG'
hair.parametrization = 'COLOR'
hair.inputs['Color'].default_value = (.98, .98, .98, 1)
hair.inputs['Roughness'].default_value = .50
hair.inputs['Radial Roughness'].default_value = .55
hair.inputs['Coat'].default_value = 0
diffuse = nodes.new('ShaderNodeBsdfDiffuse')
diffuse.inputs['Color'].default_value = (.98, .98, .98, 1)
blend = nodes.new('ShaderNodeMixShader')
blend.inputs[0].default_value = .35
material.node_tree.links.new(hair.outputs['BSDF'], blend.inputs[1])
material.node_tree.links.new(diffuse.outputs['BSDF'], blend.inputs[2])
output = nodes.new('ShaderNodeOutputMaterial')
material.node_tree.links.new(blend.outputs[0], output.inputs['Surface'])

def front(x, z):
    hit = bvh.ray_cast(Vector((float(x), -1, float(z))), Vector((0, 1, 0)), 2)
    assert hit[0] is not None, (x, z)
    return np.array(hit[0]), np.array(hit[1])

def guide(side, s):
    u = .052 + .008 * s * s
    v = .020 + .050 * s
    root, _ = front(side * (.17 + .8 * u - .6 * v), .64 + .6 * u + .8 * v)
    root[1] -= .0007
    tipu = .192 - .048 * abs(s) ** 1.15
    tipv = .020 + .017 * s
    end, _ = front(side * (.17 + .8 * tipu - .6 * tipv), .64 + .6 * tipu + .8 * tipv)
    end[1] -= .014
    t = np.linspace(0, 1, 16)
    path = (1 - t[:, None]) * root + t[:, None] * end
    surface_y = np.array([front(q[0], q[2])[0][1] for q in path])
    control_y = min(surface_y.min() - .024, root[1], end[1])
    path[:, 1] = (1 - t) ** 2 * root[1] + 2 * t * (1 - t) * control_y + t ** 2 * end[1]
    return path

def curves_object(name, paths, radii, hidden=False):
    paths = np.asarray(paths, np.float32)
    cu = bpy.data.hair_curves.new(name)
    cu.add_curves([paths.shape[1]] * len(paths))
    cu.points.foreach_set('position', paths.ravel())
    cu.attributes.new('radius', 'FLOAT', 'POINT').data.foreach_set('value', np.asarray(radii, np.float32).ravel())
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    cu.materials.append(material)
    ob.hide_render = hidden
    ob.hide_viewport = hidden
    return ob

guide_s = np.linspace(-1, 1, 14)
all_guides = []
all_children = []
all_radii = []
for side in (-1, 1):
    guides = np.array([guide(side, s) for s in guide_s])
    all_guides.extend(guides)
    for child in range(CHILDREN_PER_EAR):
        s = rng.uniform(-1, 1)
        cell = min(12, int((s + 1) * 6.5))
        f = (s - guide_s[cell]) / (guide_s[cell + 1] - guide_s[cell])
        path = (1 - f) * guides[cell] + f * guides[cell + 1]
        t = np.linspace(0, 1, len(path))
        # Three broad soft locks, with fine guide interpolation inside each.
        lock_s = np.clip(np.round(s * 1.5) / 1.5, -1, 1)
        lock_path = guide(side, float(lock_s))
        clump = .45 * np.sin(np.pi * t) ** 1.5
        path += (lock_path - path) * clump[:, None]
        width = rng.normal(0, .0018)
        path[:, 0] += side * -.6 * width * (1 - .65 * t)
        path[:, 2] += .8 * width * (1 - .65 * t)
        root_band = rng.uniform(-.004, .005) * (1 - t) ** 2
        path[:, 0] += side * .8 * root_band
        path[:, 2] += .6 * root_band
        path[:, 2] += max(0, .653 - path[0, 2])
        path[:, 1] -= rng.uniform(0, .008) * np.sin(np.pi * t / 2)
        path[:, 1] -= (.004 + .006 * np.cos(lock_s * np.pi)) * np.sin(np.pi * t)
        phase = rng.uniform(0, 2 * np.pi)
        wave = rng.uniform(.0010, .0028) * np.sin(2 * np.pi * t + phase) * np.sin(np.pi * t)
        path[:, 0] += side * -.6 * wave
        path[:, 2] += .8 * wave
        path[:, 1] += rng.uniform(.0010, .0035) * np.sin(2 * np.pi * t + rng.uniform(0, 2 * np.pi)) * np.sin(np.pi * t)
        # Randomized ends dissolve the outline into tapered individual hairs.
        rank = rng.random()
        long_share = .18 + .12 * (1 - abs(s))
        if rank < long_share:
            end_scale = rng.uniform(.78, 1.06)
        elif rank < long_share + .50:
            end_scale = rng.uniform(.50, .82)
        else:
            end_scale = rng.uniform(.04, .18)
        path = path[0] + (path - path[0]) * end_scale
        for j in range(len(path)):
            surface, _ = front(path[j, 0], path[j, 2])
            path[j, 1] = min(path[j, 1], surface[1] - .0007 - .008 * t[j])
        all_children.append(path)
        all_radii.append(rng.uniform(.000180, .000300) * (1 - t) ** 1.35 + .000001)

from guard_ear_guides_13g import guard
all_children = np.array(all_children, np.float32)
all_radii = np.array(all_radii, np.float32)
points, radius, strlen, rim, replaced, all_children = guard(
    before, out, points, starts, counts, radius, strlen,
    fur.attributes['strlen'].domain, rim, replaced, all_children,
    all_radii, tree, bvh, normal, earw)
fur.points.foreach_set('position', points.ravel())
fur.attributes['radius'].data.foreach_set('value', radius)
fur.attributes['strlen'].data.foreach_set('value', strlen)
guide_ob = curves_object('Akinza canal guides 13g', all_guides, np.full((28, 16), .0001), True)
children = curves_object('Akinza canal tuft 13g', all_children, all_radii)
info.update(parent=str(before), additionalFurObjects=[children.name],
            originalFurStrands=len(starts), strands=len(starts) + len(all_children),
            strandPoints=len(points) + np.asarray(all_children).size // 3,
            earGuides13g=dict(guidesPerEar=14, childrenPerEar=CHILDREN_PER_EAR,
                             replaced=int(replaced.sum()), rim=int(rim.sum()),
                             method='designed opening-arc guides, interpolated children, three soft locks'))
(out / 'surface-info.json').write_text(json.dumps(info, indent=2) + '\n')
np.savez_compressed(out / 'patch-evidence.npz', changed=replaced | rim, tuft=replaced,
                    rim=rim, roots=roots, targets=targets,
                    curve_max_delta=np.maximum.reduceat(np.linalg.norm(points - old, axis=1), starts))
np.savez_compressed(out / 'guide-evidence.npz', guides=np.array(all_guides), children=np.array(all_children), radii=np.array(all_radii))
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'surface.blend'))
print('DEDICATED_EAR_GUIDES_SAVED', info['earGuides13g'], flush=True)
import review_fur_13
import render_surface
sys.argv = [__file__, '--', '--surface', str(out), '--out', str(out / 'r'),
            '--views', 'ears-front,ear-root-close,ear-tip-close', '--samples', '32', '--palette', 'T7']
render_surface.main()

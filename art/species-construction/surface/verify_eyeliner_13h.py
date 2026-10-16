"""Fresh saved protection and ribbon topology checks."""
import sys
import json
import hashlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from ribbon_eyeliner_13h import apply, PREFIX
from clip_ribbon_fur_13h import values, projectors, limit, EDGE_FUR
from fur_systems import paths

before, after = map(Path, sys.argv[sys.argv.index('--')+1:])
patch = np.load(after/'ribbon-evidence.npz')
exact = 'pointMap' in patch.files
namespace = {'__file__': str(HERE/'verify_fur_12f.py')}
exec(compile((HERE/'verify_fur_12f.py').read_text().split('args=sys.argv')[0], 'material_helpers', 'exec'), namespace)


def state(canonical=False):
    result = {}
    for ob in bpy.data.objects:
        if ob.type not in ('MESH', 'CURVES') or ob.name.startswith(PREFIX) or ob.name == EDGE_FUR:
            continue
        data = ob.data
        attrs = {}
        for a in data.attributes:
            if a.data_type not in ('FLOAT', 'FLOAT_VECTOR', 'INT', 'INT8', 'BOOLEAN', 'FLOAT_COLOR', 'BYTE_COLOR'):
                continue
            v, _ = values(a)
            if canonical and ob.name == 'Akinza fur' and a.domain == 'POINT':
                v = v[patch['pointMap']].copy() if exact else v.copy()
                if a.name == 'radius':v[patch['changedPoints'], 0] = patch['originalRadius']
            attrs[a.name] = hashlib.sha256(v.tobytes()).hexdigest()
        item = dict(attrs=attrs, matrix=[list(v) for v in ob.matrix_world], slots=[m.name for m in data.materials], hidden=ob.hide_render)
        if ob.type == 'MESH':
            ids = np.empty(len(data.loops), np.int32)
            data.loops.foreach_get('vertex_index', ids)
            item['topology'] = hashlib.sha256(ids.tobytes()).hexdigest()
        else:
            starts = np.empty(len(data.curves), np.int32)
            data.curves.foreach_get('first_point_index', starts)
            if canonical and exact and ob.name == 'Akinza fur':
                assert np.array_equal(starts, patch['pointMap'][patch['originalStarts']])
                starts = patch['originalStarts']
            item['starts'] = hashlib.sha256(starts.tobytes()).hexdigest()
        result[ob.name] = item
    graphs = {m.name: namespace['material_graph'](m) for m in bpy.data.materials if m.use_nodes and m.name != 'G1 ribbon charcoal'}
    return dict(objects=result, materials=graphs)


bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
native = bpy.data.objects['Akinza fur'].data
if exact:
    original_starts = np.empty(len(native.curves), np.int32)
    native.curves.foreach_get('first_point_index', original_starts)
    assert np.array_equal(original_starts, patch['originalStarts'])
    assert np.all(values(native.attributes['curve_type'])[0][patch['changedCurves']] == 1)
    inserted = {}
    for a in native.attributes:
        if a.domain != 'POINT':continue
        data, _ = values(a)
        lo, hi, t = patch['sourceLow'], patch['sourceHigh'], patch['fraction'][:, None]
        expected = data[lo]*(1-t)+data[hi]*t if data.dtype.kind == 'f' else data[np.where(t[:, 0]<.5, lo, hi)]
        expected = expected.astype(data.dtype)
        if a.name == 'radius':interpolated_radius = expected[:, 0]
        else:inserted[a.name] = hashlib.sha256(expected.tobytes()).hexdigest()
angle = np.deg2rad(2.)
toward = Vector((0, -np.cos(angle), np.sin(angle)))
up = Vector((0, np.sin(angle), np.cos(angle)))
targets = [o for o in bpy.data.objects if o.type == 'MESH' and
           (o.name.startswith('head_eye_globe_') or len(o.data.vertices) > 500000)]
trees = [(o, BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())) for o in targets]
probes = []
for x, y in [(550, 850), (550, 860), (550, 868), (550, 878), (550, 888)]:
    origin = Vector((.084, -.15, .650)) + Vector(((x+.5-500)*.0002, 0, 0)) + up*((500-y-.5)*.0002) + toward*2
    hits = []
    for ob, tree in trees:
        hit = tree.ray_cast(origin, -toward, 4)
        if hit[0] is not None:
            hits.append((hit[3], ob.name, int(hit[2])))
    first = min(hits) if hits else None
    probes.append(dict(pixel=[x, y], first=first, hits=sorted(hits)))
(after/'baseline-band-probes.json').write_text(json.dumps(probes, indent=2))
apply()
baseline = state()
bpy.ops.wm.open_mainfile(filepath=str(after/'surface.blend'))
cu = bpy.data.objects['Akinza fur'].data
radius = np.empty(len(cu.points), np.float32)
cu.attributes['radius'].data.foreach_get('value', radius)
if exact:
    assert np.all(radius[patch['pointMap'][patch['changedPoints']]] <= patch['originalRadius'])
    assert np.all(radius[patch['insertedSlots']] <= interpolated_radius+1e-10)
    assert np.all(radius >= 0)
    assert len(cu.points) == len(patch['pointMap'])+len(patch['insertedSlots'])
    assert np.array_equal(np.sort(np.r_[patch['pointMap'], patch['insertedSlots']]), np.arange(len(cu.points)))
    for name, expected in inserted.items():
        assert hashlib.sha256(values(cu.attributes[name])[0][patch['insertedSlots']].tobytes()).hexdigest() == expected, name+' inserted samples differ'
    assert baseline == state(True), 'Held data or original points/attributes/types differ'
    edge = bpy.data.objects[EDGE_FUR].data
    assert np.array_equal(values(edge.attributes['position'])[0], patch['edgePoints'])
    assert np.array_equal(values(edge.attributes['radius'])[0][:, 0], patch['edgeRadius'])
    roots = patch['edgePoints'][patch['edgeStarts']]
    assert np.all((abs(roots[:, 0])<.20)&(roots[:, 2]>.52)&(roots[:, 2]<.68)&(roots[:, 1]<.03))
    assert float(patch['edgeRadius'].max()) <= .00066
    assert np.all(values(edge.attributes['pale'])[0] == 1)
    trees = projectors()
    worst, tested = 0., 0
    for data, selected in [(cu, np.where(patch['changedCurves'])[0]), (edge, np.arange(len(edge.curves)))]:
        p, r = values(data.attributes['position'])[0], values(data.attributes['radius'])[0][:, 0]
        first = np.empty(len(data.curves), np.int32)
        data.curves.foreach_get('first_point_index', first)
        counts = np.diff(np.r_[first, len(p)])
        for i in selected:
            sl = slice(first[i], first[i]+counts[i]);path, rad = p[sl], r[sl]
            mid, mr = (path[:-1]+path[1:])/2, (rad[:-1]+rad[1:])/2
            worst = max(worst, float(np.max(rad-limit(path, rad, trees))), float(np.max(mr-limit(mid, mr, trees))))
            tested += len(path)+len(mid)
    (after/'ribbon-envelopes.json').write_text(json.dumps(dict(samples=tested, views=['eye-close','head-front','head34'], maxRadiusExcess=worst, tolerance=.0000012), indent=2))
    assert worst <= .0000012, 'Finite-width hair envelope overlaps ribbon'
else:
    assert np.all(radius[patch['changedPoints']] <= patch['originalRadius'])
    assert baseline == state(True), 'Held sparse-surface data differ'
    assert bpy.data.objects.get(EDGE_FUR) is None
    first = np.empty(len(cu.curves), np.int32)
    cu.curves.foreach_get('first_point_index', first)
    counts = np.diff(np.r_[first, len(cu.points)])
    p = values(cu.attributes['position'])[0]
    selected = np.unique(np.searchsorted(first, patch['changedPoints'], side='right')-1)
    trees = projectors()
    worst, tested = 0., 0
    for i in selected:
        sl = slice(first[i], first[i]+counts[i]);path, rad = p[sl], radius[sl]
        mid, mr = (path[:-1]+path[1:])/2, (rad[:-1]+rad[1:])/2
        worst = max(worst, float(np.max(rad-limit(path, rad, trees))), float(np.max(mr-limit(mid, mr, trees))))
        tested += len(path)+len(mid)
    (after/'ribbon-envelopes.json').write_text(json.dumps(dict(samples=tested, views=['eye-close','head-front','head34'], maxRadiusExcess=worst, tolerance=.0000012, passEnvelope=worst<=.0000012), indent=2))
positions = np.empty(len(cu.points)*3, np.float32)
cu.attributes['position'].data.foreach_get('vector', positions)
positions = positions.reshape(-1, 3)
starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', starts)
positions, starts, radius = paths(after)
ends = starts + np.diff(np.r_[starts, len(positions)])-1
segment_ids = np.setdiff1d(np.arange(len(positions)-1), ends)
crossings = []
visibility = {}
for ob in [o for o in bpy.data.objects if o.name.startswith(PREFIX)]:
    tree = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    box = np.array([v.co[:] for v in ob.data.vertices])
    eye = bpy.data.objects[ob.name[len(PREFIX):]]
    eye_tree = BVHTree.FromObject(eye, bpy.context.evaluated_depsgraph_get())
    per_view = {}
    for name, azimuth, elevation in [('eye-close', 0, 2), ('head34', 35, 8), ('head-front', 0, 3)]:
        az, el = np.deg2rad((azimuth, elevation))
        direction = Vector((np.sin(az)*np.cos(el), -np.cos(az)*np.cos(el), np.sin(el)))
        hidden = []
        for i in range(0, 1024, 4):
            p = Vector(box[i*9])
            hit = eye_tree.ray_cast(p+direction*.000005, direction, 1)
            if hit[0] is not None:
                hidden.append(i)
        per_view[name] = dict(samples=256, ownGlobeOccluded=len(hidden), contourRows=hidden)
    visibility[ob.name] = per_view
    lo, hi = box.min(0)-.001, box.max(0)+.001
    ids = segment_ids[(np.minimum(positions[segment_ids], positions[segment_ids+1]) < hi).all(1) &
                      (np.maximum(positions[segment_ids], positions[segment_ids+1]) > lo).all(1)]
    for i in ids:
        delta = positions[i+1]-positions[i]
        length = float(np.linalg.norm(delta))
        if length < 1e-8 or max(radius[i:i+2]) < 1e-8:
            continue
        hit = tree.ray_cast(Vector(positions[i]), Vector(delta/length), length)
        if hit[0] is not None:
            t = hit[3]/length
            r = radius[i]*(1-t)+radius[i+1]*t
            if r > .000002:
                crossings.append(dict(ribbon=ob.name, point=int(i), radius=float(r)))
(after/'ribbon-crossings.json').write_text(json.dumps(crossings, indent=2))
(after/'ribbon-visibility.json').write_text(json.dumps(visibility, indent=2))
if exact:assert not crossings, 'Visible hair centerline crossings through ribbon'
assert len([o for o in bpy.data.objects if o.name.startswith(PREFIX)]) == 2
for ob in bpy.data.objects:
    if not ob.name.startswith(PREFIX):
        continue
    me = ob.data
    assert len(me.vertices) == 1024*9 and len(me.polygons) == 1024*8
    assert all(len(p.vertices) == 4 for p in me.polygons)
    assert me.materials[0].name == 'G1 ribbon charcoal'
    edge_ids = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get('edge_index', edge_ids)
    uses = np.bincount(edge_ids, minlength=len(me.edges))
    assert int((uses == 1).sum()) == 2048 and np.all(uses <= 2)
result = dict(unchanged=True, changedRadiusPoints=len(patch['changedPoints']),
              ribbonHairCrossings=len(crossings),
              insertedPoints=len(patch['insertedSlots']) if exact else 0, changedCurves=int(patch['changedCurves'].sum()) if exact else len(selected), edgeHairs=len(edge.curves) if exact else 0, projectedEnvelopeExcess=worst, ribbonQualityPass=(not crossings and worst<=.0000012),
              allowed='Two ribbons, liner shaders, local finite-width segment caps and short lower-lid gap fur',
              protected=baseline, ribbonTopology='Two continuous annular strips with two closed boundary loops each')
(after/'held-data.json').write_text(json.dumps(result, indent=2))
print('13H_SAVED_PROTECTION_PASS', 'RIBBON_QUALITY', result['ribbonQualityPass'], flush=True)

"""Verify exact restored paths and all held geometry, shaders and hair."""
import sys
import json
import hashlib
from pathlib import Path
import bpy
import numpy as np
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from verify_fur_13 import snapshot
from refine_ear_root_12b2 import values

before, original, after = map(Path, sys.argv[sys.argv.index('--')+1:])
patch = np.load(after/'patch-evidence.npz')
restore, trim = patch['restore'], patch['trim']
a = snapshot(before, restore, ['position', 'radius', 'strlen'])
def other_curves():
    result = {}
    for ob in bpy.data.objects:
        if ob.type != 'CURVES' or ob.name == 'Akinza fur':continue
        item = {}
        for attr in ob.data.attributes:
            if attr.data_type not in ('FLOAT', 'FLOAT_VECTOR', 'INT', 'INT8', 'BOOLEAN'):continue
            width = 3 if attr.data_type == 'FLOAT_VECTOR' else 1
            v = np.empty(len(attr.data)*width, np.float32 if attr.data_type.startswith('FLOAT') else np.int32)
            attr.data.foreach_get('vector' if width == 3 else 'value', v)
            item[attr.name] = hashlib.sha256(v.tobytes()).hexdigest()
        result[ob.name] = dict(attrs=item, hidden=ob.hide_render, matrix=[list(v) for v in ob.matrix_world], slots=[m.name for m in ob.data.materials])
    return result
other = other_curves()
# Establish scope independently of the builder's output mask. The archived
# patch masks are the actual accepted 13c, 13c-fix and 13g edit records.
archive = original.parent
source_paths = [archive/name/'patch-evidence.npz' for name in (
    's12-13c-superseded-13c-fix', 's12-13c-fix3-superseded-13e',
    's12-13g-superseded-13h')]
sources = [np.load(path) for path in source_paths]
union = np.logical_or.reduce([data['rim'] for data in sources])
native = bpy.data.objects['Akinza fur'].data
native_starts = np.empty(len(native.curves), np.int32)
native.curves.foreach_get('first_point_index', native_starts)
active = np.maximum.reduceat(values(native, 'radius'), native_starts) > 0
expected = union & active & ~sources[-1]['tuft']
assert np.array_equal(restore, expected), 'Restoration differs from source rim masks'
assert not np.any(trim & ~expected), 'Trim escaped the restored rim scope'
provenance = {str(path): hashlib.sha256(path.read_bytes()).hexdigest()
              for path in source_paths}
b = snapshot(after, restore, ['position', 'radius', 'strlen'])
assert a == b, 'Held meshes, roots, materials or unrelated native hair changed'
assert other == other_curves(), '13g dedicated tuft/guides changed'
cu = bpy.data.objects['Akinza fur'].data
current = {k: values(cu, k, 'vector', 3) if k == 'position' else values(cu, k) for k in ('position', 'radius', 'strlen')}
strlen_domain = cu.attributes['strlen'].domain
bpy.ops.wm.open_mainfile(filepath=str(original/'surface.blend'))
cu = bpy.data.objects['Akinza fur'].data
starts = patch['starts'];counts = np.diff(np.r_[starts, len(cu.points)])
original_starts = np.empty(len(cu.curves), np.int32)
cu.curves.foreach_get('first_point_index', original_starts)
assert np.array_equal(starts, original_starts)
for key in current:
    base = values(cu, key, 'vector', 3) if key == 'position' else values(cu, key)
    select = np.repeat(restore & ~trim, counts) if key != 'strlen' or strlen_domain == 'POINT' else restore & ~trim
    assert np.array_equal(current[key][select], base[select]), key+' untrimmed restored ear paths differ from 13b'
roots = patch['roots']
assert np.all((abs(roots[restore, 0]) > .26) & (roots[restore, 2] > .74))
assert np.all(patch['weight'][trim] > 0)
assert np.all((patch['target'][trim] >= .0072) & (patch['target'][trim] <= .0108))
lengths = np.array([np.linalg.norm(np.diff(current['position'][s:s+n], axis=0), axis=1).sum() for s,n in zip(starts[trim], counts[trim])])
assert np.min(lengths) > .003, 'Apex paths collapsed to stubble'
source_positions = values(cu, 'position', 'vector', 3)
original_lengths = []
prefix_errors = []
for i in np.where(trim)[0]:
    sl = slice(starts[i], starts[i]+counts[i])
    original_path = source_positions[sl]
    delta = np.diff(original_path, axis=0)
    segment_length = np.linalg.norm(delta, axis=1)
    arc = np.r_[0, np.cumsum(segment_length)]
    sample = current['position'][sl]
    t = np.clip(np.einsum('pse,se->ps',
        sample[:, None]-original_path[None, :-1], delta)
        / np.maximum(segment_length**2, 1e-20), 0, 1)
    nearest = original_path[None, :-1]+t[:, :, None]*delta[None]
    error = np.linalg.norm(sample[:, None]-nearest, axis=2)
    segment = np.argmin(error, axis=1)
    prefix_errors.append(float(error[np.arange(len(sample)), segment].max()))
    along = arc[segment]+t[np.arange(len(sample)), segment]*segment_length[segment]
    assert np.all(np.diff(along) >= -2e-6), 'Trim reverses along its original path'
    taper = np.linspace(0, 1, counts[i])
    expected_radius = current['radius'][starts[i]]*(1-taper)**1.35+.000001*taper
    assert np.allclose(current['radius'][sl], expected_radius, atol=1e-9, rtol=1e-5)
    original_lengths.append(arc[-1])
direct_errors = dict(zip(np.where(trim)[0], prefix_errors))
sequential = {}
if direct_errors.get(18319, 0) >= 2e-6:
    # The last build corrects this already-trimmed apex outlier by shortening
    # its saved first-build polyline. A second resampling can bridge an old
    # vertex, so check the actual serialized source instead of loosening the
    # original-path tolerance for every hair.
    previous = after/'restart1/surface.blend'
    assert previous.is_file()
    bpy.ops.wm.open_mainfile(filepath=str(previous))
    prior_cu = bpy.data.objects['Akinza fur'].data
    prior_starts = np.empty(len(prior_cu.curves), np.int32)
    prior_cu.curves.foreach_get('first_point_index', prior_starts)
    assert np.array_equal(prior_starts, starts) and len(prior_cu.points) == len(source_positions)
    prior_points = values(prior_cu, 'position', 'vector', 3)
    i = 18319;sl = slice(starts[i], starts[i]+counts[i])
    prior = prior_points[sl];delta = np.diff(prior, axis=0)
    sample = current['position'][sl]
    assert np.array_equal(prior[0], roots[i])
    def monotone_prefix(path, shortened):
        v=np.diff(path,axis=0);segment_length=np.linalg.norm(v,axis=1)
        arc=np.r_[0,np.cumsum(segment_length)]
        t=np.clip(np.einsum('pse,se->ps',shortened[:,None]-path[None,:-1],v)
                  /np.maximum(segment_length**2,1e-20),0,1)
        err=np.linalg.norm(shortened[:,None]-(path[None,:-1]+t[:,:,None]*v),axis=2)
        nearest=np.argmin(err,axis=1);rows=np.arange(len(shortened))
        assert float(err[rows,nearest].max()) < 2e-6
        along=arc[nearest]+t[rows,nearest]*segment_length[nearest]
        assert np.all(np.diff(along)>=-2e-6)
        assert np.linalg.norm(np.diff(shortened,axis=0),axis=1).sum()<=arc[-1]+2e-6
    monotone_prefix(source_positions[sl], prior)
    monotone_prefix(prior, sample)
    t = np.clip(np.einsum('pse,se->ps',sample[:,None]-prior[None,:-1],delta)
                / np.maximum(np.sum(delta*delta,axis=1),1e-20),0,1)
    nearest = prior[None,:-1]+t[:,:,None]*delta[None]
    error = float(np.linalg.norm(sample[:,None]-nearest,axis=2).min(axis=1).max())
    assert error < 2e-6, 'Sequential trim left its saved first-build path'
    assert np.linalg.norm(np.diff(sample,axis=0),axis=1).sum() <= np.linalg.norm(delta,axis=1).sum()+2e-6
    sequential = dict(curve=i, twoHopPrefixVerified=True, savedSourceSha256=hashlib.sha256(previous.read_bytes()).hexdigest(),
                      savedSourcePrefixError=error, originalPolylineDeviation=direct_errors.pop(i))
assert max(direct_errors.values()) < 2e-6, 'Trim left its original hair path'
assert np.all(lengths <= np.array(original_lengths)+2e-6), 'Trim lengthened a hair'
report = dict(unchanged=True, restoredCurves=int(restore.sum()), trimmedCurves=int(trim.sum()),
              trimmedLengthPercentiles=np.percentile(lengths, [0, 25, 50, 75, 100]).tolist(),
              maximumOriginalPathError=max(prefix_errors), taperedTipsExact=True,
              directPrefixMaximumError=max(direct_errors.values()), sequentialTrim=sequential,
              shorteningRatioPercentiles=np.percentile(1-lengths/np.array(original_lengths), [0,25,50,75,100]).tolist(),
              exact13bOutsideApex=True, dedicatedTuftAndGuidesExact=True,
              sourceMaskUnionExact=True, sourceMasks=provenance,
              allMeshesAndMaterialsExact=True, unrelatedNativeAttributesExact=True,
              protected=a, otherCurves=other)
(after/'held-data.json').write_text(json.dumps(report, indent=2)+'\n')
print('13I_SAVED_PROTECTION_PASS', flush=True)

"""Measure apex allowances on saved paths before spending another build."""
import sys
import ast
import json
import shutil
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

strength = 1.0
protect = None
overhang_band = None
if '--overhang-band' in sys.argv:
    j = sys.argv.index('--overhang-band')
    overhang_band = tuple(map(float, sys.argv[j+1:j+3]))
    del sys.argv[j:j+3]
if '--protect' in sys.argv:
    j = sys.argv.index('--protect');protect = np.load(sys.argv[j+1])['roots'];del sys.argv[j:j+2]
if '--strength' in sys.argv:
    j = sys.argv.index('--strength');strength = float(sys.argv[j+1]);del sys.argv[j:j+2]
before, original, after = map(Path, sys.argv[1:4])
patch = dict(np.load(after/'patch-evidence.npz'))
base = dict(np.load(before/'r/evidence.npz'))
original_points = np.load(original/'r/evidence.npz')['points']
starts = patch['starts'];counts = np.diff(np.r_[starts, len(original_points)])
restore = patch['restore'];pm = np.where(np.repeat(restore, counts))[0]
outline = patch['outline']
az, el = np.deg2rad([155,24])
camera = np.array([np.sin(az)*np.cos(el), -np.cos(az)*np.cos(el), np.sin(el)])
right = np.cross(-camera, [0,0,1]);right /= np.linalg.norm(right)
up = np.cross(right, -camera)
source = ast.parse((HERE/'restore_ear_back_13i.py').read_text())
exec(compile(ast.Module(body=[q for q in source.body if isinstance(q, ast.FunctionDef)], type_ignores=[]), 'outline_helpers', 'exec'))
reference = np.load(before/'r/sweep-flags.npz')
reference_rogue = np.load(before/'r/rogue-flags.npz')['rogue']
original_flags = np.load(original/'r/sweep-flags.npz')
inherited = original_flags['neighborLength'] & ~reference['neighborLength'][:len(starts)] & restore
ear = base['co'][(base['co'][:, 0] > .30) & (base['co'][:, 2] > .73)]
apex_along = np.max(.8*ear[:, 0]+.6*ear[:, 2])
distance = apex_along-(.8*abs(patch['roots'][:, 0])+.6*patch['roots'][:, 2])
root_weight = np.clip((.038-distance)/.020, 0, 1)
root_weight = root_weight*root_weight*(3-2*root_weight)
report = []
for allowance in map(float, sys.argv[4:]):
    points = base['points'].copy();points[pm] = original_points[pm]
    target = patch['target']*(allowance/.009)
    overhang = patch['originalOverhang'];w = root_weight*strength
    if overhang_band is not None:
        # Preserve the short surrounding envelope. Only the long silhouette
        # brush receives full shortening; intermediate overhang fades smoothly.
        fade = np.clip((overhang-overhang_band[0])/overhang_band[1], 0, 1)
        w *= fade*fade*(3-2*fade)
    if protect is not None:
        distance = cKDTree(protect).query(base['roots'][:len(starts)])[0]
        fade = np.clip((distance-.010)/.020, 0, 1)
        w *= fade*fade*(3-2*fade)
    trim = restore & (w > 0) & (overhang > target+.001)
    for i in np.where(trim)[0]:
        sl = slice(starts[i], starts[i]+counts[i]);path = points[sl].copy()
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
        samples = np.linspace(0, arc[-1], 129)
        dense = np.column_stack([np.interp(samples, arc, path[:, k]) for k in range(3)])
        cross = np.where(excess(dense) > overhang[i]*(1-w[i])+target[i]*w[i])[0]
        if not len(cross):trim[i] = False;continue
        sample = np.linspace(0, samples[max(1, cross[0]-1)], counts[i])
        points[sl] = np.column_stack([np.interp(sample, arc, path[:, k]) for k in range(3)])
    suffix = f'-band-{overhang_band[0]:.3f}-{overhang_band[1]:.3f}' if overhang_band else ''
    folder = after/f'allowance-{allowance:.3f}-strength-{strength:.2f}{"-protected" if protect is not None else ""}{suffix}';folder.mkdir(exist_ok=True)
    data = dict(base);data.update(points=points, first=points[base['starts']+1]-base['roots'])
    np.savez_compressed(folder/'evidence.npz', **data)
    for name in ('collision-evidence.npz', 'obstacle-evidence.npz'):
        shutil.copyfile(before/'r'/name, folder/name)
    analyze(folder);rogue(folder)
    flags = np.load(folder/'sweep-flags.npz');rogues = np.load(folder/'rogue-flags.npz')['rogue']
    new = rogues & ~reference_rogue
    lengths = flags['neighborLength'] & ~reference['neighborLength']
    item = dict(allowance=allowance, strength=strength, trimmed=int(trim.sum()), rogue=int(new.sum()),
                length=int(lengths.sum()), inheritedLength=int((lengths[:len(starts)] & inherited).sum()),
                rogueOutsideTrim=int((new[:len(starts)] & ~trim).sum()))
    report.append(item)
    np.savez_compressed(folder/'trim-plan.npz', trim=trim, target=target, points=points[:len(original_points)], weight=w)
    print('13I_ALLOWANCE_MEASUREMENT', item, flush=True)
    (after/f'allowance-measurements-{strength:.2f}.json').write_text(json.dumps(report, indent=2)+'\n')

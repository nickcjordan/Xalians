"""Apply one ear poof color option (akinza-ear-poof-colors.json) to a loaded surface.

Base values (the step 18 surface's fur_tone and cupm) and the poof and band
weights come from the step 19 patch evidence, so any option can be applied to
the saved file in memory at render time, or saved as the default.
"""
import json
from pathlib import Path
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
NATIVE = 420420


def options():
    return json.loads((HERE / 'akinza-ear-poof-colors.json').read_text())


def apply(evidence, name):
    opt = options()['options'][name]
    cu = bpy.data.objects['Akinza fur'].data
    tone = evidence['baseTone'].copy()
    cupm = evidence['baseCupm'].copy()
    w = np.r_[evidence['band'], np.ones(len(tone) - NATIVE)]   # 1 on poof strands, band fade on natives
    factor = opt['value'] ** 2.2
    tone = tone * (1 - w * (1 - factor))
    if opt['cupm'] > 0:
        cupm = cupm * (1 - w) + w * opt['cupm']
    a = cu.attributes['fur_tone']
    assert a.domain == 'CURVE'
    a.data.foreach_set('value', tone.astype(np.float32))
    a = cu.attributes['cupm']
    if a.domain == 'CURVE':
        assert 'ombreRoot' not in opt, 'ombre needs per-point cupm (step 20 surface)'
        a.data.foreach_set('value', cupm.astype(np.float32))
    else:
        starts = np.empty(len(cu.curves), np.int32)
        cu.curves.foreach_get('first_point_index', starts)
        counts = np.diff(np.r_[starts, len(cu.points)])
        pts = np.repeat(cupm, counts).astype(np.float32)
        if 'ombreRoot' in opt:
            mask = evidence['poofEarMask'] if 'poofEarMask' in evidence else None
            for i in range(NATIVE, len(starts)):
                t = np.linspace(0, 1, counts[i])
                pts[starts[i]:starts[i] + counts[i]] = opt['ombreRoot'] * (1 - t) + opt.get('ombreTip', 0.0) * t
                if mask is not None:
                    k = starts[i] - starts[NATIVE]
                    pts[starts[i]:starts[i] + counts[i]] *= mask[k:k + counts[i]]
        a.data.foreach_set('value', pts)
    print('POOF_COLOR', name, dict(value=opt['value'], linearTone=round(factor, 3), cupm=opt['cupm'],
                                   ombreRoot=opt.get('ombreRoot'), ombreTip=opt.get('ombreTip')), flush=True)

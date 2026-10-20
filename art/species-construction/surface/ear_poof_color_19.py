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
    cupm = cupm * (1 - w) + w * opt['cupm'] if opt['cupm'] > 0 else cupm
    for attr, value in (('fur_tone', tone), ('cupm', cupm)):
        a = cu.attributes[attr]
        assert a.domain == 'CURVE'
        a.data.foreach_set('value', value.astype(np.float32))
    print('POOF_COLOR', name, dict(value=opt['value'], linearTone=round(factor, 3), cupm=opt['cupm']), flush=True)

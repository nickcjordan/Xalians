"""Head-only variants of the approved v5 Hypnopet blockout (previews, not versions).

    python art/studio/blockout/hypnopet/head_variants.py A|B|C [--out <spec.json>]

Each variant is v5 with only the skull, cheek, muzzle and chin numbers (and an extra brow or forehead mass
in the head part) changed. The eyes, ears, horn, neck, body and legs are v5's.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_spec import V5, spec  # noqa: E402

VARIANTS = {
    # A: compact round dome. Near-spherical cranium, very short face, muzzle tucked under the eyes, defined brow.
    'A': {'skull_c': [0, -0.126, 0.435], 'skull_r': [0.086, 0.088, 0.09],
          'cheek_c': [0, -0.155, 0.38], 'cheek_r': [0.05, 0.05, 0.045],
          'muzzle_c': [0, -0.196, 0.388], 'muzzle_r': [0.022, 0.025, 0.021],
          'chin_c': [0, -0.178, 0.356], 'chin_r': [0.026, 0.024, 0.017],
          'extra': [('brow', [0.04, -0.17, 0.478], [0.03, 0.026, 0.012], 0.02)]},
    # B: wide baby skull. Broad, slightly flattened cranium, full cheeks, short face, high rounded forehead.
    'B': {'skull_c': [0, -0.125, 0.428], 'skull_r': [0.098, 0.088, 0.078],
          'cheek_c': [0, -0.15, 0.372], 'cheek_r': [0.074, 0.055, 0.05],
          'muzzle_c': [0, -0.196, 0.386], 'muzzle_r': [0.024, 0.026, 0.021],
          'chin_c': [0, -0.176, 0.352], 'chin_r': [0.03, 0.026, 0.017],
          'extra': [('forehead', [0, -0.14, 0.462], [0.07, 0.058, 0.05], 0.03)]},
    # C: the sheet's proportions. Head width from the flesh-front gap between the ears (about 0.165 m at eye
    # height), nose tip no farther forward than the eye front, chin recessed, profile rounded.
    'C': {'skull_c': [0, -0.133, 0.43], 'skull_r': [0.082, 0.086, 0.085],
          'cheek_c': [0, -0.165, 0.372], 'cheek_r': [0.054, 0.046, 0.042],
          'muzzle_c': [0, -0.2, 0.386], 'muzzle_r': [0.022, 0.024, 0.02],
          'chin_c': [0, -0.172, 0.35], 'chin_r': [0.026, 0.022, 0.016],
          'extra': []},
}


def build(name):
    v = {**V5, 'muzzle_blend': 0.034, 'chin_blend': 0.03, **{k: x for k, x in VARIANTS[name].items() if k != 'extra'}, 'version': 'head-preview-' + name}
    s = spec(v)
    i = max(n for n, p in enumerate(s['parts']) if p['part'] == 'head') + 1
    for key, c, r, blend in VARIANTS[name]['extra']:
        s['parts'].insert(i, {'part': 'head', 'kind': 'mass', 'mirror': 'x' if c[0] else None, 'blend': blend,
                              'params': {'center': c, 'radii': r, 'exponent': 2.0}})
        i += 1
    return s


if __name__ == '__main__':
    out = Path(sys.argv[sys.argv.index('--out')+1]) if '--out' in sys.argv else HERE/'spec.json'
    out.write_text(json.dumps(build(sys.argv[1]), indent=1), encoding='utf-8')
    print('wrote', out)

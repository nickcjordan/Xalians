"""Authored, parametric parts as signed distance functions (numpy only, importable inside Blender).

    from parts import Instance, build_field
    inst = Instance({'part': 'tail', 'kind': 'sweep', 'params': {...}, 'mirror': None, 'blend': 0.03})
    inst.sdf(points)        # (N,3) -> (N,) negative inside
    inst.bounds()           # (lo, hi) of the solid, mirror included

The creature's left is +x, it faces -y and up is +z (the convention of cameras/akinza.json).
"""
import numpy as np

from . import mass, sweep, shell
from .common import BIG, smin, smax  # noqa: F401  (re-exported)
from .field import build_field, ownership, project_to_surface, sample_region, union_at  # noqa: F401

KINDS = {'mass': mass, 'sweep': sweep, 'shell': shell}
OPS = ('add', 'carve', 'add-after')


class Instance:
    """One part instance of a blockout spec."""

    def __init__(self, spec):
        self.spec = spec
        self.key = spec['part']
        self.kind = spec['kind']
        if self.kind not in KINDS:
            raise ValueError(f"unknown part kind {self.kind!r} (known: {', '.join(KINDS)})")
        self.params = spec.get('params', {})
        self.mirror = spec.get('mirror') or None
        if self.mirror not in (None, 'x'):
            raise ValueError("mirror must be 'x' or null")
        self.blend = float(spec.get('blend', 0.03))
        self.op = spec.get('op') or 'add'
        if self.op not in OPS:
            raise ValueError(f"op must be one of {', '.join(OPS)}")
        self.module = KINDS[self.kind]
        self.module.bounds(self.params)           # validates the parameters now rather than mid-build

    def sdf(self, pts):
        pts = np.asarray(pts, float)
        d = self.module.sdf(self.params, pts)
        if self.mirror == 'x':
            flipped = pts*np.array([-1.0, 1.0, 1.0])
            d = np.minimum(d, self.module.sdf(self.params, flipped))
        return d

    def bounds(self):
        lo, hi = self.module.bounds(self.params)
        lo, hi = np.asarray(lo, float), np.asarray(hi, float)
        if self.mirror == 'x':
            lo, hi = (np.array([min(lo[0], -hi[0]), lo[1], lo[2]]),
                      np.array([max(hi[0], -lo[0]), hi[1], hi[2]]))
        return lo, hi


def instances(spec):
    return [Instance(p) for p in spec['parts']]


def part_keys(spec):
    """Unique part keys in order of first appearance; part_id indexes this list."""
    keys = []
    for p in spec['parts']:
        if p['part'] not in keys:
            keys.append(p['part'])
    return keys

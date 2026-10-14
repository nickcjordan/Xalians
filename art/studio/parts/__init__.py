"""Authored, parametric parts as signed distance functions (numpy only, importable inside Blender).

    from parts import Instance, build_field
    inst = Instance({'part': 'tail', 'kind': 'sweep', 'params': {...}, 'mirror': None, 'blend': 0.03})
    inst.sdf(points)        # (N,3) -> (N,) negative inside
    inst.bounds()           # (lo, hi) of the solid, mirror included

The creature's left is +x, it faces -y and up is +z (the convention of cameras/akinza.json).
"""
import numpy as np

from . import grid, mass, sweep, shell
from .common import BIG, smin, smax  # noqa: F401  (re-exported)
from .field import build_field, ownership, project_to_surface, sample_region, union_at  # noqa: F401

KINDS = {'mass': mass, 'sweep': sweep, 'shell': shell, 'grid': grid}
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
        # a separate instance is its own closed object (an eyeball, a tooth): never unioned into the skin
        self.separate = bool(spec.get('separate', False))
        self.name = spec.get('name') or None
        self.mirror_name = spec.get('mirrorName') or None
        self.material = spec.get('material') or None
        self.shading = spec.get('shading') or None     # numbers the material tag's review shader reads
        self.pivot = self.gaze = None
        if self.separate:
            if self.op != 'add':
                raise ValueError(f"a separate instance has no op (got {self.op!r}): it is never carved into the skin")
            lo, hi = self.module.bounds(self.params)
            default = self.params.get('center', (np.asarray(lo, float)+np.asarray(hi, float))/2)
            self.pivot = np.asarray(spec.get('pivot', default), float)
            if self.pivot.shape != (3,):
                raise ValueError('pivot must be [x, y, z]')
            if spec.get('gaze') is not None:
                g = np.asarray(spec['gaze'], float)
                if g.shape != (3,) or not np.linalg.norm(g) > 0:
                    raise ValueError('gaze must be a nonzero [x, y, z]')
                self.gaze = g/np.linalg.norm(g)
        else:
            for k in ('name', 'mirrorName', 'material', 'shading', 'pivot', 'gaze'):
                if spec.get(k) is not None:
                    raise ValueError(f'{k!r} only applies to a separate instance ("separate": true)')

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
    """Unique part keys of the skin in order of first appearance; part_id indexes this list. Separate instances
    are their own objects and take no part_id."""
    keys = []
    for p in spec['parts']:
        if not p.get('separate') and p['part'] not in keys:
            keys.append(p['part'])
    return keys


def skin_instances(insts):
    return [i for i in insts if not i.separate]


def separate_objects(insts):
    """The closed objects that separate instances become, in spec order: one per instance, two for a mirrored
    one (the authored side, then its reflection through x = 0). Each is a dict with name, part, material,
    pivot and gaze (world space; the reflection's pivot and gaze are reflected too), mirrored (bool), and
    instance, an unmirrored, non-separate copy of the instance to mesh. Names are the instance's "name" (default
    "<part>-<n>", n counting separate instances from 0) and, for the reflection, its "mirrorName" (default the
    name plus "-mirror")."""
    out = []
    n = 0
    for inst in insts:
        if not inst.separate:
            continue
        base = inst.name or f'{inst.key}-{n}'
        n += 1
        solo = Instance({k: v for k, v in inst.spec.items()
                         if k not in ('separate', 'name', 'mirrorName', 'material', 'shading', 'pivot', 'gaze', 'mirror')})
        flip = np.array([-1.0, 1.0, 1.0])
        out.append({'name': base, 'part': inst.key, 'material': inst.material, 'shading': inst.shading, 'pivot': inst.pivot,
                    'gaze': inst.gaze, 'mirrored': False, 'instance': solo})
        if inst.mirror == 'x':
            out.append({'name': inst.mirror_name or base+'-mirror', 'part': inst.key, 'material': inst.material, 'shading': inst.shading,
                        'pivot': inst.pivot*flip, 'gaze': None if inst.gaze is None else inst.gaze*flip,
                        'mirrored': True, 'instance': solo})
    names = [o['name'] for o in out]
    if len(set(names)) != len(names):
        raise ValueError(f'separate object names must be unique: {names}')
    return out

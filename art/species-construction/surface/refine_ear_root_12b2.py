"""Patch the ear-root mask and furnishings without regenerating unrelated fur.

Run with WSL Blender, -- --before DIR --out DIR [--settings JSON].
The evaluated baseline is baked before changing skin attributes. Only affected
ear-front curves receive color, length or grooming changes; other curves remain
bit-identical. The source skin geometry, materials and original guide field stay.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_surface import membership, smoothstep, edge_smooth, graph_distance, unit


def values(data, name, prop='value', width=1):
    attr = data.attributes[name]
    arr = np.empty(len(attr.data)*width, np.float32)
    attr.data.foreach_get(prop, arr)
    return arr.reshape(-1, width) if width > 1 else arr


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--before', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--settings', type=Path, default=Path(__file__).with_name('akinza-ear-root-12b2.json'))
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    patch = json.loads(args.settings.read_text())
    info = json.loads((args.before/'surface-info.json').read_text())
    cfg = info['settings']
    bpy.ops.wm.open_mainfile(filepath=str(args.before/'surface.blend'))
    bpy.context.preferences.filepaths.save_version = 0
    skin = bpy.data.objects[info['skin']]
    me = skin.data
    co = values(me, 'position', 'vector', 3)
    normal = np.empty(co.size, np.float32)
    me.vertex_normals.foreach_get('vector', normal)
    normal = normal.reshape(-1, 3)
    edges = np.empty(len(me.edges)*2, np.int32)
    me.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    old = values(me, 'cupm')
    # Freeze evaluated baseline first, before its procedural skin inputs change.
    fur = bpy.data.objects['Akinza fur']
    cu = fur.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.copy()
    fur.modifiers.clear()
    fur.data = cu
    print('BAKED', len(cu.curves), len(cu.points), flush=True)

    frame = json.loads((Path(__file__).resolve().parents[3]/'docs/design/species-construction/akinza/loop/species.json').read_text())['frame']
    ear = cfg['groups']['ears']
    ew = membership(co, ear['box'], frame['floorZ'], frame['fixedHeight'], ear['margin'])
    own = ew > .5
    back = normal[:, 1] > 0
    a, b = edges.T
    crossing = own[a] & own[b] & (back[a] != back[b])
    seeds = np.zeros(len(co), bool)
    seeds[a[crossing]] = True
    seeds[b[crossing]] = True
    rd = graph_distance(co, edges, seeds, own)
    cf = cfg['guides']['cupFront']
    base = np.zeros(len(co))
    for side in (-1, 1):
        idx = np.where(own & (np.sign(co[:, 0]+1e-9) == side))[0]
        d = np.linalg.norm(co[idx]-np.array(cfg['earRoot'])*[side, 1, 1], axis=1)
        t = (d-d.min())/(d.max()-d.min())
        base[idx] = smoothstep((t-patch['base'][0])/(patch['base'][1]-patch['base'][0]))
    bvh = BVHTree.FromObject(skin, bpy.context.evaluated_depsgraph_get())
    thick = np.full(len(co), np.inf)
    for i in np.where(ew > .02)[0]:
        hit = bvh.ray_cast(Vector(co[i]-normal[i]*.0001), Vector(-normal[i]), .3)
        if hit[0] is not None:
            thick[i] = hit[3]+.0001
    lo, hi = patch['sheetThickness']
    gate = 1-smoothstep((thick-lo)/(hi-lo))
    front = smoothstep((-normal[:, 1]-cf['facing'][0])/(cf['facing'][1]-cf['facing'][0]))
    rim = smoothstep((rd-cf['rim'][0])/(cf['rim'][1]-cf['rim'][0]))
    proposed = np.clip(edge_smooth(ew*gate*front*rim*base, edges, len(co), cf['smooth'])*gate, 0, 1)
    # Never change accepted upper-cup/rim blue; only extend the old mask inward.
    zone = patch['rootZone']
    root_zone = ((1-smoothstep((np.abs(co[:, 0])-zone['xFade'][0])/(zone['xFade'][1]-zone['xFade'][0])))
                 * (1-smoothstep((co[:, 2]-zone['zFade'][0])/(zone['zFade'][1]-zone['zFade'][0]))))
    new = (old+np.maximum(proposed-old, 0)*root_zone).astype(np.float32)
    # The extension is always zero on thick skull skin. Retain accepted inputs.
    new[thick >= .1] = old[thick >= .1]
    me.attributes['cupm'].data.foreach_set('value', new)

    starts = np.empty(len(cu.curves), np.int32)
    cu.curves.foreach_get('first_point_index', starts)
    points = values(cu, 'position', 'vector', 3)
    original = points.copy()
    roots = points[starts]
    tree = KDTree(len(co))
    for i, p in enumerate(co):
        tree.insert(Vector(p), i)
    tree.balance()
    nearest = np.array([tree.find(Vector(p))[1] for p in roots], np.int32)
    counts = np.diff(np.r_[starts, len(points)])
    cup = values(cu, 'cupm')
    cup_on_points = cu.attributes['cupm'].domain == 'POINT'
    root_cup = cup[starts] if cup_on_points else cup.copy()
    target = new[nearest]
    changed = (new[nearest]-old[nearest]) > .005
    f = patch['furnishings']
    rng = np.random.default_rng(1202)
    eligible = ((thick[nearest] > f['thickness'][0]) & (thick[nearest] < f['thickness'][1])
                & (roots[:, 2] > f['height'][0]) & (roots[:, 2] < f['height'][1])
                & (normal[nearest, 1] < -.3) & (ew[nearest] > .5) & (rd[nearest] > .014)
                & (values(me, 'kod_eyes')[nearest] > .025))
    furnished = eligible & (rng.random(len(roots)) < f['fraction'])
    changed |= furnished
    radius = values(cu, 'radius')
    strlen = values(cu, 'strlen')
    length_on_points = cu.attributes['strlen'].domain == 'POINT'
    selected = np.where(changed)[0]
    lengths = rng.uniform(*f['length'], len(roots))
    for i in selected:
        sl = slice(starts[i], starts[i]+counts[i])
        color_index = sl if cup_on_points else i
        length_index = sl if length_on_points else i
        t = np.linspace(0, 1, counts[i])
        if furnished[i]:
            n = normal[nearest[i]]
            direction = np.array(f['direction'])*[np.sign(roots[i, 0]), 1, 1]
            tangent = direction-n*np.dot(direction, n)
            tangent /= max(np.linalg.norm(tangent), 1e-9)
            # Separate fine strands, with a gentle arch rather than a broad lock.
            points[sl] = roots[i]+lengths[i]*(t[:, None]*tangent+f['lift']*np.sin(t*np.pi*.8)[:, None]*n)
            radius[sl] = f['radius']*(1-t)**1.25+.000006
            cup[color_index] = 0
            strlen[length_index] = lengths[i]
        else:
            old_len = np.linalg.norm(np.diff(points[sl], axis=0), axis=1).sum()
            target_len = old_len*(1-target[i])+.01*target[i]
            points[sl] = roots[i]+(points[sl]-roots[i])*target_len/max(old_len, 1e-9)
            cup[color_index] = max(root_cup[i], target[i])
            strlen[length_index] = target_len
    cu.points.foreach_set('position', points.ravel())
    cu.attributes['radius'].data.foreach_set('value', radius)
    cu.attributes['cupm'].data.foreach_set('value', cup)
    cu.attributes['strlen'].data.foreach_set('value', strlen)
    args.out.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(args.out/'patch-evidence.npz', co=co, normal=normal, thick=thick,
                        old_cup=old, new_cup=new, roots=roots, nearest=nearest,
                        changed=changed, furnishings=furnished,
                        curve_max_delta=np.maximum.reduceat(np.linalg.norm(points-original, axis=1), starts))
    info.update(parent=str(args.before), localPatch=patch, changedCurves=int(changed.sum()),
                furnishingCurves=int(furnished.sum()), baked=True)
    (args.out/'surface-info.json').write_text(json.dumps(info, indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'surface.blend'))
    print('PATCHED', int(changed.sum()), 'FURNISHINGS', int(furnished.sum()), flush=True)


if __name__ == '__main__':
    main()

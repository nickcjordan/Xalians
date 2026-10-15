"""Compare review_fur_12c.py exports, using actual strand-root directions."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.spatial import cKDTree


def unit(v):
    return v/np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def regions(p, n, tail):
    x, y, z = np.abs(p[:, 0]), p[:, 1], p[:, 2]
    return {
        'central_occiput': (x < .06) & (y > 0) & (z > .49),
        'lateral_skull': (x >= .06) & (x < .17) & (y > -.08) & (z > .49),
        'ear_head_junction': (x >= .09) & (x < .23) & (z > .5) & (z < .69),
        'ear_backs': (x >= .19) & (z > .54) & (n[:, 1] > .1),
        'ear_fronts': (x >= .19) & (z > .54) & (n[:, 1] < -.1),
        'back_and_flanks': (z < .39) & (z > -.35) & (x < .16) & (y > .025) & (tail < .08),
        'chest_armpits_ribs': (z < .39) & (z > -.15) & (y < .025),
        'arms': (z < .35) & (z > -.25) & (x > .17) & (tail < .08),
        'legs_paws': (z < -.35) & (y < .18) & (tail < .08),
        'tails': tail > .12,
    }


def measure(d, reference=None):
    p = d['roots']
    nearest = cKDTree(d['co']).query(p, workers=-1)[1]
    n = d['normal'][nearest]
    t = unit(d['first']-n*np.sum(n*d['first'], axis=1, keepdims=True))
    # Overquery before retaining twelve compatible neighbors, so the other side
    # of a thin ear cannot consume all the slots. Parallel transport removes the
    # surface bend while retaining crease neighbors (up to 75 degrees apart).
    sample = np.arange(0, len(p), 5)
    dist, peer = cKDTree(p).query(p[sample], k=49, distance_upper_bound=.012, workers=-1)
    valid = (peer < len(p)) & (dist > 1e-7)
    peer = np.minimum(peer, len(p)-1)
    cosine = np.sum(n[sample, None]*n[peer], axis=2)
    valid &= cosine > .25
    valid &= np.cumsum(valid, axis=1) <= 12
    axis = np.cross(n[peer], n[sample, None])
    transported = (t[peer]+np.cross(axis, t[peer])
                   + np.cross(axis, np.cross(axis, t[peer]))/np.maximum(1+cosine[..., None], 1e-6))
    angle = np.degrees(np.arccos(np.clip(np.sum(t[sample, None]*unit(transported), axis=2), -1, 1)))
    clash = (angle > 60) & valid
    masks = regions(p, n, d['attr_tailpos'][nearest])
    if reference is not None and 'attr_tail_root_flow' in reference:
        masks['hip_root_non_tube'] = reference['attr_tail_root_flow'][nearest] > .5
    result = {}
    for name, m in masks.items():
        s = m[sample] & valid.any(axis=1)
        result[name] = dict(sampled_roots=int(s.sum()), neighbor_pairs=int(valid[s].sum()),
                            roots_with_clash_fraction=float(clash[s].any(axis=1).mean()) if s.any() else None,
                            clashing_pair_fraction=float(clash[s].sum()/max(valid[s].sum(), 1)))
        if name == 'hip_root_non_tube':
            result[name]['upstream_fraction'] = float((t[sample[s], 2] > .1).mean())
    return result, masks


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--before', type=Path, required=True)
    p.add_argument('--after', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--metrics-only', action='store_true')
    a = p.parse_args()
    old, new = (np.load(v/'evidence.npz') for v in (a.before, a.after))
    bm, masks = measure(old, new)
    am, _ = measure(new, new)
    attrs = {k: float(np.max(np.abs(old[k]-new[k]))) for k in old.files
             if k.startswith('attr_') and k in new and old[k].shape == new[k].shape}
    assert np.array_equal(old['co'], new['co']) and np.array_equal(old['edges'], new['edges'])
    assert np.array_equal(old['roots'], new['roots']) and np.array_equal(old['starts'], new['starts'])
    changed = np.max(np.abs(old['first']-new['first']), axis=1) > 1e-7
    point_delta = np.linalg.norm(old['points']-new['points'], axis=1)
    curve_delta = np.maximum.reduceat(point_delta, new['starts'])
    nearest = cKDTree(new['co']).query(new['roots'], workers=-1)[1]
    held = {
        'muzzle': np.linalg.norm(new['roots']-np.array([0, -.2, .57]), axis=1) < .07,
        'eye_nose_edges': (new['attr_kod_eyes'][nearest] < .004) | (new['attr_kod_nose'][nearest] < .004),
        'paws_soles': new['roots'][:, 2] < -.6,
    }
    if 'attr_tail_tube' in new:
        held['full_tail_tubes'] = (new['attr_tail_tube'][nearest] > .999) & (new['attr_tailpos'][nearest] > .12)
    result = dict(method='Every fifth actual strand root; overquery 48 neighbors within .012 world units, retain nearest 12 with surface normals dot > .25; tangent-projected first strand segment, parallel transported between tangent planes; clash > 60 degrees. Opposite sheet faces excluded; inspect sharp folds visually too.',
                  before=bm, after=am, geometry_equal=True, roots_equal=True,
                  attribute_max_absolute_change=attrs,
                  changed_strand_roots_by_region={k: int((m & changed).sum()) for k, m in masks.items()},
                  held_region_curve_checks={k: dict(strands=int(m.sum()), changed=int((curve_delta[m] > 1e-7).sum()),
                                                    max_point_displacement=float(curve_delta[m].max()) if m.any() else 0)
                                            for k, m in held.items()})
    a.out.mkdir(parents=True, exist_ok=True)
    (a.out/'12c-direction-clashes.json').write_text(json.dumps(result, indent=2)+'\n')
    views = () if a.metrics_only else ('head-backq', 'head-side', 'ear-back-close', 'body-backq')
    for name in views:
        images = [Image.open(v/(name+'.png')).convert('RGB') for v in (a.before, a.after)]
        w, h = images[0].size
        sheet = Image.new('RGB', (2*w+12, h+38), 'white')
        draw = ImageDraw.Draw(sheet)
        font = ImageFont.load_default(size=20)
        for i, im in enumerate(images):
            sheet.paste(im, (i*(w+12), 38))
            draw.text((i*(w+12)+12, 8), ('Before: step 12b', 'Now: step 12c')[i], fill='black', font=font)
        sheet.save(a.out/('12c-'+name+'.png'))
    print(json.dumps(result, indent=2))

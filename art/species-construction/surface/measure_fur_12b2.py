"""Measure step 12b2's saved result and assemble the three review pairs."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.spatial import cKDTree


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    root = args.root
    before = np.load(root/'12b2-before/evidence.npz')
    after = np.load(root/'s12b2/r/evidence.npz')
    patch = np.load(root/'s12b2/patch-evidence.npz')
    assert np.array_equal(before['co'], after['co'])
    assert np.array_equal(before['edges'], after['edges'])
    assert np.array_equal(before['starts'], after['starts'])
    assert np.array_equal(before['roots'], after['roots'])
    attr_changes = {k: float(np.max(np.abs(before[k]-after[k]))) for k in before.files
                    if k.startswith('attr_') and k in after.files}
    assert all(v == 0 for k, v in attr_changes.items() if k != 'attr_cupm')
    delta = np.maximum.reduceat(np.linalg.norm(after['points']-before['points'], axis=1), after['starts'])
    assert np.max(delta[~patch['changed']]) == 0
    p, thick = after['co'], patch['thick']
    ear = (thick < .032) & (np.abs(p[:, 0]) > .1)
    distance = cKDTree(p[ear]).query(p, workers=-1)[0]
    head = (thick > .1) & (p[:, 2] > .45) & (before['attr_fur_density'] > .05)
    # Keep 12b's broad thickness-only skin samples for direct comparison. Actual
    # fur samples also need the skull bound used in the 12c regional audit:
    # thickness ray misses otherwise classify peripheral ear-rim skin as head.
    skull = np.abs(p[:, 0]) < .17
    eye = (before['attr_kod_eyes'] < .02) & (before['attr_fur_density'] > .05)
    nearest = patch['nearest']
    cup = after['attr_cupm']
    actual_cup = np.load(root/'s12b2/r/curve-cup.npy')
    def tint(mask, anatomical=False):
        curves = (mask & skull if anatomical else mask)[nearest]
        return dict(skinVertices=int(mask.sum()), skinMean=float(cup[mask].mean()), skinMax=float(cup[mask].max()),
                    furRoots=int(curves.sum()), furMean=float(actual_cup[curves].mean()), furMax=float(actual_cup[curves].max()))
    metrics = {
        'geometryEqual': True, 'rootsAndCurveTopologyEqual': True,
        'skinAttributeMaxDeltas': attr_changes,
        'unselectedCurveMaxDelta': float(delta[~patch['changed']].max()),
        'changedCurves': int((delta > 0).sum()), 'furnishingCurves': int(patch['furnishings'].sum()),
        'skinBlueExtensionVertices': int(((cup-before['attr_cupm']) > .01).sum()),
        'removedSkinBlueVertices': int(((cup-before['attr_cupm']) < -.00001).sum()),
        'headNearEar': {str(r): tint(head & (distance < r), anatomical=True) for r in (.02, .04, .06)},
        'furHeadDomain': 'Thickness > .1 and abs(x) < .17, matching the prior 12c lateral-skull bound. Skin samples retain the original broad thickness-only domain.',
        'unchangedPeripheralRimSamples': {
            'count': int((head[nearest] & ~skull[nearest] & (actual_cup > 0)).sum()),
            'maxCup': float(actual_cup[head[nearest] & ~skull[nearest]].max()),
            'minAbsXForNonzeroCup': float(np.abs(after['roots'][head[nearest] & ~skull[nearest] & (actual_cup > 0), 0]).min()),
            'changedCurves': int(patch['changed'][head[nearest] & ~skull[nearest] & (actual_cup > 0)].sum()),
        },
        'nearEyes': tint(eye),
        'heldBelowHeadMaxDelta': float(delta[after['roots'][:, 2] < .5].max()),
        'heldUpperOuterEarMaxDelta': float(delta[(np.abs(after['roots'][:, 0]) > .26) | (after['roots'][:, 2] > .82)].max()),
    }
    assert all(v['skinMax'] == 0 and v['furMax'] == 0 for v in metrics['headNearEar'].values())
    assert metrics['nearEyes']['skinMax'] == metrics['nearEyes']['furMax'] == 0
    (root/'12b2-metrics.json').write_text(json.dumps(metrics, indent=2))
    try:
        font = ImageFont.truetype('arial.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    for view in ('ears-front', 'head-side', 'ear-root-close'):
        images = [Image.open(root/f'{folder}/{view}.png').convert('RGB') for folder in ('12b2-before', 's12b2/r')]
        w, h = images[0].size
        pair = Image.new('RGB', (2*w+16, h+38), (240, 240, 240))
        pair.paste((60, 60, 60), (w, 0, w+16, h+38))
        for i, image in enumerate(images):
            pair.paste(image, (i*(w+16), 38))
        draw = ImageDraw.Draw(pair)
        draw.text((8, 6), 'Before: step 12c fix', fill='black', font=font)
        draw.text((w+24, 6), 'Now: step 12b2', fill='black', font=font)
        pair.save(root/f'12b2-{view}.png')
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    main()

"""Measure the Hypnopet flesh views (the model sheet's bare-body targets) for the blockout.

    python art/studio/blockout/hypnopet/measure.py [--targets <dir>] [--out measures.json]

For each flesh view: the figure mask (silhouette.py), the ground row, the skull top (the top of the head
without the horn, read by hand from the view and recorded here as a row), and the figure height F = ground
minus skull top in pixels. Width profiles are taken at fixed fractions of F (0 = ground, 1 = skull top) and
given as runs (left, right) in units of F, measured from the figure's horizontal centroid. Landmarks were read
by hand from gridded copies of the views and are given in pixels and in units of F (height above ground,
and horizontal offset from the centroid; in the side view the creature faces image left, so negative is
forward). The views are image-model drawings: nominal angles with some perspective (in the front view the
near forepaws sit lower than the hind feet; in the back view the far forepaws sit higher), not calibrated
cameras.

Scale choice: shoulder (withers) height 0.30 m, read off the side view's back line behind the ears.
"""
import argparse
import json
from pathlib import Path

import numpy as np

import silhouette as sil

TARGETS = Path(r'C:\dev\art-data\studio\blockout\hypnopet\targets')
HERE = Path(__file__).resolve().parent
FRACTIONS = [round(0.05*k, 2) for k in range(0, 21)]
WITHERS_M = 0.30

# Rows read by hand from the gridded views (pixel rows of the original images).
SKULL_TOP = {'front': 290, 'side': 276, 'back': 276}

# Hand-read landmarks: name -> (x px, y px, note) in the original image.
LANDMARKS = {
    'side': {
        'horn-tip': (305, 23, 'leans forward about 17 degrees from its base'),
        'horn-base-center': (380, 276, 'base about 70 px across in profile'),
        'ear-root-top': (520, 240, 'the ear fold above the skull'),
        'ear-tip': (690, 990, 'lowest point of the hanging ear'),
        'ear-widest': (630, 700, 'ear about 200 px wide here (outer face seen)'),
        'nose-tip': (162, 495, ''),
        'eye-center': (297, 437, 'eye about 85 px wide and 115 px tall in profile'),
        'lower-lip': (240, 600, 'bottom of the open mouth'),
        'chin-to-neck': (385, 640, 'throat corner'),
        'chest-front': (390, 750, 'most forward point of the chest'),
        'withers': (700, 650, 'back line behind the ears'),
        'rump-top': (870, 650, 'top of the haunch line'),
        'rump-back': (1050, 820, 'most rearward point of the haunch'),
        'haunch-center': (900, 830, 'center of the large rounded haunch, about 290 px long and 340 px tall'),
        'belly-low': (760, 900, 'belly line where it meets the haunch'),
        'tail-stub': (1050, 690, 'short knob, about 40 px thick, rising back and up'),
        'hock': (1100, 1000, 'back of the hock'),
        'hind-heel': (1100, 1150, ''),
        'hind-toe': (750, 1150, 'near foot about 350 px long, toes about 120 px tall'),
        'fore-toe': (355, 1150, 'near forepaw about 160 px long'),
        'foreleg-top': (470, 780, 'front leg leaves the chest'),
        'foreleg-wrist': (500, 1060, 'foreleg about 90 px thick here'),
    },
    'front': {
        'horn-tip': (575, 29, ''),
        'horn-base': (575, 290, 'about 110 px across'),
        'ear-root-top-left': (410, 245, 'ears rise slightly above the skull top before falling'),
        'ear-tip-left': (125, 1100, 'tip splays outward'),
        'ear-widest-left': (230, 700, 'inner face seen, about 220 px across'),
        'skull-widest': (575, 455, 'skull with eyes 408 to 745 px'),
        'eye-center-left': (478, 445, 'eye about 110 px across'),
        'eye-center-right': (668, 445, ''),
        'nose': (575, 525, ''),
        'mouth-bottom': (575, 645, ''),
        'neck-narrowest': (575, 660, 'about 210 px across'),
        'chest-widest': (575, 820, 'about 290 px across with the shoulders'),
        'belly-low': (575, 935, ''),
        'haunch-outer-left': (338, 880, 'haunches show beyond the chest'),
        'foreleg-center-left': (490, 1050, 'about 90 px thick'),
        'forepaw-left': (475, 1240, 'about 150 px wide (near, so perspective enlarges it)'),
        'hindpaw-left': (325, 1180, 'about 140 px wide'),
    },
    'back': {
        'horn-tip': (570, 22, ''),
        'horn-base': (575, 276, 'about 130 px across'),
        'ear-tip-left': (165, 1080, ''),
        'head-widest': (570, 470, 'head 420 to 722 px'),
        'haunch-widest': (570, 900, 'rump 355 to 785 px'),
        'tail-stub': (570, 815, 'about 60 px across'),
        'hindfoot-left': (420, 1240, 'sole seen from behind about 175 px wide'),
        'hindfoot-right': (740, 1240, ''),
        'haunch-top': (570, 690, ''),
    },
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--targets', type=Path, default=TARGETS)
    ap.add_argument('--out', type=Path, default=HERE/'measures.json')
    args = ap.parse_args()
    out = {'note': __doc__.strip(), 'units': 'F = ground to skull top (horn excluded) in that view', 'views': {}}
    for view in ('front', 'side', 'back'):
        m = sil.mask(args.targets/f'flesh-{view}.png')
        fr = sil.frame(m)
        ground, skull = fr['ground'], SKULL_TOP[view]
        F = ground-skull
        cx = float(np.nonzero(m)[1].mean())
        prof = {}
        for f in FRACTIONS:
            r = int(round(ground-f*F))
            prof[f'{f:.2f}'] = [[round((a-cx)/F, 4), round((b-cx)/F, 4)] for a, b in sil.runs(m[r])]
        lm = {}
        for name, (x, y, note) in LANDMARKS[view].items():
            lm[name] = {'px': [x, y], 'height': round((ground-y)/F, 4), 'offset': round((x-cx)/F, 4), 'note': note}
        out['views'][view] = {'image': f'flesh-{view}.png', 'size': list(m.shape[::-1]), 'groundRow': ground,
                              'maskTopRow': fr['top'], 'skullTopRow': skull, 'F_px': F, 'centroidX': round(cx, 1),
                              'hornHeightOverF': round((skull-fr['top'])/F, 4),
                              'widthOverF': {k: round(sum(b-a for a, b in v), 4) for k, v in prof.items()},
                              'runs': prof, 'landmarks': lm}
    s = out['views']['side']
    withers = s['landmarks']['withers']['height']
    F_m = WITHERS_M/withers
    out['scale'] = {'withersHeight_m': WITHERS_M, 'withersOverF': withers, 'F_m': round(F_m, 4),
                    'note': 'shoulder height 0.30 m (the template heightCm band 30 to 42 read as standing shoulder '
                            'height; its 9 to 16 kg mass fits a large rabbit); every view is scaled so its own F equals F_m'}
    args.out.write_text(json.dumps(out, indent=1), encoding='utf-8')
    for v, d in out['views'].items():
        print(v, 'F px', d['F_px'], 'horn/F', d['hornHeightOverF'], 'centroid', d['centroidX'])
        for k, l in d['landmarks'].items():
            print(f"   {k:22s} h {l['height']:.3f}  off {l['offset']:+.3f}   ->  z {l['height']*F_m:.3f} m  off {l['offset']*F_m:+.3f} m")
    print('F_m', F_m)


if __name__ == '__main__':
    main()

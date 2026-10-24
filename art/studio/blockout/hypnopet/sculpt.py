"""Hypnopet sculpt stage: the repair list on the reconstructed body (experiment X33, alignment decision 2).

    python art/studio/blockout/hypnopet/sculpt.py --base <spec.json> --repairs horn,... --out <spec.json>

The body is the reconstruction (track R, body-recon-5): the shape authority for the soft volumes. The sculpt stage
never re-sculpts it; it applies named repairs, each one a function below with its anatomy spec in the docstring,
chosen by part type (alignment decision 3): rigid precise parts (the horn) are authored as swept tubes, regions
the reconstruction got wrong are fixed by whole-region field edits, never by editing its details.
"""
import argparse
import copy
import json
from pathlib import Path


def horn(spec):
    """Horn: the sheet's spiral unicorn horn (flesh-front, closeup-horn, pick-horn) in place of v5's smooth cone.

    Anatomy spec (read from the sheet in the front, side and close-up views): one tapered spire rising from the
    crown just behind the brow, leaning about 8 degrees forward; one ridge coiled around it about five
    turns visible from the crown to the tip as fat rolls with narrow grooves between them, so the outline is
    scalloped on both sides; a small rounded tip; it emerges straight from the crown with no collar (the fur tuft
    around its base is fur, not flesh). Section profile measured on flesh-front (pixel widths scaled by the
    ground-to-skull-top height, 0.521 m over 997 px): outer radius 25.6 mm at z 0.558, 20.4 mm at z 0.589, 13.8 mm
    at z 0.620, 4.7 mm at z 0.652, tip at z 0.657 (v5's tip height was right; its radius was about 25 percent
    thin). The core profile below is the outer radius over 1.12 (the ridges' average reach). Real reference: the narwhal tusk's
    left-hand helix of grooves that tighten toward the tip (research/hypnopet/horn).
    """
    parts = [p for p in spec['parts'] if p['part'] != 'horn']
    parts.append({'part': 'horn', 'kind': 'spiral', 'blend': 0.012, 'params': {
        'base': [0, -0.137, 0.49], 'tip': [0, -0.160, 0.658],
        'profile': [[0, 0.030], [0.24, 0.026], [0.405, 0.0228], [0.59, 0.0182], [0.774, 0.0123], [0.92, 0.0062],
                    [1, 0.0035]],
        'turns': 5.0, 'ridges': 1, 'depth': 0.11, 'groove': 0.5, 'handed': 'right', 'phase': 0, 'embed': 0.01}})
    spec['parts'] = parts
    return spec


CROWN_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-body-5-crown.npz'


def crown(spec):
    """Crown: the dome of the skull around the horn root, in place of the flat plate and ridge the horn cut left.

    Cause (curvature board, sculpt-3 and sculpt-4): the body grid's horn cut (body_recon.py HORN_CUT) shaves the
    reconstruction's horn root to the cut's floor, a bowl about 5 cm across ringed by the rounded rim of the smooth
    subtraction; in clay it reads as a collar around the horn and a line across the forehead. A leaning narrow cut
    (sculpt-5) left the reconstruction's wider horn root standing as a cup around the horn: rejected. An authored
    dome (sculpt-4) filled the bowl but not the rim. Fix at the layer of the cause: bake the body grid's cuts into
    the grid (art/studio/recon/grid_bake.py), then blur the field inside a sphere of 6 cm around the horn root
    (grid_soften.py, sigma 6 mm), which rounds the rim into the crown; the horn covers the center.
    Anatomy spec: the sheet's bare front and side views show a round crown from brow to occiput with the horn
    rising straight out of it and no ring or step.
    """
    import hashlib
    for p in spec['parts']:
        if p['part'] == 'body' and p['kind'] == 'grid':
            p['params']['file'] = CROWN_GRID
            p['params']['sha256'] = hashlib.sha256(open(CROWN_GRID, 'rb').read()).hexdigest()
            p['params']['cuts'] = []
    return spec


SKIN_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-1.npz'


def skin(spec):
    """Skin: one field for body and head (critic item 9: side lobes behind the ear roots, a crease ring at the
    neck). The head grid was joined by a clip and a smooth union, which inflates the overlap and creases the clip's
    edge. prep_grids.sh bakes the body grid with only the horn cut, softens the crown (see crown), and morphs it
    with the 1 mm head grid inside the head ellipsoid (art/studio/recon/grid_merge.py) into one 1.5 mm grid; this
    repair puts that single grid in place of both. Supersedes crown.
    """
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = SKIN_GRID
    body['params']['sha256'] = hashlib.sha256(open(SKIN_GRID, 'rb').read()).hexdigest()
    body['params']['cuts'] = []
    spec['parts'] = [p for p in spec['parts'] if not (p['part'] == 'head' and p['kind'] == 'grid')]
    return spec


FACE_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-2.npz'


def face(spec):
    """Face grid: the skin grid with the mouth slot filled and the eye crescents, outer brow, jowl and nose
    softened (prep_grids.sh step 4). Needs skin first. The mouth, nose and eyes repairs build on it."""
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = FACE_GRID
    body['params']['sha256'] = hashlib.sha256(open(FACE_GRID, 'rb').read()).hexdigest()
    return spec


def mouth(spec):
    """Mouth: the sheet's happy open smile (flesh-front, flesh-side, pick-face) in place of the small, turned-down
    slot with fangs (critic item 3).

    Anatomy spec, measured on flesh-front and flesh-side (ground-to-skull-top scale, eye center as the side
    anchor): a wide D-shaped opening, corners at x +-0.037 and z 0.38 curling up into the cheeks; the top edge is
    the underside of the two muzzle pads meeting at a small notch under the nose (z 0.377 at the center); the
    bottom edge a deep U whose lowest point is about z 0.346; a rounded tongue with a center groove filling the lower
    half; a full lower lip rolled forward under it (its front 3.9 cm behind the nose tip in the side view, as on
    the model already); no teeth. Real reference: a relaxed open-mouth "smile" pulls the lip corners back and up
    (research/hypnopet/mouth). Method: field carve plus authored lip and tongue (add-after, so the carve does not
    cut them), on the face grid whose old slot is filled.
    """
    # The opening's outline is traced from flesh-front (zoomed 2x, the points below in model meters through the
    # sheet scale, ground row 1287, center column 576, 0.5226 mm per pixel) and carved straight back as a stencil,
    # so it keeps the drawing's inverted-D: corners high at z 0.385, the top edge the two muzzle pads' undersides
    # meeting at a notch under the nose, the bottom a deep U to z 0.347. Ellipsoids (sculpt-8, sculpt-9) put the
    # widest point at mid-height and read as a flat grin. Depth: from in front of the face back to y -0.207, about
    # 3.4 cm behind the lower jaw's front (y -0.241). Tongue and lower-lip roll are add-after so the carve leaves them.
    half = [[0.0, 0.3786], [0.0057, 0.3768], [0.0175, 0.3747], [0.0267, 0.3786], [0.0371, 0.3846],
            [0.0293, 0.3695], [0.0188, 0.3564], [0.0057, 0.3486], [0.0, 0.3467]]
    right = [[-u, v] for u, v in reversed(half[1:-1])]
    outline = half+right
    P = spec['parts']
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'xz', 'outline': outline, 'depth': [-0.32, -0.207], 'round': 0.012}})
    P.append({'part': 'mouth', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': 0.004, 'params': {
        # the roll stops short of the corner and sinks into the cheek there (sculpt-10 ended it at the corner,
        # where it stood up as a hook that read as a fang in the side view)
        'points': [{'p': [0.029, -0.229, 0.366], 'r': 0.0024}, {'p': [0.024, -0.2375, 0.3575], 'r': 0.0042},
                   {'p': [0.0165, -0.2405, 0.3515], 'r': 0.0052}, {'p': [0.0057, -0.2425, 0.3465], 'r': 0.0058},
                   {'p': [0, -0.2428, 0.3455], 'r': 0.0059}]}})
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'mirror': 'x', 'blend': 0.006, 'params': {
        'center': [0.0078, -0.226, 0.3555], 'radii': [0.0135, 0.019, 0.0085], 'exponent': 2.0, 'rotation': [-10, 0, 0]}})
    # the tongue's root, under the two lobes: it closes the pocket between the lobes' groove, the lip and the floor
    # (a 16-vertex sealed void at x 0, y -0.233, z 0.349 refused the first build)
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'blend': 0.006, 'params': {
        'center': [0, -0.226, 0.349], 'radii': [0.016, 0.02, 0.006], 'exponent': 2.0}})
    return spec


def nose(spec):
    """Nose: a distinct rounded button (flesh-side, pick-face) in place of the wide inverted triangle (critic item
    14). Anatomy spec: a soft rounded triangle about 0.17 of the head width across (30 mm), standing about 6 mm
    proud of the muzzle front (the sheet's side view: nose button 0.7 cm ahead of the upper lip), two small nostrils
    on its underside front; the face grid softens the old nose."""
    P = spec['parts']
    P.append({'part': 'nose', 'kind': 'mass', 'blend': 0.006, 'params': {
        'center': [0, -0.272, 0.398], 'radii': [0.015, 0.0115, 0.011], 'exponent': 2.2}})
    P.append({'part': 'nose', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.002, 'params': {
        'center': [0.0066, -0.2832, 0.3925], 'radii': [0.0034, 0.0026, 0.0025], 'exponent': 2.0}})
    return spec


def eyes(spec):
    """Eyes: set into the head and turned a little outward (critic item 2: they faced straight ahead and stood
    out of the face outline in the side and three-quarter views). Anatomy spec, measured on flesh-side with the eye
    center as the anchor: the nose tip sits 8.8 cm ahead of the eye center (6.9 cm on the model), so the eyes move
    back 1.3 cm; the side view shows a near-full circle, so the gaze turns 35 degrees outward. The sheet cheats
    (round irises in the front and the side views at once); the sprites are side and three-quarter facings
    (ratified for Luceras), so the gaze favors them over the front view. Size and spacing in the front view are
    kept (critic: matches). Sculpt-11 tried 18 degrees: the side view still showed a sliver.
    """
    import math
    a = math.radians(35)
    for p in spec['parts']:
        if p['part'] in ('eyes', 'head') and p['kind'] == 'mass' and abs(p['params']['center'][0]-0.049) < 1e-3:
            p['params']['center'] = [0.050, -0.200, 0.435]
            if p.get('separate'):
                p['gaze'] = [math.sin(a), -math.cos(a), 0.035]
                p['pivot'] = [0.050, -0.200, 0.435]
    return spec


PROPORTION_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-3.npz'


def proportions(spec):
    """Proportions (critic items 4 and 5): the face grid warped by board/warps-1.json (art/studio/recon/
    grid_warp.py): the torso 3.3 cm longer in the belly slab between the forelegs and the hind legs, each ear swung
    back 11 degrees from its root and its blade narrowed, the hind foot lengthened forward from the heel by a fifth,
    the forepaw shortened toward the wrist. The reconstruction's details stay; only lengths and the ear angle change.
    Needs face (it replaces the face grid with its warped copy)."""
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = PROPORTION_GRID
    body['params']['sha256'] = hashlib.sha256(open(PROPORTION_GRID, 'rb').read()).hexdigest()
    body['params']['clip'] = {'center': [0, 0.02, 0.33], 'radii': [0.33, 0.40, 0.42], 'blend': 0.0}
    return spec


REPAIRS = {'proportions': proportions, 'horn': horn, 'crown': crown, 'skin': skin, 'face': face, 'mouth': mouth, 'nose': nose, 'eyes': eyes}


def build(base, names):
    spec = copy.deepcopy(base)
    for n in names:
        if n not in REPAIRS:
            raise SystemExit(f'unknown repair {n!r} (known: {", ".join(REPAIRS)})')
        spec = REPAIRS[n](spec)
    spec['version'] = 'sculpt-'+'-'.join(names)
    spec['note'] = (base.get('note', '')+' Sculpt repairs (sculpt.py, experiment X33): '+', '.join(names)+'.').strip()
    return spec


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', type=Path, required=True)
    ap.add_argument('--repairs', required=True)
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    a.out.parent.mkdir(parents=True, exist_ok=True)
    spec = build(json.loads(a.base.read_text()), [r for r in a.repairs.split(',') if r])
    a.out.write_text(json.dumps(spec, indent=1), encoding='utf-8')
    print('wrote', a.out)

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
    Critic 2 (sculpt-14): only about four turns showed, the top 30 percent read as a smooth cone and the tip carried
    a small bead. The sheet's rolls tighten and stay deep to the tip (about six), so the turns tighten toward the
    tip (twist 1.25), the ridge depth grows from 12 to 26 percent of the core radius, and the tip is a rounded cap
    no narrower than the last roll (the bead was a 3.5 mm tip sphere on a thinner neck).
    """
    parts = [p for p in spec['parts'] if p['part'] != 'horn']
    parts.append({'part': 'horn', 'kind': 'spiral', 'blend': 0.012, 'params': {
        'base': [0, -0.137, 0.49], 'tip': [0, -0.160, 0.658],
        'profile': [[0, 0.030], [0.24, 0.026], [0.405, 0.0228], [0.59, 0.0182], [0.774, 0.0123], [0.90, 0.0084],
                    [0.965, 0.0060], [1, 0.0050]],
        'turns': 5.5, 'twist': 1.25, 'ridges': 1, 'depth': 0.12, 'depthTip': 0.26, 'groove': 0.5, 'handed': 'right',
        'phase': 0, 'embed': 0.01}})
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
    slot with fangs (critic 1 item 3), rebuilt in sculpt-18 after critic 2 (item 3 and new defect 3: still a 28 px
    slot, the tongue hidden behind the lower lip, pointed upper-lip flaps at the corners).

    Anatomy spec, measured on flesh-front and flesh-side (ground-to-skull-top scale, eye center as the side
    anchor): a wide D-shaped opening, 6.9 cm across with its corners at z 0.385 curling up into the cheeks; the top
    edge is the underside of the two muzzle pads meeting at a small notch under the nose; the bottom a deep U to
    about z 0.336; open about 4.3 cm at the center; a broad rounded tongue (3.8 cm across, a center groove) lying on
    the floor of the mouth and filling its lower two thirds, with dark mouth above it; a full lower lip rolled
    forward under it; no teeth. In the side view the jaw hangs open: the opening is a wedge from the front back to
    the corner, which sits under the front of the eye (7 cm behind the nose tip; the front carve alone put it 2 cm
    further forward, so the side view showed a slit). Real reference: a relaxed open-mouth smile pulls the lip
    corners back and up (research/hypnopet/mouth). Method: a front stencil (the D) and a side stencil (the wedge),
    both carved, then the lips, chin and tongue added after the carve.
    """
    # the corners are rounded ends turned up a little (sculpt-19 to 21 raised them into narrow curls, which left a
    # pointed lip flap between the curl and the side opening that read as a fang in the three-quarter view and
    # stair-stepped at the rig's 2.5 mm remesh)
    half = [[0.0, 0.3795], [0.006, 0.3775], [0.016, 0.3755], [0.025, 0.3772], [0.031, 0.3800], [0.0345, 0.3815],
            [0.0362, 0.3800], [0.0360, 0.3770], [0.0335, 0.3730], [0.0285, 0.3670], [0.0190, 0.3520],
            [0.0080, 0.3400], [0.0, 0.3370]]
    right = [[-u, v] for u, v in reversed(half[1:-1])]
    P = spec['parts']
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'xz', 'outline': half+right, 'depth': [-0.32, -0.200], 'round': 0.012}})
    # the side wedge: upper edge kept under the pads' lowest point (0.3755) under the pads so the front D keeps their
    # shape, rising behind them to the D's corners (0.381); it is no wider than the muzzle and ends at y -0.2285,
    # where the cheek widens. A wider and deeper wedge cut slots into the cheeks (sculpt-19, 0.042 to y -0.214) or a
    # step into the profile under the nose (sculpt-24, 0.045); the wall it leaves at the corner is rounded off below
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'yz', 'outline': [[-0.32, 0.371], [-0.252, 0.371], [-0.242, 0.377], [-0.234, 0.3805], [-0.2285, 0.3790],
                                   [-0.2305, 0.3745], [-0.238, 0.3620], [-0.248, 0.3460], [-0.32, 0.338]],
        'depth': [-0.034, 0.034], 'round': 0.004}})
    # the muzzle's side wall between the lips, just outside the wedge, rounded away by a smooth carve at each corner
    P.append({'part': 'mouth', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.003, 'params': {
        'center': [0.036, -0.246, 0.3705], 'radii': [0.010, 0.011, 0.0062], 'exponent': 2.0}})
    # lower lip: a roll along the U, sinking into the jaw well below the corner (ending at the corner, it stood up
    # in the side opening as a fang, sculpt-20)
    P.append({'part': 'mouth', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': 0.004, 'params': {
        'points': [{'p': [0.025, -0.233, 0.358], 'r': 0.0024}, {'p': [0.0225, -0.236, 0.356], 'r': 0.0038},
                   {'p': [0.017, -0.240, 0.350], 'r': 0.0050}, {'p': [0.0075, -0.2445, 0.3415], 'r': 0.0056},
                   {'p': [0, -0.2455, 0.3395], 'r': 0.0057}]}})
    # chin: a round pad under the lower lip, so the lip is a broad U, not a V over a narrow jaw
    P.append({'part': 'chin', 'kind': 'mass', 'blend': 0.014, 'params': {
        'center': [0, -0.232, 0.331], 'radii': [0.022, 0.017, 0.012], 'exponent': 2.0}})
    # upper lip: a rounded rim along the pads' undersides, so the stencil's cut edge is not a sharp sheet
    P.append({'part': 'mouth', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': 0.004, 'params': {
        # it runs the whole edge to the corner, tapering (ending at x 0.025, its round end hung as a small tooth in
        # the three-quarter view, sculpt-22); centers 2.5 to 4 mm inside the face front measured at each point
        'points': [{'p': [0.0, -0.2715, 0.3830], 'r': 0.0038}, {'p': [0.006, -0.2705, 0.3815], 'r': 0.0040},
                   {'p': [0.016, -0.2650, 0.3797], 'r': 0.0040}, {'p': [0.025, -0.2610, 0.3812], 'r': 0.0032},
                   {'p': [0.031, -0.2560, 0.3832], 'r': 0.0025}, {'p': [0.0345, -0.2510, 0.3842], 'r': 0.0016}]}})
    # tongue: two lobes either side of a center groove, lying on the floor, the tip just over the lower lip's front
    # (flesh-side), tilted up toward the back so its top surface shows in the front view
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'mirror': 'x', 'blend': 0.006, 'params': {
        'center': [0.0092, -0.236, 0.3525], 'radii': [0.0150, 0.018, 0.0085], 'exponent': 2.0,
        'rotation': [12, 0, 0]}})
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'blend': 0.006, 'params': {
        'center': [0, -0.226, 0.3460], 'radii': [0.017, 0.020, 0.0065], 'exponent': 2.0}})
    return spec


def bridge(spec):
    """Bridge: one convex line from the brow to the nose in the side view (critic 2 new defect 9: a dip between
    the eye and the nose, so the nose sat like a knob on the end of a tube). Anatomy spec, measured on flesh-side
    with the eye center as the anchor: the bridge stands about 2.2 cm in front of the eye's front edge at the eye's
    mid-height (1 cm on the model) and runs down into the top of the nose button without a step. A wide, low fill
    along the midline (3.6 cm across, ending below the brow), so it reads as the muzzle's top: sculpt-18's narrow
    sweep stood as a rib between the eyes in the front view."""
    spec['parts'].append({'part': 'bridge', 'kind': 'sweep', 'blend': 0.012, 'params': {
        'points': [{'p': [0, -0.222, 0.452], 'r': 0.012}, {'p': [0, -0.230, 0.435], 'r': 0.018},
                   {'p': [0, -0.240, 0.418], 'r': 0.017}, {'p': [0, -0.250, 0.406], 'r': 0.013}]}})
    return spec


def nose(spec):
    """Nose: a distinct rounded button (flesh-side, pick-face) in place of the wide inverted triangle (critic 1 item
    14). Anatomy spec: a soft rounded triangle about 0.15 of the head width across (27 mm on the sheet; critic 2
    measured the sculpt-14 button 18 percent wider), standing about 6 mm proud of the muzzle front (the sheet's side
    view: nose button 0.7 cm ahead of the upper lip), two small nostrils on its underside front; the face grid
    softens the old nose."""
    P = spec['parts']
    P.append({'part': 'nose', 'kind': 'mass', 'blend': 0.006, 'params': {
        'center': [0, -0.2715, 0.3985], 'radii': [0.0128, 0.0110, 0.0102], 'exponent': 2.2}})
    P.append({'part': 'nose', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.002, 'params': {
        'center': [0.0058, -0.2822, 0.3930], 'radii': [0.0031, 0.0024, 0.0023], 'exponent': 2.0}})
    return spec


def eyes(spec):
    """Eyes: large round eyes on the front corners of the face (critic 1 item 2; critic 2 item 2 and new defects 1
    and 2: sculpt-14's eyes read small and far apart, the pupils wall-eyed).

    Anatomy spec, measured on flesh-front and flesh-side (ground-to-skull-top scale, the side anchored on the nose
    tip 8.8 cm ahead of the eye center): ball center 5.2 cm off the midline at z 0.435; the eye shows 5.3 cm across
    in the front view (its inner edge 2.6 cm from the midline, nearly at the bridge) and 7.4 by 7.7 cm in the side
    view, so the ball is about 7.8 cm across and bulges from the face; the pupils look at the viewer in the front
    view. The sheet cheats (round irises in front and side at once); a 28 degree outward gaze centers the pupil in
    the opening in the front view (35 degrees put it 10 to 12 px outward) and still shows the iris in the side and
    three-quarter views, which are the sprite facings.
    """
    import math
    a = math.radians(28)
    c = [0.051, -0.199, 0.436]
    for p in spec['parts']:
        if p['part'] in ('eyes', 'head') and p['kind'] == 'mass' and abs(p['params']['center'][0]-0.049) < 1e-3:
            p['params']['center'] = c
            if p.get('separate'):
                p['params']['radii'] = [0.039]*3
                p['gaze'] = [math.sin(a), -math.cos(a), 0.035]
                p['pivot'] = c
            else:
                p['params']['radii'] = [0.0398]*3
    return spec


def lids(spec):
    """Lids: a soft rim of skin around each eye where the lid meets the ball (flesh-front, flesh-side: a rounded
    ring about 3 to 4 mm thick, fuller over the top), in place of the bare crease the socket carve leaves (sculpt-18
    onward). Points: where the eyes repair's ball (center [0.051, -0.199, 0.436], radius 3.9 cm, gaze 28 degrees out)
    first enters the skin grid along 15 meridians around the gaze, 2 degrees further round, lifted off the ball by
    a little over half the tube radius, so the ring rests on the ball's edge and blends into the skin. Needs eyes;
    the socket carve trims its inner side 0.8 mm off the ball."""
    spec['parts'].append({'part': 'lids', 'kind': 'sweep', 'mirror': 'x', 'blend': 0.004, 'params': {
        'closed': True, 'points': [
            {'p': [0.028, -0.2325, 0.4367], 'r': 0.0030}, {'p': [0.0304, -0.2307, 0.4514], 'r': 0.0033},
            {'p': [0.0382, -0.2265, 0.4635], 'r': 0.0036}, {'p': [0.0500, -0.2207, 0.4708], 'r': 0.0038},
            {'p': [0.0623, -0.2119, 0.4733], 'r': 0.0038}, {'p': [0.0735, -0.1997, 0.4703], 'r': 0.0037},
            {'p': [0.0814, -0.1859, 0.4601], 'r': 0.0035}, {'p': [0.0839, -0.1764, 0.4443], 'r': 0.0032},
            {'p': [0.0830, -0.1755, 0.4275], 'r': 0.0028}, {'p': [0.0819, -0.1879, 0.4125], 'r': 0.0025},
            {'p': [0.0740, -0.2011, 0.4030], 'r': 0.0023}, {'p': [0.0635, -0.2145, 0.4010], 'r': 0.0022},
            {'p': [0.0519, -0.2233, 0.4039], 'r': 0.0022}, {'p': [0.0400, -0.2284, 0.4106], 'r': 0.0024},
            {'p': [0.0313, -0.2315, 0.4221], 'r': 0.0027}]}})
    return spec


def toes(spec):
    """Toes: four domed toes on every foot with deep splits between them (flesh-front, flesh-side, closeup-hindfoot;
    critic 2 items 6 and new defect 5: the forepaws' grooves were shallow ribs and the hind toes were smoothed away,
    so the hind feet read as boots). Anatomy spec: a rabbit has four toes on each hind foot and four weight-bearing
    toes on each forefoot (the fifth, the dewclaw, is high on the inside and hidden in fur); on the sheet each toe is
    a rounded dome about 1.7 cm across at the front of the foot, the middle two slightly ahead of the outer two,
    split about 2 cm back on top while the sole stays joined (research/hypnopet/feet). Method: a dome per toe,
    added, then a thin slot carved between neighbours through the front of the foot down to about 1 cm above the
    sole. Positions from slices of the skin grid (forepaw front edge y -0.205, 6.5 cm wide; hind foot front y 0.043);
    the hind toes reach 1 cm further forward (critic 2: hind foot 93 percent of the sheet's length)."""
    P = spec['parts']
    # domes stand about 5 mm proud of the old front and top so each toe has its own round front; the splits are
    # soft V grooves (sculpt-27's 2.2 mm slots read as knife cuts, not toes)
    fore = [([0.025, -0.197, 0.019], 0.0135), ([0.040, -0.203, 0.020], 0.0145), ([0.055, -0.202, 0.020], 0.0145),
            ([0.069, -0.194, 0.019], 0.0135)]
    hind = [([0.097, 0.057, 0.020], 0.017), ([0.113, 0.046, 0.021], 0.018), ([0.130, 0.046, 0.021], 0.018),
            ([0.146, 0.057, 0.020], 0.017)]
    for c, ry in fore:
        P.append({'part': 'toes', 'kind': 'mass', 'mirror': 'x', 'blend': 0.005, 'params': {
            'center': c, 'radii': [0.0088, ry, 0.0160], 'exponent': 2.0}})
    for c, ry in hind:
        P.append({'part': 'toes', 'kind': 'mass', 'mirror': 'x', 'blend': 0.005, 'params': {
            'center': c, 'radii': [0.0098, ry, 0.0175], 'exponent': 2.0}})
    for x in (0.0325, 0.0475, 0.062):
        P.append({'part': 'toes', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.004, 'params': {
            'center': [x, -0.206, 0.034], 'radii': [0.0034, 0.017, 0.022], 'exponent': 2.0}})
    for x in (0.105, 0.1215, 0.138):
        P.append({'part': 'toes', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.004, 'params': {
            'center': [x, 0.040, 0.034], 'radii': [0.0036, 0.019, 0.024], 'exponent': 2.0}})
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


DETAIL_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-4.npz'


def details(spec):
    """Close-up blemishes (critic items 6, 9 to 13) softened on the proportioned grid (prep_grids.sh step 6): sole
    rims, side lobes at the back of the head, the thigh's front crease, wrist lumps, armpit slits, the pinch on each
    ear's outer face, and the buttock cleft under the tail. Needs proportions."""
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = DETAIL_GRID
    body['params']['sha256'] = hashlib.sha256(open(DETAIL_GRID, 'rb').read()).hexdigest()
    return spec


SMOOTH_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-5.npz'


def smooth(spec):
    """Second blemish pass (critic 2), on a re-warped grid (prep_grids.sh steps 5b to 7): the ear rake bent over 12 cm
    instead of 7 (warps-6.json; the short bend left a crease across the back of each ear a third of the way down,
    new defect 4), the raised stem under the tail flattened and the V pinch at the top of the buttock cleft filled
    (item 13), and the diagonal creases where the ear roots meet the back of the skull softened (item 9). Replaces
    details' grid (it repeats step 6 on the new warp)."""
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = SMOOTH_GRID
    body['params']['sha256'] = hashlib.sha256(open(SMOOTH_GRID, 'rb').read()).hexdigest()
    return spec


def tail(spec):
    """Tail: a round nub set above the cleft (flesh-back), in place of the teardrop that flowed into the
    buttock cleft (critic item 13). Anatomy spec: a short stub of a few small vertebrae under a fur pompon
    (research/hypnopet/tail); bare, a ball about 3.5 cm across on the rump's top-back, slightly upturned. The ball
    rounds the reconstruction's tail tip (center 1.3 cm in from its tip at y 0.246, z 0.268)."""
    spec['parts'].append({'part': 'tail', 'kind': 'mass', 'blend': 0.008, 'params': {
        'center': [0, 0.231, 0.27], 'radii': [0.0175, 0.0165, 0.0175], 'exponent': 2.0}})
    return spec


REPAIRS = {'smooth': smooth, 'toes': toes, 'lids': lids, 'bridge': bridge, 'details': details, 'tail': tail, 'proportions': proportions, 'horn': horn, 'crown': crown, 'skin': skin, 'face': face, 'mouth': mouth, 'nose': nose, 'eyes': eyes}


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

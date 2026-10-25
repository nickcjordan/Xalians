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
    Critic 3 (sculpt-29): still about four turns against six, the coils fat beads with pinched necks where the sheet
    is a straight-sided twisted cone, a two-lobed bead at the tip, the base 0.029 H too far back, leaning 8.5
    degrees against the sheet's 19 and 15 to 23 percent thin front to back. Now: base 1.4 cm forward, leaning 15
    degrees, the profile 12 percent fuller, six and a half turns with shallower, broader-bottomed grooves (groove
    0.65, depth 11 to 16 percent), the tip a plain rounded point.
    Critic 4 (sculpt-36): still stacked beads with near-horizontal grooves (10 to 15 degrees against the sheet's 21
    to 26), the pitch tightening 8 percent against 40, a dome on a ledge at the tip, the base flaring 20 percent
    wide. A twisted cone of two strands gives the sheet's steep grooves at the same groove count (each strand's
    pitch is twice the groove spacing) was tried and read as a twisted blade, not rolls (sculpt-37). Kept one strand:
    six turns tightening toward the tip (twist 1.15; 1.4 left the bottom third a plain cone, sculpt-38), a gentler
    sine groove, the ridges fading over the last 18 percent into a rounded point that narrows without a neck, the base
    11 percent narrower. Critic 5 (sculpt-40): still 4.5 turns against 5.5 with grooves at 4 to 17 degrees against
    the sheet's 34 to 40, which no single strand can give (a 35 degree groove on this cone needs a 9 cm pitch, two
    turns). Three strands twisted 1.9 turns each (sculpt-48, 49) read as a smooth goat horn at board size, and two
    (sculpt-37) as a twisted blade; the six-turn single strand reads as the sheet's rolled horn at every size, so it
    stays and the groove angle is an open difference.
    """
    parts = [p for p in spec['parts'] if p['part'] != 'horn']
    parts.append({'part': 'horn', 'kind': 'spiral', 'blend': 0.006, 'params': {
        'base': [0, -0.151, 0.49], 'tip': [0, -0.196, 0.652],
        'profile': [[0, 0.0300], [0.24, 0.0275], [0.405, 0.0248], [0.59, 0.0200], [0.774, 0.0138], [0.90, 0.0090],
                    [0.95, 0.0068], [0.98, 0.0048], [1, 0.0036]],
        'turns': 6.0, 'twist': 1.15, 'ridges': 1, 'depth': 0.12, 'depthTip': 0.17, 'groove': 0.75, 'fade': 0.18,
        'handed': 'right', 'phase': 0, 'embed': 0.01}})
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
    # the top edge is the two muzzle pads' round undersides meeting at a notch under the nose that rises, not
    # hangs (critic 3: a center point lower than the pads read as a tooth in three-quarter views)
    # critic 4 (sculpt-36): the opening 30 percent too shallow with a flat bottom, the pads' edge nearly straight,
    # the corners barely above the lip line. Critic 5 (sculpt-40): a polygon's corners carved spikes at the mouth's
    # ends and its W top read as a bat wing; the outline is now control points of a smooth closed spline (stencil
    # smooth), so the corners are rounded curls turning up 1.1 cm above the pads' undersides and the bottom a round U
    # sculpt-49: the corners 4 mm narrower (the overlay put the dark opening at x 0.035 against the sheet's 0.028,
    # its corners thin creases out to 0.033)
    half = [[0.0, 0.3772], [0.0075, 0.3752], [0.0135, 0.3742], [0.020, 0.3752], [0.025, 0.3780], [0.0290, 0.3830],
            [0.0318, 0.3852], [0.0335, 0.3828], [0.0322, 0.3765], [0.0285, 0.3655], [0.0205, 0.3490],
            [0.0100, 0.3370], [0.0, 0.3330]]
    right = [[-u, v] for u, v in reversed(half[1:-1])]
    P = spec['parts']
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'xz', 'outline': half+right, 'depth': [-0.32, -0.200], 'round': 0.012, 'smooth': 240}})
    # the side wedge: upper edge kept under the pads' lowest point (0.3755) under the pads so the front D keeps their
    # shape, rising behind them to the D's corners (0.381); it is no wider than the muzzle and ends at y -0.2285,
    # where the cheek widens. A wider and deeper wedge cut slots into the cheeks (sculpt-19, 0.042 to y -0.214) or a
    # step into the profile under the nose (sculpt-24, 0.045); the wall it leaves at the corner is rounded off below
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'yz', 'outline': [[-0.32, 0.369], [-0.252, 0.369], [-0.243, 0.376], [-0.235, 0.3825], [-0.229, 0.3815],
                                   [-0.2305, 0.3765], [-0.238, 0.3620], [-0.248, 0.3430], [-0.32, 0.333]],
        'depth': [-0.031, 0.031], 'round': 0.004}})
    # the muzzle's side wall between the lips, just outside the wedge, rounded away by a smooth carve at each corner
    P.append({'part': 'mouth', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.003, 'params': {
        'center': [0.033, -0.245, 0.3720], 'radii': [0.009, 0.011, 0.0065], 'exponent': 2.0}})
    # lower lip: a roll along the U, sinking into the jaw well below the corner (ending at the corner, it stood up
    # in the side opening as a fang, sculpt-20)
    P.append({'part': 'mouth', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': 0.004, 'params': {
        # set 8 mm back from sculpt-29 (critic 3: the lower lip jutted 0.015 to 0.02 H past the sheet's)
        # along the deeper U, 3 mm under its edge; its end sinks under the edge before the corner (sculpt-39: ending
        # at the old height it stood up out of the deeper opening as a pair of fangs)
        # a rim that frames the tongue (critic 7, sculpt-52: no lower lip showed; the tongue ran into the chin)
        'points': [{'p': [0.0265, -0.2300, 0.3535], 'r': 0.0022}, {'p': [0.0235, -0.2330, 0.3490], 'r': 0.0040},
                   {'p': [0.0180, -0.2370, 0.3435], 'r': 0.0055}, {'p': [0.0095, -0.2405, 0.3335], 'r': 0.0063},
                   {'p': [0, -0.2420, 0.3290], 'r': 0.0065}]}})
    # chin: a round pad under the lower lip, so the lip is a broad U, not a V over a narrow jaw
    P.append({'part': 'chin', 'kind': 'mass', 'blend': 0.014, 'params': {
        'center': [0, -0.226, 0.323], 'radii': [0.021, 0.017, 0.013], 'exponent': 2.0}})
    # upper lip: the sheet's two round muzzle pads under the nose, whose undersides make the opening's top edge
    # (critic 3: the pads were missing and the area under the nose flat); a rounded rim continues them to the corner.
    # Sculpt-53: 4 mm further forward (critic 7: in profile the upper lip sat 3 to 4 cm behind the nose tip)
    P.append({'part': 'mouth', 'kind': 'mass', 'op': 'add-after', 'mirror': 'x', 'blend': 0.005, 'params': {
        'center': [0.0120, -0.2660, 0.3840], 'radii': [0.0140, 0.0145, 0.0115], 'exponent': 2.0}})
    # muzzle: a full rounded upper muzzle between the nose and the mouth (critic 6, sculpt-50: in profile a thin nose
    # tube with a recessed upper lip, 0.045 H deep 0.035 H behind the nose tip against the sheet's 0.075 H); added
    # before the carves, so the opening is cut through it, with the pads on top
    P.append({'part': 'mouth', 'kind': 'mass', 'blend': 0.012, 'params': {
        'center': [0, -0.252, 0.389], 'radii': [0.024, 0.018, 0.015], 'exponent': 2.0}})
    # cheeks: a round mass beside each corner pushing up toward the eye, as a smile does (critic 4: no cheek mass by
    # the corners, and the face concave between the eye and the mouth corner in the side view)
    P.append({'part': 'mouth', 'kind': 'mass', 'mirror': 'x', 'blend': 0.014, 'params': {
        'center': [0.043, -0.222, 0.388], 'radii': [0.016, 0.015, 0.013], 'exponent': 2.0}})
    P.append({'part': 'mouth', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': 0.004, 'params': {
        # it runs the whole edge to the corner, tapering (ending at x 0.025, its round end hung as a small tooth in
        # the three-quarter view, sculpt-22); centers 2.5 to 4 mm inside the face front measured at each point
        'points': [{'p': [0.020, -0.2630, 0.3800], 'r': 0.0034}, {'p': [0.025, -0.2610, 0.3812], 'r': 0.0032},
                   {'p': [0.031, -0.2560, 0.3832], 'r': 0.0025}, {'p': [0.0345, -0.2510, 0.3842], 'r': 0.0016}]}})
    # (a smile crease carved from each corner up into the cheek, sculpt-32 to 34, read as a pockmark above the corner
    # in the side and three-quarter views, not as a line; dropped)
    # tongue: one rounded lobe (two lobes either side of a groove left a pit where the groove met the lower lip,
    # sculpt-41), lying on the floor inside the lower lip (critic 3: lying over
    # the lower lip it read as a slab), domed, tilted up toward the back so its top surface shows in the front view;
    # 3.5 cm across (critic 4: 0.080 H wide against the sheet's 0.050 H, with no dark mouth beside it); its tip
    # comes forward onto the lower lip and up into the light (critic 5: set deep and low it rendered as part of the
    # hole), the root kept behind the lip (critic 5: it poked through below the lip as a pale tab); it fills the
    # lower two thirds of the opening, leaving a dark band under the pads as on the sheet (sculpt-43), and the notch
    # between the pads rises 3 mm, not 5. Sculpt-44 and 45 raised the whole mouth 6 to 9 mm and narrowed it to match
    # a metric overlay on flesh-front; the raised corners left the muzzle's side wall as a thin blade and flaps beside
    # the corners, so that was undone (open item: the mouth sits 6 to 9 mm low against the sheet). A bigger tongue
    # (sculpt-47) bulged out as a ball with a slot under it; undone too
    # (sculpt-53: 3 mm back again, behind the new lower lip rim)
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'blend': 0.006, 'params': {
        'center': [0, -0.224, 0.3500], 'radii': [0.0175, 0.016, 0.0105], 'exponent': 2.0,
        'rotation': [12, 0, 0]}})
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'blend': 0.006, 'params': {
        'center': [0, -0.212, 0.3370], 'radii': [0.013, 0.020, 0.0068], 'exponent': 2.0}})
    return spec


def bridge(spec):
    """Bridge: one convex line from the brow to the nose in the side view (critic 2 new defect 9: a dip between
    the eye and the nose, so the nose sat like a knob on the end of a tube). Anatomy spec, measured on flesh-side
    with the eye center as the anchor: the bridge stands about 2.2 cm in front of the eye's front edge at the eye's
    mid-height (1 cm on the model) and runs down into the top of the nose button without a step. A wide, low fill
    along the midline (3.6 cm across, ending below the brow), so it reads as the muzzle's top: sculpt-18's narrow
    sweep stood as a rib between the eyes in the front view. Critic 3 (sculpt-29): just above the nose the bridge
    stood up to 0.02 H in front of the sheet, which has a near-vertical step (a stop) behind the button nose, so it
    read as a rodent's wedge; the fill now ends 1.5 cm above the nose."""
    spec['parts'].append({'part': 'bridge', 'kind': 'sweep', 'blend': 0.012, 'params': {
        # sculpt-81 (Nick, 2026-10-25: "the side profile ... is very lumpy and doesn't look very intentional"): the
        # sweep now traces the sheet's own side silhouette from the nose's top to the forehead, its front edge on
        # the sheet's line (center = sheet front + radius + 2 mm for the blend), where sculpt-80 stood 1 cm proud
        # at the bridge and 4 mm short on the forehead
        'points': [{'p': [0, -0.240, 0.410], 'r': 0.012}, {'p': [0, -0.2345, 0.420], 'r': 0.015},
                   {'p': [0, -0.2302, 0.435], 'r': 0.017}, {'p': [0, -0.2263, 0.450], 'r': 0.018},
                   {'p': [0, -0.2196, 0.465], 'r': 0.018}, {'p': [0, -0.2101, 0.480], 'r': 0.016},
                   {'p': [0, -0.1965, 0.495], 'r': 0.013}]}})
    return spec


def nose(spec):
    """Nose: a distinct rounded button (flesh-side, pick-face) in place of the wide inverted triangle (critic 1 item
    14). Anatomy spec: a soft rounded triangle about 0.15 of the head width across (27 mm on the sheet; critic 2
    measured the sculpt-14 button 18 percent wider), standing about 6 mm proud of the muzzle front (the sheet's side
    view: nose button 0.7 cm ahead of the upper lip), two small nostrils on its underside front; the face grid
    softens the old nose. Critic 4 (sculpt-36): now 20 percent narrow and a round button against the sheet's broad
    inverted triangle with flared nostril wings; the button is 2.8 cm across with two wings at its lower corners."""
    P = spec['parts']
    # sculpt-65 (critic 8, sculpt-62: 2.2 cm and round with the nostrils facing forward, a pig snout from the front;
    # the sheet's is a rounded inverted triangle 3.1 cm across, its point dropping to the pads' notch, the nostrils
    # under its lower corners). Sculpt-71 (critic 10, sculpt-68: no crease separates it from the muzzle, so it read
    # as the squared end of a tube): the button is added after the carves into a socket 1.5 mm bigger than itself,
    # which leaves a crease around its base, and the nostrils are cut into it afterwards (carve-after)
    # sculpt-74: a rounded inverted triangle from three lobes and a point (one superellipsoid read as a pig's
    # oval at exponent 2.6 and a box at 3)
    # sculpt-75 (critic 11: in profile a small pointed knob, 1.2 cm tall, against the sheet's round 2 cm ball; in
    # three-quarter separate bulges): the middle lobe is the ball, the lobes merge with a wider blend
    lobes = [{'center': [0.0090, -0.2720, 0.3945], 'radii': [0.0085, 0.0105, 0.0075], 'exponent': 2.0},
             {'center': [-0.0090, -0.2720, 0.3945], 'radii': [0.0085, 0.0105, 0.0075], 'exponent': 2.0},
             {'center': [0, -0.2750, 0.3885], 'radii': [0.0110, 0.0105, 0.0105], 'exponent': 2.0},
             {'center': [0, -0.2735, 0.3840], 'radii': [0.0055, 0.0085, 0.0065], 'exponent': 2.0}]

    def grown(m, d):
        return {**m, 'radii': [r+d for r in m['radii']]}
    for m in lobes:
        P.append({'part': 'nose', 'kind': 'mass', 'op': 'carve', 'blend': 0.003, 'params': grown(m, 0.0015)})
    for m in lobes:
        P.append({'part': 'nose', 'kind': 'mass', 'op': 'add-after', 'blend': 0.009, 'params': m})
    # nostrils under the lower corners of the triangle, facing down and out
    P.append({'part': 'nose', 'kind': 'mass', 'op': 'carve-after', 'mirror': 'x', 'blend': 0.0015, 'params': {
        'center': [0.0080, -0.2805, 0.3830], 'radii': [0.0048, 0.0034, 0.0024], 'exponent': 2.0}})
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
    Critic 3 (sculpt-29): pupils still 10 px outward of the iris center, the eyes 18 percent further apart than the
    sheet, 10 percent too tall in front, and the far eye poking out of the face outline in three-quarter view. Now
    3.75 cm balls, 4 mm closer to the midline, gaze 20 degrees out, the socket 0.4 mm clear of the ball.
    Critic 4 (sculpt-36): pupils, size and height fixed; centers still 14 percent wider apart than the sheet; now
    another 4 mm in (x 0.043).
    """
    import math
    a = math.radians(20)
    c = [0.043, -0.199, 0.436]
    for p in spec['parts']:
        if p['part'] in ('eyes', 'head') and p['kind'] == 'mass' and abs(p['params']['center'][0]-0.049) < 1e-3:
            p['params']['center'] = c
            if p.get('separate'):
                p['params']['radii'] = [0.0375]*3
                p['gaze'] = [math.sin(a), -math.cos(a), 0.035]
                p['pivot'] = c
            else:
                p['params']['radii'] = [0.0379]*3
    return spec


def mouthrebuild(spec):
    """Lower face rebuilt around the sheet's mouth (Nick, 2026-10-25: "the face still needs work"; lesson 20: five
    rounds of carving the reconstruction's muzzle never reached the sheet's open smile). Runs last: it drops every
    mouth, tongue and chin part the earlier repairs authored and replaces them, in the final (post-lowerface)
    coordinates, with a muzzle of its own over the reconstruction's, so no carve meets the reconstruction's walls.

    Anatomy spec, measured on metric overlays of sculpt-53 on flesh-front and flesh-side at one scale (ovf53, ovs53):
    two round muzzle pads under the nose spanning x 0.037 each side, their undersides at z 0.376 meeting at a notch at
    0.381, their fronts 0.6 cm behind the nose tip (y -0.276); the opening a wide D, its corners at x 0.038 turned up
    to z 0.389 into the cheeks, its bottom a round U at z 0.344, so 3.7 cm open at the center; a broad tongue (3.6 cm
    across, z 0.344 to 0.370) lying on the floor of the mouth with its tip on the lower lip; a thin rolled lower lip
    under it whose front stands at y -0.252; the chin under the lip down to z 0.322. In profile the opening is a
    wedge from the pads back to the corner under the front of the eye (y -0.231)."""
    P = [q for q in spec['parts'] if q['part'] not in ('mouth', 'tongue', 'chin')]
    # the muzzle and the lower jaw as masses of their own, covering the reconstruction's lower face
    P.append({'part': 'mouth', 'kind': 'mass', 'blend': 0.016, 'params': {
        'center': [0, -0.252, 0.381], 'radii': [0.032, 0.026, 0.019], 'exponent': 2.0}})
    P.append({'part': 'chin', 'kind': 'mass', 'blend': 0.016, 'params': {
        'center': [0, -0.227, 0.352], 'radii': [0.034, 0.019, 0.017], 'exponent': 2.0}})
    # cheeks pushed up by the smile beside each corner
    # sculpt-84: full round cheeks from under the eye to the mouth corner, so the muzzle grows out of a round face
    # instead of standing off it as a tube (Nick on sculpt-80: the side profile is lumpy and not intentional)
    P.append({'part': 'mouth', 'kind': 'mass', 'mirror': 'x', 'blend': 0.024, 'params': {
        'center': [0.046, -0.222, 0.394], 'radii': [0.028, 0.030, 0.024], 'exponent': 2.0}})
    # the opening: one smooth D carved back to the corners, its top under the pads
    half = [[0.0, 0.3810], [0.008, 0.3775], [0.016, 0.3760], [0.024, 0.3775], [0.031, 0.3805], [0.0350, 0.3840],
            [0.0368, 0.3855], [0.0375, 0.3820], [0.0358, 0.3745], [0.0322, 0.3645], [0.0262, 0.3525],
            [0.0130, 0.3430], [0.0, 0.3415]]
    right = [[-u, v] for u, v in reversed(half[1:-1])]
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'xz', 'outline': half+right, 'depth': [-0.32, -0.205], 'round': 0.008, 'smooth': 240}})
    # the side opening: a wedge from under the pads back to the corner, through the jaw's side walls, so the
    # profile shows the open jaw as the sheet's side view does
    P.append({'part': 'mouth', 'kind': 'stencil', 'op': 'carve', 'blend': 0.004, 'params': {
        'plane': 'yz', 'outline': [[-0.32, 0.370], [-0.266, 0.368], [-0.250, 0.374], [-0.237, 0.3820], [-0.2270, 0.3870],
                                   [-0.2260, 0.3790], [-0.2360, 0.3580], [-0.2500, 0.3400], [-0.32, 0.330]],
        'depth': [-0.050, 0.050], 'round': 0.005, 'smooth': 200}})
    # sculpt-86 (critic 13 on the side profile: the face read as separate pieces, a tube nose on a vertical wall, a
    # bead lip over a chin knob, a jaw line 1.5 to 2 cm high that kinked into a notch at the throat): the muzzle top
    # behind the nose filled so the bridge, muzzle and nose read as one form (a lower lip and chin as one taller
    # mass, and a broad flat mass under the jaw, both read as a box chin hanging below the mouth from the front and
    # were undone)
    P.append({'part': 'mouth', 'kind': 'mass', 'blend': 0.014, 'params': {
        'center': [0, -0.254, 0.398], 'radii': [0.021, 0.020, 0.013], 'exponent': 2.0}})
    # the jaw's flat underside rounded up into the throat (critic 9: a box chin hanging 1.3 cm low)
    P.append({'part': 'chin', 'kind': 'mass', 'op': 'carve', 'blend': 0.010, 'params': {
        'center': [0, -0.246, 0.306], 'radii': [0.034, 0.030, 0.014], 'exponent': 2.0}})
    # the thin wall left between the D's corner and the side wedge, rounded away (it stood up as a tusk)
    P.append({'part': 'mouth', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.003, 'params': {
        'center': [0.0395, -0.2450, 0.3825], 'radii': [0.0095, 0.0200, 0.0082], 'exponent': 2.0}})
    # the pads, added after the carve so their round undersides make the opening's top edge
    P.append({'part': 'mouth', 'kind': 'mass', 'op': 'add-after', 'mirror': 'x', 'blend': 0.008, 'params': {
        'center': [0.0155, -0.260, 0.3870], 'radii': [0.0195, 0.0190, 0.0140], 'exponent': 2.0}})
    # the tongue on the floor of the mouth, its tip on the lower lip, and its root behind
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'blend': 0.006, 'params': {
        'center': [0, -0.231, 0.3570], 'radii': [0.0200, 0.0220, 0.0090], 'exponent': 2.0, 'rotation': [30, 0, 0]}})
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'add-after', 'blend': 0.006, 'params': {
        'center': [0, -0.222, 0.3440], 'radii': [0.0150, 0.0180, 0.0080], 'exponent': 2.0}})
    # the tongue's center groove, cut into it after it is added (critic 11)
    P.append({'part': 'tongue', 'kind': 'mass', 'op': 'carve-after', 'blend': 0.002, 'params': {
        'center': [0, -0.239, 0.3640], 'radii': [0.0018, 0.0150, 0.0035], 'exponent': 2.0, 'rotation': [30, 0, 0]}})
    spec['parts'] = P
    return spec


def chest(spec):
    """Chest: the brisket between the forelegs raised (critics 2 to 4: in the front view the chest bottom between
    the forelegs sits 0.24 H above the ground against the sheet's 0.277 H, so the forelegs read short). A narrow
    soft carve on the midline under the chest, between the upper forelegs, lifts the arch about 2 cm without
    touching the legs' outer lines or the side view's underline."""
    spec['parts'].append({'part': 'chest', 'kind': 'mass', 'op': 'carve', 'blend': 0.012, 'params': {
        'center': [0, -0.105, 0.158], 'radii': [0.014, 0.045, 0.032], 'exponent': 2.0}})
    return spec


def lids(spec):
    """Lids: a soft rim of skin around each eye where the lid meets the ball (flesh-front, flesh-side: a rounded
    ring about 3 to 4 mm thick, fuller over the top), in place of the bare crease the socket carve leaves (sculpt-18
    onward). Points: where the eyes repair's ball (center [0.051, -0.199, 0.436], radius 3.9 cm, gaze 28 degrees out)
    first enters the skin grid along 15 meridians around the gaze, 2 degrees further round, lifted off the ball by
    a little over half the tube radius, so the ring rests on the ball's edge and blends into the skin. Needs eyes;
    the socket carve trims its inner side off the ball. Sculpt-32 (critic 3: an even ring all round read as goggles):
    recomputed for the revised eyes, the upper lid 4.5 mm thick and the lower 1.7 mm. Sculpt-37: recomputed for
    eyes at x 0.043, the lower lid 2.1 mm (critic 4: dark crescents in the gap under the lower-outer lids)."""
    spec['parts'].append({'part': 'lids', 'kind': 'sweep', 'mirror': 'x', 'blend': 0.004, 'params': {
        'closed': True, 'points': [
            {'p': [0.0258, -0.2343, 0.4370], 'r': 0.0033}, {'p': [0.0278, -0.2333, 0.4485], 'r': 0.0038},
            {'p': [0.0332, -0.2301, 0.4589], 'r': 0.0042}, {'p': [0.0424, -0.2252, 0.4662], 'r': 0.0044},
            {'p': [0.0537, -0.2183, 0.4693], 'r': 0.0045}, {'p': [0.0653, -0.2073, 0.4680], 'r': 0.0043},
            {'p': [0.0750, -0.1949, 0.4591], 'r': 0.0040}, {'p': [0.0807, -0.1908, 0.4443], 'r': 0.0035},
            {'p': [0.0815, -0.1978, 0.4286], 'r': 0.0031}, {'p': [0.0753, -0.2102, 0.4174], 'r': 0.0026},
            {'p': [0.0657, -0.2184, 0.4114], 'r': 0.0023}, {'p': [0.0552, -0.2241, 0.4093], 'r': 0.0021},
            {'p': [0.0443, -0.2279, 0.4103], 'r': 0.0022}, {'p': [0.0338, -0.2305, 0.4153], 'r': 0.0024},
            {'p': [0.0274, -0.2332, 0.4252], 'r': 0.0028}]}})
    return spec


def toes(spec):
    """Toes: four domed toes on every foot with deep splits between them (flesh-front, flesh-side, closeup-hindfoot;
    critic 2 items 6 and new defect 5: the forepaws' grooves were shallow ribs and the hind toes were smoothed away,
    so the hind feet read as boots). Anatomy spec: a rabbit has four toes on each hind foot and four weight-bearing
    toes on each forefoot (the fifth, the dewclaw, is high on the inside and hidden in fur); on the sheet each toe is
    a rounded dome about 1.7 cm across at the front of the foot, the middle two slightly ahead of the outer two,
    split about 2 cm back on top while the sole stays joined (research/hypnopet/feet). Method: a dome per toe,
    added, then a thin slot carved between neighbours through the front of the foot down to about 1 cm above the
    sole. Critic 5 (sculpt-40): the toe tops stood 0.074 to 0.086 H against the sheet's 0.105 to 0.115 H and the feet
    read as flat planks in profile; domes 1 to 1.4 cm taller with wider splits (sculpt-48 to 51) turned the hind toes
    into thin fins with pointed tops (critic 6), so that was undone: taller toes need the foot itself rebuilt.
    Positions from slices of the skin grid (forepaw front edge y -0.205, 6.5 cm wide; hind foot front y 0.043);
    the hind toes reach 1 cm further forward (critic 2: hind foot 93 percent of the sheet's length)."""
    P = spec['parts']
    # domes stand about 5 mm proud of the old front and top so each toe has its own round front; the splits are
    # soft V grooves (sculpt-27's 2.2 mm slots read as knife cuts, not toes)
    # forepaw toes on the shorter paw (warps-8), taller and rounder (critic 3: flat-faced strips on a low slab; the
    # sheet's toe tops stand 0.066 to 0.088 H)
    fore = [([0.025, -0.1825, 0.023], 0.0120), ([0.040, -0.1875, 0.024], 0.0125), ([0.055, -0.1865, 0.024], 0.0125),
            ([0.069, -0.1795, 0.023], 0.0120)]
    # hind toes on the narrowed foot (warps-7 moved the foot in by 15 percent below the hock)
    # and again on warps-9's foot, 18 percent narrower about x 0.10, the toes taller (critic 4: flat flippers whose
    # outer half had no toes, toe tops at 0.05 to 0.08 H against the sheet's 0.10 H)
    hind = [([0.0857, 0.057, 0.024], 0.017), ([0.0967, 0.046, 0.025], 0.018), ([0.1086, 0.046, 0.025], 0.018),
            ([0.1197, 0.057, 0.024], 0.017)]
    for c, ry in fore:
        P.append({'part': 'toes', 'kind': 'mass', 'mirror': 'x', 'blend': 0.005, 'params': {
            'center': c, 'radii': [0.0092, ry, 0.0195], 'exponent': 2.0}})
    for c, ry in hind:
        P.append({'part': 'toes', 'kind': 'mass', 'mirror': 'x', 'blend': 0.005, 'params': {
            'center': c, 'radii': [0.0078, ry, 0.0215], 'exponent': 2.0}})
    for x in (0.0325, 0.0475, 0.062):
        P.append({'part': 'toes', 'kind': 'mass', 'op': 'carve', 'mirror': 'x', 'blend': 0.004, 'params': {
            'center': [x, -0.190, 0.036], 'radii': [0.0034, 0.0145, 0.024], 'exponent': 2.0}})
    for x in (0.0912, 0.1025, 0.1142):
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


SMOOTH_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-5f.npz'


def smooth(spec):
    """Second blemish pass (critic 2), on a re-warped grid (prep_grids.sh steps 5b to 7): the ear rake bent over 12 cm
    instead of 7 (warps-6.json; the short bend left a crease across the back of each ear a third of the way down,
    new defect 4), the raised stem under the tail flattened and the V pinch at the top of the buttock cleft filled
    (item 13), and the diagonal creases where the ear roots meet the back of the skull softened (item 9). Replaces
    details' grid (it repeats step 6 on the new warp). The warp is warps-7.json: the ear blades also swing 6 degrees
    in and the hind lower legs and feet move 15 percent in toward the midline below the hock, because metric
    overlays on the bare front and back sheet views put the ear tips 4 cm and the hind feet 2 to 4 cm further out
    than the sheet (prep_grids.sh step 5c). Then warps-8.json (step 5d): the forepaw shortened to 0.73 (critic 3:
    0.212 H against the sheet's 0.180 H) and the jowls narrowed about the mouth corner to the sheet's heart-shaped
    lower face (critic 3: 0.253 H wide at 0.56 H against 0.179 H), in a soft ellipsoid fading over its whole radius
    (a box fading over 2.5 cm left a ledge across the cheek, sculpt-32 and 33). Step 8 (grid-skin-5e) fills the dimple
    on each ear's outer face and softens the inner wrist bulges. Warps-9 (grid-skin-5f, critic 4): the ears raked 15
    degrees and swung in 3 (6 hung them against the body in front), the hind feet 18 percent narrower about their
    own center line."""
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = SMOOTH_GRID
    body['params']['sha256'] = hashlib.sha256(open(SMOOTH_GRID, 'rb').read()).hexdigest()
    return spec


FACE_GRID = 'C:/dev/art-data/studio/recon/hypnopet/r10-mv-oct512/grid-skin-5g.npz'
FACE_BOX = ([-0.12, 0.12], [-0.32, -0.12], [0.27, 0.40])
FACE_RAMP = (0.03, 0.03, 0.02)


def face_map(p, factor=0.88, pivot=0.40):
    """warps-10's lower-face map at point p: (new z, local z factor). The same box weight as grid_warp.py."""
    def sm(t):
        t = min(max(t, 0.0), 1.0)
        return t*t*(3-2*t)
    w = 1.0
    for k in range(3):
        lo, hi = FACE_BOX[k]
        w *= sm((p[k]-lo)/FACE_RAMP[k])*sm((hi-p[k])/FACE_RAMP[k])
    f = 1.0-(1.0-factor)*w
    return pivot+(p[2]-pivot)*f, f


def lowerface(spec):
    """Lower face 12 percent shorter about z 0.40 (critic 5, sculpt-40: eye to chin 22 percent long against
    flesh-front and 7 percent against flesh-side, and the mouth 6 to 9 mm low; the jowl lobes hang low in the back
    view). The grid is warped by board/warps-10.json (grid-skin-5g, prep_grids.sh step 5g), and every authored mouth,
    tongue and chin part is moved by the same map here, so the carved opening keeps the walls it had: moving the
    carves alone (sculpt-44, 45) left the muzzle's side walls as thin blades. Needs smooth and mouth; supersedes
    smooth's grid."""
    import hashlib
    body = next(p for p in spec['parts'] if p['part'] == 'body' and p['kind'] == 'grid')
    body['params']['file'] = FACE_GRID
    body['params']['sha256'] = hashlib.sha256(open(FACE_GRID, 'rb').read()).hexdigest()
    for part in spec['parts']:
        if part['part'] not in ('mouth', 'tongue', 'chin'):
            continue
        prm = part['params']
        if part['kind'] == 'mass':
            z, f = face_map(prm['center'])
            prm['center'] = [prm['center'][0], prm['center'][1], round(z, 5)]
            prm['radii'] = [prm['radii'][0], prm['radii'][1], round(prm['radii'][2]*f, 5)]
        elif part['kind'] == 'sweep':
            for q in prm['points']:
                q['p'] = [q['p'][0], q['p'][1], round(face_map(q['p'])[0], 5)]
        elif part['kind'] == 'stencil':
            if prm['plane'] == 'xz':
                y = sum(prm['depth'])/2
                prm['outline'] = [[u, round(face_map([u, y, v])[0], 5)] for u, v in prm['outline']]
            elif prm['plane'] == 'yz':
                prm['outline'] = [[u, round(face_map([0.0, u, v])[0], 5)] for u, v in prm['outline']]
    return spec


def tail(spec):
    """Tail: a round nub set above the cleft (flesh-back), in place of the teardrop that flowed into the
    buttock cleft (critic item 13). Anatomy spec: a short stub of a few small vertebrae under a fur pompon
    (research/hypnopet/tail); bare, a ball about 3.5 cm across on the rump's top-back, slightly upturned. The ball
    rounds the reconstruction's tail tip (center 1.3 cm in from its tip at y 0.246, z 0.268). Critic 3: the ball
    center at 0.407 H against the sheet's 0.376 and about 10 percent large; now 1.5 cm lower on the rump's curve
    (and 5 mm back, to stay on it) and 9 percent smaller. Critic 4 (sculpt-36): still 0.02 H high, 27 percent too
    tall and standing 0.04 H proud of the rump on a stalk: sculpt-37 put it 1.3 cm lower, which left the
    reconstruction's own tail stub showing above it as a second bulb (critic 5: a peanut). The ball now sits over the
    stub again, one ball; the sheet's own tail heights disagree by 0.016 H between its side and back views."""
    spec['parts'].append({'part': 'tail', 'kind': 'mass', 'blend': 0.008, 'params': {
        'center': [0, 0.234, 0.257], 'radii': [0.0165, 0.016, 0.0165], 'exponent': 2.0}})
    return spec


REPAIRS = {'mouthrebuild': mouthrebuild, 'lowerface': lowerface, 'chest': chest, 'smooth': smooth, 'toes': toes, 'lids': lids, 'bridge': bridge, 'details': details, 'tail': tail, 'proportions': proportions, 'horn': horn, 'crown': crown, 'skin': skin, 'face': face, 'mouth': mouth, 'nose': nose, 'eyes': eyes}


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

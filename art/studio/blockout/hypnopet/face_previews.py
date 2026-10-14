"""First face pass previews for Hypnopet (directions A, B, C): v5 with the whole face rebuilt as one head part.

    python art/studio/blockout/hypnopet/face_previews.py A|B|C [--out <spec.json>]

The head part here is the skull, cheeks, brow, crown, short neck, the eye sockets, eyeballs and lids, and the
muzzle (nose pad, mouth, chin), all under the part key 'head' (lesson face-is-one-unit-at-first-pass). The
ears, horn, body, legs and tail are v5's, untouched.

Each eye is a socket carved into the skin (op carve, a sphere concentric with the eyeball and a hair larger,
so the ball fills it and no hollow is left), an eyeball, and a lid ring (a closed sweep, added after the carve)
laid on the ball along the line where the ball leaves the uncarved skin, so the skin seems to roll over the
ball. The ring is computed from the field, not typed, so it follows the face's curvature.

The eyeballs are separate objects ("separate": true, material tag "eye", named eye-left and eye-right, pivot at
the ball center, gaze along the ball's axis): not part of the skin, as a rig needs them, and rendered with the
studio's eye material (art/studio/packet_render.py). Sockets and lids stay on the skin. The eye shader's angles
are set from the seated opening: the pupil is EYE_PUPIL of the visible width, the iris runs to a thin dark rim
just inside the lids.
"""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
STUDIO = HERE.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(STUDIO))
from make_spec import V5, spec as v5_spec  # noqa: E402
import parts  # noqa: E402


def unit(v):
    v = np.asarray(v, float)
    return v/np.linalg.norm(v)


def mass(center, radii, blend, op='add', mirror=None, exponent=2.0, rotation=(0, 0, 0)):
    d = {'part': 'head', 'kind': 'mass', 'blend': blend,
         'params': {'center': [round(float(x), 4) for x in center], 'radii': [round(float(x), 4) for x in radii],
                    'exponent': exponent, 'rotation': list(rotation)}}
    if op != 'add':
        d['op'] = op
    if mirror:
        d['mirror'] = mirror
    return d


def eye_axis(yaw, pitch):
    """Gaze direction of the left eye (+x side): yaw degrees outward from straight ahead (-y), pitch up."""
    y, p = np.radians(yaw), np.radians(pitch)
    return unit([np.sin(y)*np.cos(p), -np.cos(y)*np.cos(p), np.sin(p)])


def opening_angles(adds, c, re, axis, n=16):
    """For n directions around the gaze axis: the angle from the axis (radians) at which the eyeball sphere
    (center c, radius re) crosses the uncarved skin surface, by bisection on the adds-only field."""
    a = unit(axis)
    e1 = unit(np.cross(a, [0, 0, 1.0]))
    e2 = np.cross(e1, a)
    if e2[2] < 0:
        e2, e1 = -e2, -e1
    out = []
    for k in range(n):
        phi = 2*np.pi*k/n
        side = np.cos(phi)*e1+np.sin(phi)*e2
        def f(t):
            p = c+re*(np.cos(t)*a+np.sin(t)*side)
            return float(parts.union_at(adds, p[None])[0])
        lo, hi = 0.0, 2.6
        if f(lo) < 0:
            out.append((phi, side, 0.0))
            continue
        for _ in range(36):
            m = (lo+hi)/2
            if f(m) > 0:
                lo = m
            else:
                hi = m
        out.append((phi, side, lo))
    return a, out


def seat_eye(adds, c, re, axis, open_deg):
    """Slide the eyeball along its gaze axis until the mean opening half-angle is open_deg (the larger the
    angle, the more of the ball shows). Returns the new center and the mean angle reached."""
    a = unit(axis)
    lo, hi = -0.04, 0.04                      # offset along the axis: negative sinks the ball
    def mean_open(s):
        return np.degrees(np.mean([t for _, _, t in opening_angles(adds, c+a*s, re, a, n=8)[1]]))
    for _ in range(22):
        m = (lo+hi)/2
        if mean_open(m) < open_deg:
            lo = m
        else:
            hi = m
    c2 = c+a*(lo+hi)/2
    return c2, mean_open((lo+hi)/2)


def lid_ring(adds, c, re, axis, r_top, r_bottom, n=16, lift=-0.2, out=0.8, drop_top=0.0):
    """Points of a closed lid ring along the line where the eyeball leaves the uncarved skin (opening_angles).

    The ring's center is pushed `out` of its radius from that line toward the skin and sunk `lift` of its radius
    (negative is into the ball), so its outer half disappears into the skin and only the inner half shows, as a
    rolled lid edge on the ball rather than a tube standing on the face. The upper lid comes `drop_top` radians
    farther over the ball, so the lids wrap the ball more at the top. Radius runs from r_top to r_bottom."""
    a, rows = opening_angles(adds, c, re, axis, n)
    pts = []
    for phi, side, t in rows:
        if t <= 0:
            raise SystemExit(f'eye buried: skin covers the ball (center {c})')
        up = max(np.sin(phi), 0.0)             # 1 at the top of the eye, 0 at the sides and below
        r = r_bottom+(r_top-r_bottom)*up
        t = t+out*r/re-drop_top*up
        p = c+(re+lift*r)*(np.cos(t)*a+np.sin(t)*side)
        pts.append([round(float(x), 5) for x in p]+[round(float(r), 5)])
    return pts


def surface_y(adds, x, z, y0=-0.32, y1=-0.05):
    """The y of the skin seen from the front (the first crossing along +y) at (x, z), by marching and bisection."""
    ys = np.linspace(y0, y1, 541)
    f = parts.union_at(adds, np.stack([np.full_like(ys, x), ys, np.full_like(ys, z)], 1))
    k = int(np.argmax(f < 0))
    if f[k] >= 0:
        raise SystemExit(f'no skin at x={x}, z={z}')
    lo, hi = ys[k-1], ys[k]
    for _ in range(30):
        m = (lo+hi)/2
        if parts.union_at(adds, np.array([[x, m, z]]))[0] > 0:
            lo = m
        else:
            hi = m
    return (lo+hi)/2


def smile(adds, half, depth=0.4):
    """A carved smile: a sweep through `half` ([x, z, r] or [x, z, r, depth] from the mouth's center out to one
    corner, mirrored to the other side), each point set on the face surface and sunk `depth` of its radius (a
    negative depth at the corners lifts them off the skin, so the cut fades out instead of ending in a slot)."""
    row = [list(q)+[depth]*(4-len(q)) for q in half]
    full = [[-x, z, r, k] for x, z, r, k in reversed(row[1:])]+row
    pts = []
    for x, z, r, k in full:
        y = surface_y(adds, x, z)+k*r
        pts.append([round(x, 5), round(float(y), 5), round(z, 5), round(r, 5)])
    return pts


EYE_PUPIL = 0.5          # pupil width over the visible eye width (the sheet's eyes are mostly pupil)


def eye_shading(opened):
    """Angles (degrees from the gaze) for the eye material: pupil, iris to the rim, rim at the lid line."""
    pupil = np.degrees(np.arcsin(EYE_PUPIL*np.sin(np.radians(opened))))
    return {'pupilDeg': round(float(pupil), 2), 'irisDeg': round(float(opened-5), 2), 'rimDeg': round(float(opened), 2)}


def face_parts(d):
    """The head part adds of one direction, dictionary d of numbers (meters)."""
    adds = [{'part': 'head', 'kind': 'sweep', 'blend': 0.04, 'params': {'points': V5['neck']}}]
    adds.append(mass(d['cranium_c'], d['cranium_r'], 0.035))
    for c, r, b in d.get('extra_adds', []):
        adds.append(mass(c, r, b, mirror='x' if c[0] else None))
    adds.append(mass(d['cheek_c'], d['cheek_r'], d.get('cheek_blend', 0.03), mirror='x' if d['cheek_c'][0] else None))
    adds.append(mass(d['muzzle_c'], d['muzzle_r'], d.get('muzzle_blend', 0.03)))
    adds.append(mass(d['lip_c'], d['lip_r'], d.get('lip_blend', 0.012), mirror='x'))
    adds.append(mass(d['jaw_c'], d['jaw_r'], d.get('jaw_blend', 0.025)))
    adds.append(mass(d['nose_c'], d['nose_r'], d.get('nose_blend', 0.006), rotation=d.get('nose_rot', (0, 0, 0))))
    return adds


def build(name, verbose=True):
    d = DIRECTIONS[name]
    base = v5_spec({**V5, 'version': 'face-preview-'+name})
    keep = [p for p in base['parts'] if p['part'] not in ('head', 'muzzle', 'eyes')]
    adds = face_parts(d)
    # sockets, lids and mouth are fitted to the skin as it will be built: every add of the creature, mirrored,
    # before carving
    field_adds = parts.instances({'parts': [p for p in keep if p.get('op', 'add') == 'add']+adds})
    re = d['eye_r']
    axis = eye_axis(d['eye_yaw'], d['eye_pitch'])
    c, opened = seat_eye(field_adds, np.asarray(d['eye_c'], float), re, axis, d['eye_open'])
    ring = lid_ring(field_adds, c, re, axis, d['lid_top'], d['lid_bottom'], drop_top=np.radians(d.get('lid_drop', 0.0)))
    mouth = smile(field_adds, d['smile'])
    carves = [{'part': 'head', 'kind': 'sweep', 'op': 'carve', 'blend': d.get('mouth_blend', 0.005),
               'params': {'points': mouth, 'samples': 10}},
              mass(c, [re+0.0008]*3, d.get('socket_blend', 0.0025), op='carve', mirror='x')]
    afters = []
    if 'tongue' in d:                           # [x, z, rx, ry, rz, sink]: the tongue sits inside the open mouth
        x, z, rx, ry, rz, sink = d['tongue']
        afters.append(mass([x, surface_y(field_adds, x, z)+sink, z], [rx, ry, rz], 0.005, op='add-after'))
    ball = mass(c, [re]*3, 0.003, mirror='x')
    ball.update(part='eyes', separate=True, material='eye', name='eye-left', mirrorName='eye-right',
                gaze=[round(float(x), 5) for x in axis], shading=eye_shading(opened))
    afters.append({'part': 'head', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': d.get('lid_blend', 0.011),
                   'params': {'closed': True, 'samples': 8, 'points': ring}})
    if verbose:
        print(f'{name}: eye center {np.round(c, 4).tolist()}, radius {re}, mean opening half-angle {opened:.1f} deg, '
              f'opening about {2*re*np.sin(np.radians(opened)):.4f} across')
    # head first so the head's smooth unions run in the same place in the order as in v5 (before the horn and ears)
    i = next(n for n, p in enumerate(keep) if p['part'] == 'horn')
    s = {**base, 'parts': keep[:i]+adds+keep[i:]+carves+afters+[ball]}
    s['note'] = (f'Hypnopet face preview {name}: v5 with the head, muzzle and eyes rebuilt as one head part '
                 '(skull, sockets, lids, muzzle) and the eyeballs as separate eye objects. Written by face_previews.py. '
                 + d['note'])
    return s


DIRECTIONS = {
    # A: classic cartoon. Round skull, big round eyes set shallow, wide apart and low; tiny button nose; small
    # open smile; soft round cheeks.
    'A': {'note': 'A: classic cartoon.',
          'cranium_c': [0, -0.13, 0.44], 'cranium_r': [0.088, 0.09, 0.08],
          'cheek_c': [0.035, -0.178, 0.385], 'cheek_r': [0.042, 0.042, 0.036], 'cheek_blend': 0.03,
          'muzzle_c': [0, -0.205, 0.378], 'muzzle_r': [0.022, 0.024, 0.02], 'muzzle_blend': 0.025,
          'lip_c': [0.009, -0.222, 0.376], 'lip_r': [0.011, 0.009, 0.008], 'lip_blend': 0.014,
          'jaw_c': [0, -0.195, 0.352], 'jaw_r': [0.024, 0.024, 0.018], 'jaw_blend': 0.022,
          'nose_c': [0, -0.228, 0.387], 'nose_r': [0.009, 0.007, 0.007],
          'smile': [[0, 0.358, 0.0075], [0.009, 0.361, 0.0058], [0.017, 0.367, 0.0042], [0.022, 0.372, 0.0032]],
          'tongue': [0, 0.353, 0.0065, 0.007, 0.0035, 0.01],
          'eye_c': [0.06, -0.17, 0.418], 'eye_r': 0.032, 'eye_yaw': 26, 'eye_pitch': 0, 'eye_open': 74,
          'lid_top': 0.0055, 'lid_bottom': 0.0035, 'lid_drop': 5},
    # B: big-eyed baby. Larger eyes, closer together and higher; high domed forehead; very short muzzle tucked
    # under the eyes; small open mouth.
    'B': {'note': 'B: big-eyed baby.',
          'cranium_c': [0, -0.125, 0.442], 'cranium_r': [0.086, 0.088, 0.08],
          'extra_adds': [([0, -0.15, 0.478], [0.065, 0.055, 0.045], 0.035)],
          'cheek_c': [0, -0.155, 0.385], 'cheek_r': [0.068, 0.055, 0.045], 'cheek_blend': 0.035,
          'muzzle_c': [0, -0.19, 0.372], 'muzzle_r': [0.024, 0.022, 0.02], 'muzzle_blend': 0.025,
          'lip_c': [0.008, -0.203, 0.372], 'lip_r': [0.01, 0.008, 0.007], 'lip_blend': 0.014,
          'jaw_c': [0, -0.183, 0.35], 'jaw_r': [0.02, 0.02, 0.015], 'jaw_blend': 0.02,
          'nose_c': [0, -0.208, 0.383], 'nose_r': [0.009, 0.006, 0.006],
          'smile': [[0, 0.356, 0.0068], [0.007, 0.358, 0.0052], [0.013, 0.363, 0.0038], [0.017, 0.367, 0.003]],
          'tongue': [0, 0.352, 0.0058, 0.006, 0.003, 0.009],
          'eye_c': [0.045, -0.17, 0.445], 'eye_r': 0.037, 'eye_yaw': 18, 'eye_pitch': 4, 'eye_open': 66,
          'lid_top': 0.0055, 'lid_bottom': 0.0035, 'lid_drop': 5},
    # C: sheet match. Measured off flesh-front, flesh-side and the face close-up (measures.json scale): face
    # 0.175 wide at the eyes, eye openings about 0.055 across centered 0.05 off the midline at 0.43 high, nose
    # pad 0.032 wide at 0.39 high and well forward of the eyes (side view), a wide open smile from under the
    # nose down to about 0.34, corners at 0.38, chin low.
    'C': {'note': 'C: sheet match.',
          'cranium_c': [0, -0.13, 0.44], 'cranium_r': [0.078, 0.092, 0.076],
          'cheek_c': [0, -0.17, 0.383], 'cheek_r': [0.07, 0.06, 0.05], 'cheek_blend': 0.035,
          'muzzle_c': [0, -0.22, 0.382], 'muzzle_r': [0.035, 0.035, 0.025], 'muzzle_blend': 0.03,
          'lip_c': [0.009, -0.236, 0.378], 'lip_r': [0.01, 0.012, 0.009], 'lip_blend': 0.018,
          'jaw_c': [0, -0.2, 0.333], 'jaw_r': [0.03, 0.03, 0.024], 'jaw_blend': 0.022,
          'nose_c': [0, -0.253, 0.391], 'nose_r': [0.016, 0.009, 0.011],
          'smile': [[0, 0.357, 0.014, 0.45], [0.013, 0.362, 0.011, 0.4], [0.024, 0.37, 0.007, 0.2], [0.031, 0.376, 0.0045, 0.0], [0.036, 0.381, 0.003, -0.4]], 'mouth_blend': 0.006,
          'tongue': [0, 0.345, 0.012, 0.011, 0.005, 0.024],
          'eye_c': [0.05, -0.178, 0.43], 'eye_r': 0.034, 'eye_yaw': 12, 'eye_pitch': 2, 'eye_open': 66,
          'lid_top': 0.0055, 'lid_bottom': 0.0035, 'lid_drop': 5, 'lid_blend': 0.012},
}


# Second face round (experiment X27, fit before options): the face is fitted by numbers to the sheet's bare front
# and side views first (face_fit.py), then the options vary only what Nick flagged, the eyes' size and spacing,
# around that fit. From B: cheeks wider at the nose row and a narrower chin (front), and a snout: the nose bridge,
# nose, lips and chin brought forward of the eyes and a brow over them (side). The first round had the eyes as
# the most forward point of the face, which made them read as set on the sides of a pinched head.
FIT_FACE = {**DIRECTIONS['B'], 'cheek_c': [0.035, -0.15, 0.412], 'cheek_r': [0.052, 0.05, 0.03],
            'extra_adds': [([0, -0.175, 0.478], [0.06, 0.055, 0.04], 0.035)],
            'muzzle_c': [0, -0.228, 0.407], 'muzzle_r': [0.03, 0.045, 0.038],
            'nose_c': [0, -0.268, 0.403], 'jaw_c': [0, -0.215, 0.35], 'jaw_r': [0.022, 0.025, 0.018],
            'lip_c': [0.009, -0.245, 0.385]}
DIRECTIONS.update({
    # D: the bare sheet's numbers (flesh-front): eye opening 0.32 W, gap 0.27 W.
    'D': {**FIT_FACE, 'note': 'D: fitted to the bare sheet.',
          'eye_c': [0.04, -0.172, 0.442], 'eye_r': 0.037, 'eye_yaw': 8, 'eye_open': 67},
    # E: between the bare sheet and the painted sheet.
    'E': {**FIT_FACE, 'note': 'E: between the bare and the painted sheet.',
          'eye_c': [0.04, -0.171, 0.441], 'eye_r': 0.0405, 'eye_yaw': 6, 'eye_open': 67},
    # F: the painted sheet and face close-up: eyes larger and closer, the gap about half an eye width.
    'F': {**FIT_FACE, 'note': 'F: the painted sheet and face close-up.',
          'eye_c': [0.039, -0.169, 0.44], 'eye_r': 0.044, 'eye_yaw': 4, 'eye_open': 67},
})

if __name__ == '__main__':
    name = sys.argv[1]
    out = Path(sys.argv[sys.argv.index('--out')+1]) if '--out' in sys.argv else HERE/f'face-preview-{name}.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(build(name), indent=1), encoding='utf-8')
    print('wrote', out)

"""Pure-numpy rig math shared by the Blender rig script and the posed-fit command.

No bpy, no PIL. The skeleton, joint derivation from a skin mesh, distance-falloff
skin weights, forward kinematics and linear blend skinning live here so the
pose search (numpy, fast) and the Blender armature (the deliverable) agree.

Conventions: front is -y, up is +z, the figure's left (.L) is +x. A pose is a
dict bone -> (rx, ry, rz) degrees, rotations about the *world axes* through the
bone's rest head (R = Rz Ry Rx, x first), applied in the parent's frame. A
length lever is a dict bone -> scale along the bone's rest axis about its head.
Children follow their parent rigidly, so scaling a bone moves everything past
its tail by (scale-1)*length.
"""
import json
import math
from pathlib import Path

import numpy as np

FLOOR_Z = -.957
FIXED_HEIGHT = 1.8605

# name, parent, head joint, tail joint
BONES = [
    ('pelvis', None, 'pelvis', 'waist'),
    ('spine', 'pelvis', 'waist', 'chest'),
    ('chest', 'spine', 'chest', 'neck_base'),
    ('neck', 'chest', 'neck_base', 'head_base'),
    ('head', 'neck', 'head_base', 'head_top'),
    ('clavicle.L', 'chest', 'clavicle', 'shoulder.L'),
    ('upperarm.L', 'clavicle.L', 'shoulder.L', 'elbow.L'),
    ('forearm.L', 'upperarm.L', 'elbow.L', 'wrist.L'),
    ('hand.L', 'forearm.L', 'wrist.L', 'fingertip.L'),
    ('clavicle.R', 'chest', 'clavicle', 'shoulder.R'),
    ('upperarm.R', 'clavicle.R', 'shoulder.R', 'elbow.R'),
    ('forearm.R', 'upperarm.R', 'elbow.R', 'wrist.R'),
    ('hand.R', 'forearm.R', 'wrist.R', 'fingertip.R'),
    ('hip.L', 'pelvis', 'pelvis', 'hip.L'),
    ('thigh.L', 'hip.L', 'hip.L', 'knee.L'),
    ('shin.L', 'thigh.L', 'knee.L', 'ankle.L'),
    ('foot.L', 'shin.L', 'ankle.L', 'toe.L'),
    ('hip.R', 'pelvis', 'pelvis', 'hip.R'),
    ('thigh.R', 'hip.R', 'hip.R', 'knee.R'),
    ('shin.R', 'thigh.R', 'knee.R', 'ankle.R'),
    ('foot.R', 'shin.R', 'ankle.R', 'toe.R'),
    ('tail', 'pelvis', 'tail_root', 'tail_tip'),
]
BONE_NAMES = [b[0] for b in BONES]
PARENT = {b[0]: b[1] for b in BONES}
# Skin weight radius per bone: distance to the bone segment is divided by this.
RADIUS = {'pelvis': .22, 'spine': .20, 'chest': .24, 'neck': .075, 'head': .30,
          'clavicle': .075, 'upperarm': .062, 'forearm': .052, 'hand': .06,
          'hip': .075, 'thigh': .10, 'shin': .07, 'foot': .06, 'tail': .12}


def side_of(name):
    return name.split('.')[-1] if '.' in name else None


def base_of(name):
    return name.split('.')[0]


def mirror_pose(pose):
    """Mirror a pose across x = 0: left and right swap, y and z rotations negate."""
    out = {}
    for name, (rx, ry, rz) in pose.items():
        s = side_of(name)
        other = name[:-1]+('R' if s == 'L' else 'L') if s else name
        out[other] = [rx, -ry, -rz] if s else [rx, -ry, -rz]
    return out


def euler_matrix(rx, ry, rz):
    a, b, c = (math.radians(v) for v in (rx, ry, rz))
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Ry = np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]])
    Rz = np.array([[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]])
    return Rz@Ry@Rx


# ---------------------------------------------------------------- joints

def two_segment_break(z, points, lo, hi):
    """Break index of the best continuous-free two-line fit of points (n, k) against z."""
    best, at = 1e18, None
    for i in range(lo, hi):
        err = 0.
        for part in (slice(0, i+1), slice(i, None)):
            zz = z[part]
            if len(zz) < 3:
                err = 1e18
                break
            A = np.stack([zz, np.ones_like(zz)], 1)
            for k in range(points.shape[1]):
                coef, res, *_ = np.linalg.lstsq(A, points[part, k], rcond=None)
                err += float(((A@coef-points[part, k])**2).sum())
        if err < best:
            best, at = err, i
    return at


def centerline(skin, mask, zs, tol=.008):
    pts, keep = [], []
    for z in zs:
        p = skin[mask & (np.abs(skin[:, 2]-z) < tol)]
        if len(p) < 20:
            continue
        pts.append(p[:, :2].mean(0))
        keep.append(z)
    return np.array(keep), np.array(pts)


def derive_joints(skin, claws=None):
    """Joint positions from the skin mesh (an (n,3) array of the one fused skin
    object). Heuristic and recorded: cross-section centerlines, two-line knee
    and elbow fits, the narrowest neck section, the shoulder flare (neck base,
    collarbones and shoulder height), the front crotch arch. Limbs are
    measured on the -x side (clear of the tails) and mirrored. claws: optional
    dict with 'fore' and 'hind' arrays of claw-centroid world positions (-x side)."""
    j = {}
    front = skin[skin[:, 1] < .125]           # excludes tails, which sit behind y .125
    zmax = float(skin[:, 2].max())
    floor = float(skin[:, 2].min())
    # neck: narrowest half-width section between .37 and the top of the neck stub or fan base
    zs = np.arange(.36, .50, .005)
    widths = []
    for z in zs:
        p = skin[np.abs(skin[:, 2]-z) < .004]
        widths.append(np.ptp(p[:, 0]) if len(p) else 9)
    head_z = float(zs[int(np.argmin(widths))])
    # crotch: lowest z at which the front (y<0) body is continuous across x = 0
    crotch = None
    for z in np.arange(-.45, -.05, .01):
        m = (np.abs(skin[:, 2]-z) < .005) & (np.abs(skin[:, 0]) < .02) & (skin[:, 1] < 0)
        if m.sum() > 0:
            crotch = float(z)
            break
    ankle_z = floor+.085
    hip_z = crotch+.06
    leg_zs = np.arange(floor+.12, crotch-.10, .02)
    side = (skin[:, 0] < -.02) & (skin[:, 0] > -.6) & (skin[:, 1] < .125) & (skin[:, 2] < crotch-.08)
    lz, lc = centerline(skin, side, leg_zs)
    # knee: best two-line break within the middle of the hip-to-ankle span
    span = hip_z-ankle_z
    ok = np.where((lz < hip_z-.3*span) & (lz > hip_z-.7*span))[0]
    k = two_segment_break(lz, np.c_[lc], int(ok.min()), int(ok.max())+1)
    knee_z = float(lz[k])
    foot_pts = skin[(skin[:, 0] < -.02) & (skin[:, 2] < floor+.06) & (skin[:, 1] < .125)]
    toe_xy = (float(foot_pts[:, 0].mean()), float(foot_pts[:, 1].min())+.03)

    def line_at(z):
        # centerline interpolated, extended linearly beyond its range
        order = np.argsort(lz)
        return np.array([np.interp(z, lz[order], lc[order][:, i]) for i in range(2)])
    hx, hy = line_at(crotch-.08)
    j['hip.R'] = [float(hx), float(hy), hip_z]
    j['knee.R'] = [*map(float, line_at(knee_z)), knee_z]
    ax, ay = line_at(ankle_z+.05)
    j['ankle.R'] = [float(ax), float(ay), ankle_z]
    j['toe.R'] = [float(ax), toe_xy[1]+.02, floor+.03]
    # arm
    arm_mask = (skin[:, 0] < -.30) & (skin[:, 1] < .125) & (skin[:, 2] < .09)
    az, ac = centerline(skin, arm_mask, np.arange(-.28, .08, .02), tol=.008)
    k = two_segment_break(az, np.c_[ac], 2, len(az)-2)
    elbow_z = float(az[k])
    tip_z = float(claws['fore'][:, 2].min()) if claws else float(az.min())-.02
    tip_xy = claws['fore'][:, :2].mean(0) if claws else ac[0]
    # upper arm line extended up to the shoulder height
    up = az >= elbow_z-.001
    A = np.stack([az[up], np.ones(up.sum())], 1)
    cx = np.linalg.lstsq(A, ac[up][:, 0], rcond=None)[0]
    cy = np.linalg.lstsq(A, ac[up][:, 1], rcond=None)[0]
    # neck base and shoulder line from the shoulder flare (see neck_shoulder_landmarks); the collarbones
    # sit on the shoulder line and the shoulder joint one upper-arm half-thickness below it
    nb_z, line_z = neck_shoulder_landmarks(skin, head_z, max(elbow_z, crotch))
    top = az.max()
    arm_top = skin[arm_mask & (np.abs(skin[:, 2]-top) < .008)]
    arm_half = float(np.ptp(arm_top[:, 1]))/2 if len(arm_top) > 20 else 0.
    shoulder_z = line_z-arm_half
    j['shoulder.R'] = [float(cx[0]*shoulder_z+cx[1]), None, shoulder_z]
    ex = float(ac[k][0]); ey = float(ac[k][1])
    j['elbow.R'] = [ex, ey, elbow_z]
    tip = np.array([float(tip_xy[0]), float(tip_xy[1]), tip_z])
    el = np.array(j['elbow.R'])
    j['fingertip.R'] = list(map(float, tip))
    j['wrist.R'] = list(map(float, el+(tip-el)*.58))
    # mirror .R -> .L
    for name in list(j):
        if name.endswith('.R') and name != 'shoulder.R':
            x, y, z = j[name]
            j[name[:-2]+'.L'] = [-x, y, z]
    # trunk: the body's depth midline at each height
    def mid_y(z):
        p = front[(np.abs(front[:, 2]-z) < .01) & (np.abs(front[:, 0]) < .15)]
        return float((p[:, 1].min()+p[:, 1].max())/2)
    j['pelvis'] = [0., mid_y(hip_z), hip_z]
    j['waist'] = [0., mid_y(hip_z+.14), hip_z+.14]
    j['chest'] = [0., mid_y(shoulder_z-.09), shoulder_z-.09]
    j['clavicle'] = [0., mid_y(line_z), line_z]
    j['neck_base'] = [0., mid_y(nb_z), nb_z]
    j['shoulder.R'][1] = j['clavicle'][1]
    j['shoulder.L'] = [-j['shoulder.R'][0], j['shoulder.R'][1], shoulder_z]
    # head base on the neck column's depth midline at its narrowest section
    j['head_base'] = [0., mid_y(head_z), head_z]
    j['head_top'] = [0., j['head_base'][1], zmax]
    # tail root: the rear edge of the buttocks, where the tails leave the body
    rear = front[(np.abs(front[:, 0]) < .15) & (front[:, 2] < hip_z-.05) & (front[:, 2] > hip_z-.35)]
    j['tail_root'] = [0., float(rear[:, 1].max())-.01, hip_z-.05]
    tails = skin[skin[:, 1] > .125]
    j['tail_tip'] = [0., float(tails[:, 1].mean()), float(tails[:, 2].mean())]
    j['_meta'] = {'floorZ': floor, 'crotchZ': crotch, 'kneeZ': knee_z, 'elbowZ': elbow_z, 'headZ': head_z,
                  'topZ': zmax, 'neckBaseZ': nb_z, 'shoulderLineZ': line_z}
    return j


def neck_shoulder_landmarks(skin, head_z, low_z, step=.005, gap=.01):
    """(neck base z, shoulder line z) from the front-view width of the body (tails excluded) between the
    narrowest neck section and the armpit, the highest section below it where the arm stands clear of the
    trunk by more than `gap` (searched down to low_z, the elbow or the crotch, whichever is higher; below
    the armpit the width measures the arms' splay, not the shoulders). Going down from the neck the width
    stays near the neck's, rises steeply where the shoulders slope out (the flare), then flattens across
    the shoulders. The top of the shoulder slope is where the tangent at the steepest point of the flare
    meets the neck's width: where the sides of the neck column meet the shoulders. The shoulder line
    (collarbones, the top of the chest) is the break of the best two-line fit of width against height
    between the steepest point and the armpit: where the flare turns into the shoulders, level with
    where the front of the neck meets the chest. The neck's base ring is tilted between those two
    heights, so the neck base joint sits midway between them. Every height follows the mesh; nothing is
    a fixed offset from another joint."""
    body = skin[skin[:, 1] < .125]
    zs, w = [], []
    for z in np.arange(head_z, low_z, -step):
        p = body[np.abs(body[:, 2]-z) < .004]
        if len(p) < 2:
            continue
        x = np.sort(p[p[:, 0] < 0][:, 0])
        if len(zs) > 3 and len(x) > 1 and np.diff(x).max() > gap:
            break
        zs.append(z)
        w.append(np.ptp(p[:, 0]))
    zs, w = np.array(zs), np.array(w)
    if len(zs) < 12:
        z = float(zs[-1]) if len(zs) else head_z-step
        return z, z
    k = 5    # smooth over 5 rows (.025) so one remesh row does not set the slope
    ws = np.convolve(np.pad(w, k//2, mode='edge'), np.ones(k)/k, mode='valid')
    slope = np.gradient(ws, -zs)    # width gained per unit of height going down
    i = int(np.argmax(slope))
    s = float(slope[i])
    if s <= 0:
        return head_z-step, head_z-step
    slope_top = float(zs[i])+(float(ws[i])-float(ws[0]))/s
    slope_top = min(max(slope_top, float(zs[i])), head_z-step)
    n = len(zs)-i
    line_z = float(zs[i+two_segment_break(zs[i:], ws[i:, None], 3, n-3)]) if n >= 8 else float(zs[-1])
    return (slope_top+line_z)/2, line_z


# ---------------------------------------------------------------- skeleton

def segments(joints, bones=None):
    """bone -> (head, tail) as float arrays."""
    return {b: (np.array(joints[h], float), np.array(joints[t], float)) for b, _, h, t in (bones or BONES)}


def seg_dist(points, a, b):
    ab = b-a
    t = np.clip(((points-a)@ab)/max(float(ab@ab), 1e-12), 0, 1)
    c = a+t[:, None]*ab
    return np.linalg.norm(points-c, axis=1), t


def compute_weights(points, joints, k=1.4, smooth_cell=.018, smooth_iters=8, keep=4, return_dense=False):
    """Distance-falloff skin weights for (n,3) points. Returns (idx (n,keep) int, w (n,keep) float32).

    Each bone scores (distance to its segment / radius)^2; weights are
    exp(-k*(score-minimum score)), then the head region, tail region and a
    few rounds of cell averaging shape them."""
    segs = segments(joints)
    n = len(points)
    S = np.empty((n, len(BONES)), np.float32)
    for i, (b, *_rest) in enumerate(BONES):
        d, _ = seg_dist(points, *segs[b])
        S[:, i] = (d/RADIUS[base_of(b)])**2
    # the head bone owns everything above the neck, the tail owns what sits behind the body
    hz = joints['head_base'][2]
    bi = {b: i for i, b in enumerate(BONE_NAMES)}
    # side exclusivity: a vertex on one side of x=0 does not take the other side's limb bones
    side_penalty = np.zeros_like(S)
    for b in BONE_NAMES:
        s = side_of(b)
        if s == 'L':
            side_penalty[points[:, 0] < -.01, bi[b]] = 50
        elif s == 'R':
            side_penalty[points[:, 0] > .01, bi[b]] = 50
    S = S+side_penalty
    # head and tail are not distance weighted; they get their own masks below
    S[:, bi['head']] = 1e6
    S[:, bi['tail']] = 1e6
    W = np.exp(-k*(S-S.min(1, keepdims=True)))
    W[W < .01] = 0
    W /= W.sum(1, keepdims=True)

    def smoothstep(x, lo, hi):
        t = np.clip((x-lo)/(hi-lo), 0, 1)
        return t*t*(3-2*t)
    head = smoothstep(points[:, 2], hz-.035, hz+.03)
    ty = joints['pelvis'][1]
    tail_y0 = joints['tail_root'][1]
    tail = smoothstep(points[:, 1], tail_y0, tail_y0+.03)*smoothstep(points[:, 2], joints['pelvis'][2]-.62, joints['pelvis'][2]-.5)\
        * (1-smoothstep(points[:, 2], joints['waist'][2]+.1, joints['waist'][2]+.2))
    # smooth the distance weights, then apply the head and tail masks on top
    W = smooth_weights(points, W, smooth_cell, smooth_iters)
    W = W*(1-tail)[:, None]
    W[:, bi['tail']] = tail
    W = W*(1-head)[:, None]
    W[:, bi['head']] = head
    W /= W.sum(1, keepdims=True)
    if return_dense:
        return W.astype(np.float32)
    idx = np.argsort(-W, 1)[:, :keep]
    w = np.take_along_axis(W, idx, 1)
    w /= w.sum(1, keepdims=True)
    return idx.astype(np.int16), w.astype(np.float32)


def smooth_weights(points, W, cell, iters, neighbors=24):
    """Average each weight vector with its nearest neighbours (a k-d tree on the
    skin points), a few rounds; this spreads each joint's blend over a few cm."""
    from scipy.spatial import cKDTree
    _, nn = cKDTree(points).query(points, k=neighbors, workers=-1)
    W = W.astype(np.float32)
    for _ in range(iters):
        W = .35*W+.65*W[nn].mean(1)
    return W/W.sum(1, keepdims=True)


# ---------------------------------------------------------------- pose

def bone_axis(joints, b, bones=None):
    a, t = segments(joints, bones)[b]
    d = t-a
    return d/np.linalg.norm(d)


def bone_transforms(joints, pose=None, scales=None, root_translate=(0, 0, 0), bones=None):
    """bone -> (R (3,3), t (3,)) skinning transform, x' = R x + t.

    A bone's own motion is a scale along its axis then a rotation, both about its
    head. Children receive only the rigid part of that motion: they rotate with
    the parent and their pivot moves to where the parent's skinning puts it, so a
    shortened forearm moves the hand without squashing it."""
    bones = bones or BONES
    pose = pose or {}
    scales = scales or {}
    segs = segments(joints, bones)
    out, rigid = {}, {}
    for b, parent, _, _ in bones:
        p = segs[b][0]
        if b.startswith('glute.') and b not in pose and f'thigh.{b[-1]}' in rigid:
            Rb = helper_rotation(rigid[parent].T@rigid[f'thigh.{b[-1]}'], GLUTE_SHARE)
        else:
            Rb = euler_matrix(*pose.get(b, (0, 0, 0)))
        lin = Rb
        s = scales.get(b, 1.0)
        if s != 1.0:
            u = bone_axis(joints, b, bones)
            lin = Rb@(np.eye(3)+(s-1)*np.outer(u, u))
        if parent:
            Rp, tp = out[parent]
            Rr = rigid[parent]
            Rc, tc = Rr, Rp@p+tp-Rr@p
        else:
            Rr, Rc, tc = np.eye(3), np.eye(3), np.zeros(3)
        R = Rc@lin
        t = Rc@(p-lin@p)+tc
        out[b] = (R, t)
        rigid[b] = Rc@Rb
    if any(root_translate):
        for b in out:
            Rb, tb = out[b]
            out[b] = (Rb, tb+np.array(root_translate))
    return out


def skin_points(points, idx, w, transforms, bones=None):
    names = [b[0] for b in (bones or BONES)]
    Rs = np.stack([transforms[b][0] for b in names])
    ts = np.stack([transforms[b][1] for b in names])
    out = np.zeros_like(points, dtype=np.float64)
    for k in range(idx.shape[1]):
        R = Rs[idx[:, k]]
        t = ts[idx[:, k]]
        out += w[:, k:k+1]*(np.einsum('nij,nj->ni', R, points)+t)
    return out


def ground_offset(posed, floor=FLOOR_Z):
    return floor-float(posed[:, 2].min())


# ---------------------------------------------------------------- measures

def proportions(joints):
    """Bone lengths and spans in units of the fixed figure height."""
    j = {k: np.array(v) for k, v in joints.items() if not k.startswith('_')}
    H = FIXED_HEIGHT
    dist = lambda a, b: float(np.linalg.norm(j[a]-j[b]))
    out = {
        'neck': dist('neck_base', 'head_base'),
        'upperArm': np.mean([dist('shoulder.L', 'elbow.L'), dist('shoulder.R', 'elbow.R')]),
        'forearm': np.mean([dist('elbow.L', 'wrist.L'), dist('elbow.R', 'wrist.R')]),
        'hand': np.mean([dist('wrist.L', 'fingertip.L'), dist('wrist.R', 'fingertip.R')]),
        'thigh': np.mean([dist('hip.L', 'knee.L'), dist('hip.R', 'knee.R')]),
        'shin': np.mean([dist('knee.L', 'ankle.L'), dist('knee.R', 'ankle.R')]),
        'foot': np.mean([dist('ankle.L', 'toe.L'), dist('ankle.R', 'toe.R')]),
        'shoulderWidth': dist('shoulder.L', 'shoulder.R'),
        'hipWidth': dist('hip.L', 'hip.R'),
        'torso': dist('pelvis', 'neck_base'),
        'headHeight': dist('head_base', 'head_top'),
    }
    meta = joints.get('_meta', {})
    out['crotchHeight'] = (meta.get('crotchZ', 0)-meta.get('floorZ', FLOOR_Z))
    return {k: round(v/H, 4) for k, v in out.items()}


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def align_rotation(u, v):
    """Smallest rotation matrix taking unit vector u onto unit vector v."""
    u, v = u/np.linalg.norm(u), v/np.linalg.norm(v)
    c = float(u@v)
    if c > 1-1e-9:
        return np.eye(3)
    if c < -1+1e-9:
        axis = np.cross(u, [1, 0, 0] if abs(u[0]) < .9 else [0, 1, 0])
        axis /= np.linalg.norm(axis)
        return 2*np.outer(axis, axis)-np.eye(3)
    k = np.cross(u, v)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3)+K+K@K/(1+c)


def euler_from_matrix(R):
    """Inverse of euler_matrix (R = Rz Ry Rx), degrees."""
    ry = -math.asin(max(-1, min(1, R[2, 0])))
    rx = math.atan2(R[2, 1], R[2, 2])
    rz = math.atan2(R[1, 0], R[0, 0])
    return [math.degrees(rx), math.degrees(ry), math.degrees(rz)]


def pose_from_directions(joints, targets, base=None, bones=None):
    """Pose for a chain given the wanted world direction of each bone after posing.
    targets: ordered dict bone -> direction. Parents come before children. base: a pose the
    targets are added to (bones not in targets keep their base rotation)."""
    parents = {b[0]: b[1] for b in (bones or BONES)}
    pose = dict(base or {})
    for b, d in targets.items():
        parent = parents[b]
        Rp = bone_transforms(joints, pose, bones=bones)[parent][0] if parent else np.eye(3)
        u = bone_axis(joints, b, bones)
        Rb = align_rotation(u, Rp.T@np.asarray(d, float))
        pose[b] = euler_from_matrix(Rb)
    return pose


# ---------------------------------------------------------------- Akinza animation skeleton (anim stage)
# The construction-loop skeleton above (BONES) keeps its single tail bone so the loop's posed fits replay.
# The animation skeleton adds a root at the ground, three-bone ear chains, a jaw, and one tail root that
# forks into three five-bone tail chains (Nick 2026-10-13: one root forking into three). Ear and tail
# joints and weights follow the surface: geodesic distance from each tip over the skin's edges, so a
# tail never takes weight from a neighbouring tail or leg it merely sits close to in space.

TAILS = ('a', 'b', 'c')          # upper, middle, lower at rest
TAIL_BONES = 5
EAR_BONES = 4          # the blade turns almost rigidly on ear_1; the outer bones allow a slight bend
TAIL_SEGMENT_SHARE = (1.25, 1.1, 1.0, .9, .75)   # tail bone lengths, root to tip, shorter toward the tip


def _anim_bones():
    out = [('root', None, 'root', 'root_tip'), ('pelvis', 'root', 'pelvis', 'waist')]
    out += [b for b in BONES[1:] if b[0] != 'tail']
    for s in ('L', 'R'):
        for k in range(1, EAR_BONES+1):
            out.append((f'ear_{k}.{s}', 'head' if k == 1 else f'ear_{k-1}.{s}', f'ear{k-1}.{s}', f'ear{k}.{s}'))
    out.append(('jaw', 'head', 'jaw_hinge', 'chin'))
    # the tail root is a short sacral segment of the body (pelvis child): from the sacrum inside the rump to the
    # fork between the three tail bases. Each tail's first bone pivots at its own base ring, where that tail
    # leaves the body (pass 5, Nick F36: the tails grow out of the creature, not out of a separate clump)
    out.append(('tail_root', 'pelvis', 'tail_base', 'tail_fork'))
    for t in TAILS:
        for k in range(1, TAIL_BONES+1):
            out.append((f'tail_{t}{k}', 'tail_root' if k == 1 else f'tail_{t}{k-1}', f'tail_{t}_j{k-1}', f'tail_{t}_j{k}'))
    # pass 6: glute helpers (pelvis children at the hip joint, pointing back into the buttock). Not posed by hand:
    # bone_transforms turns each one by half its thigh's rotation relative to the pelvis, so the buttock stretches
    # over the flexing femur instead of staying with the pelvis (standard for hips that flex a lot). Appended last
    # so older rigs' weight indices stay valid.
    for s in ('L', 'R'):
        out.append((f'glute.{s}', 'pelvis', f'hip.{s}', f'glute_tip.{s}'))
    return out


TAIL_BASE_ABOVE_HIP = .045     # rig metres
GLUTE_SHARE = .5          # a glute helper turns this share of its thigh's rotation relative to the pelvis


ANIM_BONES = _anim_bones()
ANIM_NAMES = [b[0] for b in ANIM_BONES]
ANIM_PARENT = {b[0]: b[1] for b in ANIM_BONES}
# bones whose weights come from the distance falloff (the body); the rest come from surface fields
ANIM_BODY = [b for b in ANIM_NAMES if base_of(b) in RADIUS and b not in ('head', 'tail')]


def smoothstep(x, lo, hi):
    t = np.clip((x-lo)/(hi-lo), 0, 1)
    return t*t*(3-2*t)


def edge_graph(points, edges):
    import scipy.sparse as sp
    L = np.linalg.norm(points[edges[:, 0]]-points[edges[:, 1]], axis=1)
    n = len(points)
    return sp.coo_matrix((np.r_[L, L], (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])),
                         shape=(n, n)).tocsr()


def geodesic(G, source, limit):
    from scipy.sparse.csgraph import dijkstra
    return dijkstra(G, indices=source, limit=limit, min_only=True)


def _rings(G, points, D, mask, step=.01, upto=1.2):
    """(level, centroid, max extent, extent per axis, vertex count) of each level band of D inside mask (its largest
    connected piece), from the source outward."""
    from scipy.sparse.csgraph import connected_components
    out = []
    for k in range(int(upto/step)):
        s = k*step
        m = np.where(mask & (D >= s) & (D < s+step))[0]
        if len(m) < 3:
            break
        nc, lb = connected_components(G[m][:, m], directed=False)
        big = np.bincount(lb).argmax()
        q = points[m[lb == big]]
        out.append((s+step/2, q.mean(0), float(np.ptp(q, 0).max()), np.ptp(q, 0), len(q)))
    return out


def _arc_points(centres, shares):
    """Points along a polyline (root first) that split its arc length in the given shares, and their arc
    positions."""
    c = np.asarray(centres)
    seg = np.linalg.norm(np.diff(c, axis=0), axis=1)
    arc = np.r_[0, np.cumsum(seg)]
    cuts = np.cumsum(shares)/np.sum(shares)*arc[-1]
    pts = [np.array([np.interp(u, arc, c[:, i]) for i in range(3)]) for u in cuts]
    return pts, cuts


def akinza_arm(skin, j):
    """Elbow, wrist and shoulder x for Akinza's hanging arm. derive_joints searched the arm only below
    z .09 and found the wrist as the elbow. Here the arm is the part of each section beyond the widest gap
    from the trunk; the elbow is the break of the best two-line fit of its centerline between the paw and
    the armpit, the wrist the narrowest section above the paw, and the shoulder sits on the upper-arm
    line at the shoulder height derive_joints found."""
    zs, cs, wx = [], [], []
    for z in np.arange(-.19, .215, .01):
        p = skin[(np.abs(skin[:, 2]-z) < .006) & (skin[:, 0] < 0) & (skin[:, 1] < .125)]
        xs = np.sort(p[:, 0])
        g = np.diff(xs)
        i = int(np.argmax(g))
        if g[i] < .01:
            continue
        arm = p[p[:, 0] <= xs[i]]
        zs.append(z)
        cs.append(arm.mean(0)[:2])
        wx.append(np.ptp(arm[:, 0]))
    zs, cs, wx = np.array(zs), np.array(cs), np.array(wx)
    ok = np.where((zs > -.05) & (zs < .16))[0]
    k = two_segment_break(zs, cs, int(ok.min()), int(ok.max())+1)
    elbow_z = float(zs[k])
    band = np.where((zs > -.14) & (zs < -.03))[0]
    wrist_z = float(zs[band[np.argmin(wx[band])]])
    up = zs >= elbow_z
    A = np.stack([zs[up], np.ones(up.sum())], 1)
    cx = np.linalg.lstsq(A, cs[up][:, 0], rcond=None)[0]
    cy = np.linalg.lstsq(A, cs[up][:, 1], rcond=None)[0]
    sz = j['shoulder.R'][2]
    out = dict(j)
    out['elbow.R'] = [float(cx[0]*elbow_z+cx[1]), float(cy[0]*elbow_z+cy[1]), elbow_z]
    i = int(np.argmin(np.abs(zs-wrist_z)))
    out['wrist.R'] = [float(cs[i][0]), float(cs[i][1]), wrist_z]
    out['shoulder.R'] = [float(cx[0]*sz+cx[1]), j['shoulder.R'][1], sz]
    for nm in ('elbow', 'wrist', 'shoulder'):
        x, y, z = out[nm+'.R']
        out[nm+'.L'] = [-x, y, z]
    out['_meta'] = dict(j['_meta'], elbowZ=elbow_z, wristZ=wrist_z, armRule='akinza_arm')
    return out


HIP_ABOVE_CROTCH = .060    # rig metres: a hip joint sits about 6 cm above the crotch at this leg length (diagnosis 1)
KNEE_PIT_TOL = .002        # rig metres: the knee pit band is where the back edge is within this of its minimum


def akinza_legs(skin, j, s, off):
    """Pass 6: hip, knee and glute joints re-derived from anatomy on the sculpt (diagnosis 2026-10-21, section 1).
    Work in rig metres (x' = s*(x-off)). The knee goes to the sculpt's knee: the height is the bottom of the knee
    pit band (the narrowest stretch at the back of the leg, between z .30 and .45), at mid-depth of the leg there,
    and on the straight hip-to-ankle line in front view (the sculpt's leg kinks 2.7 cm inward there, and the old
    knee, the break of a two-line fit to the centreline, sat 4 to 5 cm low in the middle of a sideways jog). The
    hip is raised to HIP_ABOVE_CROTCH over the crotch; the ankle stays (it sits on the ankle crease). Each glute
    helper runs from the hip joint back into the buttock. Measures go in _meta.legs."""
    off = np.asarray(off, float)
    P = s*(skin-off)
    crotch = s*(j['_meta']['crotchZ']-off[2])
    leg = (P[:, 0] < -.015) & (P[:, 0] > -.30) & (P[:, 1] < s*(.125-off[1]))
    zs = np.arange(.28, .455, .005)
    front, back = [], []
    for z in zs:
        q = P[leg & (np.abs(P[:, 2]-z) < .003)]
        front.append(float(q[:, 1].min()))
        back.append(float(q[:, 1].max()))
    front, back = np.array(front), np.array(back)
    inband = (zs >= .30) & (back <= back[(zs >= .30)].min()+KNEE_PIT_TOL)
    knee_z = float(zs[inband].min())
    i = int(np.argmin(np.abs(zs-knee_z)))
    knee_y = (front[i]+back[i])/2
    hip = s*(np.asarray(j['hip.R'], float)-off)
    hip[2] = crotch+HIP_ABOVE_CROTCH
    ankle = s*(np.asarray(j['ankle.R'], float)-off)
    t = (hip[2]-knee_z)/(hip[2]-ankle[2])
    knee = np.array([hip[0]+t*(ankle[0]-hip[0]), knee_y, knee_z])
    old_knee = s*(np.asarray(j['knee.R'], float)-off)
    # the ankle crease: the front edge's largest step between the paw roof and the shin, for the record
    az = np.arange(.03, .14, .005)
    af = []
    for z in az:
        q = P[leg & (np.abs(P[:, 2]-z) < .003)]
        af.append(float(q[:, 1].min()))
    crease = float(az[int(np.argmax(np.diff(af)))+1])
    glute_tip = hip+np.array([0., .085, -.025])
    out = dict(j)
    to_src = lambda m: list(map(float, np.asarray(m)/s+off))
    out['hip.R'], out['knee.R'], out['glute_tip.R'] = to_src(hip), to_src(knee), to_src(glute_tip)
    for nm in ('hip', 'knee', 'glute_tip'):
        x, y, z = out[nm+'.R']
        out[nm+'.L'] = [-x, y, z]
    out['_meta'] = dict(j['_meta'], kneeZ=float(knee[2]/s+off[2]), legs=dict(
        rule='akinza_legs (pass 6)', units='rig metres', crotchZ=crotch, hip=hip.tolist(), knee=knee.tolist(),
        oldKnee=old_knee.tolist(), kneePitBand=[float(zs[inband].min()), float(zs[inband].max())],
        kneeDepth=[float(front[i]), float(back[i])], ankle=ankle.tolist(), ankleCreaseFrontZ=crease,
        thigh=float(np.linalg.norm(knee-hip)), shin=float(np.linalg.norm(ankle-knee))))
    return out


def derive_anim_joints(skin, edges, claws=None, mouth_z=.54, height_m=1.475):
    """Joints of ANIM_BONES from the shaved skin (source units, before re-origin and scale). The surface
    fields the weights need (tip vertices, junction levels, joint arc positions) go in _meta.surface.
    height_m: the figure's height in metres (anim_transform), for the legs' anatomical measures."""
    j = akinza_arm(skin, derive_joints(skin, claws))
    s_m, off_m = anim_transform(j, height_m)
    j = akinza_legs(skin, j, s_m, off_m)
    G = edge_graph(skin, edges)
    surf = {'ears': {}, 'tails': {}}
    # ---- ears: geodesic rings from each tip; the junction is where the thin blade thickens into the skull
    for s, sign in (('L', 1), ('R', -1)):
        m = np.where((skin[:, 2] > .5) & (skin[:, 1] < .2))[0]
        tip = int(m[np.argmax(sign*skin[m, 0])])
        D = geodesic(G, tip, 1.0)
        rings = _rings(G, skin, D, np.isfinite(D), upto=.7)
        # the ring's vertex count holds steady along the outer blade and climbs where the skull starts
        count = np.array([r[4] for r in rings])
        root_k = next(k for k in range(25, len(rings)) if count[k] > 1.12*count[k-4])-1
        D_root = float(rings[root_k][0])
        line = [r[1] for r in rings[:root_k+1]][::-1]          # junction first
        pts, cuts = _arc_points(line, [1]*EAR_BONES)
        # the hinge sits at the back of the root, not its middle: the root is a long oval, and turning it about
        # its middle swings the front of the root into the skull; about its back edge the blade folds back
        # like a door and the front of the root lifts off the head instead
        # and low on it (2026-10-21, ear tipped down to the photo's angle): turning down about a hinge at mid
        # height swung the lower half of the root into the skull
        hinge = np.array(line[0], float)+np.array([0., .45*float(rings[root_k][3][1]), -.35*float(rings[root_k][3][2])])
        j[f'ear0.{s}'] = list(map(float, hinge))
        for k in range(1, EAR_BONES):
            j[f'ear{k}.{s}'] = list(map(float, pts[k-1]))
        j[f'ear{EAR_BONES}.{s}'] = list(map(float, skin[tip]))
        cuts = cuts/cuts[-1]*D_root                     # arc positions in geodesic units, the weights' measure
        surf['ears'][s] = dict(tip=tip, junction=D_root, joints=[0.]+[float(c) for c in cuts[:-1]]+[D_root])
    # ---- jaw: hinge behind the cheek a little above the mouth line, chin under the mouth on the midline
    mid = skin[np.abs(skin[:, 0]) < .02]
    lip = mid[(mid[:, 2] > mouth_z-.05) & (mid[:, 2] < mouth_z-.005) & (mid[:, 1] < -.05)]
    chin = lip[np.argmin(lip[:, 1])]
    hz = mouth_z+.035
    sec = mid[np.abs(mid[:, 2]-hz) < .005]
    hy = float(sec[:, 1].min()+.5*np.ptp(sec[:, 1]))
    j['jaw_hinge'] = [0., hy, hz]
    j['chin'] = [0., float(chin[1])+.015, float(chin[2])]
    surf['jaw'] = dict(mouthZ=mouth_z)
    # ---- tails: one geodesic field per tip; each tail's junction is where its ring meets the body
    from scipy.sparse.csgraph import connected_components
    far = np.where(skin[:, 1] > .3)[0]
    nc, lb = connected_components(G[far][:, far], directed=False)
    tips = []
    for c in range(nc):
        mm = far[lb == c]
        if len(mm) < 500:
            continue
        tips.append(int(mm[np.argmax(np.linalg.norm(skin[mm]-np.array([0, .1, -.2]), axis=1))]))
    assert len(tips) == 3, len(tips)
    tips.sort(key=lambda t: -skin[t, 2])        # a upper, b middle, c lower
    Ds = [geodesic(G, t, 1.3) for t in tips]
    Dmin = np.minimum.reduce(Ds)
    bases = []
    for t, tip, D in zip(TAILS, tips, Ds):
        own = D <= Dmin+1e-9
        rings = _rings(G, skin, D, own & np.isfinite(D), upto=1.2)
        ext = np.array([r[2] for r in rings])
        k = next(k for k in range(30, len(rings)) if ext[k] > 1.15*ext[k-3])   # the ring starts spreading onto the body
        Dj = float(rings[k-1][0])
        line = [r[1] for r in rings[:k]][::-1]     # base ring first
        pts, cuts = _arc_points(line, TAIL_SEGMENT_SHARE)
        bases.append(line[0])
        j[f'tail_{t}_j0'] = list(map(float, line[0]))       # the base ring's centre: this tail's pivot on the body
        for i in range(1, TAIL_BONES):
            j[f'tail_{t}_j{i}'] = list(map(float, pts[i-1]))
        j[f'tail_{t}_j{TAIL_BONES}'] = list(map(float, skin[tip]))
        cuts = cuts/cuts[-1]*Dj
        surf['tails'][t] = dict(tip=tip, junction=Dj, joints=[0.]+[float(c) for c in cuts[:-1]]+[Dj])
    fork = np.mean(bases, 0)
    j['tail_fork'] = list(map(float, fork))
    # pass 6: the tail base is the sacrum's continuation, a pelvis child inside the rump at the top of the pelvis,
    # behind and above the hip joints (TAIL_BASE_ABOVE_HIP over the pelvis joint, which sits at the old hip height,
    # 55% of the way back from the pelvis joint to the fork)
    pel = np.array(j['pelvis'], float)
    j['tail_base'] = [float(fork[0]/2), float(pel[1]+.55*(fork[1]-pel[1])), float(pel[2]+TAIL_BASE_ABOVE_HIP/s_m)]
    j['root'] = [0., float(j['pelvis'][1]), FLOOR_Z]
    j['root_tip'] = [0., float(j['pelvis'][1])-.15, FLOOR_Z]
    j['_meta'] = dict(j['_meta'], skeleton='ANIM_BONES', surface=surf)
    return j


def anim_transform(joints, height_m):
    """Re-origin and scale: the ground point under the pelvis goes to the origin and the figure's fixed
    height (top of the ear fan to the floor) becomes height_m. Returns (s, offset): x' = s*(x-offset)."""
    return height_m/FIXED_HEIGHT, np.array([0., joints['pelvis'][1], FLOOR_Z])


def transform_joints(joints, s, off):
    return {k: (v if k.startswith('_') else list(map(float, s*(np.asarray(v, float)-off)))) for k, v in joints.items()}


def diffuse_weights(W, edges, n, iters, lam=.6, mask=None):
    """Average each weight vector with its mesh neighbours (along the skin's edges, so nothing crosses a
    gap between an arm and the trunk or between two tails), iters rounds. Spreads a blend over about
    edge length * sqrt(2 lam iters) and removes the zigzag of graph-distance fields."""
    import scipy.sparse as sp
    A = sp.coo_matrix((np.ones(2*len(edges), np.float32), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])),
                      shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(1)).ravel()
    A = sp.diags((1/np.maximum(deg, 1)).astype(np.float32))@A
    W = W.astype(np.float32)
    step = lam if mask is None else (lam*mask).astype(np.float32)[:, None]
    for _ in range(iters):
        W = W+step*(A@W-W)
    return W


def compute_anim_weights(points, edges, joints, keep=4, eye_centres=(), eye_clear=.02, tail_soft=.012, diffuse=200, wide_rounds=600):
    """Skin weights for ANIM_BONES (source units, before scale), as (idx, w) indexing ANIM_NAMES.

    Body bones: the distance falloff of compute_weights (no k-d smoothing: it crossed the arm-trunk gap). Head: the z mask of
    compute_weights, then within it the ear chains (geodesic from each ear tip, blended into the skull
    across the junction, held off the eye sockets) and the jaw (under the mouth line, in front of the
    hinge). Tails: each tail's vertices belong to the tail whose tip is geodesically nearest (soft across
    the crotches between tails), split along the tail by smooth steps at the chain's joints; tail_root
    holds the junction and the crotch, and fades into the body just outside it. Last, every weight is
    diffused along the skin's edges (diffuse_weights)."""
    surf = joints['_meta']['surface']
    G = edge_graph(points, edges)
    bi = {b: i for i, b in enumerate(ANIM_NAMES)}
    n = len(points)
    segs = segments(joints, ANIM_BONES)
    S = np.full((n, len(ANIM_NAMES)), 1e6, np.float32)
    for b in ANIM_BODY:
        d, _ = seg_dist(points, *segs[b])
        S[:, bi[b]] = (d/RADIUS[base_of(b)])**2
        sd = side_of(b)
        if sd == 'L':
            S[points[:, 0] < -.01, bi[b]] += 50
        elif sd == 'R':
            S[points[:, 0] > .01, bi[b]] += 50
    # near-rigid start (k 8, not compute_weights' 1.4, which gave the big pelvis and chest radii a share of
    # every arm vertex); the blend across each joint comes from the diffusion along the skin at the end
    W = np.exp(-8*(S-S.min(1, keepdims=True)))
    W[W < .01] = 0
    W /= W.sum(1, keepdims=True)
    # ---- tails
    U = np.stack([surf['tails'][t]['junction']-geodesic(G, surf['tails'][t]['tip'], 1.3) for t in TAILS], 1)
    U[~np.isfinite(U)] = -9                      # + out along the tail from its junction
    umax = U.max(1)
    beta = np.exp((U-umax[:, None])/tail_soft)
    beta /= beta.sum(1, keepdims=True)
    # tail_root and the chains, against the body. Pass 5: the band the tail root holds is narrow (2.5 cm of body
    # skin round each base, was 7 cm): the rump and the crotches between the tails stay with the pelvis, so the
    # tails come out of the body instead of out of a separately turning clump
    on_tail = smoothstep(umax, -.025, .005)
    W *= (1-on_tail)[:, None]
    chain_total = np.zeros(n)
    for ti, t in enumerate(TAILS):
        cuts = surf['tails'][t]['joints']        # arc position of each joint, 0 at the junction
        hw = .3*float(np.diff(cuts).min())
        u = U[:, ti]
        prev = smoothstep(u, -.005, .045)        # below this tail_root keeps the narrow base band
        for k in range(1, TAIL_BONES+1):
            nxt = smoothstep(u, cuts[k]-hw, cuts[k]+hw) if k < TAIL_BONES else np.zeros(n)
            wk = np.clip(prev-nxt, 0, None)*beta[:, ti]*on_tail
            W[:, bi[f'tail_{t}{k}']] = wk
            chain_total += wk
            prev = nxt
    W[:, bi['tail_root']] = np.clip(on_tail-chain_total, 0, None)
    # ---- head, ears, jaw
    hz = joints['head_base'][2]
    h = smoothstep(points[:, 2], hz-.035, hz+.03)
    H = np.zeros((n, len(ANIM_NAMES)), np.float32)
    free = np.ones(n)
    guard = np.ones(n)
    for c in eye_centres:
        guard *= smoothstep(np.linalg.norm(points-np.asarray(c), axis=1), eye_clear, eye_clear+.02)
    for s in ('L', 'R'):
        e = surf['ears'][s]
        u = e['junction']-geodesic(G, e['tip'], 1.0)
        u[~np.isfinite(u)] = -9
        cuts = e['joints']
        hw = .25*float(np.diff(cuts).min())
        entry = smoothstep(u, -.03, .03)*guard     # short root blend: the blade turns, the skull barely bends
        prev = np.ones(n)
        for k in range(1, EAR_BONES+1):
            nxt = smoothstep(u, cuts[k]-hw, cuts[k]+hw) if k < EAR_BONES else np.zeros(n)
            H[:, bi[f'ear_{k}.{s}']] = np.clip(prev-nxt, 0, None)*entry
            prev = nxt
        free -= entry
    mz = surf['jaw']['mouthZ']
    hy = joints['jaw_hinge'][1]
    jw = (1-smoothstep(points[:, 2], mz-.012, mz+.004))*smoothstep(-points[:, 1], -hy-.01, -hy+.05)\
        * smoothstep(points[:, 2], hz+.005, hz+.04)*(1-smoothstep(np.abs(points[:, 0]), .07, .11))
    jw = np.minimum(jw, np.clip(free, 0, 1))
    H[:, bi['jaw']] = jw
    free -= jw
    H[:, bi['head']] = np.clip(free, 0, 1)
    W = W*(1-h)[:, None]+H*h[:, None]
    W = diffuse_weights(W, edges, n, diffuse)
    # shoulders and hips bend furthest: widen their blend (about 7 cm more) with extra rounds there only
    wide = np.zeros(n)
    for jn in ('shoulder.L', 'shoulder.R', 'hip.L', 'hip.R'):
        r = np.linalg.norm(points-np.asarray(joints[jn]), axis=1)
        wide = np.maximum(wide, 1-smoothstep(r, .10, .17))
    W = diffuse_weights(W, edges, n, wide_rounds, mask=wide)
    W[W < 1e-4] = 0
    W /= W.sum(1, keepdims=True)
    idx = np.argsort(-W, 1)[:, :keep]
    w = np.take_along_axis(W, idx, 1)
    w /= w.sum(1, keepdims=True)
    return idx.astype(np.int16), w.astype(np.float32)


# ---------------------------------------------------------------- volume-preserving skinning and correctives

def quat_from_matrix(R):
    """(w, x, y, z) unit quaternion of a rotation matrix."""
    t = np.trace(R)
    if t > 0:
        s = math.sqrt(t+1)*2
        q = [s/4, (R[2, 1]-R[1, 2])/s, (R[0, 2]-R[2, 0])/s, (R[1, 0]-R[0, 1])/s]
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = math.sqrt(1+R[0, 0]-R[1, 1]-R[2, 2])*2
        q = [(R[2, 1]-R[1, 2])/s, s/4, (R[0, 1]+R[1, 0])/s, (R[0, 2]+R[2, 0])/s]
    elif R[1, 1] > R[2, 2]:
        s = math.sqrt(1+R[1, 1]-R[0, 0]-R[2, 2])*2
        q = [(R[0, 2]-R[2, 0])/s, (R[0, 1]+R[1, 0])/s, s/4, (R[1, 2]+R[2, 1])/s]
    else:
        s = math.sqrt(1+R[2, 2]-R[0, 0]-R[1, 1])*2
        q = [(R[1, 0]-R[0, 1])/s, (R[0, 2]+R[2, 0])/s, (R[1, 2]+R[2, 1])/s, s/4]
    q = np.array(q)
    return q/np.linalg.norm(q)


def _qmul(a, b):
    """Quaternion product, (..., 4) arrays, (w, x, y, z)."""
    aw, ax, ay, az = np.moveaxis(a, -1, 0)
    bw, bx, by, bz = np.moveaxis(b, -1, 0)
    return np.stack([aw*bw-ax*bx-ay*by-az*bz, aw*bx+ax*bw+ay*bz-az*by,
                     aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw], -1)


def _qmat(q):
    w, x, y, z = np.moveaxis(q, -1, 0)
    return np.stack([np.stack([1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], -1),
                     np.stack([2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], -1),
                     np.stack([2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)], -1)], -2)


def skin_points_dq(points, idx, w, transforms, bones=None):
    """Dual quaternion skinning (Blender's Preserve Volume) of (n,3) points with the bone transforms of
    bone_transforms. Returns (posed points, per-vertex rotation matrices (n,3,3)). Each vertex blends its
    bones' dual quaternions by weight, sign-aligned to the running sum, then normalizes; volume is kept
    across bends where linear blending collapses it."""
    names = [b[0] for b in (bones or BONES)]
    Q = np.stack([quat_from_matrix(transforms[b][0]) for b in names])
    Tq = np.stack([np.r_[0, transforms[b][1]] for b in names])
    D = .5*_qmul(Tq, Q)
    real = np.zeros((len(points), 4))
    dual = np.zeros((len(points), 4))
    for k in range(idx.shape[1]):
        q, d = Q[idx[:, k]], D[idx[:, k]]
        sgn = np.where((real*q).sum(1) < 0, -1., 1.) if k else np.ones(len(points))
        real += (w[:, k]*sgn)[:, None]*q
        dual += (w[:, k]*sgn)[:, None]*d
    nrm = np.linalg.norm(real, axis=1, keepdims=True)
    real, dual = real/nrm, dual/nrm
    R = _qmat(real)
    conj = real*np.array([1, -1, -1, -1])
    t = 2*_qmul(dual, conj)[:, 1:]
    return np.einsum('nij,nj->ni', R, points)+t, R


def swing_deg(joints, pose, bone, bones=None):
    """How far a bone's axis turns away from its rest direction relative to its parent: the swing of its
    local rotation about its own axis (Blender driver: transform ROT_W, rotation mode SWING_TWIST_Y, local
    space). Twist about the bone does not count."""
    u = bone_axis(joints, bone, bones)
    R = euler_matrix(*pose.get(bone, (0, 0, 0)))
    return math.degrees(math.acos(max(-1., min(1., float(u@R@u)))))


def driver_value(angle, rise, fall=None):
    """Corrective key value from a swing angle: 0 below rise[0], 1 at rise[1], back to 0 at fall (degrees)."""
    v = (angle-rise[0])/(rise[1]-rise[0])
    if fall is not None:
        v = min(v, (fall-angle)/(fall-rise[1]))
    return max(0., min(1., v))


def corrective_values(joints, pose, keys, bones=None):
    return {k['name']: driver_value(swing_deg(joints, pose, k['bone'], bones), k['rise'], k.get('fall')) for k in keys}


def slerp_pose(pose, f):
    """Every bone turned the share f of its pose rotation (quaternion slerp from rest about the same axis)."""
    out = {}
    for b, e in pose.items():
        q = quat_from_matrix(euler_matrix(*e))
        ang = 2*math.acos(max(-1., min(1., q[0])))
        if ang < 1e-9:
            continue
        ax = q[1:]/np.linalg.norm(q[1:])
        h = f*ang/2
        out[b] = euler_from_matrix(_qmat(np.r_[math.cos(h), ax*math.sin(h)]))
    return out


def helper_rotation(R, f):
    """The rotation turning the share f of R's angle about R's own axis."""
    q = quat_from_matrix(R)
    if q[0] < 0:
        q = -q
    ang = 2*math.acos(max(-1., min(1., q[0])))
    if ang < 1e-9:
        return np.eye(3)
    ax = q[1:]/np.linalg.norm(q[1:])
    h = f*ang/2
    return _qmat(np.r_[math.cos(h), ax*math.sin(h)])


def helper_pose(joints, pose, bones=None):
    """The pose with every helper bone's rotation written out explicitly (what bone_transforms computes for a
    helper missing from the pose), for consumers that set bone rotations directly, such as the Blender armature."""
    bones = bones or ANIM_BONES
    names = [b[0] for b in bones]
    out = dict(pose)
    if not any(n.startswith('glute.') for n in names):
        return out
    T = bone_transforms(joints, {k: v for k, v in pose.items() if not k.startswith('glute.')}, bones=bones)
    for sd in ('L', 'R'):
        out[f'glute.{sd}'] = euler_from_matrix(helper_rotation(T['pelvis'][0].T@T[f'thigh.{sd}'][0], GLUTE_SHARE))
    return out


def leg_forward(joints, sd):
    """The foot's forward direction at rest (ankle to toe, level): the direction each knee's hinge plane faces."""
    d = np.subtract(joints[f'toe.{sd}'], joints[f'ankle.{sd}']).astype(float)
    d[2] = 0
    return d/np.linalg.norm(d)


def _frame(x, y):
    x = np.asarray(x, float)/np.linalg.norm(x)
    y = np.asarray(y, float)-x*(x@np.asarray(y, float))
    y /= np.linalg.norm(y)
    return np.stack([x, y, np.cross(x, y)], 1)


def hinged_leg(joints, pose, sd, d1, d2, pole, bones=None):
    """Thigh and shin of one leg set to the world directions d1 and d2 with the knee a hinge (pass 6): the
    thigh's twist is solved so its kneecap (the rest forward direction, square to the thigh) faces `pole`, and
    the shin turns from the thigh only about the hinge axis, so the leg folds in one plane. pole must lie in the
    plane of d1 and d2 (the IK's bend direction, or d1-d2). The foot keeps its rest world orientation.
    Returns the pose with thigh, shin and foot of that side replaced."""
    bones = bones or ANIM_BONES
    pose = dict(pose)
    for b in (f'thigh.{sd}', f'shin.{sd}', f'foot.{sd}'):
        pose.pop(b, None)
    Rp = bone_transforms(joints, pose, bones=bones)[f'hip.{sd}'][0]
    fwd = leg_forward(joints, sd)
    u1 = bone_axis(joints, f'thigh.{sd}', bones)
    u2 = bone_axis(joints, f'shin.{sd}', bones)
    pole = np.asarray(pole, float)
    Rt = _frame(d1, pole)@_frame(u1, fwd).T
    Rs = _frame(d2, pole)@_frame(u2, fwd).T
    pose[f'thigh.{sd}'] = euler_from_matrix(Rp.T@Rt)
    pose[f'shin.{sd}'] = euler_from_matrix(Rt.T@Rs)
    pose[f'foot.{sd}'] = euler_from_matrix(Rs.T)
    return pose


def lift_vec(lift):
    """A pose's root move: a scalar is a lift straight up (the re-grounding of the board poses), a 3-vector a
    translation of the whole body (the planted-feet crouch lowers and moves the hips back over the feet)."""
    return np.asarray(lift, float) if np.ndim(lift) else np.array([0., 0., float(lift)])


def plant_legs(joints, pose, lift, feet, poles, bones=None):
    """Two-bone IK that keeps each foot where it stands: thigh and shin turned so the ankle reaches feet[side]
    (world, after the root move `lift`), the knee bending toward poles[side] (a world direction; only its part
    across the hip-to-ankle line counts), and the foot keeping its rest world orientation, flat where it stood.
    Pass 6: each knee is a hinge in a fixed plane, the plane through the hip and the ankle that faces poles[side]
    (the foot's forward direction, the same for the whole motion; never the sculpt's rest kink), and the thigh's
    twist is solved so the kneecap faces the pole (hinged_leg). Returns the pose with thigh, shin and foot of both
    sides replaced."""
    bones = bones or ANIM_BONES
    pose = dict(pose)
    for sd in ('L', 'R'):
        for b in (f'thigh.{sd}', f'shin.{sd}', f'foot.{sd}'):
            pose.pop(b, None)
        T = bone_transforms(joints, pose, root_translate=tuple(lift_vec(lift)), bones=bones)
        R, t = T[f'hip.{sd}']
        H = R@np.array(joints[f'hip.{sd}'])+t
        A = np.asarray(feet[sd], float)
        l1 = float(np.linalg.norm(np.subtract(joints[f'knee.{sd}'], joints[f'hip.{sd}'])))
        l2 = float(np.linalg.norm(np.subtract(joints[f'ankle.{sd}'], joints[f'knee.{sd}'])))
        d = A-H
        D = min(float(np.linalg.norm(d)), (l1+l2)*(1-1e-7))
        u = d/np.linalg.norm(d)
        pp = np.asarray(poles[sd], float)
        pp = pp-u*(u@pp)
        pp /= np.linalg.norm(pp)
        ca = max(-1., min(1., (l1*l1+D*D-l2*l2)/(2*l1*D)))
        K = H+l1*(ca*u+math.sqrt(1-ca*ca)*pp)
        A2 = H+u*D
        pose = hinged_leg(joints, pose, sd, K-H, A2-K, pp, bones=bones)
    return pose


def posed_skin(points, idx, w, joints, pose, lift=0., keys=(), deltas=None, bones=None):
    """Volume-preserving skin with the corrective keys: rest + sum(value * delta), then dual quaternions.
    lift: a scalar (straight up) or a 3-vector root move (lift_vec)."""
    bones = bones or ANIM_BONES
    x = points
    vals = corrective_values(joints, pose, keys, bones) if keys else {}
    if keys and deltas is not None:
        x = points.copy()
        for k in keys:
            v = vals[k['name']]
            if v > 0:
                ids, dl = deltas[k['name']]
                x[ids] += v*dl
    T = bone_transforms(joints, pose, root_translate=tuple(lift_vec(lift)), bones=bones)
    P, R = skin_points_dq(x, idx, w, T, bones)
    return P, R, vals

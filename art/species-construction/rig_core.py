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
    and elbow fits, the narrowest neck section, the front crotch arch. Limbs are
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
    # neck base: the highest height below the head where the body is 5x as wide as the narrowest neck
    # section (a landmark on the shoulders, so a longer neck moves the head and not this); the
    # shoulder joint sits .08 below it
    nb_z = head_z-.17
    narrow = float(min(widths))
    for z in np.arange(head_z-.005, head_z-.35, -.005):
        p_ = skin[(np.abs(skin[:, 2]-z) < .004) & (skin[:, 1] < .125)]
        if len(p_) and np.ptp(p_[:, 0]) >= 5*narrow:
            nb_z = float(z)
            break
    shoulder_z = nb_z-.08
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
    j['clavicle'] = [0., mid_y(shoulder_z+.03), shoulder_z+.03]
    j['neck_base'] = [0., mid_y(nb_z), nb_z]
    j['shoulder.R'][1] = j['clavicle'][1]
    j['shoulder.L'] = [-j['shoulder.R'][0], j['shoulder.R'][1], shoulder_z]
    j['head_base'] = [0., float(np.median(skin[(np.abs(skin[:, 2]-head_z) < .01)][:, 1])), head_z]
    j['head_top'] = [0., j['head_base'][1], zmax]
    # tail root: the rear edge of the buttocks, where the tails leave the body
    rear = front[(np.abs(front[:, 0]) < .15) & (front[:, 2] < hip_z-.05) & (front[:, 2] > hip_z-.35)]
    j['tail_root'] = [0., float(rear[:, 1].max())-.01, hip_z-.05]
    tails = skin[skin[:, 1] > .125]
    j['tail_tip'] = [0., float(tails[:, 1].mean()), float(tails[:, 2].mean())]
    j['_meta'] = {'floorZ': floor, 'crotchZ': crotch, 'kneeZ': knee_z, 'elbowZ': elbow_z, 'headZ': head_z,
                  'topZ': zmax}
    return j


# ---------------------------------------------------------------- skeleton

def segments(joints):
    """bone -> (head, tail) as float arrays."""
    return {b: (np.array(joints[h], float), np.array(joints[t], float)) for b, _, h, t in BONES}


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

def bone_axis(joints, b):
    a, t = segments(joints)[b]
    d = t-a
    return d/np.linalg.norm(d)


def bone_transforms(joints, pose=None, scales=None, root_translate=(0, 0, 0)):
    """bone -> (R (3,3), t (3,)) skinning transform, x' = R x + t.

    A bone's own motion is a scale along its axis then a rotation, both about its
    head. Children receive only the rigid part of that motion: they rotate with
    the parent and their pivot moves to where the parent's skinning puts it, so a
    shortened forearm moves the hand without squashing it."""
    pose = pose or {}
    scales = scales or {}
    segs = segments(joints)
    out, rigid = {}, {}
    for b, parent, _, _ in BONES:
        p = segs[b][0]
        Rb = euler_matrix(*pose.get(b, (0, 0, 0)))
        lin = Rb
        s = scales.get(b, 1.0)
        if s != 1.0:
            u = bone_axis(joints, b)
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
        for b in BONE_NAMES:
            Rb, tb = out[b]
            out[b] = (Rb, tb+np.array(root_translate))
    return out


def skin_points(points, idx, w, transforms):
    names = BONE_NAMES
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


def pose_from_directions(joints, targets):
    """Pose for a chain given the wanted world direction of each bone after posing.
    targets: ordered dict bone -> direction. Parents come before children."""
    pose = {}
    T = {}
    for b, d in targets.items():
        parent = PARENT[b]
        Rp = bone_transforms(joints, pose)[parent][0] if parent else np.eye(3)
        u = bone_axis(joints, b)
        Rb = align_rotation(u, Rp.T@np.asarray(d, float))
        pose[b] = euler_from_matrix(Rb)
    return pose

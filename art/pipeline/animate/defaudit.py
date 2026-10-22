"""B-j6jh: deformation audit set for Luceras (render only; the blend is opened read-only and never saved).

blender -b --factory-startup --python defaudit.py -- SRC OUT SET
  SET  sheet  the baked rig pose sheet `review.poses` (frame 1 + 10 * index, POSES order as build_rig.py)
       sig    signature clip sig.horns-first-descent at frames 8, 11, 22, 29, 38
Env: AUD_POSES (comma subset of pose names), AUD_CAMS (comma subset), AUD_SIZE (1400), AUD_SAMPLES (32),
     AUD_SKIP (comma subset of A,B,C,crops,overlay,flags), AUD_CROP_POSES (default crouch,sig_f08)

Per pose: sculpt clay only (luceras_blockout plus eyes, horns, claws, whiskers; no game mesh, no plume stand-in),
eight orthographic cameras fitted to the posed sculpt bounds, each rendered three ways:
  A  look-dev clay (roster/lookdev.py lights, ground and world), Cycles CPU, denoised
  B  grazing: look-dev lights off, world at 0.08, one shadowless sun 18 degrees off the image plane from the image's upper left
  C  curvature: Workbench flat, mean curvature as vertex colour (dark blue = concave, mid gray = flat, light amber = convex)
Flags (body mesh luceras_blockout only), against the same body evaluated at rest (identity pose, correctives 0):
  collapse  triangle area below 30 percent of rest
  flip      posed normal opposite the rest normal carried by the triangle's dominant bone rotation
  intersect triangle pairs of different dominant bones that intersect (pairs sharing a vertex ignored); pairs
            already intersecting at rest are listed separately and not counted as new
  overmove  vertex displacement from rest above 1.5 x the displacement its dominant bone's rigid transform
            predicts, and at least 3 mm above it (armature space, so whole-object travel cancels)
Flagged elements are clustered (12 mm grid on centroids, left/right/midline kept apart) and labelled by dominant bone and nearest joint.
Overlay: Workbench studio clay, gray body, collapse/flip amber, intersect blue, overmove magenta, all eight cameras;
the camera with the most camera-facing flagged triangles is copied to <pose>_overlay_best.png.
"""
import bpy, sys, os, json, math, time
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'rig')); sys.path.insert(0, str(HERE.parent / 'roster'))
import lookdev
import neck_lib as NL

A = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT, SET = A[0], Path(A[1]), A[2]
SIZE = int(os.environ.get('AUD_SIZE', '1400')); SAMPLES = int(os.environ.get('AUD_SAMPLES', '32'))
SKIP = set(filter(None, os.environ.get('AUD_SKIP', '').split(',')))
CROP_POSES = set(os.environ.get('AUD_CROP_POSES', 'crouch,sig_f08').split(','))
SHEET = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in']
if os.environ.get('AUD_SHEET'): SHEET = os.environ['AUD_SHEET'].split(',')   # B-sntv pass 2: review.poses order when it carries extra poses
SIG = {'sig_f08': 8, 'sig_f11': 11, 'sig_f22': 22, 'sig_f29': 29, 'sig_f38': 38}
if os.environ.get('AUD_SIG'): SIG = {f'sig_f{int(f):02d}': int(f) for f in os.environ['AUD_SIG'].split(',')}   # B-sntv pass 4: extra signature frames
if SET == 'sheet':
    POSES = [(n, 'review.poses', 1 + i * 10) for i, n in enumerate(SHEET)]
else:
    POSES = [(n, 'sig.horns-first-descent', f) for n, f in SIG.items()]
if os.environ.get('AUD_POSES'):
    keep = os.environ['AUD_POSES'].split(','); POSES = [p for p in POSES if p[0] in keep]
# name: (azimuth from the front (-Y) toward the creature's left (+X), elevation), ground shown
CAMS = {
    'left': (90.0, 0.0, True), 'right': (-90.0, 0.0, True), 'front': (0.0, 0.0, True), 'back': (180.0, 0.0, True),
    'top': (0.0, 90.0, True), 'underside': (0.0, -90.0, False),
    'low34_front_left': (45.0, -12.0, False), 'low34_rear_left': (135.0, -12.0, False),
}
if os.environ.get('AUD_CAMS'):
    CAMS = {k: v for k, v in CAMS.items() if k in os.environ['AUD_CAMS'].split(',')}
MARGIN = 0.04

bpy.ops.wm.open_mainfile(filepath=SRC)
sc = bpy.context.scene
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.update_tag(); rig.animation_data_create()
body = bpy.data.objects['luceras_blockout']; me = body.data
SCULPT = [o for o in sc.objects if o.type == 'MESH' and o.get('body_kind') == 'sculpt']
for o in sc.objects:
    if o.type == 'MESH' and o not in SCULPT: o.hide_render = True
for o in SCULPT: o.hide_render = False

me.calc_loop_triangles()
NT = len(me.loop_triangles)
F = np.empty(NT * 3, np.int64); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
TP = np.empty(NT, np.int64); me.loop_triangles.foreach_get('polygon_index', TP)
E = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
NV = len(me.vertices)
LT = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get('loop_total', LT)
LOOP_POLY = np.repeat(np.arange(len(me.polygons)), LT)
LOOP_VERT = np.empty(len(me.loops), np.int64); me.loops.foreach_get('vertex_index', LOOP_VERT)

# dominant deform bone per vertex
deform = {b.name for b in rig.data.bones if b.use_deform}
gnames = [g.name for g in body.vertex_groups]
W = np.zeros((NV, len(gnames)), np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
for j, n in enumerate(gnames):
    if n not in deform: W[:, j] = 0
DOM = W.argmax(1); DOM_NAME = np.array(gnames)
TDOM = DOM[F[:, 0]]

LABEL = {'spine_01': 'rump / pelvis', 'spine_02': 'loin', 'spine_03': 'mid back / belly', 'spine_04': 'rib cage / belly',
         'spine_05': 'chest / withers', 'neck_01': 'neck base / chest front', 'neck_02': 'neck / throat', 'head_01': 'head',
         'jaw_01': 'jaw / under jaw', 'tail_01': 'tail base'}
def bone_label(n):
    if n in LABEL: return LABEL[n]
    if n.startswith('leg_'):
        side = 'left' if n[5] == 'l' else 'right'; fore = n[4] == 'f'; seg = int(n[-1])
        part = (['shoulder / upper arm', 'elbow / forearm', 'wrist / forepaw'] if fore else ['hip / thigh', 'stifle / gaskin', 'hock / hind paw'])[seg - 1]
        return f'{side} {part}'
    if n.startswith('tail_'): return 'tail'
    if n.startswith('ear_'): return 'ear'
    if n.startswith('horn_'): return 'horn'
    return n
JOINTS = {f'{s} shoulder': f'leg_f{c}_01' for s, c in (('left', 'l'), ('right', 'r'))}
JOINTS.update({f'{s} elbow': f'leg_f{c}_02' for s, c in (('left', 'l'), ('right', 'r'))})
JOINTS.update({f'{s} wrist': f'leg_f{c}_03' for s, c in (('left', 'l'), ('right', 'r'))})
JOINTS.update({f'{s} hip': f'leg_h{c}_01' for s, c in (('left', 'l'), ('right', 'r'))})
JOINTS.update({f'{s} stifle': f'leg_h{c}_02' for s, c in (('left', 'l'), ('right', 'r'))})
JOINTS.update({f'{s} hock': f'leg_h{c}_03' for s, c in (('left', 'l'), ('right', 'r'))})
JOINTS.update({'neck base': 'neck_01', 'mid neck': 'neck_02', 'head': 'head_01', 'tail base': 'tail_01', 'withers': 'spine_05', 'pelvis': 'spine_01'})


def set_pose(act, f):
    if act is None:
        rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
    else:
        ac = bpy.data.actions[act]; rig.animation_data.action = ac
        if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    sc.frame_set(f); bpy.context.view_layer.update()


def eval_local(o):
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg); m = ev.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear(); return x.reshape(-1, 3)


def to_space(M, X):
    M = np.array(M); return X @ M[:3, :3].T + M[:3, 3]


def tri_geom(V):
    c = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); a = np.linalg.norm(c, axis=1)
    return a * 0.5, c / np.maximum(a, 1e-30)[:, None]


def skin_mats():
    """armature-space rigid transform per vertex group index (identity for non-bones)."""
    out = np.tile(np.eye(4), (len(gnames), 1, 1))
    for j, n in enumerate(gnames):
        if n in rig.pose.bones: out[j] = np.array(rig.pose.bones[n].matrix @ rig.data.bones[n].matrix_local.inverted())
    return out


def bone_trees(Vr):
    trees = {}
    for j in np.unique(TDOM):
        ti = np.nonzero(TDOM == j)[0]; vs, inv = np.unique(F[ti].ravel(), return_inverse=True)
        P = Vr[vs]; trees[j] = (BVHTree.FromPolygons(P.tolist(), inv.reshape(-1, 3).tolist(), all_triangles=True), ti, P.min(0), P.max(0))
    return trees


def intersections(Vr):
    T = bone_trees(Vr); keys = sorted(T); pairs = set()
    for a in range(len(keys)):
        ta, ia, lo_a, hi_a = T[keys[a]]
        for b in range(a + 1, len(keys)):
            tb, ib, lo_b, hi_b = T[keys[b]]
            if np.any(hi_a < lo_b) or np.any(hi_b < lo_a): continue
            for p, q in ta.overlap(tb):
                g1, g2 = int(ia[p]), int(ib[q])
                if len(set(F[g1]) & set(F[g2])): continue
                pairs.add((min(g1, g2), max(g1, g2)))
    return pairs


def cluster(points, cell=0.012):
    """union-find on a grid: points in the same or neighbouring 12 mm cells join."""
    if len(points) == 0: return np.zeros(0, int)
    key = np.floor(points / cell).astype(np.int64)
    side = np.sign(np.where(np.abs(points[:, 0]) < 0.005, 0, points[:, 0])).astype(np.int64)  # left/right/midline kept apart
    par = list(range(len(points))); cells = {}
    def find(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for i, (k, sd) in enumerate(zip(map(tuple, key), side)): cells.setdefault((int(sd),) + k, []).append(i)
    for k, idx in cells.items():
        for i in idx[1:]: par[find(i)] = find(idx[0])
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    o = cells.get((k[0], k[1] + dx, k[2] + dy, k[3] + dz))
                    if o: par[find(o[0])] = find(idx[0])
    r = np.array([find(i) for i in range(len(points))]); _, lab = np.unique(r, return_inverse=True); return lab


def joints_world():
    mw = rig.matrix_world
    return {k: np.array(mw @ rig.pose.bones[b].head) for k, b in JOINTS.items() if b in rig.pose.bones}


def describe(points_arm, doms, extra, mw_body_to_world):
    lab = cluster(points_arm); out = []
    J = joints_world(); Pw = to_space(rig.matrix_world, points_arm)
    for c in range(lab.max() + 1 if len(lab) else 0):
        m = lab == c; d = DOM_NAME[doms[m]]; names, counts = np.unique(d, return_counts=True)
        top = names[np.argsort(-counts)][:3]; cw = Pw[m].mean(0)
        jn = min(J, key=lambda k: np.linalg.norm(J[k] - cw))
        sd = float(points_arm[m][:, 0].mean())
        row = dict(n=int(m.sum()), side='left' if sd > 0.005 else 'right' if sd < -0.005 else 'midline', region=bone_label(top[0]), bones=[str(t) for t in top], nearest_joint=jn,
                   nearest_joint_mm=round(float(np.linalg.norm(J[jn] - cw)) * 1000, 1),
                   center_world_m=[round(float(x), 4) for x in cw],
                   extent_mm=[round(float(x) * 1000, 1) for x in (Pw[m].max(0) - Pw[m].min(0))])
        for k, v in extra.items(): row[k] = v(m)
        out.append(row)
    return sorted(out, key=lambda r: -r['n'])


# ---------------------------------------------------------------------------------------------------- rest
set_pose(None, 1)
RIG_REST_INV = np.array(rig.matrix_world.inverted())
V0w = to_space(body.matrix_world, eval_local(body)); V0 = to_space(RIG_REST_INV, V0w)  # armature space
A0, N0 = tri_geom(V0)
t0 = time.time(); REST_X = intersections(V0) if 'flags' not in SKIP else set()
print('REST intersections', len(REST_X), round(time.time() - t0, 1), flush=True)

# --------------------------------------------------------------------------------------------- scene setup
lookdev.setup_scene('CYCLES')
ground = bpy.data.objects['lookdev_ground']; LIGHTS = [o for o in sc.objects if o.type == 'LIGHT']
bgs = sc.world.node_tree.nodes['Background'].inputs['Strength']; BG0 = bgs.default_value
for o in SCULPT: lookdev.apply_clay(o)
ld = bpy.data.lights.new('aud_graze', 'SUN'); ld.energy = 2.6; ld.angle = math.radians(1.0); ld.use_shadow = False  # relief only, no cast shadows from other parts
SUN = bpy.data.objects.new('aud_graze', ld); sc.collection.objects.link(SUN); SUN.hide_render = True
sc.view_settings.view_transform = 'Standard'
for o in SCULPT:
    for nm in ('aud_curv', 'aud_flag'):
        if nm in o.data.color_attributes: o.data.color_attributes.remove(o.data.color_attributes[nm])
    if o is not body:
        for nm in ('aud_curv', 'aud_flag'):
            ca = o.data.color_attributes.new(nm, 'FLOAT_COLOR', 'POINT')
            ca.data.foreach_set('color', np.tile([0.22, 0.22, 0.22, 1.0], len(o.data.vertices)).astype(np.float32))
CURV = me.color_attributes.new('aud_curv', 'FLOAT_COLOR', 'POINT')
FLAG = me.color_attributes.new('aud_flag', 'FLOAT_COLOR', 'CORNER')


def use_attr(nm):
    for o in SCULPT:
        ca = o.data.color_attributes
        ca.active_color = ca[nm]
        try: ca.render_color_index = ca.find(nm)
        except Exception: pass


def workbench(light):
    sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
    sh.light = light; sh.show_cavity = False; sh.show_shadows = False
    try: sh.color_type = 'VERTEX'
    except TypeError: sh.color_type = 'ATTRIBUTE'
    if light == 'STUDIO':
        try: sh.studio_light = 'Default'
        except Exception: pass


def cycles():
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True


def posed_bounds():
    P = np.vstack([to_space(o.matrix_world, eval_local(o)) for o in SCULPT]); return P.min(0), P.max(0)


def fit(name, lo, hi, az, el, size=SIZE):
    cam = lookdev.place_camera('aud_' + name, (Vector(lo.tolist()), Vector(hi.tolist())), az, el, MARGIN)
    if el <= -89:   # underside: look straight up, head toward the bottom of the frame
        cam.rotation_euler = (math.pi, 0.0, math.pi); bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted(); xs, ys = [], []
    for i in range(8):
        p = inv @ Vector((hi[0] if i & 1 else lo[0], hi[1] if i & 2 else lo[1], hi[2] if i & 4 else lo[2])); xs.append(p.x); ys.append(p.y)
    w, h = max(xs) - min(xs), max(ys) - min(ys); m = MARGIN * max(w, h); fw, fh = w + 2 * m, h + 2 * m; s = max(fw, fh)
    cam.data.ortho_scale = s; cam.data.sensor_fit = 'AUTO'
    cam.data.shift_x = ((max(xs) + min(xs)) / 2) / s; cam.data.shift_y = ((max(ys) + min(ys)) / 2) / s
    sc.render.resolution_x = max(64, round(size * fw / s)); sc.render.resolution_y = max(64, round(size * fh / s))
    sc.render.resolution_percentage = 100; sc.camera = cam
    return cam, s


def crop_cam(centre, half, az, el, size=SIZE):
    cam = lookdev.place_camera('aud_crop', (centre - Vector((half,) * 3), centre + Vector((half,) * 3)), az, el, 0.0)
    if el <= -89: cam.rotation_euler = (math.pi, 0.0, math.pi)
    cam.data.ortho_scale = 2 * half; cam.data.shift_x = cam.data.shift_y = 0.0
    cam.location = centre + lookdev.camera_direction(az, el) * 10.0; bpy.context.view_layer.update()
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.resolution_percentage = 100; sc.camera = cam
    return cam


def graze_dir(cam):
    R = cam.matrix_world.to_3x3(); right, up, toward = R.col[0], R.col[1], R.col[2]
    L = ((up * 0.85 - right * 0.5).normalized() * math.cos(math.radians(18)) + toward * math.sin(math.radians(18))).normalized()
    SUN.rotation_euler = (-L).to_track_quat('-Z', 'Y').to_euler()


def shoot(path, kind, cam, show_ground):
    ground.hide_render = not show_ground or kind == 'C'
    if kind == 'A':
        cycles(); [setattr(l, 'hide_render', False) for l in LIGHTS]; SUN.hide_render = True; bgs.default_value = BG0
    elif kind == 'B':
        cycles(); [setattr(l, 'hide_render', True) for l in LIGHTS]; graze_dir(cam); SUN.hide_render = False; bgs.default_value = 0.08
    elif kind == 'C':
        workbench('FLAT'); use_attr('aud_curv')
    elif kind == 'O':
        workbench('STUDIO'); use_attr('aud_flag'); ground.hide_render = True
    sc.render.filepath = str(path); path.parent.mkdir(parents=True, exist_ok=True)
    t = time.time(); bpy.ops.render.render(write_still=True); return time.time() - t


def crops_for():
    pb = rig.pose.bones; mw = rig.matrix_world; H = lambda b: mw @ pb[b].head
    def mid(a, b): return (H(a) + H(b)) / 2
    Vw = to_space(body.matrix_world, eval_local(body))
    def belly():
        c = H('spine_03'); sel = (np.abs(Vw[:, 0] - c.x) < 0.03) & (np.abs(Vw[:, 1] - c.y) < 0.03)
        p = Vw[sel][Vw[sel][:, 2].argmin()] if sel.any() else np.array(c); return Vector(p.tolist()) + Vector((0, 0, 0.05))
    out = []
    for s, c, sg in (('left', 'l', 1), ('right', 'r', -1)):
        out += [(f'shoulders_armpits_{s}', H(f'leg_f{c}_01') + Vector((0, 0, -0.05)), 0.12, 35 * sg, -22),
                (f'elbows_{s}', H(f'leg_f{c}_02'), 0.085, 100 * sg, -5),
                (f'stifles_{s}', H(f'leg_h{c}_02'), 0.085, 70 * sg, 0),
                (f'hocks_{s}', H(f'leg_h{c}_03'), 0.075, 110 * sg, 0),
                (f'wrists_{s}', H(f'leg_f{c}_03'), 0.065, 70 * sg, 5)]
    out += [('chest_floor', mid('leg_fl_02', 'leg_fr_02') + Vector((0, 0.02, 0.0)), 0.13, 0, -90),
            ('belly', belly(), 0.17, 90, -45),
            ('groin_inner_thighs', mid('leg_hl_01', 'leg_hr_01') + Vector((0, 0, -0.07)), 0.14, 180, -55),
            ('neck_throat', mid('neck_01', 'head_01') + Vector((0, 0, -0.04)), 0.14, 55, -20),
            ('tail_base_rump', H('tail_01'), 0.13, 135, 15)]
    return out


# ------------------------------------------------------------------------------------------------- poses
report = {}; times = {}
for pname, act, frame in POSES:
    tp = time.time(); set_pose(act, frame)
    rig_inv = np.array(rig.matrix_world.inverted())
    Vw = to_space(body.matrix_world, eval_local(body)); V1 = to_space(rig_inv, Vw)
    A1, N1 = tri_geom(V1); S = skin_mats()
    rec = dict(action=act, frame=frame, correctives={k.name: round(k.value, 3) for k in me.shape_keys.key_blocks[1:]} if me.shape_keys else {})
    if 'flags' not in SKIP:
        ratio = A1 / np.maximum(A0, 1e-14); valid = A0 > 1e-10
        Nr = np.einsum('tij,tj->ti', S[TDOM][:, :3, :3], N0); Nr /= np.maximum(np.linalg.norm(Nr, axis=1), 1e-30)[:, None]
        collapse = valid & (ratio < 0.30); flip = valid & ((Nr * N1).sum(1) < 0)
        pred = np.einsum('vij,vj->vi', S[DOM][:, :3, :3], V0) + S[DOM][:, :3, 3]
        dact = np.linalg.norm(V1 - V0, axis=1); dpred = np.linalg.norm(pred - V0, axis=1)
        over = (dact > 1.5 * dpred) & (dact - dpred > 0.003)
        X = intersections(V1); newX = X - REST_X
        xt = np.array(sorted({t for p in newX for t in p}), dtype=np.int64)
        TC = V1[F].mean(1)
        ca = np.nonzero(collapse | flip)[0]
        rec['collapse_or_flip'] = dict(collapse=int(collapse.sum()), flip=int(flip.sum()), triangles=int(len(ca)),
            clusters=describe(TC[ca], TDOM[ca], dict(collapse=lambda m: int(collapse[ca][m].sum()), flip=lambda m: int(flip[ca][m].sum()),
                                                      min_area_ratio=lambda m: round(float(ratio[ca][m].min()), 3)), None))
        bp = {}
        for p, q in newX: bp.setdefault(tuple(sorted((DOM_NAME[TDOM[p]], DOM_NAME[TDOM[q]]))), set()).update((p, q))
        rec['intersect'] = dict(new_pairs=len(newX), rest_pairs=len(REST_X), still_at_rest=len(X & REST_X), triangles=int(len(xt)),
            bone_pairs=sorted([dict(bones=list(k), triangles=len(v)) for k, v in bp.items()], key=lambda r: -r['triangles']),
            clusters=describe(TC[xt], TDOM[xt], dict(bone_pairs=lambda m: sorted({'|'.join(k) for k, v in bp.items() if v & set(xt[m].tolist())})), None))
        ov = np.nonzero(over)[0]
        rec['overmove'] = dict(vertices=int(len(ov)),
            clusters=describe(V1[ov], DOM[ov], dict(max_excess_mm=lambda m: round(float((dact - dpred)[ov][m].max()) * 1000, 1),
                                                    max_ratio=lambda m: round(float((dact / np.maximum(dpred, 1e-9))[ov][m].max()), 2)), None))
        # overlay colours (corner domain): gray, overmove magenta, collapse/flip amber, intersect blue (later wins)
        col = np.tile([0.45, 0.45, 0.45, 1.0], (len(me.loops), 1))
        vflag = np.zeros(NV, bool); vflag[ov] = True; col[vflag[LOOP_VERT]] = [0.95, 0.10, 0.85, 1.0]
        pf = np.zeros(len(me.polygons), bool); pf[TP[ca]] = True; col[pf[LOOP_POLY]] = [1.0, 0.62, 0.0, 1.0]
        px = np.zeros(len(me.polygons), bool); px[TP[xt]] = True; col[px[LOOP_POLY]] = [0.05, 0.45, 1.0, 1.0]
        FLAG.data.foreach_set('color', col.astype(np.float32).ravel())
        flagged_t = np.unique(np.concatenate([ca, xt, np.nonzero(np.isin(F, ov).any(1))[0]]))
    else:
        flagged_t = np.zeros(0, int)
    # curvature colours
    Hc = NL.smooth_field(NL.curvature(V1, NL.vertex_normals(V1, F), E), E, 2); t = np.clip(Hc / 0.08, -1, 1)
    neutral = np.array([0.22, 0.22, 0.22]); amber = np.array([0.95, 0.70, 0.30]); blue = np.array([0.004, 0.008, 0.05])
    cc = np.where(t[:, None] > 0, neutral + (amber - neutral) * t[:, None], neutral + (blue - neutral) * (-t[:, None]))
    CURV.data.foreach_set('color', np.c_[cc, np.ones(NV)].astype(np.float32).ravel())
    me.update()
    lo, hi = posed_bounds(); pt = {}; scores = {}
    Nw = to_space(np.array(rig.matrix_world.to_3x3().to_4x4()), N1)
    for cname, (az, el, gshow) in CAMS.items():
        cam, s = fit(cname, lo, hi, az, el)
        d = np.array(cam.matrix_world.to_3x3().col[2])
        scores[cname] = int(((Nw[flagged_t] @ d) > 0.3).sum()) if len(flagged_t) else 0
        for kind in 'ABC':
            if kind in SKIP: continue
            pt[f'{cname}_{kind}'] = round(shoot(OUT / 'poses' / pname / f'{cname}_{kind}.png', kind, cam, gshow), 2)
        if 'overlay' not in SKIP and 'flags' not in SKIP:
            pt[f'{cname}_O'] = round(shoot(OUT / 'flags' / pname / f'overlay_{cname}.png', 'O', cam, False), 2)
        print('CAM', pname, cname, pt.get(f'{cname}_A'), pt.get(f'{cname}_B'), flush=True)
    rec['overlay_scores'] = scores; best = max(scores, key=scores.get) if scores else None; rec['overlay_best_camera'] = best
    if best and 'overlay' not in SKIP and 'flags' not in SKIP:
        import shutil; shutil.copy(OUT / 'flags' / pname / f'overlay_{best}.png', OUT / 'flags' / f'{pname}_overlay_best.png')
    if pname in CROP_POSES and 'crops' not in SKIP:
        rec['crops'] = {}
        for label, centre, half, az, el in crops_for():
            cam = crop_cam(centre, half, az, el)
            for kind in 'ABC':
                if kind in SKIP: continue
                pt[f'crop_{label}_{kind}'] = round(shoot(OUT / 'crops' / pname / f'{label}_{kind}.png', kind, cam, el >= 0), 2)
            rec['crops'][label] = dict(center_world_m=[round(x, 4) for x in centre], window_m=round(2 * half, 3), azimuth=az, elevation=el)
            print('CROP', pname, label, flush=True)
    rec['render_s'] = pt; rec['pose_s'] = round(time.time() - tp, 1)
    report[pname] = rec
    (OUT / 'work').mkdir(parents=True, exist_ok=True)
    (OUT / 'work' / f'flags_{SET}.json').write_text(json.dumps(report, indent=1, default=lambda x: x.item() if isinstance(x, np.generic) else str(x)))
    print('POSE', pname, rec['pose_s'], flush=True)
print('AUDIT done', flush=True)

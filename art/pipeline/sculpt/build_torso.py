"""Stage 5 part 2 for Luceras: refine the torso on the approved base (head part 1 integrated) (run inside Blender 5.2).

    blender -b --factory-startup --python-exit-code 1 <base.blend> --python build_torso.py -- --out <dir> --tag <t>
        --recon <raw_recon.glb> --align <recon_align.npz> [--stage N] [--final]

The torso is edited in place: only vertex positions move, so topology, vertex groups and the armature binding of the
base body stay exactly as they were, the head, horns, eyes and whiskers are untouched objects, and displacement is
measured per vertex against the base. Steps (each gated by --stage):
  1. region mask: spine and neck-base bone weights, diffused over the surface, cut to zero on the head side of the
     neck seam plane (part 1's plane 1), on the tail and below the shoulder and hip joints, with declared blend bands;
  2. soft form from the raw reconstruction: the normal offset from each trunk vertex to the aligned raw
     reconstruction, low-passed over the surface (its soft form without its scan noise), applied inside the mask;
  3. denoise: Taubin smoothing inside the mask (removes the reconstruction's lumpy surface noise, keeps volume);
  4. shaved landmarks against the clay views: sternum keel, scapula plates and their caudal borders, last rib and the
     flank hollow behind it, belly tuck toward the loin, hip points, spine groove;
  5. a light final Taubin pass over the brushed area.
Writes renders for the tag (Cycles, lookdev lights and clay); with --final also the blend, glbs and measurements.
"""

import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent / "roster")]

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import lookdev  # noqa: E402
import sculptkit as sk  # noqa: E402
import torsocam  # noqa: E402
import graft_recon as gr  # noqa: E402

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


OUT = Path(arg("--out"))
TAG = arg("--tag", "iter")
FINAL = "--final" in ARGS
STAGE = int(arg("--stage", "5"))
RECON = arg("--recon")
ALIGN = arg("--align")
SIZE = int(arg("--size", "640"))
OUT.mkdir(parents=True, exist_ok=True)
LOG = {}


def lap(k):
    LOG[k] = round(time.time() - T0, 1)
    print(f"[{LOG[k]:7.1f}s] {k}", flush=True)


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ------------------------------------------------------------------ seams (meters, -Y forward, +X left)

NECK_A = np.array([0.0, -0.109, 0.437])            # neck_02 head (part 1)
NECK_B = np.array([0.0, -0.175, 0.537])
N1 = (NECK_B - NECK_A) / np.linalg.norm(NECK_B - NECK_A)
P1 = NECK_A + 0.25 * (NECK_B - NECK_A)              # part 1 seam plane (plane 1): head side is s1 >= 0
HEAD_MARGIN, HEAD_BLEND = 0.005, 0.025              # torso edits fade to zero 5 mm short of plane 1
TAIL_ROOT = np.array([0.0, 0.307, 0.502])           # tail_01 head
NT = np.array([0.0, 0.071, -0.085]); NT /= np.linalg.norm(NT)
FORE_FREEZE_Z, FORE_FREE_Z = 0.305, 0.345           # forelegs: frozen below, free above (shoulder joint z 0.388)
HIND_FREEZE_Z, HIND_FREE_Z = 0.430, 0.480           # hind legs: frozen below, free above (hip joint z 0.450)

# ------------------------------------------------------------------ landmark spec (tuned against the clay views)

SPINE_GROOVE = dict(depth=0.0036, width=0.0110, y=(-0.05, 0.02, 0.20, 0.27))
STERNUM = dict(height=0.0060, width=0.0090, z=(0.415, 0.385, 0.33, 0.295))
SCAPULA = dict(plate=0.0060, plate_w=0.024, border=0.0060, border_w=0.0090,
               line=((-0.050, 0.458), (-0.090, 0.425), (-0.122, 0.392)),       # (y, z): dorsal border to shoulder point
               caudal=((-0.020, 0.455), (-0.032, 0.400), (-0.042, 0.350), (-0.046, 0.310)),
               mass=((-0.078, 0.392), (0.030, 0.042, 0.055), 0.0040))     # shoulder block in front of the border
LAST_RIB = dict(height=0.0016, width=0.0090, line=((0.040, 0.468), (0.062, 0.410), (0.080, 0.360), (0.086, 0.335)))
FLANK_HOLLOW = dict(center=(0.100, 0.410), radii=(0.045, 0.032, 0.060), amount=-0.0060)
HIP_POINT = dict(center=(0.132, 0.530), radii=(0.024, 0.024, 0.022), amount=0.0028)
EPAXIAL = dict(depth=0.0035, width=0.0080, line=((-0.030, 0.448), (0.030, 0.462), (0.085, 0.488), (0.112, 0.505)))
BELLY_TUCK = dict(y=(0.000, 0.100), lift=0.003, z_top=0.36, soften=15)


def signed(P, p, n):
    return (np.asarray(P) - p) @ n


def weights_matrix(obj):
    names = [g.name for g in obj.vertex_groups]
    W = np.zeros((len(obj.data.vertices), len(names)))
    for v in obj.data.vertices:
        for g in v.groups:
            W[v.index, g.group] = g.weight
    return names, W


def region_mask(body, P, names, W):
    def wsum(pred):
        idx = [i for i, n in enumerate(names) if pred(n)]
        return W[:, idx].sum(1) if idx else np.zeros(len(P))
    core = wsum(lambda n: n.startswith("spine_") or n == "neck_01")
    tail = wsum(lambda n: n.startswith("tail_"))
    head = wsum(lambda n: n in ("neck_02", "head_01", "jaw_01") or n.startswith("ear_"))
    lower = wsum(lambda n: n.startswith("leg_") and not n.endswith("_01"))       # forearm, shank and feet
    fore1 = wsum(lambda n: n.startswith("leg_f") and n.endswith("_01"))          # upper arm
    hind1 = wsum(lambda n: n.startswith("leg_h") and n.endswith("_01"))          # thigh
    below_f = smoothstep((FORE_FREE_Z - P[:, 2]) / (FORE_FREE_Z - FORE_FREEZE_Z))
    below_h = smoothstep((HIND_FREE_Z - P[:, 2]) / (HIND_FREE_Z - HIND_FREEZE_Z))
    # everything not the trunk: head and neck, tail, the limbs below their joints; the upper arm root and the
    # top of the thigh where they meet the trunk stay in (the brief's shoulder masses, pelvis and rump top)
    other = head + tail + lower + fore1 * below_f + hind1 * below_h
    other = sk.smooth_scalar(body, np.clip(other, 0, 1), 25)
    s1 = signed(P, P1, N1)
    fh = smoothstep((-s1 - HEAD_MARGIN) / HEAD_BLEND)
    m = (1 - smoothstep(other * 1.4)) * fh
    m[s1 >= 0] = 0.0
    m[m < 1e-3] = 0.0
    return m, dict(core=core, tail=tail, s1=s1)


def surface_point(tree, origin, direction):
    hit = tree.ray_cast(Vector(origin), Vector(direction))
    return None if hit[0] is None else np.array(hit[0][:])


def side_pt(tree, y, z, sx):
    p = surface_point(tree, (sx * 0.5, y, z), (-sx, 0, 0))
    if p is None:  # the ray passes under or over the body: take the nearest surface point to a probe beside the trunk
        print(f"side_pt fallback at y {y} z {z}", flush=True)
        p = np.array(tree.find_nearest(Vector((sx * 0.08, y, z)))[0][:])
    return p


def bulge_masked(obj, center, radii, amount, mask):
    P, N = sk.co(obj), sk.normals(obj)
    q = (P - np.asarray(center)) / np.asarray(radii)
    r2 = (q * q).sum(1)
    w = np.where(r2 < 1, (1 - r2) ** 2, 0.0) * mask
    sk.set_co(obj, P + N * (amount * w)[:, None])


def apply_landmarks(body, mask):
    tree = sk.bvh(body)
    rep = {}
    # spine groove: dorsal midline, fading in from the withers and out over the sacrum
    gy = SPINE_GROOVE["y"]
    ys = np.linspace(gy[0], gy[3], 28)
    pts = [surface_point(tree, (0, y, 1.0), (0, 0, -1)) for y in ys]
    tap = np.interp(ys, gy, [0, 1, 1, 0])
    sk.ridge(body, pts, -SPINE_GROOVE["depth"], SPINE_GROOVE["width"], mask, power=2.0, taper=tap)
    rep["spineGroove"] = [p.round(4).tolist() for p in pts[::9]]
    # sternum keel: a ridge down the chest front at the midline
    sz = STERNUM["z"]
    zs = np.linspace(sz[0], sz[3], 16)
    pts = [surface_point(tree, (0, -1.0, z), (0, 1, 0)) for z in zs]
    tap = np.interp(-zs, [-z for z in sz], [0, 1, 1, 0.3])
    sk.ridge(body, pts, STERNUM["height"], STERNUM["width"], mask, power=2.5, taper=tap)
    rep["sternum"] = [p.round(4).tolist() for p in pts[::5]]
    for sx in (1, -1):
        # scapula plate: a flat-topped raise along the scapular spine line, then a groove at its caudal border
        line = [side_pt(tree, y, z, sx) for y, z in SCAPULA["line"]]
        sk.ridge(body, line, SCAPULA["plate"], SCAPULA["plate_w"], mask, power=4.0, taper=[0.6, 1.0, 0.5])
        (my, mz), mr, ma = SCAPULA["mass"]
        bulge_masked(body, side_pt(tree, my, mz, sx), mr, ma, mask)
        cau = [side_pt(tree, y, z, sx) for y, z in SCAPULA["caudal"]]
        sk.ridge(body, cau, -SCAPULA["border"], SCAPULA["border_w"], mask, power=2.0, taper=[0.4, 1.0, 0.8, 0.3])
        # last rib: a faint ridge, with the flank hollow behind it
        rib = [side_pt(tree, y, z, sx) for y, z in LAST_RIB["line"]]
        sk.ridge(body, rib, LAST_RIB["height"], LAST_RIB["width"], mask, power=2.0, taper=[0.3, 1.0, 1.0, 0.4])
        # epaxial line: the lower border of the long back muscles, from behind the scapula back to the hip point
        ep = [side_pt(tree, y, z, sx) for y, z in EPAXIAL["line"]]
        sk.ridge(body, ep, -EPAXIAL["depth"], EPAXIAL["width"], mask, power=2.0, taper=[0.0, 0.7, 0.9, 0.0])
        fy, fz = FLANK_HOLLOW["center"]
        c = side_pt(tree, fy, fz, sx)
        bulge_masked(body, c, FLANK_HOLLOW["radii"], FLANK_HOLLOW["amount"], mask)
        hy, hz = HIP_POINT["center"]
        c2 = side_pt(tree, hy, hz, sx)
        bulge_masked(body, c2, HIP_POINT["radii"], HIP_POINT["amount"], mask)
        if sx == 1:
            rep["scapulaLine"] = [p.round(4).tolist() for p in line]
            rep["lastRib"] = [p.round(4).tolist() for p in rib]
            rep["flankHollow"] = c.round(4).tolist()
            rep["hipPoint"] = c2.round(4).tolist()
            rep["epaxial"] = [p.round(4).tolist() for p in ep]
    # belly: soften the hard ventral crease the blockout left along the underside (ribcage to stifle)
    P = sk.co(body)
    wb = smoothstep((P[:, 1] + 0.03) / 0.03) * smoothstep((0.115 - P[:, 1]) / 0.02) * smoothstep((0.375 - P[:, 2]) / 0.03)
    sk.taubin(body, BELLY_TUCK["soften"], wb * mask)
    # belly tuck: lift the underside toward the loin (ventral verts only), ramping in behind the chest
    if BELLY_TUCK["lift"]:
        P = sk.co(body)
        y0, y1 = BELLY_TUCK["y"]
        ramp = smoothstep((P[:, 1] - y0) / (y1 - y0)) * smoothstep((0.125 - P[:, 1]) / 0.02)
        under = smoothstep((BELLY_TUCK["z_top"] - P[:, 2]) / 0.04)
        dz = BELLY_TUCK["lift"] * ramp * under * mask
        P[:, 2] += dz
        sk.set_co(body, P)
        rep["bellyLiftMaxM"] = float(dz.max())
    return rep


def recon_soft_form(body, mask):
    rec = gr.import_glb(RECON, "raw_recon")
    a = np.load(ALIGN)
    R0 = sk.co(rec)
    sk.set_co(rec, a["s"] * R0 @ a["R"].T + a["t"])
    tree = sk.bvh(rec)
    P, N = sk.co(body), sk.normals(body)
    idx = np.nonzero(mask > 0)[0]
    d = np.zeros(len(P))
    d[idx] = sk.normal_offset_to(tree, P[idx], N[idx], 0.012)
    raw = d.copy()
    d_lp = sk.smooth_scalar(body, d, 60, 0.5)
    sk.set_co(body, P + N * (d_lp * mask)[:, None])
    bpy.data.objects.remove(rec, do_unlink=True)
    sel = mask > 0.5
    return dict(rawOffsetMedianM=float(np.median(np.abs(raw[sel]))), rawOffsetP95M=float(np.quantile(np.abs(raw[sel]), 0.95)),
                appliedMaxM=float(np.abs(d_lp * mask).max()), appliedMeanM=float(np.abs(d_lp * mask)[sel].mean()))


# ------------------------------------------------------------------ build

def main():
    body = bpy.data.objects["luceras_blockout"]
    rig = bpy.data.objects["luceras_rig"]
    old_pose = rig.data.pose_position
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    if "luceras_head_part" in bpy.data.objects:   # part 1's review copy of the head; not part of the creature
        bpy.data.objects.remove(bpy.data.objects["luceras_head_part"], do_unlink=True)
    P0 = sk.co(body).copy()
    names, W = weights_matrix(body)
    mask, parts = region_mask(body, P0, names, W)
    if not FINAL:
        np.save(OUT / f"mask_{TAG}.npy", mask)
    LOG["maskVerts"] = dict(any=int((mask > 0).sum()), full=int((mask > 0.99).sum()))
    lap(f"mask {LOG['maskVerts']}")

    if STAGE >= 2 and RECON:
        LOG["reconSoftForm"] = recon_soft_form(body, mask)
        lap(f"recon soft form {LOG['reconSoftForm']}")
    if STAGE >= 3:
        sk.taubin(body, int(arg("--denoise", "12")), mask)
        lap("denoise")
    if STAGE >= 4:
        LOG["landmarkPoints"] = apply_landmarks(body, mask)
        lap("landmarks")
    if STAGE >= 5:
        sk.taubin(body, 3, mask)
        lap("final smooth")
    body.data.update()

    rigid = [o for o in bpy.data.objects if o.type == "MESH" and o.parent == rig and o != body]
    lookdev.setup_scene("CYCLES")
    for o in [body] + rigid:
        lookdev.apply_clay(o)
    rdir = OUT / "renders"
    rdir.mkdir(exist_ok=True)
    cams = torsocam.frame_torso()
    torsocam.render_set(cams, str(rdir), prefix=f"{TAG}_", size=1024 if FINAL else SIZE)
    full = lookdev.frame_cameras([body] + rigid)
    lookdev.render(full["side_left"], str(rdir / f"{TAG}_full_side_left.png"), size=1024 if FINAL else SIZE)
    lap("renders")

    meas = measure(body, rigid, P0, mask, parts)
    (OUT / f"measurements_{TAG}.json").write_text(json.dumps(meas, indent=1))
    if not FINAL:
        np.save(OUT / f"co_{TAG}.npy", sk.co(body))
    lap("measured")

    if FINAL:
        for name, cam in full.items():
            lookdev.render(cam, str(rdir / f"full_{name}.png"), size=1024)
        lookdev.render(full["side_left"], str(rdir / "sprite_side_192.png"), size=192)
        lap("full renders")
        rig.data.pose_position = old_pose
        # torso part: the region's faces (mask at or over half), world space, unbound
        tp = bpy.data.objects.new("luceras_torso_part", body.data.copy())
        bpy.context.scene.collection.objects.link(tp)
        tp.vertex_groups.clear()
        bm = bmesh.new()
        bm.from_mesh(tp.data)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if mask[v.index] < 0.5], context="VERTS")
        bm.to_mesh(tp.data)
        bm.free()
        export_glb(OUT / "torso_part.glb", [tp], skin=False)
        LOG["torsoPartTris"] = sk.tri_count(tp)
        bpy.data.objects.remove(tp, do_unlink=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "torso.blend"), compress=True)
        export_glb(OUT / "torso.glb", [body, rig] + rigid, skin=True)
        lap("saved")
    LOG["total"] = round(time.time() - T0, 1)
    (OUT / f"blender_log_{TAG}.json").write_text(json.dumps(LOG, indent=1))


def export_glb(path, objs, skin):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                              export_skins=skin, export_animations=False, export_apply=False)


# ------------------------------------------------------------------ measurements

def trunk_metrics(P, core):
    """Proportion metrics on the trunk (verts the base weights to the spine and neck base, so the base and the new
    mesh are measured on the same vertex set)."""
    T = P[core > 0.5]
    m = {}

    def sl(y0, y1, extra=None):
        s = T[(T[:, 1] >= y0) & (T[:, 1] <= y1)]
        return s if extra is None else s[extra(s)]

    front = T[(np.abs(T[:, 0]) < 0.01) & (T[:, 2] > 0.30) & (T[:, 2] < 0.43)]
    chest_front = front[np.argmin(front[:, 1])]
    rear = T[(T[:, 2] > 0.40) & (np.abs(T[:, 0]) < 0.03)]
    rump_back = rear[np.argmax(rear[:, 1])]
    m["torsoLengthM"] = round(float(rump_back[1] - chest_front[1]), 4)
    m["torsoLengthPoints"] = dict(chestFront=chest_front.round(4).tolist(), rumpBack=rump_back.round(4).tolist())
    # neck base to tail root: dorsal midline point on part 1's seam plane to the dorsal point over the tail_01 head
    mid = P[(np.abs(P[:, 0]) < 0.004)]
    nb = mid[np.abs(signed(mid, P1, N1)) < 0.002]
    nb = nb[np.argmax(nb[:, 2])]
    tr = mid[np.abs(mid[:, 1] - TAIL_ROOT[1]) < 0.0025]
    tr = tr[np.argmax(tr[:, 2])]
    m["neckBaseToTailRootM"] = round(float(np.linalg.norm(tr - nb)), 4)
    m["neckBaseToTailRootPoints"] = dict(neckBase=nb.round(4).tolist(), tailRoot=tr.round(4).tolist())
    depths = []
    for y in np.arange(-0.08, 0.03, 0.005):
        s = sl(y - 0.0025, y + 0.0025, lambda s: np.abs(s[:, 0]) < 0.015)
        if len(s) > 4:
            depths.append((float(s[:, 2].max() - s[:, 2].min()), y, float(s[:, 2].min())))
    d, y, zlow = max(depths)
    m["chestDepthM"] = round(d, 4)
    m["chestDepthAtY"] = round(float(y), 3)
    m["chestLowZ"] = round(zlow, 4)
    s = sl(-0.06, 0.02, lambda s: s[:, 2] > 0.30)
    m["chestWidthM"] = round(float(2 * np.abs(s[:, 0]).max()), 4)
    tuck = []
    for y in np.arange(0.03, 0.115, 0.005):
        s = sl(y - 0.0025, y + 0.0025, lambda s: np.abs(s[:, 0]) < 0.015)
        if len(s) > 4:
            tuck.append((float(s[:, 2].min()), y, float(s[:, 2].max())))
    zt, yt, ztop = max(tuck)
    m["bellyTuckHeightM"] = round(zt, 4)
    m["bellyTuckAtY"] = round(float(yt), 3)
    m["loinDepthM"] = round(ztop - zt, 4)
    s = sl(0.10, 0.20, lambda s: (s[:, 2] > 0.48) & (s[:, 2] < 0.56))
    m["hipWidthM"] = round(float(2 * np.abs(s[:, 0]).max()), 4)
    s = sl(0.05, 0.32)
    m["rumpTopZ"] = round(float(s[:, 2].max()), 4)
    s = sl(-0.14, -0.05, lambda s: (s[:, 2] > 0.36) & (s[:, 2] < 0.45))
    m["shoulderWidthM"] = round(float(2 * np.abs(s[:, 0]).max()), 4)
    return m


def measure(body, rigid, P0, mask, parts):
    P = sk.co(body)
    m = {"buildId": "B-ej6s"}
    new = trunk_metrics(P, (mask > 0.5).astype(float))
    base = trunk_metrics(P0, (mask > 0.5).astype(float))
    m["torso"] = new
    m["base"] = base
    m["ratioToBase"] = {k: round(new[k] / base[k], 4) for k in new
                      if isinstance(new[k], float) and base[k] and not k.endswith("AtY")}
    m["triangles"] = {"luceras_blockout (body)": sk.tri_count(body)}
    for o in rigid:
        m["triangles"][o.name] = sk.tri_count(o)
    m["triangles"]["creatureTotal"] = sum(m["triangles"].values())
    d = np.linalg.norm(P - P0, axis=1)
    s1 = parts["s1"]
    head = s1 >= 0
    out = (mask == 0) & ~head
    band = (mask > 0) & (mask < 0.5)
    m["displacementHeadNeck"] = {"region": "head side of part 1's seam plane (plane 1)", "verts": int(head.sum()),
                                 "maxM": float(d[head].max()), "meanM": float(d[head].mean())}
    m["displacementOutsideTorso"] = {"region": "mask zero: tail, forelegs below the shoulder, hind legs below the hip",
                                     "verts": int(out.sum()), "maxM": float(d[out].max()), "meanM": float(d[out].mean())}
    m["displacementSeamBand"] = {"region": "declared blend band (mask over 0, under 0.5) at the neck, shoulder, hip and tail seams",
                                 "verts": int(band.sum()), "maxM": float(d[band].max()) if band.any() else 0.0,
                                 "meanM": float(d[band].mean()) if band.any() else 0.0}
    inner = mask >= 0.5
    m["displacementTorso"] = {"verts": int(inner.sum()), "maxM": float(d[inner].max()), "meanM": float(d[inner].mean())}
    m["nonManifoldEdges"] = {"body": sk.nonmanifold_edges(body)}
    m["rigidObjectsUnchanged"] = [o.name for o in rigid]
    return m


main()

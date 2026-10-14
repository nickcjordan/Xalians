"""Stage 4 review images and measurement files from a finished blockout run (outside Blender).

    <shape-env python> art/pipeline/blockout/compose.py --run <blockout out dir> --masks <masks dir> \
        --clay side=<png> --clay front=<png> --clay threequarter=<png>

Writes into --run:
- compare_<view>.png: blockout render left, approved clay view right, both cropped to the figure and scaled to
  the same figure height, labeled;
- silhouette_<view>.png: the two silhouettes overlaid at the same height (blue: blockout only, amber: clay
  only, gray: both), plus intersection-over-union and bounding-box aspect in measurements.json;
- pose_sheet.png (rest, crouch, leap peak, landing; side and three-quarter cameras; volume change per pose);
- rest_sheet.png (the five standard cameras);
- landmarks_overlay.png (joint placements over the blockout's side and front silhouettes);
- landmark_report.md (where each joint went and why);
- measurements.json (proportions in meters, silhouette comparison, side-view depth ratios for both).
Silhouettes of the blockout are rasterized from the exported glb with the look-dev camera directions, so they
do not depend on lighting.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

VIEWS = {  # view name: (look-dev camera, azimuth, elevation, clay label)
    "side": ("side_left", 90.0, 0.0, "approved clay view: side"),
    "front": ("front", 0.0, 4.0, "approved clay view: front"),
    "threequarter": ("three_quarter_left", 45.0, 12.0, "approved clay view: three-quarter"),
}
BLUE = np.array([60, 120, 230])
AMBER = np.array([235, 160, 30])


def font(size):
    for name in ("arial.ttf", "DejaVuSans.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def load_glb_mesh(path):
    import trimesh
    m = trimesh.load(path, force="mesh")
    v = np.asarray(m.vertices)
    # glTF (+Y up, +Z forward) back to Blender (+Z up, -Y forward)
    b = np.c_[v[:, 0], -v[:, 2], v[:, 1]]
    return b, np.asarray(m.faces)


def project(v, az, el):
    """Orthographic image coords (u right, w up) for a camera at azimuth/elevation (lookdev convention)."""
    a, e = math.radians(az), math.radians(el)
    d = np.array([math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)])  # toward the camera
    fwd = -d
    up0 = np.array([0, 0, 1.0])
    right = np.cross(fwd, up0)
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    return np.c_[v @ right, v @ up]


def raster(uv, faces, px_per_m, pad=10):
    lo = uv.min(0)
    hi = uv.max(0)
    w = int((hi[0] - lo[0]) * px_per_m) + 2 * pad
    h = int((hi[1] - lo[1]) * px_per_m) + 2 * pad
    im = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(im)
    p = np.c_[(uv[:, 0] - lo[0]) * px_per_m + pad, h - ((uv[:, 1] - lo[1]) * px_per_m + pad)]
    for f in faces:
        d.polygon([tuple(p[i]) for i in f], fill=255)
    return np.asarray(im) > 0


def crop_mask(m):
    ys, xs = np.nonzero(m)
    return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def fit_height(m, h):
    m = crop_mask(m)
    w = max(1, round(m.shape[1] * h / m.shape[0]))
    return np.asarray(Image.fromarray(m.astype(np.uint8) * 255).resize((w, h), Image.BILINEAR)) > 127


def iou_aligned(a, b):
    """Both at the same height, aligned at the bottom and the horizontal bbox center."""
    h = 800
    a, b = fit_height(a, h), fit_height(b, h)
    w = max(a.shape[1], b.shape[1])
    A = np.zeros((h, w), bool)
    B = np.zeros((h, w), bool)
    A[:, (w - a.shape[1]) // 2:(w - a.shape[1]) // 2 + a.shape[1]] = a
    B[:, (w - b.shape[1]) // 2:(w - b.shape[1]) // 2 + b.shape[1]] = b
    return float((A & B).sum() / (A | B).sum()), A, B


def side_depths(m):
    """Side-view torso depths on a silhouette facing left: height to the top of the back (rump), chest depth
    and waist depth as fractions of that height. Rump top: highest silhouette point between 45 and 75 percent
    of the box width; torso run per column: the longest run whose bottom stays above a quarter of that height;
    chest: the deepest torso run between 22 and 40 percent; waist: the shallowest between 38 and 58 percent."""
    m = crop_mask(m)
    h, w = m.shape
    ground = h - 1
    top = np.array([np.argmax(m[:, x]) if m[:, x].any() else h for x in range(w)])
    c0, c1 = int(0.45 * w), int(0.75 * w)
    rump_row = int(top[c0:c1].min())
    H = ground - rump_row

    def torso_run(x):
        col = m[:, x]
        best = 0
        y = 0
        while y < h:
            if col[y]:
                y0 = y
                while y < h and col[y]:
                    y += 1
                if y - 1 < ground - 0.25 * H:
                    best = max(best, y - y0)
            else:
                y += 1
        return best
    runs = np.array([torso_run(x) for x in range(w)])
    ch = runs[int(0.22 * w):int(0.40 * w)]
    wa = runs[int(0.38 * w):int(0.58 * w)]
    wa = wa[wa > 0]
    return {"heightToRumpPx": int(H), "boxAspect": round(w / h, 4),
            "overallHeightOverRump": round(h / H, 4), "lengthOverRump": round(w / H, 4),
            "chestDepthOverRump": round(float(ch.max()) / H, 4),
            "waistDepthOverRump": round(float(wa.min()) / H, 4) if len(wa) else None,
            "waistOverChest": round(float(wa.min()) / float(ch.max()), 4) if len(wa) else None}


def label_band(img, text, size=30, band=56):
    out = Image.new("RGB", (img.width, img.height + band), (34, 34, 34))
    out.paste(img, (0, band))
    d = ImageDraw.Draw(out)
    d.text((16, (band - size) // 2), text, fill=(235, 235, 235), font=font(size))
    return out


def crop_to(img, box, margin=0.06):
    x0, y0, x1, y1 = box
    mx, my = (x1 - x0) * margin, (y1 - y0) * margin
    return img.crop((max(0, int(x0 - mx)), max(0, int(y0 - my)), min(img.width, int(x1 + mx)), min(img.height, int(y1 + my))))


def scale_h(img, h):
    return img.resize((max(1, round(img.width * h / img.height)), h), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", type=Path, required=True)
    ap.add_argument("--masks", type=Path, required=True)
    ap.add_argument("--clay", action="append", required=True, help="view=png")
    args = ap.parse_args()
    run = args.run
    rep = json.loads((run / "blender_report.json").read_text(encoding="utf-8"))
    lm = json.loads((run / "landmarks.json").read_text(encoding="utf-8"))
    spec = json.loads(next(run.glob("*.rig_spec.json")).read_text(encoding="utf-8"))
    clay = dict(c.split("=", 1) for c in args.clay)
    masks_rec = json.loads((args.masks / "masks.json").read_text(encoding="utf-8"))
    v, faces = load_glb_mesh(next(run.glob("*_blockout.glb")))
    out = {}

    # Comparisons and silhouettes.
    H = 900
    for view, (cam, az, el, clay_label) in VIEWS.items():
        r = rep["renders"][f"rest_{cam}"]
        render = Image.open(run / "renders" / Path(r["path"]).name).convert("RGB")
        left = scale_h(crop_to(render, r["bboxPx"]), H)
        cimg = Image.open(clay[view]).convert("RGB")
        bx = masks_rec["views"][view]["bbox"]
        right = scale_h(crop_to(cimg, (bx[0], bx[1], bx[2] + 1, bx[3] + 1)), H)
        lab_l = label_band(left, f"blockout, look-dev {cam.replace('_', ' ')} camera")
        lab_r = label_band(right, clay_label)
        gap = 24
        comp = Image.new("RGB", (lab_l.width + gap + lab_r.width, lab_l.height), (34, 34, 34))
        comp.paste(lab_l, (0, 0))
        comp.paste(lab_r, (lab_l.width + gap, 0))
        comp.save(run / f"compare_{view}.png")

        bm = raster(project(v, az, el), faces, 1400)
        cm = np.asarray(Image.open(args.masks / f"{view}.mask.png")) > 0
        iou, A, B = iou_aligned(bm, cm)
        ov = np.full(A.shape + (3,), 34, np.uint8)
        ov[A & B] = (150, 150, 150)
        ov[A & ~B] = BLUE
        ov[~A & B] = AMBER
        ovi = label_band(Image.fromarray(ov), "blue: blockout only   amber: clay only   gray: both", 26, 48)
        ovi.save(run / f"silhouette_{view}.png")
        bc = crop_mask(bm)
        cc = crop_mask(cm)
        out[view] = {"iou": round(iou, 4), "blockoutBoxAspect": round(bc.shape[1] / bc.shape[0], 4),
                     "clayBoxAspect": round(cc.shape[1] / cc.shape[0], 4)}
    sb = raster(project(v, 90.0, 0.0), faces, 1400)
    sc = np.asarray(Image.open(args.masks / "side.mask.png")) > 0
    out["sideDepths"] = {"blockout": side_depths(sb), "clay": side_depths(sc)}

    # Rest sheet.
    tiles = []
    for cam in ("front", "three_quarter_left", "side_left", "back", "top"):
        im = Image.open(run / "renders" / f"rest_{cam}.png").convert("RGB").resize((512, 512), Image.LANCZOS)
        tiles.append(label_band(im, cam.replace("_", " "), 24, 40))
    sheet = Image.new("RGB", (512 * 5, tiles[0].height), (34, 34, 34))
    for i, t in enumerate(tiles):
        sheet.paste(t, (512 * i, 0))
    sheet.save(run / "rest_sheet.png")

    # Pose sheet.
    names = {"rest": "Rest", "crouch": "Crouch", "leap": "Leap peak", "landing": "Landing"}
    cell = 600
    rows = []
    for cam in ("side_left", "three_quarter_left"):
        row = []
        for p in names:
            im = Image.open(run / "renders" / f"pose_{p}_{cam}.png").convert("RGB").resize((cell, cell), Image.LANCZOS)
            pf = rep["poses"][p]
            worst = pf["worstRegions"][0] if p != "rest" else None
            txt = f"{names[p]}: volume {pf['volumeChange'] * 100:+.1f}%"
            if worst:
                txt += f", worst joint {worst['joint']} {worst['change'] * 100:+.0f}%"
            row.append(label_band(im, txt, 22, 40))
        rows.append(row)
    ps = Image.new("RGB", (cell * 4, rows[0][0].height * 2), (34, 34, 34))
    for j, row in enumerate(rows):
        for i, t in enumerate(row):
            ps.paste(t, (cell * i, t.height * j))
    ps.save(run / "pose_sheet.png")

    # Landmark overlay (side and front silhouettes with the joints).
    def overlay(az, el, title):
        S = 900
        uv = project(v, az, el)
        lo, hi = uv.min(0), uv.max(0)
        sc_ = (S - 60) / max(hi - lo)
        img = Image.new("RGB", (S, S), (34, 34, 34))
        sil = raster(uv, faces, sc_, pad=0)
        silim = Image.fromarray(np.where(sil[..., None], np.array([95, 95, 95], np.uint8), np.array([34, 34, 34], np.uint8)))
        img.paste(silim, (30, S - 30 - silim.height))
        d = ImageDraw.Draw(img)

        def P(p):
            q = project(np.array([p]), az, el)[0]
            return (30 + (q[0] - lo[0]) * sc_, S - 30 - (q[1] - lo[1]) * sc_)
        import rig_modules
        for j in rig_modules.plan_skeleton(spec).joints:
            a, b = P(j.head), P(j.tail)
            side_l = "_l_" in j.name or j.name.startswith(("leg_fl", "leg_hl")) or j.name.endswith("_l")
            side_r = "_r_" in j.name or j.name.startswith(("leg_fr", "leg_hr")) or j.name.endswith("_r")
            col = (235, 160, 30) if side_l else (60, 140, 240) if side_r else (240, 240, 240)
            if j.socket:
                d.rectangle([a[0] - 4, a[1] - 4, a[0] + 4, a[1] + 4], outline=(240, 240, 240), width=2)
                continue
            d.line([a, b], fill=col, width=4 if j.deform else 2)
            d.ellipse([a[0] - 5, a[1] - 5, a[0] + 5, a[1] + 5], outline=col, width=2)
        return label_band(img, title, 24, 44)
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "blender"))
    o1 = overlay(90.0, 0.0, "joints, side (left side amber, right side blue, midline white)")
    o2 = overlay(0.0, 0.0, "joints, front; squares are sockets")
    lo_img = Image.new("RGB", (o1.width + o2.width, o1.height), (34, 34, 34))
    lo_img.paste(o1, (0, 0))
    lo_img.paste(o2, (o1.width, 0))
    lo_img.save(run / "landmarks_overlay.png")

    # Measurements and landmark report.
    meas = {"creature": spec.get("creature"), "units": "meters",
            "placement": rep["placement"], "proportions": rep["measurements"],
            "silhouetteComparison": out,
            "notes": ["Clay views are perspective images; the blockout silhouettes are orthographic projections "
                      "at the look-dev camera angles, aligned by height. The clay front view is turned about 15 to "
                      "20 degrees and its three-quarter view is shallower than the 45 degree standard camera, so "
                      "those two IoU numbers understate the match more than the side one does."]}
    (run / "measurements.json").write_text(json.dumps(meas, indent=1), encoding="utf-8")
    (run / "landmark_report.md").write_text(landmark_report(lm, spec, rep), encoding="utf-8", newline="\n")
    print(json.dumps(out, indent=1))


def landmark_report(lm, spec, rep):
    f = lm["facts"]
    P = lm["points"]
    R = lm["ratios"]
    H = f["backTopZ"]
    c = lambda p: "(" + ", ".join(f"{x:+.3f}" for x in p) + ")"  # noqa: E731
    fl, hl = P["fore"]["l"], P["hind"]["l"]
    L = [
        "# Luceras stage 4: where each joint went",
        "",
        "Meters, Blender space (+Z up, the creature faces -Y, its left is +X, origin at the ground point under the "
        "body center). Measured by landmarks.py on the remeshed blockout; the rig spec is "
        f"`{spec.get('creature')}.rig_spec.json`. Right limbs, ear and horn mirror the left; the measured right "
        "side is listed for comparison.",
        "",
        f"Placement: scale {rep['placement']['scaleFromReconstruction']:.4f} from the reconstruction; top of the back "
        f"{H:.3f} m at y {f['backTopY']:+.3f} (the rump); withers {f['withersZ']:.3f} m at y {f['withersY']:+.3f}; "
        f"forefeet at y {f['foreFeetY']:+.3f}, hind feet at y {f['hindFeetY']:+.3f}; origin midway between them.",
        "",
        "Leg joint heights are ratios of the top-of-back height read off the approved side clay view: "
        + ", ".join(f"{k} {v:.2f}" for k, v in R.items()) + ".",
        "",
        "| Joint | Head position | Rule |",
        "|---|---|---|",
        "| root | (0, 0, 0) | origin; ground socket |",
    ]
    sp = P["spine"]
    for i in range(5):
        L.append(f"| spine_{i + 1:02d} | {c(sp[i])} | on the back line 6 cm under its top surface; spine_01 at the "
                 f"tail root (y {f['tailRootY']:+.3f}, where the midline depth falls under a fifth of the back height) "
                 "minus 3 cm, spine_05 ending at the withers |" if i == 0 else
                 f"| spine_{i + 1:02d} | {c(sp[i])} | evenly spaced along the back line, 6 cm under it |")
    L += [
        f"| neck_01 | {c(P['neck'][0])} | the end of the spine at the withers |",
        f"| neck_02 | {c(P['neck'][1])} | midway to the occiput, 5.5 cm under the neck's top line |",
        f"| head_01 | {c(P['head'][0])} to {c(P['head'][1])} | from the occiput (y {f['skullBackY']:+.3f}: the midline top "
        f"has dropped 3 cm behind the crown at y {f['crownY']:+.3f}, z {f['crownZ']:.3f}), 7 cm under the top line, to the "
        "nose tip (the most forward vertex) |",
        f"| jaw_01 | {c(P['jaw'][0])} to {c(P['jaw'][1])} | under the occiput to the chin, between the head joint and the jaw line |",
        f"| leg_fl_01 (shoulder) | {c(fl['points'][0])} | {R['shoulder']:.2f} of the back height, inside the leg's slice at 40 "
        "percent from its front, half the slice's lateral extent |",
        f"| leg_fl_02 (elbow) | {c(fl['points'][1])} | {R['elbow']:.2f} of the back height, slice centroid in x, 65 percent "
        "toward the back of the leg's slice |",
        f"| leg_fl_03 (wrist) | {c(fl['points'][2])} to toe {c(fl['points'][3])} | {R['wrist']:.2f} of the back height, slice "
        "center; the bone ends at the front of the paw at 1 cm |",
        f"| leg_hl_01 (hip) | {c(hl['points'][0])} | {R['hip']:.2f} of the back height, under the top of the rump, 55 percent of "
        "the haunch's half width |",
        f"| leg_hl_02 (stifle) | {c(hl['points'][1])} | {R['stifle']:.2f} of the back height, 20 percent back from the front of "
        "the thigh's lateral slice (|x| over 6 cm, so the belly is excluded) |",
        f"| leg_hl_03 (hock) | {c(hl['points'][2])} to toe {c(hl['points'][3])} | {R['hock']:.2f} of the back height, 60 "
        "percent toward the back of the leg's slice; the bone runs down the metatarsus and along the long foot to "
        "the toe tip, so the whole foot is one rigid unit |",
    ]
    tp = P["tail"]
    for i in range(6):
        L.append(f"| tail_{i + 1:02d} | {c(tp[i])} | centroids of 1.5 cm slices of the thin midline tail, resampled "
                 f"to equal arc length (tail {f['tailLengthM']:.3f} m) |")
    for s in ("l",):
        e = P["ears"][s]
        L.append(f"| ear_{s}_01, ear_{s}_02 | {c(e[0])}, {c(e[1])}, tip {c(e[2])} | tip: the widest head vertex just "
                 "behind the crown and under its height; base 4.5 cm off the midline, 2 cm ahead and 1.5 cm below the tip |")
        h = P["horns"][s]
        L.append(f"| horn_{s}_01 (attachment, non-deforming) | {c(h['base'])} to arc top {c(h['top'])} | base beside the "
                 f"crown; the arc top is the horn's highest vertex; tip {c(h['tip'])} is the lowest horn vertex behind "
                 "the top, wider than 9 cm off the midline |")
    for k, p in P["sockets"].items():
        why = {"head": "between the occiput and the nose, 2 cm above the head joint",
               "eye_l": "70 percent from the nose to the crown, 55 percent up the head, at the head's surface",
               "eye_r": "mirror of eye_l", "emitter": "midway between the two horn arc tops (the strike point "
               "of a horns-first descent)", "status": "6 cm above the highest point of the horns",
               "carry": "2 cm above the back over spine_03"}[k]
        L.append(f"| socket_{k} | {c(p)} | {why} |")
    L += ["", "Measured right side (not used; the rig mirrors the left):", ""]
    for nm, k in (("fore", "r"), ("hind", "r")):
        L.append(f"- {nm} right: " + ", ".join(c(p) for p in P[nm][k]["points"]))
    L += ["", f"Joints: {rep['joints']} ({rep['deformJoints']} deform). Bind: {rep['bind']['method']}; unweighted "
          f"after automatic weights {rep['bind']['unweightedAfterAutoWeights']}, final {rep['bind']['unweightedFinal']}, "
          f"max influences {rep['bind']['maxInfluences']}.", ""]
    return "\n".join(L)


if __name__ == "__main__":
    main()

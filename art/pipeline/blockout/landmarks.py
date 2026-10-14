"""Landmarks, joint placements and proportions measured from a quadruped blockout (numpy only, no bpy).

Space: Blender meters, +Z up, the creature faces -Y, its left is +X, ground at z = 0. Every function takes an
(N, 3) vertex array already in that space (``normalize`` puts a raw reconstruction there).

How each landmark is found (the landmark report repeats this per joint with the numbers):

- feet: vertices below 7 cm split into front and hind by the largest gap in y and into left and right by x sign;
- top of the back: the highest midline vertex (|x| < 3 cm) behind the forefeet; the withers: the lowest
  midline top between the forefeet and that point;
- leg joints: slices of the leg's own side (x beyond 1 cm on that side) at heights taken from the approved side
  clay view (ratios of the back height, below): the joint sits at the slice's centroid in x and at a set
  fraction of its front-to-back extent in y (the hock at the back of its slice, the stifle at the front);
- spine: points on the back line, 6 cm under its top surface, from the tail root to the withers;
- neck and head: a narrow midline profile (|x| < 8 mm) gives the crown (its highest point, between the horn
  bases) and the occiput (where the top line has dropped 3 cm behind the crown); the neck runs from the withers
  to the occiput 5.5 to 7 cm under the top line; the head from the occiput to the nose tip (the most forward
  vertex); the jaw under it;
- tail: centroids of y slices of the thin midline part behind the rump, resampled by arc length;
- ears: the widest vertices just behind the crown, under the crown height (the horns are above it there);
  horns: the base beside the crown, the arc's highest point, and the tip as the lowest horn vertex behind the
  top and wider than 9 cm off the midline; sockets from those.

Height ratios (fraction of the top-of-back height), read from the side clay view (pixels, ground at y 1000,
top of back at y 345): hind hip 0.79, stifle 0.55, hock 0.29; fore shoulder 0.68, elbow 0.46, wrist 0.12.
"""

import numpy as np

RATIOS = {"hip": 0.79, "stifle": 0.55, "hock": 0.29, "shoulder": 0.68, "elbow": 0.46, "wrist": 0.12}


def _slab(v, axis, value, half):
    return v[np.abs(v[:, axis] - value) < half]


def midline_top(v, half_width=0.03, step=0.01):
    mid = v[np.abs(v[:, 0]) < half_width]
    ys = np.arange(mid[:, 1].min(), mid[:, 1].max(), step)
    out = []
    for y in ys:
        s = mid[(mid[:, 1] >= y) & (mid[:, 1] < y + step)]
        if len(s):
            out.append((y + step / 2, s[:, 2].max(), s[:, 2].min()))
    return np.array(out)


def top_at(profile, y):
    return float(np.interp(y, profile[:, 0], profile[:, 1]))


def feet(v, cut=0.07):
    low = v[v[:, 2] < cut]
    ys = np.sort(low[:, 1])
    i = int(np.argmax(np.diff(ys)))
    y_split = float((ys[i] + ys[i + 1]) / 2)
    out = {}
    for side, sx in (("l", 1), ("r", -1)):
        out["f" + side] = low[(low[:, 1] < y_split) & (np.sign(low[:, 0]) == sx)]
        out["h" + side] = low[(low[:, 1] >= y_split) & (np.sign(low[:, 0]) == sx)]
    return out, y_split


def back(v, fore_y):
    prof = midline_top(v)
    behind = prof[prof[:, 0] > fore_y]
    i = int(np.argmax(behind[:, 1]))
    top_y, top_z = float(behind[i, 0]), float(behind[i, 1])
    between = behind[behind[:, 0] < top_y]
    j = int(np.argmin(between[:, 1])) if len(between) else 0
    withers_y, withers_z = (float(between[j, 0]), float(between[j, 1])) if len(between) else (fore_y, top_z)
    return prof, top_y, top_z, withers_y, withers_z


def normalize(v, back_target):
    """Raw reconstruction (Blender axes, any scale) to meters: ground at 0, midline at x 0, top of back at
    ``back_target``, body center (midway between the fore and hind feet) at y 0. Returns (v, scale, offset)."""
    v = v.copy()
    v[:, 2] -= v[:, 2].min()
    f, _ = feet(v, cut=0.05 * v[:, 2].max())
    fore_y = np.mean([f["fl"][:, 1].mean(), f["fr"][:, 1].mean()])
    _, _, top_z, _, _ = back(v, fore_y)
    s = back_target / top_z
    v *= s
    f, _ = feet(v)
    cx = np.mean([f[k][:, 0].mean() for k in f])
    cy = (np.mean([f["fl"][:, 1].mean(), f["fr"][:, 1].mean()]) + np.mean([f["hl"][:, 1].mean(), f["hr"][:, 1].mean()])) / 2
    off = np.array([-cx, -cy, 0.0])
    return v + off, float(s), off


def _side(v, sx, inner=0.01):
    return v[v[:, 0] * sx > inner]


def leg_slice(v, sx, z, y_lo, y_hi, half=0.006):
    s = _slab(_side(v, sx), 2, z, half)
    s = s[(s[:, 1] >= y_lo) & (s[:, 1] <= y_hi)]
    return s


def place(s, frac_y):
    """Centroid x, ``frac_y`` of the way from the slice's front (min y) to its back (max y)."""
    return [float(s[:, 0].mean()), float(s[:, 1].min() + frac_y * (s[:, 1].max() - s[:, 1].min()))]


def resample(points, count):
    p = np.asarray(points, float)
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    t = np.linspace(0, d[-1], count)
    return np.stack([np.interp(t, d, p[:, i]) for i in range(3)], 1), float(d[-1])


def measure(v, back_target=0.57):
    notes = {}
    fe, y_split = feet(v)
    fore_y = float(np.mean([fe["fl"][:, 1].mean(), fe["fr"][:, 1].mean()]))
    hind_y = float(np.mean([fe["hl"][:, 1].mean(), fe["hr"][:, 1].mean()]))
    prof, top_y, top_z, withers_y, withers_z = back(v, fore_y)
    H = top_z
    nose = v[np.argmin(v[:, 1])]

    # Torso rear (tail root): behind the top of the back, the first slice where the midline depth falls under
    # a fifth of the back height (the tail is thin).
    rear = prof[(prof[:, 0] > top_y)]
    thin = rear[(rear[:, 1] - rear[:, 2]) < 0.2 * H]
    tail_root_y = float(thin[0, 0]) if len(thin) else float(rear[-1, 0])

    J = {}
    # ---- hind legs (left measured, right measured separately for the report, rig mirrors the left) ----
    hind = {}
    for side, sx in (("l", 1), ("r", -1)):
        ft = fe["h" + side]
        toe = [float(ft[:, 0].mean()), float(ft[:, 1].min()), 0.01]
        y_lo, y_hi = y_split - 0.02, tail_root_y + 0.05
        hock_s = leg_slice(v, sx, RATIOS["hock"] * H, y_lo, y_hi)
        hock = place(hock_s, 0.6) + [RATIOS["hock"] * H]
        st_s = leg_slice(v, sx, RATIOS["stifle"] * H, y_lo, y_hi)
        st_s = st_s[np.abs(st_s[:, 0]) > 0.06]
        stifle = place(st_s, 0.2) + [RATIOS["stifle"] * H]
        hip_s = leg_slice(v, sx, RATIOS["hip"] * H, y_lo, y_hi)
        hip_x = float(np.percentile(np.abs(hip_s[:, 0]), 90)) * 0.55 * sx
        hip = [hip_x, top_y + 0.01, RATIOS["hip"] * H]
        hind[side] = {"points": [hip, stifle, hock, toe], "slices": {
            "hock": {"z": RATIOS["hock"] * H, "y": [float(hock_s[:, 1].min()), float(hock_s[:, 1].max())]},
            "stifle": {"z": RATIOS["stifle"] * H, "y": [float(st_s[:, 1].min()), float(st_s[:, 1].max())]},
            "hipHalfWidth": float(np.percentile(np.abs(hip_s[:, 0]), 90))}}
    fore = {}
    for side, sx in (("l", 1), ("r", -1)):
        ft = fe["f" + side]
        toe = [float(ft[:, 0].mean()), float(ft[:, 1].min()), 0.01]
        y_lo, y_hi = float(ft[:, 1].min()) - 0.03, y_split
        wr_s = leg_slice(v, sx, RATIOS["wrist"] * H, y_lo, y_hi)
        wrist = place(wr_s, 0.5) + [RATIOS["wrist"] * H]
        el_s = leg_slice(v, sx, RATIOS["elbow"] * H, y_lo, y_hi)
        elbow = place(el_s, 0.65) + [RATIOS["elbow"] * H]
        sh_s = leg_slice(v, sx, RATIOS["shoulder"] * H, y_lo, y_hi)
        shoulder = [float(np.percentile(np.abs(sh_s[:, 0]), 90)) * 0.5 * sx,
                    float(sh_s[:, 1].min() + 0.4 * (sh_s[:, 1].max() - sh_s[:, 1].min())),
                    RATIOS["shoulder"] * H]
        fore[side] = {"points": [shoulder, elbow, wrist, toe], "slices": {
            "wrist": {"z": RATIOS["wrist"] * H, "y": [float(wr_s[:, 1].min()), float(wr_s[:, 1].max())],
                      "x": [float(wr_s[:, 0].min()), float(wr_s[:, 0].max())]},
            "elbow": {"z": RATIOS["elbow"] * H, "y": [float(el_s[:, 1].min()), float(el_s[:, 1].max())]}}}

    # ---- spine: tail root to the withers, 6 cm under the back line ----
    sp_y = np.linspace(tail_root_y - 0.03, withers_y + 0.01, 6)
    spine = [[0.0, float(y), top_at(prof, y) - 0.06] for y in sp_y]

    # ---- head: the narrow midline (|x| < 8 mm, above the withers) avoids the forelegs and the horns ----
    hm = v[(np.abs(v[:, 0]) < 0.008) & (v[:, 2] > withers_z * 0.95) & (v[:, 1] < withers_y)]
    hprof = []
    for y in np.arange(hm[:, 1].min(), withers_y, 0.005):
        sl = hm[(hm[:, 1] >= y) & (hm[:, 1] < y + 0.005)]
        if len(sl):
            hprof.append((y + 0.0025, sl[:, 2].max(), sl[:, 2].min()))
    hprof = np.array(hprof)
    ic = int(np.argmax(hprof[:, 1]))
    crown_y, crown_z = float(hprof[ic, 0]), float(hprof[ic, 1])
    # occiput: first midline top behind the crown that has dropped 3 cm below it
    behind = hprof[(hprof[:, 0] > crown_y) & (hprof[:, 1] < crown_z - 0.03)]
    skull_back_y = float(behind[0, 0]) if len(behind) else crown_y + 0.04
    snout = v[(v[:, 1] < nose[1] + 0.02) & (np.abs(v[:, 0]) < 0.03)]
    nose_z = float(snout[:, 2].mean())
    occ_top = float(np.interp(skull_back_y, hprof[:, 0], hprof[:, 1]))
    atlas = [0.0, skull_back_y, occ_top - 0.07]
    head_tip = [0.0, float(nose[1]) + 0.01, nose_z + 0.005]
    neck_base = spine[-1]
    neck_mid_y = (neck_base[1] + skull_back_y) / 2
    neck_mid = [0.0, neck_mid_y, float(np.interp(neck_mid_y, hprof[:, 0], hprof[:, 1])) - 0.055]
    jaw_bottom = float(np.interp(crown_y, hprof[:, 0], hprof[:, 2]))
    jaw_from = [0.0, skull_back_y - 0.015, (atlas[2] + jaw_bottom) / 2]
    jaw_to = [0.0, float(nose[1]) + 0.025, nose_z - 0.025]

    # ---- horns and ears ----
    horns = {}
    ears = {}
    for side, sx in (("l", 1), ("r", -1)):
        hv = v[(v[:, 0] * sx > 0.06) & (v[:, 1] > crown_y - 0.02) & (v[:, 2] > crown_z)]
        top = hv[np.argmax(hv[:, 2])]
        arc = v[(v[:, 0] * sx > 0.09) & (v[:, 1] > top[1]) & (v[:, 2] > withers_z + 0.05) & (v[:, 1] < tail_root_y)]
        tip = arc[np.argmin(arc[:, 2])]
        base_reg = v[(v[:, 0] * sx > 0.01) & (v[:, 0] * sx < 0.05) & (np.abs(v[:, 1] - crown_y) < 0.015) &
                     (v[:, 2] > crown_z - 0.03) & (v[:, 2] < crown_z + 0.02)]
        base = [float(base_reg[:, 0].mean()), crown_y, crown_z - 0.01]
        allh = np.vstack([hv, arc])
        horns[side] = {"base": base, "top": top.tolist(), "tip": tip.tolist(),
                       "reachBack": float(allh[:, 1].max() - base[1]), "spanX": float(np.abs(allh[:, 0]).max()),
                       "aboveCrown": float(allh[:, 2].max() - crown_z)}
        ev = v[(v[:, 0] * sx > 0.05) & (v[:, 1] > crown_y + 0.01) & (v[:, 1] < crown_y + 0.09) &
               (v[:, 2] > atlas[2]) & (v[:, 2] < crown_z)]
        ear_tip = ev[np.argmax(ev[:, 0] * sx)]
        ear_base = [0.045 * sx, float(ear_tip[1]) - 0.02, float(ear_tip[2]) - 0.015]
        ear_mid = [(ear_base[0] + ear_tip[0]) / 2, (ear_base[1] + ear_tip[1]) / 2, (ear_base[2] + ear_tip[2]) / 2 + 0.005]
        ears[side] = [ear_base, ear_mid, ear_tip.tolist()]

    # ---- tail ----
    tv = v[(v[:, 1] > tail_root_y - 0.04) & (np.abs(v[:, 0]) < 0.05) & (v[:, 2] > 0.12)]
    cents = [spine[0][:3]]
    step = 0.015
    for y in np.arange(tail_root_y, tv[:, 1].max(), step):
        s = tv[(tv[:, 1] >= y) & (tv[:, 1] < y + step)]
        if len(s) >= 3:
            cents.append([float(s[:, 0].mean()), float(y + step / 2), float(s[:, 2].mean())])
    tip_v = tv[np.argmax(tv[:, 1])]
    cents.append(tip_v.tolist())
    tail_pts, tail_len = resample(cents[1:], 7)
    tail_pts[0] = [0.0, spine[0][1] + 0.02, spine[0][2] + 0.02]

    # eyes: 70 percent of the way from the nose to the crown, at 55 percent of the head's height there
    eye_y = float(nose[1]) + 0.7 * (crown_y - float(nose[1]))
    top_e = float(np.interp(eye_y, hprof[:, 0], hprof[:, 1]))
    bot_e = float(np.interp(eye_y, hprof[:, 0], hprof[:, 2]))
    eye_z = bot_e + 0.55 * (top_e - bot_e)
    ehs = _slab(_slab(v, 1, eye_y, 0.006), 2, eye_z, 0.008)
    eye_x = float(np.abs(ehs[:, 0]).max()) if len(ehs) else 0.035

    pts = {
        "spine": spine, "neck": [neck_base, neck_mid, atlas], "head": [atlas, head_tip],
        "jaw": [jaw_from, jaw_to], "fore": fore, "hind": hind, "tail": tail_pts.tolist(),
        "ears": ears, "horns": horns,
        "sockets": {
            "head": [0.0, (atlas[1] + head_tip[1]) / 2, atlas[2] + 0.02],
            "eye_l": [eye_x, eye_y, eye_z], "eye_r": [-eye_x, eye_y, eye_z],
            "emitter": [0.0, (horns["l"]["top"][1] + horns["r"]["top"][1]) / 2,
                        (horns["l"]["top"][2] + horns["r"]["top"][2]) / 2],
            "status": [0.0, atlas[1], float(v[:, 2].max()) + 0.06],
            "carry": [0.0, float(sp_y[2]), top_at(prof, sp_y[2]) + 0.02]},
    }
    facts = {
        "backTopZ": H, "backTopY": top_y, "withersZ": withers_z, "withersY": withers_y,
        "foreFeetY": fore_y, "hindFeetY": hind_y, "ySplitFeet": y_split, "tailRootY": tail_root_y,
        "noseTip": nose.tolist(), "skullBackY": skull_back_y, "crownY": crown_y, "crownZ": crown_z, "tailLengthM": tail_len,
        "overall": {"min": v.min(0).tolist(), "max": v.max(0).tolist()},
    }
    return pts, facts


def _dense_extent(values, bins=40, frac=0.2):
    """Extent of the contiguous run of histogram bins around the fullest bin with at least ``frac`` of its count
    (drops thin strays such as a few lateral vertices of the belly ahead of the thigh)."""
    h, e = np.histogram(values, bins=bins)
    i = j = int(np.argmax(h))
    while i > 0 and h[i - 1] >= frac * h.max():
        i -= 1
    while j < len(h) - 1 and h[j + 1] >= frac * h.max():
        j += 1
    return float(e[j + 1] - e[i])


def proportions(v, pts, facts):
    """The numbers asked for at this gate, in meters."""
    H = facts["backTopZ"]
    lo, hi = np.array(facts["overall"]["min"]), np.array(facts["overall"]["max"])
    # chest depth: vertical midline extent at the slice just behind the forelegs' top (girth);
    # waist: the smallest such depth between the girth and the hind legs' front.
    mid = v[np.abs(v[:, 0]) < 0.03]
    def depth(y):
        s = _slab(mid, 1, y, 0.005)
        s = s[s[:, 2] > 0.1 * H]
        return float(s[:, 2].max() - s[:, 2].min()) if len(s) else 0.0
    girth_y = pts["fore"]["l"]["points"][1][1] + 0.03
    # search for the waist from the girth to 4 cm ahead of the stifle (behind that the thighs join the torso)
    ys = np.linspace(girth_y, pts["hind"]["l"]["points"][1][1] - 0.04, 25)
    depths = [depth(y) for y in ys]
    waist_i = int(np.argmin(depths))
    # hind thigh vs foreleg widths. The thigh is the mass lateral of the waist: vertices wider than the waist's
    # half width, between the stifle and the hip; its front-to-back extent is the side-view thigh width.
    wsl = _slab(v, 1, float(ys[waist_i]), 0.005)
    wsl = wsl[(wsl[:, 2] > 0.3 * H) & (wsl[:, 2] < 0.9 * H)]   # under the horn tips, which hang near the withers
    waist_hw = float(np.abs(wsl[:, 0]).max())
    thigh_z = (pts["hind"]["l"]["points"][0][2] + pts["hind"]["l"]["points"][1][2]) / 2
    th = v[(v[:, 0] > waist_hw + 0.005) & (v[:, 1] > facts["ySplitFeet"]) &
           (v[:, 2] > pts["hind"]["l"]["points"][1][2]) & (v[:, 2] < pts["hind"]["l"]["points"][0][2] + 0.05)]
    fa_z = (pts["fore"]["l"]["points"][1][2] + pts["fore"]["l"]["points"][2][2]) / 2
    fa = leg_slice(v, 1, fa_z, facts["noseTip"][1], facts["ySplitFeet"])
    thigh_lat = float(np.abs(th[:, 0]).max())
    hf = feet(v)[0]["hl"]
    ff = feet(v)[0]["fl"]
    hl = pts["horns"]["l"]
    return {
        "heightOverallM": float(hi[2]),
        "heightAtRumpM": H,
        "heightAtShoulderM": facts["withersZ"],
        "bodyLengthNoseToTailRootM": float(facts["tailRootY"] - facts["noseTip"][1]),
        "lengthNoseToTailTipM": float(hi[1] - lo[1]),
        "widthOverallM": float(hi[0] - lo[0]),
        "chestDepthM": depths[0],
        "waistDepthM": depths[waist_i],
        "waistAtY": float(ys[waist_i]),
        "hindThighWidthM": _dense_extent(th[:, 1]),
        "hindThighAtZ": thigh_z,
        "waistHalfWidthM": waist_hw,
        "hindThighLateralM": thigh_lat,
        "forearmWidthM": float(fa[:, 1].max() - fa[:, 1].min()),
        "forearmAtZ": fa_z,
        "thighToForearmRatio": _dense_extent(th[:, 1]) / max(1e-6, float(fa[:, 1].max() - fa[:, 1].min())),
        "hindFootLengthM": float(hf[:, 1].max() - hf[:, 1].min()),
        "foreFootLengthM": float(ff[:, 1].max() - ff[:, 1].min()),
        "hindLegLengthM": float(sum(np.linalg.norm(np.subtract(a, b)) for a, b in zip(pts["hind"]["l"]["points"][:-1], pts["hind"]["l"]["points"][1:]))),
        "foreLegLengthM": float(sum(np.linalg.norm(np.subtract(a, b)) for a, b in zip(pts["fore"]["l"]["points"][:-1], pts["fore"]["l"]["points"][1:]))),
        "headLengthM": float(facts["skullBackY"] - facts["noseTip"][1]),
        "tailLengthM": facts["tailLengthM"],
        "hornReachBackFromBaseM": hl["reachBack"],
        "hornSpanM": 2 * hl["spanX"],
        "hornHeightAboveCrownM": hl["aboveCrown"],
        "hornTipFromBaseM": float(np.linalg.norm(np.subtract(hl["tip"], hl["base"]))),
    }

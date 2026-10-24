"""Luceras surface pass (fur 2): close the gaps that show at 192 px against the model sheet.

blender -b --python build_surface_fur2.py -- GROOM_IN.blend OUT_GROOM.blend REPORT.json PARAMS.json
Input is the fur 1 groom (luceras-surface/furpass1/i2/groom.blend); it is never written.
  1. leg white, wider: forelegs white on the rear and inner faces from the elbow down, hind legs white on the front of the
     shank and the inner faces; only the front of the forelegs and the outer thigh and gaskin stay dark (coat strands and skin)
  2. plume white: the white tufts brighter, and the dark tufts that sit next to the white band (by their angle around the
     plume spine, measured against the white tufts in the same section) recoloured white, so the band is about half the
     plume's width with the dark pointed tufts outside it
  3. coat texture: each coat strand's shape is smoothed along its length (less frizz and curl, length kept) and pulled
     toward the mean shape of the strands rooted in the same small cell (tighter clumps, fewer strays on the outline)
  4. face: the blaze narrowed to a stripe on the forehead and the top of the muzzle; whiskers longer and thicker than
     fur 1; the eyelid rim darker
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path

A = sys.argv[sys.argv.index('--') + 1:]
GIN, GOUT, REP, PARP = A[:4]
P = json.load(open(PARP)); rep = dict(input=GIN, output=GOUT, params=P)
bpy.ops.wm.open_mainfile(filepath=GIN)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
body = bpy.data.objects['luceras_blockout']; coat = bpy.data.objects['Luceras interpolated coat']


def arr(items, key, n, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x
def sstep(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
Rw = np.array(rig.matrix_world)
def bone_seg(n):
    b = rig.data.bones[n]; return (Rw @ np.r_[b.head_local, 1])[:3], (Rw @ np.r_[b.tail_local, 1])[:3]
def seg_param(p, h, t):
    ax = t - h; u = np.clip(((p - h) @ ax) / (ax @ ax), 0, 1); foot = h + u[:, None] * ax; return u, foot, np.linalg.norm(p - foot, axis=1)


def curves_of(o):
    d = o.data; offs = arr(d.curves, 'first_point_index', 1, np.int32); cnt = arr(d.curves, 'points_length', 1, np.int32)
    pos = arr(d.attributes['position'].data, 'vector', 3); M = np.array(o.matrix_world)
    return d, offs, cnt, pos, pos @ M[:3, :3].T + M[:3, 3]


cd, offs, cnt, pos, posw = curves_of(coat); NC = len(offs); roots = posw[offs]
ca = cd.attributes['coat_color']; col = arr(ca.data, 'color', 4)
lum = col[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
dark = np.median(col[lum < np.percentile(lum, 30), :3], axis=0); white = np.median(col[lum > np.percentile(lum, 90), :3], axis=0)


def leg_rule(pts, colarr, seg_limit):
    out = colarr.copy(); stats = {}; WF = np.zeros(len(pts))
    for side, sx in (('l', 1.0), ('r', -1.0)):
        for kind in ('f', 'h'):
            segs = [bone_seg(f'leg_{kind}{side}_0{i}') for i in (1, 2, 3)]
            best = np.full(len(pts), 1e9); u_all = np.zeros(len(pts)); seg_i = np.zeros(len(pts), int); foot_all = np.zeros((len(pts), 3))
            for i, (h, t) in enumerate(segs):
                u, foot, d = seg_param(pts, h, t); m = d < best; best[m] = d[m]; u_all[m] = u[m]; seg_i[m] = i; foot_all[m] = foot[m]
            inleg = (best < P['leg_reach_m']) & ((seg_i > 0) | (u_all > P['upper_from_u'])) & (np.sign(pts[:, 0]) == sx) & (seg_i <= seg_limit)
            rad = pts - foot_all; rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
            medial = np.array([-sx, 0.0, 0.0]); rear = np.array([0.0, 1.0, 0.0])
            if kind == 'f':
                want = medial * P['fore_medial'] + rear * P['fore_rear']; lo, hi = P['fore_from_cos'], P['fore_full_cos']
            else:
                want = medial * P['hind_medial'] - rear * P['hind_front']; lo, hi = P['hind_from_cos'], P['hind_full_cos']
            want /= np.linalg.norm(want); cs = rad @ want
            if kind == 'h' and 'shank_from_cos' in P:   # the shank below the hock: white wraps further round from the front
                lo = np.where(seg_i == 2, P['shank_from_cos'], lo); hi = np.where(seg_i == 2, P['shank_full_cos'], hi)
            if kind == 'f' and 'forearm_from_cos' in P:
                lo = np.where(seg_i >= 1, P['forearm_from_cos'], lo); hi = np.where(seg_i >= 1, P['forearm_full_cos'], hi)
            w = np.clip((cs - lo) / (hi - lo), 0, 1); w = w * w * (3 - 2 * w)
            if kind == 'h':   # the outer thigh and gaskin stay dark; the shank's front and inner faces go white
                w = w * np.where(seg_i == 0, P['hind_thigh_white'], 1.0)
            top = np.where(seg_i == 0, sstep(P['upper_from_u'], P['upper_full_u'], u_all), 1.0); f = inleg * top
            wl = np.clip(white * P.get('leg_white_gain', 1.0), 0, 1)
            tgt = dark[None, :] * (1 - w[:, None]) + wl[None, :] * w[:, None]
            out[:, :3] = np.where(f[:, None] > 0, out[:, :3] * (1 - f[:, None]) + tgt * f[:, None], out[:, :3])
            WF = np.maximum(WF, f * w)
            stats[f'{kind}{side}'] = dict(n=int(inleg.sum()), white_share=round(float((w[inleg] > 0.5).mean()), 3) if inleg.any() else 0.0)
    return out, stats, WF


# ---- 1. legs (coat strands and skin)
lum0 = col[:, :3] @ np.array([0.2126, 0.7152, 0.0722]); whiteref = lum0 > np.percentile(lum0, 90)
col, rep['legs_coat'], WFc = leg_rule(roots, col, 2)
# the coat shader also darkens by per-strand attributes (paw_mask toward the paws, tone and gain); white leg strands take
# the white chest strands' values so they render as white as the chest
rep['leg_attrs'] = {}
for an in ('paw_mask', 'white_shade', 'coat_gain', 'strand_tone'):
    a_ = cd.attributes.get(an)
    if a_ is None or a_.domain != 'CURVE' or a_.data_type != 'FLOAT': continue
    v = arr(a_.data, 'value', 1); ref = float(np.median(v[whiteref]))
    before = float(np.mean(v[WFc > 0.5])) if (WFc > 0.5).any() else None
    v = v * (1 - WFc) + ref * WFc; a_.data.foreach_set('value', v.astype(np.float32))
    rep['leg_attrs'][an] = dict(white_chest_median=round(ref, 3), white_leg_mean_before=None if before is None else round(before, 3))
ba = body.data.attributes.get('coat_color')
if ba is not None and ba.domain == 'POINT':
    Mb = np.array(body.matrix_world); bv = arr(body.data.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]
    bcol = arr(ba.data, 'color', 4); bcol, rep['legs_skin'], _ = leg_rule(bv, bcol, P.get('skin_seg_limit', 1)); ba.data.foreach_set('color', bcol.astype(np.float32).ravel())

# ---- 4a. blaze: dorsal head strands that are white and off the midline go dark (stripe half-width P['blaze_half_m'])
hh, ht = bone_seg('head_01'); _, _, dh = seg_param(roots, hh, ht); head = dh < P['head_reach_m']
Mb = np.array(body.matrix_world); hv = arr(body.data.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]
_, _, dhv = seg_param(hv, hh, ht); hvv = hv[dhv < P['head_reach_m']]
nose = hvv[np.argmin(hvv[:, 1])]                                      # the most forward head point (the creature faces -Y)
lum = col[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
above = roots[:, 2] > nose[2] + P['blaze_above_nose_m']
off = np.abs(roots[:, 0]) > P['blaze_half_m'] + P['blaze_widen_per_m'] * np.maximum(0, roots[:, 2] - nose[2])
front = roots[:, 1] < hh[1] + P['blaze_back_m']
sel = head & above & off & front & (lum > 0.35)
fade = sstep(P['blaze_half_m'], P['blaze_half_m'] + P['blaze_soft_m'], np.abs(roots[:, 0]))
col[:, :3] = np.where(sel[:, None], col[:, :3] * (1 - fade[:, None]) + dark[None, :] * fade[:, None], col[:, :3])
rep['blaze'] = dict(strands_darkened=int(sel.sum()), nose=[round(float(x), 3) for x in nose])
ca.data.foreach_set('color', col.astype(np.float32).ravel())

# ---- 3. coat texture: smooth along the strand, clump toward the cell mean, keep each strand's length
off_ = pos - np.repeat(pos[offs], cnt, axis=0)
k = cnt.max(); uniform = (cnt == k).all()
rep['coat_points_per_strand'] = dict(min=int(cnt.min()), max=int(cnt.max()))
if uniform:
    O = off_.reshape(NC, k, 3); seglen0 = np.linalg.norm(np.diff(O, axis=1), axis=2); L0 = seglen0.sum(1)
    for _ in range(P['smooth_iters']):
        O[:, 1:-1] = 0.5 * O[:, 1:-1] + 0.25 * (O[:, :-2] + O[:, 2:])
        O[:, -1] = O[:, -1] + P['smooth_tip'] * (2 * O[:, -2] - O[:, -3] - O[:, -1])
    # clump: mean normalised shape per cell
    cell = np.floor(roots / P['clump_cell_m']).astype(np.int64); key = (cell[:, 0] * 73856093) ^ (cell[:, 1] * 19349663) ^ (cell[:, 2] * 83492791)
    _, inv = np.unique(key, return_inverse=True)
    Ln = np.maximum(np.linalg.norm(O[:, -1], axis=1), 1e-9)
    shape = O / Ln[:, None, None]
    acc = np.zeros((inv.max() + 1, k, 3)); np.add.at(acc, inv, shape); nn = np.bincount(inv)
    mean = acc[inv] / nn[inv][:, None, None]
    O = O * (1 - P['clump']) + mean * Ln[:, None, None] * P['clump']
    # lay the strands toward the skin: remove part of each point's offset along the root's surface normal
    from mathutils.kdtree import KDTree
    from mathutils import Vector
    me = body.data; me.calc_normals_split() if hasattr(me, 'calc_normals_split') else None
    vco = arr(me.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]; vno = arr(me.vertices, 'normal', 3) @ Mb[:3, :3].T
    kd = KDTree(len(vco))
    for i, c_ in enumerate(vco): kd.insert(c_.tolist(), i)
    kd.balance(); nidx = np.array([kd.find(r_.tolist())[1] for r_ in roots]); N = vno[nidx]; N /= np.maximum(np.linalg.norm(N, axis=1), 1e-9)[:, None]
    Minv = np.linalg.inv(np.array(coat.matrix_world)[:3, :3]); Nl = N @ Minv.T; Nl /= np.maximum(np.linalg.norm(Nl, axis=1), 1e-9)[:, None]
    along = (O * Nl[:, None, :]).sum(2); keep_ = np.clip(along, 0, None)   # only the outward part is reduced
    O = O - Nl[:, None, :] * (keep_ * P['flatten'])[:, :, None]
    # restore each strand's length (polyline length scaled back to the original)
    L1 = np.linalg.norm(np.diff(O, axis=1), axis=2).sum(1); O = O * (L0 / np.maximum(L1, 1e-12))[:, None, None]
    newpos = np.repeat(pos[offs], cnt, axis=0) + O.reshape(-1, 3)
    cd.attributes['position'].data.foreach_set('vector', newpos.astype(np.float32).ravel())
    rep['coat_texture'] = dict(smooth_iters=P['smooth_iters'], clump=P['clump'], clump_cell_mm=P['clump_cell_m'] * 1000, cells=int(inv.max() + 1), flatten=P['flatten'])
else:
    rep['coat_texture'] = 'skipped: strands have different point counts'

# ---- 2. plume white
pw = bpy.data.objects['Plume tufts white']; pdk = bpy.data.objects['Plume tufts dark']
sp = np.load(str(Path(GIN).parent / 'plume_spine.npz')); S = sp['S']
def tuft_dirs(o):
    d, offs_, cnt_, pos_, posw_ = curves_of(o); r = posw_[offs_]          # the spine samples are in groom world space
    i = np.argmin(((r[:, None, :] - S[None, ::4, :]) ** 2).sum(2), axis=1) * 4
    T = np.gradient(S, axis=0)[i]; T /= np.linalg.norm(T, axis=1)[:, None]
    rad = r - S[i]; rad -= T * (rad * T).sum(1)[:, None]; rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
    return d, i, rad
dw, iw, rw = tuft_dirs(pw); dd, idd, rd = tuft_dirs(pdk)
sec = lambda i: i // P['plume_section']
mean_w = {}
for s_ in np.unique(sec(iw)):
    m = rw[sec(iw) == s_].mean(0); mean_w[s_] = m / max(np.linalg.norm(m), 1e-9)
mw = np.array([mean_w.get(s_, np.zeros(3)) for s_ in sec(idd)])
cosd = (rd * mw).sum(1)
convert = cosd > P['plume_convert_cos']
pc_d = arr(dd.attributes['plume_color'].data, 'color', 4); pc_w = arr(dw.attributes['plume_color'].data, 'color', 4)
wc = np.array(P['plume_white_rgb'] + [1.0], np.float32)
pc_w[:] = wc; pc_d[convert] = wc
dw.attributes['plume_color'].data.foreach_set('color', pc_w.ravel()); dd.attributes['plume_color'].data.foreach_set('color', pc_d.ravel())
rep['plume'] = dict(white_tufts_strands=int(len(pc_w)), dark_converted=int(convert.sum()), dark_kept=int((~convert).sum()), white_rgb=P['plume_white_rgb'])

# ---- 4b. whiskers and eyelid rim
wk = bpy.data.objects['Luceras white whiskers']; wd, woffs, wcnt, wpos, _ = curves_of(wk)
wroot = np.repeat(wpos[woffs], wcnt, axis=0); wd.attributes['position'].data.foreach_set('vector', (wroot + (wpos - wroot) * P['whisker_length']).astype(np.float32).ravel())
r = arr(wd.attributes['radius'].data, 'value', 1); wd.attributes['radius'].data.foreach_set('value', (r * P['whisker_radius']).astype(np.float32))
m = bpy.data.materials['Short dark slate eyelid rim']
for n in m.node_tree.nodes:
    if n.bl_idname == 'ShaderNodeValToRGB':
        for el in n.color_ramp.elements: el.color = [c * P['lid_dark'] for c in el.color[:3]] + [1.0]
rep['face'] = dict(whisker_length=P['whisker_length'], whisker_radius=P['whisker_radius'], lid_dark=P['lid_dark'])

bpy.ops.wm.save_as_mainfile(filepath=GOUT)
for f in ('plume_spine.npz', 'plume_build.json'):
    Path(GOUT).parent.joinpath(f).write_bytes(Path(GIN).parent.joinpath(f).read_bytes())
Path(REP).write_text(json.dumps(rep, indent=1)); print('SURFACE2 done', json.dumps({k_: rep[k_] for k_ in ('legs_coat', 'plume', 'blaze')}), flush=True)

"""Luceras eye region, pass 5: view-space iris cover.

Ray traces each eye at rest the way the renderer sees it (skin and lid tubes as occluders, the cornea refracting at
IOR 1.33, the iris angle read exactly as the round-eye material reads it: arccos of the normalised position in the
ap_eye_frame empty's space), for the face-sheet views: front (both eyes), three-quarter (left eye), side (right eye).
Fur is not an occluder (it only adds cover).

For each view it reports, on the screen column through the apparent iris centre: the share of the iris height hidden
by the upper lid and by the lower lid, the iris height against the visible opening height, and the apparent pupil
share. Candidates [iris_deg, drop_deg] are scored without rebuilding: drop_deg turns the iris centre down by that
angle about the frame's x axis (the shader's Vector Rotate in pass 5 variant A).

Usage: blender -b SCENE.blend --python eyeregion_viewcover.py -- OUT.json '[[39.2,0],[44,4]]' [PUPIL_FRAC] [MASK_DIR]
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

A = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(A[0]); CANDS = json.loads(A[1]) if len(A) > 1 else [[39.2, 0.0]]
PUP = float(A[2]) if len(A) > 2 else 0.45; MASKD = Path(A[3]) if len(A) > 3 else None
STEP = 0.00025; IOR = 1.33
s = bpy.context.scene; rig = bpy.data.objects['luceras_rig']
if rig.animation_data: rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0); rig.data.pose_position = 'REST'; bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()


def mesh_world(o):
    e = o.evaluated_get(dg); me = e.to_mesh(); M = np.array(e.matrix_world)
    V = np.array([v.co[:] for v in me.vertices]) @ M[:3, :3].T + M[:3, 3]; P_ = [list(p.vertices) for p in me.polygons]; e.to_mesh_clear(); return V, P_


occ = [bpy.data.objects['luceras_blockout']] + [o for o in s.objects if o.type == 'MESH' and not o.hide_render and o.name.startswith(('eyeregion_lid_margin', 'eyeregion_tear_line', 'eyeregion_caruncle'))]
VV, PP, off = [], [], 0
for o in occ:
    V, P_ = mesh_world(o); VV.append(V); PP += [[i + off for i in p] for p in P_]; off += len(V)
BS = BVHTree.FromPolygons([Vector(v) for v in np.concatenate(VV).tolist()], PP)


def sphere_fit(X):
    A_ = np.c_[2 * X, np.ones(len(X))]; b_ = (X ** 2).sum(1); sol = np.linalg.lstsq(A_, b_, rcond=None)[0]
    c = sol[:3]; r = math.sqrt(sol[3] + c @ c); return c, r, float(np.abs(np.linalg.norm(X - c, axis=1) - r).max())


VIEWS = {'front': ([0.0, -1.0, 0.07], ('l', 'r')), 'threeq': ([0.57, -0.82, 0.07], ('l',)), 'side': ([-1.0, 0.0, 0.0], ('r',))}
LOG = {'step_mm': STEP * 1000, 'ior': IOR, 'occluders': [o.name for o in occ], 'candidates': CANDS, 'pupil_frac': PUP, 'eyes': {}, 'views': {}}
EYE = {}
for side in ('l', 'r'):
    Ve, _ = mesh_world(bpy.data.objects['eye_' + side]); ce, re_, rese = sphere_fit(Ve)
    Vc, Pc = mesh_world(bpy.data.objects['surface_cornea_eye_' + side]); cc, rc, resc = sphere_fit(Vc)
    BC = BVHTree.FromPolygons([Vector(v) for v in Vc.tolist()], Pc)
    em = bpy.data.objects['ap_eye_frame_' + side]; M4 = np.array(em.matrix_world); Ei = np.linalg.inv(M4)
    EYE[side] = dict(ce=ce, re=re_, cc=cc, rc=rc, BC=BC, Ei=Ei, sph_c=resc < 1e-4, shell=abs(rc - re_) < 1e-4 and np.linalg.norm(cc - ce) < 1e-4)
    LOG['eyes'][side] = dict(eye_centre=ce.round(5).tolist(), eye_r_mm=round(re_ * 1000, 2), eye_fit_resid_mm=round(rese * 1000, 3),
                             cornea_centre_offset_mm=((cc - ce) * 1000).round(2).tolist(), cornea_r_mm=round(rc * 1000, 2), cornea_fit_resid_mm=round(resc * 1000, 3), cornea_is_shell_on_eyeball=bool(abs(rc - re_) < 1e-4),
                             frame_origin_offset_mm=((M4[:3, 3] - ce) * 1000).round(2).tolist(), frame_axis_z=(M4[:3, 2] / np.linalg.norm(M4[:3, 2])).round(3).tolist())


def refract(d, n, eta):
    ci = -(n @ d); k = 1 - eta * eta * (1 - ci * ci)
    return None if k < 0 else eta * d + (eta * ci - math.sqrt(k)) * n


def sph_hit(o, d, c, r):
    oc = o - c; b = oc @ d; cc_ = oc @ oc - r * r; disc = b * b - cc_
    if disc < 0: return None
    t = -b - math.sqrt(disc)
    if t < 1e-7: t = -b + math.sqrt(disc)
    return t if t > 1e-7 else None


def save_mask(path, img):
    h, w, _ = img.shape; im = bpy.data.images.new(path.stem, w, h, alpha=False)
    px = np.ones((h, w, 4), np.float32); px[:, :, :3] = img; im.pixels.foreach_set(px.ravel()); im.filepath_raw = str(path); im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)


for vname, (vv, sides) in VIEWS.items():
    v = np.array(vv, float); v /= np.linalg.norm(v); w = np.array([0, 0, 1.0]) - v * v[2]; w /= np.linalg.norm(w); u = np.cross(w, v)
    for side in sides:
        E_ = EYE[side]; ce, re_ = E_['ce'], E_['re']; D = -v
        ax = np.arange(-1.25 * re_, 1.25 * re_ + 1e-9, STEP); na = len(ax)
        vis = np.zeros((na, na), bool); eyeh = np.zeros((na, na), bool); Q = np.full((na, na, 3), np.nan)
        for i, a in enumerate(ax):          # i: screen u (column), j: screen w (row, up)
            for j, b in enumerate(ax):
                O = ce + u * a + w * b + v * 0.06
                # a cornea coincident with the eyeball is a zero-thickness shell: no net refraction
                h_c = (None,) if E_['shell'] else E_['BC'].ray_cast(Vector(O.tolist()), Vector(D.tolist()), 0.2)
                if h_c[0] is not None:
                    pc = np.array(h_c[0][:]); tc = float(h_c[3])
                    n = (pc - E_['cc']) / E_['rc'] if E_['sph_c'] else np.array(h_c[1][:])
                    if n @ D > 0: n = -n
                    d2 = refract(D, n, 1.0 / IOR)
                    if d2 is None: continue
                    d2 /= np.linalg.norm(d2); te = sph_hit(pc, d2, ce, re_)
                    if te is None: continue
                    pe = pc + d2 * te; tfront = tc
                else:
                    te = sph_hit(O, D, ce, re_)
                    if te is None: continue
                    pe = O + D * te; tfront = te
                eyeh[i, j] = True; Q[i, j] = pe
                h_s = BS.ray_cast(Vector(O.tolist()), Vector(D.tolist()), 0.2)
                vis[i, j] = h_s[0] is None or float(h_s[3]) > tfront - 1e-6
        q = Q.reshape(-1, 3) @ E_['Ei'][:3, :3].T + E_['Ei'][:3, 3]; q = q / np.linalg.norm(q, axis=1, keepdims=True); q = q.reshape(na, na, 3)
        res = []
        for ti_deg, drop in CANDS:
            dl = math.radians(drop); zp = -q[:, :, 1] * math.sin(dl) + q[:, :, 2] * math.cos(dl)
            ang = np.arccos(np.clip(np.nan_to_num(zp, nan=-1.0), -1, 1)); ti = math.radians(ti_deg)
            iris = eyeh & (ang < ti); pup = eyeh & (ang < ti * PUP); ivis = iris & vis
            if not iris.any(): res.append(dict(iris_deg=ti_deg, drop_deg=drop, error='no iris')); continue
            ci = int(round(np.nonzero(iris)[0].mean())); cols = slice(max(ci - 1, 0), ci + 2)
            rows_i = np.nonzero(iris[cols].any(0))[0]; rows_v = np.nonzero(ivis[cols].any(0))[0]; rows_o = np.nonzero((eyeh & vis)[cols].any(0))[0]
            rows_p = np.nonzero(pup[cols].any(0))[0]
            ih = (rows_i.max() - rows_i.min() + 1)
            up = (rows_i.max() - rows_v.max()) / ih if len(rows_v) else 1.0; lo = (rows_v.min() - rows_i.min()) / ih if len(rows_v) else 1.0
            oh = (rows_o.max() - rows_o.min() + 1) if len(rows_o) else 0
            # the widest visible iris chord: is the iris cut by the lid at the top (visible iris top row is the opening's top row)
            res.append(dict(iris_deg=ti_deg, drop_deg=drop, upper_cover=round(float(up), 3), lower_cover=round(float(lo), 3),
                            iris_h_over_opening_h=round(float(ih / max(oh, 1)), 2), iris_h_mm=round(float(ih * STEP * 1000), 1), opening_h_mm=round(float(oh * STEP * 1000), 1),
                            pupil_of_iris=round(float((rows_p.max() - rows_p.min() + 1) / ih), 2) if len(rows_p) else None,
                            iris_visible_share=round(float(ivis.sum() / iris.sum()), 3)))
            if MASKD is not None and (ti_deg, drop) == tuple(CANDS[0]) or (MASKD is not None and len(CANDS) <= 3):
                img = np.zeros((na, na, 3), np.float32); img[eyeh & vis] = 0.9; img[iris & ~vis] = (0.35, 0.3, 0.6); img[ivis] = (0.85, 0.55, 0.15); img[pup & vis] = 0.05
                img[eyeh & ~vis & ~iris] = 0.25; img[:, :, :][~eyeh & ~vis] = 0.15
                MASKD.mkdir(parents=True, exist_ok=True); save_mask(MASKD / f'{vname}_{side}_{ti_deg}_{drop}.png', np.transpose(img, (1, 0, 2))[:, :, :])
        LOG['views'][f'{vname}_{side}'] = res
        print('VIEW', vname, side, json.dumps(res), flush=True)
OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(json.dumps(LOG, indent=1)); print('VIEWCOVER done', OUT, flush=True)

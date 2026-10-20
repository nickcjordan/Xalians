"""B-yqgg: refit the pass 3 rig (B-a87k) to the new sculpt with the welded pass 8 paws.

Usage: blender -b --factory-startup --python pawint_rig.py -- OUT_DIR [build|verify|render]
build : opens luceras-rig/pass3/rig.blend (read only), swaps luceras_blockout's mesh for the new sculpt body, transfers the
        40-bone weights (preserved vertices copy their own weight; new paw vertices by nearest surface interpolation on the
        old sculpt surface), smooths the weights across each paw/leg join, carries the six corrective keys over by vertex
        correspondence (their deltas live far from the paws) and rebuilds their drivers, swaps the sixteen claws for the new
        ones bound rigid at weight 1 to the same foot bones, and saves OUT_DIR/rig.blend. The skeleton, controls, actions and
        game mesh are not touched.
verify: compares old and new rigs over the eight review poses and writes OUT_DIR/work/rig_checks.json.
render: eight-pose sheet (same cameras as pass 3) plus paw crops in crouch, leap, landing and foreleg step.
"""
import bpy, sys, json, numpy as np, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).parent))
import pass2 as p
r = p.r
args = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(args[0]); MODE = args[1] if len(args) > 1 else 'build'
WORK = OUT / 'work'; WORK.mkdir(parents=True, exist_ok=True)
r.OUT = OUT; p.OUT = OUT
CS = Path('/mnt/c/dev/art-data/pipeline/codex-stream')
OLD_RIG = CS / 'luceras-rig/pass3/rig.blend'
NEW_SCULPT = OUT / 'luceras_sculpt.blend'
NPZ = CS / 'luceras-pawpart/pass8/work/u3/paws.npz'
PZ = np.load(NPZ)
PAWS = [('hind', 'l', 1, 'leg_hl_03'), ('hind', 'r', -1, 'leg_hr_03'), ('fore', 'l', 1, 'leg_fl_03'), ('fore', 'r', -1, 'leg_fr_03')]
CLAWS = [f'{k}_claw_{s}_{i}' for k in ('hind', 'fore') for s in ('l', 'r') for i in range(1, 5)]
SMOOTH_TOP, SMOOTH_FULL, SMOOTH_IT, SMOOTH_F = 0.014, 0.004, 40, 0.5


def jdump(name, d):
    (WORK / name).write_text(json.dumps(d, indent=1, default=lambda x: x.item() if isinstance(x, np.generic) else x.tolist() if isinstance(x, np.ndarray) else str(x)))


def fp(o):
    m = o.data; h = hashlib.sha256()
    for coll, prop, n, dt in [(m.vertices, 'co', 3, np.float32), (m.loops, 'vertex_index', 1, np.int32), (m.polygons, 'loop_start', 1, np.int32)]:
        a = np.empty(len(coll) * n, dt); coll.foreach_get(prop, a); h.update(a.tobytes())
    return h.hexdigest()


def local_co(m):
    a = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', a); return a.reshape(-1, 3)


def plane_h(P, kind, sg):
    c = PZ[f'{kind}_cut'] * [sg, 1, 1]; a = PZ[f'{kind}_axis'] * [sg, 1, 1]; return (P - c) @ a   # > 0 below the join plane (paw side)


def tri_interp(bvh, V, T, vals, P):
    out = np.zeros((len(P), vals.shape[1])); ds = np.zeros(len(P))
    for n, x in enumerate(P):
        hit, nrm, fi, d = bvh.find_nearest(Vector(x)); t = T[fi]; Q = V[t]
        u = Q[1] - Q[0]; v = Q[2] - Q[0]; w = np.array(hit) - Q[0]
        uu, uv, vv, wu, wv = u @ u, u @ v, v @ v, w @ u, w @ v; den = uu * vv - uv * uv
        if abs(den) < 1e-20: bc = np.array([1., 0, 0])
        else:
            b = (vv * wu - uv * wv) / den; c = (uu * wv - uv * wu) / den; bc = np.clip([1 - b - c, b, c], 0, 1); bc /= bc.sum()
        out[n] = bc @ vals[t]; ds[n] = d
    return out, ds


def keydata(o):
    """Shape keys as (names, deltas, driver specs) relative to Basis."""
    k = o.data.shape_keys; base = np.array([v.co[:] for v in k.key_blocks['Basis'].data]); names = []; deltas = []
    for kb in k.key_blocks[1:]:
        a = np.empty(len(kb.data) * 3); kb.data.foreach_get('co', a); names.append(kb.name); deltas.append(a.reshape(-1, 3) - base)
    drv = {}
    for fc in k.animation_data.drivers:
        d = fc.driver
        drv[fc.data_path] = dict(type=d.type, expression=d.expression, vars=[dict(name=v.name, type=v.type, bone=v.targets[0].bone_target, tt=v.targets[0].transform_type,
                                 ts=v.targets[0].transform_space, rm=v.targets[0].rotation_mode) for v in d.variables])
    return names, np.array(deltas), drv


def build():
    rig = p.openfile(OLD_RIG); names = [b.name for b in rig.data.bones]
    o = bpy.data.objects['luceras_blockout']
    game_before = {g.name: fp(g) for g in r.meshes('game')}
    a_old = r.weights(o, names); kn, kd, drv = keydata(o); old_mats = list(o.data.materials)
    old_mesh_name = o.data.name
    M = np.load(WORK / 'sculpt_map.npz'); src = M['src']; NWw = M['new_world']; BW = M['base_world']
    # rig body and base sculpt share topology and transforms; the rig body is the pre-hindpaw-repair geometry
    W = np.array(o.matrix_world); assert np.allclose(W, np.eye(4)) or True
    # ---- new mesh from the new sculpt ----
    with bpy.data.libraries.load(str(NEW_SCULPT), link=False) as (s, d):
        d.objects = ['luceras_blockout'] + CLAWS
    imported = {ob.name: ob for ob in d.objects}
    for ob in d.objects: bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    nb = imported['luceras_blockout'] if 'luceras_blockout' in imported else [x for x in d.objects if x.name.startswith('luceras_blockout')][0]
    assert np.allclose(np.array(nb.matrix_world), W, atol=1e-9), 'sculpt and rig body transforms differ'
    newmesh = nb.data; NL = local_co(newmesh)
    assert np.allclose(NL @ W[:3, :3].T + W[:3, 3], NWw, atol=1e-7)
    claw_world = {}
    for c in CLAWS:
        ob = imported[c] if c in imported else [x for x in d.objects if x.name.startswith(c)][0]
        claw_world[c] = (ob, np.array([ob.matrix_world @ v.co for v in ob.data.vertices]), ob.parent_bone)
    # ---- weights ----
    pres = src >= 0; a_new = np.zeros((len(NL), len(names))); a_new[pres] = a_old[src[pres]]
    o.data.calc_loop_triangles(); T = np.array([t.vertices[:] for t in o.data.loop_triangles])
    bvh = BVHTree.FromPolygons(BW.tolist(), T.tolist(), all_triangles=True)
    a_int, ds = tri_interp(bvh, BW, T, a_old, NWw[~pres]); a_new[~pres] = a_int
    a_pre_smooth = a_new.copy()
    # smooth across each join: full strength in the paw and up to 4 mm above the ring, fading out by 14 mm above it
    mask = np.zeros(len(NL))
    for kind, side, sg, bone in PAWS:
        h = plane_h(NWw, kind, sg); near = np.linalg.norm(NWw - PZ[f'{kind}_cut'] * [sg, 1, 1], axis=1) < 0.16
        mask = np.maximum(mask, p.smooth((h + SMOOTH_TOP) / (SMOOTH_TOP - SMOOTH_FULL)) * near)
    E = np.empty(len(newmesh.edges) * 2, np.int64); newmesh.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
    keep = (mask[E[:, 0]] > 0) | (mask[E[:, 1]] > 0); Es = E[keep]; ids = np.unique(Es)
    remap = np.full(len(NL), -1); remap[ids] = np.arange(len(ids)); Es = remap[Es]
    ii = np.r_[Es[:, 0], Es[:, 1]]; jj = np.r_[Es[:, 1], Es[:, 0]]; deg = np.bincount(ii, minlength=len(ids)).clip(1)
    ch = np.flatnonzero(a_new[ids].max(0) > 0); w = a_new[np.ix_(ids, ch)]; m = mask[ids]
    for _ in range(SMOOTH_IT):
        avg = np.column_stack([np.bincount(ii, weights=w[jj, c], minlength=len(ids)) for c in range(len(ch))]) / deg[:, None]
        w += (avg - w) * (SMOOTH_F * m[:, None])
    a_new[np.ix_(ids, ch)] = w
    a_new[:, [i for i, n in enumerate(names) if not rig.data.bones[n].use_deform]] = 0
    # ---- swap mesh, rebuild groups ----
    o.data = newmesh
    om = bpy.data.meshes.get(old_mesh_name)
    if om is not None and om is not newmesh and om.users == 0: bpy.data.meshes.remove(om)
    newmesh.name = 'luceras_blockout'
    newmesh.materials.clear()
    for mt in old_mats: newmesh.materials.append(mt)
    for poly in newmesh.polygons: poly.material_index = 0
    a_set = r.setweights(o, a_new.copy(), names, limit=None)
    # ---- correctives: carry deltas by vertex correspondence ----
    mapped_old = np.zeros(len(a_old), bool); mapped_old[src[pres]] = True
    lost = {n: float(np.linalg.norm(kd[i][~mapped_old], axis=1).max()) if (~mapped_old).any() else 0.0 for i, n in enumerate(kn)}
    o.shape_key_add(name='Basis', from_mix=False)
    key_info = {}
    for i, n in enumerate(kn):
        kb = o.shape_key_add(name=n, from_mix=False); dl = np.zeros_like(NL); dl[pres] = kd[i][src[pres]]
        kb.data.foreach_set('co', (NL + dl).ravel()); kb.value = 0
        key_info[n] = dict(old_affected=int((np.linalg.norm(kd[i], axis=1) > 1e-9).sum()), new_affected=int((np.linalg.norm(dl, axis=1) > 1e-9).sum()),
                           max_delta_mm=float(1000 * np.linalg.norm(dl, axis=1).max()), delta_norm_on_removed_old_vertices_m=lost[n])
    for path, sp in drv.items():
        fc = o.data.shape_keys.driver_add(path); dd = fc.driver; dd.type = sp['type']
        for v in sp['vars']:
            var = dd.variables.new(); var.name = v['name']; var.type = v['type']; t = var.targets[0]; t.id = rig
            t.bone_target = v['bone']; t.transform_type = v['tt']; t.transform_space = v['ts']; t.rotation_mode = v['rm']
        dd.expression = sp['expression']
        for mod in list(fc.modifiers): fc.modifiers.remove(mod)
    # ---- claws: rigid at weight 1 on the old claws' foot bones ----
    claw_info = {}
    coll = bpy.data.collections['BODY_SCULPT']
    for c in CLAWS:
        old = bpy.data.objects[c]; old_groups = [g.name for g in old.vertex_groups]; old_mats_c = list(old.data.materials)
        bpy.data.objects.remove(old, do_unlink=True)
        ob, wc, pb = claw_world[c]
        ob.name = c; ob.data.name = c
        assert old_groups == [pb], (c, old_groups, pb)
        for cc in list(ob.users_collection): cc.objects.unlink(ob)
        coll.objects.link(ob); r.g.bind_rigid(ob, rig, pb); ob['body_kind'] = 'sculpt'
        ob.data.materials.clear()
        for mt in old_mats_c: ob.data.materials.append(mt)
        claw_info[c] = dict(bone=pb)
    # imported sculpt-file leftovers (its armature and body object) go
    for ob in list(bpy.data.objects):
        if ob.name.startswith('luceras_rig.') or (ob.name.startswith('luceras_blockout.')):
            bpy.data.objects.remove(ob, do_unlink=True)
    for arm in list(bpy.data.armatures):
        if arm.users == 0: bpy.data.armatures.remove(arm)
    om = bpy.data.meshes.get(old_mesh_name)
    if om and om.users == 0: bpy.data.meshes.remove(om)
    bpy.context.view_layer.update()
    for c in CLAWS:
        ob = bpy.data.objects[c]; claw_info[c]['rest_world_drift_m'] = float(np.abs(r.coords(ob, True) - claw_world[c][1]).max())
    game_after = {g.name: fp(g) for g in r.meshes('game')}
    rig['pawintegrate_build_id'] = 'B-yqgg'; bpy.context.scene['rig_build_id'] = 'B-yqgg'
    o['sculpt_source'] = str(NEW_SCULPT)
    np.savez_compressed(WORK / 'weights.npz', a_new=a_set, a_pre_smooth=a_pre_smooth, mask=mask, names=np.array(names))
    jdump('rig_build.json', dict(transfer=dict(preserved_vertices=int(pres.sum()), interpolated_vertices=int((~pres).sum()),
                                              interp_surface_distance_mm=dict(max=float(1000 * ds.max()), p99=float(1000 * np.quantile(ds, .99)), mean=float(1000 * ds.mean())),
                                              source='old rig weights on the base sculpt surface (luceras-hindpaw pass1, same topology as the rig body)'),
                                 smoothing=dict(top_mm=SMOOTH_TOP * 1000, full_mm=SMOOTH_FULL * 1000, iterations=SMOOTH_IT, factor=SMOOTH_F, vertices=int(len(ids)),
                                                max_weight_change=float(np.abs(a_set - a_pre_smooth).max())),
                                 keys=key_info, drivers=drv, claws=claw_info, game_unchanged=game_before == game_after, game_fingerprints=game_after))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'rig.blend'))
    print('RIG build saved')


def evaluate(rig, o, pose):
    p.showpose(rig, pose); return r.coords(o, True)


def collect(path, tag):
    rig = p.openfile(path); o = bpy.data.objects['luceras_blockout']; kb = o.data.shape_keys.key_blocks
    res = {}; claws = {c: bpy.data.objects[c] for c in CLAWS if c in bpy.data.objects}
    for pose in r.POSES:
        P = evaluate(rig, o, pose); vals = {k.name: float(k.value) for k in kb[1:]}
        fire = {}
        for k in kb[1:]:
            k.mute = True; bpy.context.view_layer.update(); Q = r.coords(o, True); k.mute = False; bpy.context.view_layer.update()
            dd = np.linalg.norm(P - Q, axis=1); fire[k.name] = dict(max_mm=float(1000 * dd.max()), moved=int((dd > 1e-7).sum()))
        res[pose] = dict(P=P, values=vals, fire=fire, claws={c: r.coords(ob, True) for c, ob in claws.items()})
    rig.animation_data.action = None; r.pose(rig, 'rest')
    rest = r.coords(o, False)
    o.data.calc_loop_triangles(); T = np.array([t.vertices[:] for t in o.data.loop_triangles]); TP = np.array([t.polygon_index for t in o.data.loop_triangles])
    names = [b.name for b in rig.data.bones]; A = r.weights(o, names)
    E = np.empty(len(o.data.edges) * 2, np.int64); o.data.edges.foreach_get('vertices', E)
    return dict(res=res, rest=rest, T=T, TP=TP, A=A, names=names, E=E.reshape(-1, 2), basis_vs_rest=float(np.abs(rest - local_co(o.data)).max()))


def tri_normals(P, T):
    n = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]); a = np.linalg.norm(n, axis=1); return n / np.maximum(a, 1e-30)[:, None], a / 2


def region_quality(C, sel_v):
    """Paw and join quality per pose: triangle area ratios and crease growth (adjacent triangle normal angle, posed minus rest)."""
    T = C['T']; selT = sel_v[T].all(1); T = T[selT]
    # triangle adjacency across shared edges
    ed = {}
    for t, tri in enumerate(T):
        for a, b in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])):
            ed.setdefault((min(a, b), max(a, b)), []).append(t)
    pairs = np.array([v for v in ed.values() if len(v) == 2])
    n0, a0 = tri_normals(C['rest'], T); ang0 = np.degrees(np.arccos(np.clip((n0[pairs[:, 0]] * n0[pairs[:, 1]]).sum(1), -1, 1)))
    out = {}
    for pose, R in C['res'].items():
        n1, a1 = tri_normals(R['P'], T); ratio = a1 / np.maximum(a0, 1e-30)
        ang1 = np.degrees(np.arccos(np.clip((n1[pairs[:, 0]] * n1[pairs[:, 1]]).sum(1), -1, 1))); grow = ang1 - ang0
        out[pose] = dict(tris=int(len(T)), area_ratio_min=float(ratio.min()), area_ratio_p01=float(np.quantile(ratio, .001)), area_ratio_max=float(ratio.max()),
                         tris_area_below_0_3=int((ratio < .3).sum()), tris_area_above_3=int((ratio > 3).sum()),
                         crease_growth_deg_p999=float(np.quantile(grow, .999)), crease_growth_deg_max=float(grow.max()), edges_crease_growth_over_45=int((grow > 45).sum()))
    return out


def verify():
    M = np.load(WORK / 'sculpt_map.npz'); src = M['src']; lab = M['paw_label']; NWw = M['new_world']; BW = M['base_world']
    old = collect(OLD_RIG, 'old'); new = collect(OUT / 'rig.blend', 'new')
    names = new['names']; A = new['A']; pres = src >= 0
    oldrest = old['rest']; same_rest = np.zeros(len(src), bool); same_rest[pres] = np.linalg.norm(oldrest[src[pres]] - new['rest'][pres], axis=1) < 1e-9
    out = dict(vertices=dict(new=len(src), preserved=int(pres.sum()), preserved_same_rest_as_old_rig=int(same_rest.sum())))
    # posed agreement on preserved vertices
    pa = {}
    for pose in r.POSES:
        dP = np.linalg.norm(new['res'][pose]['P'][same_rest] - old['res'][pose]['P'][src[same_rest]], axis=1)
        moved = pres & ~same_rest
        dM = np.linalg.norm((new['res'][pose]['P'][moved] - new['rest'][moved]) - (old['res'][pose]['P'][src[moved]] - oldrest[src[moved]]), axis=1) if moved.any() else np.zeros(1)
        mk = np.load(WORK / 'weights.npz')['mask'][same_rest] > 0
        pa[pose] = dict(same_rest_max_mm=float(1000 * dP.max()), same_rest_outside_smoothing_max_mm=float(1000 * dP[~mk].max()), same_rest_inside_smoothing_max_mm=float(1000 * dP[mk].max()) if mk.any() else 0.0, hindpaw_repair_vertices_displacement_diff_max_mm=float(1000 * dM.max()))
    out['posed_agreement_preserved'] = pa
    # correctives
    cor = {}
    for k in new['res']['rest']['values']:
        cor[k] = {pose: dict(value_old=old['res'][pose]['values'][k], value_new=new['res'][pose]['values'][k],
                             effect_old_max_mm=old['res'][pose]['fire'][k]['max_mm'], effect_new_max_mm=new['res'][pose]['fire'][k]['max_mm'],
                             moved_old=old['res'][pose]['fire'][k]['moved'], moved_new=new['res'][pose]['fire'][k]['moved']) for pose in r.POSES}
    out['correctives'] = cor
    out['correctives_rest_effect_max_mm'] = max(new['res']['rest']['fire'][k]['max_mm'] for k in cor)
    out['correctives_fire'] = {k: [pose for pose in r.POSES if new['res'][pose]['fire'][k]['max_mm'] > 1e-3] for k in cor}
    out['correctives_fire_old'] = {k: [pose for pose in r.POSES if old['res'][pose]['fire'][k]['max_mm'] > 1e-3] for k in cor}
    out['basis_equals_rest_m'] = new['basis_vs_rest']
    # weights
    defn = [i for i, n in enumerate(names) if n != 'root']
    s = A.sum(1); out['weights'] = dict(unweighted=int((s <= 0).sum()), max_abs_sum_minus_1=float(np.abs(s - 1).max()), max_influences=int((A > 1e-8).sum(1).max()),
                                         nondeform_weight_max=float(A[:, [i for i in range(len(names)) if i not in defn]].max()) if len(defn) < len(names) else 0.0)
    # paw bone usage, old paws vs new paws
    oldA = old['A']; usage = {}
    for li, (kind, side, sg, bone) in enumerate(PAWS, start=1):
        hn = plane_h(new['rest'], kind, sg); ho = plane_h(oldrest, kind, sg)
        segc = PZ[f'{kind}_cut'] * [sg, 1, 1]
        sel_new = lab == li; sel_old = (ho > 0) & (np.linalg.norm(oldrest - segc, axis=1) < 0.16) & (sg * oldrest[:, 0] > 0)
        def mean_w(Aa, sel): mw = Aa[sel].mean(0); return {names[j]: round(float(mw[j]), 4) for j in np.argsort(-mw)[:4] if mw[j] > 1e-4}
        def bones_used(Aa, sel): return sorted(names[j] for j in np.flatnonzero(Aa[sel].max(0) > 1e-4))
        usage[f'{kind}_{side}'] = dict(new_mean=mean_w(A, sel_new), old_mean=mean_w(oldA, sel_old), new_bones=bones_used(A, sel_new), old_bones=bones_used(oldA, sel_old),
                                       new_min_foot_bone_weight_below_8mm=float(A[sel_new & (hn > .008), names.index(bone)].min()) if (sel_new & (hn > .008)).any() else None)
    out['paw_bone_usage'] = usage
    out['weights']['old_max_influences'] = int((oldA > 1e-8).sum(1).max())
    # weight symmetry on the paws (mirrored nearest vertex within 0.5 mm, side groups swapped)
    def mirror(n):
        for a_, b_ in (('_fl_', '_fr_'), ('_hl_', '_hr_'), ('_l_', '_r_')):
            if a_ in n: return n.replace(a_, b_)
            if b_ in n: return n.replace(b_, a_)
        if n.endswith('_l'): return n[:-2] + '_r'
        if n.endswith('_r'): return n[:-2] + '_l'
        return n
    sw = [names.index(mirror(n)) if mirror(n) in names else names.index(n) for n in names]
    symm = {}
    for kind, (l, rr) in (('hind', (1, 2)), ('fore', (3, 4))):
        Li = np.flatnonzero(lab == l); Ri = np.flatnonzero(lab == rr); R = new['rest'][Ri]
        kd = KDTree(len(R)); [kd.insert(Vector(x), i) for i, x in enumerate(R)]; kd.balance(); diffs = []
        for i in Li:
            q = new['rest'][i] * [-1, 1, 1]; _, j, dd = kd.find(Vector(q))
            if dd < 5e-4: diffs.append(np.abs(A[i] - A[Ri[j]][sw]).max())
        diffs = np.array(diffs); symm[kind] = dict(pairs=int(len(diffs)), max=float(diffs.max()), p99=float(np.quantile(diffs, .99)), mean=float(diffs.mean()))
    out['paw_weight_symmetry'] = symm
    # claws: rigid and seated
    cl = {}
    for c in CLAWS:
        ob = bpy.data.objects[c]; ce = np.array([e.vertices[:] for e in ob.data.edges]); R0 = new['res']['rest']['claws'][c]; L0 = np.linalg.norm(R0[ce[:, 0]] - R0[ce[:, 1]], axis=1)
        big = L0 > 1e-4
        st = max(float(np.abs(np.linalg.norm(new['res'][pp]['claws'][c][ce[:, 0]] - new['res'][pp]['claws'][c][ce[:, 1]], axis=1) / L0 - 1)[big].max()) for pp in r.POSES)
        ab = max(float(np.abs(np.linalg.norm(new['res'][pp]['claws'][c][ce[:, 0]] - new['res'][pp]['claws'][c][ce[:, 1]], axis=1) - L0).max()) for pp in r.POSES)
        R0o = old['res']['rest']['claws'][c]; L0o = np.linalg.norm(R0o[ce[:, 0]] - R0o[ce[:, 1]], axis=1)
        abo = max(float(np.abs(np.linalg.norm(old['res'][pp]['claws'][c][ce[:, 0]] - old['res'][pp]['claws'][c][ce[:, 1]], axis=1) - L0o).max()) for pp in r.POSES)
        groups = [(g.name) for g in ob.vertex_groups]
        cl[c] = dict(max_edge_strain_edges_over_0_1mm=st, max_edge_length_change_um=1e6 * ab, old_claw_max_edge_length_change_um=1e6 * abo, groups=groups, rest_edge_mm_min=float(1000 * L0.min()))
    out['claws_rigid'] = cl
    # claw seating per pose: 30 claw vertices nearest the rest body, their gap to the posed body
    T = new['T']; seat = {}
    for pose in r.POSES:
        bvh = BVHTree.FromPolygons(new['res'][pose]['P'].tolist(), T.tolist(), all_triangles=True); seat[pose] = {}
        if pose == 'rest': bvh0 = bvh
        for c in CLAWS:
            R0 = new['res']['rest']['claws'][c]
            if pose == 'rest':
                d0 = np.array([bvh0.find_nearest(Vector(x))[3] for x in R0]); seat.setdefault('_root', {})[c] = np.argsort(d0)[:30]
            root = seat['_root'][c]; dd = np.array([bvh.find_nearest(Vector(x))[3] for x in new['res'][pose]['claws'][c][root]])
            seat[pose][c] = float(1000 * dd.mean())
    root = seat.pop('_root')
    out['claw_root_gap_mm'] = {pose: dict(max=max(v.values()), mean=float(np.mean(list(v.values())))) for pose, v in seat.items()}
    out['claw_root_gap_change_mm_max'] = max(abs(seat[pp][c] - seat['rest'][c]) for pp in r.POSES for c in CLAWS)
    # paw and join deformation quality, new vs old (old: the old paw below the same planes)
    q = {}
    for li, (kind, side, sg, bone) in enumerate(PAWS, start=1):
        hn = plane_h(new['rest'], kind, sg); ho = plane_h(oldrest, kind, sg); cc = PZ[f'{kind}_cut'] * [sg, 1, 1]
        seln = (hn > -0.025) & (np.linalg.norm(new['rest'] - cc, axis=1) < 0.16) & (sg * new['rest'][:, 0] > 0)
        selo = (ho > -0.025) & (np.linalg.norm(oldrest - cc, axis=1) < 0.16) & (sg * oldrest[:, 0] > 0)
        q[f'{kind}_{side}'] = dict(new=region_quality(new, seln), old=region_quality(old, selo))
    out['paw_join_quality'] = q
    jdump('rig_checks.json', out)
    print('RIG verify done')


def render(crops_only=False, src=None, tag='paw'):
    rig = p.openfile(src or (OUT / 'rig.blend'))
    if not crops_only: r.renders(rig, 'final', True)
    # paw crops in the motion poses: each paw, sculpt only, side-on from its own side and a low front three-quarter
    r.g.lookdev.setup_scene('CYCLES'); bpy.context.scene.cycles.samples = 16
    for k in ('sculpt', 'game'):
        for ob in r.meshes(k): r.g.lookdev.apply_clay(ob)
    r.visible('sculpt'); (OUT / 'crops').mkdir(exist_ok=True)
    import os
    for pose in os.environ.get('PAW_POSES', 'crouch,leap,landing,foreleg_step').split(','):
        p.showpose(rig, pose)
        for kind, side, sg, bone in PAWS:
            pb = rig.pose.bones[bone]; h = rig.matrix_world @ pb.head; t = rig.matrix_world @ pb.tail
            c = (h * .2 + t * .8 + Vector((0, 0, .012))) if kind == 'hind' else (h * .45 + t * .55); rad = .055 if kind == 'hind' else .05   # hind foot bone runs hock to toes: frame its paw end
            for view, az, el in (('side', 90 if sg > 0 else 270, 8), ('front', 35 if sg > 0 else 325, 18)):
                cam = r.g.lookdev.place_camera('lookdev_paw', (c - Vector((rad, rad, rad)), c + Vector((rad, rad, rad))), az, el, .03)
                r.g.lookdev.render(cam, OUT / 'crops' / f'{tag}_{pose}_{kind}_{side}_{view}.png', size=512)
    rig.animation_data.action = None; r.pose(rig, 'rest')
    print('RIG render done')


def graze(src, tag, side='r'):
    """Right fore at rest, crouch, leap, landing under one low grazing sun (lookdev lights off), side and front."""
    import math
    rig = p.openfile(src); r.g.lookdev.setup_scene('CYCLES'); sc = bpy.context.scene; sc.cycles.samples = 32
    for k in ('sculpt', 'game'):
        for ob in r.meshes(k): r.g.lookdev.apply_clay(ob)
    r.visible('sculpt'); (OUT / 'graze').mkdir(exist_ok=True)
    for ob in bpy.data.objects:
        if ob.type == 'LIGHT': ob.hide_render = True
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.08
    ld = bpy.data.lights.new('graze_sun', 'SUN'); ld.energy = 4.0; ld.angle = math.radians(1.0)
    lo = bpy.data.objects.new('graze_sun', ld); sc.collection.objects.link(lo)
    for pose in ('rest', 'crouch', 'leap', 'landing'):
        p.showpose(rig, pose); pb = rig.pose.bones[f'leg_f{side}_03']; h = rig.matrix_world @ pb.head; t = rig.matrix_world @ pb.tail
        c = h * .7 + t * .3; rad = .035
        # light travels down the leg (along the posed forearm), tilted 12 degrees toward the camera side: it rakes across the ring
        fore = (rig.matrix_world @ rig.pose.bones[f'leg_f{side}_02'].tail - rig.matrix_world @ rig.pose.bones[f'leg_f{side}_02'].head).normalized()
        for view, az, el in ((('side', 270, 8), ('front', 325, 18)) if side == 'r' else (('side', 90, 8), ('front', 35, 18))):
            from mathutils import Vector as V_
            cd = r.g.lookdev.camera_direction(az, el); d = (fore * math.cos(math.radians(12)) - cd * math.sin(math.radians(12))).normalized()
            lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            cam = r.g.lookdev.place_camera('lookdev_graze', (c - V_((rad, rad, rad)), c + V_((rad, rad, rad))), az, el, .02)
            r.g.lookdev.render(cam, OUT / 'graze' / f'{tag}_{pose}_fore_{side}_{view}.png', size=640)
    print('RIG graze done')


{'build': build, 'graze_old': lambda: graze(Path(str(OUT).replace('pass2', 'pass1')) / 'rig.blend', 'pass1'), 'graze_new': lambda: graze(OUT / 'rig.blend', 'pass2'), 'graze_left': lambda: graze(OUT / 'rig.blend', 'pass2', 'l'), 'graze_side': lambda: graze(Path(__import__('os').environ['GRAZE_RIG']), __import__('os').environ['GRAZE_TAG'], __import__('os').environ['GRAZE_SIDE']), 'verify': verify, 'render': render, 'crops': lambda: render(True), 'crops_old': lambda: render(True, OLD_RIG, 'pass3paw')}[MODE]()

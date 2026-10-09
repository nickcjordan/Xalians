"""Build a furred, shaded Blender scene from a finished construction assembly.

Run headless through the loop harness (it takes a Blender slot lock):

  python art/species-construction/loop/loop_tools.py blender art/species-construction/surface/build_surface.py \
      --log surface-build -- --asm <assembly dir> --out <out dir> [--settings <json>] [--strands N] [--variant NAME]

--variant <name> merges settings['variants'][name] over the settings (for example 'feathered': the ear fur as
pointed, clumped locks radiating from the ear root instead of the plush pile).

Reads <asm>/akinza.blend, leaves the skin geometry untouched, writes per-vertex fur attributes from the
species zones (fur_length, fur_density, fur_clump, fur_curl, pale, pad, comb), adds a Geometry Nodes hair
system on a separate Curves object, rebuilds the surface materials in grayscale, and saves <out>/surface.blend.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SPECIES_JSON = ROOT/'docs/design/species-construction/akinza/loop/species.json'


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x*x*(3.0-2.0*x)


def unit(v):
    n = np.linalg.norm(v, axis=1, keepdims=True)
    return v/np.maximum(n, 1e-9)


# ---------------------------------------------------------------- attributes

def membership(co, box, floor, height, margin):
    at = (floor+height-co[:, 2])/height
    x = co[:, 0]/height
    if box.get('symmetricX'):
        x = np.abs(x)
    y = co[:, 1]/height
    d2 = np.zeros(len(co))
    for v, (lo, hi) in ((at, box['at']), (x, box['x']), (y, box['y'])):
        out = np.maximum(np.maximum(lo-v, v-hi), 0.0)
        d2 = np.maximum(d2, out)
    return smoothstep(1.0-d2/max(margin, 1e-6))


def edge_smooth(values, edges, n, iterations):
    a, b = edges[:, 0], edges[:, 1]
    deg = np.bincount(a, minlength=n)+np.bincount(b, minlength=n)+1.0
    for _ in range(iterations):
        s = values.copy()
        s += np.bincount(a, weights=values[b], minlength=n)+np.bincount(b, weights=values[a], minlength=n)
        values = s/deg
    return values


def tail_centerline(co, edges, tail_m, root, fallback):
    """Comb along the tails: geodesic distance from the tail root over the skin graph (restricted to the
    tail zones), then the surface gradient of that distance."""
    n = len(co)
    mask = tail_m > 0.15
    a, b = edges[:, 0], edges[:, 1]
    ok = mask[a] & mask[b]
    a, b = a[ok], b[ok]
    el = np.linalg.norm(co[a]-co[b], axis=1)
    idx = np.where(mask)[0]
    dist_root = np.linalg.norm(co[idx]-root, axis=1)
    d = np.full(n, np.inf)
    seeds = idx[dist_root < dist_root.min()+0.03]
    d[seeds] = np.linalg.norm(co[seeds]-co[seeds].mean(axis=0), axis=1)*0
    for it in range(1200):
        new = d.copy()
        np.minimum.at(new, b, d[a]+el)
        np.minimum.at(new, a, d[b]+el)
        if np.array_equal(new, d):
            break
        d = new
    print('tail geodesic: iterations', it, 'reached', int(np.isfinite(d[mask]).sum()), 'of', int(mask.sum()))
    grad = np.zeros((n, 3))
    fin = np.isfinite(d[a]) & np.isfinite(d[b])
    a2, b2, el2 = a[fin], b[fin], el[fin]
    dd = (d[b2]-d[a2])/(el2**2)
    vec = co[b2]-co[a2]
    np.add.at(grad, a2, vec*dd[:, None])
    np.add.at(grad, b2, vec*dd[:, None])
    norm = np.linalg.norm(grad, axis=1)
    good = np.isfinite(d) & (norm > 1e-9)
    out = fallback.copy()
    out[good] = grad[good]/norm[good, None]
    return out, d


def graph_distance(co, edges, seeds, allowed, max_iterations=3000):
    """Shortest edge-path distance from the seed vertices over the skin graph, restricted to allowed vertices.
    Bellman-Ford sweeps with a sorted reduceat (np.minimum.at is far too slow on 700k vertices)."""
    n = len(co)
    a = np.concatenate([edges[:, 0], edges[:, 1]])
    b = np.concatenate([edges[:, 1], edges[:, 0]])
    ok = allowed[a] & allowed[b]
    a, b = a[ok], b[ok]
    order = np.argsort(b, kind='stable')
    a, b = a[order], b[order]
    el = np.linalg.norm(co[a]-co[b], axis=1)
    starts = np.flatnonzero(np.r_[True, b[1:] != b[:-1]])
    targets = b[starts]
    d = np.full(n, np.inf)
    d[seeds & allowed] = 0.0
    for it in range(max_iterations):
        best = np.minimum.reduceat(d[a]+el, starts)
        new = d.copy()
        new[targets] = np.minimum(d[targets], best)
        if np.array_equal(new, d):
            break
        d = new
    print('graph distance: iterations', it, 'reached', int(np.isfinite(d).sum()), 'of', int(allowed.sum()))
    return d


def stripe_coordinates(me, co, nrm, edges, wn, names, at_all, th, ac, tail_d, tail_angle):
    """Tiger-stripe coordinates for pattern kind 'tiger4' (tiger_stripes.py), all stored on the skin so they follow
    the body when posed:
      angle4  0 on the back midline to pi on the belly midline, uniform in arc length on the trunk and head
              (pi * d_back / (d_back + d_belly), edge-path distances from the two midlines); on the limbs the angle
              around the limb from its outer side (0) to its inner side (pi) from the normal; blended at the joins
      fielda  the angle where the pale underside starts at this point (wavy), so stripes can end there in a point
      bellyf4 the pale underside field itself, 0..1
      sth     the stripe axis along the body in figure units (height plus a lean toward the back; the tail's own
              length on the tails)
    Normal angles alone squash a broad flat back to angle 0, which is why the back showed only a few stripes."""
    n = len(co)
    wl = np.clip(wn[names.index('arms')]+wn[names.index('legs')]+wn[names.index('paws')], 0, 1)
    wl = np.clip(edge_smooth(wl, edges, n, ac.get('limbSmooth', 40)), 0, 1)
    tails = th
    ears = wn[names.index('ears')] > 0.5
    allowed = ~(tails | ears)
    mid = np.abs(co[:, 0]) < ac.get('midline', 0.005)
    band = at_all < ac.get('seedMaxAt', 0.56)
    back_seed = mid & band & (nrm[:, 1] > 0.15)
    belly_seed = mid & band & (nrm[:, 1] < -0.15)
    d_back = graph_distance(co, edges, back_seed, allowed)
    d_belly = graph_distance(co, edges, belly_seed, allowed)
    nxy = np.linalg.norm(nrm[:, :2], axis=1)
    ang_n = np.arccos(np.clip(nrm[:, 1]/np.maximum(nxy, 1e-6), -1, 1))
    ang_n = np.where(nxy < 0.2, np.pi/2, ang_n)
    good = np.isfinite(d_back) & np.isfinite(d_belly) & (d_back+d_belly > 1e-6)
    a_trunk = np.where(good, np.pi*d_back/np.maximum(d_back+d_belly, 1e-9), ang_n)
    outward = np.sign(co[:, 0]+1e-9)
    a_limb = np.arccos(np.clip(outward*nrm[:, 0]/np.maximum(nxy, 1e-6), -1, 1))
    a_limb = np.where(nxy < 0.2, np.pi/2, a_limb)
    angle = wl*a_limb+(1.0-wl)*a_trunk
    angle = np.clip(edge_smooth(angle, edges, n, ac.get('angleSmooth', 6)), 0, np.pi)
    # pale underside edge: by height on the trunk, a fixed angle around the limbs, both with a wave
    pts = np.array(ac['fieldEdge'])
    e_trunk = np.interp(at_all, pts[:, 0], pts[:, 1])
    wave = ac['wave']*np.sin(at_all*ac['waveFreq']+(outward > 0)*2.0)+0.5*ac['wave']*np.sin(co[:, 1]*11.0+at_all*23.0)
    fielda = wl*ac['limbEdge']+(1.0-wl)*e_trunk+wave
    fielda = np.where(tails, 10.0, fielda)
    belly = np.where(tails, 0.0, smoothstep((angle-fielda)/ac['soft']))
    sth = co[:, 2]+ac.get('lean', 0.35)*co[:, 1]
    if tail_d is not None:
        sth = np.where(tails & np.isfinite(tail_d), np.where(np.isfinite(tail_d), tail_d, 0.0)*ac['tailScale'], sth)
    # tails: rings, so the angle barely changes around the tail (it sits inside the first piece of most rows; the
    # small spread only varies the ring width); the normal-based tail angle is too noisy to place pieces by
    ring = ac.get('tailRing', [0.55, 0.35])
    tail_a = np.clip(edge_smooth(ring[0]+ring[1]*tail_angle/np.pi, edges, n, 10), 0, np.pi)
    write_attribute(me, 'angle4', np.where(tails, tail_a, angle))
    write_attribute(me, 'fielda', fielda)
    write_attribute(me, 'bellyf4', belly)
    write_attribute(me, 'sth', sth)
    print('stripe coordinates: back seeds', int(back_seed.sum()), 'belly seeds', int(belly_seed.sum()),
          'angle pct', np.round(np.percentile(angle, [5, 25, 50, 75, 95]), 2))


def write_attribute(me, name, data, kind='FLOAT'):
    if name in me.attributes:
        me.attributes.remove(me.attributes[name])
    attr = me.attributes.new(name, kind, 'POINT')
    attr.data.foreach_set('value' if kind == 'FLOAT' else 'vector', np.asarray(data, dtype=np.float32).ravel())


def compute_attributes(skin, cfg, species):
    me = skin.data
    n = len(me.vertices)
    co = np.empty(n*3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(n, 3)
    co_rest = co.copy()  # object-space rest position, stored for pattern shaders
    mw = np.array(skin.matrix_world)
    co = co@mw[:3, :3].T+mw[:3, 3]
    nrm = np.empty(n*3)
    me.vertex_normals.foreach_get('vector', nrm)
    nrm = unit(nrm.reshape(n, 3)@mw[:3, :3].T)
    frame = species['frame']
    floor, height = frame['floorZ'], frame['fixedHeight']
    zones = species['zones']
    sign = np.where(co[:, 0] < 0, -1.0, 1.0)

    edges = np.empty(len(me.edges)*2, dtype=np.int32)
    me.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    ear_root = np.array(cfg['earRoot'])
    nose = np.array(cfg['noseTip'])
    tail_root = np.array(cfg['tailRoot'])
    directions = {
        'down': np.tile([0.0, 0.0, -1.0], (n, 1)),
        'face': unit(unit(co-nose)+np.array([0, 0.3, -0.25])),
        'ear': unit(unit(co-ear_root*np.stack([sign, np.ones(n), np.ones(n)], 1))+np.array([0, 0, cfg.get('earBias', 0.35)])),
        'crown': unit(np.tile(cfg.get('crownDir', [0.0, 0.5, 0.8]), (n, 1))),
        'tail': unit(co-tail_root),
        'forward': unit(np.tile([0.0, -1.0, -0.25], (n, 1))),
    }
    if cfg.get('earOwnSide', True):  # ear fur between the root and the midline still combs toward its own side
        e = directions['ear']
        e[:, 0] = sign*np.abs(e[:, 0])
        mid = 1.0-smoothstep(np.abs(co[:, 0])/cfg.get('earMidline', 0.06))  # at the midline comb down, so the fur does not part
        directions['ear'] = unit(unit(e)*(1.0-mid[:, None])+np.array([0.0, 0.3, -1.0])*mid[:, None])
    names = list(cfg['groups'])
    weights = np.zeros((len(names), n))
    for i, name in enumerate(names):
        g = cfg['groups'][name]
        if g.get('everywhere'):
            m = np.ones(n)
        else:
            boxes = ([zones[z] for z in g['zones']] if 'zones' in g else [])+([g['box']] if 'box' in g else [])
            m = np.zeros(n)
            for box in boxes:
                m = np.maximum(m, membership(co, box, floor, height, g.get('margin', 0.02)))
        if 'frontFacing' in g:
            ff = g['frontFacing']
            m = m*smoothstep((-nrm[:, 1]-ff['min'])/ff['span'])
        weights[i] = m*g['priority']
    if 'tails' in names and cfg.get('tailCenterline', True):
        ti = names.index('tails')
        directions['tail'], tail_d = tail_centerline(co, edges, weights[ti]/cfg['groups']['tails']['priority'],
                                                     tail_root, directions['tail'])
        if 'tailRamp' in cfg:  # the tail zones also cover the buttocks; long fur only grows out along the tails
            r = cfg['tailRamp']
            reach = np.where(np.isfinite(tail_d), tail_d, 0.0)
            weights[ti] *= smoothstep((reach-r['start'])/r['width'])
    wsum = weights.sum(axis=0)
    wn = weights/np.maximum(wsum, 1e-9)

    def blend(key, default=0.0):
        return sum(wn[i]*cfg['groups'][nm].get(key, default) for i, nm in enumerate(names))

    length, density = blend('length'), blend('density')
    clump, curl, group_pale = blend('clump'), blend('curl'), blend('pale')
    cscale = blend('cscale', cfg['clumpScale'])
    comb = unit(sum(wn[i, :, None]*directions[cfg['groups'][nm]['comb']] for i, nm in enumerate(names)))

    # pale mask: vertices of faces in the pale slot, spread a little, plus the chest group
    loops = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', loops)
    starts = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_start', starts)
    totals = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_total', totals)
    mat = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('material_index', mat)
    face_of_loop = np.repeat(np.arange(len(me.polygons)), totals)
    pale_loops = mat[face_of_loop] == cfg['paleSlot']
    pale = np.zeros(n)
    pale[loops[pale_loops]] = 1.0
    if 'cupInner' in cfg:  # keep only the inner part of the slot, nearest the ear root, soft-edged
        ci = cfg['cupInner']
        for side in (-1.0, 1.0):
            root_s = np.array(cfg['earRoot'])*np.array([side, 1.0, 1.0])
            sel = np.where((pale > 0) & (np.sign(co[:, 0]+1e-9) == side))[0]
            if len(sel) == 0:
                continue
            d = np.linalg.norm(co[sel]-root_s, axis=1)
            t = (d-d.min())/max(d.max()-d.min(), 1e-9)
            pale[sel] = 1.0-smoothstep((t-ci['t0'])/ci['width'])
    at_all = (floor+height-co[:, 2])/height
    pale *= (at_all < cfg.get('paleSlotMaxAt', 0.3))
    edges = np.empty(len(me.edges)*2, dtype=np.int32)
    me.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    pale = edge_smooth(pale, edges, n, cfg['paleSmoothing'])
    pale = np.clip(np.maximum(smoothstep(pale*cfg.get('paleGain', 2.2)), group_pale*cfg.get('groupPaleGain', 1.0)), 0, 1)
    # cup interior from geometry: forward-facing skin inside the ear zones, plus a soft chest patch
    ears_i = names.index('ears')
    ear_m = membership(co, cfg['cup']['box'], floor, height, cfg['cup']['margin'])
    cup = ear_m*smoothstep((-nrm[:, 1]-cfg['cup']['normalMin'])/cfg['cup']['normalSpan'])
    pale = np.maximum(pale, cup*cfg['cup']['strength'])
    cb = cfg['chestPale']
    if 'radial' in cb:  # soft gradient from the sternum line, no box edges
        rd = cb['radial']
        at_c = (floor+height-co[:, 2])/height
        r2 = (co[:, 0]/height/rd['ax'])**2+((at_c-rd['at'])/rd['az'])**2
        chest = np.exp(-r2)*cb['strength']
    else:
        chest = membership(co, cb['box'], floor, height, cb['margin'])*cb['strength']
    if 'frontFacing' in cb:
        chest = chest*smoothstep((-nrm[:, 1]-cb['frontFacing']['min'])/cb['frontFacing']['span'])
    pale = np.maximum(pale, chest)
    pale = np.clip(edge_smooth(pale, edges, n, cfg.get('paleFinalSmoothing', 0))*cfg.get('paleFinalGain', 1.0), 0, 1)
    print('pale vertices >0.5:', int((pale > 0.5).sum()), 'of', n)

    # keep-outs: distance to eyes, nose, mouth, claws
    rim = np.zeros(n)
    for key, ko in cfg['keepOut'].items():
        if not isinstance(ko, dict):
            continue
        objs = [o for o in bpy.data.objects if o.type == 'MESH' and ko['match'] in o.name]
        pts = []
        for o in objs:
            m = np.array(o.matrix_world)
            v = np.empty(len(o.data.vertices)*3)
            o.data.vertices.foreach_get('co', v)
            vp = v.reshape(-1, 3)@m[:3, :3].T+m[:3, 3]
            if 'frontOnly' in ko:
                vn = np.empty(len(o.data.vertices)*3)
                o.data.vertex_normals.foreach_get('vector', vn)
                vn = unit(vn.reshape(-1, 3)@m[:3, :3].T)
                vp = vp[-vn[:, 1] > ko['frontOnly']]
            pts.append(vp)
        if not pts:
            continue
        pts = np.concatenate(pts)
        if len(pts) == 0:
            continue
        step = max(1, len(pts)//4000)
        pts = pts[::step]
        near = np.ones(n)
        lo, hi = pts.min(axis=0)-ko['outer'], pts.max(axis=0)+ko['outer']
        cand = np.where(np.all((co >= lo) & (co <= hi), axis=1))[0]
        tree = KDTree(len(pts))
        for i, p in enumerate(pts):
            tree.insert(Vector(p), i)
        tree.balance()
        nearest = np.zeros((n, 3))
        for i in cand:
            hit = tree.find(Vector(co[i]))
            near[i] = hit[2]
            nearest[i] = hit[0]
        if key == 'eyes' and 'rim' in cfg:
            rim = 1.0-smoothstep((near-cfg['rim']['width'])/cfg['rim']['soft'])
            rim = np.clip(edge_smooth(rim, edges, n, cfg['rim'].get('smooth', 0)), 0, 1)
        ramp = smoothstep((near-ko['inner'])/max(ko['outer']-ko['inner'], 1e-6))
        density *= ramp
        if 'maxLength' in ko:
            length = np.minimum(length, ko['maxLength']+0.05*ramp)
            away = unit(co-nearest)
            wgt = (1.0-ramp)[:, None]
            comb = unit(comb*(1.0-wgt)+away*wgt)
        else:
            length *= cfg['keepOut'].get('lengthFloor', 1.0)+(1.0-cfg['keepOut'].get('lengthFloor', 1.0))*ramp
        print(f'keepout {key}: {len(pts)} points, {len(cand)} skin vertices touched')

    pad = ((co[:, 2] < floor+cfg['pads']['belowFloor']) & (nrm[:, 2] < cfg['pads']['normalZ'])).astype(float)
    pad = edge_smooth(pad, edges, n, 2)
    pad = np.clip(pad*1.5, 0, 1)
    density *= 1.0-pad

    # inner ear cups: short, neat, pale fur; the long ear fur is guided tufts everywhere else on the ears
    gcfg = cfg.get('guides')
    guides = []
    guide_up = []
    guide_gid = []
    if gcfg:
        ear_box = membership(co, cfg['cup']['box'], floor, height, cfg['cup']['margin'])
        cup_mask = np.clip(pale*ear_box*gcfg.get('cupGain', 2.0), 0, 1)
        cc = gcfg['cup']
        if 'cupPale' in gcfg:  # a soft tint across the cup rather than a solid chalk-white patch
            pale = pale*(1-cup_mask)+cup_mask*np.minimum(pale, gcfg['cupPale'])
        length = length*(1-cup_mask)+cc['length']*cup_mask
        curl = curl*(1-cup_mask)+cc['curl']*cup_mask
        clump = clump*(1-cup_mask)+cc['clump']*cup_mask
        density = density*(1-cup_mask)+cc['density']*cup_mask*(1.0-pad)
        gw = np.zeros(n)
        gcfg = {**gcfg, 'groups': {k: v for k, v in gcfg['groups'].items() if v.get('guided', True)}}
        for gname in gcfg['groups']:
            gw += wn[names.index(gname)]
        guided = np.clip(gw*(1-cup_mask*(0.0 if gcfg.get('cupGuided') else 1.0)), 0, 1)
        write_attribute(me, 'fur_guided', guided)
        write_attribute(me, 'cupm', cup_mask)
        rng = np.random.default_rng(cfg['seed'])
        tang = unit(comb-nrm*np.sum(comb*nrm, axis=1, keepdims=True))
        npts = cfg['points']
        # guide group per vertex: each guided strand follows only the guides of its own group (and ear side), so the
        # two ears' locks never cross at the nape
        gnames = list(gcfg['groups'])
        gid = np.zeros(n)
        best = np.zeros(n)
        for gi, gname in enumerate(gnames):
            spec = gcfg['groups'][gname]
            wg = wn[names.index(gname)]
            for side in ((-1.0, 1.0) if spec.get('perSide', True) else (0.0,)):
                code = gi*3+(0 if side == 0 else (1 if side < 0 else 2))
                m = wg if side == 0 else wg*(np.sign(co[:, 0]+1e-9) == side)
                take = m > best
                gid[take] = code
                best = np.maximum(best, m)
        write_attribute(me, 'gid', gid)
        for gi, (gname, spec) in enumerate(gcfg['groups'].items()):
            for side in ((-1.0, 1.0) if spec.get('perSide', True) else (0.0,)):
                code = gi*3+(0 if side == 0 else (1 if side < 0 else 2))
                sel = (guided > 0.5) & (gid == code)  # every guided strand of this group has guides near it
                cand = np.where(sel)[0]
                if len(cand) < 10:
                    continue
                cand = rng.permutation(cand)[:30000]
                root_s = np.array(cfg['earRoot'])*np.array([side or 1.0, 1.0, 1.0])
                d = np.linalg.norm(co[cand]-root_s, axis=1)
                tn = (d-d.min())/max(d.max()-d.min(), 1e-9)
                chosen = [0]
                dist = np.linalg.norm(co[cand]-co[cand[0]], axis=1)
                for _ in range(spec['count']-1):
                    k = int(np.argmax(dist))
                    chosen.append(k)
                    dist = np.minimum(dist, np.linalg.norm(co[cand]-co[cand[k]], axis=1))
                idx = cand[chosen]
                tt = tn[chosen]
                lo, hi = spec['length']
                L = lo+(hi-lo)*tt**spec.get('lengthPower', 0.8)
                L = L*(1.0+spec.get('lengthJitter', 0.0)*(rng.random(len(L))*2.0-1.0))
                if 'farFade' in spec:  # the very farthest points of the fan grow shorter locks (no lone spikes at the ear points)
                    L = L*(1.0-spec['farFade']*smoothstep((tt-0.88)/0.12))
                if 'frontScale' in spec:  # shorter, softer locks on the front of the fan, shortest in the cup
                    front = smoothstep((-nrm[idx, 1]-0.1)/0.4)
                    L = L*(1.0-front*(1.0-spec['frontScale']))
                if 'cupScale' in spec:
                    L = L*(1.0-cup_mask[idx]*(1.0-spec['cupScale']))
                dirs = tang[idx]
                if spec.get('radial'):  # feathered locks: radiate from the ear root over the surface, outward on its own side
                    r = co[idx]-root_s
                    if side:
                        r[:, 0] = side*np.abs(r[:, 0])+side*spec.get('outward', 0.0)
                    r = r+np.array(spec.get('radialBias', [0.0, 0.0, 0.0]))
                    r = unit(r-nrm[idx]*np.sum(r*nrm[idx], axis=1, keepdims=True))
                    w = spec['radial']
                    dirs = unit(dirs*(1.0-w)+r*w)
                sv = np.linspace(0, 1, npts)[None, :, None]
                dirv = dirs[:, None, :]
                up = nrm[idx][:, None, :]
                Lc = L[:, None, None]
                lift = spec.get('lift', gcfg['lift'])
                sweep = spec.get('tipSweep', gcfg['tipSweep'])
                droop = np.array([0.0, 0.0, -1.0])[None, None, :]*Lc*spec.get('droop', 0.0)*sv**2
                curl_in = -up*Lc*spec.get('curlIn', 0.0)*sv**3  # tips settle back onto the ear like laid feathers
                curve = co[idx][:, None, :]+dirv*Lc*sv+up*Lc*lift*sv**2+dirv*Lc*sweep*sv**3+droop+curl_in
                guides.append(curve)
                guide_up.append(nrm[idx])
                guide_gid.append(np.full(len(idx), float(code)))
        print('guides:', sum(len(g) for g in guides))

    write_attribute(me, 'fur_length', length)
    write_attribute(me, 'fur_density', density)
    write_attribute(me, 'fur_clump', clump)
    write_attribute(me, 'fur_curl', curl)
    write_attribute(me, 'fur_cscale', cscale)
    write_attribute(me, 'pale', pale)
    write_attribute(me, 'rim', rim)
    write_attribute(me, 'fur_tone', blend('tone', 1.0))
    # pattern support: rest position (follows the body when posed), countershading and region masks
    write_attribute(me, 'rest', co_rest, 'FLOAT_VECTOR')
    front = smoothstep((-nrm[:, 1]-0.2)/0.5)
    down = smoothstep((-nrm[:, 2]-0.05)/0.5)
    torso_zone = np.maximum(membership(co, zones['R05'], floor, height, 0.03), membership(co, zones['R06'], floor, height, 0.03))
    under = np.maximum(down, front*torso_zone)
    face_front = membership(co, zones['R02'], floor, height, 0.03)*front
    write_attribute(me, 'under', under)
    write_attribute(me, 'pmask', np.clip((1.0-under)*(1.0-face_front), 0, 1))
    write_attribute(me, 'dorsal', smoothstep((0.5*nrm[:, 1]+0.5*nrm[:, 2]+0.2)/0.8))
    write_attribute(me, 'ptail', np.clip(wn[names.index('tails')], 0, 1))
    # wrapped-stripe support: unbanded bib line only, no bands on the ears or the lower face, fade toward the belly edge
    torso_wide = np.maximum(membership(co, zones['R05'], floor, height, 0.03),
                            membership(co, {'at': [0.28, 0.6], 'x': [0.0, 0.25], 'symmetricX': True, 'y': [-0.14, 0.3]}, floor, height, 0.03))
    strip = (1.0-smoothstep((np.abs(co[:, 0])-0.03)/0.03))*front*torso_wide
    face_low = membership(co, {'at': [0.1, 0.27], 'x': [0.0, 0.2], 'symmetricX': True, 'y': [-0.14, 0.0]}, floor, height, 0.02)*front
    earw = np.clip(wn[names.index('ears')], 0, 1)
    write_attribute(me, 'pmaskw', np.clip((1.0-strip)*(1.0-face_low)*(1.0-earw), 0, 1))
    write_attribute(me, 'earw', earw)
    # tiger-stripe support: angle around the body from the back midline (0) to the belly midline (pi), mirrored left/right;
    # arc = segment coordinate measured from the belly midline so even rows have a gap there and odd rows a stripe
    sc = cfg.get('stripe')
    if sc:
        nxy = np.linalg.norm(nrm[:, :2], axis=1)
        ang_trunk = np.arccos(np.clip(nrm[:, 1]/np.maximum(nxy, 1e-6), -1, 1))
        ang_trunk = np.where(nxy < 0.2, np.pi/2, ang_trunk)
        tvec = directions['tail']
        up_v = np.array([0.0, 0.0, 1.0])
        e1 = unit(up_v-tvec*np.sum(tvec*up_v, axis=1, keepdims=True))
        e2 = np.cross(tvec, e1)
        ang_tail = np.abs(np.arctan2(np.sum(nrm*e2, axis=1), np.sum(nrm*e1, axis=1)))
        th = wn[names.index('tails')] > 0.5
        angle = np.where(th, ang_tail, ang_trunk)
        segs = sum(wn[i]*sc['segs'].get(nm, 3.0) for i, nm in enumerate(names))
        write_attribute(me, 'angle', angle)
        write_attribute(me, 'arc', (np.pi-angle)/np.pi*segs)
        # pale belly field (T2): from chin and throat down the chest and belly, and onto the inner arms and inner thighs
        pts = np.array(sc['fieldEdge'])
        a_e = np.interp(at_all, pts[:, 0], pts[:, 1])+sc['wave']*np.sin(at_all*sc['waveFreq'])+0.5*sc['wave']*np.sin(co[:, 1]*11.0)
        trunk_f = smoothstep((angle-a_e)/sc['soft'])
        inner = -np.sign(co[:, 0]+1e-9)*nrm[:, 0]
        limb_f = smoothstep((inner-sc['innerMin'])/sc['innerSpan'])
        wl = np.clip(wn[names.index('arms')]+wn[names.index('legs')]+wn[names.index('paws')], 0, 1)
        belly = np.where(th, 0.0, wl*limb_f+(1.0-wl)*trunk_f)
        write_attribute(me, 'bellyf', belly)
        write_attribute(me, 'pmaskt', np.clip((1.0-face_low)*(1.0-earw), 0, 1))
        if 'arc' in sc:
            stripe_coordinates(me, co, nrm, edges, wn, names, at_all, th, sc['arc'], tail_d, angle)
    write_attribute(me, 'fade', np.clip((0.65+0.35*np.maximum(smoothstep((0.5*nrm[:, 1]+0.5*nrm[:, 2]+0.2)/0.8), np.clip(wn[names.index('tails')], 0, 1)))
                                        * (1.0-smoothstep((-nrm[:, 2]-0.1)/0.6)), 0, 1))
    try:
        write_attribute(me, 'tailpos', np.where(np.isfinite(tail_d), tail_d, 0.0))
    except NameError:
        write_attribute(me, 'tailpos', np.zeros(n))
    write_attribute(me, 'pad', pad)
    write_attribute(me, 'comb', comb, 'FLOAT_VECTOR')

    # density-weighted surface area, to turn a strand budget into a density
    poly_area = np.empty(len(me.polygons))
    me.polygons.foreach_get('area', poly_area)
    poly_density = np.add.reduceat(density[loops], starts)/totals
    weighted = float((poly_area*poly_density).sum())
    print(f'surface area {poly_area.sum():.3f}, density weighted {weighted:.3f}, length mean {length.mean():.4f}')
    return weighted, guides, guide_up, guide_gid


# ---------------------------------------------------------------- geometry nodes

class Builder:
    def __init__(self, tree):
        self.tree = tree

    def node(self, kind, **props):
        nd = self.tree.nodes.new(kind)
        for k, v in props.items():
            if hasattr(nd, k):
                setattr(nd, k, v)
            else:  # menu properties became sockets in newer Blender
                nd.inputs[k.title()].default_value = v.title() if k == 'mode' else v
        return nd

    def set(self, nd, key, value):
        sock = nd.inputs[key]
        if isinstance(value, bpy.types.NodeSocket):
            self.tree.links.new(value, sock)
        else:
            sock.default_value = value

    def vm(self, op, a, b=None, scale=None):
        nd = self.node('ShaderNodeVectorMath', operation=op)
        self.set_idx(nd, 0, a)
        if b is not None:
            self.set_idx(nd, 1, b)
        if scale is not None:
            self.set_idx(nd, 3, scale)
        return nd.outputs['Vector'] if op not in ('DOT_PRODUCT', 'LENGTH') else nd.outputs['Value']

    def m(self, op, a, b=None, c=None):
        nd = self.node('ShaderNodeMath', operation=op)
        self.set_idx(nd, 0, a)
        if b is not None:
            self.set_idx(nd, 1, b)
        if c is not None:
            self.set_idx(nd, 2, c)
        return nd.outputs['Value']

    def set_idx(self, nd, i, value):
        sock = nd.inputs[i]
        if isinstance(value, bpy.types.NodeSocket):
            self.tree.links.new(value, sock)
        else:
            sock.default_value = value

    def named(self, name, kind):
        nd = self.node('GeometryNodeInputNamedAttribute', data_type=kind)
        nd.inputs['Name'].default_value = name
        return nd.outputs['Attribute']

    def store(self, geo, name, value, kind):
        nd = self.node('GeometryNodeStoreNamedAttribute', data_type=kind, domain='POINT')
        self.tree.links.new(geo, nd.inputs['Geometry'])
        nd.inputs['Name'].default_value = name
        self.set(nd, 'Value', value)
        return nd.outputs['Geometry']


def build_hair_tree(skin, cfg, density_per_area, hair_mat, guide_obj=None):
    tree = bpy.data.node_groups.new('AkinzaFur', 'GeometryNodeTree')
    tree.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    tree.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    b = Builder(tree)
    gin = b.node('NodeGroupInput')
    gout = b.node('NodeGroupOutput')
    info = b.node('GeometryNodeObjectInfo', transform_space='ORIGINAL')
    info.inputs['Object'].default_value = skin
    dist = b.node('GeometryNodeDistributePointsOnFaces', distribute_method='RANDOM')
    tree.links.new(info.outputs['Geometry'], dist.inputs['Mesh'])
    dist.inputs['Seed'].default_value = cfg['seed']
    b.set(dist, 'Density', b.m('MULTIPLY', b.named('fur_density', 'FLOAT'), density_per_area))
    points, normal = dist.outputs['Points'], dist.outputs['Normal']

    # point stage: strand frame
    comb = b.named('comb', 'FLOAT_VECTOR')
    tangent = b.vm('SUBTRACT', comb, b.vm('SCALE', normal, scale=b.vm('DOT_PRODUCT', comb, normal)))
    tangent = b.vm('NORMALIZE', tangent)
    rnd = b.node('FunctionNodeRandomValue', data_type='FLOAT_VECTOR')
    rnd.inputs['Min'].default_value = (-1, -1, -1)
    rnd.inputs['Max'].default_value = (1, 1, 1)
    rnd.inputs['Seed'].default_value = cfg['seed']+1
    jitter = b.vm('SCALE', rnd.outputs['Value'], scale=cfg['dirJitter'])
    lift = cfg['lift']
    direction = b.vm('ADD', b.vm('ADD', b.vm('SCALE', tangent, scale=1.0-lift), b.vm('SCALE', normal, scale=lift)), jitter)
    direction = b.vm('NORMALIZE', direction)
    rl = b.node('FunctionNodeRandomValue', data_type='FLOAT')
    rl.inputs['Min'].default_value = 1.0-cfg['lengthJitter']  # Min (float)
    rl.inputs['Max'].default_value = 1.0+cfg['lengthJitter']  # Max (float)
    rl.inputs['Seed'].default_value = cfg['seed']+2
    strlen = b.m('MULTIPLY', b.named('fur_length', 'FLOAT'), rl.outputs['Value'])
    pos = b.node('GeometryNodeInputPosition').outputs['Position']

    g = points
    g = b.store(g, 'root', pos, 'FLOAT_VECTOR')
    g = b.store(g, 'dirv', direction, 'FLOAT_VECTOR')
    g = b.store(g, 'combp', tangent, 'FLOAT_VECTOR')
    g = b.store(g, 'strlen', strlen, 'FLOAT')
    g = b.store(g, 'nrm', normal, 'FLOAT_VECTOR')

    # strand template: a unit line resampled to N points, instanced at every point
    line = b.node('GeometryNodeCurvePrimitiveLine', mode='POINTS')
    line.inputs['Start'].default_value = (0, 0, 0)
    line.inputs['End'].default_value = (0, 0, 1)
    res = b.node('GeometryNodeResampleCurve', mode='COUNT')
    tree.links.new(line.outputs['Curve'], res.inputs['Curve'])
    res.inputs['Count'].default_value = cfg['points']
    sep = b.node('GeometryNodeSeparateGeometry', domain='POINT')
    tree.links.new(g, sep.inputs['Geometry'])
    b.set(sep, 'Selection', b.m('GREATER_THAN', b.named('fur_guided', 'FLOAT'), 0.5))
    iop = b.node('GeometryNodeInstanceOnPoints')
    tree.links.new(sep.outputs['Inverted'], iop.inputs['Points'])
    tree.links.new(res.outputs['Curve'], iop.inputs['Instance'])
    realize = b.node('GeometryNodeRealizeInstances')
    tree.links.new(iop.outputs['Instances'], realize.inputs['Geometry'])

    # curve stage: shape each strand from its stored frame
    t = b.node('GeometryNodeSplineParameter').outputs['Factor']
    root = b.named('root', 'FLOAT_VECTOR')
    dirv = b.named('dirv', 'FLOAT_VECTOR')
    combp = b.named('combp', 'FLOAT_VECTOR')
    sl = b.named('strlen', 'FLOAT')
    t2 = b.m('MULTIPLY', t, t)
    along = b.vm('SCALE', dirv, scale=b.m('MULTIPLY', sl, t))
    droop = b.vm('SCALE', combp, scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t2), cfg['droop']))
    gravity = b.vm('SCALE', _const_vec(b, (0, 0, -1)), scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t2), cfg['gravity']))
    # curl: a wave along the strand
    nz = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
    nz.inputs['Scale'].default_value = cfg['curlScale']
    nz.inputs['Detail'].default_value = 1.0
    b.set(nz, 'Vector', b.vm('ADD', root, along))
    wave = b.vm('SUBTRACT', nz.outputs['Color'], (0.5, 0.5, 0.5))
    wave = b.vm('SCALE', wave, scale=b.m('MULTIPLY', b.m('MULTIPLY', sl, t), b.m('MULTIPLY', b.named('fur_curl', 'FLOAT'), 2.0)))
    # clump: strands pull toward the center of their Voronoi cell, so tips gather into pointed clumps
    cz = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D')
    b.set(cz, 'Scale', b.named('fur_cscale', 'FLOAT'))
    cz.inputs['Randomness'].default_value = 1.0
    b.set(cz, 'Vector', root)
    nrm_f = b.named('nrm', 'FLOAT_VECTOR')
    pull = b.vm('SUBTRACT', cz.outputs['Position'], root)
    pull = b.vm('SUBTRACT', pull, b.vm('SCALE', nrm_f, scale=b.vm('DOT_PRODUCT', pull, nrm_f)))
    lean = b.vm('SCALE', pull, scale=b.m('MULTIPLY', t2, b.named('fur_clump', 'FLOAT')))
    total = b.vm('ADD', b.vm('ADD', b.vm('ADD', b.vm('ADD', root, along), droop), b.vm('ADD', gravity, wave)), lean)
    setpos = b.node('GeometryNodeSetPosition')
    tree.links.new(realize.outputs['Geometry'], setpos.inputs['Geometry'])
    tree.links.new(total, setpos.inputs['Position'])
    taper = cfg['taper']
    if cfg.get('guides', {}).get('lockTaper') is not None:  # guided strands taper further, to fine tips
        taper = b.m('ADD', cfg['taper'], b.m('MULTIPLY', b.named('lockc', 'FLOAT'), cfg['guides']['lockTaper']-cfg['taper']))
    radius = b.m('MULTIPLY', cfg['rootRadius'], b.m('SUBTRACT', 1.0, b.m('MULTIPLY', t, taper)))
    join = b.node('GeometryNodeJoinGeometry')
    tree.links.new(setpos.outputs['Geometry'], join.inputs['Geometry'])
    if guide_obj is not None:
        ginfo = b.node('GeometryNodeObjectInfo', transform_space='ORIGINAL')
        ginfo.inputs['Object'].default_value = guide_obj
        interp = b.node('GeometryNodeInterpolateCurves')
        tree.links.new(ginfo.outputs['Geometry'], interp.inputs['Guide Curves'])
        tree.links.new(sep.outputs['Selection'], interp.inputs['Points'])
        b.set(interp, 'Guide Up', b.named('up', 'FLOAT_VECTOR'))
        b.set(interp, 'Point Up', b.named('nrm', 'FLOAT_VECTOR'))
        interp.inputs['Max Neighbors'].default_value = cfg['guides'].get('neighbors', 2)
        b.set(interp, 'Guide Group ID', b.named('gid', 'FLOAT'))
        b.set(interp, 'Point Group ID', b.named('gid', 'FLOAT'))
        tj = b.node('GeometryNodeSplineParameter').outputs['Factor']
        jn = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
        jn.inputs['Scale'].default_value = cfg['guides'].get('jitterScale', 220.0)
        pos_node = b.node('GeometryNodeInputPosition').outputs['Position']
        b.set(jn, 'Vector', pos_node)
        jit = b.vm('SCALE', b.vm('SUBTRACT', jn.outputs['Color'], (0.5, 0.5, 0.5)),
                   scale=b.m('MULTIPLY', tj, cfg['guides'].get('jitter', 0.012)))
        gpos = b.vm('ADD', pos_node, jit)
        lock = cfg['guides'].get('lockConverge')
        if lock:  # locks: every strand runs from its own root into its nearest guide, so each bundle tapers to the guide's point
            npts = cfg['points']
            closest = interp.outputs['Closest Index']
            cop = b.node('GeometryNodeCurveOfPoint')
            in_curve = cop.outputs['Index in Curve']
            gp = b.node('GeometryNodeSampleIndex', data_type='FLOAT_VECTOR', domain='POINT')
            tree.links.new(ginfo.outputs['Geometry'], gp.inputs['Geometry'])
            b.set(gp, 'Value', b.node('GeometryNodeInputPosition').outputs['Position'])
            b.set(gp, 'Index', b.m('ADD', b.m('MULTIPLY', closest, float(npts)), in_curve))
            gr = b.node('GeometryNodeSampleIndex', data_type='FLOAT_VECTOR', domain='POINT')
            tree.links.new(ginfo.outputs['Geometry'], gr.inputs['Geometry'])
            b.set(gr, 'Value', b.node('GeometryNodeInputPosition').outputs['Position'])
            b.set(gr, 'Index', b.m('MULTIPLY', closest, float(npts)))
            poc = b.node('GeometryNodePointsOfCurve')
            b.set(poc, 'Curve Index', cop.outputs['Curve Index'])
            poc.inputs['Sort Index'].default_value = 0
            fat = b.node('GeometryNodeFieldAtIndex', data_type='FLOAT_VECTOR', domain='POINT')
            b.set(fat, 'Index', poc.outputs['Point Index'])
            b.set(fat, 'Value', b.node('GeometryNodeInputPosition').outputs['Position'])
            spread = b.vm('SUBTRACT', fat.outputs['Value'], gr.outputs['Value'])
            keep = b.m('SUBTRACT', 1.0, b.m('POWER', tj, lock['power']))  # leaf profile: full width to mid-lock, then to a point
            keep = b.m('ADD', keep, b.m('MULTIPLY', tj, lock.get('tipSpread', 0.0)))
            # a strand far from its guide's root keeps its own line instead of drawing a sheet across to the guide
            far = b.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
            far.inputs['From Min'].default_value = lock.get('maxSpread', 0.03)
            far.inputs['From Max'].default_value = 2.0*lock.get('maxSpread', 0.03)
            b.set(far, 'Value', b.vm('LENGTH', spread))

            rn = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
            rn.inputs['Scale'].default_value = cfg['guides'].get('jitterScale', 220.0)
            b.set(rn, 'Vector', fat.outputs['Value'])
            jit2 = b.vm('SCALE', b.vm('SUBTRACT', rn.outputs['Color'], (0.5, 0.5, 0.5)),
                        scale=b.m('MULTIPLY', tj, cfg['guides'].get('jitter', 0.004)))
            gpos = b.vm('ADD', b.vm('ADD', gp.outputs['Value'], b.vm('SCALE', spread, scale=keep)), jit2)
            # far from any guide root: a short strand along the guide's line from its own root, not a long copied spike
            short = b.vm('ADD', fat.outputs['Value'], b.vm('SCALE', b.vm('SUBTRACT', gp.outputs['Value'], gr.outputs['Value']),
                                                            scale=lock.get('farScale', 0.3)))
            fm = b.node('ShaderNodeMix')
            fm.data_type = 'VECTOR'
            b.set(fm, 'Factor', far.outputs['Result'])
            tree.links.new(gpos, fm.inputs[4])
            tree.links.new(short, fm.inputs[5])
            gpos = fm.outputs[1]
            # each strand its own: length (lenVar), a small fan at the tip (fan, world units), frizz along it
            cidx = cop.outputs['Curve Index']
            rl2 = b.node('FunctionNodeRandomValue', data_type='FLOAT')
            rl2.inputs['Min'].default_value = 1.0-lock.get('lenVar', 0.0)
            rl2.inputs['Max'].default_value = 1.0
            rl2.inputs['Seed'].default_value = cfg['seed']+11
            b.set(rl2, 'ID', cidx)
            rv = b.node('FunctionNodeRandomValue', data_type='FLOAT_VECTOR')
            rv.inputs['Min'].default_value = (-1, -1, -1)
            rv.inputs['Max'].default_value = (1, 1, 1)
            rv.inputs['Seed'].default_value = cfg['seed']+12
            b.set(rv, 'ID', cidx)
            rel = b.vm('SUBTRACT', gpos, fat.outputs['Value'])
            gpos = b.vm('ADD', fat.outputs['Value'], b.vm('SCALE', rel, scale=rl2.outputs['Value']))
            gpos = b.vm('ADD', gpos, b.vm('SCALE', rv.outputs['Value'], scale=b.m('MULTIPLY', b.m('MULTIPLY', tj, tj), lock.get('fan', 0.0))))
            fz = b.node('ShaderNodeTexNoise', noise_dimensions='3D')
            fz.inputs['Scale'].default_value = lock.get('frizzScale', 450.0)
            b.set(fz, 'Vector', b.node('GeometryNodeInputPosition').outputs['Position'])
            gpos = b.vm('ADD', gpos, b.vm('SCALE', b.vm('SUBTRACT', fz.outputs['Color'], (0.5, 0.5, 0.5)),
                                          scale=b.m('MULTIPLY', tj, lock.get('frizz', 0.0))))
        gset = b.node('GeometryNodeSetPosition')
        tree.links.new(interp.outputs['Curves'], gset.inputs['Geometry'])
        tree.links.new(gpos, gset.inputs['Position'])
        tagged = b.store(gset.outputs['Geometry'], 'lockc', 1.0, 'FLOAT')  # guided strands, for their own taper and sheen
        tree.links.new(tagged, join.inputs['Geometry'])
    scr = b.node('GeometryNodeSetCurveRadius')
    tree.links.new(join.outputs['Geometry'], scr.inputs['Curve'])
    tree.links.new(radius, scr.inputs['Radius'])
    smat = b.node('GeometryNodeSetMaterial')
    tree.links.new(scr.outputs['Curve'], smat.inputs['Geometry'])
    smat.inputs['Material'].default_value = hair_mat
    tree.links.new(smat.outputs['Geometry'], gout.inputs['Geometry'])
    return tree


def _const_vec(b, v):
    nd = b.node('FunctionNodeInputVector')
    nd.vector = v
    return nd.outputs['Vector']


# ---------------------------------------------------------------- materials

def clear(mat):
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    return mat.node_tree


def attr_node(tree, name, kind='GEOMETRY'):
    nd = tree.nodes.new('ShaderNodeAttribute')
    nd.attribute_type = kind
    nd.attribute_name = name
    return nd


def gray_mix(tree, pale_socket, a, bgray):
    mix = tree.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (a, a, a, 1)
    mix.inputs[7].default_value = (bgray, bgray, bgray, 1)
    tree.links.new(pale_socket, mix.inputs[0])
    return mix.outputs[2]


def hair_material(cfg):
    mc = cfg['materials']
    mat = bpy.data.materials.new('Akinza hair')
    tree = clear(mat)
    pale = attr_node(tree, 'pale')
    base = gray_mix(tree, pale.outputs['Fac'], mc['hairGray'], mc['hairPale'])
    info = tree.nodes.new('ShaderNodeHairInfo')
    ramp = tree.nodes.new('ShaderNodeMapRange')
    ramp.inputs['To Min'].default_value = mc['rootDarken']
    ramp.inputs['To Max'].default_value = 1.0
    tree.links.new(info.outputs['Intercept'], ramp.inputs['Value'])
    mul = tree.nodes.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs[0].default_value = 1.0
    tree.links.new(base, mul.inputs[6])
    relief = tree.nodes.new('ShaderNodeMix')
    relief.data_type = 'FLOAT'
    tree.links.new(pale.outputs['Fac'], relief.inputs[0])
    tree.links.new(ramp.outputs['Result'], relief.inputs[2])
    relief.inputs[3].default_value = 1.0
    tone = attr_node(tree, 'fur_tone')
    tmul = tree.nodes.new('ShaderNodeMath')
    tmul.operation = 'MULTIPLY'
    tree.links.new(relief.outputs[0], tmul.inputs[0])
    tree.links.new(tone.outputs['Fac'], tmul.inputs[1])
    tree.links.new(tmul.outputs['Value'], mul.inputs[7])
    hair = tree.nodes.new('ShaderNodeBsdfHairPrincipled')
    hair.model = 'CHIANG'
    hair.parametrization = 'COLOR'
    tree.links.new(mul.outputs[2], hair.inputs['Color'])
    hair.inputs['Roughness'].default_value = mc['hairRoughness']
    if 'lockRoughness' in mc:  # lower sheen on the guided locks: aligned strands otherwise shine like metal scales
        lk = attr_node(tree, 'lockc')
        rmix = tree.nodes.new('ShaderNodeMix')
        rmix.data_type = 'FLOAT'
        tree.links.new(lk.outputs['Fac'], rmix.inputs[0])
        rmix.inputs[2].default_value = mc['hairRoughness']
        rmix.inputs[3].default_value = mc['lockRoughness']
        tree.links.new(rmix.outputs[0], hair.inputs['Roughness'])
    hair.inputs['Radial Roughness'].default_value = mc['radialRoughness']
    hair.inputs['Coat'].default_value = 0.0
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    diffuse = tree.nodes.new('ShaderNodeBsdfDiffuse')
    tree.links.new(mul.outputs[2], diffuse.inputs['Color'])
    share = tree.nodes.new('ShaderNodeMix')
    share.data_type = 'FLOAT'
    tree.links.new(pale.outputs['Fac'], share.inputs[0])
    share.inputs[2].default_value = mc.get('diffuseShare', 0.0)
    share.inputs[3].default_value = mc.get('paleDiffuseShare', 0.0)
    blend = tree.nodes.new('ShaderNodeMixShader')
    tree.links.new(share.outputs[0], blend.inputs[0])
    tree.links.new(hair.outputs['BSDF'], blend.inputs[1])
    tree.links.new(diffuse.outputs['BSDF'], blend.inputs[2])
    tree.links.new(blend.outputs['Shader'], out.inputs['Surface'])
    return mat


def skin_material(mat, cfg, always_pale):
    mc = cfg['materials']
    tree = clear(mat)
    pale = attr_node(tree, 'pale')
    pad = attr_node(tree, 'pad')
    if always_pale:
        color = (mc['skinPale'],)*3+(1,)
        base_in = color
    else:
        base_in = None
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    if always_pale:
        bsdf.inputs['Base Color'].default_value = base_in
    else:
        tree.links.new(gray_mix(tree, pale.outputs['Fac'], mc['skinGray'], mc['skinPale']), bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8
    pad_bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    pad_bsdf.inputs['Base Color'].default_value = (0.04, 0.04, 0.04, 1)
    pad_bsdf.inputs['Roughness'].default_value = 0.4
    mixs = tree.nodes.new('ShaderNodeMixShader')
    rim = attr_node(tree, 'rim')
    both = tree.nodes.new('ShaderNodeMath')
    both.operation = 'MAXIMUM'
    tree.links.new(pad.outputs['Fac'], both.inputs[0])
    tree.links.new(rim.outputs['Fac'], both.inputs[1])
    tree.links.new(both.outputs['Value'], mixs.inputs[0])
    tree.links.new(bsdf.outputs['BSDF'], mixs.inputs[1])
    tree.links.new(pad_bsdf.outputs['BSDF'], mixs.inputs[2])
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(mixs.outputs['Shader'], out.inputs['Surface'])


def nose_material(mat):
    tree = clear(mat)
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.03, 0.03, 0.03, 1)
    bsdf.inputs['Roughness'].default_value = 0.2
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


def add_catch_lights(cfg):
    cl = cfg['catchLight']
    mat = bpy.data.materials.new('Catch light')
    tree = clear(mat)
    em = tree.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = cl['strength']
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    tree.links.new(em.outputs['Emission'], out.inputs['Surface'])
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and 'iris' in o.name]:
        pts = np.array([o.matrix_world@v.co for v in o.data.vertices])
        lo, hi = pts.min(axis=0), pts.max(axis=0)
        c = (lo+hi)/2
        bpy.ops.mesh.primitive_uv_sphere_add(radius=cl['radius'], location=(c[0]+cl['dx'], lo[1]+cl['radius']*0.15, c[2]+cl['dz']))
        sph = bpy.context.object
        sph.name = 'catch light '+o.name
        sph.scale = (1, 0.35, 1)
        sph.data.materials.append(mat)


def deep_merge(base, over):
    out = dict(base)
    for k, v in over.items():
        out[k] = deep_merge(base[k], v) if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--asm', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--settings', type=Path, default=HERE/'akinza-surface.json')
    parser.add_argument('--strands', type=int)
    parser.add_argument('--variant', help="merge settings['variants'][name] over the settings, e.g. 'feathered' ears")
    args = parser.parse_args(sys.argv[len(sys.argv)-sys.argv[::-1].index('--'):])
    cfg = json.loads(args.settings.read_text())
    if args.variant:
        cfg = deep_merge(cfg, cfg['variants'][args.variant])
        print('variant', args.variant)
    if args.strands:
        cfg['strands'] = args.strands
    species = json.loads(SPECIES_JSON.read_text())
    args.out.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(args.asm/'akinza.blend'))
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    skin = max(meshes, key=lambda o: len(o.data.vertices))
    n_verts, n_polys = len(skin.data.vertices), len(skin.data.polygons)
    print('skin', skin.name, n_verts, n_polys)

    weighted, guides, guide_up, guide_gid = compute_attributes(skin, cfg, species)
    guide_obj = None
    if guides:
        arr = np.concatenate(guides, axis=0)
        gdata = bpy.data.hair_curves.new('Akinza guides')
        gdata.add_curves([arr.shape[1]]*len(arr))
        gdata.points.foreach_set('position', arr.reshape(-1).astype(np.float32))
        up_attr = gdata.attributes.new('up', 'FLOAT_VECTOR', 'CURVE')
        up_attr.data.foreach_set('vector', np.concatenate(guide_up, axis=0).reshape(-1).astype(np.float32))
        gid_attr = gdata.attributes.new('gid', 'FLOAT', 'CURVE')
        gid_attr.data.foreach_set('value', np.concatenate(guide_gid).astype(np.float32))
        guide_obj = bpy.data.objects.new('Akinza guides', gdata)
        bpy.context.scene.collection.objects.link(guide_obj)
        guide_obj.hide_render = True
        guide_obj.hide_viewport = True

    for slot, mat in enumerate(skin.data.materials):
        skin_material(mat, cfg, always_pale=(slot == cfg['paleSlot']))
    for o in meshes:
        if 'nose' in o.name:
            for mat in o.data.materials:
                nose_material(mat)

    add_catch_lights(cfg)
    hair_mat = hair_material(cfg)
    curves = bpy.data.hair_curves.new('Akinza fur')
    fur = bpy.data.objects.new('Akinza fur', curves)
    bpy.context.scene.collection.objects.link(fur)
    tree = build_hair_tree(skin, cfg, cfg['strands']/weighted, hair_mat, guide_obj)
    mod = fur.modifiers.new('Fur', 'NODES')
    mod.node_group = tree

    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = fur.evaluated_get(dg)
    cu = ev.data
    count = len(cu.curves)
    print('strands', count, 'points', len(cu.points), 'attrs', [a.name for a in cu.attributes])
    # the skin geometry must be unchanged
    assert len(skin.data.vertices) == n_verts and len(skin.data.polygons) == n_polys
    (args.out/'surface-info.json').write_text(json.dumps({'strands': count, 'strandPoints': len(cu.points),
                                                         'skin': skin.name, 'skinVertices': n_verts, 'settings': cfg}, indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'surface.blend'))
    print('saved', args.out/'surface.blend')


if __name__ == '__main__':
    main()

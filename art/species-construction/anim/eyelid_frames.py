"""Render clip frames with the eyelids: clip_frames.py run as it is, plus the lid objects (no change to clip_frames.py).

  run_blender.py eyelid_frames.py <log> -- --lids <lids dir> [--state open|half|squint|closed|L=..,R=..,squint=..]
      [--schedule <json>] [--eye-crops name:azimuth:elevation:half,...] [--focus eye1|eye-1] [--hide-open] [--no-lids]
      [--masks] -- <clip_frames.py arguments>

After clip_frames.py opens the surface (a persistent load_post handler), each eye gets an upper and a lower lid mesh
(`Akinza eyelid upper +1` ...; the skin's own material, with the skin shader's attributes copied from the face at the rim)
and a lid fur curves object (`Akinza eyelid fur +1`; the hair material, every attribute copied from the nearest face strand).
clip_frames.py then poses and renders as always; it carries every extra mesh rigidly with the head bone. Before each render
(a render_pre handler) the frame's lid state (--state, or --schedule {clip: {frame: state}} with --state as the default) sets,
in rest space through eyelids_core and then through the frame's head bone: the lid sheets, the lid fur, the eye's ribbon
(it rides the lid margins), the face-fur radii under the ribbon's old place (restored as it leaves), and the catch light
(hidden while a lid covers it). The handler reads the frame's pose from clip_frames.py's own globals (LAST, fr, clip, v).

Open (close = squint = 0) leaves the ribbon, the fur radii and the catch light exactly as clip_frames.py sets them, and the
lid sheets tucked under the rim skin (or, with --hide-open, not rendered at all); the lid fur has zero length and radius.
--eye-crops adds clip_frames.py crop views (on the head bone) re-aimed at the posed near eye centre (--focus), each half
size in rig metres. --no-lids renders through the same path without lids (the baseline). States may carry `wince` (fix
pass 2) besides `close` and `squint`; the lid fur's fur_tone is set per frame (the dark lid margin). --masks writes, per
render, each eye's grid cells projected through the camera (<out>/masks/<clip>_<view>_<frame>.npz) for eyelids_measure.py.
"""
import argparse
import json
import runpy
import sys
from pathlib import Path

import bpy
import numpy as np
from bpy.app.handlers import persistent
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eyelids_core as ec  # noqa: E402

argv = sys.argv[sys.argv.index('--')+1:]
cut = argv.index('--')
mine, rest = argv[:cut], argv[cut+1:]
p = argparse.ArgumentParser()
p.add_argument('--lids', type=Path, required=True)
p.add_argument('--state', default='open')
p.add_argument('--schedule', type=Path, default=None)
p.add_argument('--eye-crops', default=None)
p.add_argument('--focus', default='eye1')
p.add_argument('--hide-open', action='store_true')
p.add_argument('--no-lids', action='store_true')
p.add_argument('--masks', action='store_true')
a = p.parse_args(mine)
LIDS = ec.Lids(a.lids)
DEFAULT = ec.parse_state(a.state)
SCHED = json.loads(a.schedule.read_text()) if a.schedule else {}
SIDE = {'eye1': '+1', 'eye-1': '-1'}
GLOBE = {'eye1': '1', 'eye-1': '-1'}
EYE_CROPS = {}
if a.eye_crops:
    extra = []
    for spec in a.eye_crops.split(','):
        n, az, el, half = spec.split(':')
        EYE_CROPS['crop_'+n] = True
        extra.append(f'{n}:{az}:{el}:head_top:{half}')
    if '--crops' in rest:
        i = rest.index('--crops')
        rest[i+1] = rest[i+1]+','+','.join(extra)
    else:
        rest += ['--crops', ','.join(extra)]
STATE_LOG = []


def state_for(clip, frame):
    s = SCHED.get(clip, {}).get(str(frame))
    if s is None:
        return DEFAULT
    return ec.parse_state(s) if isinstance(s, str) else s


def set_attr(data, name, domain, values):
    values = np.asarray(values)
    if values.dtype.kind == 'f' and values.ndim == 1:
        typ, key = 'FLOAT', 'value'
    elif values.dtype.kind == 'f' and values.shape[1] == 3:
        typ, key = 'FLOAT_VECTOR', 'vector'
    elif values.dtype.kind == 'f' and values.shape[1] == 4:
        typ, key = 'FLOAT_COLOR', 'color'
    elif values.dtype.kind == 'f' and values.shape[1] == 2:
        typ, key = 'FLOAT2', 'vector'
    elif values.dtype.kind in 'iu':
        typ, key = 'INT', 'value'
    elif values.dtype.kind == 'b':
        typ, key = 'BOOLEAN', 'value'
    else:
        return
    at = data.attributes.get(name) or data.attributes.new(name, typ, domain)
    at.data.foreach_set(key, values.astype(np.int32 if typ == 'INT' else bool if typ == 'BOOLEAN' else np.float32).ravel())


@persistent
def add_lids(_dummy):
    if a.no_lids or bpy.data.objects.get('Akinza eyelid upper +1') is not None:
        return
    skin = bpy.data.objects['akinza_continuous_construction']
    fur = bpy.data.objects.get('Akinza fur')
    skin_mat = skin.data.materials[0]
    hair_mat = bpy.data.materials.get('Akinza hair')
    nrow = LIDS.L['rows']+LIDS.L['roll_rows']
    ctype = None
    if fur is not None and fur.data.attributes.get('curve_type') is not None:
        ctype = int(fur.data.attributes['curve_type'].data[0].value)
    for e in ec.EYES:
        g = LIDS.state_geometry(e, 0., 0.)
        for which in ('upper', 'lower'):
            me = bpy.data.meshes.new(f'Akinza eyelid {which} {SIDE[e]}')
            me.from_pydata(g[which].tolist(), [], LIDS.faces[which].tolist())
            me.materials.append(skin_mat)
            lip_mat = bpy.data.materials.get('G1 ribbon charcoal')
            if lip_mat is not None and 'faces_lip_'+which in LIDS.Z.files:
                me.materials.append(lip_mat)
                me.polygons.foreach_set('material_index', LIDS.Z['faces_lip_'+which].astype(np.int32))
            for poly in me.polygons:
                poly.use_smooth = True
            for n in ('pale', 'pad', 'rim', 'eyed', 'padd', 'solef'):
                k = f'{e}__sa_{which}__{n}'
                if k in LIDS.Z.files:
                    set_attr(me, n, 'POINT', np.repeat(LIDS.Z[k].astype(np.float32), nrow))
            ob = bpy.data.objects.new(me.name, me)
            bpy.context.scene.collection.objects.link(ob)
        n = len(LIDS.eyes[e].fur['theta'])
        cv = bpy.data.hair_curves.new(f'Akinza eyelid fur {SIDE[e]}')
        cv.add_curves([9]*n)
        cv.attributes['position'].data.foreach_set('vector', g['fur'].astype(np.float32).ravel())
        set_attr(cv, 'radius', 'POINT', g['fur_radius'].astype(np.float32))
        for k in LIDS.Z.files:
            if k.startswith(e+'__fa__'):
                name = k[len(e+'__fa__'):]
                v = LIDS.Z[k]
                set_attr(cv, name, 'CURVE' if len(v) == n else 'POINT', v)
        if ctype is not None:
            at = cv.attributes.get('curve_type') or cv.attributes.new('curve_type', 'INT8', 'CURVE')
            at.data.foreach_set('value', [ctype]*n)
        if hair_mat is not None:
            cv.materials.append(hair_mat)
        ob = bpy.data.objects.new(cv.name, cv)
        bpy.context.scene.collection.objects.link(ob)
    print('eyelids added', [o.name for o in bpy.data.objects if 'eyelid' in o.name], flush=True)


CAPS_ORIG = {}


def script_globals():
    f = sys._getframe(1)
    while f is not None:
        if 'LAST' in f.f_globals and 'frame_camera' in f.f_globals:
            return f.f_globals
        f = f.f_back
    return None


@persistent
def lids_pre(scene, _depsgraph=None):
    G = script_globals()
    if G is None or 'fr' not in G:
        return
    clip, fr, view = G['clip'], G['fr'], G.get('v')
    T = G['LAST']['T']
    Rb, tb = T['head']
    to_m, from_m = G['to_m'], G['from_m']
    place = lambda X: from_m(to_m(X)@Rb.T+tb)
    st = state_for(clip, fr['frame'])
    rows = dict(clip=clip, frame=fr['frame'], view=view, state=st)
    fur = bpy.data.objects.get('Akinza fur')
    radius_dirty = False
    if not a.no_lids:
        for e in ec.EYES:
            s = st[e]
            E = LIDS.eyes[e]
            g = LIDS.state_geometry(e, s['close'], s['squint'], s.get('wince', 0.))
            hide = a.hide_open and g['open']
            for which in ('upper', 'lower'):
                ob = bpy.data.objects.get(f'Akinza eyelid {which} {SIDE[e]}')
                if ob is None:
                    continue
                ob.data.vertices.foreach_set('co', place(g[which]).astype(np.float32).ravel())
                ob.data.update()
                ob.hide_render = hide
            cob = bpy.data.objects.get(f'Akinza eyelid fur {SIDE[e]}')
            if cob is not None:
                cob.data.attributes['position'].data.foreach_set('vector', place(g['fur']).astype(np.float32).ravel())
                cob.data.attributes['radius'].data.foreach_set('value', g['fur_radius'].astype(np.float32))
                if cob.data.attributes.get('fur_tone') is not None and e+'__fa__fur_tone' in LIDS.Z.files:
                    cob.data.attributes['fur_tone'].data.foreach_set(
                        'value', (LIDS.Z[e+'__fa__fur_tone']*g['fur_tone_mult']).astype(np.float32))
                cob.data.update_tag()
                cob.hide_render = hide or not (g['fur_radius'] > 0).any()
            rib = bpy.data.objects.get('Akinza G1 ribbon head_eye_globe_'+GLOBE[e])
            if rib is not None and g['ribbon'] is not None:
                rib.data.vertices.foreach_set('co', place(g['ribbon'].reshape(-1, 3)).astype(np.float32).ravel())
                rib.data.update()
            cat = bpy.data.objects.get('catch light head_iris_and_pupil_'+GLOBE[e])
            if cat is not None:
                cat.hide_render = not g['catch']
            if fur is not None:
                idx = E.capdata['idx']
                if e not in CAPS_ORIG and len(idx):
                    CAPS_ORIG[e] = np.array([fur.data.attributes['radius'].data[int(i)].value for i in idx], np.float32)
                if len(idx):
                    want = CAPS_ORIG[e] if g['caps'] is None else g['caps'][1].astype(np.float32)
                    ra = fur.data.attributes['radius'].data
                    for i, r in zip(idx, want):
                        if ra[int(i)].value != r:
                            ra[int(i)].value = float(r)
                            radius_dirty = True
            rows[e] = dict(open=g['open'], catch=g['catch'], ribbonMoved=g['ribbon'] is not None,
                           furVisible=int((g['fur_radius'].reshape(-1, 9)[:, 0] > 0).sum()),
                           capsRestored=0 if g['caps'] is None else int(np.sum(g['caps'][1] != E.capdata['r_now'])))
    if radius_dirty:
        fur.data.update_tag()
    if view in EYE_CROPS:
        cam = scene.camera
        focus = Vector(tuple(place(LIDS.eyes[a.focus].c[None])[0]))
        fwd = cam.matrix_world.to_3x3()@Vector((0, 0, -1))
        cam.location = focus-fwd*10
    bpy.context.view_layer.update()
    if a.masks and not a.no_lids:
        write_masks(scene, G, clip, fr['frame'], view, st, place)
    STATE_LOG.append(rows)


def write_masks(scene, G, clip, frame, view, st, place):
    """The eye regions' grid cells (each eye's theta x phi grid round the opening) on the frame's outer surface, placed
    by the head bone and projected through the render camera: pixel x, y (from the top left), depth along the view, the
    zone's signed distance (mm, positive inside the bare zone and the opening) and whether the cell lies on the closed line
    (between the margins, on the lips or under a ribbon band). eyelids_measure.py rasterises them into the lid area, the
    ring of face fur round it and the line."""
    cam = scene.camera
    W, H = scene.render.resolution_x, scene.render.resolution_y
    fr_ = [Vector(v) for v in cam.data.view_frame(scene=scene)]
    xs, ys = [v.x for v in fr_], [v.y for v in fr_]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    Mi = np.array(cam.matrix_world.inverted())
    out = {}
    for e in ec.EYES:
        E = LIDS.eyes[e]
        s = st[e]
        th, ph = E.grid.th, E.grid.ph
        keep_t = (th > E.thm-14) & (th < E.thl+14)
        T, P = np.meshgrid(th[keep_t], ph)
        sd = E.sdz[:, keep_t]
        ok = sd > -26
        T, P, sd = T[ok], P[ok], sd[ok]
        cw, sq, wi = s['close'], s['squint'], s.get('wince', 0.)
        R = E.surface_radius(T, P, cw, sq, wi)
        X = place(E.c+E.dirs(T, P)*R[:, None])
        Xc = X@Mi[:3, :3].T+Mi[:3, 3]
        px = (Xc[:, 0]-x0)/(x1-x0)*W
        py = (y1-Xc[:, 1])/(y1-y0)*H
        pu, pl, _, _ = E.margins(T, cw, sq, wi)
        line = ((P <= pu+E.band_top(T, cw, sq, 'upper', wi)+0.3) & (P >= pl-E.band_top(T, cw, sq, 'lower', wi)-0.3)
                & (T > E.thm) & (T < E.thl)) if not (cw == 0 and sq == 0 and wi == 0) else np.zeros(len(T), bool)
        opening = E.grid(E.rvis, T, P) <= E.grid(E.rg, T, P)+1e-6
        out[e] = np.stack([px, py, -Xc[:, 2], sd, line.astype(float), opening.astype(float)], 1).astype(np.float32)
    d = G['a'].out/'masks'
    d.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(d/f'{clip}_{view}_{frame:04d}.npz', W=W, H=H, **{k.replace('-', 'm'): v for k, v in out.items()})


bpy.app.handlers.load_post.append(add_lids)
bpy.app.handlers.render_pre.append(lids_pre)
sys.argv = [str(HERE/'clip_frames.py'), '--', *rest]
G = runpy.run_path(str(HERE/'clip_frames.py'), run_name='__main__')
out = G['a'].out
out.mkdir(parents=True, exist_ok=True)
(out/'eyelids-log.json').write_text(json.dumps(dict(lids=str(a.lids), state=a.state, schedule=str(a.schedule) if a.schedule else None,
                                                    hideOpen=a.hide_open, noLids=a.no_lids, eyeCrops=list(EYE_CROPS),
                                                    levers=LIDS.L, frames=STATE_LOG), indent=1, default=str))
print('EYELID_FRAMES_DONE', len(STATE_LOG))

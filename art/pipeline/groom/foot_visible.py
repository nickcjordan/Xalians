"""What shows on a skin region from the sprite side camera, per frame (Luceras B-t3sm): which curves object covers it, how much
skin shows, and how smooth the lit fur reads there.

blender -b SCENE --python foot_visible.py -- SPEC.json OUT.json
SPEC: {"cell": cell.json, "classes": [["back", npy], ["side", npy], ["front", npy]], "control": npy, "scale": 2, "samples": 32,
       "ids": ["Pass7 paw fur", "Limb coat", "Luceras interpolated coat"], "jobs": [{"clip": ..., "frames": [a, b], "step": 1}], "png_dir": dir}
Per frame, same camera for all renders (the cell's side camera, rig at the origin, as coverage.py):
 1. beauty: the scene's own materials and studio light (film transparent);
 2. mask: skin painted back R, side G, front B, every curves object hidden; mask2: control region R;
 3. ids: skin black, the three named curves objects R, G, B, every other curves object and mesh black.
Reported per class: visible px; per object: share of the class footprint its strands cover; skin share = 1 - covered; and in the
beauty pass over the footprint: mean luminance and texture (std of luminance minus its 5 px box blur), with the same for the control."""
import bpy, sys, json, math, time
import numpy as np
from pathlib import Path
from mathutils import Vector
A = sys.argv[sys.argv.index('--') + 1:]; SPEC = json.loads(Path(A[0]).read_text()); OUT = Path(A[1])
s = bpy.context.scene; vl = bpy.context.view_layer; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']
cell = json.loads(Path(SPEC['cell']).read_text()); NV = len(body.data.vertices); PD = Path(SPEC.get('png_dir', str(OUT.parent))); PD.mkdir(parents=True, exist_ok=True)
CL = SPEC['classes']; col = np.zeros((NV, 4), np.float32); col[:, 3] = 1
for ch, (nm, p) in enumerate(CL): col[np.load(p), ch] = 1
col2 = np.zeros((NV, 4), np.float32); col2[:, 3] = 1; col2[np.load(SPEC['control']), 0] = 1
for nm_, c_ in (('fv_mask', col), ('fv_mask2', col2)):
    at = body.data.color_attributes.get(nm_) or body.data.color_attributes.new(nm_, 'FLOAT_COLOR', 'POINT'); at.data.foreach_set('color', c_.ravel())


def emis(name, color=None, attr=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
    if attr:
        a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = attr; a.attribute_type = 'GEOMETRY'; nt.links.new(a.outputs['Color'], e.inputs['Color'])
    else: e.inputs['Color'].default_value = color
    nt.links.new(e.outputs[0], o.inputs['Surface']); return m


MM = emis('fv_m1', attr='fv_mask'); MM2 = emis('fv_m2', attr='fv_mask2'); BLK = emis('fv_black', color=(0, 0, 0, 1))
IDC = [emis(f'fv_id{i}', color=c) for i, c in enumerate([(1, 0, 0, 1), (0, 1, 0, 1), (0, 0, 1, 1)])]
objs = [o for o in s.objects if not o.hide_render and o.type in ('MESH', 'CURVES') and not o.name.startswith(('lookdev', 'game_', 'sprite_'))]
orig = {o.name: [m for m in o.data.materials] for o in objs}; lights = [o for o in s.objects if o.type == 'LIGHT' and not o.hide_render]
hidden_lookdev = [o for o in s.objects if o.name.startswith(('lookdev', 'game_')) and not o.hide_render]
world0 = s.world; wb = bpy.data.worlds.new('fv_world'); wb.use_nodes = True; wb.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1)
IDS = SPEC['ids']


def setmat(o, m):
    for i in range(len(o.data.materials)): o.data.materials[i] = m
    if not len(o.data.materials): o.data.materials.append(m)


def mode(kind):
    if kind == 'beauty':
        for o in objs:
            for i, m in enumerate(orig[o.name]): o.data.materials[i] = m
            o.hide_render = False
        for l in lights: l.hide_render = False
        for o in hidden_lookdev: o.hide_render = False
        s.world = world0; s.render.film_transparent = True; s.cycles.samples = int(SPEC.get('samples', 32)); s.cycles.max_bounces = 12
        s.view_settings.view_transform = VT[0]; s.view_settings.look = VT[1]; s.view_settings.exposure = VT[2]; return
    for l in lights: l.hide_render = True
    for o in hidden_lookdev: o.hide_render = True
    s.world = wb; s.render.film_transparent = False; s.cycles.samples = 8; s.cycles.max_bounces = 0
    s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'; s.view_settings.exposure = 0
    for o in objs:
        if o == body: setmat(o, MM if kind == 'mask' else (MM2 if kind == 'mask2' else BLK)); o.hide_render = False; continue
        if o.type == 'CURVES':
            o.hide_render = kind in ('mask', 'mask2')
            setmat(o, IDC[IDS.index(o.name)] if o.name in IDS else BLK)
        else: setmat(o, BLK)


VT = (s.view_settings.view_transform, s.view_settings.look, s.view_settings.exposure)
s.render.engine = 'CYCLES'; s.cycles.use_denoising = False; s.render.image_settings.file_format = 'OPEN_EXR'; s.render.image_settings.color_depth = '32'; s.render.filter_size = 1.5
cam = bpy.data.objects.new('fv_cam', bpy.data.cameras.new('fv_cam')); s.collection.objects.link(cam); s.camera = cam; cam.data.type = 'ORTHO'; cam.data.clip_start = 0.01; cam.data.clip_end = 100
src = s.objects['sprite_side_camera']; sc = SPEC.get('scale', 2); tmp = PD / 'tmp'; tmp.mkdir(exist_ok=True)


def set_clip(clip, f):
    rig.animation_data.action = bpy.data.actions[clip]; ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    rig.location = (0, 0, 0); s.frame_set(f); vl.update()


def shoot(tag):
    p = tmp / f'{tag}.exr'; s.render.filepath = str(p); bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(str(p)); W, H = im.size; px = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(px); bpy.data.images.remove(im)
    return px.reshape(H, W, 4)[::-1]


def srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, 12.92 * x, 1.055 * x ** (1 / 2.4) - 0.055)


def boxblur(a, r=2):
    k = 2 * r + 1; p = np.pad(a, r, mode='edge'); c = p.cumsum(0).cumsum(1); c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


res = []; t0 = time.time()
for job in SPEC['jobs']:
    for f in range(job['frames'][0], job['frames'][1] + 1, job.get('step', 1)):
        set_clip(job['clip'], f)
        M = src.matrix_world.copy(); cx, cy = cell['center_cam_m']; M.translation = M @ Vector((cx, cy, 0.0)); cam.matrix_world = M
        cam.data.ortho_scale = cell['ortho_scale_m']; s.render.resolution_x = cell['cell_px'][0] * sc; s.render.resolution_y = cell['cell_px'][1] * sc; s.render.resolution_percentage = 100
        s.render.use_border = False
        B = (mode('beauty'), shoot('beauty'))[1] if SPEC.get('beauty', True) else np.zeros((s.render.resolution_y, s.render.resolution_x, 4), np.float32); mode('mask'); MK = shoot('mask'); mode('mask2'); MK2 = shoot('mask2'); mode('ids'); ID = shoot('ids')
        a = B[..., 3]; lum = srgb(B[..., :3] / np.maximum(a[..., None], 1e-6)) @ np.array([0.2126, 0.7152, 0.0722]); lum = np.where(a > 0.5, lum, np.nan)
        hp = lum - boxblur(np.nan_to_num(lum, nan=np.nanmean(lum)), 2)
        row = dict(clip=job['clip'], frame=f)
        def stats(w):
            sw = float(w.sum())
            if sw < 20: return None
            idv = {nm: round(float((ID[..., i] * w).sum() / sw), 3) for i, nm in enumerate(IDS)}
            cov = sum(idv.values()); ok = np.isfinite(lum) & (w > 0.5)
            return dict(visible_px=round(sw, 1), covered_by=idv, other_or_skin=round(max(0.0, 1 - cov), 3),
                        lum_mean=round(float(np.nanmean(lum[ok])), 3) if ok.any() else None, texture_std=round(float(np.nanstd(hp[ok])), 4) if ok.any() else None,
                        lum_p90=round(float(np.nanpercentile(lum[ok], 90)), 3) if ok.any() else None)
        for ch, (nm, _) in enumerate(CL): row[nm] = stats(MK[..., ch])
        row['all'] = stats(MK[..., :3].sum(-1).clip(0, 1)); row['control'] = stats(MK2[..., 0])
        if f in SPEC.get('png_frames', []):
            from PIL import Image
        res.append(row); print('FV', json.dumps(row), round(time.time() - t0, 1), flush=True)
        if f in SPEC.get('save_frames', []):
            np.save(PD / f"{job['clip']}_{f:04d}_beauty.npy", B.astype(np.float16)); np.save(PD / f"{job['clip']}_{f:04d}_mask.npy", MK[..., :3].astype(np.float16)); np.save(PD / f"{job['clip']}_{f:04d}_ids.npy", ID[..., :3].astype(np.float16)); np.save(PD / f"{job['clip']}_{f:04d}_mask2.npy", MK2[..., :1].astype(np.float16))
OUT.write_text(json.dumps(res, indent=1)); print('FV done', flush=True)

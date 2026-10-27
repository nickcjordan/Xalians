"""Xalians creature studio light (decision N-vf3n): one shared, named lighting setup for every creature render.

The look matches the model sheets and the T4 painting: a warm key high at the creature's front on the camera side, a
cool soft fill at about a quarter of the key, a soft rim from behind and above to separate the silhouette, a light
neutral background like the sheet's, and Standard view with an exposure set so the coat reads mid-tone and white fur
reads clean light. Materials are never touched: lights, world and view settings only.

Use (inside Blender):
    import studio_light
    log = studio_light.apply(bpy.context.scene, creature_center=(0, 0, 0.45), facing=(0, -1, 0), camera_side=(1, 0, 0))
    log = studio_light.apply(scene, overrides={'exposure': 0.6})        # any key below can be overridden

Geometry is placed from the creature's centre, its facing direction (the way the nose points) and the camera side (the
direction from the creature toward the side camera), so the same rig works for any species and any of the four
standard views; the side view is the reference. Existing lights are hidden from render (not deleted).

Settings (STUDIO, all overridable; calibrated on Luceras appeal build 3 against the sheet: rendered flank 72.8 vs sheet
72.2, bib 207 vs 206, face 122 vs 105 (T4 121), background 186 vs 193 sRGB luminance):
  key_temp_k 4800, key_power_w 470, key_size_m 4.5 (a large soft source; build 5), key elevation 50 deg, key azimuth 35 deg toward the front from the
  camera axis; fill_temp_k 7500, fill_ratio 0.12 of key power (a larger, softer source, so it lands near a quarter of the key's
  illuminance on the shadow side), fill_size_m 4.0, elevation 10 deg, azimuth 55 deg
  toward the rear; rim_temp_k 6500, rim_power_w 80 (halved in build 5: the rim from behind and above was what lit the bright, wet-looking
  strand glints on the back and haunch; back glint share 0.050 -> 0.020, sheet 0.014), rim_size_m 1.5, from behind the creature (opposite the camera),
  elevation 55 deg; background_srgb 0.69 (renders near 186-195 sRGB after the look), background_strength 1.0 (camera rays only; the world
  lights the creature at world_light_strength 0.04); exposure -0.15, view 'Standard', look 'High Contrast' (the value
  contrast: white fur clean light, grey coat mid-tone); white_balance_k 5400 (view white balance: the warm key keeps
  its direction and modelling while the grey coat renders near neutral like the sheet, mid-tone R-B 7 vs the sheet's 7);
  background_srgb 0.70 with background_tint (1.20, 1.0, 0.885) linear: under the look and that white balance the
  background renders neutral light grey near 193/193/193 sRGB in every view (calibrated on Luceras appeal build 4);
  hide_ground True (the lookdev ground plane is made invisible to camera rays in every view, so every view shares the
  same plain background, while it still bounces light onto the belly and legs as before).
"""
import math
import bpy
from mathutils import Vector

STUDIO = dict(key_temp_k=4800.0, key_power_w=470.0, key_size_m=4.5, key_elev_deg=50.0, key_az_deg=35.0, key_dist_m=3.2,
              fill_temp_k=7500.0, fill_ratio=0.12, fill_size_m=4.0, fill_elev_deg=10.0, fill_az_deg=-55.0, fill_dist_m=3.5,
              rim_temp_k=6500.0, rim_power_w=80.0, rim_size_m=1.5, rim_elev_deg=55.0, rim_az_deg=150.0, rim_dist_m=3.0,
              background_srgb=0.70, background_strength=1.0, world_light_rgb=(0.35, 0.35, 0.36), world_light_strength=0.04,
              exposure=-0.15, view='Standard', look='High Contrast', ground_srgb=None, white_balance_k=5400.0, background_tint=(1.20, 1.0, 0.885), hide_ground=True)


def kelvin_rgb(k):
    """Approximate linear RGB of a black body at k kelvin, normalised to max 1 (Tanner Helland fit, then linearised)."""
    t = k / 100.0
    r = 255.0 if t <= 66 else 329.698727446 * (t - 60) ** -0.1332047592
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * (t - 60) ** -0.0755148492
    b = 255.0 if t >= 66 else (0.0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    c = [max(0.0, min(255.0, x)) / 255.0 for x in (r, g, b)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    m = max(c); return tuple(x / m for x in c)


def srgb_to_lin(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def _light(name, kind, power, size, color, loc, target):
    d = bpy.data.lights.get(name) or bpy.data.lights.new(name, kind)
    d.type = kind; d.energy = power; d.color = color
    if kind == 'AREA': d.shape = 'DISK'; d.size = size
    o = bpy.data.objects.get(name)
    if o is None: o = bpy.data.objects.new(name, d); bpy.context.scene.collection.objects.link(o)
    o.data = d; o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.hide_render = False
    return o


def _place(center, facing, camside, az_deg, elev_deg, dist):
    """Direction rotated az_deg from the camera-side axis toward the facing (front) axis, raised elev_deg."""
    c, f, sd = Vector(center), Vector(facing).normalized(), Vector(camside).normalized()
    az, el = math.radians(az_deg), math.radians(elev_deg)
    h = sd * math.cos(az) + f * math.sin(az)
    return c + (h * math.cos(el) + Vector((0, 0, 1)) * math.sin(el)) * dist


def apply(scene, creature_center=(0.0, 0.0, 0.45), facing=(0.0, -1.0, 0.0), camera_side=(1.0, 0.0, 0.0), overrides=None):
    S = dict(STUDIO); S.update(overrides or {})
    for o in scene.objects:
        if o.type == 'LIGHT' and not o.name.startswith('studio_'): o.hide_render = True
    c = creature_center
    key = _light('studio_key', 'AREA', S['key_power_w'], S['key_size_m'], kelvin_rgb(S['key_temp_k']), _place(c, facing, camera_side, S['key_az_deg'], S['key_elev_deg'], S['key_dist_m']), c)
    fill = _light('studio_fill', 'AREA', S['key_power_w'] * S['fill_ratio'], S['fill_size_m'], kelvin_rgb(S['fill_temp_k']), _place(c, facing, camera_side, S['fill_az_deg'], S['fill_elev_deg'], S['fill_dist_m']), c)
    rim = _light('studio_rim', 'AREA', S['rim_power_w'], S['rim_size_m'], kelvin_rgb(S['rim_temp_k']), _place(c, facing, camera_side, S['rim_az_deg'], S['rim_elev_deg'], S['rim_dist_m']), c)
    w = bpy.data.worlds.get('studio_world') or bpy.data.worlds.new('studio_world'); w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    bg_cam = nt.nodes.new('ShaderNodeBackground'); bgv = srgb_to_lin(S['background_srgb']); bg_cam.inputs['Color'].default_value = tuple(bgv * t for t in S['background_tint']) + (1,); bg_cam.inputs['Strength'].default_value = S['background_strength']
    bg_lit = nt.nodes.new('ShaderNodeBackground'); bg_lit.inputs['Color'].default_value = tuple(S['world_light_rgb']) + (1,); bg_lit.inputs['Strength'].default_value = S['world_light_strength']
    lp = nt.nodes.new('ShaderNodeLightPath'); mx = nt.nodes.new('ShaderNodeMixShader'); out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac']); nt.links.new(bg_lit.outputs[0], mx.inputs[1]); nt.links.new(bg_cam.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    scene.world = w
    if S.get('hide_ground'):
        for o in scene.objects:
            if o.name.startswith('lookdev_ground'): o.visible_camera = False   # still bounces light, never seen
    vs = scene.view_settings; vs.view_transform = S['view']
    try: vs.look = S['look']
    except Exception: pass
    vs.exposure = S['exposure']; vs.gamma = 1.0
    if S.get('white_balance_k'):
        # view white balance: the warm key keeps its direction and modelling, the grey coat stays near neutral like the sheet
        try: vs.use_white_balance = True; vs.white_balance_temperature = S['white_balance_k']; vs.white_balance_tint = 0.0
        except Exception: pass
    if S.get('ground_srgb') is not None:
        for o in scene.objects:
            if o.name.startswith('lookdev_ground'):
                for m in o.data.materials:
                    b = m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
                    if b: g = srgb_to_lin(S['ground_srgb']); b.inputs['Base Color'].default_value = (g, g, g, 1)
    return dict(settings=S, key=list(key.location), fill=list(fill.location), rim=list(rim.location))

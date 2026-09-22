"""Render styles: the same rig and performance through a different surface and line language.

A style is a spec-level lever (``render.style``) or a command-line override
(``--style=toon``). It rewrites every palette material after the creature is
built and configures Freestyle lines on the fixed stage, so the templates and
the performance track never know which look is being rendered. Every style is
deterministic under the same seed rules as ``plain``.

    plain  the Cycles Principled render the study started with
    toon   stepped two-tone shading (Toon BSDF plus a flat shadow term) and ink lines
    flat   exact palette fills with no shading at all, ink lines only
    ink    the portrait homage: a black mass with pale incision lines and lit eyes

``toon``, ``flat`` and ``ink`` hide the templates' outline shells (the
slightly larger ink-colored meshes behind each part), because Freestyle draws
the contour instead.
"""

import math

import bpy

from .materials import color

STYLES = ("plain", "toon", "flat", "ink")

# Line thickness in pixels at the 384 px stage, per style.
LINE = {"toon": 1.9, "flat": 2.1, "ink": 1.6}
# Toon step: the lit cone half-angle (0 to 1), its edge softness, and the flat
# shadow term added under it so the unlit side is a darker tone, not black.
TOON = {"size": 0.6, "smooth": 0.05, "shadow": 0.5}
# Parts that never take a contour line, matched by object name.
UNLINED = ("eye", "pupil", "glint")
INK_MASS = "0b1014"
INK_INCISION = "e8e2d2"


def _clear(tree):
    for node in list(tree.nodes):
        tree.nodes.remove(node)


def _output(tree):
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    out.location = (400, 0)
    return out


def _emission(tree, rgba, strength=1.0):
    node = tree.nodes.new("ShaderNodeEmission")
    node.inputs["Color"].default_value = rgba
    node.inputs["Strength"].default_value = strength
    return node


def _rebuild(mat, style, entry, toon=None):
    toon = {**TOON, **(toon or {})}
    tree = mat.node_tree
    principled = tree.nodes.get("Principled BSDF")
    base = tuple(principled.inputs["Base Color"].default_value) if principled else tuple(mat.diffuse_color)
    glow = principled.inputs["Emission Strength"].default_value if principled else 0.0
    _clear(tree)
    out = _output(tree)
    if style == "flat":
        shader = _emission(tree, base, 1.0)
    elif style == "toon":
        node = tree.nodes.new("ShaderNodeBsdfToon")
        node.component = "DIFFUSE"
        node.inputs["Color"].default_value = base
        node.inputs["Size"].default_value = toon["size"]
        node.inputs["Smooth"].default_value = toon["smooth"]
        shadow = _emission(tree, base, toon["shadow"])
        shader = tree.nodes.new("ShaderNodeAddShader")
        tree.links.new(node.outputs[0], shader.inputs[0])
        tree.links.new(shadow.outputs[0], shader.inputs[1])
    elif style == "ink":
        lit = entry.get("ink_lit", False) or glow > 0
        shader = _emission(tree, color(INK_INCISION) if lit else color(INK_MASS), 1.0)
    else:
        raise ValueError(style)
    if style != "ink" and glow > 0:
        extra = _emission(tree, base, glow)
        add = tree.nodes.new("ShaderNodeAddShader")
        tree.links.new(shader.outputs[0], add.inputs[0])
        tree.links.new(extra.outputs[0], add.inputs[1])
        shader = add
    tree.links.new(shader.outputs[0], out.inputs["Surface"])


def apply_style(scene, style, spec):
    """Rewrite materials and configure lines for ``style``. ``plain`` changes nothing."""
    if style not in STYLES:
        raise ValueError(f"unknown render style {style!r}; expected one of {STYLES}")
    if style == "plain":
        return
    entries = spec.get("palette", {})
    by_label = {}
    for name, entry in entries.items():
        if isinstance(entry, str):
            entry = {"hex": entry}
        by_label[entry.get("label", name)] = entry
    for mat in bpy.data.materials:
        if mat.node_tree is None:
            continue
        _rebuild(mat, style, by_label.get(mat.name, {}), spec.get("render", {}).get("toon"))

    unlined = bpy.data.collections.new("unlined parts")
    scene.collection.children.link(unlined)
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if "outline" in obj.name:
            obj.hide_render = True
        elif any(word in obj.name for word in UNLINED):
            # Eyes are the contact point; a contour at this weight would swallow
            # the pupil, so the eye parts keep their own ink rim from the template.
            unlined.objects.link(obj)

    ink_hex = INK_INCISION if style == "ink" else _ink_hex(entries)
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode = "ABSOLUTE"
    scene.render.line_thickness = LINE[style]
    view_layer = bpy.context.view_layer
    view_layer.use_freestyle = True
    fs = view_layer.freestyle_settings
    fs.as_render_pass = False
    fs.crease_angle = math.radians(100 if style == "ink" else 128)
    fs.use_culling = True
    for existing in list(fs.linesets):
        fs.linesets.remove(existing)
    lineset = fs.linesets.new("contour")
    lineset.select_silhouette = True
    lineset.select_border = True
    # Silhouette and open edges only: crease and material-boundary lines traced
    # every seam of the primitive bodies and read as scribble.
    lineset.select_crease = False
    lineset.select_material_boundary = False
    lineset.select_edge_mark = False
    lineset.select_contour = False
    lineset.select_external_contour = False
    lineset.select_by_visibility = True
    lineset.visibility = "VISIBLE"
    lineset.select_by_collection = True
    lineset.collection = unlined
    lineset.collection_negation = "EXCLUSIVE"
    linestyle = lineset.linestyle
    linestyle.name = f"{style} line"
    linestyle.color = color(ink_hex)[:3]
    linestyle.alpha = 1.0
    linestyle.thickness = LINE[style]
    linestyle.thickness_position = "CENTER"
    linestyle.caps = "ROUND"
    linestyle.use_chaining = True
    linestyle.chaining = "PLAIN"
    linestyle.use_same_object = False
    if style == "ink":
        # Incisions only: the outer silhouette stays a bare edge of the black mass
        # against the stage, so the figure reads as a cut shape rather than an outlined one.
        lineset.select_silhouette = False
        lineset.select_border = False
        lineset.select_material_boundary = True
        lineset.select_crease = True


def _ink_hex(entries):
    entry = entries.get("ink", "182226")
    return entry if isinstance(entry, str) else entry["hex"]

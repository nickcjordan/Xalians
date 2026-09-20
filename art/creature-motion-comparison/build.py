"""Build comparable Avilily motion sheets from the editable trial sources."""

from __future__ import annotations

import io
import hashlib
import json
import math
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw


HERE = Path(__file__).resolve().parent
PILOT = HERE.parent / "creature-motion-pilot" / "exports" / "avilily"
OUT = HERE / "exports"
CELL = 384
ORIGIN = [192, 314]
ACTION_FRAMES = 30
IDLE_FRAMES = 12


def base_frames(clip: str, count: int) -> list[Image.Image]:
    paths = [PILOT / clip / f"{i:03d}.png" for i in range(count)]
    if not all(path.exists() for path in paths):
        raise FileNotFoundError("Rebuild the creature-motion-pilot Godot frames first")
    return [Image.open(path).convert("RGBA") for path in paths]


def make_hybrid(frames: list[Image.Image]) -> list[Image.Image]:
    cel = Image.open(io.BytesIO(cairosvg.svg2png(url=str(HERE / "source" / "hybrid-bloom.svg")))).convert("RGBA")
    cleared_paths = [HERE / "hybrid-base" / f"{i:03d}.png" for i in range(len(frames))]
    if not all(path.exists() for path in cleared_paths):
        raise FileNotFoundError("Render the Godot hybrid base with render_hybrid_base.gd first")
    results = []
    for i, base in enumerate(frames):
        # The replacement cel follows the beak. These hand-set anchors are source
        # data for the study and can be moved without modifying the rig.
        anchors = [(0, 247, 150), (7, 265, 139), (10, 265, 137),
                   (14, 288, 138), (18, 288, 142), (21, 286, 143),
                   (25, 264, 159), (29, 247, 150)]
        for a, b in zip(anchors, anchors[1:]):
            if a[0] <= i <= b[0]:
                u = (i - a[0]) / (b[0] - a[0])
                cx = round(a[1] + (b[1] - a[1]) * u)
                cy = round(a[2] + (b[2] - a[2]) * u)
                break
        bloom = max(0.0, min(1.0, (i - 9) / 5, (26 - i) / 5))
        cleared = Image.open(cleared_paths[i]).convert("RGBA")
        frame = Image.blend(base, cleared, bloom)
        if bloom > 0:
            size = round(34 + bloom * 34)
            flower = cel.resize((size, size), Image.Resampling.LANCZOS)
            flower.putalpha(flower.getchannel("A").point(lambda alpha: round(alpha * bloom)))
            frame.alpha_composite(flower, (round(cx - size * .48), round(cy - size * .5 + 8 * bloom)))
        results.append(frame)
    return results


def pixel_frame(index: int, action: bool, enlarge: bool = True) -> Image.Image:
    size = 96
    im = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(im)
    ink = "#173e42"
    shade = "#317b61"
    green = "#69b46c"
    light = "#bfe38b"
    cream = "#e3efad"
    coral = "#edaa83"
    deep = "#85536c"
    if action:
        t = index / 23
        lift = round(6 * max(0, math.sin(math.pi * (t - .25) / .7))) if t > .25 else 0
        crouch = 3 if .17 < t < .37 else 0
        open_amount = max(0.0, min(1.0, (t - .36) / .16, (.88 - t) / .16))
        spread = round(8 * max(0, math.sin(math.pi * (t - .32) / .7))) if t > .32 else 0
    else:
        t = index / 11
        lift = 0
        crouch = 0
        open_amount = 0
        spread = [0, 0, 1, 1, 2, 1, 0, 0, -1, -1, 0, 0][index]
    y = crouch - lift

    def polygon(points, fill, outline=ink, width=1):
        d.polygon(points, fill=fill)
        d.line(points + [points[0]], fill=outline, width=width, joint="curve")

    # Tail ribbons and rear wing sit behind the body. Every frame is drawn on
    # the same 96 px grid, so their changing shapes are native pixel poses.
    polygon([(43, 48+y), (37, 62+y), (26, 82+y), (34, 76+y), (46, 56+y)], shade)
    d.line([(40, 56+y), (29, 78+y)], fill=light, width=1)
    polygon([(42, 52+y), (34, 62+y), (32, 86+y), (39, 76+y), (48, 57+y)], green)
    polygon([(45, 45+y), (32, 37+y-spread), (12, 31+y-spread),
             (18, 41+y), (8, 42+y), (22, 50+y), (39, 53+y)], shade)
    d.line([(15, 34+y-spread), (34, 46+y), (41, 48+y)], fill=light, width=2)
    # Body volume and pale breast.
    d.ellipse((38, 38+y, 66, 76+y), fill=ink)
    d.ellipse((40, 40+y, 64, 74+y), fill=green)
    d.ellipse((48, 46+y, 61, 70+y), fill=cream)
    d.polygon([(41, 57+y), (37, 62+y), (44, 64+y)], fill=shade)
    # Talons curl around an implied branch at the same stage anchor.
    for fx, fy in ((46, 72+y), (59, 72+y)):
        polygon([(fx,fy), (fx-2,fy+9), (fx+2,fy+11), (fx+5,fy+6)], "#bb8a69")
        d.line([(fx,fy+10), (fx-4,fy+13)], fill=cream, width=2)
        d.line([(fx+3,fy+10), (fx+4,fy+14)], fill=cream, width=2)
    # Front wing changes its contour as it prepares and opens.
    polygon([(57, 46+y), (69, 34+y-spread), (87, 29+y-spread),
             (80, 37+y), (92, 39+y), (81, 48+y), (88, 51+y),
             (70, 54+y), (56, 50+y)], green)
    d.line([(61, 48+y), (82, 37+y-spread)], fill=cream, width=2)
    d.line([(64, 50+y), (82, 48+y)], fill=light, width=1)
    # Head, crest, eye and a closed or blooming beak.
    d.ellipse((40, 20+y, 65, 47+y), fill=ink)
    d.ellipse((42, 22+y, 63, 45+y), fill=light)
    polygon([(45, 25+y), (45, 12+y), (49, 19+y), (54, 13+y),
             (54, 23+y)], green)
    d.line([(47, 16+y), (48, 23+y)], fill=cream, width=1)
    d.ellipse((56, 30+y, 63, 37+y), fill=ink)
    d.ellipse((57, 30+y, 61, 35+y), fill=cream)
    d.point((60, 32+y), fill=ink)
    beak = (64, 38+y)
    if open_amount < .2:
        polygon([(63, 36+y), (71, 33+y), (79, 38+y), (71, 42+y), (64, 40+y)], coral)
        d.line([(67, 37+y), (75, 38+y)], fill=cream, width=1)
    else:
        step = round(open_amount * 10)
        d.ellipse((63, 34+y, 75, 45+y), fill=deep, outline=ink)
        polygon([(64, 37+y), (68, 26+y-step), (75, 30+y-step), (73, 39+y)], coral)
        polygon([(68, 38+y), (81, 30+y-step//2), (84, 36+y), (74, 42+y)], "#f2bd91")
        polygon([(66, 40+y), (81, 47+y+step//2), (79, 52+y+step), (70, 45+y)], coral)
        polygon([(64, 41+y), (68, 51+y+step), (73, 50+y+step), (72, 43+y)], "#d77c82")
        d.point((70, 40+y), fill=cream)
    return im.resize((CELL, CELL), Image.Resampling.NEAREST) if enlarge else im


def package(name: str, clips: dict[str, list[Image.Image]], fps: dict[str, int], emitter: list[int],
            origin: list[int] = ORIGIN, markers: list[dict] | None = None, species: str = "avilily",
            variant: str | None = None, extra: dict | None = None) -> None:
    destination = OUT / name
    destination.mkdir(parents=True, exist_ok=True)
    metadata = {"format": "xalians-frame-atlas-v1", "species": species, "variant": variant or name,
                "canvas": [CELL, CELL], "origin": origin, "emitter": emitter, **(extra or {}), "clips": {}}
    for clip_name, frames in clips.items():
        columns = 5
        sheet = Image.new("RGBA", (columns * CELL, math.ceil(len(frames) / columns) * CELL))
        entries = []
        poses = set()
        for i, frame in enumerate(frames):
            assert frame.size == (CELL, CELL)
            bounds = frame.getbbox()
            assert bounds is not None
            assert min(bounds[0], bounds[1], CELL - bounds[2], CELL - bounds[3]) >= 2, (name, clip_name, i, bounds)
            poses.add(hashlib.sha256(frame.tobytes()).digest())
            x, y = i % columns * CELL, i // columns * CELL
            sheet.alpha_composite(frame, (x, y))
            entries.append({"x": x, "y": y, "w": CELL, "h": CELL,
                            "duration_ms": round(1000 / fps[clip_name], 3)})
        assert len(poses) >= (5 if clip_name == "action" else 3), (name, clip_name, len(poses))
        sheet.save(destination / f"{clip_name}.png", optimize=True)
        metadata["clips"][clip_name] = {
            "sheet": f"{clip_name}.png", "fps": fps[clip_name], "loop": clip_name == "idle",
            "duration_ms": round(len(frames) * 1000 / fps[clip_name], 3),
            "markers": (markers or [{"name": "bloom_open", "time_ms": 600}]) if clip_name == "action" else [],
            "frames": entries,
        }
    (destination / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


def package_rendered_studies() -> None:
    """Pack every study rendered through the shared rig library.

    Each ``rendered/<study>/meta.json`` names its species, export folder, cue
    markers, projected emitter, and provenance (Blender build, spec hash,
    library hash, seed). Nothing here is hand-set per species.
    """
    for meta_path in sorted((HERE / "rendered").glob("*/meta.json")):
        folder = meta_path.parent
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        clips = {}
        for clip_name, (_, count) in meta["clips"].items():
            paths = sorted((folder / clip_name).glob("*.png"))
            if len(paths) != count:
                print(f"{folder.name}: expected {count} {clip_name} frames, found {len(paths)}; skipping")
                clips = None
                break
            clips[clip_name] = [Image.open(path).convert("RGBA") for path in paths]
        if clips is None:
            continue
        markers = [{"name": name, "time_ms": entry["time_ms"]} for name, entry in meta["markers"].items()]
        package(meta["export"], clips, {"action": 24, "idle": 12}, meta["emitter"], markers=markers,
                species=meta["species"], variant=meta["variant"],
                extra={"label": meta["label"], "template": meta["template"], "points": meta["points"],
                       "provenance": meta["provenance"]})


def preview() -> None:
    path = HERE / "preview"
    path.mkdir(exist_ok=True)
    names = ["cutout", "hybrid", "pixel", "rendered3d", "blender", "blender2"]
    labels = ["01  CURRENT CUTOUT", "02  DRAWN BLOOM", "03  PIXEL FRAMES",
              "04  GODOT 3D", "05  BLENDER 3D", "06  BLENDER 3D PASS 2"]
    if not all((OUT / name / "manifest.json").exists() for name in names):
        return
    variants = []
    for name in names:
        manifest = json.loads((OUT / name / "manifest.json").read_text(encoding="utf-8"))
        sheet = Image.open(OUT / name / "action.png").convert("RGBA")
        variants.append((manifest, sheet))
    frames = []
    columns = 3
    rows = math.ceil(len(names) / columns)
    for tick in range(ACTION_FRAMES):
        board = Image.new("RGB", (columns * 280, rows * 292 + 32), "#10232c")
        pen = ImageDraw.Draw(board)
        for cell, ((manifest, sheet), label) in enumerate(zip(variants, labels)):
            fps = manifest["clips"]["action"]["fps"]
            index = min(len(manifest["clips"]["action"]["frames"]) - 1, int(tick * fps / 24))
            frame_info = manifest["clips"]["action"]["frames"][index]
            art = sheet.crop((frame_info["x"], frame_info["y"], frame_info["x"] + CELL, frame_info["y"] + CELL))
            stage = Image.new("RGBA", (CELL, CELL), "#203941")
            draw = ImageDraw.Draw(stage)
            draw.ellipse((30, 286, 355, 354), fill="#183139")
            draw.line([(12, 316), (120, 307), (265, 312), (375, 295)], fill="#789b77", width=7)
            stage.alpha_composite(art, (ORIGIN[0] - manifest["origin"][0], ORIGIN[1] - manifest["origin"][1]))
            card = stage.convert("RGB").resize((260, 260), Image.Resampling.NEAREST if manifest["variant"] == "pixel" else Image.Resampling.LANCZOS)
            x = 10 + (cell % columns) * 280
            y = 32 + (cell // columns) * 292
            board.paste(card, (x, y))
            pen.text((x + 2, y - 20), label, fill="#e5eadc")
        frames.append(board)
    frames[0].save(path / "action-comparison.gif", save_all=True, append_images=frames[1:],
                   duration=42, loop=0, optimize=False)
    samples = [0, 8, 13, 17, 23]
    contact = Image.new("RGB", (280 * len(samples), 290 * len(names)), "#10232c")
    for column, tick in enumerate(samples):
        for row in range(len(names)):
            full = frames[tick].crop((10 + (row % columns) * 280, 32 + (row // columns) * 292,
                                      270 + (row % columns) * 280, 292 + (row // columns) * 292))
            contact.paste(full, (column * 280 + 10, row * 290 + 20))
            ImageDraw.Draw(contact).text((column * 280 + 10, row * 290 + 4),
                                         f"{labels[row]}  {tick / 24:.2f}s", fill="#e5eadc")
    contact.save(path / "keyframes.png", optimize=True)


def main() -> None:
    cutout_action = base_frames("action", ACTION_FRAMES)
    cutout_idle = base_frames("idle", 19)
    package("cutout", {"action": cutout_action, "idle": cutout_idle},
            {"action": 24, "idle": 12}, [285, 148])
    package("hybrid", {"action": make_hybrid(cutout_action), "idle": cutout_idle},
            {"action": 24, "idle": 12}, [290, 146])
    pixel_source = HERE / "source" / "pixel"
    for clip_name, count in (("action", 24), ("idle", IDLE_FRAMES)):
        folder = pixel_source / clip_name
        folder.mkdir(parents=True, exist_ok=True)
        for i in range(count):
            pixel_frame(i, clip_name == "action", False).save(folder / f"{i:03d}.png")
    package("pixel", {"action": [pixel_frame(i, True) for i in range(24)],
                      "idle": [pixel_frame(i, False) for i in range(IDLE_FRAMES)]},
            {"action": 20, "idle": 12}, [306, 152], [192, 346])
    rendered = HERE / "rendered3d"
    action_paths = sorted((rendered / "action").glob("*.png"))
    idle_paths = sorted((rendered / "idle").glob("*.png"))
    if action_paths and idle_paths:
        package("rendered3d", {"action": [Image.open(p).convert("RGBA") for p in action_paths],
                               "idle": [Image.open(p).convert("RGBA") for p in idle_paths]},
                {"action": 24, "idle": 12}, [278, 144])
    else:
        print("3D frames absent; run the Godot 3D renderer, then build again")
    blender_frames = HERE / "rendered_blender"
    blender_action = sorted((blender_frames / "action").glob("*.png"))
    blender_idle = sorted((blender_frames / "idle").glob("*.png"))
    if len(blender_action) == 30 and len(blender_idle) == 12:
        package("blender", {"action": [Image.open(p).convert("RGBA") for p in blender_action],
                            "idle": [Image.open(p).convert("RGBA") for p in blender_idle]},
                {"action": 24, "idle": 12}, [278, 153])
    else:
        print("Blender frames absent; run blender/build_avilily.py with --render, then build again")
    package_rendered_studies()
    preview()
    print("Built comparison atlases in", OUT)


if __name__ == "__main__":
    main()

"""Package Godot PNG frames into portable sheets, metadata, and review images."""

from hashlib import sha256
import json
from math import ceil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BASE = Path(__file__).resolve().parents[1]
EXPORTS = BASE / "exports"
PREVIEW = BASE / "preview"
CATALOG = json.loads((BASE / "godot" / "catalog.json").read_text(encoding="utf-8"))
SPECIES = tuple(CATALOG["species"])
SIZE = CATALOG["captureCell"][0]
assert CATALOG["captureCell"] == [SIZE, SIZE], "The pilot preview expects square capture cells"


def stage(image: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), "#203243")
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((int(SIZE * .117), int(SIZE * .826), int(SIZE * .885), int(SIZE * .938)), fill="#102430")
    draw.ellipse((int(SIZE * .195), int(SIZE * .859), int(SIZE * .828), int(SIZE * .911)), outline="#61818e", width=2)
    canvas.alpha_composite(image)
    return canvas.convert("RGB")


def package_clip(species: str, clip: str, fps: int, loop: bool, profile: str, scale: float) -> dict:
    folder = EXPORTS / species / clip
    info = json.loads((folder / "render-info.json").read_text(encoding="utf-8"))
    if info["fps"] != fps:
        raise ValueError(f"Catalog and render rate differ for {species}/{clip}")
    frames = [folder / f"{index:03d}.png" for index in range(info["frames"])]
    if not frames or not all(path.exists() for path in frames):
        raise ValueError(f"No frames for {species}/{clip}")
    columns = 8
    target_size = round(SIZE * scale)
    if target_size < 1:
        raise ValueError(f"Invalid profile scale: {profile}")
    sheet = Image.new("RGBA", (columns * target_size, ceil(len(frames) / columns) * target_size))
    entries = []
    digests = set()
    for index, path in enumerate(frames):
        with Image.open(path) as source:
            frame = source.convert("RGBA")
        if frame.size != (SIZE, SIZE):
            raise ValueError(f"Incorrect frame size: {path}")
        bounds = frame.getbbox()
        if bounds is None:
            raise ValueError(f"Empty frame: {path}")
        if min(bounds[0], bounds[1], SIZE - bounds[2], SIZE - bounds[3]) < 2:
            raise ValueError(f"Frame touches the export edge: {species}/{clip}/{path.name}: {bounds}")
        if target_size != SIZE:
            frame = frame.resize((target_size, target_size), Image.Resampling.LANCZOS)
        digests.add(sha256(frame.tobytes()).hexdigest())
        x = (index % columns) * target_size
        y = (index // columns) * target_size
        sheet.alpha_composite(frame, (x, y))
        entries.append({"x": x, "y": y, "w": target_size, "h": target_size, "duration_ms": round(1000 / fps, 3)})
    if len(digests) < max(3, len(frames) // 4):
        raise ValueError(f"Insufficient distinct poses in {species}/{clip}")
    destination = EXPORTS / species if profile == "full" else EXPORTS / species / profile
    destination.mkdir(parents=True, exist_ok=True)
    sheet_path = destination / f"{clip}.png"
    sheet.save(sheet_path, optimize=True)
    if profile == "full":
        images = [stage(Image.open(path).convert("RGBA")) for path in frames]
        PREVIEW.mkdir(parents=True, exist_ok=True)
        images[0].save(
            PREVIEW / f"{species}-{clip}.gif",
            save_all=True,
            append_images=images[1:],
            duration=round(1000 / fps),
            loop=0,
            optimize=False,
        )
    return {"sheet": f"{clip}.png", "fps": fps, "loop": loop, "duration_ms": round(len(entries) * 1000 / fps, 3), "frames": entries}


def make_storyboard() -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    width = 5 * 205 + 30
    height = len(SPECIES) * 235 + 65
    board = Image.new("RGB", (width, height), "#e8e8e2")
    draw = ImageDraw.Draw(board)
    draw.text((15, 12), "XALIANS / CREATURE MOTION PILOT   •   ACTION POSES", fill="#1d3440", font=font)
    for row, species in enumerate(SPECIES):
        info = json.loads((EXPORTS / species / "action" / "render-info.json").read_text(encoding="utf-8"))
        files = [EXPORTS / species / "action" / f"{index:03d}.png" for index in range(info["frames"])]
        positions = [0, round((len(files) - 1) * 0.22), round((len(files) - 1) * 0.40), round((len(files) - 1) * 0.60), len(files) - 1]
        y = 39 + row * 235
        draw.text((15, y + 87), species.upper(), fill="#1d3440", font=font)
        for col, frame_index in enumerate(positions):
            source = Image.open(files[frame_index]).convert("RGBA")
            card = stage(source).resize((180, 180), Image.Resampling.LANCZOS)
            x = 90 + col * 185
            board.paste(card, (x, y))
            fps = CATALOG["species"][species]["clips"]["action"]["fps"]
            draw.text((x + 5, y + 184), f"{frame_index / fps:.2f}s", fill="#314a55", font=font)
    board.save(PREVIEW / "action-storyboard.png", optimize=True)


def make_profile_comparison() -> None:
    font = ImageFont.load_default()
    profiles = tuple(CATALOG["profiles"])
    board = Image.new("RGB", (115 + len(profiles) * 235, len(SPECIES) * 265 + 48), "#e8e8e2")
    draw = ImageDraw.Draw(board)
    draw.text((16, 13), "EXPORT PROFILE COMPARISON / ACTION CONTACT POSE", fill="#1d3440", font=font)
    for row, species in enumerate(SPECIES):
        draw.text((15, 80 + row * 265), species.upper(), fill="#1d3440", font=font)
        for col, profile in enumerate(profiles):
            destination = EXPORTS / species if profile == "full" else EXPORTS / species / profile
            manifest = json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
            frames = manifest["clips"]["action"]["frames"]
            index = min(len(frames) - 1, round(manifest["clips"]["action"]["fps"] * .67))
            frame = frames[index]
            with Image.open(destination / "action.png") as sheet:
                crop = sheet.crop((frame["x"], frame["y"], frame["x"] + frame["w"], frame["y"] + frame["h"]))
            if crop.size != (SIZE, SIZE):
                crop = crop.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
            card = stage(crop).resize((220, 220), Image.Resampling.LANCZOS)
            x, y = 96 + col * 235, 40 + row * 265
            board.paste(card, (x, y))
            total = sum((destination / f"{name}.png").stat().st_size for name in manifest["clips"])
            draw.text((x + 4, y + 224), f"{profile.upper()}  {total / (1024 * 1024):.2f} MiB", fill="#314a55", font=font)
    board.save(PREVIEW / "profile-comparison.png", optimize=True)


def main() -> None:
    for species in SPECIES:
        for profile, profile_settings in CATALOG["profiles"].items():
            scale = profile_settings["scale"]
            clips = {}
            for name, settings in CATALOG["species"][species]["clips"].items():
                clips[name] = package_clip(species, name, settings["fps"], settings["loop"], profile, scale)
                clips[name]["markers"] = settings.get("markers", [])
            manifest = {
                "format": "xalians-frame-atlas-v1",
                "species": species,
                "profile": profile,
                "canvas": [round(dimension * scale) for dimension in CATALOG["captureCell"]],
                "origin": [round(dimension * scale) for dimension in CATALOG["origin"]],
                "clips": clips,
            }
            destination = EXPORTS / species if profile == "full" else EXPORTS / species / profile
            (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    make_storyboard()
    make_profile_comparison()


if __name__ == "__main__":
    main()

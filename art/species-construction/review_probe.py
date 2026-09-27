"""Compose a review sheet, turntable and alpha-derived masks from probe renders."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pipeline import file_hash


def on_white(path):
    image = Image.open(path).convert("RGBA")
    background = Image.new("RGBA", image.size, "white")
    return Image.alpha_composite(background, image).convert("RGB")


def build(directory):
    report_path = directory / "geometry.json"
    report = json.loads(report_path.read_text())
    for name, expected in report["outputs"].items():
        if file_hash(directory / name) != expected:
            raise ValueError(f"Changed geometry output: {name}")
    font = ImageFont.load_default(size=23)
    sheet = Image.new("RGB", (1920, 750), "white")
    draw = ImageDraw.Draw(sheet)
    draw.text((28, 15), "AKINZA | provisional tail connection | one actual mesh, three cameras", fill="#27323b", font=font)
    for i, (name, label) in enumerate([("rear", "REAR"), ("left", "CREATURE'S LEFT SIDE"), ("above", "ABOVE, FRONT TOWARD TOP")]):
        sheet.paste(on_white(directory / f"{name}.png"), (i*640, 55))
        draw.text((i*640+28, 705), label, fill="#27323b", font=font)
    sheet.save(directory / "contact.png")
    frames = []
    for angle in range(0, 360, 45):
        image = on_white(directory / f"turn-{angle:03d}.png")
        draw = ImageDraw.Draw(image)
        draw.text((15, 15), f"PROVISIONAL GEOMETRY | {angle} degrees", fill="#27323b", font=font)
        frames.append(image)
    frames[0].save(directory / "turntable.gif", save_all=True, append_images=frames[1:],
                   duration=450, loop=0, disposal=2)
    masks = {}
    for camera in report["cameras"]:
        path = directory / camera["image"]
        with Image.open(path) as image:
            alpha = image.getchannel("A")
            mask = alpha.point(lambda a: 0 if a >= 128 else 255, mode="1")
            if not mask.getextrema() == (0, 255):
                raise ValueError(f"Empty or opaque occupancy: {path}")
            output = directory / f"{camera['name']}.occupancy.png"
            mask.save(output)
        masks[output.name] = {"sourceSha256": file_hash(path), "sha256": file_hash(output),
                              "method": "render alpha >= 128; black foreground"}
    (directory / "review-assets.json").write_text(json.dumps({
        "geometryReportSha256": file_hash(report_path), "masks": masks,
        "contactSha256": file_hash(directory / "contact.png"),
        "turntableSha256": file_hash(directory / "turntable.gif"),
        "approval": None,
    }, indent=2)+"\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    build(parser.parse_args().directory)

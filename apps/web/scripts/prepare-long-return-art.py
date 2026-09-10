"""Prepare generated Long Return environment plates for the browser."""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps


SOURCE = Path(r"C:\Users\njord\.codex\generated_images\01a07d14-5c50-7483-bd0a-f8d69206b5d3")
DESTINATION = Path(__file__).parents[1] / "public" / "assets" / "img" / "games" / "long-return"
ASSETS = {
    "exec-c3f4430d-081e-41fd-86ec-f87f4ea88ea0.png": "briefing-console.webp",
    "exec-7336eef2-6402-4ecc-adef-607e67d7faa8.png": "blind-turbine-hall.webp",
    "exec-7682f7e3-395a-4b6c-b1f5-60b79021ba62.png": "archive-vestibule.webp",
    "exec-c02c9094-a8a6-43a4-b330-98920bb6d6e0.png": "null-gallery.webp",
    "exec-7d50ed0a-2d44-45cb-ad31-f8ccd09145a1.png": "nemesis-index.webp",
    "exec-6d723cbf-4bca-4f67-aaa3-e779f9b24118.png": "core-reservoir.webp",
    "exec-62cf0340-14bc-46e1-94e8-d4f079bacc9d.png": "generator-spine.webp",
}


DESTINATION.mkdir(parents=True, exist_ok=True)
for source_name, destination_name in ASSETS.items():
    image = Image.open(SOURCE / source_name).convert("RGB")
    image = ImageOps.fit(image, (1600, 900), method=Image.Resampling.LANCZOS)
    image = ImageEnhance.Color(image).enhance(0.9)
    image.save(DESTINATION / destination_name, "WEBP", quality=84, method=6)
    print(destination_name)

"""Compare two rendered study folders pixel for pixel.

    python compare_frames.py <rendered/a> <rendered/b>

Exits 0 when every frame decodes to identical pixels and the two meta files
agree, 1 otherwise, printing each differing frame with its differing pixel
count and largest channel difference. Byte equality is deliberately not the
test: Blender's PNG writer chooses scanline filters adaptively, so two
renders of identical pixels can differ in their compressed bytes. What the
pipeline guarantees is the decoded image, and the packer re-encodes frames
into atlases with Pillow, whose output is a pure function of those pixels.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops


def compare(a, b):
    a, b = Path(a), Path(b)
    bad = 0
    count = 0
    for path in sorted(a.glob("*/*.png")):
        count += 1
        other = b / path.relative_to(a)
        if not other.exists():
            print(f"MISSING {path.relative_to(a)}")
            bad += 1
            continue
        first = Image.open(path).convert("RGBA")
        second = Image.open(other).convert("RGBA")
        if first.size != second.size:
            print(f"SIZE {path.relative_to(a)}: {first.size} vs {second.size}")
            bad += 1
            continue
        diff = ImageChops.difference(first, second)
        if diff.getbbox():
            pixels = sum(1 for p in diff.getdata() if any(p))
            widest = max(max(p) for p in diff.getdata())
            print(f"DIFF {path.relative_to(a)}: {pixels} px differ, max channel diff {widest}")
            bad += 1
    meta_a = json.loads((a / "meta.json").read_text(encoding="utf-8"))
    meta_b = json.loads((b / "meta.json").read_text(encoding="utf-8"))
    if meta_a != meta_b:
        print("DIFF meta.json")
        bad += 1
    print(f"{count} frames compared, {bad} differences")
    return bad


if __name__ == "__main__":
    sys.exit(1 if compare(sys.argv[1], sys.argv[2]) else 0)

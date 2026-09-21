"""Render named SVG layers into transparent PNGs for the Godot cutout rigs."""

from copy import deepcopy
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image


BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / "source"
OUTPUT = BASE / "godot" / "assets"
SVG = "{http://www.w3.org/2000/svg}"
CATALOG = json.loads((BASE / "godot" / "catalog.json").read_text(encoding="utf-8"))


def export_species(species: str) -> None:
    folder = OUTPUT / species
    folder.mkdir(parents=True, exist_ok=True)
    names = set()
    for source in (SOURCE / f"{species}.svg", SOURCE / f"{species}.effects.svg"):
        if not source.exists():
            if source.name == f"{species}.svg":
                raise FileNotFoundError(source)
            continue
        original = ET.parse(source).getroot()
        definitions = original.find(f"{SVG}defs")
        if definitions is None:
            raise ValueError(f"{source} is missing SVG definitions")
        groups = [node for node in original if node.tag == f"{SVG}g"]
        for group in groups:
            name = group.attrib.get("id")
            if not name or not name.replace("_", "").isalnum() or name in names:
                raise ValueError(f"Invalid or duplicate part name in {source}: {name!r}")
            names.add(name)
            isolated = ET.Element(f"{SVG}svg", original.attrib)
            isolated.append(deepcopy(definitions))
            isolated.append(deepcopy(group))
            target = folder / f"{name}.png"
            rendered = cairosvg.svg2png(bytestring=ET.tostring(isolated))
            if not target.exists() or target.read_bytes() != rendered:
                target.write_bytes(rendered)
            with Image.open(target) as image:
                if list(image.size) != CATALOG["sourceCanvas"] or image.getbbox() is None:
                    raise ValueError(f"Empty or incorrect layer: {target}")
            print(f"{species}/{name}.png")


if __name__ == "__main__":
    for item in sys.argv[1:] or CATALOG["species"]:
        if item not in CATALOG["species"]:
            raise ValueError(f"Species is not listed in catalog: {item}")
        export_species(item)

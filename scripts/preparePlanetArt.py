"""Encode generated planet artwork for web delivery; no compositing or retouching.

Requires Pillow. Reads the generation manifest, preserving original PNG outputs.
Run from any directory: python scripts/preparePlanetArt.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'docs/art/planet-art-prompts.json').read_text(encoding='utf-8'))
destination = ROOT / 'apps/web/public/assets/img/planets/art'
destination.mkdir(parents=True, exist_ok=True)

for item in manifest['images']:
    if not item.get('source'):
        continue
    source = Path(item['source'])
    with Image.open(source) as original:
        original = original.convert('RGB')
        if original.size != (1536, 1024):
            raise ValueError(f"{item['key']}: unexpected dimensions {original.size}")
        for width, suffix, quality in [(1536, '', 88), (768, '-768', 84), (384, '-384', 80)]:
            target = destination / f"{item['key']}{suffix}.webp"
            if target.exists():
                continue
            resized = original.resize((width, width * 2 // 3), Image.Resampling.LANCZOS)
            resized.save(target, 'WEBP', quality=quality, method=6)
        print(item['key'])

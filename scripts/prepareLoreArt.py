"""Encode selected lore illustrations for the web. Requires Pillow; no retouching."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'docs/art/lore-art-prompts.json').read_text(encoding='utf-8'))
for item in manifest['images']:
    with Image.open(item['source']) as original:
        if original.size != (1536, 1024):
            raise ValueError(f"Unexpected dimensions for {item['key']}: {original.size}")
        for width, quality, name in zip([768, 384], [84, 80], item['files']):
            target = ROOT / name
            target.parent.mkdir(parents=True, exist_ok=True)
            original.convert('RGB').resize((width, width * 2 // 3), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=quality, method=6)
            print(target.relative_to(ROOT))

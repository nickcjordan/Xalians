"""A post-assembly step that changes nothing: the live check of the post stage (RECIPE.md section Post-assembly steps)."""
import argparse
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--asm', required=True)
p.add_argument('--out', required=True)
a = p.parse_args()
assert (Path(a.out)/'akinza.glb').is_file(), 'the stage copies the assembly into --out before the step runs'
(Path(a.out)/'post-noop.txt').write_text(f'from {Path(a.asm).name}\n', encoding='utf-8')

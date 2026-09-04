"""Showcase brief builder: turns a species record plus scripts/art/showcase.json into one fixed prompt.

The layer Nick asked for on 2026-09-04: identify the features that are signature to the creature, make sure
they are showcased, and account for every anatomy key in the record (shown, or hidden by the pose). One prompt,
many seeds; no pose cycling.

  python scripts/art/brief.py <species-key>      prints the prompt and the anatomy coverage table
"""
import json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SHOWCASE = json.loads((HERE / 'showcase.json').read_text(encoding='utf-8'))

CONSISTENCY = ('Every part of the body that is in view must match this description exactly; a part may be hidden '
               'by the pose but must never be drawn differently or replaced with something else.')


def coverage(rec, sc):
    anatomy = list(rec['physiology']['anatomy'])
    sig = {s['anatomy'] for s in sc['signature']}
    rows = []
    for a in anatomy:
        if a in sig: rows.append((a, 'signature'))
        elif a in sc['visible']: rows.append((a, 'visible'))
        elif a in sc['hidden']: rows.append((a, 'hidden by pose'))
        else: rows.append((a, 'UNACCOUNTED'))
    extra = [a for a in sig | set(sc['visible']) | set(sc['hidden']) if a not in anatomy]
    return rows, extra


def build(key, pose=None):
    rec = json.loads((ROOT / 'docs' / 'species-templates' / f'{key}.json').read_text(encoding='utf-8'))
    sc = SHOWCASE[key]
    rows, extra = coverage(rec, sc)
    bad = [a for a, s in rows if s == 'UNACCOUNTED']
    if bad or extra:
        raise SystemExit(f'{key}: showcase.json does not account for anatomy {bad}; unknown keys {extra}')
    sigs = '; '.join(f'{s["cue"]}' for s in sc['signature'])
    sig_names = ' and '.join(s['anatomy'] for s in sc['signature'])
    vis = '; '.join(v for v in sc['visible'].values())
    parts = [sc['identity'],
             f'Its two signature features, which must be unmistakable in this image, are the {sig_names}: {sigs}.']
    if vis: parts.append(f'Also in view: {vis}.')
    if sc['hidden']: parts.append('Hidden by the pose: ' + '; '.join(sc['hidden'].values()) + '.')
    pose_text = sc.get('poses', {})[pose] if pose else sc['pose']
    parts += [CONSISTENCY, pose_text]
    return ' '.join(parts), rows


if __name__ == '__main__':
    prompt, rows = build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    print(prompt); print()
    for a, s in rows: print(f'  {a:10} {s}')

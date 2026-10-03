"""One page a planner reads first: the region's steps, tool parameters, measured criteria and past plans.

    python art/species-construction/loop/planner_digest.py <species> <region> [--with R04] [--round 22] [--out FILE]

Round 21's eight planners spent 53 percent of the round's tokens, most of it exploring: reading
RECIPE.md, loop_tools.py and step scripts with grep and sed to find which steps carry the region,
what their parameters are called and what earlier plans already tried. Everything here is read from
files the loop keeps (recipe, tool records, the baseline packet's measured.json, plan results, the
region's history in status.json); nothing is summarized by a model, so nothing is lost in a paraphrase.
The planner still reads the spec, the targets and the images itself.
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))


def load(p):
    try:
        return json.loads(Path(p).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def rel(p):
    try:
        return Path(p).resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(p).replace('\\', '/')


def step_lines(rc, recipe_path, regions, cache):
    rcp = rc.load(recipe_path)
    out = []
    for s in rcp.order:
        if not set(s.get('regions') or []) & set(regions):
            continue
        minutes = rc.step_minutes(rcp, cache, s['id'])
        after = [d for d in rcp.descendants(s['id'])] if hasattr(rcp, 'descendants') else []
        rebuild = sum(rc.step_minutes(rcp, cache, d) or 0 for d in after)
        args = ' '.join(str(a) for a in s.get('args') or [])
        out.append(f"- {s['id']} ({s.get('component')}, regions {', '.join(s.get('regions') or [])}): {s['script']}"
                   f"; inputs {json.dumps(s.get('inputs'))}; about {minutes or 0:.1f} min, plus {rebuild:.1f} min for the {len(after)} steps after it"
                   f"\n  args: {args[:600]}")
    return rcp, out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('species')
    ap.add_argument('region')
    ap.add_argument('--with', dest='partners', default='')
    ap.add_argument('--round', type=int, default=None)
    ap.add_argument('--out')
    a = ap.parse_args()
    import recipe as rc
    docs = ROOT/'docs/design/species-construction'/a.species
    loop = docs/'loop'
    regions = [a.region]+[r for r in a.partners.split(',') if r]
    status = load(loop/'status.json') or {}
    rubric = load(loop/'rubric.json') or {'regions': {}}
    base_recipe = ROOT/(status.get('baseline', {}).get('recipe') or f'docs/design/species-construction/{a.species}/recipe.json')
    base = rc.load(base_recipe)
    cache = rc.Cache(base)
    lines = [f"# Planner digest: {', '.join(regions)} (round {a.round or (status.get('round', 0)+1)})", '',
             'Read from the loop\'s files; read the spec, its targets and the images yourself. Open other files only for what this page lacks.', '']

    lines += ['## Baseline steps that carry the region', f'Recipe {rel(base_recipe)}; baseline {status.get("baseline", {}).get("assembly")}.']
    _, sl = step_lines(rc, base_recipe, regions, cache)
    lines += sl or ['- none: the region has no step yet; a plan adds one with an add edit']
    for rid in regions:
        rec = load(loop/'tools'/f'{rid}.json')
        if not rec:
            continue
        lines += ['', f'## Tool record for {rid}: {rec.get("script")}', f'Starter recipe {rec.get("recipe")}' + (f'; reader check: {rec["readerCheck"]}' if rec.get('readerCheck') else '')]
        if rec.get('recipe') and (ROOT/rec['recipe']).is_file():
            _, tl = step_lines(rc, ROOT/rec['recipe'], regions, cache)
            lines += ['Steps in the starter:'] + tl
        for p in rec.get('parameters') or []:
            lines.append(f"- `{p.get('name')}` (default {p.get('default')}): {p.get('what')}")
        if rec.get('notes'):
            lines.append(f"Notes: {str(rec['notes'])[:800]}")

    packet = Path(status.get('baseline', {}).get('packet') or '')
    measured = load(packet/'measured.json') or {}
    lines += ['', '## Measured criteria now (baseline packet)']
    for rid in regions:
        for c in rubric['regions'].get(rid, []):
            if c['kind'] != 'measured':
                continue
            m = measured.get(c['id'], {})
            bound = ' to '.join(str(c[k]) for k in ('min', 'max') if c.get(k) is not None)
            lines.append(f"- {c['id']} ({c['source']}): {m.get('value')} against {bound or c.get('expected')}, {m.get('result')}. {c.get('text', '')[:160]}")
    for rid in regions:
        t = loop/'specs'/f'{rid}-targets.md'
        lines.append(f'Spec targets: {rel(t)}' if t.is_file() else f'No targets file for {rid}; run spec_targets.py as the planner brief says.')

    lines += ['', '## What earlier plans and orders tried']
    for rid in regions:
        for h in (status.get('regions', {}).get(rid, {}).get('history') or [])[-4:]:
            lines.append(f"- round {h.get('round')} {'kept' if h.get('kept') else 'reverted'} ({h.get('verdict') or 'no verdict'}): {str(h.get('approach', ''))[:220]}"
                         + (f" Why: {str(h.get('reason'))[:300]}" if h.get('reason') else ''))
    for f in sorted((loop/'plans').glob('r*-plan-result.json'), key=lambda p: p.stat().st_mtime)[-12:]:
        r = load(f)
        if not r or r.get('region') not in regions:
            continue
        lines.append(f"- {f.name} ({r.get('wallMinutes')} min): " + '; '.join(
            f"{v['id']} {v['name'][:40]} rank {v.get('rank')}" for v in r.get('variants', []) if v.get('built'))[:700])
        for e in r.get('top') or []:
            lines.append(f"  - candidate {e['id']} {e.get('assembly')}: {'ok' if e.get('ok') else 'FAILED ' + str(e.get('failure'))[:160]}; {str(e.get('verdict') or '')[:240]}")

    text = '\n'.join(lines)+'\n'
    out = Path(a.out) if a.out else loop/'digests'/f"r{(a.round or status.get('round', 0)+1):02d}-{a.region}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding='utf-8')
    print(f'wrote {rel(out)} ({len(text)} chars)')


if __name__ == '__main__':
    main()

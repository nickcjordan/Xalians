"""Shakedown: prove the measuring tools move only the criteria they should.

    python art/species-construction/loop/shakedown.py <species> <baseline assembly> [--resume] [--only a,b]

Builds deliberate variants of a baseline assembly, makes a packet for each with the same tools a loop
round uses, and compares each variant's measured criteria with the baseline's:

  unchanged   re-assemble the same head and body. Every measured criterion equal; the largest region
              change sets the noise floor, and sideEffectThreshold in species.json becomes three times it.
  head-swap   the baseline body with an older head. No body criterion may move.
  body-swap   the baseline head with an older body. No head criterion may move.
  broken      one retargeted part (the forearms at 0.8). The criteria of its region must drop or fail,
              and every other criterion holds.

Region pools come from species.json (components). The two invariants and the 'both' regions (R12 and the
whole-figure height invariant) are excluded from the head and body checks because both parts legitimately
move them. Output: <work>/shakedown-<baseline>/shakedown.json, with the variants' packets beside it.
Run it before round 1 of every species and after any change to a measuring tool; --resume reuses the
assemblies and packets already built and only re-measures.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt  # noqa: E402
import species as species_config  # noqa: E402


def component_of(region, pools):
    for name in ('head', 'body', 'both'):
        if region in pools[name]:
            return name
    return None


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def compare(baseline, variant, tolerance):
    """Every criterion in both packets' measured.json: its change, and whether it flipped pass or fail."""
    rows = []
    for cid, b in baseline.items():
        v = variant.get(cid)
        if v is None:
            rows.append({'id': cid, 'region': b['region'], 'baseline': b['value'], 'variant': None, 'delta': None,
                         'moved': True, 'flipped': True})
            continue
        bv, vv = b['value'], v['value']
        delta = None if bv is None or vv is None else round(vv-bv, 5)
        flipped = b['result'] != v['result']
        moved = flipped or (delta is None and bv != vv) or (delta is not None and abs(delta) > tolerance)
        rows.append({'id': cid, 'region': b['region'], 'baseline': bv, 'variant': vv, 'delta': delta,
                     'moved': moved, 'flipped': flipped, 'baselineResult': b['result'], 'variantResult': v['result']})
    return rows


def parts_of(assembly):
    record = load(lt.work(assembly)/'assembly.json')
    names = [Path(p).parent.name for p in record['inputs']]
    return (next(n for n in names if n.startswith('head-')), next(n for n in names if n.startswith('body-')))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('species')
    parser.add_argument('baseline', help='baseline assembly name, e.g. assembled-0458')
    parser.add_argument('--resume', action='store_true', help='reuse variants already built under the shakedown folder')
    parser.add_argument('--repacket', action='store_true', help='keep the assemblies, make new packets (after a change to a measuring tool)')
    parser.add_argument('--only', help='comma list of unchanged,head-swap,body-swap,broken')
    parser.add_argument('--head', help='older head for the head swap (default from species.json)')
    parser.add_argument('--body', help='older body for the body swap (default from species.json)')
    args = parser.parse_args()
    lt.configure(args.species)
    spec = lt.SPECIES
    cfg = spec['shakedown']
    pools = spec['components']
    tol = cfg['tolerance']
    out = lt.WORK/f'shakedown-{args.baseline}'
    if out.exists() and not args.resume:
        sys.exit(f'{out} exists; use --resume to re-measure its variants, or pick another baseline')
    out.mkdir(parents=True, exist_ok=True)
    state_path = out/'state.json'
    state = load(state_path) if state_path.exists() else {}

    def save_state():
        state_path.write_text(json.dumps(state, indent=1)+'\n')

    base_packet = lt.WORK/'loop/packets'/args.baseline
    if not (base_packet/'measured.json').exists():
        sys.exit(f'No baseline packet at {base_packet}')
    base_head, base_body = parts_of(args.baseline)
    baseline = load(base_packet/'measured.json')
    wanted = (args.only.split(',') if args.only else ['unchanged', 'head-swap', 'body-swap', 'broken'])

    def build(name, head, body):
        """Assemble and packet one variant, unless an earlier run already did."""
        entry = state.get(name, {})
        if entry.get('packet') and (Path(entry['packet'])/'measured.json').exists() and not args.repacket:
            return entry
        t0 = time.time()
        built = entry.get('assembly') and (lt.work(entry['assembly'])/'render/geometry.json').exists()             and entry.get('head') == head and entry.get('body') == body
        if not built:
            entry = {'head': head, 'body': body}
            entry['assembly'] = f'assembled-{lt.reserve_number()}'
            state[name] = entry
            save_state()
            lt.cmd_assemble(argparse.Namespace(head=head, body=body, out=entry['assembly'], join=None, fragment_voxels=None))
        assembly = entry['assembly']
        number = 1
        while (out/name/('packet' if number == 1 else f'packet-{number}')).exists():
            number += 1
        packet = out/name/('packet' if number == 1 else f'packet-{number}')
        lt.cmd_packet(argparse.Namespace(name=assembly, packet=str(packet)))
        entry['packet'] = str(packet)
        entry['minutes'] = round((time.time()-t0)/60, 1)
        save_state()
        return entry

    results = {}

    def evaluate(name, entry, expect):
        """expect: 'none' (nothing may move), a component name whose criteria may not move, or ('break', region)."""
        packet = Path(entry['packet'])
        variant = load(packet/'measured.json')
        rows = compare(baseline, variant, tol)
        lt.cmd_diff(argparse.Namespace(baseline=str(base_packet), candidate=str(packet)))
        change = load(packet/'diff.json')['regionChange']
        wrong, expected = [], []
        for r in rows:
            comp = component_of(r['region'], pools) if not r['id'].startswith('I') else 'invariant'
            if expect == 'none':
                must_hold = True
            elif isinstance(expect, tuple):
                must_hold = r['region'] != expect[1] and comp not in ('invariant',)
            else:
                must_hold = comp == expect
            if must_hold and r['moved']:
                wrong.append(r)
            elif r['moved']:
                expected.append(r)
        record = {'assembly': entry['assembly'], 'head': entry['head'], 'body': entry['body'], 'packet': str(packet),
                  'expect': expect if isinstance(expect, str) else {'region': expect[1], 'drop': True},
                  'movedWrongly': wrong, 'movedAsExpected': expected,
                  'largestRegionChange': max(v['magnitude'] for v in change.values()),
                  'regionChange': {r: v['magnitude'] for r, v in change.items()}}
        if isinstance(expect, tuple):
            arm = [r for r in rows if r['region'] == expect[1] and r.get('baselineResult') is not None]
            dropped = [r for r in arm if r['variantResult'] == 'fail' and r['baselineResult'] == 'pass'
                       or (r['delta'] is not None and r['delta'] < -tol)]
            record['brokenRegionDropped'] = [r['id'] for r in dropped]
            record['pass'] = bool(dropped) and not wrong
            if not dropped:
                record['reason'] = f'no {expect[1]} criterion dropped or failed'
        else:
            record['pass'] = not wrong
        if not record['pass'] and 'reason' not in record:
            record['reason'] = 'criteria moved that should hold: '+', '.join(f"{r['id']} ({r['baseline']} to {r['variant']})" for r in wrong)
        return record

    if 'unchanged' in wanted:
        entry = build('unchanged', base_head, base_body)
        rec = evaluate('unchanged', entry, 'none')
        floor = 0.0005
        rec['noiseFloor'] = rec['largestRegionChange']
        rec['threshold'] = round(max(3*rec['largestRegionChange'], floor), 5)
        if rec['largestRegionChange'] > rec['threshold']:
            rec['pass'] = False
        results['unchanged'] = rec
        spec_path = species_config.config_path(args.species)
        species_config.set_threshold(args.species, rec['threshold'])
        print(f'sideEffectThreshold {rec["threshold"]} written to {spec_path}')
    if 'head-swap' in wanted:
        entry = build('head-swap', args.head or cfg['headSwap'], base_body)
        results['head-swap'] = evaluate('head-swap', entry, 'body')
    if 'body-swap' in wanted:
        entry = build('body-swap', base_head, args.body or cfg['bodySwap'])
        results['body-swap'] = evaluate('body-swap', entry, 'head')
    if 'broken' in wanted:
        entry = state.get('broken', {})
        if not entry.get('body'):
            cache = lt.WORK/'pose-cache'/lt.pose_cache_source(base_body)[0]
            new_body = f'body-{lt.reserve_number()}'
            lt.cmd_retarget(argparse.Namespace(body=base_body, out=new_body, scale=cfg['brokenBody']['scale'],
                                               joints=str(cache/'joints.json')))
            # No cache is seeded: the packet inherits the baseline body's pose angles (and poses on the retargeted
            # body's own joints), the same rule every replayed or rebuilt body follows.
            state['broken'] = {'body': new_body}
            save_state()
        entry = build('broken', base_head, state['broken']['body'])
        results['broken'] = evaluate('broken', entry, ('break', cfg['brokenBody']['region']))

    report = {'species': args.species, 'baseline': args.baseline, 'tolerance': tol,
              'threshold': results.get('unchanged', {}).get('threshold'),
              'allPass': all(r['pass'] for r in results.values()),
              'checks': {k: {kk: vv for kk, vv in v.items()} for k, v in results.items()},
              'generated': time.strftime('%Y-%m-%d %H:%M')}
    (out/'shakedown.json').write_text(json.dumps(report, indent=1)+'\n')
    for k, v in results.items():
        print(f"{k}: {'pass' if v['pass'] else 'FAIL'}"+('' if v['pass'] else f" - {v['reason']}"))
    print(f'shakedown {out/"shakedown.json"}')
    sys.exit(0 if report['allPass'] else 1)


if __name__ == '__main__':
    main()

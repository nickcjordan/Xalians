"""Loop state: slim workflow arguments, merging a workflow result back, replaying a stopped run.

    python loop_state.py args <species> [--rounds N] [--cold] [--rubric-texts]
    python loop_state.py merge <species> <workflow result.json> [--note TEXT]
    python loop_state.py replay <species> <journal.jsonl> [--partial] [--no-refresh]

`args` writes <species>/loop/args.json: the species config, limits, baseline (with the
recipe path), round, lastOrders, means, spec paths, method lines, invariants and, per region,
only what a prompt needs. Notes, v1, older history and the rubric texts stay in files. The
same status gives byte-identical output, so a resumed workflow hits its cache.

`merge` writes a workflow's returned status back into status.json without losing the fields
`args` left out, and promotes the adopted candidate recipe to recipe.json.

`replay` rebuilds status and round files from a stopped run's journal with the core's own
judge (node judge_cli.mjs), so no hand-written replay script is needed.

Common test options: --status FILE (read this status instead of status.json) and
--out DIR (write status.json and rounds/ there instead of the species loop folder).
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
NODE = shutil.which('node') or 'node'
COMPONENT_ORDER = {'head': 0, 'body': 1, 'join': 2, 'both': 3}


def species_dirs(species):
    docs = REPO / 'docs' / 'design' / 'species-construction' / species
    return {
        'docs': docs, 'loop': docs / 'loop', 'recipe': docs / 'recipe.json',
        'packets': REPO / 'untracked' / 'species-construction' / species / 'loop' / 'packets',
    }


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def load_species_config(species):
    p = species_dirs(species)['loop'] / 'species.json'
    return read_json(p) if p.exists() else None


def pools_of(config):
    """The order pools of a species config (species.json "components"), or None for v2's defaults."""
    comps = (config or {}).get('components')
    if not comps:
        return None
    return {k: v for k, v in comps.items() if isinstance(v, list)}


def trim(text, n=300):
    text = str(text)
    return text if len(text) <= n else text[:n - 1] + '~'


ISSUE_TRIM = 110
HISTORY_APPROACH_TRIM = 180
HISTORY_REASON_TRIM = 120


def trim_issue(i, n=ISSUE_TRIM):
    return {k: trim(v, n) if isinstance(v, str) else v for k, v in i.items() if k != 'evidence'}


def rel(p):
    """A repo-relative forward-slash path when p is inside the repo."""
    try:
        return Path(p).resolve().relative_to(REPO).as_posix()
    except (ValueError, OSError):
        return str(p).replace('\\', '/')


def means_from_rounds(loop_dir):
    """Round means since the last cold score: the rescore (or round 0) first, then every later round."""
    rounds = []
    for f in sorted((loop_dir / 'rounds').glob('round-*.json')):
        r = read_json(f)
        rounds.append((int(re.match(r'round-(\d+)', f.name).group(1)), r))
    cold = [(n, r) for n, r in rounds if r.get('kind') in ('rescore', 'baseline')]
    if not cold:
        return [r['mean'] for n, r in rounds if 'mean' in r]
    n0, r0 = cold[-1]
    return [r0['mean']] + [r['mean'] for n, r in rounds if n > n0 and not r.get('kind') and 'mean' in r]


def method_lines(loop_dir):
    p = loop_dir / 'methods.json'
    if not p.exists():
        return {}
    data = read_json(p)
    data = data.get('regions', data) if isinstance(data, dict) else {}
    out = {}
    for rid, v in data.items():
        if not re.fullmatch(r'R\d+', rid):
            continue
        if isinstance(v, dict):
            v = v.get('method') or v.get('line') or v.get('summary') or ''
        out[rid] = trim(v)
    return out


def build_args(species, rounds=None, cold=False, rubric_texts=False, status_path=None):
    d = species_dirs(species)
    status = read_json(status_path or d['loop'] / 'status.json')
    rubric = read_json(d['loop'] / 'rubric.json')
    config = load_species_config(species)
    pools = pools_of(config)
    comp_of = {}
    for comp in ('head', 'body', 'both', 'join'):
        for rid in (pools or {'head': ['R01', 'R02', 'R03', 'R04'], 'body': ['R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11'], 'both': ['R12']}).get(comp, []):
            comp_of.setdefault(rid, []).append(comp)
    methods = method_lines(d['loop'])
    regions = {}
    for rid, r in status['regions'].items():
        out = {'name': r['name'], 'weight': r['weight'], 'component': comp_of.get(rid, []),
               'score': r.get('score'), 'results': r.get('results', {}),
               'attempts': r.get('attempts', 0), 'anchorScore': r.get('anchorScore'),
               'parked': bool(r.get('parked')), 'lastWorked': r.get('lastWorked')}
        if r.get('hold'):
            # held by Nick's direction: never ordered, whatever its score (the tails, 2026-10-01)
            out['hold'] = True
        if r.get('parked'):
            # a parked region gets no orders: its issues stay in status.json (merge keeps them), which keeps args small
            out['parkReason'] = trim(r.get('parkReason', ''))
        else:
            out['issues'] = [trim_issue(i) for i in (r.get('issues') or [])[:3]]
        out['history'] = [{'round': h['round'], 'kept': h['kept'], 'approach': trim(h.get('approach', ''), HISTORY_APPROACH_TRIM), 'reason': trim(h.get('reason', ''), HISTORY_REASON_TRIM),
                           **{k: h[k] for k in ('verdict', 'recipe', 'base') if h.get(k)}}
                          for h in (r.get('history') or [])[-4:]]
        regions[rid] = out
    baseline = dict(status['baseline'])
    if d['recipe'].exists():
        baseline.setdefault('recipe', rel(d['recipe']))
    slim = {
        'schemaVersion': status.get('schemaVersion'), 'limits': status['limits'], 'baseline': baseline,
        'round': status['round'], 'lastOrders': status['lastOrders'], 'means': means_from_rounds(d['loop']),
        'specs': {rid: {k: rel(v) for k, v in sp.items() if k in ('path', 'image')} for rid, sp in (status.get('specs') or {}).items()},
        'methods': methods, 'invariants': status.get('invariants', {}), 'regions': regions,
    }
    if status.get('audit'):
        slim['audit'] = rel(status['audit'])
    if status.get('auditGaps'):
        slim['auditGaps'] = [{'rank': g['rank'], 'region': g['region'], 'gap': trim(g['gap'], 220), 'structural': bool(g.get('structural'))} for g in status['auditGaps']]
    if rubric_texts:
        rub = {'regions': {rid: [{'id': c['id'], 'kind': c['kind'], 'text': c.get('text', '')} for c in cs] for rid, cs in rubric['regions'].items()}}
    else:
        rub = {'regions': {rid: [{'id': c['id'], 'kind': c['kind']} for c in cs] for rid, cs in rubric['regions'].items()}}
    cfg = {'key': species}
    if config:
        cfg.update({'label': config.get('label'), 'sideEffectThreshold': config.get('sideEffectThreshold'),
                    'regionImages': {k: v for k, v in (config.get('regionImages') or {}).items() if re.fullmatch(r'R\d+', k)}})
    args = {'species': cfg, 'pools': pools, 'rubric': rub, 'status': slim}
    if rounds is not None:
        args['rounds'] = rounds
    if cold:
        args['coldBaseline'] = True
    return args


def dump_compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n'


def cmd_args(a):
    args = build_args(a.species, a.rounds, a.cold, a.rubric_texts, a.status)
    text = dump_compact(args)
    out = Path(a.out) / 'args.json' if a.out else species_dirs(a.species)['loop'] / 'args.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(text.encode('utf-8'))
    size = len(text.encode('utf-8'))
    print(f'wrote {out} ({size} bytes, {size / 1024:.1f} KB)')
    return size


# ---- merge ------------------------------------------------------------------------------------

REGION_FIELDS = ('score', 'results', 'attempts', 'anchorScore', 'lastWorked')
DROP_KEYS = {'means', 'methods'}


def merge_status(full, returned, d, species):
    """Fold a workflow's returned (slim) status into the full status.json content."""
    S = full
    for rid, r in returned.get('regions', {}).items():
        old = S['regions'].setdefault(rid, {})
        for k in REGION_FIELDS:
            if k in r:
                old[k] = r[k]
        if 'parked' in r:
            old['parked'] = bool(r['parked'])
            if r.get('parked') and r.get('parkReason'):
                old['parkReason'] = r['parkReason']
            elif not r.get('parked'):
                old.pop('parkReason', None)
        if 'issues' in r:
            kept = [trim_issue(i) for i in (old.get('issues') or [])[:3]]
            if r['issues'] != kept:
                old['issues'] = r['issues']
        seen = max([h['round'] for h in old.get('history', [])] or [0])
        for h in r.get('history', []):
            if h['round'] > seen:
                old.setdefault('history', []).append(h)
    for k in ('round', 'lastOrders', 'invariants'):
        if k in returned:
            S[k] = returned[k]
    for rid, sp in (returned.get('specs') or {}).items():
        have = (S.setdefault('specs', {})).get(rid)
        # args sends repo-relative spec paths; an unchanged path keeps the stored (absolute) entry
        if not have or rel(have.get('path', '')) != rel(sp.get('path', '')) or rel(have.get('image', '')) != rel(sp.get('image', '')):
            S['specs'][rid] = sp
    if 'baseline' in returned:
        b = dict(returned['baseline'])
        b['packet'] = b.get('packet', '').replace('\\', '/')
        cand = b.get('recipe')
        canon = rel(d['recipe'])
        if cand and cand.replace('\\', '/') != canon:
            src = Path(cand) if Path(cand).is_absolute() else REPO / cand
            if src.exists():
                shutil.copyfile(src, d['recipe'])
                b['recipe'] = canon
        if 'recipe' in b or 'recipe' in S.get('baseline', {}):
            b.setdefault('recipe', S.get('baseline', {}).get('recipe', canon))
        S['baseline'] = b
    for k, v in returned.items():
        if k not in S and k not in DROP_KEYS and k not in ('regions', 'baseline', 'specs'):
            S[k] = v
    return S


def write_status(S, path):
    Path(path).write_text(json.dumps(S, indent=1, ensure_ascii=False), encoding='utf-8', newline='\n')


def cmd_merge(a):
    d = species_dirs(a.species)
    result = read_json(a.result)
    returned = result.get('status', result)
    status_path = Path(a.status) if a.status else d['loop'] / 'status.json'
    S = merge_status(read_json(status_path), returned, d, a.species)
    if a.note:
        S.setdefault('notes', []).append(a.note)
    out = Path(a.out) / 'status.json' if a.out else status_path
    out.parent.mkdir(parents=True, exist_ok=True)
    write_status(S, out)
    print(f"merged round {S.get('round')} into {out}; milestone {result.get('milestone')!r}, mean {result.get('mean')}")


# ---- replay -----------------------------------------------------------------------------------

def read_journal(path):
    labels, started, results = {}, [], []
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('type') == 'started':
            labels[e['key']] = e['label']
            started.append(e['label'])
        elif e.get('type') == 'result' and e['key'] in labels:
            results.append((labels[e['key']], e.get('result')))
    return started, results


def journal_rounds(path, after_round, partial=False):
    """Complete rounds of a journal in the shape judge_cli's replay takes."""
    started, results = read_journal(path)
    res = {}
    for label, r in results:
        res[label] = r  # a later result of the same label supersedes
    rounds = {}
    for label in started:
        m = re.match(r'(?:builder|critic|combine|spec|record) r(\d+)', label)
        if m:
            rounds.setdefault(int(m.group(1)), []).append(label)
    out, skipped = [], []
    for n in sorted(rounds):
        if n <= after_round:
            skipped.append(n)
            continue
        labels = rounds[n]
        builders = [(re.match(r'builder r\d+ (\w+): (R\d+)', l), l) for l in labels if l.startswith('builder')]
        orders = []
        for m, l in builders:
            comp, rid = m.group(1), m.group(2)
            build = res.get(l)
            order = {'id': rid, 'component': comp}
            o = {'order': order, 'build': None, 'critique': None, 'failed': None, 'spec': res.get(f'spec r{n}: {rid}')}
            if build is None or not isinstance(build, dict):
                o['failed'] = 'builder returned nothing'
            elif build.get('failed') or not build.get('packet') or build.get('technicalPass') is False:
                o['build'] = build
                o['failed'] = build.get('reason') or 'technical check failed'
            else:
                o['build'] = build
                o['critique'] = res.get(f"critic r{n} {comp}: {build['assembly']}")
                if o['critique'] is None:
                    o['failed'] = 'critic returned nothing'
            orders.append(o)
        done = f'record r{n}' in res or (partial and orders and all(o['failed'] or o['critique'] for o in orders))
        if not done:
            continue
        orders.sort(key=lambda o: COMPONENT_ORDER.get(o['order']['component'], 9))
        combine = None
        cb = res.get(f'combine r{n}')
        if isinstance(cb, dict) and not cb.get('failed') and cb.get('packet') and cb.get('technicalPass') is not False:
            check = next((v for l, v in res.items() if l.startswith(f'critic r{n} combined:')), None)
            if check:
                combine = {'build': cb, 'check': check}
        out.append({'round': n, 'outcomes': orders, 'combine': combine})
    return out, skipped


def cmd_replay(a):
    d = species_dirs(a.species)
    status_path = Path(a.status) if a.status else d['loop'] / 'status.json'
    S = read_json(status_path)
    rubric = read_json(d['loop'] / 'rubric.json')
    config = load_species_config(a.species)
    rounds, skipped = journal_rounds(a.journal, S['round'], a.partial)
    if not rounds:
        print(f'no complete round after round {S["round"]} in {a.journal}' + (f' (already merged: {skipped})' if skipped else ''))
        return 1
    if rounds[0]['round'] != S['round'] + 1:
        print(f'journal starts at round {rounds[0]["round"]} but the status is at round {S["round"]}: replay needs the status the run started from', file=sys.stderr)
        return 2
    comps = pools_of(config)
    req = {'op': 'replay', 'state': S, 'rubric': rubric, 'packetsDir': str(d['packets']).replace('\\', '/'), 'pools': comps,
           'threshold': (config or {}).get('sideEffectThreshold') if a.carry else None,
           'regionImages': {k: v for k, v in ((config or {}).get('regionImages') or {}).items() if re.fullmatch(r'R\d+', k)} or None,
           'refresh': not a.no_refresh, 'rounds': rounds}
    proc = subprocess.run([NODE, '--no-warnings', str(HERE / 'judge_cli.mjs')], input=json.dumps(req), capture_output=True, text=True, encoding='utf-8')
    if proc.returncode:
        print(proc.stderr, file=sys.stderr)
        return proc.returncode
    res = json.loads(proc.stdout)
    S2 = res['state']
    run = Path(a.journal).parent.name
    first, last = rounds[0]['round'], rounds[-1]['round']
    S2.setdefault('notes', []).append(f"{date.today().isoformat()}: rounds {first} to {last} rebuilt from the journal of {run} with loop_state.py replay" + ('; ' + '; '.join(res['notes']) if res['notes'] else ''))
    out_dir = Path(a.out) if a.out else d['loop']
    (out_dir / 'rounds').mkdir(parents=True, exist_ok=True)
    write_status(S2, out_dir / 'status.json')
    for e in res['entries']:
        (out_dir / 'rounds' / f"round-{e['round']:02d}.json").write_bytes(json.dumps(e, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    for e in res['entries']:
        print(f"round {e['round']}: " + ' | '.join(f"{o['region']} {'KEPT' if o['kept'] else 'reverted'} ({o['reason'] or 'ok'})" for o in e['orders']) + f" mean {e['mean']}")
    for n in res['notes']:
        print('note:', n)
    print(f'wrote {out_dir / "status.json"} and {len(res["entries"])} round file(s)')
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('args'); p.add_argument('species'); p.add_argument('--rounds', type=int); p.add_argument('--cold', action='store_true')
    p.add_argument('--rubric-texts', action='store_true', help='include criterion texts (what the v2 workflow prompts need)')
    p.add_argument('--status'); p.add_argument('--out')
    p.set_defaults(fn=cmd_args)
    p = sub.add_parser('merge'); p.add_argument('species'); p.add_argument('result'); p.add_argument('--note'); p.add_argument('--status'); p.add_argument('--out')
    p.set_defaults(fn=cmd_merge)
    p = sub.add_parser('replay'); p.add_argument('species'); p.add_argument('journal')
    p.add_argument('--partial', action='store_true', help='also replay a last round whose builders and critics finished but whose record did not')
    p.add_argument('--no-refresh', action='store_true', help='do not re-read measured results from the packets')
    p.add_argument('--carry', action='store_true', help="apply the species' side-effect carry threshold")
    p.add_argument('--status'); p.add_argument('--out')
    p.set_defaults(fn=cmd_replay)
    a = ap.parse_args(argv)
    r = a.fn(a)
    return r if isinstance(r, int) and a.cmd != 'args' else 0


if __name__ == '__main__':
    sys.exit(main())

"""Progress of the construction loop, generated from the round records (audit 2026-10-07 recommendations 10 and bug 11).

    python art/species-construction/loop/loop_report.py <species> [--round N] [--since N]

Prints, for round N (default the latest record): each order with kept or reverted, the reader votes per region, the
reason, and the target criteria that changed result; the tool reader checks; the open decisions for Nick; the elapsed
minutes. With --since, the progress from that round to N: kept changes and criteria newly passing or newly failing.
The weighted mean is printed last and labelled as the critic's score, not progress (56 percent of its rise in rounds 21
to 28 was regrade of regions no order touched).

`note(loop_dir, n)` is the line loop_state.py merge --auto-note appends to status.json, so no verdict in a status note
is written by hand (round 28's note said a tool the readers rejected 3-0 twice had passed).
"""
import argparse
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


def loop_dir_of(species):
    return REPO / 'docs' / 'design' / 'species-construction' / species / 'loop'


def rounds(loop_dir):
    out = {}
    for f in (loop_dir / 'rounds').glob('round-*.json'):
        m = re.fullmatch(r'round-(\d+)\.json', f.name)
        if m:
            out[int(m.group(1))] = json.loads(f.read_text(encoding='utf-8'))
    return out


def results_of(entry):
    return {rid: dict(r.get('results') or {}) for rid, r in ((entry or {}).get('state') or {}).get('regions', {}).items()}


def changed_criteria(before, after, regions=None):
    """[(id, before, after)] for every criterion whose result changed, in the given regions (all when None)."""
    out = []
    for rid, res in after.items():
        if regions and rid not in regions:
            continue
        for cid, a in res.items():
            b = (before.get(rid) or {}).get(cid)
            if b and a != b:
                out.append((cid, b, a))
    return sorted(out)


def votes(order):
    rv = order.get('readerVerdict') or {}
    return ', '.join(f"{r} {v.get('verdict')} {v.get('better', 0)}-{v.get('worse', 0)}" for r, v in rv.items())


def order_line(order, before, after):
    moved = changed_criteria(before, after, [order['region']]) if order.get('kept') else []
    parts = [f"{order['region']} {'KEPT' if order.get('kept') else 'reverted'}"]
    if order.get('assembly'):
        parts.append(order['assembly'])
    v = votes(order)
    if v:
        parts.append('readers ' + v)
    if moved:
        parts.append('criteria ' + ', '.join(f'{c} {b} to {a}' for c, b, a in moved))
    elif order.get('kept'):
        parts.append('no criterion moved')
    if order.get('alarm'):
        parts.append('ALARM ' + order['alarm'])
    elif not order.get('kept') and order.get('reason'):
        parts.append('why: ' + str(order['reason'])[:220])
    return '; '.join(parts)


def note(loop_dir, n=None):
    rs = rounds(loop_dir)
    if not rs:
        return None
    n = n if n is not None else max(rs)
    e = rs[n]
    prev = rs.get(n - 1)
    before, after = results_of(prev) if prev else {}, results_of(e)
    lines = [order_line(o, before, after) for o in e.get('orders', [])]
    st = e.get('state') or {}
    checks = st.get('toolChecks') or {}
    tools = '; '.join(f"tool {r} readers {str(c).split(':')[0]}" for r, c in checks.items())
    open_items = [d for d in (st.get('decisions') or []) if not d.get('answer')]
    text = f"Round {n}" + (f" ({e['elapsedMinutes']} min)" if e.get('elapsedMinutes') is not None else '') + ': ' + ' | '.join(lines)
    if tools:
        text += ' | ' + tools
    if e.get('coldRescore'):
        cr = e['coldRescore']
        text += f" | cold rescore {cr.get('meanBefore')} to {e.get('mean')}"
    if open_items:
        text += ' | waiting for Nick: ' + ', '.join(f"{d['kind']} {d.get('region', '')}".strip() for d in open_items)
    if e.get('skippedForTime'):
        text += ' | skipped for time: ' + ', '.join(e['skippedForTime'])
    return text + f" (critic score {e.get('mean')})"


def progress(loop_dir, since, n=None):
    rs = rounds(loop_dir)
    n = n if n is not None else max(rs)
    base = rs.get(since)
    kept = [(k, o['region'], o.get('assembly')) for k in sorted(rs) if since < k <= n for o in rs[k].get('orders', []) if o.get('kept')]
    moved = changed_criteria(results_of(base), results_of(rs[n])) if base else []
    up = [m for m in moved if m[2] == 'pass' or (m[1] == 'fail' and m[2] == 'partial')]
    down = [m for m in moved if m not in up]
    return {'rounds': [since + 1, n], 'kept': kept, 'criteriaUp': up, 'criteriaDown': down,
            'mean': [base.get('mean') if base else None, rs[n].get('mean')]}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('species')
    ap.add_argument('--round', type=int)
    ap.add_argument('--since', type=int)
    a = ap.parse_args(argv)
    d = loop_dir_of(a.species)
    print(note(d, a.round))
    if a.since is not None:
        p = progress(d, a.since, a.round)
        print(f"Rounds {p['rounds'][0]} to {p['rounds'][1]}: {len(p['kept'])} kept change(s): " +
              (', '.join(f'r{k} {r} {asm}' for k, r, asm in p['kept']) or 'none'))
        print('Criteria up: ' + (', '.join(f'{c} {b} to {x}' for c, b, x in p['criteriaUp']) or 'none'))
        print('Criteria down: ' + (', '.join(f'{c} {b} to {x}' for c, b, x in p['criteriaDown']) or 'none'))
        print(f"Critic score (not progress): {p['mean'][0]} to {p['mean'][1]}")


if __name__ == '__main__':
    main()

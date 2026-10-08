"""Token and time cost of construction loop workflow runs, per role and per round.

    python art/species-construction/loop/loop_costs.py <workflow dir> [<workflow dir> ...]

A transcript writes one API response as two or three lines that carry the same usage block,
so usage is counted once per message id (the 2026-10-02 audit found earlier raw sums about
1.8 times too high). Roles come from the agent labels (builder, critic, planner, runner,
reader, spec, toolsmith, audit, methods, combine, record).
"""
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def agent_cost(path):
    seen, ts, tools = {}, [], set()
    for line in path.read_text(encoding='utf-8').splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('timestamp'):
            ts.append(e['timestamp'])
        m = e.get('message') or {}
        u = m.get('usage') if e.get('type') == 'assistant' else None
        for block in (m.get('content') or []) if e.get('type') == 'assistant' and isinstance(m.get('content'), list) else []:
            if isinstance(block, dict) and block.get('type') == 'tool_use' and block.get('id'):
                tools.add(block['id'])
        if u and m.get('id'):
            seen[m['id']] = (u.get('input_tokens', 0), u.get('output_tokens', 0),
                             u.get('cache_read_input_tokens', 0), u.get('cache_creation_input_tokens', 0))
    p = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00'))
    minutes = (p(ts[-1]) - p(ts[0])).total_seconds() / 60 if len(ts) > 1 else 0
    tot = [sum(v[i] for v in seen.values()) for i in range(4)]
    return {'turns': len(seen), 'toolCalls': len(tools), 'first': ts[0] if ts else None, 'last': ts[-1] if ts else None, 'minutes': round(minutes, 1), 'input': tot[0], 'output': tot[1],
            'cacheRead': tot[2], 'cacheWrite': tot[3], 'total': sum(tot)}


def role_of(label):
    m = re.match(r'(builder|critic|planner|runner|reader|spec|tool|audit|methods|method review|combine|record)', label or '')
    return m.group(1) if m else 'other'


SESSION_CAP = 80  # limits.toolSessionCalls: toolsmith and code builder sessions (audit 2026-10-07 bug 12: one ran 100)


def main(dirs):
    by_role, by_round, grand = defaultdict(lambda: defaultdict(float)), defaultdict(float), 0
    over, first, last = [], None, None
    for d in map(Path, dirs):
        for meta in sorted(d.glob('agent-*.meta.json')):
            label = json.loads(meta.read_text(encoding='utf-8')).get('description', '')
            c = agent_cost(meta.with_name(meta.name.replace('.meta.json', '.jsonl')))
            r = by_role[role_of(label)]
            r['agents'] += 1
            for k in ('turns', 'minutes', 'total', 'output'):
                r[k] += c[k]
            m = re.search(r' r(\d+)', label)
            by_round[int(m.group(1)) if m else 0] += c['total']
            grand += c['total']
            if role_of(label) in ('tool', 'builder') and c['toolCalls'] > SESSION_CAP:
                over.append(f"{label}: {c['toolCalls']} tool calls, {c['total'] / 1e6:.1f}M, {c['minutes']:.0f} min")
            if c['first']:
                first = min(first or c['first'], c['first'])
                last = max(last or c['last'], c['last'])
    print(f'{"role":14} {"agents":>6} {"turns":>7} {"minutes":>8} {"tokens M":>9} {"share":>6}')
    for role, r in sorted(by_role.items(), key=lambda x: -x[1]['total']):
        print(f'{role:14} {int(r["agents"]):6} {int(r["turns"]):7} {r["minutes"]:8.0f} {r["total"] / 1e6:9.1f} {100 * r["total"] / grand:5.0f}%')
    print('per round (0 = prepare and unlabelled):', {k: round(v / 1e6, 1) for k, v in sorted(by_round.items())})
    if first and last:
        p = lambda t: datetime.fromisoformat(t.replace('Z', '+00:00'))
        print(f'wall time {(p(last) - p(first)).total_seconds() / 3600:.2f} h ({first} to {last})')
    for o in over:
        print(f'OVER THE {SESSION_CAP}-CALL SESSION CAP: {o}')
    print(f'total {grand / 1e6:.1f}M tokens, counted once per message')


if __name__ == '__main__':
    main(sys.argv[1:])

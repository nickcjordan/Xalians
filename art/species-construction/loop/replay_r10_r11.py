"""Rebuild loop status after rounds 10 and 11 from the stopped workflow's journal.

Round 10 is applied exactly as the workflow did (both kept, combined).
Round 11's R04 candidate is kept under the new verdict rule: the critic judged it
better, no region lost credit, no invariant newly broke and the weighted mean did
not fall. R07 (verdict same) stays reverted.
"""
import json
import math

REPO = r'C:/dev/src/xalians-akinza-loop/'
L = REPO + 'docs/design/species-construction/akinza/loop/'
J = r'C:/Users/njord/.claude/projects/c--dev-src-Xalians/f0532f7e-7c4a-4de8-a1ff-d63721d93567/subagents/workflows/wf_2e09d56e-fa9/journal.jsonl'

S = json.load(open(L + 'status.json', encoding='utf-8'))
R = json.load(open(L + 'rubric.json', encoding='utf-8'))
IDS = list(S['regions'])
labels, res = {}, {}
for line in open(J, encoding='utf-8'):
    e = json.loads(line)
    if e.get('type') == 'started':
        labels[e['key']] = e['label']
    if e.get('type') == 'result':
        res[labels.get(e['key'])] = e['result']

credit = lambda r: 1 if r == 'pass' else .5 if r == 'partial' else 0


def score(results, rid):
    crits = R['regions'][rid]
    if any(c['id'] not in results for c in crits):
        return None
    return math.floor(100 * sum(credit(results[c['id']]) for c in crits) / len(crits) + .5) / 10


def mean(scores):
    t = sum(S['regions'][i]['weight'] * (scores[i] or 0) for i in IDS)
    return round(t / sum(S['regions'][i]['weight'] for i in IDS), 3)


def apply(critique, base):
    out = {i: dict(base[i]) for i in IDS}
    for c in critique.get('criteria', []):
        rid = c['id'].split('.')[0]
        if rid in out:
            out[rid][c['id']] = c['result']
    return out


base = {i: S['regions'][i]['results'] for i in IDS}
before = {i: S['regions'][i]['score'] for i in IDS}


def adopt(results, issues, invariants, baseline):
    for i in IDS:
        S['regions'][i]['results'] = results[i]
        s = score(results[i], i)
        S['regions'][i]['score'] = s if s is not None else S['regions'][i]['score']
    for rid in {x['region'] for x in issues if x.get('region') in S['regions']}:
        S['regions'][rid]['issues'] = [x for x in issues if x['region'] == rid][:3]
    S['invariants'] = {x['id']: x['ok'] for x in invariants}
    S['baseline'] = baseline


def record_history(rid, rnd, kept, build, reason):
    r = S['regions'][rid]
    r['history'].append({'round': rnd, 'kept': kept, 'approach': build.get('approach', ''), 'reason': reason,
                         'reusable': build.get('reusable', [])})
    r['lastWorked'] = rnd
    r['attempts'] = (r.get('attempts') or 0) + 1
    if r.get('anchorScore') is None:
        r['anchorScore'] = r['score']
    if r['score'] - r['anchorScore'] >= S['limits']['stallGain']:
        r['anchorScore'], r['attempts'] = r['score'], 0
    elif r['attempts'] >= S['limits']['stallAttempts']:
        r['parked'] = True
        r['parkReason'] = f"{r['attempts']} rounds without a net gain of {S['limits']['stallGain']}"


# Round 10: head R02 + body R06 kept, combined into assembled-0377.
h, b, c = res['critic r10 head: assembled-0376'], res['critic r10 body: assembled-0371'], res['critic r10 combined: assembled-0377']
merged = {'criteria': h['criteria'] + b['criteria']}
results = apply(c, apply(merged, base))
comb = res['combine r10']
adopt(results, h.get('issues', []) + b.get('issues', []), c['invariants'],
      {'head': comb['head'], 'body': comb['body'], 'assembly': comb['assembly'], 'packet': comb['packet']})
record_history('R02', 10, True, res['builder r10 head: R02'], '')
record_history('R06', 10, True, res['builder r10 body: R06'], '')
S['round'] = 10
S['lastOrders'].append('R02+R06')
r10 = {i: S['regions'][i]['score'] for i in IDS}
print('after r10', r10, mean(r10))

# Round 11: R04 kept on verdict, R07 reverted.
base = {i: S['regions'][i]['results'] for i in IDS}
hc = res['critic r11 head: assembled-0396']
results = apply(hc, base)
after = {i: (score(results[i], i) if score(results[i], i) is not None else r10[i]) for i in IDS}
losses = [i for i in IDS if after[i] < r10[i]]
broken = [x['id'] for x in hc['invariants'] if not x['ok'] and S['invariants'].get(x['id']) is not False]
verdict = next(p for p in hc['pairwise'] if p['region'] == 'R04')
assert verdict['verdict'] == 'better' and not losses and not broken and mean(after) >= mean(r10), (losses, broken)
hb = res['builder r11 head: R04']
adopt(results, hc.get('issues', []), hc['invariants'],
      {'head': hb['head'], 'body': S['baseline']['body'], 'assembly': hb['assembly'], 'packet': hb['packet']})
record_history('R04', 11, True, hb, 'kept on the critic verdict (better) with no region losing credit; no R04 criterion moved')
bb = res['builder r11 body: R07']
record_history('R07', 11, False, bb, 'critic verdict same; R07 checklist 5.8 to 5.8; posed arm band .874 to .8445 and new pits between the forepaw lobes')
S['round'] = 11
S['lastOrders'].append('R04+R07')
S['notes'].append('2026-10-01: workflow stopped after round 11 to change the keep rule: a candidate the critic judges better, with no region losing credit, no invariant newly broken and no fall in the weighted mean, is kept even when none of its own criteria move. Round 11 R04 (assembled-0396) adopted under that rule; R07 stays reverted. Status rebuilt from the journal by replay_r10_r11.py.')
r11 = {i: S['regions'][i]['score'] for i in IDS}
print('after r11', r11, mean(r11), S['baseline'], {i: (S['regions'][i]['attempts'], S['regions'][i]['parked']) for i in IDS})
json.dump(S, open(L + 'status.json', 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)

rec = json.load(open(L + 'rounds/round-11.json', encoding='utf-8'))
for o in rec['orders']:
    if o['region'] == 'R04':
        o['kept'] = True
        o['reason'] = 'kept on the critic verdict under the rule adopted after this round (better, no region lost credit)'
rec['baseline'] = S['baseline']
rec['scores'] = r11
rec['mean'] = mean(r11)
rec['note'] = 'Recorded first as no change; R04 was adopted afterwards when the keep rule changed.'
json.dump(rec, open(L + 'rounds/round-11.json', 'w', encoding='utf-8', newline='\n'))

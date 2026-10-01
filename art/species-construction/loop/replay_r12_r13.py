"""Rebuild loop status after rounds 12 and 13 from the stopped workflow's journal.

Round 12 is applied as the workflow did (R03 kept on verdict, R09 kept, combined).
Round 13's R03 candidate is kept with the body regions frozen: it changed only the
head, and the per-model pose refit had moved R08's posed thigh band on an identical
body. R05 (verdict worse) stays reverted.
"""
import json
import math

REPO = r'C:/dev/src/xalians-akinza-loop/'
L = REPO + 'docs/design/species-construction/akinza/loop/'
J = r'C:/Users/njord/.claude/projects/c--dev-src-Xalians/f0532f7e-7c4a-4de8-a1ff-d63721d93567/subagents/workflows/wf_899acac5-ffe/journal.jsonl'

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



PKT = r'C:/dev/src/xalians-akinza-loop/untracked/species-construction/akinza/loop/packets/'
HEAD, BODY = ['R01', 'R02', 'R03', 'R04'], ['R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11']

# Round 12: head R03 (kept on verdict) + body R09 kept, combined into assembled-0408.
h, b, c = res['critic r12 head: assembled-0407'], res['critic r12 body: assembled-0402'], res['critic r12 combined: assembled-0408']
results = apply(c, apply({'criteria': h['criteria'] + b['criteria']}, base))
adopt(results, h.get('issues', []) + b.get('issues', []), c['invariants'],
      {'head': 'head-0405', 'body': 'body-0400', 'assembly': 'assembled-0408', 'packet': PKT + 'assembled-0408'})
record_history('R03', 12, True, res['builder r12 head: R03'], 'kept on the critic verdict (better), no region lost credit')
record_history('R09', 12, True, res['builder r12 body: R09'], '')
S['round'] = 12
S['lastOrders'].append('R03+R09')
r12 = {i: S['regions'][i]['score'] for i in IDS}
rec12 = json.load(open(L + 'rounds/round-12.json', encoding='utf-8'))
print('after r12', r12, mean(r12), 'record', rec12['scores'], rec12['mean'])

# Round 13: head R03 kept with body regions frozen; body R05 reverted.
base = {i: S['regions'][i]['results'] for i in IDS}
hc = res['critic r13 head: assembled-0419']
results = apply(hc, base)
for i in BODY:
    results[i] = dict(base[i])
after = {i: score(results[i], i) for i in IDS}
losses = [i for i in IDS if after[i] < r12[i]]
assert not losses and after['R03'] > r12['R03'], (losses, after)
adopt(results, [x for x in hc.get('issues', []) if x.get('region') in HEAD], hc['invariants'],
      {'head': 'head-0415', 'body': 'body-0400', 'assembly': 'assembled-0419', 'packet': PKT + 'assembled-0419'})
record_history('R03', 13, True, res['builder r13 head: R03'], 'kept after freezing the untouched body regions (the pose refit had moved R08.10 on an identical body)')
record_history('R05', 13, False, res['builder r13 body: R05'], 'critic verdict worse: the neck ring, nape step and stem pinch untouched; new ledge and corner nubs on the upper arms; R05 5.8 to 5')
S['round'] = 13
S['lastOrders'].append('R03+R05')
S['notes'].append('2026-10-01: workflow stopped at the start of round 14. Round 13 R03 (assembled-0419) was reverted only because the per-model pose refit moved a posed leg band on an identical body (R08 7.3 to 6.4); the judge now freezes the results of the component an order did not touch, and R03 is adopted. Note for later: the stalk neck lives at the head-body join, but R05 orders go to the body builder only, so it cannot be fixed as the loop is set up.')
r13 = {i: S['regions'][i]['score'] for i in IDS}
print('after r13', r13, mean(r13), S['baseline'], {i: (S['regions'][i]['attempts'], S['regions'][i]['parked']) for i in IDS})
json.dump(S, open(L + 'status.json', 'w', encoding='utf-8', newline=chr(10)), indent=1, ensure_ascii=False)
rec = json.load(open(L + 'rounds/round-13.json', encoding='utf-8'))
for o in rec['orders']:
    if o['region'] == 'R03':
        o['kept'] = True
        o['reason'] = 'kept after freezing the untouched body regions: the pose refit had moved R08.10 on an identical body'
rec['baseline'], rec['scores'], rec['mean'] = S['baseline'], r13, mean(r13)
rec['note'] = 'Recorded first as no change; R03 was adopted afterwards when the judge began freezing untouched components.'
json.dump(rec, open(L + 'rounds/round-13.json', 'w', encoding='utf-8', newline=chr(10)))

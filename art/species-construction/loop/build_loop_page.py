"""Build the Akinza loop progress page from a running workflow's journal.

Replays the loop's keep-or-revert rules over the journal's agent results, so the
page can be rebuilt after every round while the batch is still running.

    python build_loop_page.py <journal.jsonl> [<journal.jsonl> ...] [--out page.html] [--state state.json]

Journals are replayed in order, so later batches continue from earlier ones.
"""
import argparse
import base64
import html
import io
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
A = ROOT/'untracked/species-construction/akinza'
EV = ROOT/'docs/design/species-construction/akinza/evidence'
STATUS = ROOT/'docs/design/species-construction/akinza/loop/status-start.json'
VIEWS = ['front', 'front-left', 'left', 'back', 'right', 'front-right']


def flat(path):
    image = Image.open(path).convert('RGBA')
    ground = Image.new('RGBA', image.size, (255, 255, 255, 255))
    ground.alpha_composite(image)
    return ground.convert('RGB')


def uri(image, width, quality=82):
    image = image.copy()
    if image.width > width:
        image = image.resize((width, round(image.height*width/image.width)), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, 'JPEG', quality=quality, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode()


def view_row(render_dir):
    """Six views cropped to a shared frame so figures keep one scale."""
    bboxes = [Image.open(render_dir/f'{n}.png').getchannel('A').getbbox() for n in VIEWS]
    top = min(b[1] for b in bboxes)-10
    bottom = max(b[3] for b in bboxes)+10
    half = max(b[2]-b[0] for b in bboxes)//2+10
    cells = [flat(render_dir/f'{n}.png').crop(((b[0]+b[2])//2-half, top, (b[0]+b[2])//2+half, bottom))
             for n, b in zip(VIEWS, bboxes)]
    row = Image.new('RGB', (sum(c.width for c in cells), cells[0].height), 'white')
    x = 0
    for c in cells:
        row.paste(c, (x, 0))
        x += c.width
    return row


class Loop:
    """Mirror of the workflow script's state machine."""

    def __init__(self, status):
        self.S = json.loads(json.dumps(status))
        self.L = self.S['limits']
        self.ids = list(self.S['regions'])
        self.history = []
        self.baseline_scores = None
        self.running = None

    def scores(self):
        return {i: self.S['regions'][i]['score'] for i in self.ids}

    def mean(self):
        total = sum(r['weight']*(r['score'] or 0) for r in self.S['regions'].values())
        return round(total/sum(r['weight'] for r in self.S['regions'].values()), 2)

    def apply(self, critique):
        for r in critique.get('regions', []):
            if r.get('id') in self.S['regions'] and isinstance(r.get('score'), (int, float)):
                self.S['regions'][r['id']]['score'] = r['score']
                self.S['regions'][r['id']]['issues'] = (r.get('issues') or [])[:3]

    def pick(self):
        last = self.S['lastOrders'][-self.L['cooldownRounds']:]
        cooled = last[0] if len(last) == self.L['cooldownRounds'] and all(x == last[0] for x in last) else None
        best = None
        for i in self.ids:
            r = self.S['regions'][i]
            if r['parked'] or i == cooled or r['score'] is None or r['score'] >= self.L['passBar']:
                continue
            fix = max([.3]+[x.get('fixability', .5) for x in r['issues']])
            priority = r['weight']*(self.L['passBar']-r['score'])*fix
            if not best or priority > best[1]:
                best = (i, round(priority, 2))
        return best

    def baseline(self, critique):
        self.apply(critique)
        self.baseline_scores = self.scores()
        self.history.append({'kind': 'baseline', 'assembly': self.S['baseline']['assembly'],
                             'summary': critique.get('summary', ''), 'scores': self.scores(), 'mean': self.mean()})

    def round(self, rid, build, critique):
        S, L = self.S, self.L
        S['round'] += 1
        region = S['regions'][rid]
        before = region['score']
        if region['anchorScore'] is None:
            region['anchorScore'] = before
        S['lastOrders'].append(rid)
        region['attempts'] += 1
        entry = {'kind': 'round', 'round': S['round'], 'region': rid, 'before': before, 'build': build or {}}
        if not build or build.get('failed') or not build.get('packet') or build.get('technicalPass') is False:
            entry['kept'] = False
            entry['reason'] = (build or {}).get('reason') or 'build failed'
        elif not critique:
            entry['kept'] = False
            entry['reason'] = 'critic returned nothing'
        else:
            regions = critique.get('regions', [])
            target = next((r for r in regions if r.get('id') == rid), None)
            base = target['baselineScore'] if target and isinstance(target.get('baselineScore'), (int, float)) else before
            delta = round(target['score']-base, 1) if target else 0
            regressions = [r for r in regions if r.get('id') != rid and isinstance(r.get('baselineScore'), (int, float))
                           and r['baselineScore']-r['score'] >= L['regressionDrop']]
            entry.update(delta=delta, regressions=regressions, summary=critique.get('summary', ''),
                         candidate={r['id']: r['score'] for r in regions if 'id' in r})
            weights = {i: S['regions'][i]['weight'] for i in self.ids}
            def mean_of(key):
                values = {r['id']: r.get(key) for r in regions if 'id' in r}
                return sum(weights[i]*(values.get(i) if isinstance(values.get(i), (int, float)) else (S['regions'][i]['score'] or 0))
                           for i in self.ids)/sum(weights.values())
            entry['meanGain'] = round(mean_of('score')-mean_of('baselineScore'), 3)
            need = L['meanGain'] if isinstance(L.get('meanGain'), (int, float)) and S['round'] >= L.get('meanGainFromRound', 0) else float('-inf')
            entry['kept'] = delta >= L['keepGain'] and not regressions and entry['meanGain'] >= need
            if entry['kept']:
                self.apply(critique)
                S['baseline'] = {'head': build.get('head') or S['baseline']['head'],
                                 'body': build.get('body') or S['baseline']['body'],
                                 'assembly': build['assembly'], 'packet': build['packet']}
            elif regressions:
                entry['reason'] = 'broke ' + ', '.join(f"{r['id']} {r['baselineScore']} to {r['score']}" for r in regressions)
            elif delta >= L['keepGain']:
                entry['reason'] = f'weighted score moved {entry["meanGain"]:+.2f}, needs +{L["meanGain"]:g}'
            else:
                entry['reason'] = f'target moved {delta:+g}, needs +{L["keepGain"]}'
        if region['score']-region['anchorScore'] >= L['stallGain']:
            region['anchorScore'] = region['score']
            region['attempts'] = 0
        elif region['attempts'] >= L['stallAttempts']:
            region['parked'] = True
            region['parkReason'] = f"{region['attempts']} rounds without a net gain of {L['stallGain']}"
            entry['parked'] = True
        entry['scores'] = self.scores()
        entry['mean'] = self.mean()
        self.history.append(entry)


def replay(journals, status):
    loop = Loop(status)
    for journal in journals:
        labels, results = {}, []
        for line in Path(journal).read_text(encoding='utf-8').splitlines():
            event = json.loads(line)
            if event['type'] == 'started':
                labels[event['key']] = event['label']
                results.append([event['label'], None])
            elif event['type'] == 'result':
                label = labels.get(event['key'])
                for item in results:
                    if item[0] == label and item[1] is None:
                        item[1] = event['result']
                        break
        pending = None
        for label, result in results:
            if label.startswith('critic: baseline'):
                if result is None:
                    loop.running = 'Scoring the starting model'
                else:
                    loop.baseline(result)
            elif label.startswith('builder r'):
                rid = re.search(r'(R\d\d)', label).group(1)
                if result is None:
                    loop.running = f'Round {loop.S["round"]+1}: building {rid} {loop.S["regions"][rid]["name"]}'
                elif result.get('failed') or not result.get('packet') or result.get('technicalPass') is False:
                    loop.round(rid, result, None)
                else:
                    pending = (rid, result)
            elif label.startswith('critic r') and pending:
                if result is None:
                    loop.running = f'Round {loop.S["round"]+1}: critic judging {pending[0]} {loop.S["regions"][pending[0]]["name"]}'
                else:
                    loop.round(pending[0], pending[1], result)
                    pending = None
            elif label.startswith('cold gate'):
                loop.running = 'Cold approval review' if result is None else None
    return loop


def esc(text):
    return html.escape(str(text or ''))


def clip(text, n=320):
    text = ' '.join(str(text or '').split())
    # Drop the critic's pointer to its own file; the path means nothing to a reader and cannot wrap.
    text = re.sub(r'\s*[^.]*\b(critique|output)\b[^.]*?[A-Za-z]:\\\S*', '', text, flags=re.I)
    text = re.sub(r'\s*[^.]*\b(critique|output)\b[^.]*?untracked/\S*', '', text, flags=re.I)
    return text if len(text) <= n else text[:n].rsplit(' ', 1)[0]+'…'


def fmt(score):
    return '·' if score is None else f'{score:g}'


def page(loop, batch_label, report=''):
    S = loop.S
    rounds = [h for h in loop.history if h['kind'] == 'round']
    reference = uri(Image.open(EV/'identity-run-0001.png').convert('RGB'), 1800)
    best = S['baseline']['assembly']
    best_row = uri(view_row(A/best/'render'), 1800)
    start_row = uri(view_row(A/'assembled-0156'/'render'), 1800) if best != 'assembled-0156' else None
    last = rounds[-1] if rounds else None
    rejected = None
    if last and not last['kept'] and last['build'].get('assembly') and (A/last['build']['assembly']/'render'/'front.png').exists():
        rejected = uri(view_row(A/last['build']['assembly']/'render'), 1800)
    kept = sum(1 for r in rounds if r['kept'])
    nxt = loop.pick()
    mean = loop.mean() if loop.baseline_scores else None
    gate = S['limits']['gate']

    chips = [f'<span class="chip">Round {S["round"]} of {S["limits"]["hardStopRounds"]} max</span>',
             f'<span class="chip">{kept} kept · {len(rounds)-kept} reverted</span>']
    if mean is not None:
        chips.append(f'<span class="chip">Weighted score {mean:g} · gate needs {gate["weightedMean"]:g}</span>')
    chips.append('<span class="chip not">Not ready for approval</span>')
    if loop.running:
        chips.append(f'<span class="chip ok">Now: {esc(loop.running)}</span>')

    if last:
        verdict = f'kept, {last["region"]} {last["delta"]:+g}' if last['kept'] else f'reverted ({esc(last.get("reason"))})'
        latest = (f'<p><strong>Round {last["round"]}, {esc(S["regions"][last["region"]]["name"])}:</strong> {verdict}.</p>'
                  f'<p>{esc(clip(last.get("summary") or last["build"].get("changes"), 600))}</p>')
    elif loop.history:
        latest = f'<p><strong>Starting scores are in.</strong> {esc(clip(loop.history[0]["summary"], 600))}</p>'
    else:
        latest = '<p>The critic is scoring the starting model.</p>'
    if nxt:
        issues = S['regions'][nxt[0]]['issues'][:2]
        latest += (f'<p class="muted">Next target: {nxt[0]} {esc(S["regions"][nxt[0]]["name"])}. '
                   + ' '.join(esc(clip(i.get('summary'), 160)) for i in issues) + '</p>')

    head = ''.join(f'<th class="num">R{r["round"]}</th>' for r in rounds)
    rows = []
    for i in loop.ids:
        reg = S['regions'][i]
        cells = ''
        prev = loop.baseline_scores[i] if loop.baseline_scores else None
        for r in rounds:
            now = r['scores'][i]
            cls = 'num'
            if r['region'] == i:
                cls += ' target ' + ('up' if r['kept'] else 'miss')
            elif now is not None and prev is not None and abs(now-prev) >= .5:
                cls += ' up' if now > prev else ' down'
            cells += f'<td class="{cls}">{fmt(now)}</td>'
            prev = now
        flag = ' <span class="tag">parked</span>' if reg['parked'] else ''
        rows.append(f'<tr><td>{i} {esc(reg["name"])}{flag}</td><td class="num">{reg["weight"]:g}</td>'
                    f'<td class="num">{fmt(loop.baseline_scores[i] if loop.baseline_scores else None)}</td>{cells}</tr>')
    table = (f'<div class="tablewrap"><table><thead><tr><th>Region</th><th class="num">Weight</th><th class="num">Start</th>{head}</tr></thead>'
             f'<tbody>{"".join(rows)}</tbody></table></div>'
             '<p class="muted">Each round column shows the kept model\'s scores after that round. The worked region is outlined; green means it rose and was kept, amber means the attempt was reverted. 8 is the pass bar.</p>')

    log_rows = []
    for r in reversed(rounds):
        result = (f'<span class="ok-t">Kept, {r["delta"]:+g}</span>' if r['kept']
                  else f'<span class="warn-t">Reverted: {esc(r.get("reason"))}</span>')
        if r.get('parked'):
            result += ' <span class="tag">parked</span>'
        log_rows.append(f'<tr><td class="num">{r["round"]}</td><td>{r["region"]} {esc(S["regions"][r["region"]]["name"])}</td>'
                        f'<td>{esc(clip(r["build"].get("changes"), 260))}</td><td>{result}</td></tr>')
    log_table = ('<div class="tablewrap"><table><thead><tr><th>Round</th><th>Region</th><th>What the builder changed</th><th>Critic verdict</th></tr></thead>'
                 f'<tbody>{"".join(log_rows)}</tbody></table></div>') if log_rows else '<p class="muted">No rounds finished yet.</p>'

    decisions = ''.join(f'<li><strong>{esc(d["topic"])}.</strong> {esc(d["state"])}</li>' for d in S.get('decisionsForNick') or [])

    figures = [f'<div class="labelled mat"><div class="label">Reference · first grayscale sheet</div><img src="{reference}" alt="Reference sheet: six views of Akinza"></div>',
               f'<div class="labelled mat"><div class="label">Current best · {esc(best)}</div><img src="{best_row}" alt="Current best model, six clay views"></div>']
    if rejected:
        figures.append(f'<div class="labelled mat"><div class="label">Round {last["round"]} candidate, reverted · {esc(last["build"]["assembly"])}</div><img src="{rejected}" alt="Rejected candidate, six clay views"></div>')
    if start_row:
        figures.append(f'<div class="labelled mat"><div class="label">Loop start · assembled-0156</div><img src="{start_row}" alt="Starting model, six clay views"></div>')

    return f"""<title>Akinza Construction Loop</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;500&family=Saira:wght@500;600;700&display=swap">
<style>
:root {{
  --ground: #f3f5f4; --panel: #ffffff; --ink: #151a18; --muted: #58625d; --rule: #d8dedb;
  --viable: #2f8f63; --viable-tint: rgba(79, 201, 141, 0.14); --warn: #9a5b00; --warn-tint: rgba(214, 140, 20, 0.14);
  --down: #b3264e; --mat: #ffffff;
  --legend: "Saira", Impact, sans-serif; --body: "Atkinson Hyperlegible", system-ui, sans-serif; --data: "Martian Mono", ui-monospace, monospace;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --ground: #0e1311; --panel: #161d1a; --ink: #e6ece9; --muted: #9aa6a0; --rule: #2a3430;
    --viable: #86ffb5; --viable-tint: rgba(134, 255, 181, 0.10); --warn: #f0b45a; --warn-tint: rgba(240, 180, 90, 0.12); --down: #ff7a9c;
    color-scheme: dark;
  }}
}}
:root[data-theme="dark"] {{
  --ground: #0e1311; --panel: #161d1a; --ink: #e6ece9; --muted: #9aa6a0; --rule: #2a3430;
  --viable: #86ffb5; --viable-tint: rgba(134, 255, 181, 0.10); --warn: #f0b45a; --warn-tint: rgba(240, 180, 90, 0.12); --down: #ff7a9c;
  color-scheme: dark;
}}
body {{ background: var(--ground); color: var(--ink); font: 16px/1.55 var(--body); margin: 0; overflow-wrap: anywhere; }}
.wrap > * {{ min-width: 0; }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding: 28px 16px 64px; display: grid; gap: 36px; }}
header {{ display: grid; gap: 10px; }}
.eyebrow {{ font: 600 12px/1 var(--legend); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }}
h1 {{ font: 700 clamp(30px, 5vw, 44px)/1.05 var(--legend); margin: 0; }}
h2 {{ font: 600 22px/1.2 var(--legend); margin: 0; }}
p {{ margin: 0; max-width: 72ch; }}
.muted {{ color: var(--muted); font-size: 14px; }}
.status {{ display: flex; flex-wrap: wrap; gap: 8px; }}
.chip {{ font: 500 12px/1 var(--data); padding: 7px 10px; border: 1px solid var(--rule); background: var(--panel); }}
.chip.not {{ border-color: var(--warn); color: var(--warn); background: var(--warn-tint); }}
.chip.ok {{ border-color: var(--viable); color: var(--viable); background: var(--viable-tint); }}
section {{ display: grid; gap: 14px; }}
section.report {{ border: 1px solid var(--warn); background: var(--panel); padding: 18px 20px; }}
.latest {{ border-left: 3px solid var(--viable); background: var(--panel); padding: 16px 18px; display: grid; gap: 10px; }}
.mat {{ background: var(--mat); border: 1px solid var(--rule); }}
.mat img {{ display: block; width: 100%; height: auto; }}
.label {{ font: 500 11px/1 var(--data); letter-spacing: .06em; text-transform: uppercase; color: #58625d; padding: 10px 12px 0; }}
.labelled {{ display: grid; }}
.stack {{ display: grid; gap: 12px; }}
table {{ border-collapse: collapse; font-size: 14px; }}
.tablewrap {{ overflow-x: auto; }}
th, td {{ text-align: left; padding: 7px 12px 7px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }}
th {{ font: 600 12px/1.2 var(--legend); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }}
.num {{ font-family: var(--data); font-variant-numeric: tabular-nums; white-space: nowrap; }}
td.num {{ padding-left: 6px; }}
td.up {{ color: var(--viable); }} td.down {{ color: var(--down); }}
td.target {{ outline: 1px solid currentColor; outline-offset: -3px; }}
td.target.up {{ background: var(--viable-tint); }} td.target.miss {{ color: var(--warn); background: var(--warn-tint); }}
.ok-t {{ color: var(--viable); }} .warn-t {{ color: var(--warn); }}
.tag {{ font: 500 11px/1 var(--data); border: 1px solid var(--warn); color: var(--warn); padding: 2px 5px; }}
ul {{ margin: 0; padding-left: 22px; display: grid; gap: 6px; max-width: 76ch; }}
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">Akinza construction loop · {esc(batch_label)}</div>
    <h1>Round {S['round']} progress</h1>
    <p class="muted">An Opus 5.5 critic scores twelve regions against your references; a Sonnet 5.5 builder works the region that looks most wrong; a candidate is kept only if its region rises and nothing else drops. Follow-along only: this is not an approval request.</p>
    <div class="status">{''.join(chips)}</div>
  </header>
  {report}
  <section class="latest"><h2>Latest</h2>{latest}</section>
  <section><h2>Model against your sheet</h2><div class="stack">{''.join(figures)}</div>
    <p class="muted">The arms-down stance is a neutral construction pose. Fur strands and texture are a later stage.</p></section>
  <section><h2>Scores by region</h2>{table}</section>
  <section><h2>Round log</h2>{log_table}</section>
  <section><h2>Held for your next check-in</h2><ul>{decisions}</ul></section>
</div>
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('journals', nargs='+')
    parser.add_argument('--out', required=True)
    parser.add_argument('--state')
    parser.add_argument('--batch', default='batch 1')
    parser.add_argument('--report', help='HTML fragment shown above the latest round, for a milestone report')
    args = parser.parse_args()
    loop = replay(args.journals, json.loads(STATUS.read_text(encoding='utf-8')))
    out = Path(args.out)
    out.write_text(page(loop, args.batch, Path(args.report).read_text(encoding='utf-8') if args.report else ''), encoding='utf-8')
    if args.state:
        Path(args.state).write_text(json.dumps({'status': loop.S, 'history': loop.history, 'running': loop.running,
                                                'weightedMean': loop.mean()}, indent=2), encoding='utf-8')
    rounds = [h for h in loop.history if h['kind'] == 'round']
    print(json.dumps({'round': loop.S['round'], 'mean': loop.mean(), 'running': loop.running,
                      'baseline': loop.S['baseline']['assembly'], 'rounds': len(rounds),
                      'sizeMB': round(out.stat().st_size/1e6, 2)}))


if __name__ == '__main__':
    main()

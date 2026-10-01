"""Build the Akinza loop v2 review page from the per-round records.

    python build_loop_page2.py --out page.html [--running "Round 2: builders at work"]

Reads docs/design/species-construction/akinza/loop/rounds/round-*.json (written by the
workflow's recorder after the baseline and after every round) and rubric.json.
"""
import argparse
import html
import json
from pathlib import Path

from PIL import Image

from build_loop_page import A, EV, clip, flat, uri, view_row

ROOT = Path(__file__).resolve().parents[3]
LOOP = ROOT/'docs/design/species-construction/akinza/loop'
PACKETS = A/'loop/packets'


def esc(text):
    return html.escape(str(text if text is not None else ''))


def fmt(v):
    return '·' if v is None else f'{v:g}'


def page(records, rubric, running):
    base = next((r for r in records if r.get('kind') == 'baseline'), None)
    rounds = [r for r in records if r.get('kind') not in ('baseline', 'rescore')]
    last = rounds[-1] if rounds else None
    latest = records[-1] if records else None
    rescored = latest if latest and latest.get('kind') == 'rescore' else None
    current = (last or {}).get('baseline') or {}
    best = current.get('assembly') or (base or {}).get('assembly') or 'assembled-0205'
    mean = (latest or {}).get('mean')

    figures = [f'<div class="labelled mat"><div class="label">Reference · first grayscale sheet</div><img src="{uri(Image.open(EV/"identity-run-0001.png").convert("RGB"), 1800)}" alt="Reference sheet"></div>',
               f'<div class="labelled mat"><div class="label">Current best · {esc(best)}</div><img src="{uri(view_row(A/best/"render"), 1800)}" alt="Current best model, six views"></div>']
    overlay = PACKETS/best/'m11.png'
    if overlay.exists():
        figures.append(f'<div class="labelled mat"><div class="label">Silhouette fit · grey both, blue model only, orange reference only</div><img src="{uri(flat(overlay), 1800)}" alt="Silhouette overlay"></div>')
    if last:
        for o in last['orders']:
            if not o.get('kept') and o.get('assembly') and (A/o['assembly']/'render/front.png').exists():
                figures.append(f'<div class="labelled mat"><div class="label">Round {last["round"]} {esc(o["region"])} candidate, reverted · {esc(o["assembly"])}</div><img src="{uri(view_row(A/o["assembly"]/"render"), 1800)}" alt="Reverted candidate"></div>')

    cards = ''
    if rescored:
        cards = (f'<div class="card"><h3>Re-scored {esc(rescored["assembly"])} on the revised checklist</h3>'
                 f'<p>{esc(clip(rescored.get("summary"), 700))}</p>'
                 '<p class="muted">The checklist gained a glance test per part and fixed-height measurements (ankles, shins, side waist, head base, paws) after the earlier scores proved too generous. The tails are parked as fine.</p></div>')
    elif last:
        for o in last['orders']:
            verdict = o.get('verdict') or {}
            state = '<span class="ok-t">Kept</span>' if o.get('kept') else '<span class="warn-t">Reverted</span>'
            cards += (f'<div class="card"><h3>{esc(o["region"])} · {esc(o["component"])} · {state}</h3>'
                      f'<p>{esc(clip(o.get("approach"), 200))}</p>'
                      f'<p class="muted">Critic: {esc(verdict.get("verdict", "no verdict"))}. {esc(clip(verdict.get("reason"), 260))}</p>'
                      + (f'<p class="muted">Why reverted: {esc(o.get("reason"))}</p>' if not o.get('kept') else '')
                      + f'<p class="muted num">Quick previews {fmt(o.get("previews"))} · component builds {fmt(o.get("componentBuilds"))} · weighted change {fmt(o.get("gain"))}</p></div>')
        if last.get('combined'):
            cards += f'<p class="muted">Both changes were kept and combined into {esc(last["combined"])}.</p>'
    elif base:
        cards = f'<p>Cold checklist baseline scored. {esc(clip(base.get("summary"), 600))}</p>'
    else:
        cards = '<p>The critic is scoring the starting model against the checklist.</p>'

    cols = [('Start' if r.get('kind') == 'baseline' else f'R{r["round"]} re-scored' if r.get('kind') == 'rescore' else f'R{r["round"]}', r)
            for r in records]
    head = ''.join(f'<th class="num">{c}</th>' for c, _ in cols)
    rows = ''
    for rid in rubric['regions']:
        cells, prev = '', None
        for c, rec in cols:
            v = (rec or {}).get('scores', {}).get(rid)
            worked = [o for o in (rec or {}).get('orders', []) if o['region'] == rid]
            cls = 'num'
            if worked:
                cls += ' target ' + ('up' if worked[0].get('kept') else 'miss')
            elif prev is not None and v is not None and v != prev:
                cls += ' up' if v > prev else ' down'
            cells += f'<td class="{cls}">{fmt(v)}</td>'
            prev = v
        rows += f'<tr><td>{rid}</td><td class="num">{len(rubric["regions"][rid])}</td>{cells}</tr>'
    means = ''.join(f'<td class="num"><strong>{fmt((rec or {}).get("mean"))}</strong></td>' for _, rec in cols)
    table = (f'<div class="tablewrap"><table><thead><tr><th>Region</th><th class="num">Criteria</th>{head}</tr></thead>'
             f'<tbody>{rows}<tr><td><strong>Weighted</strong></td><td></td>{means}</tr></tbody></table></div>'
             '<p class="muted">Checklist scores: 10 x the share of a region\'s criteria that pass (partial counts half). The worked region is outlined: green kept, amber reverted. 8 is the pass bar.</p>')

    log = ''
    for r in reversed(rounds):
        for o in r['orders']:
            log += (f'<tr><td class="num">{r["round"]}</td><td>{esc(o["region"])} ({esc(o["component"])})</td>'
                    f'<td>{esc(clip(o.get("approach"), 220))}</td>'
                    f'<td>{"<span class=ok-t>Kept</span>" if o.get("kept") else "<span class=warn-t>Reverted: " + esc(o.get("reason")) + "</span>"}</td></tr>')
    log = (f'<div class="tablewrap"><table><thead><tr><th>Round</th><th>Order</th><th>Approach</th><th>Result</th></tr></thead><tbody>{log}</tbody></table></div>'
           if log else '<p class="muted">No rounds finished yet.</p>')

    chips = [f'<span class="chip">Loop v2 · round {last["round"] if last else 0}</span>']
    if mean is not None:
        chips.append(f'<span class="chip">Weighted checklist {mean:g} · gate needs 8</span>')
    chips.append('<span class="chip not">Not ready for approval</span>')
    if running:
        chips.append(f'<span class="chip ok">Now: {esc(running)}</span>')

    return f"""<title>Akinza Construction Loop</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;500&family=Saira:wght@500;600;700&display=swap">
<style>
:root {{ --ground:#f3f5f4; --panel:#fff; --ink:#151a18; --muted:#58625d; --rule:#d8dedb; --viable:#2f8f63; --viable-tint:rgba(79,201,141,.14); --warn:#9a5b00; --warn-tint:rgba(214,140,20,.14); --down:#b3264e; --mat:#fff;
  --legend:"Saira",Impact,sans-serif; --body:"Atkinson Hyperlegible",system-ui,sans-serif; --data:"Martian Mono",ui-monospace,monospace; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --ground:#0e1311; --panel:#161d1a; --ink:#e6ece9; --muted:#9aa6a0; --rule:#2a3430; --viable:#86ffb5; --viable-tint:rgba(134,255,181,.10); --warn:#f0b45a; --warn-tint:rgba(240,180,90,.12); --down:#ff7a9c; color-scheme:dark; }} }}
:root[data-theme="dark"] {{ --ground:#0e1311; --panel:#161d1a; --ink:#e6ece9; --muted:#9aa6a0; --rule:#2a3430; --viable:#86ffb5; --viable-tint:rgba(134,255,181,.10); --warn:#f0b45a; --warn-tint:rgba(240,180,90,.12); --down:#ff7a9c; color-scheme:dark; }}
body {{ background:var(--ground); color:var(--ink); font:16px/1.55 var(--body); margin:0; overflow-wrap:anywhere; }}
.wrap {{ max-width:1180px; margin:0 auto; padding:28px 16px 64px; display:grid; gap:36px; }}
.wrap > * {{ min-width:0; }}
header {{ display:grid; gap:10px; }}
.eyebrow {{ font:600 12px/1 var(--legend); letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }}
h1 {{ font:700 clamp(30px,5vw,44px)/1.05 var(--legend); margin:0; }}
h2 {{ font:600 22px/1.2 var(--legend); margin:0; }}
h3 {{ font:600 17px/1.3 var(--legend); margin:0; }}
p {{ margin:0; max-width:74ch; }}
.muted {{ color:var(--muted); font-size:14px; }}
.status {{ display:flex; flex-wrap:wrap; gap:8px; }}
.chip {{ font:500 12px/1 var(--data); padding:7px 10px; border:1px solid var(--rule); background:var(--panel); }}
.chip.not {{ border-color:var(--warn); color:var(--warn); background:var(--warn-tint); }}
.chip.ok {{ border-color:var(--viable); color:var(--viable); background:var(--viable-tint); }}
section {{ display:grid; gap:14px; }}
.cards {{ display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); }}
.card {{ background:var(--panel); border:1px solid var(--rule); padding:14px 16px; display:grid; gap:8px; min-width:0; }}
.card .num {{ white-space:normal; }}
.cards > p {{ grid-column:1 / -1; }}
th {{ white-space:nowrap; }}
.mat {{ background:var(--mat); border:1px solid var(--rule); }}
.mat img {{ display:block; width:100%; height:auto; }}
.label {{ font:500 11px/1 var(--data); letter-spacing:.06em; text-transform:uppercase; color:#58625d; padding:10px 12px 0; }}
.labelled {{ display:grid; }}
.stack {{ display:grid; gap:12px; }}
table {{ border-collapse:collapse; font-size:14px; }}
.tablewrap {{ overflow-x:auto; }}
th, td {{ text-align:left; padding:7px 12px 7px 0; border-bottom:1px solid var(--rule); vertical-align:top; }}
th {{ font:600 12px/1.2 var(--legend); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }}
.num {{ font-family:var(--data); font-variant-numeric:tabular-nums; white-space:nowrap; }}
td.num {{ padding-left:6px; }}
td.up {{ color:var(--viable); }} td.down {{ color:var(--down); }}
td.target {{ outline:1px solid currentColor; outline-offset:-3px; }}
td.target.up {{ background:var(--viable-tint); }} td.target.miss {{ color:var(--warn); background:var(--warn-tint); }}
.ok-t {{ color:var(--viable); }} .warn-t {{ color:var(--warn); }}
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">Akinza construction loop · version 2</div>
    <h1>{'Round ' + str(last['round']) if last else 'Checklist baseline'}</h1>
    <p class="muted">Rebuilt exactly from the lost files, then judged on a checklist of {sum(len(v) for v in rubric['regions'].values())} concrete criteria. Head and body are worked in parallel; builders check their own silhouettes before the Opus critic judges. Follow-along only: this is not an approval request.</p>
    <div class="status">{''.join(chips)}</div>
  </header>
  <section><h2>Latest</h2><div class="cards">{cards}</div></section>
  <section><h2>Model against your sheet</h2><div class="stack">{''.join(figures)}</div>
    <p class="muted">The arms-down stance is a neutral construction pose. Fur strands and texture are a later stage.</p></section>
  <section><h2>Checklist scores</h2>{table}</section>
  <section><h2>Round log</h2>{log}</section>
</div>
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    parser.add_argument('--running')
    args = parser.parse_args()
    records = [json.loads(p.read_text(encoding='utf-8')) for p in sorted((LOOP/'rounds').glob('round-*.json'))]
    rubric = json.loads((LOOP/'rubric.json').read_text(encoding='utf-8'))
    Path(args.out).write_text(page(records, rubric, args.running), encoding='utf-8')
    print(json.dumps({'records': len(records), 'sizeMB': round(Path(args.out).stat().st_size/1e6, 2)}))


if __name__ == '__main__':
    main()

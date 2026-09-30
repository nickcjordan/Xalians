"""Build the Akinza round review page with embedded JPEG data URIs."""
import base64
import io
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(r'C:\Users\njord\.codex\worktrees\1d07\Xalians')
A = ROOT/'untracked/species-construction/akinza'
EV = ROOT/'docs/design/species-construction/akinza/evidence'
S = Path(r'C:\Users\njord\AppData\Local\Temp\claude\c--dev-src-Xalians\f0532f7e-7c4a-4de8-a1ff-d63721d93567\scratchpad')
OUT = S/'akinza-review.html'


def flat(path):
    image = Image.open(path).convert('RGBA')
    ground = Image.new('RGBA', image.size, (255, 255, 255, 255))
    ground.alpha_composite(image)
    return ground.convert('RGB')


def uri(image, width, quality=84):
    image = image.copy()
    if image.width > width:
        image = image.resize((width, round(image.height*width/image.width)), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, 'JPEG', quality=quality, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode()


VIEWS = ['front', 'front-left', 'left', 'back', 'right', 'front-right']


def view_row(render_dir, box_height=None):
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


def stack(rows, width):
    rows = [r.resize((width, round(r.height*width/r.width)), Image.LANCZOS) for r in rows]
    sheet = Image.new('RGB', (width, sum(r.height for r in rows)), 'white')
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    return sheet


reference = Image.open(EV/'identity-run-0001.png').convert('RGB')
now = view_row(A/'assembled-0156/render')
before = view_row(A/'assembled-0115/render')
images = {
    'reference': uri(reference, 1800),
    'now': uri(now, 1800),
    'before': uri(before, 1800),
    'turntable': uri(Image.open(S/'review-0156/turntable.png').convert('RGB'), 1600),
    'face': uri(Image.open(S/'review-0156/face-closeups.png').convert('RGB'), 1200),
    'paws': uri(Image.open(S/'review-0156/paw-closeups.png').convert('RGB'), 1200),
    'tail': uri(Image.open(S/'review-0156/tail-closeups.png').convert('RGB'), 1600),
    'tailref': uri(Image.open(EV/'back-study-0018.png').convert('RGB'), 700),
    'earback': uri(flat(A/'head-0152/structure/head-back.png'), 800),
    'earbefore': uri(flat(A/'head-0146/structure/head-back.png'), 800),
}

html = f"""<title>Akinza Build 0156</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;500&family=Saira:wght@500;600;700&display=swap">
<style>
:root {{
  --ground: #f3f5f4; --panel: #ffffff; --ink: #151a18; --muted: #58625d; --rule: #d8dedb;
  --viable: #2f8f63; --viable-tint: rgba(79, 201, 141, 0.12); --warn: #9a5b00; --warn-tint: rgba(214, 140, 20, 0.12);
  --mat: #ffffff;
  --legend: "Saira", "Barlow Condensed", Impact, sans-serif;
  --body: "Atkinson Hyperlegible", system-ui, sans-serif;
  --data: "Martian Mono", ui-monospace, Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --ground: #0e1311; --panel: #161d1a; --ink: #e6ece9; --muted: #9aa6a0; --rule: #2a3430;
    --viable: #86ffb5; --viable-tint: rgba(134, 255, 181, 0.10); --warn: #f0b45a; --warn-tint: rgba(240, 180, 90, 0.12);
    color-scheme: dark;
  }}
}}
:root[data-theme="dark"] {{
  --ground: #0e1311; --panel: #161d1a; --ink: #e6ece9; --muted: #9aa6a0; --rule: #2a3430;
  --viable: #86ffb5; --viable-tint: rgba(134, 255, 181, 0.10); --warn: #f0b45a; --warn-tint: rgba(240, 180, 90, 0.12);
  color-scheme: dark;
}}
body {{ background: var(--ground); color: var(--ink); font: 16px/1.55 var(--body); }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 64px; display: grid; gap: 40px; }}
header {{ display: grid; gap: 10px; }}
.eyebrow {{ font: 600 12px/1 var(--legend); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }}
h1 {{ font: 700 clamp(30px, 5vw, 46px)/1.05 var(--legend); margin: 0; text-wrap: balance; }}
h2 {{ font: 600 22px/1.2 var(--legend); margin: 0; text-wrap: balance; }}
h3 {{ font: 600 16px/1.3 var(--legend); margin: 0; letter-spacing: .02em; }}
p {{ margin: 0; max-width: 68ch; }}
.lede {{ color: var(--muted); font-size: 17px; }}
.status {{ display: flex; flex-wrap: wrap; gap: 8px; }}
.chip {{ font: 500 12px/1 var(--data); padding: 7px 10px; border: 1px solid var(--rule); background: var(--panel); }}
.chip.not {{ border-color: var(--warn); color: var(--warn); background: var(--warn-tint); }}
.chip.ok {{ border-color: var(--viable); color: var(--viable); background: var(--viable-tint); }}
section {{ display: grid; gap: 14px; }}
figure {{ margin: 0; display: grid; gap: 8px; }}
.mat {{ background: var(--mat); border: 1px solid var(--rule); }}
.mat img {{ display: block; width: 100%; height: auto; }}
figcaption {{ font-size: 13px; color: var(--muted); max-width: 90ch; }}
.label {{ font: 500 11px/1 var(--data); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 10px 12px 0; background: var(--mat); }}
.labelled {{ display: grid; }}
.pair {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }}
.decision {{ border: 1px solid var(--viable); background: var(--viable-tint); padding: 18px 20px; display: grid; gap: 10px; }}
ol, ul {{ margin: 0; padding-left: 22px; display: grid; gap: 6px; max-width: 76ch; }}
.num {{ font-family: var(--data); font-variant-numeric: tabular-nums; font-size: 14px; }}
table {{ border-collapse: collapse; font-size: 14px; min-width: 520px; }}
.tablewrap {{ overflow-x: auto; }}
th, td {{ text-align: left; padding: 8px 14px 8px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }}
th {{ font: 600 12px/1.2 var(--legend); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }}
td.num {{ white-space: nowrap; }}
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">Akinza construction · internal round</div>
    <h1>Build 0156</h1>
    <p class="lede">Where the 3D model stands after two correction rounds since the handoff. This is progress for you to look at, not an approval request. Internal review still finds major gaps, listed at the bottom.</p>
    <div class="status">
      <span class="chip not">Not ready for approval</span>
      <span class="chip">Independent review: 4 of 20 checks pass</span>
      <span class="chip">One closed model · all views from the same geometry</span>
    </div>
  </header>

  <section>
    <h2>Against your preferred sheet</h2>
    <figure>
      <div class="labelled mat"><div class="label">Reference · first grayscale sheet</div><img src="{images['reference']}" alt="Reference: six views of Akinza, fur-covered, hands on hips, three fluffy tails"></div>
      <div class="labelled mat"><div class="label">Model 0156 · front, front-left, left, back, right, front-right</div><img src="{images['now']}" alt="Model 0156: six clay views in the same order, arms down"></div>
      <figcaption>The arms-down stance is a neutral construction pose, not a design choice. Fur strands and texture are a later stage; this round judges large and medium form.</figcaption>
    </figure>
  </section>

  <section>
    <h2>Where it started this session</h2>
    <figure>
      <div class="labelled mat"><div class="label">Model 0115 · the last combined model at handoff</div><img src="{images['before']}" alt="Model 0115: six clay views with smooth petal tails and a bald rear ear fan"></div>
      <figcaption>Compare the paws, the tail shape and the back of the ear fan with 0156 above.</figcaption>
    </figure>
  </section>

  <section>
    <h2>What changed</h2>
    <div class="tablewrap"><table>
      <thead><tr><th>Area</th><th>Before</th><th>Now</th></tr></thead>
      <tbody>
        <tr><td>Nose</td><td>A dark wedge sticking out of the muzzle in profile</td><td>A rounded pad seated into the muzzle</td></tr>
        <tr><td>Hind paws</td><td>Four balls stuck on a stump</td><td>Heel, sloping top, four toes, flat ground contact</td></tr>
        <tr><td>Forepaws</td><td>Stumps with a row of straight cones</td><td>Palm toward the thigh, four digits front to back, pale curved claws</td></tr>
        <tr><td>Tail root</td><td>A pinched vertical crease on one buttock</td><td>A soft overlap edge</td></tr>
        <tr><td>Tails</td><td>Arches with tips turning down</td><td>Crescents with tips curling up and out, sweeping farther back</td></tr>
        <tr><td>Back of the ears</td><td>One smooth, bald dish</td><td>Fur clumps parting at the middle and flowing out to each ear</td></tr>
        <tr><td>Knees, calves, forearms</td><td>Knobs and grooves</td><td>Softer, same fullness (some lumps remain)</td></tr>
      </tbody>
    </table></div>
  </section>

  <section>
    <h2>Back of the ear fan</h2>
    <div class="pair">
      <figure><div class="labelled mat"><div class="label">Before · head 0146</div><img src="{images['earbefore']}" alt="Back of the head before: a smooth bald dish"></div></figure>
      <figure><div class="labelled mat"><div class="label">Now · head 0152</div><img src="{images['earback']}" alt="Back of the head now: fur clumps parting at the middle and flowing outward"></div></figure>
    </div>
  </section>

  <section class="decision">
    <h2>One call for you: tail tips</h2>
    <p>The tips now curl up and out, following back study 0018, which you approved with "this tail and positioning looks good." Your preferred first sheet has drooping plumes instead. If you would rather have the droop, it is a one-file change.</p>
    <div class="pair">
      <figure><div class="labelled mat"><div class="label">Back study 0018 · approved tail</div><img src="{images['tailref']}" alt="Back study 0018: three crescent tails with upturned tips"></div></figure>
      <figure><div class="labelled mat"><div class="label">Model 0156 · tail closeups</div><img src="{images['tail']}" alt="Tail root and tail fan closeups of model 0156"></div></figure>
    </div>
  </section>

  <section>
    <h2>Turntable</h2>
    <figure><div class="mat"><img src="{images['turntable']}" alt="Eight elevated views around model 0156"></div></figure>
  </section>

  <section>
    <h2>Closeups</h2>
    <div class="pair">
      <figure><div class="labelled mat"><div class="label">Face · nose, eyes, three-quarter, rear</div><img src="{images['face']}" alt="Face closeups of model 0156"></div></figure>
      <figure><div class="labelled mat"><div class="label">Paws · hind front, profile, oblique, underside; forepaw front and side</div><img src="{images['paws']}" alt="Paw closeups of model 0156"></div></figure>
    </div>
  </section>

  <section>
    <h2>A measurement that changed the plan</h2>
    <p>The ear fan looked too narrow to me and to three reviewers. Measured against the creature's height, its span matches your sheet within about 2 percent. The body is what is off: it is too broad, so the ears look small next to it.</p>
    <div class="tablewrap"><table>
      <thead><tr><th>Width, as a fraction of figure height</th><th>Your sheet</th><th>Model 0156</th></tr></thead>
      <tbody>
        <tr><td>Ear fan, widest</td><td class="num">0.529</td><td class="num">0.534</td></tr>
        <tr><td>Neck</td><td class="num">0.061</td><td class="num">0.082</td></tr>
        <tr><td>Shoulders</td><td class="num">0.202</td><td class="num">0.258</td></tr>
        <tr><td>Waist</td><td class="num">about 0.14</td><td class="num">0.200</td></tr>
      </tbody>
    </table></div>
  </section>

  <section>
    <h2>Next, in order</h2>
    <ol>
      <li>Slim the neck and torso to your sheet's widths, keeping the tail root where you approved it.</li>
      <li>Separate the ear fan into two wings above the skull, and carve a cupped inner ear that shows from the front.</li>
      <li>Set the eyes into sockets; they stick out in profile.</li>
      <li>Arch the hind toes, move the claws to the toe tips and make the paws about 25 percent bigger.</li>
      <li>Remove the leftover knee and calf lumps.</li>
      <li>Slim the tails in profile, where they still look inflated.</li>
    </ol>
  </section>
</div>
"""
OUT.write_text(html, encoding='utf-8')
print(OUT, round(OUT.stat().st_size/1e6, 2), 'MB')

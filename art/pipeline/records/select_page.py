"""Option-selection page: one self-contained HTML fragment for a claude.ai Artifact, built from a stage's records.

Usage (from the worktree root):
  python art/pipeline/records/select_page.py <creature> <stage> --spec spec.json --out select.html [--index index.json]

The spec (JSON) carries the human copy: title, heading, lede, element order, and per element its name,
question, "what to judge" list, reading references into stages/01-intake/reading.json (for example
"mustHave[2]", "openForDesign[0]", "carriedOverFromSilhouette[4]") and the recommendation (letter plus
reason); plus fold, fallback, compositeEmpty and confirmed strings. Options come from the stage's image
builds (scope = element, report.image.label/summary, outputs[0].hash), or from --index (the vision
runner's index.json) when given. The base is the image most options were edited from.

The page publishes with capabilities {db: {}, user: {}, comments: {}}. Store layout it reads and writes:
  picks/<element>      {alias, label, blob, at}             set on Pick, deleted on Undo
  requests/<element>   {kind: "new-set"|"mix", text, at}   set from the two request boxes
  composite/current    {blob, label, note, dataUri?}        written by the orchestrator, shown when all are picked
  status/board         {submitted: true, at, picks}         set by "Confirm these picks"
An element may carry "mode": "approve" (an aspect Nick approves rather than picks from): all its views show as cards
without Pick buttons, one "Approve <name>" button writes picks/<element> {alias: "a,b,c", label: "approved", blob,
blobs: [...], at}, and "Needs work" writes requests/<element> {kind: "rework", text, at}. "recommend": null means no
recommendation; an optional "note" string renders under the question.
An element may carry "mode": "gallery" with "views": [{"label", "blob", "caption"}] listed explicitly in the spec (blob =
sha256 in the pipeline store): it renders and behaves like approve mode (cards, overlay compare, one Approve button writing
picks/<element> with every view blob, a Needs work box writing requests/<element> kind rework, undo via the rail). An
element may carry "mode": "info" with "views" and an optional "table": [[cell, ...], ...] (first row is the header): it shows
the views as plain figures and the table, has no buttons, and is not counted among the picks.
Notification: Confirm and the request submits (new set, mix, needs work) also call comments.sendToClaude, anchored at
the confirm box or the request form, when canSendToClaude() reads "available"; picks and approvals never send. Any
rejection shows "Could not notify the orchestrator; tell them in chat." and is never retried. Without the comments
capability the page behaves as before and says so in a line under the picks.
A sticky left rail (a closed fold on phones) carries the "Source material" once: the species silhouette
(docs/species-templates/art/<key>.png, embedded once as a CSS variable), the raw lore from
docs/species-templates/v5/<key>.json, the home world's encyclopedia entry, and the neutral base image with a
one-line note that every option edits it. The key is the creature name. Each section keeps only what differs
per question: title, question, what to judge, the approved reading lines it serves, background toggle, options.
Python 3 standard library plus Pillow.
"""
import argparse
import base64
import html
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import blobs  # noqa: E402
from common import Refusal, creature_dir  # noqa: E402

from PIL import Image  # noqa: E402

E = html.escape
IMG_WIDTH = 720
IMG_MAX_AREA = 2_000_000   # about 1400 x 1400 for a square render; comparison tiles need the detail
REGRID_ASPECT = 2.2       # strips wider than this are split at their white separators and laid out two per row
IMG_MAX_WIDTH = 2400
JPEG_QUALITY = 82
MAX_BYTES = 8 * 1024 * 1024
SILH_WIDTH = 480
SILH_QUALITY = 85
MORE_AFTER = 600
LORE_FIELDS = (("origin", "Origin"), ("habitat", "Habitat"), ("feeding", "Feeding"),
               ("behavior", "Behavior"), ("company", "Company"))
FONTS = ("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700"
         "&family=Martian+Mono:wght@400;500&family=Saira:wght@600&display=swap")


# ---------------------------------------------------------------- inputs

def regrid(im):
    """A wide comparison strip (columns separated by near-white vertical bars) -> the same columns two per row.
    Strips of three or more columns shrink to slivers in the viewer (Nick, 2026-10-19: "kinda hard to see the details")."""
    w, h = im.size
    if w / float(h) < REGRID_ASPECT:
        return im
    px = im.load()
    ys = range(h // 3, h, max(1, h // 24))
    white = [x for x in range(w) if all(sum(px[x, y]) > 720 for y in ys)]
    runs, start = [], None
    for i, x in enumerate(white):
        if start is None:
            start = x
        if i + 1 == len(white) or white[i + 1] != x + 1:
            if x - start >= 2:
                runs.append((start, x))
            start = None
    if not runs:
        return im
    edges, cols = [0], []
    for a, b in runs:
        cols.append((edges[-1], a)); edges.append(b + 1)
    cols.append((edges[-1], w))
    cols = [c for c in cols if c[1] - c[0] > 40]
    if len(cols) < 3:
        return im
    tiles = [im.crop((a, 0, b, h)) for a, b in cols]
    cw = max(t.width for t in tiles); gap = 8
    rows = (len(tiles) + 1) // 2
    out = Image.new("RGB", (2 * cw + gap, rows * h + (rows - 1) * gap), (255, 255, 255))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % 2) * (cw + gap), (i // 2) * (h + gap)))
    return out


def jpeg_data_uri(h):
    """Blob hash -> JPEG data URI, scaled by pixel area (not a fixed width) so wide comparison strips keep their detail."""
    im = Image.open(blobs.get(h))
    im = regrid(im.convert("RGB"))
    scale = min(1.0, (IMG_MAX_AREA / float(im.width * im.height)) ** 0.5, IMG_MAX_WIDTH / float(im.width))
    if scale < 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii"), im.size


def letter_of(label):
    m = re.match(r"\s*([A-Z])\s*:", label or "")
    return m.group(1) if m else None


def options_from_records(creature, stage):
    """{element: [option, ...]} from the stage's reported image builds; latest build wins per letter."""
    bdir = creature_dir(creature) / "stages" / stage / "builds"
    if not bdir.is_dir():
        raise Refusal("no builds folder: %s" % bdir)
    rows = []
    for f in sorted(bdir.glob("B-*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        rep = d.get("report") or {}
        img = rep.get("image") or {}
        outs = d.get("outputs") or rep.get("outputs") or []
        if d.get("status") not in ("reported", "reviewed", "passed") and not outs:
            continue
        if d.get("status") == "superseded":
            continue
        if not outs:
            continue
        rows.append({
            "element": img.get("element") or d.get("scope"),
            "alias": d.get("alias"),
            "label": img.get("label") or d.get("goal") or d.get("alias"),
            "summary": img.get("summary") or "",
            "hash": outs[0]["hash"],
            "inputs": [i.get("hash") for i in (img.get("inputs") or d.get("inputs") or []) if isinstance(i, dict)],
            "createdAt": d.get("createdAt") or "",
        })
    rows.sort(key=lambda r: r["createdAt"])
    out = {}
    for r in rows:
        key = letter_of(r["label"]) or r["alias"]
        out.setdefault(r["element"], {})[key] = r  # later build replaces an earlier one with the same letter
    return {el: sorted(v.values(), key=lambda r: r["label"]) for el, v in out.items()}


def options_from_index(path):
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    return {el: [dict(o, inputs=[]) for o in opts] for el, opts in d.items()}


def pick_base(options, order):
    """The base image: the input most option builds were edited from, else the last base build."""
    c = Counter(h for el in order for o in options.get(el, []) for h in o.get("inputs", []))
    if c:
        h = c.most_common(1)[0][0]
        for o in options.get("base", []):
            if o["hash"] == h:
                return o
        return {"alias": "base", "label": "Base", "summary": "", "hash": h}
    bases = options.get("base") or []
    return bases[-1] if bases else None


def resolve_reading(creature, refs):
    """Reading references -> [(kind, text, note)] from stages/01-intake/reading.json."""
    p = creature_dir(creature) / "stages" / "01-intake" / "reading.json"
    if not p.exists() or not refs:
        return []
    reading = json.loads(p.read_text(encoding="utf-8"))
    kinds = {"mustHave": "Must have", "openForDesign": "Open for design",
             "carriedOverFromSilhouette": "From the silhouette", "notForDesign": "Not for design"}
    out = []
    for ref in refs:
        m = re.fullmatch(r"(\w+)\[(\d+)\]", ref)
        if not m:
            raise Refusal("bad reading reference %r" % ref)
        item = reading[m.group(1)][int(m.group(2))]
        kind = kinds.get(m.group(1), m.group(1))
        if isinstance(item, dict):
            out.append((kind, item.get("feature", ""), item.get("note", "")))
        else:
            out.append((kind, str(item), ""))
    return out


def repo_root():
    here = Path(__file__).resolve()
    for p in here.parents:
        if (p / "docs" / "species-templates").is_dir():
            return p
    raise Refusal("cannot find docs/species-templates above %s" % here)


def silhouette_uri(key):
    """Nick's silhouette -> 480 px wide JPEG data URI (white background kept) and its size."""
    p = repo_root() / "docs" / "species-templates" / "art" / ("%s.png" % key)
    if not p.exists():
        return None, None
    im = Image.open(p)
    if im.mode in ("RGBA", "LA") or "transparency" in im.info:
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    im = im.convert("RGB")
    if im.width > SILH_WIDTH:
        im = im.resize((SILH_WIDTH, round(im.height * SILH_WIDTH / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=SILH_QUALITY, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii"), im.size


def load_source(creature):
    """Lore, home-world entry and silhouette for the creature, or None when it has no species record."""
    root = repo_root()
    sp = root / "docs" / "species-templates" / "v5" / ("%s.json" % creature)
    if not sp.exists():
        return None
    rec = json.loads(sp.read_text(encoding="utf-8"))
    planet = rec.get("homePlanet") or ""
    entry = None
    ep = root / "docs" / "encyclopedia" / "encyclopedia.json"
    if ep.exists() and planet:
        for e in json.loads(ep.read_text(encoding="utf-8")).get("entries", []):
            if (e.get("key") or "").lower() == planet.lower() or (e.get("title") or "").lower() == planet.lower():
                entry = e
                break
    uri, size = silhouette_uri(creature)
    return {"lore": rec.get("lore") or {}, "planet": planet, "element": rec.get("element") or "",
            "entry": entry, "silh": uri, "silhSize": size}


def render_source(src, base_uri):
    """The left rail's body: silhouette, raw lore, home world, then the base image (static HTML, once)."""
    parts = []
    lore = (src or {}).get("lore") or {}
    if src and src["silh"]:
        w, h = src["silhSize"]
        parts.append('<figure class="silh-fig"><div class="silh" role="img" aria-label="Nick&#x27;s silhouette of the creature" '
                     'style="aspect-ratio:%d/%d"></div><figcaption>Nick&#x27;s silhouette</figcaption></figure>' % (w, h))
    if lore.get("description"):
        parts.append('<h4>Description</h4><p>%s</p>' % E(lore["description"]))
    if lore.get("appearance"):
        parts.append('<h4>Appearance (every line mandatory)</h4><ul class="app">%s</ul>'
                     % "".join("<li>%s</li>" % E(a) for a in lore["appearance"]))
    rows = "".join("<dt>%s</dt><dd>%s</dd>" % (E(lbl), E(lore[k])) for k, lbl in LORE_FIELDS if lore.get(k))
    if rows:
        parts.append('<dl class="lorelist">%s</dl>' % rows)
    if src and src["planet"]:
        e = src["entry"]
        parts.append('<h4>Home world</h4><p><strong>%s</strong> <span class="muted">(element: %s)</span></p>'
                     % (E((e or {}).get("title") or src["planet"].title()), E(src["element"].title())))
        if e and e.get("definition"):
            d = e["definition"]
            if len(d) > MORE_AFTER:
                cut = d.rfind(" ", 0, MORE_AFTER)
                cut = cut if cut > 0 else MORE_AFTER
                parts.append('<p>%s <details class="more"><summary>more</summary>%s</details></p>' % (E(d[:cut]), E(d[cut:].strip())))
            else:
                parts.append("<p>%s</p>" % E(d))
        else:
            parts.append('<p class="muted">No encyclopedia entry found for this world.</p>')
    elif src and src["element"]:
        parts.append('<h4>Element</h4><p>%s</p>' % E(src["element"].title()))
    if base_uri:
        parts.append('<h4>Base image</h4><figure class="base-fig"><img src="%s" alt="The neutral gray base every option was edited from">'
                     '<figcaption>The neutral gray base. Every option in every set is an edit of this image.</figcaption></figure>' % base_uri)
    return "".join(parts)


# ---------------------------------------------------------------- page

CSS = r"""
:root{color-scheme:light;
--bg:#f3f4f6;--surface:#ffffff;--surface-2:#eceef2;--fg:#1a1e25;--muted:#576071;--line:#cdd2da;
--blue:#2457a8;--blue-soft:#e3ebf8;--amber:#b9771a;--amber-soft:#fbf0dc;--amber-ink:#6b4108;
--scrim:rgba(243,244,246,.97);
--frame-light:#d8dbe0;--frame-dark:#2b333f;--frame-sky:#cde2f6;
--f-head:"Saira","Arial Narrow",system-ui,sans-serif;--f-text:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;
--f-mono:"Martian Mono",ui-monospace,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
--bg:#12151a;--surface:#1b2028;--surface-2:#232a34;--fg:#e6e9ee;--muted:#9ba5b5;--line:#36404d;
--blue:#7fa7e8;--blue-soft:#1a2a44;--amber:#e0a84a;--amber-soft:#3a2c12;--amber-ink:#f1cd8c;
--scrim:rgba(18,21,26,.97)}}
:root[data-theme="dark"]{color-scheme:dark;
--bg:#12151a;--surface:#1b2028;--surface-2:#232a34;--fg:#e6e9ee;--muted:#9ba5b5;--line:#36404d;
--blue:#7fa7e8;--blue-soft:#1a2a44;--amber:#e0a84a;--amber-soft:#3a2c12;--amber-ink:#f1cd8c;
--scrim:rgba(18,21,26,.97)}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 var(--f-text);overflow-x:hidden}
h1,h2,h3{font-family:var(--f-head);font-weight:600;line-height:1.2;margin:0}
h1{font-size:1.9rem}h2{font-size:1.45rem}h3{font-size:1.05rem}
p{margin:.4em 0}
button,input,textarea{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.mono{font-family:var(--f-mono);font-size:.82rem}
.muted{color:var(--muted)}
.wrap{width:100%;margin:0;padding:16px;box-sizing:border-box}
.layout{display:grid;grid-template-columns:280px minmax(0,1fr) 300px;gap:24px;align-items:start}
header.top{padding:8px 0 16px}
header.top .lede{max-width:70ch;color:var(--muted)}
.progress{display:inline-flex;align-items:center;gap:8px;margin-top:8px;font-weight:700}
.dots{display:inline-flex;gap:4px}
.dots i{width:12px;height:12px;border:2px solid var(--blue);display:inline-block}
.dots i.on{background:var(--blue)}
.notice{border:1px solid var(--line);border-left:6px solid var(--amber);background:var(--surface);padding:10px 12px;margin:12px 0;display:flex;gap:10px;align-items:flex-start}
.notice[hidden]{display:none}
.notice.info{border-left-color:var(--blue)}
.btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:6px 14px;border:2px solid var(--blue);background:var(--surface);color:var(--blue);cursor:pointer;font-weight:700;border-radius:0}
.btn:hover{background:var(--blue-soft)}
.btn.primary{background:var(--blue);color:var(--bg)}
.btn.primary:hover{filter:brightness(1.08)}
.btn.quiet{border-color:var(--line);color:var(--fg);font-weight:400}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.btn[aria-pressed="true"]{background:var(--blue);color:var(--bg)}
svg.ic{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
section.set{background:var(--surface);border:1px solid var(--line);padding:16px;margin:0 0 24px}
.set-head{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;justify-content:space-between}
.set-state{font-weight:700;display:inline-flex;align-items:center;gap:6px}
.set-state.done{color:var(--blue)}
.question{font-size:1.1rem;margin:6px 0 8px}
.judge{margin:0 0 12px;padding-left:1.2em}
.judge li{margin:2px 0}
.ref{background:var(--surface-2);border:1px solid var(--line);padding:10px;font-size:.92rem}
.ref h3{font-size:.95rem;margin-bottom:6px}
.ref ul{list-style:none;margin:0;padding:0}
.ref li{margin:0 0 8px}
.ref li:last-child{margin-bottom:0}
.ref .k{display:block;font-family:var(--f-mono);font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.ref .note{display:block;color:var(--muted);font-size:.85rem}
aside.srcrail{position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto;background:var(--surface);border:1px solid var(--line);padding:14px;font-size:.92rem}
.src-toggle{display:none}
.srcrail h2{font-size:1.2rem;margin-bottom:8px}
.srcrail h4{font-family:var(--f-mono);font-size:.72rem;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:12px 0 4px}
.srcrail p{margin:.3em 0}
.srcrail figure{margin:0}
.srcrail .base-fig img{width:100%;height:auto;display:block;border:1px solid var(--line)}
.srcrail figcaption{font-size:.8rem;color:var(--muted);margin-top:4px}
.srcrail .silh-fig{margin:0 0 8px}
.srcrail .silh{width:100%;background:#fff var(--silh) center/100% 100% no-repeat;border:1px solid var(--line)}
.srcrail .app{margin:0;padding-left:1.1em}
.srcrail .app li{margin:0 0 3px}
.srcrail .lorelist{display:grid;grid-template-columns:70px minmax(0,1fr);gap:6px 10px;margin:10px 0 0}
.srcrail .lorelist dt{font-family:var(--f-mono);font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding-top:2px}
.srcrail .lorelist dd{margin:0;overflow-wrap:anywhere}
.srcrail details.more{display:inline}
.srcrail details.more summary{cursor:pointer;color:var(--blue);text-decoration:underline;display:inline}
.srcrail details.more[open] summary{display:block;margin-top:4px}
.ref{margin:0 0 12px}
.toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}
.toolbar .lbl{font-size:.9rem;color:var(--muted);margin-right:2px}
.seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line)}
.seg button{border:0;border-right:1px solid var(--line);background:var(--surface);padding:6px 10px;min-height:36px;cursor:pointer;font-size:.9rem;display:inline-flex;align-items:center;gap:6px}
.seg button:last-child{border-right:0}
.seg button[aria-pressed="true"]{background:var(--blue-soft);color:var(--fg);font-weight:700;box-shadow:inset 0 -3px 0 var(--blue)}
.swatch{width:14px;height:14px;border:1px solid var(--muted);display:inline-block}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.set.approve .cards{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.set.gallery .cards,.set.info .cards{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.tbl-wrap{margin:0 0 14px;max-width:100%;overflow-x:auto}
table.cmp{border-collapse:collapse;width:100%;font-size:.92rem}
table.cmp th,table.cmp td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
table.cmp th{background:var(--surface-2);font-family:var(--f-head);font-weight:600}
table.cmp tbody th{background:var(--surface);font-family:var(--f-text);font-weight:700}
.set.approved{border-left:10px solid var(--blue)}
.card{position:relative;border:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;transition:opacity .15s}
.card.rec{border:3px solid var(--amber)}
.card.picked{border-left:10px solid var(--blue)}
.set.has-pick .card:not(.picked){opacity:.62}
.set.has-pick .card:not(.picked):hover,.set.has-pick .card:not(.picked):focus-within{opacity:1}
.frame{padding:12px;background:var(--frame-light);border:0;cursor:zoom-in;display:block;width:100%}
.frame img{width:100%;height:auto;display:block}
[data-bg="dark"] .frame,.ov[data-bg="dark"] .frame{background:var(--frame-dark)}
[data-bg="sky"] .frame,.ov[data-bg="sky"] .frame{background:var(--frame-sky)}
.card-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
.card-body h3{font-size:1.1rem}
.card-body .sum{font-size:.92rem;color:var(--muted);margin:0}
.badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--f-mono);font-size:.74rem;font-weight:500;padding:2px 8px;border:2px solid var(--amber);background:var(--amber-soft);color:var(--amber-ink);align-self:flex-start;text-transform:uppercase;letter-spacing:.04em}
.badge.pk{border-color:var(--blue);background:var(--blue-soft);color:var(--fg)}
.reason{font-size:.88rem;border-left:3px solid var(--amber);padding-left:8px;margin:0}
.card-actions{margin-top:auto;padding-top:6px;display:flex;gap:8px;flex-wrap:wrap}
.asks{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.ask{border:1px dashed var(--line);padding:10px 12px}
.ask h3{font-size:1rem;margin-bottom:4px}
.ask label{display:block;font-size:.88rem;color:var(--muted);margin-bottom:4px}
.ask .row{display:flex;gap:8px;flex-wrap:wrap}
.ask input{flex:1 1 180px;min-width:0;min-height:40px;padding:6px 10px;border:1px solid var(--line);background:var(--bg)}
.ask .msg{font-size:.88rem;margin-top:6px}
.asks.one{grid-template-columns:minmax(0,1fr)}
.approve-bar{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}
.approve-bar .msg{margin:0;font-size:.88rem}
.note-line{margin:0 0 8px;font-size:.95rem}
.filed{margin-top:10px;font-size:.92rem;border-left:4px solid var(--blue);padding:4px 8px;background:var(--blue-soft)}
.filed[hidden]{display:none}
aside.rail{position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto;background:var(--surface);border:1px solid var(--line);padding:14px}
.rail-toggle{display:none}
.rail h2{font-size:1.2rem;margin-bottom:8px}
.rail ul.picks{list-style:none;margin:0;padding:0}
.rail li.pk{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid var(--line)}
.rail li.pk img{width:64px;height:auto;display:block;border:1px solid var(--line)}
.rail .el{font-family:var(--f-mono);font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.rail .lb{font-weight:700;font-size:.95rem}
.rail .undo{margin-top:4px}
.linkbtn{background:none;border:0;padding:2px 0;color:var(--blue);text-decoration:underline;cursor:pointer;font-size:.88rem;display:inline-flex;align-items:center;gap:4px}
.confirm-undo{margin-top:4px;font-size:.88rem;border:1px solid var(--line);padding:6px 8px;background:var(--surface-2)}
.confirm-undo .row{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}
.confirm-undo .btn{min-height:32px;padding:2px 10px;font-size:.88rem}
.still{margin:10px 0;font-size:.95rem}
.letters{margin:10px 0;font-size:.78rem;line-height:1.6;color:var(--muted)}
.composite{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}
.composite img{width:100%;height:auto;display:block;border:1px solid var(--line);margin:6px 0}
.done-line{margin-top:10px;font-weight:700;color:var(--blue);display:flex;gap:6px;align-items:flex-start}
details.fold{background:var(--surface);border:1px solid var(--line);padding:10px 14px;margin:8px 0 32px}
details.fold summary{cursor:pointer;font-family:var(--f-head);font-weight:600;font-size:1.1rem}
.ov{position:fixed;inset:0;z-index:50;background:var(--scrim);display:flex;flex-direction:column;overflow:auto}
.ov[hidden]{display:none}
.ov-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--surface);position:sticky;top:0;z-index:1}
.ov-body{padding:16px;max-width:none;width:100%;margin:0 auto}
.ov-ctrl{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-bottom:12px}
.ov-stage{display:grid;grid-template-columns:1fr;gap:16px}
.ov-stage.two{grid-template-columns:1fr 1fr}
.ov-stage figure{margin:0}
.ov-stage .frame{cursor:default}
.ov-stage img{max-height:84vh;width:100%;height:auto;object-fit:contain;margin:0 auto}
.ov-stage figcaption{margin-top:6px}
.ov-stage figcaption strong{font-family:var(--f-head);font-weight:600;font-size:1.1rem}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (min-width:901px) and (max-width:1199px){
 .layout{grid-template-columns:220px minmax(0,1fr) 250px;gap:16px}
}
@media (max-width:900px){
 .layout{grid-template-columns:minmax(0,1fr)}
 aside.srcrail{order:-2;position:static;max-height:none;padding:0;margin:0 -16px;border-left:0;border-right:0}
 .src-toggle{display:flex;width:100%;justify-content:space-between;align-items:center;gap:8px;padding:10px 16px;min-height:48px;background:var(--surface);border:0;cursor:pointer;font-weight:700;text-align:left}
 .src-toggle svg{transition:transform .15s}
 .src-toggle[aria-expanded="true"]{border-bottom:1px solid var(--line)}
 .src-toggle[aria-expanded="true"] svg{transform:rotate(180deg)}
 .src-inner{padding:0 16px 14px;max-height:65vh;overflow:auto}
 .src-inner[hidden]{display:none}
 .srcrail h2{display:none}
 .srcrail .silh-fig{max-width:260px}
 aside.rail{order:-1;position:sticky;top:0;z-index:20;max-height:none;padding:0;margin:0 -16px;border-left:0;border-right:0}
 .rail-toggle{display:flex;width:100%;justify-content:space-between;align-items:center;gap:8px;padding:10px 16px;min-height:48px;background:var(--surface);border:0;cursor:pointer;font-weight:700;text-align:left}
 .rail-toggle svg{transition:transform .15s}
 .rail-toggle[aria-expanded="true"] svg{transform:rotate(180deg)}
 .rail-inner{padding:0 16px 14px;max-height:65vh;overflow:auto}
 .rail-inner[hidden]{display:none}
 .rail h2{display:none}
}
@media (min-width:901px){.rail-inner[hidden],.src-inner[hidden]{display:block!important}}
@media (max-width:760px){
 h1{font-size:1.55rem}
 .asks{grid-template-columns:minmax(0,1fr)}
 .cards{grid-template-columns:minmax(0,1fr)}
 section.set{padding:12px}
 .ov-stage.two{grid-template-columns:1fr}
 .ov-hint{display:none}
 .ov-bar{padding:8px 16px}
 .ov-body{padding:12px 16px}
 .ov-ctrl{gap:6px 8px;margin-bottom:8px}
 .ov-ctrl .btn{min-height:36px;padding:4px 10px;font-size:.88rem}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""

ICONS = {
    "check": '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    "star": '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
    "info": '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    "chev": '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    "zoom": '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/></svg>',
}

BGS = [("light", "Light gray", "var(--frame-light)"), ("dark", "Dark slate", "var(--frame-dark)"),
       ("sky", "Pale sky", "var(--frame-sky)")]


def bg_toggle(el):
    btns = "".join(
        '<button type="button" data-bg-set="%s" data-el="%s" aria-pressed="%s"><span class="swatch" style="background:%s"></span>%s</button>'
        % (k, el, "true" if k == "light" else "false", sw, E(name)) for k, name, sw in BGS)
    return '<span class="lbl">Background</span><span class="seg" role="group" aria-label="Background behind images">%s</span>' % btns


def render_info(el, cfg, opts):
    """An info-only section: views as plain figures and an optional table; no buttons, not counted among the picks."""
    name = cfg.get("name", el.title())
    # Info views open in the same full-size viewer as decision views (flicker, two-up, background), just without picks.
    figs = "".join('<article class="card" data-alias="%s" data-el="%s">'
                   '<button type="button" class="frame" data-open="%s" data-el="%s" aria-label="View %s larger">'
                   '<img data-img="%s" src="%s" alt="%s: %s"></button>'
                   '<div class="card-body"><h3>%s</h3><p class="sum">%s</p>'
                   '<div class="card-actions"><button type="button" class="btn quiet" data-open="%s" data-el="%s">%s View</button></div></div></article>'
                   % (o["alias"], el, o["alias"], el, E(o["label"]), o["alias"], o["uri"], E(name), E(o["label"]),
                      E(o["label"]), E(o["summary"]), o["alias"], el, ICONS["zoom"]) for o in opts)
    tbl = ""
    rows = cfg.get("table") or []
    if rows:
        head = "".join('<th scope="col">%s</th>' % E(str(c)) for c in rows[0])
        body = "".join("<tr>%s</tr>" % ('<th scope="row">%s</th>' % E(str(r[0])) + "".join("<td>%s</td>" % E(str(c)) for c in r[1:]))
                       for r in rows[1:])
        tbl = '<div class="tbl-wrap"><table class="cmp"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (head, body)
    return ('<section class="set info" id="set-%s" data-el="%s" aria-labelledby="h-%s"><div class="set-head"><h2 id="h-%s">%s</h2></div>%s%s%s%s</section>'
            % (el, el, el, el, E(name),
               ('<p class="question">%s</p>' % E(cfg["question"])) if cfg.get("question") else "",
               ('<p class="note-line muted">%s</p>' % E(cfg["note"])) if cfg.get("note") else "",
               tbl, ('<div class="cards">%s</div>' % figs) if figs else ""))


def render_section(el, cfg, opts, rec_alias, reading, n, total):
    name = cfg.get("name", el.title())
    judge = "".join("<li>%s</li>" % E(j) for j in cfg.get("judge", []))
    ref_items = "".join(
        '<li><span class="k">%s</span>%s%s</li>' % (E(k), E(t), ('<span class="note">%s</span>' % E(note)) if note else "")
        for k, t, note in reading)
    ref = ('<div class="ref"><h3>The approved reading</h3><ul>%s</ul></div>'
           % (ref_items or '<li class="muted">No reading lines attached.</li>'))
    if cfg.get("mode") == "info":
        return render_info(el, cfg, opts)
    approve = cfg.get("mode") in ("approve", "gallery")
    cards = []
    for o in opts:
        rec = o["alias"] == rec_alias and not approve
        reason = ('<p class="reason"><span class="sr">Why recommended: </span>%s</p>' % E((cfg.get("recommend") or {}).get("reason", ""))) if rec else ""
        badge = ('<span class="badge">%s Recommended</span>' % ICONS["star"]) if rec else ""
        if approve:
            cards.append(
                '<article class="card" data-alias="%s" data-el="%s">'
                '<button type="button" class="frame" data-open="%s" data-el="%s" aria-label="Compare %s larger">'
                '<img data-img="%s" src="%s" alt="%s: %s"></button>'
                '<div class="card-body"><h3>%s</h3><p class="sum">%s</p>'
                '<div class="card-actions"><button type="button" class="btn quiet" data-open="%s" data-el="%s">%s Compare</button></div></div></article>'
                % (o["alias"], el, o["alias"], el, E(o["label"]), o["alias"], o["uri"], E(name), E(o["label"]),
                   E(o["label"]), E(o["summary"]), o["alias"], el, ICONS["zoom"]))
            continue
        cards.append(
            '<article class="card%s" data-alias="%s" data-el="%s">'
            '<button type="button" class="frame" data-open="%s" data-el="%s" aria-label="Compare %s larger">'
            '<img data-img="%s" src="%s" alt="%s: %s"></button>'
            '<div class="card-body">%s<span class="badge pk" data-picked-badge hidden>%s Picked</span>'
            '<h3>%s</h3><p class="sum">%s</p>%s'
            '<div class="card-actions"><button type="button" class="btn" data-pick="%s" data-el="%s">Pick</button>'
            '<button type="button" class="btn quiet" data-open="%s" data-el="%s">%s Compare</button></div></div></article>'
            % (" rec" if rec else "", o["alias"], el, o["alias"], el, E(o["label"]),
               o["alias"], o["uri"], E(name), E(o["label"]),
               badge, ICONS["check"], E(o["label"]), E(o["summary"]), reason,
               o["alias"], el, o["alias"], el, ICONS["zoom"]))
    if approve:
        asks = (
            '<div class="approve-bar"><button type="button" class="btn primary" data-approve="%(el)s">Approve %(name)s</button>'
            '<p class="msg muted" data-approve-msg="%(el)s" aria-live="polite"></p></div>'
            '<div class="asks one">'
            '<form class="ask" data-ask="rework" data-el="%(el)s"><h3>Needs work</h3>'
            '<label for="rw-%(el)s">What should change? (required)</label>'
            '<div class="row"><input id="rw-%(el)s" type="text" autocomplete="off" placeholder="what to change, and in which view">'
            '<button class="btn" type="submit">Send for rework</button></div><p class="msg muted" aria-live="polite"></p></form>'
            '</div><p class="ask-note muted">Requests save only when the picks store is connected; otherwise put them in your reply.</p>'
            '<p class="filed" data-filed="%(el)s" hidden></p>' % {"el": el, "name": E(name)})
    else:
      asks = (
        '<div class="asks">'
        '<form class="ask" data-ask="new-set" data-el="%(el)s"><h3>None of these</h3>'
        '<label for="ns-%(el)s">What is missing? (optional)</label>'
        '<div class="row"><input id="ns-%(el)s" type="text" autocomplete="off" placeholder="Something wilder, or closer to the sky">'
        '<button class="btn" type="submit">Ask for a new set</button></div><p class="msg muted" aria-live="polite"></p></form>'
        '<form class="ask" data-ask="mix" data-el="%(el)s"><h3>Mix</h3>'
        '<label for="mx-%(el)s">Combine options</label>'
        '<div class="row"><input id="mx-%(el)s" type="text" autocomplete="off" placeholder="A\'s color with B\'s stripes">'
        '<button class="btn" type="submit">Ask for this mix</button></div><p class="msg muted" aria-live="polite"></p></form>'
        '</div><p class="ask-note muted">Requests save only when the picks store is connected; otherwise put them in your reply.</p>'
        '<p class="filed" data-filed="%(el)s" hidden></p>' % {"el": el})
    return (
        '<section class="set%s" id="set-%s" data-el="%s" data-bg="light" aria-labelledby="h-%s">'
        '<div class="set-head"><h2 id="h-%s"><span class="mono muted">%d of %d</span> %s</h2>'
        '<span class="set-state" data-state="%s">%s</span></div>'
        '<p class="question">%s</p>%s<h3>What to judge</h3><ul class="judge">%s</ul>'
        '%s<div class="toolbar">%s</div><div class="cards">%s</div>%s</section>'
        % (" gallery" if cfg.get("mode") == "gallery" else "", el, el, el, el, n, total, E(name), el, "Not approved yet" if approve else "Not picked yet",
           E(cfg.get("question", "")), ('<p class="note-line muted">%s</p>' % E(cfg["note"])) if cfg.get("note") else "", judge, ref, bg_toggle(el), "".join(cards), asks))


JS = r"""
(function(){
'use strict';
var D = JSON.parse(document.getElementById('sel-data').textContent);
var ORDER = D.order, EL = D.elements, TOTAL = ORDER.length;
var IMG = {};
document.querySelectorAll('img[data-img]').forEach(function(im){ IMG[im.getAttribute('data-img')] = im.src; });
var NAPP = ORDER.filter(function(k){ return EL[k].mode === 'approve'; }).length;
var WORD = NAPP === 0 ? 'picked' : NAPP === TOTAL ? 'approved' : 'decided';
var ICON = {check: D.icons.check, star: D.icons.star};
var S = { picks: {}, requests: {}, composite: null, board: null, mode: 'waiting', canWrite: true, pendingUndo: null, firstPicks: true };
var local = {}; // picks made before the store answered
var db = null;
var CM = null, CAN = 'off', canBusy = false;
var NOTIFY_FAIL = 'Could not notify the orchestrator; tell them in chat.';

function $(s, r){ return (r||document).querySelector(s); }
function $$(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function opt(el, alias){ var o = EL[el].options; for (var i=0;i<o.length;i++) if (o[i].alias===alias) return o[i]; return null; }
function el(tag, cls, text){ var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
function iconSpan(name){ var s=document.createElement('span'); s.innerHTML=ICON[name]; return s.firstChild; }
function isApprove(k){ return EL[k].mode === 'approve'; }
function valid(k, p){ return !!p && (isApprove(k) ? p.alias === EL[k].joined : !!opt(k, p.alias)); }
function picksNow(){ return S.mode==='ready' ? S.picks : local; }
function nowIso(){ return new Date().toISOString(); }

function retry(fn){
  return fn().catch(function(e){
    if (e && e.code==='unavailable') return new Promise(function(r){ setTimeout(r, 400+Math.random()*600); }).then(fn);
    throw e;
  });
}
function writeFail(e, msgEl){
  if (e && (e.code==='invalid_argument' || e.code==='not_granted' || e.code==='revoked' || e.code==='capability_disabled' || e.code==='capability_removed')) {
    S.canWrite = false; render();
  }
  if (msgEl) msgEl.textContent = (e && e.code==='quota_exceeded') ? 'The picks store is full; tell the orchestrator.' : 'Could not save that. Try again in a moment.';
}

// ---------------- notification to the orchestrator (comments capability)
function updateNotify(){
  var n = $('#notify-line'); if (!n) return;
  n.textContent = CAN === 'available' ? 'Confirm will notify the orchestrator.' : 'Notification not available in this view; tell the orchestrator in chat after confirming.';
}
function checkCan(){
  if (!CM || typeof CM.canSendToClaude !== 'function') { CAN = 'off'; updateNotify(); return; }
  if (canBusy) return; canBusy = true;
  var done = function(v){ canBusy = false; CAN = v; updateNotify(); };
  try { CM.canSendToClaude().then(done, function(){ done('off'); }); } catch (e) { done('off'); }
}
// Resolves 'sent', 'failed' or 'unavailable'. Call from inside a viewer gesture handler, after the store write.
function notify(anchorEl, text){
  if (!CM || CAN !== 'available' || typeof CM.sendToClaude !== 'function') return Promise.resolve('unavailable');
  var t = String(text); if (t.length > 3500) t = t.slice(0, 3490) + ' ...';
  return CM.anchorFor(anchorEl).then(function(a){ return CM.sendToClaude({ anchor: a, text: t }); })
    .then(function(){ return 'sent'; }, function(){ checkCan(); return 'failed'; });
}

// ---------------- render (pure: reads state, never subscribes or writes)
function render(){
  var P = picksNow(), n = 0;
  ORDER.forEach(function(k){ if (valid(k, P[k])) n++; });
  $('#progress-n').textContent = n + ' of ' + TOTAL + ' ' + WORD;
  $('#rail-count').textContent = 'Your picks: ' + n + ' of ' + TOTAL;
  $$('#dots i').forEach(function(d, i){ d.className = i < n ? 'on' : ''; });

  ORDER.forEach(function(k){
    var ap = isApprove(k), sec = $('#set-'+k), p = valid(k, P[k]) ? P[k].alias : null;
    sec.classList.toggle('has-pick', !!p && !ap);
    sec.classList.toggle('approve', ap);
    sec.classList.toggle('approved', ap && !!p);
    var st = $('[data-state]', sec);
    st.textContent = '';
    if (p && ap) { st.appendChild(iconSpan('check')); st.appendChild(document.createTextNode('Approved')); st.className='set-state done'; }
    else if (p) { st.appendChild(iconSpan('check')); st.appendChild(document.createTextNode('Picked: ' + opt(k,p).label)); st.className='set-state done'; }
    else { st.textContent = ap ? 'Not approved yet' : 'Not picked yet'; st.className='set-state'; }
    if (ap) {
      var ab = $('[data-approve="'+k+'"]', sec);
      ab.textContent = '';
      if (p) ab.appendChild(iconSpan('check'));
      ab.appendChild(document.createTextNode(p ? 'Approved' : 'Approve ' + EL[k].name));
      ab.setAttribute('aria-pressed', p ? 'true' : 'false');
      ab.disabled = !!p || !S.canWrite;
    }
    $$('.card', sec).forEach(function(c){
      if (ap) return;
      var on = c.getAttribute('data-alias') === p;
      c.classList.toggle('picked', on);
      $('[data-picked-badge]', c).hidden = !on;
      var b = $('[data-pick]', c);
      b.textContent = on ? 'Picked' : 'Pick';
      if (on) b.insertBefore(iconSpan('check'), b.firstChild);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = !S.canWrite;
    });
    var req = S.requests[k], f = $('[data-filed="'+k+'"]');
    if (req) {
      f.hidden = false;
      f.textContent = (req.kind==='mix' ? 'Mix request on file: ' : req.kind==='rework' ? 'Rework request on file: ' : 'New set request on file: ') + (req.text ? '"' + req.text + '"' : '(no note)') + '. The orchestrator reads it.';
    } else f.hidden = true;
    $$('.ask input, .ask button', sec).forEach(function(x){ x.disabled = S.mode!=='ready' || !S.canWrite; });
  });

  // notices
  $('#n-wait').hidden = S.mode !== 'waiting';
  $('#n-fallback').hidden = S.mode !== 'none';
  $('#n-readonly').hidden = !(S.mode==='ready' && !S.canWrite);
  $$('.ask-note').forEach(function(x){ x.hidden = S.mode === 'ready'; });

  renderRail(P, n);
  renderOverlay();
}

function renderRail(P, n){
  checkCan();
  var ul = $('#rail-picks'); ul.textContent = '';
  var still = [];
  ORDER.forEach(function(k){
    var ap = isApprove(k), o = valid(k, P[k]) ? (ap ? EL[k].options[0] : opt(k, P[k].alias)) : null;
    if (!o) { still.push(EL[k].name); return; }
    var li = el('li', 'pk');
    var im = el('img'); im.src = IMG[o.alias]; im.alt = ''; li.appendChild(im);
    var box = el('div');
    box.appendChild(el('div', 'el', EL[k].name));
    var lb = el('div', 'lb'); lb.appendChild(iconSpan('check')); lb.appendChild(document.createTextNode(' ' + (ap ? 'Approved' : o.label))); box.appendChild(lb);
    if (S.canWrite) {
      if (S.pendingUndo === k) {
        var cu = el('div', 'confirm-undo'); cu.setAttribute('role','group');
        cu.appendChild(el('div', null, ap ? 'Undo? The approval is removed.' : 'Undo? The options come back.'));
        var row = el('div', 'row');
        var yes = el('button', 'btn', 'Yes, undo'); yes.type='button'; yes.setAttribute('data-undo-yes', k);
        var no = el('button', 'btn quiet', 'Keep'); no.type='button'; no.setAttribute('data-undo-no', k);
        row.appendChild(yes); row.appendChild(no); cu.appendChild(row); box.appendChild(cu);
      } else {
        var u = el('button', 'linkbtn undo', 'Undo'); u.type='button'; u.setAttribute('data-undo', k);
        u.setAttribute('aria-label', 'Undo the ' + EL[k].name + (ap ? ' approval' : ' pick')); box.appendChild(u);
      }
    }
    li.appendChild(box); ul.appendChild(li);
  });
  $('#rail-still').textContent = still.length ? 'Still to ' + (NAPP === 0 ? 'pick' : NAPP === TOTAL ? 'approve' : 'decide') + ': ' + still.join(', ') + '.' : 'All ' + TOTAL + ' sets ' + WORD + '.';
  var letters = ORDER.map(function(k){ var o = valid(k, P[k]) && !isApprove(k) ? opt(k, P[k].alias) : null; return EL[k].name + ' ' + (isApprove(k) ? (valid(k, P[k]) ? 'approved' : '?') : (o ? o.letter : '?')); }).join(', ');
  $('#rail-letters').textContent = 'Letters so far: ' + letters + '.';

  var comp = $('#rail-composite'); comp.hidden = n < TOTAL;
  if (n === TOTAL) {
    var c = S.composite, body = $('#composite-body'); body.textContent = '';
    if (c) {
      if (c.dataUri) { var ci = el('img'); ci.src = c.dataUri; ci.alt = 'Composed preview with all ' + TOTAL + ' picks'; body.appendChild(ci); }
      if (c.label) body.appendChild(el('p', null, c.label));
      if (c.note) body.appendChild(el('p', 'muted', c.note));
      if (!c.dataUri && c.blob) body.appendChild(el('p', 'mono muted', 'Image in the pipeline store: ' + String(c.blob).slice(0,12)));
    } else body.appendChild(el('p', 'muted', D.text.compositeEmpty));
    var picksMap = {}; ORDER.forEach(function(k){ picksMap[k] = P[k].alias; });
    var b = S.board, confirmed = !!(b && b.submitted), same = confirmed && b.picks && ORDER.every(function(k){ return b.picks[k] === picksMap[k]; });
    var cb = $('#confirm-btn'), dl = $('#done-line'), ch = $('#changed-line');
    if (S.mode !== 'ready') { cb.hidden = true; dl.hidden = true; ch.hidden = true; }
    else if (confirmed && (same || !b.picks)) { cb.hidden = true; dl.hidden = false; ch.hidden = true; }
    else { cb.hidden = false; cb.disabled = !S.canWrite; dl.hidden = true; ch.hidden = !confirmed; }
  }
}

// ---------------- overlay
var OV = { open: false, el: null, a: null, b: null, two: false, ret: null };
function openOverlay(k, alias, from){
  OV.open = true; OV.el = k; OV.a = alias; OV.two = false; OV.ret = from || document.activeElement;
  var others = EL[k].options.filter(function(o){ return o.alias !== alias; });
  OV.b = others.length ? others[0].alias : alias;
  $('#ov').hidden = false; document.body.style.overflow = 'hidden';
  render();
  $('#ov-close').focus();
}
function closeOverlay(){
  OV.open = false; $('#ov').hidden = true; document.body.style.overflow = '';
  if (OV.ret && OV.ret.focus) OV.ret.focus();
}
function optButtons(container, which){
  container.textContent = '';
  EL[OV.el].options.forEach(function(o){
    var b = el('button', 'btn quiet', o.label); b.type='button';
    b.setAttribute('aria-pressed', (which==='a' ? OV.a : OV.b) === o.alias ? 'true' : 'false');
    b.setAttribute('data-ov-' + which, o.alias);
    container.appendChild(b);
  });
}
function figFor(alias){
  var o = opt(OV.el, alias), P = picksNow(), f = el('figure');
  var fr = el('div', 'frame'); var im = el('img'); im.src = IMG[alias]; im.alt = EL[OV.el].name + ': ' + o.label; fr.appendChild(im); f.appendChild(fr);
  var cap = el('figcaption'); var t = el('strong', null, o.label); cap.appendChild(t);
  if (o.alias === EL[OV.el].recommended) { cap.appendChild(document.createTextNode(' ')); var bd = el('span','badge'); bd.appendChild(iconSpan('star')); bd.appendChild(document.createTextNode(' Recommended')); cap.appendChild(bd); }
  var ap = isApprove(OV.el) || EL[OV.el].mode === 'info';
  if (!ap && P[OV.el] && P[OV.el].alias === alias) { cap.appendChild(document.createTextNode(' ')); var pk = el('span','badge pk'); pk.appendChild(iconSpan('check')); pk.appendChild(document.createTextNode(' Picked')); cap.appendChild(pk); }
  cap.appendChild(el('p', 'muted', o.summary));
  if (!ap) {
    var pb = el('button', 'btn', (P[OV.el] && P[OV.el].alias===alias) ? 'Picked' : 'Pick this'); pb.type='button';
    pb.setAttribute('data-pick', alias); pb.setAttribute('data-el', OV.el); pb.disabled = !S.canWrite;
    cap.appendChild(pb);
  }
  f.appendChild(cap); return f;
}
function renderOverlay(){
  if (!OV.open) return;
  var ov = $('#ov'), k = OV.el;
  ov.setAttribute('data-bg', $('#set-'+k).getAttribute('data-bg'));
  $('#ov-title').textContent = (EL[k].mode === 'info' ? 'View: ' : 'Compare: ') + EL[k].name;
  optButtons($('#ov-a'), 'a');
  $('#ov-b-row').hidden = !OV.two;
  if (OV.two) optButtons($('#ov-b'), 'b');
  var tw = $('#ov-two'); tw.setAttribute('aria-pressed', OV.two ? 'true' : 'false');
  $('#ov-a-lbl').textContent = OV.two ? 'Left' : 'Show';
  $$('#ov-bg [data-bg-set]').forEach(function(b){ b.setAttribute('data-el', k); b.setAttribute('aria-pressed', b.getAttribute('data-bg-set') === ov.getAttribute('data-bg') ? 'true' : 'false'); });
  var st = $('#ov-stage'); st.textContent = ''; st.className = 'ov-stage' + (OV.two ? ' two' : '');
  st.appendChild(figFor(OV.a)); if (OV.two) st.appendChild(figFor(OV.b));
}
function step(d){
  var o = EL[OV.el].options, i = 0;
  for (var j=0;j<o.length;j++) if (o[j].alias === OV.a) i = j;
  OV.a = o[(i + d + o.length) % o.length].alias; renderOverlay();
}

// ---------------- actions
function doPick(k, alias){
  if (!S.canWrite) return;
  var o = opt(k, alias); if (!o) return;
  var P = picksNow();
  if (P[k] && P[k].alias === alias) return; // unchanged: no write
  var body = { alias: o.alias, label: o.label, blob: o.blob, at: nowIso() };
  if (S.mode !== 'ready') { local[k] = body; render(); return; }
  S.picks[k] = body; render(); // optimistic; the snapshot confirms
  retry(function(){ return db.doc('picks/' + k).set(body); }).catch(function(e){ writeFail(e, null); });
}
function doApprove(k){
  if (!S.canWrite) return;
  var P = picksNow(); if (valid(k, P[k])) return;
  var opts = EL[k].options;
  var body = { alias: EL[k].joined, label: 'approved', blob: opts[0].blob, blobs: opts.map(function(o){ return o.blob; }), at: nowIso() };
  if (S.mode !== 'ready') { local[k] = body; render(); return; }
  S.picks[k] = body; render();
  retry(function(){ return db.doc('picks/' + k).set(body); }).catch(function(e){ writeFail(e, $('[data-approve-msg="'+k+'"]')); });
}
function doUndo(k){
  S.pendingUndo = null;
  if (S.mode !== 'ready') { delete local[k]; render(); return; }
  delete S.picks[k]; render();
  retry(function(){ return db.doc('picks/' + k).delete(); }).catch(function(e){ writeFail(e, null); });
}
function doAsk(form){
  var k = form.getAttribute('data-el'), kind = form.getAttribute('data-ask'), inp = $('input', form), msg = $('.msg', form);
  var text = inp.value.trim();
  if (S.mode !== 'ready' || !S.canWrite) return;
  if (kind === 'mix' && !text) { msg.textContent = 'Write what to mix first.'; inp.focus(); return; }
  if (kind === 'rework' && !text) { msg.textContent = 'Write what to change first.'; inp.focus(); return; }
  var prev = S.requests[k];
  if (prev && prev.kind === kind && prev.text === text) { msg.textContent = 'That request is already on file.'; return; }
  var body = { kind: kind, text: text, at: nowIso() }, btn = $('button', form);
  btn.disabled = true; msg.textContent = 'Saving...';
  retry(function(){ return db.doc('requests/' + k).set(body); }).then(function(){
    msg.textContent = 'Saved. It replaces any earlier request for this set.'; inp.value = '';
    return notify(form, 'REQUEST ' + D.creature + ' ' + D.stage + ' ' + k + ' (' + kind + '): ' + (text || '(no note)')).then(function(r){
      msg.textContent = r === 'sent' ? 'Saved and the orchestrator was notified.' : r === 'failed' ? 'Saved. ' + NOTIFY_FAIL : 'Saved. Tell the orchestrator in chat (notification unavailable in this view).';
    });
  }, function(e){ writeFail(e, msg); }).then(function(){ btn.disabled = false; });
}
function doConfirm(){
  var P = S.picks, picks = {};
  ORDER.forEach(function(k){ picks[k] = P[k].alias; });
  var btn = $('#confirm-btn'), msg = $('#confirm-msg'); btn.disabled = true; msg.textContent = 'Saving...';
  retry(function(){ return db.doc('status/board').set({ submitted: true, at: nowIso(), picks: picks }); })
    .then(function(){
      var lines = ['CONFIRMED ' + D.creature + ' ' + D.stage + ': '];
      ORDER.forEach(function(k){ var p = P[k]; lines.push(k + '=' + p.label + ' (' + p.alias + ')'); });
      var rq = ORDER.filter(function(k){ return S.requests[k]; }).map(function(k){ return k + ': ' + (S.requests[k].text || '(no note)'); });
      if (rq.length) lines.push('requests: ' + rq.join('; '));
      return notify($('#rail-composite'), lines.join('\n')).then(function(r){
        msg.textContent = r === 'sent' ? 'Confirmed and the orchestrator was notified.' : r === 'failed' ? 'Confirmed. ' + NOTIFY_FAIL : 'Confirmed. Tell the orchestrator in chat (notification unavailable in this view).';
      });
    }, function(e){ writeFail(e, msg); btn.disabled = false; });
}

document.addEventListener('click', function(ev){
  var t = ev.target.closest ? ev.target.closest('button') : null;
  if (!t) return;
  var a;
  if ((a = t.getAttribute('data-pick'))) return doPick(t.getAttribute('data-el'), a);
  if ((a = t.getAttribute('data-approve'))) return doApprove(a);
  if ((a = t.getAttribute('data-open'))) return openOverlay(t.getAttribute('data-el'), a, t);
  if ((a = t.getAttribute('data-undo'))) { S.pendingUndo = a; render(); var y = $('[data-undo-yes="'+a+'"]'); if (y) y.focus(); return; }
  if ((a = t.getAttribute('data-undo-yes'))) return doUndo(a);
  if ((a = t.getAttribute('data-undo-no'))) { S.pendingUndo = null; render(); var u = $('[data-undo="'+a+'"]'); if (u) u.focus(); return; }
  if ((a = t.getAttribute('data-bg-set'))) {
    var k = t.getAttribute('data-el'); $('#set-'+k).setAttribute('data-bg', a);
    $$('#set-'+k+' [data-bg-set]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-bg-set')===a ? 'true':'false'); });
    return renderOverlay();
  }
  if ((a = t.getAttribute('data-ov-a'))) { OV.a = a; return renderOverlay(); }
  if ((a = t.getAttribute('data-ov-b'))) { OV.b = a; return renderOverlay(); }
  if (t.id === 'ov-two') { OV.two = !OV.two; if (OV.two && OV.b === OV.a) { var o = EL[OV.el].options; for (var i=0;i<o.length;i++) if (o[i].alias!==OV.a) { OV.b=o[i].alias; break; } } return renderOverlay(); }
  if (t.id === 'ov-close') return closeOverlay();
  if (t.id === 'confirm-btn') return doConfirm();
  if (t.id === 'src-toggle') { var so = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', so ? 'true':'false'); $('#src-inner').hidden = !so; return; }
  if (t.id === 'rail-toggle') { var open = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', open ? 'true':'false'); $('#rail-inner').hidden = !open; return; }
});
document.addEventListener('submit', function(ev){ var f = ev.target; if (f.matches && f.matches('form.ask')) { ev.preventDefault(); doAsk(f); } });
document.addEventListener('keydown', function(ev){
  if (!OV.open) return;
  if (ev.key === 'Escape') { ev.preventDefault(); closeOverlay(); }
  else if (ev.key === 'ArrowRight' && !(ev.target && ev.target.tagName === 'INPUT')) { ev.preventDefault(); step(1); }
  else if (ev.key === 'ArrowLeft' && !(ev.target && ev.target.tagName === 'INPUT')) { ev.preventDefault(); step(-1); }
  else if (ev.key === 'Tab') {
    var f = $$('#ov button:not([disabled])'); if (!f.length) return;
    var first = f[0], last = f[f.length-1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
});

// rail starts open on wide screens, collapsed on phones
(function(){ var narrow = window.matchMedia && window.matchMedia('(max-width:900px)').matches;
  $('#rail-toggle').setAttribute('aria-expanded', narrow ? 'false' : 'true'); $('#rail-inner').hidden = narrow; })();

render();

// ---------------- store (arrives after first paint, or never)
function toNone(){ if (S.mode === 'waiting') { S.mode = 'none'; render(); } }
var C = window.claude;
if (!C || typeof C.use !== 'function') { toNone(); return; }
C.use('user').then(function(u){
  if (!u || typeof u.can !== 'function') return;
  return u.can('data.write').then(function(ok){ if (ok === false) { S.canWrite = false; render(); } });
}).catch(function(){});
C.use('comments').then(function(c){ CM = c || null; checkCan(); }).catch(function(){ CM = null; });
C.use('db').then(function(d){
  if (!d) return toNone();
  db = d; S.mode = 'ready'; render();
  var known = {}; ORDER.forEach(function(k){ known[k] = true; });
  function dead(e){ if (e && (e.code==='revoked' || e.code==='not_granted' || e.code==='capability_disabled' || e.code==='capability_removed')) { S.mode = 'none'; render(); } }
  db.collection('picks').onSnapshot(function(snap){
    var next = {};
    snap.docs.forEach(function(doc){ if (known[doc.id] && doc.exists) next[doc.id] = doc.data(); });
    S.picks = next;
    if (S.firstPicks) {
      S.firstPicks = false;
      // picks made before the store answered: write each once, only where the store has none
      var pre = local; local = {};
      Object.keys(pre).forEach(function(k){
        if (next[k] || !S.canWrite) return;
        next[k] = pre[k];
        retry(function(){ return db.doc('picks/' + k).set(pre[k]); }).catch(function(e){ writeFail(e, null); });
      });
    }
    render();
  }, dead);
  db.collection('requests').onSnapshot(function(snap){
    var next = {}; snap.docs.forEach(function(doc){ if (known[doc.id] && doc.exists) next[doc.id] = doc.data(); });
    S.requests = next; render();
  }, dead);
  db.doc('composite/current').onSnapshot(function(doc){ S.composite = doc.exists ? doc.data() : null; render(); }, dead);
  db.doc('status/board').onSnapshot(function(doc){ S.board = doc.exists ? doc.data() : null; render(); }, dead);
}).catch(function(){ toNone(); });
})();
"""


def build(creature, stage, spec, index=None):
    full_order = spec["order"]

    def listed(el):
        return spec["elements"][el].get("mode") in ("gallery", "info")
    if index:
        options = options_from_index(index)
    elif all(listed(el) for el in full_order):
        options = {}
    else:
        options = options_from_records(creature, stage)
    order = [el for el in full_order if spec["elements"][el].get("mode") != "info"]  # elements that carry a decision
    base = pick_base(options, [el for el in order if not listed(el)])
    if not base and any(not listed(el) for el in full_order):
        raise Refusal("no base image found for %s %s" % (creature, stage))
    base_uri = jpeg_data_uri(base["hash"])[0] if base else None
    src = load_source(creature)
    source_html = render_source(src, base_uri)
    sections, data = [], {"creature": creature, "stage": stage, "order": order, "elements": {}, "icons": {"check": ICONS["check"], "star": ICONS["star"]},
                          "text": {"compositeEmpty": spec["compositeEmpty"]}}
    n = 0
    for el in full_order:
        cfg = spec["elements"][el]
        info = cfg.get("mode") == "info"
        if not info:
            n += 1
        if listed(el):
            opts = []
            for i, v in enumerate(cfg.get("views") or [], 1):
                opts.append({"alias": "%s-%d" % (el, i), "label": v["label"], "summary": v.get("caption", ""), "hash": v["blob"],
                             "letter": "%s-%d" % (el, i)})
        else:
            opts = options.get(el) or []
        if not opts and not (info and cfg.get("table")):
            raise Refusal("no options for element %r" % el)
        rec_letter = (cfg.get("recommend") or {}).get("letter") if not listed(el) else None
        rec_alias = None
        for o in opts:
            if not listed(el):
                o["letter"] = letter_of(o["label"]) or o["alias"]
            o["uri"], _ = jpeg_data_uri(o["hash"])
            if o["letter"] == rec_letter:
                rec_alias = o["alias"]
        if rec_letter and not rec_alias:
            raise Refusal("recommended letter %s not among %s options" % (rec_letter, el))
        reading = resolve_reading(creature, cfg.get("reading"))
        sections.append(render_section(el, cfg, opts, rec_alias, reading, n, len(order)))
        if info:
            # Not a decision (kept out of ORDER), but its views still feed the viewer.
            data["elements"][el] = {"name": cfg.get("name", el.title()), "recommended": None, "mode": "info", "joined": "",
                                    "options": [{"alias": o["alias"], "letter": o["letter"], "label": o["label"],
                                                 "summary": o["summary"], "blob": o["hash"]} for o in opts]}
            continue
        data["elements"][el] = {"name": cfg.get("name", el.title()), "recommended": rec_alias,
                                "mode": "approve" if cfg.get("mode") in ("approve", "gallery") else "pick",
                                "joined": ",".join(o["alias"] for o in opts),
                                "options": [{"alias": o["alias"], "letter": o["letter"], "label": o["label"],
                                             "summary": o["summary"], "blob": o["hash"]} for o in opts]}
    total = len(order)
    napp = sum(1 for el in order if spec["elements"][el].get("mode") in ("approve", "gallery"))
    word = "picked" if napp == 0 else "approved" if napp == total else "decided"
    dots = "".join("<i></i>" for _ in order)
    ov_bg = "".join('<button type="button" data-bg-set="%s" data-el="" aria-pressed="false"><span class="swatch" style="background:%s"></span>%s</button>'
                    % (k, sw, E(name)) for k, name, sw in BGS)
    page = []
    page.append("<title>%s</title>" % E(spec["title"]))
    page.append("<style>%s</style>" % CSS)
    if src and src["silh"]:
        page.append('<style>:root{--silh:url("%s")}</style>' % src["silh"])
    page.append('<link rel="stylesheet" href="%s">' % FONTS)
    page.append('<div class="wrap">')
    page.append('<header class="top"><h1>%s</h1><p class="lede">%s</p>'
                '<div class="progress" aria-live="polite"><span class="dots" id="dots" aria-hidden="true">%s</span><span id="progress-n">0 of %d %s</span></div>'
                '<p class="notice info" id="n-wait">%s<span>Connecting to the picks store. You can look and compare now.</span></p>'
                '<p class="notice" id="n-fallback" hidden>%s<span>%s</span></p>'
                '<p class="notice" id="n-readonly" hidden>%s<span>You can see the picks here but not change them.</span></p>'
                '</header>' % (E(spec["heading"]), E(spec["lede"]), dots, total, word, ICONS["info"], ICONS["info"], E(spec["fallback"]), ICONS["info"]))
    page.append('<div class="layout">')
    page.append(
        '<aside class="srcrail" aria-label="Source material">'
        '<button type="button" class="src-toggle" id="src-toggle" aria-controls="src-inner" aria-expanded="false"><span>Source material</span>%s</button>'
        '<div class="src-inner" id="src-inner" hidden><h2>Source material</h2>%s</div></aside><main>' % (ICONS["chev"], source_html))
    page.extend(sections)
    page.append('<details class="fold"><summary>%s</summary><p>%s</p></details>' % (E(spec["fold"]["title"]), E(spec["fold"]["text"])))
    page.append('</main>')
    page.append(
        '<aside class="rail" aria-label="Your picks">'
        '<button type="button" class="rail-toggle" id="rail-toggle" aria-controls="rail-inner" aria-expanded="true"><span id="rail-count">Your picks: 0 of %d</span>%s</button>'
        '<div class="rail-inner" id="rail-inner"><h2>Your picks</h2><ul class="picks" id="rail-picks"></ul>'
        '<p class="still" id="rail-still"></p><p class="letters mono" id="rail-letters"></p>'
        '<p class="muted" id="notify-line" aria-live="polite">Notification not available in this view; tell the orchestrator in chat after confirming.</p>'
        '<div class="composite" id="rail-composite" hidden><h3>Composed preview</h3><div id="composite-body"></div>'
        '<button type="button" class="btn primary" id="confirm-btn">%s Confirm these picks</button>'
        '<p class="muted" id="changed-line" hidden>Your picks changed since you confirmed; confirm again.</p>'
        '<p class="muted" id="confirm-msg" aria-live="polite"></p>'
        '<p class="done-line" id="done-line" hidden>%s<span>%s</span></p></div>'
        '</div></aside>' % (total, ICONS["chev"], ICONS["check"], ICONS["check"], E(spec["confirmed"])))
    page.append('</div></div>')
    page.append(
        '<div class="ov" id="ov" role="dialog" aria-modal="true" aria-labelledby="ov-title" hidden>'
        '<div class="ov-bar"><h2 id="ov-title">Compare</h2>'
        '<span class="muted ov-hint">Left and right arrow keys flip between options</span>'
        '<button type="button" class="btn" id="ov-close">Close</button></div>'
        '<div class="ov-body"><div class="ov-ctrl"><span class="muted" id="ov-a-lbl">Show</span><span id="ov-a" style="display:flex;flex-wrap:wrap;gap:6px"></span>'
        '<button type="button" class="btn" id="ov-two" aria-pressed="false">Two-up</button></div>'
        '<div class="ov-ctrl" id="ov-b-row" hidden><span class="muted">Right</span><span id="ov-b" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>'
        '<div class="ov-ctrl"><span class="muted">Background</span><span class="seg" id="ov-bg" role="group" aria-label="Background behind images">%s</span></div>'
        '<div class="ov-stage" id="ov-stage" aria-live="polite"></div></div></div>' % ov_bg)
    page.append('<script type="application/json" id="sel-data">%s</script>'
                % json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
    page.append("<script>%s</script>" % JS)
    out = "\n".join(page)
    if len(out.encode("utf-8")) > MAX_BYTES:
        raise Refusal("page is %d bytes, over the 8 MB limit" % len(out.encode("utf-8")))
    return out


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("creature")
    ap.add_argument("stage")
    ap.add_argument("--spec", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--index", help="read options from a runner index.json instead of the stage records")
    a = ap.parse_args(argv)
    spec = json.loads(Path(a.spec).read_text(encoding="utf-8"))
    out = build(a.creature, a.stage, spec, a.index)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(out, encoding="utf-8", newline="\n")
    print("%s  %d bytes" % (a.out, len(out.encode("utf-8"))))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Refusal as e:
        print("refused: %s" % e, file=sys.stderr)
        sys.exit(1)

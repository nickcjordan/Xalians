"""Review page generator: one self-contained HTML file per creature, built from records."""
import base64
import html
import sys
from pathlib import Path

import blobs
import derive
from common import STAGES, Refusal, creature_dir, list_records, load_creature

E = html.escape

CSS = """
:root{--bg:#f7f7f4;--fg:#1c1f24;--muted:#5a6270;--card:#ffffff;--line:#c9ced6;
--blue:#1f5fbf;--blue-bg:#e3edfb;--amber:#8a5200;--amber-bg:#fdf0d8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#14171c;--fg:#e8eaee;--muted:#9aa3b2;
--card:#1c2027;--line:#38404c;--blue:#8db8ff;--blue-bg:#1b2b45;--amber:#ffbd5c;--amber-bg:#3a2b10}}
:root[data-theme="dark"]{--bg:#14171c;--fg:#e8eaee;--muted:#9aa3b2;--card:#1c2027;--line:#38404c;
--blue:#8db8ff;--blue-bg:#1b2b45;--amber:#ffbd5c;--amber-bg:#3a2b10}
*{box-sizing:border-box}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.2rem;margin:1.4em 0 .4em}h3{font-size:1.05rem;margin:.2em 0}
.muted{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 14px;margin:12px 0}
.tag{display:inline-block;padding:1px 8px;border:1px solid var(--line);border-radius:3px;font-size:.85rem;margin-right:6px}
.tag.blue{background:var(--blue-bg);color:var(--blue);border-color:var(--blue)}
.tag.amber{background:var(--amber-bg);color:var(--amber);border-color:var(--amber)}
.check{border-left:6px solid var(--blue)}
.check.hold{border-left-color:var(--amber)}
.imgs{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}
figure{margin:0;flex:1 1 280px}
figure img{width:100%;height:auto;border:1px solid var(--line);background:#fff}
figcaption{font-size:.85rem;color:var(--muted)}
details{border:1px solid var(--line);border-radius:6px;margin:8px 0;padding:6px 12px;background:var(--card)}
summary{cursor:pointer;font-weight:600}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
"""

MIME = {b"\x89PNG": "image/png", b"\xff\xd8\xff": "image/jpeg", b"GIF8": "image/gif", b"RIFF": "image/webp"}


def data_uri(h):
    try:
        raw = blobs.read_bytes(h)
    except Refusal:
        return None
    mime = "application/octet-stream"
    for magic, m in MIME.items():
        if raw.startswith(magic):
            mime = m
    if raw.lstrip()[:5] in (b"<?xml", b"<svg "):
        mime = "image/svg+xml"
    return "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode("ascii"))


def fig(label, h):
    if not h:
        return ""
    uri = data_uri(h)
    if uri is None:
        return '<figure><figcaption>%s: blob %s is missing from the store</figcaption></figure>' % (E(label), E(h[:12]))
    return '<figure><img src="%s" alt="%s"><figcaption>%s <span class="muted">%s</span></figcaption></figure>' % (
        uri, E(label), E(label), E(h[:12]))


def hold_li(h):
    s = h["source"]
    src = 'Nick, "%s" (%s)' % (s.get("words"), s.get("date")) if s["kind"] == "nick" else "inferred: %s" % s.get("reason")
    return "<li><b>H-%s</b> %s <span class=\"muted\">source: %s; strength %s</span></li>" % (
        E(h["alias"]), E(h["statement"]), E(src), E(str(h.get("strength"))))


def checks_html(key, st):
    out = []
    n = 0
    for b in list_records(key, st, "B"):
        for ck in b.get("checks") or (b.get("report") or {}).get("checks") or []:
            n += 1
            imgs = "".join([fig("before", ck.get("before")), fig("after", ck.get("after")),
                            fig("reference", ck.get("reference"))])
            if ck.get("sprite"):
                imgs += fig("sprite size", ck["sprite"])
            out.append(
                '<section class="card check" id="check-%d"><h3>Check %d: %s</h3>'
                '<p class="muted">build B-%s</p><p>%s</p><div class="imgs">%s</div>'
                '<p><span class="tag blue">Recommended answer</span> %s</p></section>' % (
                    n, n, E(ck.get("title", "")), E(b["alias"]), E(ck.get("question", "")), imgs,
                    E(str(ck.get("recommended", "none given")))))
    return "".join(out) or '<p class="muted">No checks recorded on any build in this stage yet.</p>'


def stage_body(key, st):
    parts = []
    holds = derive.holds_in_force(key, st)
    if holds:
        parts.append('<div class="card"><h3>Holds in force</h3><ul>%s</ul></div>' % "".join(hold_li(h) for h in holds))
    dfs = derive.open_defects(key, st)
    if dfs:
        parts.append('<div class="card"><h3>Open defects</h3><ul>%s</ul></div>' % "".join(
            "<li><span class=\"tag amber\">open</span> D-%s %s <span class=\"muted\">(attempts %d)</span></li>" % (
                E(d["alias"]), E(d["description"]), len(derive.attempts(key, st, d["id"]))) for d in dfs))
    return "".join(parts)


def generate(key):
    c = load_creature(key)
    sp = c["species"]
    name = sp.get("name") or key
    left = derive.budget_left(key)
    ld = derive.last_decision(key)
    open_stage = next((s for s in STAGES if c["stages"][s]["state"] == "open"), None)
    body = []
    body.append('<h1>%s <span class="muted">review page</span></h1>' % E(name))
    body.append('<div class="card"><h2 style="margin-top:0">Standing state</h2>'
                '<p>%s, %s, %s, %s.</p><p><b>Next:</b> %s</p><p class="muted">Budget left: %s. Last decision: %s.</p>'
                '<p>%s</p></div>' % (
                    E(str(sp.get("element"))), E(str(sp.get("homePlanet"))), E(str(sp.get("bodyPlan"))), E(str(sp.get("covering"))),
                    E(derive.next_action(key)),
                    E("%d builds" % left if left is not None else "not set"),
                    E("N-%s (%s) %s" % (ld[1]["alias"], ld[1]["kind"], ld[1].get("words") or "") if ld else "none"),
                    "".join('<span class="tag %s">%s %s</span>' % (
                        "blue" if c["stages"][s]["state"] == "closed" else "amber" if c["stages"][s]["state"] in ("open", "stale") else "",
                        E(s), E(c["stages"][s]["state"])) for s in STAGES)))
    if open_stage:
        body.append("<h2>Open stage: %s</h2>" % E(open_stage))
        body.append(stage_body(key, open_stage))
        body.append(checks_html(key, open_stage))
    else:
        body.append('<p class="muted">No stage is open.</p>')
    closed = [s for s in STAGES if c["stages"][s]["state"] in ("closed", "stale")]
    if closed:
        body.append("<h2>Closed stages</h2>")
    for s in closed:
        state = c["stages"][s]["state"]
        body.append("<details><summary>%s (%s%s)</summary>%s%s</details>" % (
            E(s), E(state), ", approval %s" % E(str(c["stages"][s].get("approval"))) if c["stages"][s].get("approval") else "",
            stage_body(key, s), checks_html(key, s)))
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
           '<meta name="viewport" content="width=device-width,initial-scale=1">'
           "<title>%s review</title><style>%s</style></head><body>%s</body></html>" % (
               E(name), CSS, "\n".join(body)))
    out = creature_dir(key) / "review.html"
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(doc)
    return out


if __name__ == "__main__":
    try:
        print(generate(sys.argv[1]))
    except Refusal as e:
        print("refused: %s" % e, file=sys.stderr)
        sys.exit(1)

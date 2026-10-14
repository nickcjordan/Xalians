#!/usr/bin/env python3
"""Creature records CLI. See README.md. Python 3 standard library only."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import blobs  # noqa: E402
import cost  # noqa: E402
import derive  # noqa: E402
from common import (  # noqa: E402
    STAGES, Refusal, creature_dir, find_record, list_records, load_creature, new_alias, new_id,
    norm_stage, now_iso, read_json, repo_root, save_creature, save_record, sha256_file,
    stage_dir, write_json,
)

FORBIDDEN_REPORT_KEYS = ("score", "scores", "rating", "grade", "points", "mark")


def _load_file(path, what):
    p = Path(path)
    if not p.is_file():
        raise Refusal("%s file not found: %s" % (what, path))
    try:
        data = read_json(p)
    except ValueError as e:
        raise Refusal("%s file is not valid JSON: %s" % (what, e))
    if not isinstance(data, dict):
        raise Refusal("%s file must hold a JSON object" % what)
    return data


def _need_open(key, stage):
    c = load_creature(key)
    st = norm_stage(stage)
    if c["stages"][st]["state"] != "open":
        raise Refusal("stage %s is %s, not open (roster.py stage open %s %s)" % (st, c["stages"][st]["state"], key, st))
    return c, st


# ---------------------------------------------------------------- init

def cmd_init(a):
    key = a.key
    d = creature_dir(key)
    if (d / "creature.json").exists():
        raise Refusal("creature %s already exists" % key)
    tpl = repo_root() / "docs" / "species-templates" / "v5" / (key + ".json")
    svg = repo_root() / "apps" / "web" / "src" / "svg" / "species" / (key + ".svg")
    if not tpl.is_file():
        raise Refusal("no species template at %s" % tpl)
    if not svg.is_file():
        raise Refusal("no silhouette at %s" % svg)
    t = read_json(tpl)
    phys = t.get("physiology", {})
    lore = t.get("lore", {})
    creature = {
        "schemaVersion": 1,
        "id": new_id("C"),
        "alias": new_alias(key),
        "key": key,
        "createdAt": now_iso(),
        "species": {
            "template": "docs/species-templates/v5/%s.json" % key,
            "templateSha256": sha256_file(tpl),
            "silhouette": "apps/web/src/svg/species/%s.svg" % key,
            "silhouetteSha256": sha256_file(svg),
            "name": t.get("name"),
            "element": t.get("element"),
            "homePlanet": t.get("homePlanet"),
            "bodyPlan": phys.get("bodyPlan"),
            "covering": phys.get("covering"),
            "size": phys.get("size"),
            "appearance": lore.get("appearance", []),
            "anatomy": phys.get("anatomy", []),
        },
        "techSpec": {},
        "budget": None,
        "stages": {s: {"state": "not-started", "approval": None, "evidence": []} for s in STAGES},
    }
    write_json(d / "creature.json", creature)
    print("created %s" % (d / "creature.json"))


# ---------------------------------------------------------------- stage

def cmd_stage_open(a):
    c = load_creature(a.key)
    st = norm_stage(a.stage)
    cur = c["stages"][st]["state"]
    if cur == "open":
        raise Refusal("stage %s is already open" % st)
    c["stages"][st]["state"] = "open"
    c["stages"][st]["openedAt"] = now_iso()
    save_creature(a.key, c)
    print("stage %s open" % st)


def cmd_stage_close(a):
    c, st = _need_open(a.key, a.stage)
    _, dec = _find_decision(a.key, a.approval)
    decs = list_records(a.key, st, "N")
    if dec["id"] not in [n["id"] for n in decs]:
        raise Refusal("decision %s belongs to another stage, not %s" % (a.approval, st))
    if dec.get("kind") != "approval":
        raise Refusal("stage close needs an approval decision; %s is kind %r" % (a.approval, dec.get("kind")))
    binds = dec.get("binds") or {}
    ev = binds.get("evidence") or []
    if not ev or not binds.get("build"):
        raise Refusal("approval %s is not bound to a build and evidence hashes; stage not closed" % a.approval)
    b = derive_build(a.key, binds["build"])
    if b is None:
        raise Refusal("approval %s binds build %s, which does not exist" % (a.approval, binds["build"]))
    write_json(stage_dir(a.key, st) / "cost.json", dict(
        cost.aggregate_stage(a.key, st), closedAt=now_iso(), approval=dec["id"]))
    c["stages"][st].update(state="closed", approval=dec["id"], evidence=ev, closedAt=now_iso())
    stale = []
    for later in STAGES[STAGES.index(st) + 1:]:
        if c["stages"][later]["state"] == "closed":
            c["stages"][later]["state"] = "stale"
            stale.append(later)
    save_creature(a.key, c)
    print("stage %s closed on %s; marked stale: %s" % (st, dec["id"], ", ".join(stale) or "none"))


def derive_build(key, ref):
    try:
        return find_record(key, ref, "B")[1]
    except Refusal:
        return None


def _find_decision(key, ref):
    return find_record(key, ref, "N")


# ---------------------------------------------------------------- build

def _brief(key, st, b, holds, defect):
    lines = [
        "Stage %s %s, creature %s, build B-%s" % (st[:2].lstrip("0") or "0", st.split("-", 1)[1], key, b["alias"]),
        "Goal: %s" % b["goal"],
        "Scope: %s" % b["scope"],
    ]
    if defect:
        lines.append("Defect targeted: D-%s, %s, camera %s, region %s" % (
            defect["alias"], defect["description"], defect.get("camera") or "-", defect.get("region") or "-"))
    else:
        lines.append("Defect targeted: none")
    lines.append("Holds:")
    if holds:
        for h in holds:
            s = h["source"]
            src = ('Nick: "%s" (%s)' % (s.get("words"), s.get("date"))) if s["kind"] == "nick" else "inferred: %s" % s.get("reason")
            lines.append("  | H-%s | %s | %s | %s |" % (h["alias"], h["statement"], src, h.get("strength")))
    else:
        lines.append("  (none in force)")
    lines.append("May change: anything the goal needs that the holds do not name; declare and explain any change outside the scope")
    lines.append("Inputs:")
    for i in b["inputs"]:
        lines.append("  %s %s" % (i["path"], i.get("sha256") or "(no hash)"))
    if not b["inputs"]:
        lines.append("  (none pinned)")
    left = derive.budget_left(key)
    lines.append("Budget: %s" % ("builds left after this one: %d" % (left) if left is not None else "no budget set"))
    lines.append("Report (JSON): outputs [{name, hash}] (required), blockedBy (required, 'nothing' allowed), defectResult, newDefects, cost; no scores")
    lines.append("Tag your agent description with: [build B-%s]" % b["alias"])
    return "\n".join(lines)


def cmd_build_plan(a):
    c, st = _need_open(a.key, a.stage)
    defect = None
    if a.defect:
        dst, defect = find_record(a.key, a.defect, "D")
        if dst != st:
            raise Refusal("defect %s belongs to stage %s, not %s" % (a.defect, dst, st))
        if defect["status"] != "open":
            raise Refusal("defect %s is %s" % (a.defect, defect["status"]))
        n = len(derive.attempts(a.key, st, defect["id"]))
        if n >= 2 and not derive.has_audit(a.key, st, defect["id"]):
            raise Refusal("defect D-%s already has %d builds; record an audit decision "
                          "(decision add --kind audit --defect D-%s) before a third" % (defect["alias"], n, defect["alias"]))
    inputs = []
    roster = creature_dir(a.key).parent.resolve()
    for raw in a.input or []:
        p = Path(raw).resolve()
        try:
            rel = p.relative_to(roster)
            if rel.parts and rel.parts[0] != a.key:
                raise Refusal("input %s is under another creature's folder (%s); a build may not pin it" % (raw, rel.parts[0]))
        except ValueError:
            pass
        inputs.append({"path": str(raw), "sha256": sha256_file(p) if p.is_file() else None})
    holds = derive.holds_in_force(a.key, st)
    b = {
        "id": new_id("B"), "alias": new_alias(a.key), "stage": st, "kind": a.kind,
        "goal": a.goal, "scope": a.scope, "defect": defect["id"] if defect else None,
        "holds": [h["id"] for h in holds], "inputs": inputs, "outputs": [],
        "validators": None, "report": None, "blockedBy": None, "cost": None,
        "status": "planned", "createdAt": now_iso(),
    }
    b["briefSha256"] = None
    brief = _brief(a.key, st, b, holds, defect)
    b["briefSha256"] = hashlib.sha256(brief.encode("utf-8")).hexdigest()
    save_record(a.key, st, "B", b)
    if defect:
        defect["attempts"] = list(defect.get("attempts", [])) + [b["id"]]
        save_record(a.key, st, "D", defect)
    print(brief)


def cmd_build_report(a):
    st, b = find_record(a.key, a.build, "B")
    if b["status"] == "cancelled":
        raise Refusal("build B-%s is cancelled" % b["alias"])
    r = _load_file(a.file, "report")
    bad = [k for k in r if k.lower() in FORBIDDEN_REPORT_KEYS]
    if bad:
        raise Refusal("a report may not carry a score (found %s); builders do not grade" % ", ".join(bad))
    outs = r.get("outputs")
    if not isinstance(outs, list) or not outs:
        raise Refusal("report refused: no outputs listed")
    for o in outs:
        if not isinstance(o, dict) or not o.get("hash"):
            raise Refusal("report refused: every output needs a hash, got %r" % (o,))
    blocked = None
    for k in ("blockedBy", "blocked_by", "Blocked by"):
        if k in r:
            blocked = r[k]
    if blocked is None or (isinstance(blocked, str) and not blocked.strip()):
        raise Refusal("report refused: 'blockedBy' is required (write 'nothing' if nothing blocked you)")
    b.update(outputs=outs, report=r, blockedBy=blocked, validators=r.get("validators"),
             checks=r.get("checks", []), status="reported", reportedAt=now_iso())
    save_record(a.key, st, "B", b)
    print("report recorded for build B-%s (%d outputs)" % (b["alias"], len(outs)))


# ---------------------------------------------------------------- defect, hold, decision

def cmd_defect(a):
    if a.action == "add":
        c, st = _need_open(a.key, a.stage)
        d = {"id": new_id("D"), "alias": new_alias(a.key), "stage": st, "description": a.description,
             "camera": a.camera, "region": a.region, "origin": a.origin, "attempts": [],
             "status": "open", "createdAt": now_iso()}
        save_record(a.key, st, "D", d)
        print("D-%s %s" % (d["alias"], d["id"]))
    else:
        st, d = find_record(a.key, a.defect, "D")
        d["status"] = "closed"
        d["closedAt"] = now_iso()
        save_record(a.key, st, "D", d)
        print("defect D-%s closed" % d["alias"])


def cmd_hold(a):
    if a.action == "add":
        c, st = _need_open(a.key, a.stage)
        if a.source == "nick" and not (a.words and a.date):
            raise Refusal("a hold sourced to nick needs --words and --date")
        if a.source == "inferred" and not a.reason:
            raise Refusal("an inferred hold needs --reason")
        h = {"id": new_id("H"), "alias": new_alias(a.key), "stage": st, "statement": a.statement,
             "scope": a.scope, "source": {"kind": a.source, "words": a.words, "date": a.date, "reason": a.reason},
             "strength": a.strength, "status": "in-force", "createdAt": now_iso()}
        save_record(a.key, st, "H", h)
        print("H-%s %s" % (h["alias"], h["id"]))
    else:
        st, h = find_record(a.key, a.hold, "H")
        h["status"] = "lifted"
        h["liftedAt"] = now_iso()
        if a.note:
            h["liftNote"] = a.note
        save_record(a.key, st, "H", h)
        print("hold H-%s lifted" % h["alias"])


def cmd_decision(a):
    c, st = _need_open(a.key, a.stage)
    binds = {}
    if a.build:
        binds["build"] = find_record(a.key, a.build, "B")[1]["id"]
    if a.defect:
        binds["defect"] = find_record(a.key, a.defect, "D")[1]["id"]
    binds["evidence"] = list(a.evidence or [])
    if a.kind == "approval" and not (binds.get("build") and binds["evidence"]):
        raise Refusal("an approval decision must bind a build (--build) and evidence hashes (--evidence)")
    if a.kind == "audit" and not binds.get("defect"):
        raise Refusal("an audit decision must name the defect it audits (--defect)")
    if a.kind == "budget":
        if a.amount is None:
            raise Refusal("a budget decision needs --amount (total builds allowed)")
        c["budget"] = {"builds": a.amount, "setAt": now_iso()}
        save_creature(a.key, c)
    n = {"id": new_id("N"), "alias": new_alias(a.key), "stage": st, "who": a.who, "words": a.words,
         "date": a.date or now_iso()[:10], "kind": a.kind, "binds": binds, "amount": a.amount,
         "createdAt": now_iso()}
    save_record(a.key, st, "N", n)
    print("N-%s %s" % (n["alias"], n["id"]))


def cmd_review(a):
    st, b = find_record(a.key, a.build, "B")
    if b["status"] != "reported":
        raise Refusal("build B-%s has no report yet (status %s); nothing to review" % (b["alias"], b["status"]))
    r = _load_file(a.file, "review")
    if r.get("verdict") == "pass":
        pass
    elif r.get("verdict") == "defects" and isinstance(r.get("defects"), list) and r["defects"]:
        pass
    else:
        raise Refusal("a review needs verdict 'pass' or verdict 'defects' with a named defect list")
    if any(k.lower() in FORBIDDEN_REPORT_KEYS for k in r):
        raise Refusal("a review is a verdict, not a score")
    p = stage_dir(a.key, st) / "review.json"
    doc = read_json(p) if p.exists() else {"reviews": []}
    doc["reviews"].append({"id": new_id("R"), "alias": new_alias(a.key), "build": b["id"],
                           "verdict": r["verdict"], "defects": r.get("defects", []),
                           "notes": r.get("notes"), "at": now_iso()})
    write_json(p, doc)
    print("review recorded for build B-%s: %s" % (b["alias"], r["verdict"]))


# ---------------------------------------------------------------- status, next

def cmd_status(a):
    c = load_creature(a.key)
    sp = c["species"]
    print("%s (%s, %s, %s)" % (sp.get("name"), sp.get("element"), sp.get("homePlanet"), sp.get("bodyPlan")))
    print("stages:")
    for st in STAGES:
        s = c["stages"][st]
        extra = " approval %s" % s["approval"] if s.get("approval") else ""
        print("  %-12s %s%s" % (st, s["state"], extra))
    dl, hl = [], []
    for st in STAGES:
        for d in derive.open_defects(a.key, st):
            dl.append("  D-%s [%s] %s (attempts: %d)" % (d["alias"], st, d["description"], len(derive.attempts(a.key, st, d["id"]))))
        for h in derive.holds_in_force(a.key, st):
            s = h["source"]
            src = "nick %s" % s.get("date") if s["kind"] == "nick" else "inferred"
            hl.append("  H-%s [%s] %s (%s, %s)" % (h["alias"], st, h["statement"], src, h.get("strength")))
    print("open defects:" + ("" if dl else " none"))
    for x in dl:
        print(x)
    print("holds in force:" + ("" if hl else " none"))
    for x in hl:
        print(x)
    left = derive.budget_left(a.key)
    print("budget left: %s" % ("%d builds" % left if left is not None else "not set"))
    ld = derive.last_decision(a.key)
    if ld:
        n = ld[1]
        print("last decision: N-%s [%s] %s by %s: %s" % (n["alias"], ld[0], n["kind"], n["who"], n.get("words") or ""))
    else:
        print("last decision: none")


def cmd_next(a):
    load_creature(a.key)
    print(derive.next_action(a.key))


# ---------------------------------------------------------------- blobs, cost, page

def cmd_blob(a):
    if a.action == "put":
        print(blobs.put(a.file))
    else:
        print(blobs.get(a.hash, a.out))


def cmd_cost(a):
    print(json.dumps(cost.collect(a.key, a.build), indent=2))


def cmd_page(a):
    import page
    out = page.generate(a.key)
    print("wrote %s" % out)


# ---------------------------------------------------------------- parser

def build_parser():
    p = argparse.ArgumentParser(prog="roster.py", description="Creature records CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("init"); s.add_argument("key"); s.set_defaults(fn=cmd_init)

    st = sub.add_parser("stage").add_subparsers(dest="action", required=True)
    s = st.add_parser("open"); s.add_argument("key"); s.add_argument("stage"); s.set_defaults(fn=cmd_stage_open)
    s = st.add_parser("close"); s.add_argument("key"); s.add_argument("stage"); s.add_argument("--approval", required=True)
    s.set_defaults(fn=cmd_stage_close)

    b = sub.add_parser("build").add_subparsers(dest="action", required=True)
    s = b.add_parser("plan"); s.add_argument("key"); s.add_argument("stage")
    s.add_argument("--goal", required=True); s.add_argument("--scope", required=True)
    s.add_argument("--defect"); s.add_argument("--kind", default="build", choices=["preview", "build", "image", "run"])
    s.add_argument("--input", action="append"); s.set_defaults(fn=cmd_build_plan)
    s = b.add_parser("report"); s.add_argument("key"); s.add_argument("build"); s.add_argument("--file", required=True)
    s.set_defaults(fn=cmd_build_report)

    d = sub.add_parser("defect").add_subparsers(dest="action", required=True)
    s = d.add_parser("add"); s.add_argument("key"); s.add_argument("stage"); s.add_argument("--description", required=True)
    s.add_argument("--camera"); s.add_argument("--region"); s.add_argument("--origin")
    s.set_defaults(fn=cmd_defect)
    s = d.add_parser("close"); s.add_argument("key"); s.add_argument("defect"); s.set_defaults(fn=cmd_defect)

    h = sub.add_parser("hold").add_subparsers(dest="action", required=True)
    s = h.add_parser("add"); s.add_argument("key"); s.add_argument("stage"); s.add_argument("--statement", required=True)
    s.add_argument("--scope", default="stage"); s.add_argument("--source", choices=["nick", "inferred"], required=True)
    s.add_argument("--words"); s.add_argument("--date"); s.add_argument("--reason")
    s.add_argument("--strength", default="firm", choices=["firm", "soft"]); s.set_defaults(fn=cmd_hold)
    s = h.add_parser("lift"); s.add_argument("key"); s.add_argument("hold"); s.add_argument("--note"); s.set_defaults(fn=cmd_hold)

    dd = sub.add_parser("decision").add_subparsers(dest="action", required=True)
    s = dd.add_parser("add"); s.add_argument("key"); s.add_argument("stage")
    s.add_argument("--who", required=True, choices=["nick", "orchestrator"])
    s.add_argument("--kind", required=True, choices=["approval", "pick", "ruling", "budget", "audit"])
    s.add_argument("--words", required=True); s.add_argument("--date")
    s.add_argument("--build"); s.add_argument("--defect"); s.add_argument("--evidence", action="append")
    s.add_argument("--amount", type=int); s.set_defaults(fn=cmd_decision)

    r = sub.add_parser("review").add_subparsers(dest="action", required=True)
    s = r.add_parser("add"); s.add_argument("key"); s.add_argument("build"); s.add_argument("--file", required=True)
    s.set_defaults(fn=cmd_review)

    for name, fn in (("status", cmd_status), ("next", cmd_next), ("page", cmd_page)):
        s = sub.add_parser(name); s.add_argument("key"); s.set_defaults(fn=fn)

    bl = sub.add_parser("blob").add_subparsers(dest="action", required=True)
    s = bl.add_parser("put"); s.add_argument("file"); s.set_defaults(fn=cmd_blob)
    s = bl.add_parser("get"); s.add_argument("hash"); s.add_argument("out", nargs="?"); s.set_defaults(fn=cmd_blob)

    c = sub.add_parser("cost").add_subparsers(dest="action", required=True)
    s = c.add_parser("collect"); s.add_argument("key"); s.add_argument("build"); s.set_defaults(fn=cmd_cost)
    return p


def run(argv):
    """Run one command. Returns an exit code; refusals print to stderr and return 1."""
    try:
        a = build_parser().parse_args(argv)
    except SystemExit as e:
        return int(e.code or 0)
    try:
        a.fn(a)
        return 0
    except Refusal as e:
        print("refused: %s" % e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))

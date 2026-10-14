"""State derived from records. Nothing here is stored twice."""
from common import STAGES, list_records, load_creature, read_json, stage_dir


def open_defects(key, stage):
    return [d for d in list_records(key, stage, "D") if d.get("status") == "open"]


def attempts(key, stage, defect_id):
    return [b for b in list_records(key, stage, "B")
            if b.get("defect") == defect_id and b.get("status") != "cancelled"]


def holds_in_force(key, stage):
    return [h for h in list_records(key, stage, "H") if h.get("status") == "in-force"]


def has_audit(key, stage, defect_id):
    return any(n.get("kind") == "audit" and (n.get("binds") or {}).get("defect") == defect_id
               for n in list_records(key, stage, "N"))


def reviewed_builds(key, stage):
    p = stage_dir(key, stage) / "review.json"
    if not p.exists():
        return set()
    return {r.get("build") for r in read_json(p).get("reviews", [])}


def last_decision(key):
    best = None
    for st in STAGES:
        for n in list_records(key, st, "N"):
            if best is None or n["id"] > best[1]["id"]:
                best = (st, n)
    return best


def builds_total(key):
    return sum(len(list_records(key, st, "B")) for st in STAGES)


def budget_left(key):
    c = load_creature(key)
    b = c.get("budget")
    if not b or b.get("builds") is None:
        return None
    return int(b["builds"]) - builds_total(key)


def next_action(key):
    c = load_creature(key)
    stages = c["stages"]
    for st in STAGES:
        if stages[st]["state"] == "stale":
            return "stage %s is stale (an earlier stage changed): roster.py stage open %s %s" % (st, key, st)
    for st in STAGES:
        if stages[st]["state"] == "open":
            builds = list_records(key, st, "B")
            for b in builds:
                if b["status"] == "planned":
                    return "%s: build B-%s is planned, its builder report is due (roster.py build report)" % (st, b["alias"])
            rv = reviewed_builds(key, st)
            for b in builds:
                if b["status"] == "reported" and b["id"] not in rv:
                    return "%s: build B-%s has a report and no review (roster.py review add)" % (st, b["alias"])
            for d in open_defects(key, st):
                n = len(attempts(key, st, d["id"]))
                if n >= 2 and not has_audit(key, st, d["id"]):
                    return "%s: defect D-%s has %d attempts, record an audit decision before another build" % (st, d["alias"], n)
                return "%s: plan a build for open defect D-%s (%d attempts so far)" % (st, d["alias"], n)
            decs = list_records(key, st, "N")
            approvals = [n for n in decs if n.get("kind") == "approval" and (n.get("binds") or {}).get("evidence")]
            if approvals:
                return "%s: approval N-%s is recorded, close the stage (roster.py stage close %s %s --approval N-%s)" % (
                    st, approvals[-1]["alias"], key, st, approvals[-1]["alias"])
            if not builds:
                return "%s: plan the first build (roster.py build plan)" % st
            return "%s: take the checks to Nick and record his approval (roster.py decision add --kind approval)" % st
    for st in STAGES:
        if stages[st]["state"] == "not-started":
            return "open stage %s (roster.py stage open %s %s)" % (st, key, st)
    return "all stages closed; nothing left"

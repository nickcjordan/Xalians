"""Cost collector: scan Claude Code transcripts for a build tag and sum usage by role."""
import json
import os
import re
import sys
from pathlib import Path

from common import Refusal, find_record, load_creature, now_iso, save_record, list_records

DEFAULT_PROJECTS = str(Path.home() / ".claude" / "projects")
CATS = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")


def projects_root():
    return Path(os.environ.get("XALIANS_PROJECTS") or DEFAULT_PROJECTS)


def tag_pattern(alias):
    return re.compile(r"\[build B-%s\]" % re.escape(alias))


def _text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def _first_user_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            try:
                o = json.loads(line)
            except ValueError:
                continue
            m = o.get("message")
            if isinstance(m, dict) and m.get("role") == "user":
                return _text_of(m.get("content"))
    return ""


def _meta(path):
    mp = path.with_suffix(".meta.json")
    if mp.exists():
        try:
            return json.loads(mp.read_text(encoding="utf-8"))
        except ValueError:
            return {}
    return {}


def scan(alias, root=None):
    """Return the cost block for build alias. Usage deduplicated by message.id."""
    root = Path(root) if root else projects_root()
    pat = tag_pattern(alias)
    files = list(root.rglob("*.jsonl")) if root.exists() else []
    seen = {}  # message id -> [role, usage]; streamed duplicates keep the per-category max
    matched = 0
    for p in files:
        meta = _meta(p)
        head = _first_user_text(p)
        if not (pat.search(head) or pat.search(str(meta.get("description", "")))):
            continue
        matched += 1
        role = meta.get("agentType") or ("subagent" if "subagents" in p.parts else "session")
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            for n, line in enumerate(f):
                try:
                    o = json.loads(line)
                except ValueError:
                    continue
                m = o.get("message")
                if not isinstance(m, dict) or not isinstance(m.get("usage"), dict):
                    continue
                mid = m.get("id") or o.get("uuid") or "%s:%d" % (p, n)
                u = m["usage"]
                vals = {c: int(u.get(c) or 0) for c in CATS}
                cur = seen.get(mid)
                if cur is None:
                    seen[mid] = [role, vals]
                else:
                    for c in CATS:
                        cur[1][c] = max(cur[1][c], vals[c])
    by_role = {}
    total = {c: 0 for c in CATS}
    for role, vals in seen.values():
        r = by_role.setdefault(role, dict({"messages": 0}, **{c: 0 for c in CATS}))
        r["messages"] += 1
        for c in CATS:
            r[c] += vals[c]
            total[c] += vals[c]
    return {
        "tag": "[build B-%s]" % alias,
        "tokens": total,
        "byRole": by_role,
        "messages": len(seen),
        "transcriptsMatched": matched,
        "filesScanned": len(files),
        "uncovered": matched == 0,
        "collectedAt": now_iso(),
    }


def collect(key, build_ref):
    load_creature(key)
    stage, b = find_record(key, build_ref, "B")
    b["cost"] = scan(b["alias"])
    save_record(key, stage, "B", b)
    return b["cost"]


def aggregate_stage(key, stage):
    """Totals for cost.json at stage close."""
    tot = {c: 0 for c in CATS}
    by_role = {}
    blender = 0.0
    codex = 0
    uncovered = []
    builds = list_records(key, stage, "B")
    for b in builds:
        c = b.get("cost") or {}
        if not c or c.get("uncovered"):
            uncovered.append(b["alias"])
        for k in CATS:
            tot[k] += int((c.get("tokens") or {}).get(k, 0))
        for role, r in (c.get("byRole") or {}).items():
            a = by_role.setdefault(role, {k: 0 for k in CATS})
            for k in CATS:
                a[k] += int(r.get(k, 0))
        rep = b.get("report") or {}
        blender += float(rep.get("blenderSeconds", 0) or 0)
        codex += int(rep.get("codexTokens", 0) or 0)
    return {
        "tokens": tot, "byRole": by_role, "blenderMinutes": round(blender / 60.0, 2),
        "codexTokens": codex, "buildCount": len(builds), "buildsWithoutTranscripts": uncovered,
    }


def main(argv):
    if len(argv) == 3 and argv[0] == "collect":
        print(json.dumps(collect(argv[1], argv[2]), indent=2))
        return 0
    print("usage: cost.py collect <key> <build>", file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Refusal as e:
        print("refused: %s" % e, file=sys.stderr)
        sys.exit(1)

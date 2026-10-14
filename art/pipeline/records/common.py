"""Shared helpers for the creature records tooling: ids, paths, atomic JSON."""
import hashlib
import json
import os
import secrets
import time
from pathlib import Path

STAGES = [
    "01-intake", "02-vision", "03-sheet", "04-blockout", "05-sculpt",
    "06-gamemesh", "07-surface", "08-rig", "09-animate", "10-export", "11-retro",
]
STAGE_STATES = ("not-started", "open", "closed", "stale")
KIND_DIRS = {"B": "builds", "D": "defects", "H": "holds", "N": "decisions"}
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
ALIAS_CHARS = "abcdefghjkmnpqrstvwxyz23456789"


class Refusal(Exception):
    """A rule of the records engine refused the request."""


def repo_root():
    env = os.environ.get("XALIANS_REPO")
    return Path(env) if env else Path(__file__).resolve().parents[3]


def roster_root():
    env = os.environ.get("XALIANS_ROSTER")
    return Path(env) if env else repo_root() / "art" / "roster"


def creature_dir(key):
    return roster_root() / key


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _enc(n, length):
    out = []
    for _ in range(length):
        out.append(CROCKFORD[n & 31])
        n >>= 5
    return "".join(reversed(out))


def new_id(prefix):
    """Prefix plus 26 chars: 10 of millisecond time, 16 of randomness (time ordered)."""
    ts = int(time.time() * 1000)
    return "%s-%s%s" % (prefix, _enc(ts, 10), _enc(secrets.randbits(80), 16))


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path, data):
    """Atomic write: temp file in the same folder, then replace. LF endings."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name("." + path.name + "." + secrets.token_hex(4) + ".tmp")
    try:
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def all_json(key):
    d = creature_dir(key)
    if not d.exists():
        return []
    return sorted(p for p in d.rglob("*.json") if not p.name.startswith("."))


def used_aliases(key):
    out = set()
    for p in all_json(key):
        try:
            data = read_json(p)
        except ValueError:
            continue
        if isinstance(data, dict):
            if isinstance(data.get("alias"), str):
                out.add(data["alias"])
            for r in data.get("reviews", []) or []:
                if isinstance(r, dict) and isinstance(r.get("alias"), str):
                    out.add(r["alias"])
    return out


def new_alias(key):
    used = used_aliases(key)
    while True:
        a = "".join(secrets.choice(ALIAS_CHARS) for _ in range(4))
        if a not in used:
            return a


def norm_stage(s):
    """Accept '05-sculpt', 'sculpt' or '5'."""
    s = str(s).strip().lower()
    for st in STAGES:
        if s == st or s == st.split("-", 1)[1] or (s.isdigit() and int(s) == int(st[:2])):
            return st
    raise Refusal("unknown stage %r; stages are %s" % (s, ", ".join(STAGES)))


def stage_dir(key, stage):
    return creature_dir(key) / "stages" / norm_stage(stage)


def load_creature(key):
    p = creature_dir(key) / "creature.json"
    if not p.exists():
        raise Refusal("no creature %r (run: roster.py init %s)" % (key, key))
    return read_json(p)


def save_creature(key, data):
    write_json(creature_dir(key) / "creature.json", data)


def list_records(key, stage, kind):
    d = stage_dir(key, stage) / KIND_DIRS[kind]
    if not d.exists():
        return []
    out = [read_json(p) for p in sorted(d.glob("*.json"))]
    return sorted(out, key=lambda r: r["id"])


def find_record(key, ref, kind):
    """Find by full id, 'B-alias' or bare alias, across every stage. Returns (stage, record)."""
    ref = str(ref)
    for st in STAGES:
        for r in list_records(key, st, kind):
            if ref in (r["id"], r.get("alias"), "%s-%s" % (kind, r.get("alias"))):
                return st, r
    raise Refusal("no %s record %r for creature %s" % (KIND_DIRS[kind][:-1], ref, key))


def save_record(key, stage, kind, rec):
    write_json(stage_dir(key, stage) / KIND_DIRS[kind] / (rec["id"] + ".json"), rec)

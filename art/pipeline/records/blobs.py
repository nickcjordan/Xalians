"""Content-addressed blob store: <root>/<aa>/<sha256> plus manifest.json of original names."""
import os
import shutil
import sys
from pathlib import Path

from common import Refusal, read_json, sha256_file, write_json, now_iso

DEFAULT_ROOT = r"C:\dev\art-data\pipeline\blobs"


def store_root():
    return Path(os.environ.get("XALIANS_BLOBS") or DEFAULT_ROOT)


def blob_path(h):
    h = h.lower()
    if len(h) != 64 or any(c not in "0123456789abcdef" for c in h):
        raise Refusal("not a sha256 hash: %r" % h)
    return store_root() / h[:2] / h


def _manifest_path():
    return store_root() / "manifest.json"


def load_manifest():
    p = _manifest_path()
    return read_json(p) if p.exists() else {}


def put(file):
    src = Path(file)
    if not src.is_file():
        raise Refusal("not a file: %s" % file)
    h = sha256_file(src)
    dst = blob_path(h)
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        tmp = dst.with_name(dst.name + ".tmp")
        shutil.copyfile(src, tmp)
        os.replace(tmp, dst)
    m = load_manifest()
    ent = m.get(h)
    if ent is None:
        m[h] = {"names": [src.name], "size": dst.stat().st_size, "firstSeen": now_iso()}
        write_json(_manifest_path(), m)
    elif src.name not in ent["names"]:
        ent["names"].append(src.name)
        write_json(_manifest_path(), m)
    return h


def get(h, out=None):
    """Return the blob path; with out, copy it there and return that path."""
    p = blob_path(h)
    if not p.exists():
        raise Refusal("blob %s is not in the store (%s)" % (h, store_root()))
    if out:
        out = Path(out)
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, out)
        return out
    return p


def read_bytes(h):
    return get(h).read_bytes()


def main(argv):
    if len(argv) >= 2 and argv[0] == "put":
        print(put(argv[1]))
        return 0
    if len(argv) >= 2 and argv[0] == "get":
        print(get(argv[1], argv[2] if len(argv) > 2 else None))
        return 0
    print("usage: blobs.py put <file> | get <hash> [out]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Refusal as e:
        print("refused: %s" % e, file=sys.stderr)
        sys.exit(1)

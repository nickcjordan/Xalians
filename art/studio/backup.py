"""Upload a set of files to the Creature Studio S3 archive, once per file content.

Objects are stored at blobs/<aa>/<sha256>, so a file already in the archive is never
sent again, whatever its name or folder. Each run writes a manifest (original path,
sha256, size) to manifests/<label>.json in the bucket and under the local store, which
is what a restore reads. Nothing is ever downloaded here.

    python art/studio/backup.py --label akinza-initial --root C:/dev/art-data/species-construction/akinza \
        --list paths.txt [--dry-run]

paths.txt holds one entry per line, relative to --root or absolute: a folder (all files
under it), a file, or a glob. Blank lines and lines starting with # are skipped.
"""

import argparse
import base64
import glob
import hashlib
import json
import os
import sys
import time
from pathlib import Path

DEFAULT_BUCKET = "xalians-art-archive-174497891311"
STORE = Path(os.environ.get("XALIANS_STUDIO_STORE", "C:/dev/art-data/studio"))
UPLOADED = STORE / "uploaded.txt"  # local list of hashes known to be in the bucket


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def expand(root, entries):
    files = []
    for entry in entries:
        p = Path(entry) if os.path.isabs(entry) else root / entry
        if any(c in entry for c in "*?["):
            files += [Path(x) for x in glob.glob(str(p)) if os.path.isfile(x)]
        elif p.is_dir():
            files += [x for x in p.rglob("*") if x.is_file()]
        elif p.is_file():
            files.append(p)
        else:
            sys.exit(f"missing: {p}")
    seen, out = set(), []
    for f in files:
        k = str(f.resolve())
        if k not in seen:
            seen.add(k)
            out.append(f)
    return out


def known_hashes(s3, bucket):
    known = set()
    if UPLOADED.exists():
        known |= set(UPLOADED.read_text().split())
    else:
        pages = s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix="blobs/")
        for page in pages:
            for obj in page.get("Contents", []):
                known.add(obj["Key"].rsplit("/", 1)[-1])
    return known


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True)
    ap.add_argument("--root", required=True)
    ap.add_argument("--list", required=True)
    ap.add_argument("--bucket", default=DEFAULT_BUCKET)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    root = Path(a.root)
    entries = [l.strip() for l in Path(a.list).read_text().splitlines() if l.strip() and not l.startswith("#")]
    files = expand(root, entries)

    manifest = []
    for f in files:
        try:
            rel = f.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            rel = f.resolve().as_posix()
        manifest.append({"path": rel, "sha256": sha256_file(f), "size": f.stat().st_size, "_abs": str(f)})

    unique = {m["sha256"]: m for m in manifest}
    total = sum(m["size"] for m in unique.values())
    print(f"{len(manifest)} files, {len(unique)} unique contents, {total / 1e9:.2f} GB")

    import boto3
    s3 = boto3.client("s3")
    known = known_hashes(s3, a.bucket)
    todo = [m for h, m in unique.items() if h not in known]
    todo_bytes = sum(m["size"] for m in todo)
    print(f"to upload: {len(todo)} files, {todo_bytes / 1e9:.2f} GB")
    if a.dry_run:
        return

    STORE.mkdir(parents=True, exist_ok=True)
    started, done = time.time(), 0
    with open(UPLOADED, "a") as log:
        for m in todo:
            h = m["sha256"]
            key = f"blobs/{h[:2]}/{h}"
            with open(m["_abs"], "rb") as body:
                s3.put_object(Bucket=a.bucket, Key=key, Body=body,
                              ChecksumSHA256=base64.b64encode(bytes.fromhex(h)).decode())
            head = s3.head_object(Bucket=a.bucket, Key=key)
            if head["ContentLength"] != m["size"]:
                sys.exit(f"size mismatch after upload: {m['path']}")
            log.write(h + "\n")
            log.flush()
            done += m["size"]
            print(f"  {done / 1e9:.2f} / {todo_bytes / 1e9:.2f} GB  {m['path']}", flush=True)

    out = {"label": a.label, "root": str(root), "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
           "files": [{k: v for k, v in m.items() if k != "_abs"} for m in manifest]}
    text = json.dumps(out, indent=2) + "\n"
    (STORE / "manifests").mkdir(parents=True, exist_ok=True)
    (STORE / "manifests" / f"{a.label}.json").write_text(text)
    s3.put_object(Bucket=a.bucket, Key=f"manifests/{a.label}.json", Body=text.encode())
    print(f"manifest manifests/{a.label}.json; {todo_bytes / 1e9:.2f} GB in {(time.time() - started) / 60:.1f} min")


if __name__ == "__main__":
    main()

"""Generate one image through Codex (Nick's subscription) and record it as an image build.

Usage (from the worktree root):
  python art/pipeline/images/codex_image.py <key> <stage> --element palette --label "A: ..." --summary "..." \
      --prompt-file prompt.txt [--input image.png ...] [--governs ...] [--not-for ...]

The run happens in C:\\dev\\art-data\\pipeline\\codex-runs\\<build alias>\\ (never inside the repository), with the
prompt on stdin and the built-in image tool asked to copy its PNG to output.png there. The output goes to the blob
store and the build record carries the prompt hash, the inputs, the Codex token count parsed from the log, and
the license note that image generation runs on Nick's Codex subscription. Standard library only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RECORDS = ROOT / "art" / "pipeline" / "records"
sys.path.insert(0, str(RECORDS))
import blobs  # noqa: E402

RUNS = Path(os.environ.get("XALIANS_CODEX_RUNS", r"C:\dev\art-data\pipeline\codex-runs"))
TIMEOUT_S = 15 * 60


def codex_bin() -> list[str]:
    appdata = os.environ.get("APPDATA")
    if appdata:
        entry = Path(appdata) / "npm" / "node_modules" / "@openai" / "codex" / "bin" / "codex.js"
        if entry.exists():
            return ["node", str(entry)]
    return ["codex"]


def wrapper(prompt: str, input_names: list[str]) -> str:
    inputs = f"Input images, if any, are the files in the current folder named {', '.join(input_names)}. " if input_names else ""
    return (f"{prompt.strip()}\n\nUse your built-in image generation tool to generate exactly one image. {inputs}"
            "Copy the generated PNG into the current folder as output.png. Reply with only the absolute path of the original generated file.\n")


def parse_tokens(log: str) -> int | None:
    m = re.findall(r"tokens used[:\s]+(\d[\d,._]*)", log, flags=re.I)
    if not m:
        return None
    try:
        return int(re.sub(r"[,._]", "", m[-1]))
    except ValueError:
        return None


def roster(*args: str) -> str:
    r = subprocess.run([sys.executable, str(RECORDS / "roster.py"), *args], capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        raise SystemExit(f"roster refused: {r.stderr.strip() or r.stdout.strip()}")
    return r.stdout


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("key"); ap.add_argument("stage")
    ap.add_argument("--element", required=True); ap.add_argument("--label", required=True)
    ap.add_argument("--summary", default=""); ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--input", action="append", default=[]); ap.add_argument("--governs", action="append", default=[])
    ap.add_argument("--not-for", action="append", default=[]); ap.add_argument("--model", default=os.environ.get("XALIANS_CODEX_MODEL", ""))
    a = ap.parse_args()

    prompt = Path(a.prompt_file).read_text(encoding="utf-8").strip()
    if not prompt:
        raise SystemExit("empty prompt")
    inputs = [Path(p).resolve() for p in a.input]
    for p in inputs:
        if not p.exists():
            raise SystemExit(f"input not found: {p}")
    # inputs are copied under in-<n>-<name> so no input can collide with output.png and the prompt can name them
    names = [f"in-{i + 1}-{p.name}" for i, p in enumerate(inputs)]

    plan = roster("build", "plan", a.key, a.stage, "--goal", f"{a.label}: {a.stage} {a.element}", "--scope", a.element, "--kind", "image")
    m = re.search(r"build (B-[0-9a-z]{4})", plan)
    if not m:
        raise SystemExit(f"could not read build alias from: {plan}")
    alias = m.group(1)
    run_dir = RUNS / alias
    run_dir.mkdir(parents=True, exist_ok=False)
    for p, n in zip(inputs, names):
        shutil.copy2(p, run_dir / n)
    (run_dir / "prompt.txt").write_text(prompt, encoding="utf-8", newline="\n")

    args = [*codex_bin(), "exec", *(["-m", a.model] if a.model else []), "--sandbox", "workspace-write", "--skip-git-repo-check",
            "-C", str(run_dir), "--output-last-message", str(run_dir / "reply.md"), "-"]
    t0 = time.time()
    try:
        r = subprocess.run(args, input=wrapper(prompt, names), capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=TIMEOUT_S, cwd=run_dir)
        log = (r.stdout or "") + ("\n" + r.stderr if r.stderr else "")
        status = r.returncode
    except subprocess.TimeoutExpired as e:
        log = f"TIMEOUT after {TIMEOUT_S}s\n{e.stdout or ''}\n{e.stderr or ''}"
        status = -1
    minutes = round((time.time() - t0) / 60, 2)
    (run_dir / "codex.log").write_text(log, encoding="utf-8", newline="\n")
    out = run_dir / "output.png"
    tokens = parse_tokens(log)

    report: dict = {"blockedBy": "nothing", "codexTokens": tokens, "wallMinutes": minutes,
                    "image": {"stage": a.stage, "element": a.element, "label": a.label, "summary": a.summary,
                              "promptSha256": hashlib.sha256(prompt.encode()).hexdigest(),
                              "inputs": [{"name": p.name, "hash": blobs.put(str(p))} for p in inputs],
                              "tool": "codex image_gen (Nick's subscription)", "model": a.model or "config default",
                              "governs": a.governs, "notFor": a.not_for, "runDir": str(run_dir), "exitStatus": status}}
    if status == 0 and out.exists() and out.stat().st_size > 0:
        h = blobs.put(str(out))
        report["outputs"] = [{"name": "output.png", "hash": h}]
        ok = True
    else:
        report["outputs"] = []
        report["blockedBy"] = "codex run failed; see codex.log"
        report["image"]["logTail"] = log[-1500:]
        ok = False
    rep = run_dir / "report.json"
    rep.write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    if ok:
        roster("build", "report", a.key, alias, "--file", str(rep))
        print(f"{alias} ok {out} tokens={tokens} minutes={minutes} hash={report['outputs'][0]['hash']}")
        return 0
    print(f"{alias} FAILED status={status} minutes={minutes}; log tail:\n{log[-800:]}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

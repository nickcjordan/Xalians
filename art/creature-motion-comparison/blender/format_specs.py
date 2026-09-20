"""Rewrite every species spec in a compact, diff-friendly layout.

Scalars-only objects and arrays stay on one line, key-track rows stay on one
line, and everything else nests two spaces. Run with any Python 3:

    python blender/format_specs.py
"""

import json
from pathlib import Path

SPECS = Path(__file__).resolve().parent / "species"


def scalar(value):
    return value is None or isinstance(value, (bool, int, float, str))


def compact(value, indent=0):
    pad = " " * indent
    if isinstance(value, dict):
        if all(scalar(v) for v in value.values()) and len(value) <= 16:
            return "{" + ", ".join(f"{json.dumps(k)}: {json.dumps(v)}" for k, v in value.items()) + "}"
        rows = [f"{pad}  {json.dumps(k)}: {compact(v, indent + 2)}" for k, v in value.items()]
        return "{\n" + ",\n".join(rows) + "\n" + pad + "}"
    if isinstance(value, list):
        if all(scalar(v) for v in value):
            return "[" + ", ".join(json.dumps(v) for v in value) + "]"
        if len(value) == 3 and scalar(value[0]) and scalar(value[1]) and isinstance(value[2], dict):
            return "[" + ", ".join(compact(v, indent) for v in value) + "]"
        rows = [f"{pad}  {compact(v, indent + 2)}" for v in value]
        return "[\n" + ",\n".join(rows) + "\n" + pad + "]"
    return json.dumps(value)


if __name__ == "__main__":
    for path in sorted(SPECS.glob("*.json")):
        spec = json.loads(path.read_text(encoding="utf-8"))
        path.write_text(compact(spec) + "\n", encoding="utf-8")
        print("formatted", path.name)

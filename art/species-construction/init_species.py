"""Scaffold a construction package from an existing species silhouette and record."""
import argparse
import json
import re
from pathlib import Path

from pipeline import DEPENDENCIES, STAGES, file_hash, record_inputs


def initialize(root, species):
    if not re.fullmatch(r"[a-z][a-z0-9-]*", species):
        raise ValueError("Species key must contain lowercase letters, digits or hyphens")
    source = root / f"apps/web/src/svg/species/{species}.svg"
    record = root / f"docs/species-templates/{species}.json"
    if not source.is_file() or not record.is_file():
        raise ValueError("Both the existing species SVG and species record are required")
    destination = root / f"docs/design/species-construction/{species}"
    if destination.exists():
        raise ValueError(f"Refusing to overwrite existing work: {destination}")
    package = {"schemaVersion": 1, "species": species, "decisions": {}, "stages": {}}
    for name in STAGES:
        package["stages"][name] = {
            "dependsOn": DEPENDENCIES[name], "pose": "unresolved", "decisionIds": [],
            "artifacts": [], "inputSnapshot": {}, "approval": None,
            "review": {"status": "pending", "reviewer": None, "artifactDigest": None,
                       "notes": "Not yet exercised. Read and interpret evidence before generation."},
        }
    package["stages"]["interpretation"]["artifacts"] = [
        {"path": path.relative_to(root).as_posix(), "sha256": file_hash(path), "role": role}
        for path, role in [(source, "abstract-source"), (record, "species-evidence")]]
    record_inputs(package)
    template = (root / "docs/design/species-construction/TEMPLATE.md").read_text(encoding="utf-8")
    destination.mkdir(parents=True)
    (destination / "brief.md").write_text(template.replace("# Species construction brief template",
        f"# {species.title()} construction brief"), encoding="utf-8")
    (destination / "package.json").write_text(json.dumps(package, indent=2)+"\n", encoding="utf-8")
    (destination / "review.md").write_text("# Review\n\nNo studies or approvals recorded.\n", encoding="utf-8")
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("species")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    try:
        print(initialize(args.root.resolve(), args.species))
    except (ValueError, OSError) as error:
        parser.exit(2, f"Cannot initialize species: {error}\n")

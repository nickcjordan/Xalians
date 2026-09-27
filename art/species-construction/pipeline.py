"""Track construction studies, dependency freshness, and explicit art approval.

This tool never generates images, authenticates a reviewer, or proves anatomy.
Paths in packages are relative to the repository root.
"""
import argparse
import hashlib
import json
from pathlib import Path

STAGES = ("interpretation", "identity", "construction", "connections", "geometry", "handoff")
DEPENDENCIES = {
    "interpretation": [], "identity": ["interpretation"],
    "construction": ["identity"], "connections": ["identity"],
    "geometry": ["construction", "connections"], "handoff": ["geometry"],
}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                     allow_nan=False).encode()).hexdigest()


def file_hash(path):
    path = Path(path)
    content = path.read_bytes()
    if path.suffix.lower() in (".md", ".json", ".py", ".txt", ".svg", ".yml", ".yaml"):
        content = content.replace(b"\r\n", b"\n")
    return hashlib.sha256(content).hexdigest()


def artifact_path(root, value):
    relative = Path(value)
    path = (root / relative).resolve()
    if relative.is_absolute() or not path.is_relative_to(root.resolve()):
        raise ValueError(f"Artifact must be repository-relative: {value}")
    return path


def validate(package):
    """Validate structure before reading paths or following dependencies."""
    if package.get("schemaVersion") != 1 or not isinstance(package.get("species"), str):
        raise ValueError("Expected schemaVersion 1 and species")
    stages = package.get("stages", {})
    if set(stages) != set(STAGES):
        raise ValueError("All six named stages are required")
    decisions = package.get("decisions", {})
    if not isinstance(decisions, dict):
        raise ValueError("decisions must be an object")
    for name in STAGES:
        stage = stages[name]
        if stage["dependsOn"] != DEPENDENCIES[name]:
            raise ValueError(f"{name}: invalid dependency graph")
        ids = stage["decisionIds"]
        if len(ids) != len(set(ids)) or any(i not in decisions for i in ids):
            raise ValueError(f"{name}: missing or duplicate decision")
        if stage["review"]["status"] not in ("pending", "pass", "fail"):
            raise ValueError(f"{name}: invalid review status")
        if not stage["review"].get("notes"):
            raise ValueError(f"{name}: review notes required")
        paths = [a["path"] for a in stage["artifacts"]]
        if len(paths) != len(set(paths)):
            raise ValueError(f"{name}: duplicate artifacts")
        for artifact in stage["artifacts"]:
            if not artifact.get("role") or len(artifact.get("sha256", "")) != 64:
                raise ValueError(f"{name}: role and SHA-256 required")


def signatures(package):
    """Recursive content hashes propagate upstream changes to all descendants."""
    result = {}
    for name in STAGES:
        stage = package["stages"][name]
        result[name] = digest({
            "species": package["species"], "stage": name,
            "artifacts": stage["artifacts"], "pose": stage["pose"],
            "decisions": {i: package["decisions"][i] for i in stage["decisionIds"]},
            "dependencies": {i: result[i] for i in stage["dependsOn"]},
        })
    return result


def inspect(package, root):
    validate(package)
    hashes = signatures(package)
    result = {}
    for name in STAGES:
        stage = package["stages"][name]
        problems = []
        for artifact in stage["artifacts"]:
            try:
                path = artifact_path(root, artifact["path"])
                if file_hash(path) != artifact["sha256"]:
                    problems.append(f"Changed artifact: {artifact['path']}")
            except (OSError, ValueError) as error:
                problems.append(str(error))
        snapshot = stage["inputSnapshot"]
        expected = {
            "decisions": {i: digest(package["decisions"][i]) for i in stage["decisionIds"]},
            "dependencies": {i: hashes[i] for i in stage["dependsOn"]},
        }
        if snapshot != expected:
            problems.append("Inputs changed since this study was recorded")
        for parent in stage["dependsOn"]:
            if result[parent]["integrity"] != "pass":
                problems.append(f"Upstream evidence is stale or missing: {parent}")
        approval = stage["approval"]
        approved = bool(approval and approval.get("reviewer") == "Nick"
                        and approval.get("words", "").strip()
                        and approval.get("source", "").strip()
                        and approval.get("date", "").strip()
                        and approval.get("artifactDigest") == hashes[name])
        if approval and not approved:
            problems.append("Incomplete or stale approval record")
        ready_parents = all(result[i]["release"] == "approved" for i in stage["dependsOn"])
        review_fresh = (stage["review"].get("artifactDigest") == hashes[name]
                        and bool(stage["review"].get("reviewer")))
        reviewed = stage["review"]["status"] == "pass" and review_fresh
        release = "approved" if (approved and reviewed and ready_parents
                                  and stage["artifacts"] and not problems) else "blocked"
        result[name] = {
            "integrity": "fail" if problems else "pass", "release": release,
            "artifactDigest": hashes[name], "problems": problems,
            "review": stage["review"]["status"], "reviewFresh": review_fresh,
            "approvalRecorded": approved, "upstreamApproved": ready_parents,
            "artifacts": len(stage["artifacts"]), "notes": stage["review"]["notes"],
        }
    return {"species": package["species"], "stages": result,
            "productionReady": result["handoff"]["release"] == "approved"}


def record_inputs(package):
    """Bind new study records to current decisions; never grants approval."""
    hashes = signatures(package)
    for stage in package["stages"].values():
        stage["inputSnapshot"] = {
            "decisions": {i: digest(package["decisions"][i]) for i in stage["decisionIds"]},
            "dependencies": {i: hashes[i] for i in stage["dependsOn"]},
        }


def markdown(report):
    lines = [f"# {report['species'].title()} construction status", "",
             "Generated evidence report. Integrity is not visual or user approval.", "",
             "| Stage | Integrity | Review | Release |", "|---|---|---|---|"]
    for name, item in report["stages"].items():
        lines.append(f"| {name} | {item['integrity']} | {item['review']} | {item['release']} |")
    for name, item in report["stages"].items():
        lines += ["", f"## {name}", "", item["notes"]]
        lines += [f"- {p}" for p in item["problems"]]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--report", type=Path)
    parser.add_argument("--markdown", type=Path)
    args = parser.parse_args()
    try:
        package = json.loads(args.package.read_text(encoding="utf-8"))
        report = inspect(package, args.root)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(2, f"Invalid construction package: {error}\n")
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.markdown:
        args.markdown.write_text(markdown(report), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return int(any(s["integrity"] != "pass" for s in report["stages"].values()))


if __name__ == "__main__":
    raise SystemExit(main())

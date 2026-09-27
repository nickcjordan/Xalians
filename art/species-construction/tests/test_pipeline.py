import copy
import importlib.util
import tempfile
import unittest
import sys
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("pipeline", Path(__file__).parents[1] / "pipeline.py")
pipeline = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pipeline)
sys.modules['pipeline'] = pipeline
INIT_SPEC = importlib.util.spec_from_file_location("init_species", Path(__file__).parents[1] / "init_species.py")
initializer = importlib.util.module_from_spec(INIT_SPEC)
INIT_SPEC.loader.exec_module(initializer)


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "evidence.txt").write_text("synthetic fixture")
        self.package = {"schemaVersion": 1, "species": "fixture",
                        "decisions": {"shape": {"instruction": "three branches"}}, "stages": {}}
        for name in pipeline.STAGES:
            self.package["stages"][name] = {
                "dependsOn": pipeline.DEPENDENCIES[name], "pose": "test-pose",
                "decisionIds": ["shape"] if name == "connections" else [],
                "artifacts": [{"path": "evidence.txt", "role": "test",
                               "sha256": pipeline.file_hash(self.root / "evidence.txt")}],
                "inputSnapshot": {}, "review": {"status": "pending", "notes": "Test only"},
                "approval": None,
            }
        pipeline.record_inputs(self.package)

    def report(self):
        return pipeline.inspect(self.package, self.root)

    def approve_fixture(self):
        # Synthetic approval data only. Never applied to an actual art package.
        hashes = pipeline.signatures(self.package)
        for name, stage in self.package["stages"].items():
            stage["review"] = {"status": "pass", "reviewer": "test",
                               "artifactDigest": hashes[name], "notes": "Synthetic test"}
            stage["approval"] = {"reviewer": "Nick", "words": "Synthetic approval fixture",
                                 "date": "2000-01-01", "source": "unit-test",
                                 "artifactDigest": hashes[name]}

    def test_integrity_does_not_grant_approval(self):
        report = self.report()
        self.assertTrue(all(s["integrity"] == "pass" for s in report["stages"].values()))
        self.assertFalse(report["productionReady"])

    def test_changed_connection_decision_invalidates_only_branch_and_descendants(self):
        self.package["decisions"]["shape"]["instruction"] = "revised attachment"
        states = self.report()["stages"]
        self.assertEqual(states["construction"]["integrity"], "pass")
        for name in ("connections", "geometry", "handoff"):
            self.assertEqual(states[name]["integrity"], "fail")

    def test_missing_and_changed_files_fail(self):
        (self.root / "evidence.txt").write_text("changed")
        self.assertEqual(self.report()["stages"]["identity"]["integrity"], "fail")
        (self.root / "evidence.txt").unlink()
        self.assertFalse(self.report()["productionReady"])

    def test_dependency_cycles_and_unknown_decisions_rejected(self):
        bad = copy.deepcopy(self.package)
        bad["stages"]["identity"]["dependsOn"] = ["geometry"]
        with self.assertRaises(ValueError):
            pipeline.inspect(bad, self.root)
        self.package["stages"]["identity"]["decisionIds"] = ["absent"]
        with self.assertRaises(ValueError):
            self.report()

    def test_approval_binds_full_evidence(self):
        self.approve_fixture()
        self.assertTrue(self.report()["productionReady"])
        self.package["stages"]["construction"]["pose"] = "different-pose"
        self.assertFalse(self.report()["productionReady"])

    def test_unreviewed_or_unapproved_upstream_blocks_release(self):
        self.approve_fixture()
        self.package["stages"]["connections"]["review"]["status"] = "fail"
        self.assertFalse(self.report()["productionReady"])
        self.approve_fixture()
        self.package["stages"]["identity"]["approval"] = None
        self.assertFalse(self.report()["productionReady"])

    def test_stale_semantic_review_blocks_release(self):
        self.approve_fixture()
        self.package["stages"]["geometry"]["review"]["artifactDigest"] = "0" * 64
        self.assertFalse(self.report()["productionReady"])

    def test_path_escape_rejected(self):
        self.package["stages"]["identity"]["artifacts"][0]["path"] = "../outside.txt"
        self.assertEqual(self.report()["stages"]["identity"]["integrity"], "fail")

    def test_git_line_endings_do_not_invalidate_text_evidence(self):
        path = self.root / "portable.md"
        path.write_bytes(b"one\r\ntwo\r\n")
        expected = pipeline.file_hash(path)
        path.write_bytes(b"one\ntwo\n")
        self.assertEqual(pipeline.file_hash(path), expected)

    def test_empty_stage_cannot_be_approved(self):
        self.package["stages"]["handoff"]["artifacts"] = []
        pipeline.record_inputs(self.package)
        self.approve_fixture()
        self.assertFalse(self.report()["productionReady"])

    def test_initializer_binds_source_without_inheriting_anatomy(self):
        for path, contents in [("apps/web/src/svg/species/test.svg", "<svg/>"),
                               ("docs/species-templates/test.json", "{}"),
                               ("docs/design/species-construction/TEMPLATE.md", "# Species construction brief template")]:
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(contents)
        import json
        destination = initializer.initialize(self.root, "test")
        created = json.loads((destination / "package.json").read_text())
        self.assertEqual(created["decisions"], {})
        self.assertFalse(pipeline.inspect(created, self.root)["productionReady"])
        with self.assertRaises(ValueError):
            initializer.initialize(self.root, "test")

    def test_initializer_requires_sources_and_safe_key(self):
        for key in ("missing", "../escape"):
            with self.assertRaises(ValueError):
                initializer.initialize(self.root, key)


if __name__ == "__main__":
    unittest.main()

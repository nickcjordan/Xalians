import contextlib
import io
import json
import os
import re
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import blobs  # noqa: E402
import common  # noqa: E402
import cost  # noqa: E402
import page  # noqa: E402
import roster  # noqa: E402


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        t = Path(self.tmp.name)
        self.repo, self.ros, self.blobdir, self.proj = t / "repo", t / "roster", t / "blobs", t / "projects"
        (self.repo / "docs/species-templates/v5").mkdir(parents=True)
        (self.repo / "apps/web/src/svg/species").mkdir(parents=True)
        tpl = {"key": "fixo", "name": "Fixo", "element": "air", "homePlanet": "saiphus",
               "lore": {"appearance": ["horns", "long ears"]},
               "physiology": {"bodyPlan": "quadruped", "covering": "fur", "anatomy": ["horns", "tail"],
                              "size": {"massKg": [9, 17], "heightCm": [48, 66]}}}
        (self.repo / "docs/species-templates/v5/fixo.json").write_text(json.dumps(tpl))
        (self.repo / "apps/web/src/svg/species/fixo.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'/>")
        self.saved = {k: os.environ.get(k) for k in ("XALIANS_REPO", "XALIANS_ROSTER", "XALIANS_BLOBS", "XALIANS_PROJECTS")}
        os.environ.update(XALIANS_REPO=str(self.repo), XALIANS_ROSTER=str(self.ros),
                          XALIANS_BLOBS=str(self.blobdir), XALIANS_PROJECTS=str(self.proj))
        self.t = t

    def tearDown(self):
        for k, v in self.saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        self.tmp.cleanup()

    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = roster.run([str(a) for a in argv])
        return code, out.getvalue(), err.getvalue()

    def ok(self, *argv):
        code, out, err = self.run_cli(*argv)
        self.assertEqual(code, 0, err)
        return out

    def refused(self, *argv, contains=None):
        code, out, err = self.run_cli(*argv)
        self.assertNotEqual(code, 0, "expected refusal, got: " + out)
        self.assertIn("refused", err)
        if contains:
            self.assertIn(contains, err)
        return err

    def blob(self, text):
        f = self.t / ("f%d.bin" % len(list(self.t.glob("f*.bin"))))
        f.write_bytes(text if isinstance(text, bytes) else text.encode())
        return blobs.put(f)

    def alias_of(self, out):
        return re.search(r"[BDHN]-([a-z0-9]{4})\b", out).group(1)

    def report(self, hashes=None, **extra):
        r = {"outputs": [{"name": "o", "hash": h} for h in (hashes or [self.blob("out%d" % id(extra))])],
             "blockedBy": "nothing"}
        r.update(extra)
        f = self.t / ("rep%d.json" % len(list(self.t.glob("rep*.json"))))
        f.write_text(json.dumps(r))
        return f


class TestIds(Base):
    def test_ids_shape_and_uniqueness(self):
        ids = {common.new_id("B") for _ in range(2000)}
        self.assertEqual(len(ids), 2000)
        for i in ids:
            self.assertRegex(i, r"^B-[0-9A-HJKMNP-TV-Z]{26}$")

    def test_ids_time_ordered(self):
        a = common.new_id("B")
        import time
        time.sleep(0.01)
        self.assertLess(a, common.new_id("B"))

    def test_aliases_unique_within_creature(self):
        self.ok("init", "fixo")
        self.ok("stage", "open", "fixo", "01-intake")
        seen = set()
        for i in range(40):
            out = self.ok("hold", "add", "fixo", "intake", "--statement", "s%d" % i, "--source", "inferred", "--reason", "r")
            seen.add(self.alias_of(out))
        self.assertEqual(len(seen), 40)
        for a in seen:
            self.assertRegex(a, r"^[a-z0-9]{4}$")
        c = common.load_creature("fixo")
        self.assertRegex(c["alias"], r"^[a-z0-9]{4}$")
        self.assertNotIn(c["alias"], seen)


class TestWrites(Base):
    def test_atomic_write_leaves_no_temp_and_survives_failure(self):
        p = self.t / "x" / "a.json"
        common.write_json(p, {"a": 1})
        common.write_json(p, {"a": 2})
        self.assertEqual(json.loads(p.read_text()), {"a": 2})
        self.assertEqual([q.name for q in p.parent.iterdir()], ["a.json"])
        with self.assertRaises(TypeError):
            common.write_json(p, {"a": object()})
        self.assertEqual(json.loads(p.read_text()), {"a": 2})
        self.assertEqual([q.name for q in p.parent.iterdir()], ["a.json"])
        self.assertNotIn(b"\r", p.read_bytes())

    def test_init_stores_hashes_and_facts(self):
        self.ok("init", "fixo")
        c = common.load_creature("fixo")
        self.assertEqual(c["species"]["name"], "Fixo")
        self.assertEqual(len(c["species"]["templateSha256"]), 64)
        self.assertEqual(c["species"]["appearance"], ["horns", "long ears"])
        self.assertEqual(c["techSpec"], {})
        self.assertEqual({s["state"] for s in c["stages"].values()}, {"not-started"})
        self.assertEqual(len(c["stages"]), 11)
        self.refused("init", "fixo", contains="already exists")
        self.refused("init", "nosuch", contains="no species template")


class TestBlobs(Base):
    def test_put_get_manifest(self):
        f = self.t / "pic.png"
        f.write_bytes(b"hello")
        h = blobs.put(f)
        self.assertTrue((self.blobdir / h[:2] / h).exists())
        self.assertEqual(blobs.read_bytes(h), b"hello")
        self.assertEqual(blobs.load_manifest()[h]["names"], ["pic.png"])
        g = self.t / "other.png"
        g.write_bytes(b"hello")
        self.assertEqual(blobs.put(g), h)
        self.assertEqual(blobs.load_manifest()[h]["names"], ["pic.png", "other.png"])
        with self.assertRaises(common.Refusal):
            blobs.get("0" * 64)


class TestRefusals(Base):
    def setUp(self):
        super().setUp()
        self.ok("init", "fixo")
        self.ok("stage", "open", "fixo", "05-sculpt")

    def plan(self, *extra):
        return self.run_cli("build", "plan", "fixo", "sculpt", "--goal", "g", "--scope", "head", *extra)

    def test_build_needs_open_stage(self):
        self.refused("build", "plan", "fixo", "07-surface", "--goal", "g", "--scope", "s", contains="not open")

    def test_report_without_outputs(self):
        code, out, _ = self.plan()
        a = self.alias_of(out.split("Tag your agent")[1])
        f = self.t / "r.json"
        f.write_text(json.dumps({"outputs": [], "blockedBy": "nothing"}))
        self.refused("build", "report", "fixo", a, "--file", f, contains="no outputs")

    def test_report_without_blocked_by(self):
        _, out, _ = self.plan()
        a = self.alias_of(out.split("Tag your agent")[1])
        f = self.t / "r.json"
        f.write_text(json.dumps({"outputs": [{"hash": "a" * 64}]}))
        self.refused("build", "report", "fixo", a, "--file", f, contains="blockedBy")

    def test_report_with_score(self):
        _, out, _ = self.plan()
        a = self.alias_of(out.split("Tag your agent")[1])
        f = self.report(score=9)
        self.refused("build", "report", "fixo", a, "--file", f, contains="score")

    def test_third_build_needs_audit(self):
        d = self.alias_of(self.ok("defect", "add", "fixo", "sculpt", "--description", "ear collapses"))
        for _ in range(2):
            code, _, err = self.plan("--defect", d)
            self.assertEqual(code, 0, err)
        self.refused("build", "plan", "fixo", "sculpt", "--goal", "g", "--scope", "s", "--defect", d, contains="audit")
        self.ok("decision", "add", "fixo", "sculpt", "--who", "orchestrator", "--kind", "audit",
                "--words", "audited", "--defect", d)
        code, _, err = self.plan("--defect", d)
        self.assertEqual(code, 0, err)

    def test_close_needs_bound_approval(self):
        self.refused("stage", "close", "fixo", "sculpt", "--approval", "N-zzzz", contains="no decision")
        n = self.alias_of(self.ok("decision", "add", "fixo", "sculpt", "--who", "nick", "--kind", "ruling", "--words", "ok"))
        self.refused("stage", "close", "fixo", "sculpt", "--approval", n, contains="approval")
        self.refused("decision", "add", "fixo", "sculpt", "--who", "nick", "--kind", "approval", "--words", "yes",
                     contains="bind a build")

    def test_pin_under_other_creature(self):
        other = self.ros / "other" / "stages" / "x.txt"
        other.parent.mkdir(parents=True)
        other.write_text("x")
        code, _, err = self.plan("--input", str(other))
        self.assertEqual(code, 1)
        self.assertIn("another creature", err)
        own = self.ros / "fixo" / "pin.txt"
        own.write_text("x")
        code, _, err = self.plan("--input", str(own))
        self.assertEqual(code, 0, err)

    def test_hold_needs_source(self):
        self.refused("hold", "add", "fixo", "sculpt", "--statement", "s", "--source", "nick", contains="--words")
        self.refused("hold", "add", "fixo", "sculpt", "--statement", "s", "--source", "inferred", contains="--reason")

    def test_review_needs_report_and_verdict(self):
        _, out, _ = self.plan()
        a = self.alias_of(out.split("Tag your agent")[1])
        f = self.t / "rv.json"
        f.write_text(json.dumps({"verdict": "pass"}))
        self.refused("review", "add", "fixo", a, "--file", f, contains="no report")
        self.ok("build", "report", "fixo", a, "--file", self.report())
        f.write_text(json.dumps({"verdict": "maybe"}))
        self.refused("review", "add", "fixo", a, "--file", f, contains="verdict")
        f.write_text(json.dumps({"verdict": "pass"}))
        self.ok("review", "add", "fixo", a, "--file", f)


class TestFlowStatusNextPageCost(Base):
    def setUp(self):
        super().setUp()
        self.ok("init", "fixo")

    def test_full_flow(self):
        self.assertIn("open stage 01-intake", self.ok("next", "fixo"))
        self.ok("stage", "open", "fixo", "intake")
        self.assertIn("plan the first build", self.ok("next", "fixo"))
        self.ok("decision", "add", "fixo", "intake", "--who", "nick", "--kind", "budget", "--words", "six builds", "--amount", 6)
        h = self.alias_of(self.ok("hold", "add", "fixo", "intake", "--statement", "ears stay upright", "--source", "nick",
                                  "--words", "keep the ears up", "--date", "2026-10-13"))
        d = self.alias_of(self.ok("defect", "add", "fixo", "intake", "--description", "horns too thin"))
        self.assertIn("plan a build for open defect D-" + d, self.ok("next", "fixo"))
        out = self.ok("build", "plan", "fixo", "intake", "--goal", "thicken horns", "--scope", "horns", "--defect", d)
        self.assertIn("H-" + h, out)
        self.assertIn("keep the ears up", out)
        b = self.alias_of(out.split("Tag your agent")[1])
        self.assertIn("report is due", self.ok("next", "fixo"))
        before, after = self.blob(b"\x89PNG-before"), self.blob(b"\x89PNG-after")
        rep = self.report(hashes=[after], checks=[{"title": "Horn thickness", "question": "Are the horns thick enough?",
                                                    "before": before, "after": after, "recommended": "yes"}])
        self.ok("build", "report", "fixo", b, "--file", rep)
        self.assertIn("no review", self.ok("next", "fixo"))
        rv = self.t / "rv.json"
        rv.write_text(json.dumps({"verdict": "pass"}))
        self.ok("review", "add", "fixo", b, "--file", rv)
        self.assertIn("plan a build for open defect", self.ok("next", "fixo"))
        self.ok("defect", "close", "fixo", d)
        self.assertIn("take the checks to Nick", self.ok("next", "fixo"))

        st = self.ok("status", "fixo")
        self.assertIn("01-intake", st)
        self.assertIn("open", st)
        self.assertIn("holds in force:", st)
        self.assertIn("ears stay upright", st)
        self.assertIn("budget left: 5 builds", st)
        self.assertIn("last decision: N-", st)
        self.assertIn("open defects: none", st)

        n = self.alias_of(self.ok("decision", "add", "fixo", "intake", "--who", "nick", "--kind", "approval",
                                  "--words", "approved", "--build", b, "--evidence", after))
        self.assertIn("close the stage", self.ok("next", "fixo"))
        self.ok("stage", "open", "fixo", "02-vision")
        self.ok("stage", "close", "fixo", "intake", "--approval", n)
        c = common.load_creature("fixo")
        self.assertEqual(c["stages"]["01-intake"]["state"], "closed")
        self.assertTrue((self.ros / "fixo/stages/01-intake/cost.json").exists())

        # closing an earlier stage again later marks closed dependents stale
        c["stages"]["03-sheet"]["state"] = "closed"
        common.save_creature("fixo", c)
        self.ok("stage", "open", "fixo", "01-intake")
        n2 = self.alias_of(self.ok("decision", "add", "fixo", "intake", "--who", "nick", "--kind", "approval",
                                   "--words", "again", "--build", b, "--evidence", after))
        self.ok("stage", "close", "fixo", "intake", "--approval", n2)
        self.assertEqual(common.load_creature("fixo")["stages"]["03-sheet"]["state"], "stale")
        self.assertIn("stale", self.ok("next", "fixo"))

        # page
        self.ok("stage", "open", "fixo", "03-sheet")
        self.ok("stage", "open", "fixo", "01-intake")
        self.ok("page", "fixo")

    def test_page_html(self):
        self.ok("stage", "open", "fixo", "05-sculpt")
        self.ok("hold", "add", "fixo", "sculpt", "--statement", "keep ears up", "--source", "inferred", "--reason", "sheet shows them")
        out = self.ok("build", "plan", "fixo", "sculpt", "--goal", "g", "--scope", "head")
        b = self.alias_of(out.split("Tag your agent")[1])
        img = self.blob(b"\x89PNG\r\n\x1a\nxyz")
        checks = [{"title": "Ear height check", "question": "Do the ears stand tall?", "before": img, "after": img,
                   "reference": img, "recommended": "Yes"},
                  {"title": "Horn curl check", "question": "Do the horns curl?", "before": "0" * 64, "after": img,
                   "recommended": "No"}]
        self.ok("build", "report", "fixo", b, "--file", self.report(checks=checks))
        self.ok("page", "fixo")
        text = (self.ros / "fixo" / "review.html").read_text(encoding="utf-8")

        class P(HTMLParser):
            def __init__(s):
                super().__init__()
                s.stack, s.title, s.imgs = [], "", 0

            def handle_starttag(s, tag, attrs):
                if tag not in ("meta", "img", "br"):
                    s.stack.append(tag)
                if tag == "img":
                    s.imgs += 1
                    assert dict(attrs)["src"].startswith("data:image/png;base64,")

            def handle_endtag(s, tag):
                assert s.stack.pop() == tag

            def handle_data(s, d):
                if s.stack and s.stack[-1] == "title":
                    s.title += d

        p = P()
        p.feed(text)
        self.assertEqual(p.stack, [])
        self.assertEqual(p.title, "Fixo review")
        self.assertEqual(p.imgs, 4)
        for needle in ("Ear height check", "Horn curl check", "Check 1", "Check 2", "keep ears up",
                       "sheet shows them", "is missing from the store", "Standing state", "prefers-color-scheme"):
            self.assertIn(needle, text)
        self.assertNotRegex(text.lower(), r"#(f00|d00|0a0|0f0|2a2)")
        self.assertNotIn("\r", text)

    def test_page_folds_closed_stage(self):
        self.ok("stage", "open", "fixo", "01-intake")
        out = self.ok("build", "plan", "fixo", "01-intake", "--goal", "g", "--scope", "s")
        b = self.alias_of(out.split("Tag your agent")[1])
        h = self.blob(b"x")
        self.ok("build", "report", "fixo", b, "--file", self.report([h]))
        n = self.alias_of(self.ok("decision", "add", "fixo", "01-intake", "--who", "nick", "--kind", "approval",
                                  "--words", "ok", "--build", b, "--evidence", h))
        self.ok("stage", "close", "fixo", "01-intake", "--approval", n)
        self.ok("page", "fixo")
        self.assertIn("<details><summary>01-intake", (self.ros / "fixo/review.html").read_text(encoding="utf-8"))


class TestPicks(Base):
    ELS = ("air", "fire", "water", "rock")

    def setUp(self):
        super().setUp()
        self.ok("init", "fixo")
        self.ok("stage", "open", "fixo", "02-vision")
        self.builds, self.blobs = {}, {}
        for el in self.ELS:
            out = self.ok("build", "plan", "fixo", "vision", "--goal", el, "--scope", el)
            b = self.alias_of(out.split("Tag your agent")[1])
            h = self.blob("img-" + el)
            self.ok("build", "report", "fixo", b, "--file", self.report(hashes=[h]))
            self.builds[el], self.blobs[el] = b, h

    def export(self, elements=("air", "fire", "water"), submitted=True, **over):
        d = {"picks": {el: {"alias": "B-" + self.builds[el], "label": "C: " + el, "blob": self.blobs[el],
                            "at": "2026-10-14T10:00:00Z"} for el in elements},
             "requests": {"rock": {"kind": "mix", "text": "A's color with B's stripes", "at": "2026-10-14T10:01:00Z"}},
             "status": {"submitted": submitted, "at": "2026-10-14T10:02:00Z"},
             "composite": {"blob": self.blobs["rock"], "label": "all picks", "note": "composed"}}
        d.update(over)
        f = self.t / "picks.json"
        f.write_text(json.dumps(d))
        return f

    def decisions(self):
        return common.list_records("fixo", "02-vision", "N")

    def test_happy_path(self):
        out = self.ok("picks", "file", "fixo", "vision", "--from", self.export())
        self.assertIn("approval N-", out)
        kinds = sorted(n["kind"] for n in self.decisions())
        self.assertEqual(kinds, ["approval", "pick", "pick", "pick", "request"])
        pick = next(n for n in self.decisions() if n["kind"] == "pick" and n["element"] == "fire")
        self.assertEqual(pick["who"], "nick")
        self.assertEqual(pick["words"], "picked C: fire on the selection screen")
        self.assertEqual(pick["binds"]["evidence"], [self.blobs["fire"]])
        req = next(n for n in self.decisions() if n["kind"] == "request")
        self.assertEqual((req["element"], req["requestKind"]), ("rock", "mix"))
        ds = common.list_records("fixo", "02-vision", "D")
        self.assertEqual([d["description"] for d in ds], ["rock: no option accepted"])
        self.assertEqual(len(ds[0]["attempts"]), 1)

    def test_blob_not_in_outputs_refused_and_nothing_written(self):
        f = self.export()
        d = json.loads(f.read_text())
        d["picks"]["water"]["blob"] = self.blobs["rock"]
        f.write_text(json.dumps(d))
        self.refused("picks", "file", "fixo", "vision", "--from", f, contains="water")
        self.assertEqual(self.decisions(), [])

    def test_idempotent(self):
        f = self.export()
        self.ok("picks", "file", "fixo", "vision", "--from", f)
        n = len(self.decisions())
        out = self.ok("picks", "file", "fixo", "vision", "--from", f)
        self.assertEqual(len(self.decisions()), n)
        self.assertIn("already filed", out)
        self.assertEqual(len(common.list_records("fixo", "02-vision", "D")[0]["attempts"]), 1)

    def test_approval_binding_and_stage_close(self):
        out = self.ok("picks", "file", "fixo", "vision", "--from", self.export())
        ap = next(n for n in self.decisions() if n["kind"] == "approval")
        self.assertIn("N-" + ap["alias"], out)
        ids = {common.find_record("fixo", "B-" + self.builds[el], "B")[1]["id"] for el in ("air", "fire", "water")}
        self.assertEqual(set(ap["binds"]["builds"]), ids)
        self.assertEqual(set(ap["binds"]["evidence"]), {self.blobs[el] for el in ("air", "fire", "water")})
        self.assertEqual(ap["composite"]["label"], "all picks")
        self.ok("stage", "close", "fixo", "vision", "--approval", ap["alias"])

    def test_not_submitted_writes_no_approval(self):
        out = self.ok("picks", "file", "fixo", "vision", "--from", self.export(submitted=False))
        self.assertNotIn("approval N-", out)
        self.assertNotIn("approval", [n["kind"] for n in self.decisions()])


class TestCost(Base):
    def line(self, role, mid, inp, out, cr=0, cc=0, text=None):
        if role == "user":
            return json.dumps({"type": "user", "message": {"role": "user", "content": text}})
        return json.dumps({"type": "assistant", "message": {"id": mid, "role": "assistant", "usage": {
            "input_tokens": inp, "output_tokens": out, "cache_read_input_tokens": cr,
            "cache_creation_input_tokens": cc}}})

    def test_dedupe_and_roles(self):
        sub = self.proj / "proj" / "sess" / "subagents"
        sub.mkdir(parents=True)
        lines = [self.line("user", None, 0, 0, text="do work [build B-k3f9] now"),
                 self.line("a", "msg_1", 2, 10, 100, 5),
                 self.line("a", "msg_1", 2, 40, 100, 5),  # same response logged again, output grew
                 self.line("a", "msg_2", 3, 7, 200, 0)]
        (sub / "agent-a.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
        (sub / "agent-a.meta.json").write_text(json.dumps({"agentType": "loop-worker", "description": "x"}))
        # a second transcript found only through its meta description, repeating msg_2
        (sub / "agent-b.jsonl").write_text("\n".join([self.line("user", None, 0, 0, text="hello"),
                                                      self.line("a", "msg_2", 3, 7, 200, 0),
                                                      self.line("a", "msg_9", 1, 1)]) + "\n", encoding="utf-8")
        (sub / "agent-b.meta.json").write_text(json.dumps({"agentType": "critic", "description": "review [build B-k3f9]"}))
        # an unrelated transcript
        (sub / "agent-c.jsonl").write_text(self.line("user", None, 0, 0, text="[build B-zzzz]") + "\n"
                                           + self.line("a", "msg_77", 999, 999) + "\n", encoding="utf-8")
        r = cost.scan("k3f9")
        self.assertFalse(r["uncovered"])
        self.assertEqual(r["messages"], 3)
        self.assertEqual(r["filesScanned"], 3)
        self.assertEqual(r["transcriptsMatched"], 2)
        t = r["tokens"]
        self.assertEqual((t["input_tokens"], t["output_tokens"], t["cache_read_input_tokens"], t["cache_creation_input_tokens"]),
                         (2 + 3 + 1, 40 + 7 + 1, 300, 5))
        self.assertEqual(r["byRole"]["loop-worker"]["messages"], 2)
        self.assertEqual(r["byRole"]["critic"]["messages"], 1)

    def test_uncovered(self):
        r = cost.scan("nope")
        self.assertTrue(r["uncovered"])
        self.assertEqual(r["messages"], 0)

    def test_collect_writes_build_record(self):
        self.ok("init", "fixo")
        self.ok("stage", "open", "fixo", "01-intake")
        out = self.ok("build", "plan", "fixo", "01-intake", "--goal", "g", "--scope", "s")
        b = self.alias_of(out.split("Tag your agent")[1])
        sub = self.proj / "p" / "s" / "subagents"
        sub.mkdir(parents=True)
        (sub / "agent-a.jsonl").write_text(self.line("user", None, 0, 0, text="[build B-%s]" % b) + "\n"
                                           + self.line("a", "m1", 4, 5) + "\n", encoding="utf-8")
        self.ok("cost", "collect", "fixo", b)
        rec = common.find_record("fixo", b, "B")[1]
        self.assertEqual(rec["cost"]["tokens"]["output_tokens"], 5)
        self.assertEqual(rec["cost"]["messages"], 1)
        self.assertFalse(rec["cost"]["uncovered"])


if __name__ == "__main__":
    unittest.main()

# Creature records and tooling (part 5 of the pipeline design)

Status: draft 1, 2026-10-14. Part 5 of the six-part program in [creature-pipeline-design.md](creature-pipeline-design.md). All process; the pipeline owner's decisions. What Nick sees from this part is the review page shape (section 4), already ruled.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Records are JSON files in git under `art/roster/<key>/`, one folder per stage, written only through a stdlib Python CLI (`art/pipeline/records/roster.py`) with atomic writes and schema checks. Git is the history | 90%: the experiment's records survived sessions; chat did not | `creature-studio.md` decision 1 |
| 2 | Ids are time-ordered (ULID-style) with a four-character alias for speech ("build B-k3f9"); aliases are unique per creature | 90% | `creature-studio.md` section 2 |
| 3 | Binaries live in a content-addressed store outside every worktree at `C:\dev\art-data\pipeline\blobs\<aa>\<sha256>` with a manifest of original names. S3 backup to the existing `xalians-art-archive` bucket happens only for approved outputs, at stage close, once per blob; nothing is downloaded except to restore. No new cloud resource | 85%: the bucket exists and is paid for; approval-time upload keeps S3 off the working path | `creature-studio.md` decision 6 |
| 4 | Cost is collected per build by tagging each builder agent's description with the build alias and summing its transcript usage deduplicated by message id, plus Blender seconds from the build record and Codex image tokens where recorded; the orchestrator's share is a time-window estimate shown separately | 85%: the experiment proved the method on real transcripts | `creature-studio.md` section 3 |
| 5 | Review pages are generated from records into a single HTML file per creature (Artifact-ready, images inlined as data URIs), newest stage first, each check numbered with one large crop, defaults and questions from the stage record; the generator never needs site code | 85% | memory `present-design-as-artifact` |
| 6 | Status and next action are derived from records (`roster.py status`, `roster.py next`), never stored twice | 90% | `creature-studio.md` section 3 |
| 7 | Nothing in `packages/*`, `apps/*` or the root changes; promotion of any tool into a shared package waits for Nick | 95% | mission rules |

## 1. Record kinds

| File | Holds |
|---|---|
| `creature.json` | key, species template hash, silhouette hash, tech spec, stage states (`open`, `closed`, `stale`) with approval evidence hashes, next action |
| `stages/<nn>-<name>/builds/<id>.json` | alias, kind (preview, build, image, run), goal, scope, targeted defect, brief hash, holds in force, inputs and outputs with blob hashes, validator results, builder report, Blocked by, cost, status |
| `stages/<nn>-<name>/defects/<id>.json` | plain description, camera, 2D region, origin, attempts (builds that targeted it), status |
| `stages/<nn>-<name>/holds/<id>.json` | statement, scope, source (`nick` with words and date, `inferred` with reason), strength, status |
| `stages/<nn>-<name>/decisions/<id>.json` | who (nick or orchestrator), words, date, what it binds (build alias and evidence hashes), kind (approval, pick, ruling, budget, audit) |
| `stages/<nn>-<name>/review.json` | reviewer verdicts per build (pass or named defects) |
| `stages/<nn>-<name>/cost.json` | wall minutes, tokens by role, Codex tokens, Blender minutes, written at close |

## 2. CLI

```
roster.py init <key>                       creature.json from the species template and silhouette
roster.py stage open <key> <nn-name>
roster.py build plan <key> <stage> --goal ... --scope ... [--defect D-xxxx]   writes the build and prints the brief
roster.py build report <key> <build> --file report.json                       refuses a report without outputs or Blocked by, or with a score
roster.py defect add|close ...; hold add|lift ...; decision add ...
roster.py review add <key> <build> --file review.json
roster.py stage close <key> <stage> --approval D-xxxx   writes cost.json, marks dependents stale
roster.py status <key>; roster.py next <key>
roster.py blob put <file>; roster.py blob get <hash>
roster.py cost collect <key> <build>       scans transcripts for the build tag
roster.py page <key>                       generates the review HTML
```

Refusals (engine rules): a report without outputs or Blocked by; a third build on a defect with no audit decision; a stage close without an approval decision bound to evidence hashes; a build that pins a file under another creature's folder.

## 3. Blob store and backup

`blob put` hashes, copies to the store, records the original name; records reference hashes only. `backup` (later) lists blobs referenced by closed stages that the S3 manifest lacks, uploads them, verifies, and records the manifest. Restore drill before any local cleanup, and no cleanup without Nick's confirmed list.

## 4. Review page and the selection screen

**Selection screen (ratified by Nick, 2026-10-14, after comparing the parallel effort's dev-route screen).** Every option set a stage presents (vision elements, model sheet aspects, part previews, palette variants) is shown on one standard Artifact page generated from the records by `art/pipeline/records/select_page.py` and published with the `db` and `user` runtime capabilities, so a click is recorded as data in the page's store, never as words in chat. The screen has, per set: the question, a "what to judge" list, the approved reading line(s) the set serves (only what differs per question lives in a card; Nick, 2026-10-14: "What's in the card should just be anything that differs per question"), option cards with a Pick button and a plain summary, the recommended option marked with its reason, full-size view, flicker compare (swap options in place, same base), two-up compare, a background toggle (light, dark, sky), a "none of these" box with a note that becomes a new-set order, and a "mix" box ("A's color with B's stripes") that becomes one more generation. A sticky left rail holds the source material once: Nick's silhouette, the species' raw lore (description, appearance list, origin, habitat, feeding, behavior, company), the home world's encyclopedia entry and the base image (Nick, 2026-10-14: "I just want to be able to see the silhouette alongside the details from the lore"; then "a left rail with the source material instead of repasting it into every selection card"). A sticky right picks rail shows every pick as a thumbnail, undo with an inline confirm, and, once every set is picked, a composed preview (one generated image with all picks applied) above a Confirm button. Kept from the parallel effort: pick buttons, the picks collage, undo with confirm, auto-submit on the last pick, plain summaries, what-to-judge, none-of-these with a note. Changed: an Artifact with a data store instead of a site route. Dropped: polling, status badges, the prompt fold.

**Filing picks.** The orchestrator reads the store (`picks/<element>`, `requests/<element>`, `status/board`) with the ArtifactData tool, exports it to a JSON file, and `roster.py picks file <key> <stage> --from picks.json` writes one Nick decision per pick (kind `pick`, words "picked <label> on the selection screen", bound to the build alias and the image's blob hash) and one `request` record per new-set or mix order, which counts toward the two-regeneration stall rule. The composed preview is a build whose blob the orchestrator writes into `composite/current` before Nick confirms. Stage close binds to the confirm decision.

**Review page.** One page per creature. Top: the creature's standing state and the open question, if any. Then the open stage: numbered checks, each a large crop (before left, after right, reference beside), the sprite-size view, holds in force with sources, my recommended answer. Closed stages follow, folded. Moving results link to a viewer page or an inlined video. The page is published as an Artifact and the link goes in the check-in and in this log.

## 5. Tests

`python -m unittest discover art/pipeline/records/tests`: ids and aliases, atomic writes, every refusal, status and next derivation on a fixture creature, cost dedupe on a fixture transcript, page generation on the fixture.

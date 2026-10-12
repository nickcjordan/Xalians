# Creature Studio: active work record

Read this first when resuming Creature Studio work. Design of record: [creature-studio.md](creature-studio.md).

## Intended outcome

A legitimate, repeatable system for taking each Xalians creature from concept to a finished, surfaced 3D model (Phase 1), with stages and gates, records of every hold, decision, build, review and cost, checks that enforce the process rules, a builder contract, and a local review screen where Nick reviews and approves. Phase 2 (rig, animate, sprite atlas) is reserved, not built.

## Authorized scope

Nick, 2026-10-12: "proceed" on design revision 3, after answering the backup (S3, only at sensible moments), review (desk only, approval by a button in the screen, no message logging) and rules (report, do not over-enforce) questions. Local cleanup of `C:\dev\art-data` is allowed only after the keep set is in S3, a restore drill passes, and Nick confirms the delete list.

## Completion criteria for milestone 1

Nick, 2026-10-12: "I dont want you to do anything with Akinza, that model is being worked on in another session." Akinza is out of scope for this work (no import, no builds). Milestone 1 is a new creature taken through the studio from intake: intake and references approved by Nick in the screen, then a blockout and a first part build reviewed in the screen, with holds, defects, verdict and cost recorded. The creature is Nick's pick (recommended: Dromeus).

## Steps

| Step | State | Evidence |
|---|---|---|
| Design, audits, revision 3 | done | PR #804 |
| S0 bucket | done | PR #804; the first apply hit IAM propagation, a rerun created it |
| S0 keep-set upload | done | 578 objects, 2.73 GB, 12.4 min; manifest `manifests/akinza-initial-2026-10-12.json` |
| S1 studio core (`packages/studio`) | done | PR #805, 30 tests |
| S1 chain port | done for v5eye3 | PR #806; H50 replay matched head-3140 exactly |
| S1 packet renderer | done | PR #807; 14 cameras, 1.2 min cold, pixel-identical reruns |
| S1 `/studio` review screen and blob store | done | this PR; one-screen workspace, real Akinza packet in the fixture (`node apps/web/scripts/studio-fixture.mjs --force`, then `/studio/fixture/head`) |
| S1 token cost collector | done | PR #809 |
| S1 intake and reference stages, creature board | done | PR #810 |
| S1 Akinza import, skull | dropped | Nick, 2026-10-12 (above) |
| S1 blockout: part library and assembly | not started | needs the milestone creature for its first part kinds |
| S1 first creature through intake and references | waiting on Nick's pick | |

## Next unfinished action

Nick names the first creature; run its intake, propose its parts, gather references, submit both stages for his review; meanwhile build the blockout part library for its body plan.

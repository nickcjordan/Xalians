# Creature Studio: active work record

Read this first when resuming Creature Studio work. Design of record: [creature-studio.md](creature-studio.md).

## Intended outcome

A legitimate, repeatable system for taking each Xalians creature from concept to a finished, surfaced 3D model (Phase 1), with stages and gates, records of every hold, decision, build, review and cost, checks that enforce the process rules, a builder contract, and a local review screen where Nick reviews and approves. Phase 2 (rig, animate, sprite atlas) is reserved, not built.

## Authorized scope

Nick, 2026-10-12: "proceed" on design revision 3, after answering the backup (S3, only at sensible moments), review (desk only, approval by a button in the screen, no message logging) and rules (report, do not over-enforce) questions. Local cleanup of `C:\dev\art-data` is allowed only after the keep set is in S3, a restore drill passes, and Nick confirms the delete list.

## Completion criteria for milestone 1

Akinza imported at v5eye3; one skull build made through the studio (previews, then a build) and reviewed by Nick in the `/studio` screen, with holds, defects, verdict and cost recorded; the keep set backed up to S3.

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
| S1 token cost collector | not started | screen shows "not collected yet" |
| S1 Akinza import | waiting | Nick's parallel head session moved on past v5eye3: v5eye4 eyes approved ("the eyes look great"), v5eye5 tiny fix, nose-mouth-v1 (H53, assembled-3157) in review. Import from that session's final state, then port its new steps (H51 to H53) the same way as #806 |
| S1 skull previews, build, review | not started | |

## Next unfinished action

Finish the studio core, then the runner and import.

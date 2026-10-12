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
| S0 bucket | PR #804 (Terraform) | |
| S0 keep-set upload | measured: v5eye3 rebuild closure 2.5 GB (3 roots, 30 step outputs, assemblies 3141 and 3101, their packets) | |
| S1 studio core (`packages/studio`) | in progress, branch `studio-core` | |
| S1 Blender runner and packet | not started | |
| S1 Akinza import and chain port | not started | |
| S1 `/studio` review screen | not started | |
| S1 skull previews, build, review | not started | |

## Next unfinished action

Finish the studio core, then the runner and import.

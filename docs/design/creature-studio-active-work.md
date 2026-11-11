# Creature Studio: active work record

Read this first when resuming Creature Studio work. Design of record: [creature-studio.md](creature-studio.md).

## Intended outcome

A legitimate, repeatable system for taking each Xalians creature from concept to a finished, surfaced 3D model (Phase 1), with stages and gates, records of every hold, decision, build, review and cost, checks that enforce the process rules, a builder contract, and a local review screen where Nick reviews and approves. Phase 2 (rig, animate, sprite atlas) is reserved, not built.

## Authorized scope

Nick, 2026-10-12: "proceed" on design revision 3, after answering the backup (S3, only at sensible moments), review (desk only, approval by a button in the screen, no message logging) and rules (report, do not over-enforce) questions. Local cleanup of `C:\dev\art-data` is allowed only after the keep set is in S3, a restore drill passes, and Nick confirms the delete list.

## Completion criteria for milestone 1

Nick, 2026-10-12: "I dont want you to do anything with Akinza, that model is being worked on in another session." Akinza is out of scope for this work (no import, no builds). Milestone 1 is a new creature taken through the studio from intake: intake and references approved by Nick in the screen, then a blockout and a first part build reviewed in the screen, with holds, defects, verdict and cost recorded. The creature is Hypnopet (Nick, 2026-10-12). Every process decision is logged as an experiment in `creature-studio-experiments.md` with its result filled in as evidence arrives.

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
| S1 blockout framework (mass, sweep, shell; part_id) | done | PR #811 |
| Reuse plan | tentatively signed off | `creature-studio-reuse.md`, audited by Codex and Fable |
| Vision board and model sheet stages, Codex image runs as builds | not started | design revision 4 |
| Hypnopet intake | done | X27 to X29 in `creature-studio-experiments.md` |
| Hypnopet vision board, model sheet | done | flesh-front, flesh-side, flesh-back sheet views; picks for face and horn |
| Hypnopet body tracks A and R | track R chosen for the sculpt stage, A shelved as the joint reference | X32, X33 |
| Studio aligned with the creature pipeline and the Akinza loop | done | `creature-studio-alignment.md` (X33) |
| Hypnopet sculpt stage (repair list on the reconstruction) | in progress: sculpt-53 after five rounds and seven sculpt critics; the face is not at standard; open items listed in the round log | `creature-studio-hypnopet-sculpt.md` |
| Hypnopet deformation audit (test rig) | in progress: audit-24, four deformation critic rounds; open items listed in the round log | `creature-studio-hypnopet-sculpt.md`, `art/studio/blockout/hypnopet/rig_sculpt.py` |

## Next unfinished action

Hypnopet head rebuilt as authored volumes (sculpt-94, 2026-11-11; review page linked from the session's last message). Waiting on Nick: may the upper lip pads hang about 1.5 cm lower in profile (the sheet's side view) at the cost of a shorter mouth opening from the front? Then: chin and throat, mouth corners that curl up, the eye check below, the rig test on the new head, then the sculpt critic and deformation audit before any surface work.

Lessons offered by the Luceras retro (2026-11-11, branch creature-pipeline, `docs/design/creature-pipeline-retro-luceras.md`), applied from the next build:
- Eye as geometry first: the opening wider than the iris so white shows at both corners, lid cover over the top of the iris, a catchlight at sprite size. Hypnopet's eye material runs the iris to the lid line (`packet_render.py`, irisDeg = opening - 5), the failure Luceras found ("a button"); check against the sheet, whose eyes show a pale ring round the iris.
- Settle head scale, carriage and eye shape before fur; build parts as anatomy with numbers; name a cause only after a measurement.
- Before surface work, a painted target sprite at game size in the shared studio light, side facing, approved by Nick; compare renders to it.
- A fresh builder agent per build; renders through the shared render queue; at most two working scenes per variant on disk (Hypnopet: 6.5 GB under art-data now).

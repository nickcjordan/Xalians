# Creature pipeline and Creature Studio: one process

Written 2026-11-11, at the end of the Luceras retro ([creature-pipeline-retro-luceras.md](creature-pipeline-retro-luceras.md)). The pipeline (this branch, `creature-pipeline`, Luceras) and Creature Studio (`creature-studio-work` and main, Akinza then Hypnopet; [creature-studio.md](creature-studio.md) on main) grew up side by side with the same stage model. Nick is running three creatures in three sessions on them. This note fixes which system carries forward and what each one contributes.

## Context

Both systems run intake, vision board, model sheet, blockout and parts with gates, holds, defects, the stall audit and records bound to hashes. They differ in where they stop and what they have built:

| | Creature Studio | Creature pipeline |
|---|---|---|
| Scope | Phase 1: concept to a surfaced model; phase 2 (rig, animation, sprites) reserved, not built | All eleven stages, proven end to end on Luceras through approved sprites |
| Records | `packages/studio`, records under `art/creatures/<key>/`, on main | `art/pipeline/records`, records under `art/roster/<key>/`, on this branch only |
| Review | `/studio` screen in `apps/web`, approval by button (Nick's ruling) | Artifact pages, approvals typed in chat |
| Storage | Content-addressed blob store with an S3 keep set and a restore drill | Blob store, no off-machine copy |
| Build backend | Recipe engine (cached, pinned DAG) | One-off scripts per pass under `art/pipeline/` |
| Rules | Reuse plan: procedures, not parts; at most five lessons per brief | 18 retro rules (design section 11) from 56 lessons |

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Creature Studio is the system of record from creature two on: it is on main, it has Nick's review screen and approval button, and its storage has an off-machine copy | 80%: the pipeline proved more stages, but the Studio carries Nick's ratified review and backup choices | `creature-studio.md` decisions 4 to 7 (main) |
| 2 | The pipeline contributes phase 2 (stages 6 to 10: game mesh, rig, animation, sprite render and gates) and the retro rules; it is not maintained as a second process after Luceras | 80% | retro numbers: stages 7 to 9 were four fifths of Luceras's hours, and the Studio has none of that tooling |
| 3 | The rules enter the Studio as lessons under its reuse plan (each names what it governs; at most five per brief), not as a new rule system | 85% | `creature-studio-reuse.md` decision 9 (main); pipeline rule P18 says the same |
| 4 | This session does not edit Studio records or `art/creatures/`; the Studio sessions apply the rules to their own creatures | 95%: standing instruction for this session | session holds |
| 5 | Luceras's records stay in `art/roster/luceras/` as the pipeline's record; they are not migrated | 75%: migration buys nothing for a finished slice | retro, Luceras items left open |

## Where each rule lands in the Studio

| Rule | Studio stage | Applies to Hypnopet now? |
|---|---|---|
| P1 eye as geometry on the sheet | model sheet | yes, its face and eye previews are in progress |
| P2 anatomy with numbers, skeleton-outward digits, station profiles | model sheet, parts | yes |
| P3 repair list on the reconstruction, curvature at joins | parts | yes |
| P13 proportions, head scale, carriage, eye settled at the blockout | blockout | yes |
| P12 painted target sprite approved before surface work | before surface | next |
| P4 coverage table and whole-creature 4x read per groom | surface | next |
| P11 crude end-to-end sprite right after the game mesh | phase 2 entry | later |
| P5, P6 gate fur regions in fur; deformation audit before Nick | phase 2 | later; Akinza's animation session now |
| P7 previews until clean, one render per round | phase 2 | later; Akinza now |
| P8 measure before naming a cause | all | yes |
| P9, P17 data layout, one working scene, cleanup at stage close | all | yes; the Studio's keep set covers retention |
| P10 sprites first, glTF when a game needs it | export | later |
| P14 fresh builder per build | all | yes |
| P15 detached, resumable render and gate jobs | phase 2 | Akinza now |
| P16 shared render queue with the Mac mini spillover | all renders | yes |
| P18 measure and prune rules | retro | at Hypnopet's retro |

## Steps

| Step | State |
|---|---|
| Rules written into the pipeline design (section 11) | done 2026-11-11 |
| Cost collector matches resumed builders and reads report cost; report requires wall hours | done 2026-11-11 (31 tests) |
| Closing a stage marks only dependent stages stale | done 2026-11-11 |
| Rules sent to the Hypnopet and Akinza sessions with this note | done 2026-11-11 |
| Phase 2 tooling (rig, animation, sprite render, every-frame gate, region reads) ported into the Studio when Hypnopet reaches phase 2 | open; the Hypnopet session owns the port |
| Pipeline branch: no further creatures; kept for Luceras's records and the phase 2 tools until the port | standing |

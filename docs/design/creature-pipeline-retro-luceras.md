# Creature pipeline retro: Luceras (stage 11)

Written 2026-11-11, after Nick approved the final sprites (check 17, "i think it is probably good enough for now", decisions N-7bxn, N-ekrd, N-sq9a). Design of record: [creature-pipeline-design.md](creature-pipeline-design.md); work log and lessons 1 to 56: [creature-pipeline-log.md](creature-pipeline-log.md). This retro is the stage 11 output the design asks for: cost per stage, defects per part, what to promote, and the design changes. The changes themselves are written into the design (section 11).

## Context

Luceras was the validation creature: one quadruped from its record and silhouette to a shipped sprite slice (standing idle plus the horns-first signature leap and both transitions, side facing, 166 frames, Cycles strand fur). It started 2026-10-14 and was approved 2026-11-11. The question for this retro is what the next creature should do differently so it costs a fraction of this one and Nick finds fewer of the defects himself.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Hours are counted as clock hours with any activity from the orchestrator session or its Claude builders (UTC); Codex builder runs in their own app are not in the hour count | 70%: overlapping runs and idle waits inside an active hour are not separated, so this is an upper bound on effort and a lower bound on wall time | session `0e7c8bda` transcript and its 89 subagent transcripts |
| 2 | Claude token figures are deduplicated by message id across the orchestrator and its subagents; "new tokens" means output plus cache writes, the part that grows with work done | 85% | same transcripts |
| 3 | The roster's cost blocks are not usable for per-stage cost: the collector matched none of the 153 builds, and only builds reported since 2026-11-09 carry a cost block | 95% | `art/roster/luceras/stages/*/cost.json` (`buildsWithoutTranscripts` lists every build) |
| 4 | Phases are assigned by date from the log and the roster records, because stages 7 to 9 ran interleaved (surface, rig and animation were reopened by each other) | 75% | `creature-pipeline-log.md` lessons 38 to 56; defect dates below |
| 5 | Sprites stay the primary delivery (Nick, 2026-10-16); the design's "3D first" line is out of date and is amended, with glTF export kept for when a game needs it | 90% | memory `creature-delivery-target-3d-first`; design decision 1 |
| 6 | The retro's process changes are mine to make and apply without a gate; only look, feel and product changes go to Nick | 95% | memory `nick-decides-product-i-decide-process` |

## The numbers

| Measure | Luceras |
|---|---|
| Calendar | 2026-10-14 to 2026-11-11 (28 days), active on 18 of them, paused 2026-10-28 to 2026-11-08 |
| Active hours | about 187 clock hours with activity |
| Builds | 153 recorded (vision and sheet images, sculpt and surface builds, previews, render runs) |
| Defects | 27 recorded, all closed; the worst single defect took 11 builds (paws read as bare blocks, D-07 paws) |
| Nick's decisions | 82: 26 picks, 22 approvals, 22 requests (a fix he asked for), 12 rulings |
| Claude tokens | 2.9M output, 196M written to cache, 2.8B cache reads (orchestrator plus 89 builder and reader agents) |
| Codex tokens | about 6.1M recorded (vision, sheet, sculpt, game mesh, surface) |
| Sprite renders | 9 full passes at about 1.9 h of CPU render each, plus a 0.7 h every-frame gate |
| Disk | 66 GB of working data, 40 GB of it superseded Blender scenes (cleaned 2026-11-11, about 58 GB freed) |

### Where the hours went

| Phase | Dates | Active hours | New Claude tokens | What happened |
|---|---|---|---|---|
| Stages 1 to 6 | 10-14 to 10-16 | 41 | 11M | intake, vision board, model sheet, blockout, sculpt, game mesh; Codex built most geometry |
| Paws as anatomy, groom | 10-17 to 10-19 | 18 | 6M | paws rebuilt from the skeleton outward after three block-shaped passes |
| Rig, animation, re-skin | 10-20 to 10-23 | 56 | 117M | deformation audit, re-skin passes 3 to 8 chasing clay self-intersection |
| Coat and appeal | 10-24 to 10-27 | 34 | 55M | coat color, face and eye appeal builds 1 to 5, blind readers |
| Final sprites | 11-09 to 11-11 | 36 | 10M | eye passes 3 to 5, nape, legs, foot, tail; sprite passes 3 to 9 |

Stages 1 to 6 took a fifth of the hours and a twentieth of the new tokens. The rest went into stages 7 to 9, and most of that into two patterns described below: gating in the wrong medium, and tuning around a structure that was wrong.

### Defects per part

| Part | Defects | Builds spent on them | Found first by |
|---|---|---|---|
| Paws and feet | 7 | 21 | Nick for 4 (clown shoes, holes and the fifth toe, cinder blocks, slivers) |
| Tail and plume | 6 | 9 | orchestrator 4, Nick 2 (periscope plume, curl in flight) |
| Head, face and eye | 4 | 4, plus about 20 builder hours of appeal work outside defect records | readers and Nick |
| Neck, nape, chest | 3 | 3 | Nick for the neck crease, a blind reader for the nape |
| Legs and coat | 2 | 3 | orchestrator |
| Ears and horns (game mesh) | 1 | 2 | orchestrator |
| Vision-board option sets | 4 | 4 | Nick (no option accepted, regenerated) |

## What worked (keep)

1. **Stages 1 to 4 in one day.** Option sets edited from one base image kept every option comparable, the selection screen recorded picks as data, and the shaved clay view on the model sheet gave the sculpt a shape authority. Nick made 26 picks with almost no rework.
2. **The generated reconstruction as shape authority.** Every one of Nick's sculpt corrections pointed back toward it (lesson 34). The sculpt stage is a repair list on the reconstruction, not a re-sculpt.
3. **Method by part type.** Swept tubes for tails, horns and digits came out right first or second time; region deltas made parallel parts and a full foreleg revert one script run each (lessons 29, 30, 35).
4. **The look.** Cycles strand fur under the measured studio light reached the target at under 2 s per sprite frame on CPU, so the sprite route costs almost nothing in machine time (lesson 38).
5. **Records and the stall rule.** Every build, defect and decision is traceable to hashes. The stall rule forced the audits that turned the paws and the tail around.
6. **Independent eyes.** Blind readers and a separate critic caught what the orchestrator missed: the splayed forelegs, the bare nape, the lidless eye.
7. **The final gate.** By pass 9 the every-frame gate and the 4x region read found nothing new, and Nick approved on first sight.

## What cost the most (change)

1. **Gating in the wrong medium: about 30 builder hours.** Re-skin passes 5 to 8 drove clay self-intersection counts down while the animal got worse, and one fur render showed the fold was invisible in the product all along (lessons 46, 47). Counts went to zero without a plausibility check against real anatomy.
2. **Tuning around a wrong structure: paws (11 builds on one defect) and the face (about 20 builder hours, then three eye passes).** In both cases the passes adjusted surfaces while the cause was structural: a foot with no bones running through it, an iris as wide as the eye opening. Both were solved, or understood, only when the part was built or measured as anatomy (lessons 40 to 42, 48, 49).
3. **Render, read, fix one thing, render again: six rounds and five full renders in about 24 hours.** Each read found the next defect because no read covered the whole creature and no groom measured coverage per region (lessons 50 to 53).
4. **Nick as defect finder.** He raised 22 requests, and at least 8 defects were seen first by him. Each one was visible in material the orchestrator had already reviewed (lessons 33, 39, 43, 45).
5. **Missing cost data.** The collector matched no build, so the per-stage cost above is rebuilt from transcripts after the fact. Codex hours and Blender minutes after stage 5 are not recorded at all.
6. **Disk.** One creature left 66 GB of working data because every candidate scene was saved whole and superseded ones were archived on the same drive (lesson 55).

## Promoted to the pipeline (design section 11)

| # | Change | Stage | From |
|---|---|---|---|
| P1 | The model sheet specifies the eye as geometry: an opening wider than the iris with white at both corners, lid cover over the iris top, a catchlight that survives at sprite size, no pale line under the eye | 3 | lessons 48, 49; D-2nx5 |
| P2 | Part briefs state anatomy with numbers: section profiles, bone layout for feet and hands, station profiles (tone and width) along long parts; small multi-digit parts are built from the skeleton outward | 3, 5, 7 | lessons 40 to 42, 54 |
| P3 | Sculpt is a repair list on the reconstruction; every join gets a curvature check; every look stage starts with the reconstruction-versus-sculpt comparison | 5 | lessons 34, 39, 43 |
| P4 | Every groom ends with a coverage table per region (roots per cm2, length, lift, visible skin share against a far control) and a whole-creature 4x region read | 7 | lessons 50, 51 |
| P5 | Furred regions are gated in fur at the sprite camera; clay counts are diagnostics only; every deformation gate pairs counts with pose limits from real-animal reference | 8, 9 | lessons 46, 47 |
| P6 | The orchestrator and an independent critic each write a full defect list from the large deformation and region boards before Nick sees anything | 8, 9 | lessons 33, 45 |
| P7 | Fix on preview boards until a whole-creature read finds nothing, then render the sprites once per round | 9, 10 | lesson 53 |
| P8 | Name a cause only after a measurement shows it (view-space trace, station plot, coverage count) | all | lessons 49, 53 |
| P9 | Builders keep one working scene per variant and at most two on disk; superseded scenes are deleted at stage close, not archived on the same drive | all | lesson 55 |
| P10 | Delivery is sprites first; stage 10 exports the sprite atlas now and the glTF when a game needs the live model | 10 | Nick, 2026-10-16 |

## Fixes to the tooling before creature two

1. **Cost collector.** Every builder's first message carries its `[build B-xxxx]` tag and every build report carries wall hours, tokens and Blender minutes, so stage cost comes from the records, not from transcripts afterward.
2. **Stage staleness.** Closing a stage should mark stale only the later stages that consume what changed, not every later stage (lesson 56).
3. **Reconcile with Creature Studio.** Creature Studio (Akinza, Hypnopet, `docs/design/creature-studio*.md`) runs a parallel construction process. Before creature two, its reuse rules and these ten changes become one set of rules, so the next creature does not inherit two processes.

## Luceras items left open

Not needed for the approved slice, recorded so they are not lost: stage 10 export (sprite atlas packaging; the signature sheet is over 4,096 px tall and must be split), fur that sways on its own, a ground shadow, the live 3D model (behind the final surface), dropping sprite-only bones from a game export, the outer third of the tail shaft reading slightly lighter, and back mottling warmer than the sheet.

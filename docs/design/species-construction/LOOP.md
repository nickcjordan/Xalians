# Construction loop: builder, critic, orchestrator

Adopted 2026-09-29 at Nick's request, revised to version 2 on 2026-09-30 after the first 16-round run. The loop improves a creature model without Nick identifying defects. He is asked only at a large milestone: an approval candidate, or a hard stop with an honest report. After every round the orchestrator republishes the review page and sends Nick a short progress note; that is follow-along only. First exercised on Akinza; the files for that run live in `akinza/loop/`.

## Why version 2

The first run kept 12 of 16 rounds but moved the weighted score only from 5.12 to 6.05. The logs showed where the time went and why the gains were small:
- Builders used 85 percent of the time and 80 percent of the tokens, with no cheap way to check their own work. Every check was a full critic round.
- Coat masses (the ear fan) had no concrete target, so each attempt invented a new wrong look: knobs, thorns, square teeth, a petal lattice.
- A 0 to 10 score in half-point steps could not separate a real small gain from noise; six kept rounds gained exactly the noise threshold.
- The critic rescored all twelve regions every round, though most were pixel-identical.
- Retries got no record of what had failed. One region was worked at a time, and low-ranked regions (forepaws, tail root) never got a turn.
- Settled decisions could drift: the round 6 tail rebuild lost the upward tip curl.

## Roles

| Role | Model | Does | Never does |
|---|---|---|---|
| Spec writer | Opus | The first time a coat-mass or structure region (ear fan front and rear, tails, tail root) is worked, traces the references into a target spec: outline points, a structure table of every lock or tail (root, tip, length, width, direction, curl, overlap), cross-sections, and the failure looks to avoid, with an annotated image. | Edits the model. |
| Builder | Sonnet | Executes one work order for one component (head or body). Iterates against the silhouette tools, then builds one candidate: assembly, packet, technical check, diff. Commits its code. | Judges visual criteria, works outside its order, or edits references, rubric, invariants or specs. |
| Critic | Opus | Judges the checklist criteria from actual renders, gives a better, same or worse verdict for the target region, checks the invariants, and lists the target's top issues. | Edits anything but its critique, trusts the builder's description, or re-judges measured criteria. |
| Orchestrator | Opus (main session and the workflow script) | Chooses orders, keeps or reverts, persists state, reviews parked regions, decides milestones, reports each round to Nick. | Lets any opinion override the checklist results. |

## Tools that make iteration cheap

- `loop_tools.py quick <head> <body> <preview>`: places the two components as the assembly does and renders flat silhouettes from fixed cameras in about a minute, without the union, fairing or full render.
- `loop_tools.py fit`: maps the model and the reference figure into one frame (floor at the bottom, figure height 1, centred on the ear fan) and reports silhouette overlap per view (front, left, back, and back against the back study) and band (head, trunk, legs), plus an overlay: grey both, blue model only, orange reference only. The packet carries it as `m11.png` and `fit.json`.
- `loop_tools.py measured <packet>`: computes the rubric's measured criteria into `measured.json`.
- `loop_tools.py diff <baseline packet> <candidate packet>`: which regions' images changed.
- Model widths use a fixed world height (the loop-start figure, 1.8605 from the floor), so moving an ear tip cannot rescale the body readings.
- A shared slot lock lets two Blender processes run at once while at least 9 GB of memory is free.

## Scoring: a checklist

`<species>/loop/rubric.json` gives every region four to six criteria. Measured criteria are computed; visual criteria are judged pass, partial or fail with image evidence. A region's score is 10 x its credited fraction (pass 1, partial 0.5). `<species>/loop/invariants.json` lists settled decisions checked every round.

## One round

1. The orchestrator picks up to two orders: the highest-priority head region and the highest-priority body region. Priority is `weight x (8 - score) x fixability`; a region idle for `coverageRounds` (6) rounds goes first in its pool; the whole-form region runs alone when it ranks highest.
2. For a coat-mass or structure region without a spec, the spec writer writes one first.
3. The builders run in parallel. Each gets its region's criteria with current results, the critic's issues, the spec, and the region's history card: every earlier attempt's approach, verdict and reason, and the reusable options it added.
4. Each builder iterates with `quick` and `fit` until its measured targets pass or stop improving, then hands over one candidate.
5. One critic per candidate, in parallel. It judges the target region, plus any other region whose images changed.
6. A candidate is kept only if all hold: the technical check passes; the critic says `better` for the target; the target's checklist score rises; no region loses credit; no invariant newly breaks; and the weighted mean rises by at least 0.025.
7. When both candidates are kept, a combiner assembles the new head with the new body and a critic checks the combination for regressions. If it regresses, the larger single gain is kept.
8. A recorder writes `<species>/loop/rounds/round-NN.json`. The orchestrator rebuilds the review page from the round files and sends Nick a progress note.

## Limits

- **Pass bar:** a region at 8 or above is left alone unless it regresses.
- **Cooldown:** no region is worked more than two rounds in a row.
- **Stall rule:** three rounds on a region without a net gain of 1 park it. A parked region needs a method change, which the orchestrator writes between batches or records for Nick.
- **Build budget:** a builder may make six component builds and as many quick previews as it needs, and one assembly.
- **Repeated identical top finding:** if the same finding tops a region for three rounds, it is a design decision. The orchestrator makes it deliberately and records it, or asks Nick if only he can make it.

## Milestones and check-ins

- **Batch:** four rounds in one background workflow (`art/species-construction/loop/loop_workflow.js`, which takes the status and the rubric as arguments). Between batches the orchestrator persists state, reviews parked regions and commits.
- **Approval gate:** every region at 7 or more, weighted mean at least 8, and the face, ear fan front and tails at 8 or more. A fresh, cold Opus review then confirms the model is ready to show. Only then does Nick receive one exact version.
- **Hard stop:** after 16 rounds without reaching the gate, Nick receives an honest report.
- **Taste decisions** only Nick can make are collected for the next check-in.

## Durable storage

Generated geometry lives in `C:\dev\art-data\species-construction\<species>`, junctioned into the worktree as `untracked/species-construction/<species>`, and local model tools live in `C:\dev\art-data\tools`. On 2026-09-30 a Codex worktree was deleted with every gitignored file in it, including all of Akinza's geometry; never keep irreplaceable generated work only inside a worktree.

## Files

- `art/species-construction/loop/loop_tools.py`: assemble, render, check, packet, measure, quick, fit, measured, diff.
- `art/species-construction/quick_silhouette.py`: the fast preview renderer.
- `art/species-construction/loop/loop_workflow.js`: the batch workflow.
- `<species>/loop/critic-brief.md`, `builder-brief.md`, `spec-brief.md`: standing instructions.
- `<species>/loop/rubric.json`, `invariants.json`, `specs/`: the checklist, the settled decisions, the target specs.
- `<species>/loop/status.json` and `rounds/`: the persisted state and the per-round records.

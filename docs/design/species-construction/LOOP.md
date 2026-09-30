# Construction loop: builder, critic, orchestrator

Adopted 2026-09-29 at Nick's request. The loop improves a creature model without Nick identifying defects. He is asked only at a large milestone: an approval candidate, or a hard stop with an honest report. First exercised on Akinza; the files for that run live in `akinza/loop/`.

## Roles

| Role | Model | Does | Never does |
|---|---|---|---|
| Critic | Opus | Scores every region of the candidate against the references from actual renders, ranks defects by likeness damage, says whether the targeted region improved and whether anything regressed. Writes its critique into the packet. | Edits files other than its critique, or trusts the builder's description of what changed. |
| Builder | Sonnet | Executes one work order: changes geometry through the construction scripts, builds new numbered components, assembles, renders, packages and runs the technical check. Commits its code changes. | Grades its own work, works on a region outside its order, or edits references, approvals or accepted decisions. |
| Orchestrator | Opus (main session and the workflow script) | Chooses each work order from the critic's scores, keeps or reverts each candidate, enforces the limits below, persists state, changes method when a region stalls, and decides when a milestone reaches Nick. | Lets the builder's or its own opinion override the critic's scores. |

Visual judgment stays on Opus. In an earlier test, Sonnet readers misread every design they were shown (`blind-readers-need-opus`).

## One round

1. The builder receives a work order: one region, its top one or two issues with the critic's concrete fixes, the baseline component names, the acceptance test and a build budget.
2. The builder produces a candidate: new component directories, one assembly, renders, a packet and a technical check (`art/species-construction/loop/loop_tools.py`).
3. The critic scores the candidate packet with the baseline packet beside it.
4. The orchestrator keeps the candidate only if all of these hold:
   - the technical check passes;
   - the target region rises by at least 0.5;
   - no other region falls by 1 or more;
   - any proportion measurement the order targets moves toward the reference.
   - the weighted mean rises by at least 0.025 (from round 5; added after round 3 kept a +0.5 target gain that cost another region 0.5).

   Otherwise the baseline stays. This ratchet means a round can fail, but the model never gets worse.
5. The orchestrator picks the next order and persists the round.

## Choosing work

Each region has a likeness weight: how much it defines the creature. The next region is the one with the largest `weight x max(0, 8 - score) x fixability`, where fixability (0.3 to 1) is the critic's estimate that one round of construction can move it. Limits keep the loop out of rabbit holes:

- **Pass bar:** a region at 8 or above is left alone unless it regresses.
- **Cooldown:** no region is worked more than two rounds in a row; the next round goes elsewhere.
- **Stall rule:** three kept-or-failed rounds on a region without a net gain of at least 1 park it. A parked region needs a method change, not another attempt. The orchestrator reviews parked regions between batches and either writes a new method into the next order or records it for Nick.
- **Build budget:** one round allows at most four full component builds and one assembly. Larger changes are split across rounds.
- **Measure before proportion work:** a proportion claim is checked with the silhouette measurements before an order is written. Widths are fractions of figure height, never of a neighboring part that may itself be wrong.
- **Repeated identical top finding:** if the same finding tops a region for three rounds, it is a design decision. The orchestrator makes the decision deliberately and records it, or asks Nick if only he can make it.

## Scoring

Each region is scored 0 to 10 against its reference at the construction stage. Fine fur and texture are excluded; large and medium form, including broad coat masses, are in scope.

| Score | Meaning |
|---|---|
| 10 | Form indistinguishable from the reference at clay stage |
| 8 | Matches the reference; only nits a designer would not mention |
| 6 | Right family, but departures a viewer notices |
| 4 | Wrong in a way that changes the likeness |
| 2 | Broken, missing or placeholder |

Critic instructions include, verbatim: never inflate scores; report real numbers, failed rounds and what is still missing. A score may rise only with a visible change the critic can point to.

## Milestones and check-ins

- **Batch:** four rounds in one background workflow. Between batches the orchestrator persists state, reviews parked regions, updates the private review artifact and commits. Nick is not contacted.
- **Approval gate:** every region scores at least 7, the weighted mean is at least 8, and no region defining identity (face, ears, tails) is below 8. A fresh, cold Opus reviewer with no prior scores then confirms the model is ready to show, and the measurements are within 10 percent. Only then does Nick receive one exact version, linked on the review artifact.
- **Hard stop:** after four batches (16 rounds) without reaching the gate, Nick receives an honest report of scores, parked regions and what blocks them.
- **Taste decisions** that only Nick can make are collected and brought to the next check-in. They are not a reason to stop other regions.

## Cost

A round is one Opus critique of about 16 images plus one Sonnet build session with several Blender runs, roughly 1 to 2 million tokens, mostly cache reads. A batch is about 4 to 8 million; the 16-round cap bounds a full run near 30 million. The orchestrator reports real usage at each check-in.

## Files

- `art/species-construction/loop/loop_tools.py`: assemble, render, check, packet, measure.
- `art/species-construction/loop/loop_workflow.js`: the batch workflow script. `build_loop_page.py` replays its journals into the progress page after every round, starting from `<species>/loop/status-start.json`.
- `<species>/loop/critic-brief.md`, `builder-brief.md`: the standing instructions each agent reads.
- `<species>/loop/status.json`: regions, weights, current scores, attempt counters, parked regions, baseline, round history. It is data, so every batch resumes at the weakest region.
- `<species>/loop/cameras/`: the closeup camera sets every packet uses.
- `untracked/species-construction/<species>/loop/packets/<assembly>/`: the images, measurements, critique and build record for each candidate.

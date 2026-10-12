# Creature Studio: what carries from one creature to the next

Status: revision 2, 2026-10-12, after independent audits by Codex and Fable. Awaiting Nick's sign-off. Amends [creature-studio.md](creature-studio.md) section 7 ("Part library") and step S6, and replaces the "toolbox catalog" idea floated in chat the same day. Discussion is not approval.

## Context

Nick will take dozens of creatures through Creature Studio. He wants each creature to leave the next one better equipped, so fewer and cheaper new tools are needed over time. He is equally concerned about the opposite failure. Nick, 2026-10-12: "I just want to be careful that we're not getting ourselves in a position where I get frustrated iterating over something with you, trying to get you to fix it, and you spend a bunch of tokens and a bunch of time not fixing it because you're stuck using an existing tool that's just not working for you." He also does not want creatures converging on the same tube, foot or head, and accepts building fresh each time if that is the only way to get quality.

Evidence from Akinza (branch `akinza/construction-loop`):

- 155 one-off step scripts in `art/species-construction/`, each bound to Akinza's meshes, object names and earlier steps. None runs on another creature as written.
- What worked were procedures with their numbers outside the code: v5eye3 (a regular ellipsoid eyeball, a plane-cut opening, a lid roll, a socket solved around the ball; every number in `specs/head-eye-v5eye3.json`), the analytic ear shells (outline shell, rolled rim, cup), and the fitted smooth head mass (`furbase-notes.md`).
- What failed was of two kinds: hidden constraints and unexamined causes (the eye-socket episode, `REFINEMENT.md`), and speculative new tools (rounds 21 to 28: 58 percent of 420M tokens on toolsmiths, six tools, none kept; `LOOP-audit-2026-10-07.md`). The failures were not mainly agents clinging to old code; they were agents working from a wrong premise, old or new.

## The answer to Nick's question

Neither pure option. Do not keep reusable parts (an eye, a paw, a head): they carry one creature's proportions and premises into the next. Do keep reusable procedures (how to build an eyeball in a socket, a rimmed shell with a cup, a fitted smooth mass) once one has produced an approved result with every number outside the code. The numbers, proportions and specs of each creature are always its own. Shape work starts fresh by default; the saving comes from shared machinery, promoted procedures and short, current lessons.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Execution machinery (studio, review screen, cameras, comparisons, cost, backup, recipe engine) is shared and changes freely. | 95% | `packages/studio`, `art/studio/` |
| 2 | Appearance-affecting processing (assembly remesh, renderer settings, fur and surface pipeline) is shared but pinned per build, upgraded deliberately, and checked against a small regression set so a change that alters the next creature is visible. | 85%: the remesh turned clean lids into ticks on Akinza | Codex 8; `furbase-notes.md` v5eye4 |
| 3 | Blocks are procedures with every number outside the code. The starting set is generic (`mass`, `sweep`, `shell`); a creature's procedure is promoted to a block only at its retro, only after it produced a build Nick approved, and only by the orchestrator. Builders never add or extend blocks mid-build. | 80%: promotion may lag real need; the alternative (speculative tools) burned 58% of a 420M run | Fable 1, 6; Codex 2 |
| 4 | Specs (the numbers: radii, positions, proportions) are owned by each creature and never copied from another creature. A creature's blockout is measured from its own silhouette and references. | 90%: copying a spec copies proportions outright | Fable 3 |
| 5 | A reference to earlier work is a note, a spec and an approved image, plus the block name if the procedure was promoted. Never a path to another creature's script. Scratch is the default when an earlier idiom does not run here. | 85% | Fable 2, Codex 4 |
| 6 | Where a build started from (`startedFrom`: a block, a reference, or scratch) is provenance recorded when the build is planned, not a hold. | 90%: a starting point is not a constraint; listing it as one manufactures the thing we are removing | Fable 2, Codex 3 |
| 7 | A stalled defect's audit must name the specific limiting assumption, with evidence, and the next build must say how it removes it. A renamed method or one more parameter change does not qualify. | 85% | Codex 3, 7; loop audit method reviews |
| 8 | Each part has an adaptation budget covering previews, discarded attempts and porting. Previews count as attempts on the defects they target. | 80% | Codex 7 |
| 9 | Lessons have no topic taxonomy up front. Each lesson names what it governs (a block, a procedure, a part kind or a process rule), when it applies, its status and its evidence. A brief carries at most five, chosen by the orchestrator; a lesson no build cites across two creatures is archived at the retro. | 80%: lessons rot when every lesson goes into every brief | Fable 4, Codex 5 |
| 10 | Whether reuse helps is measured per part, not per creature: attempts and tokens to Nick's approval, split by `startedFrom`, plus a same-part sheet across creatures so Nick can see sameness. | 80% | Fable 5, Codex 6 |
| 11 | Creature two gets lessons and the generic blocks only, unless Nick allows Akinza's proven procedures (eye in socket, rimmed shell with cup, fitted mass) to be promoted. Promotion reads Akinza's scripts and specs; it never touches its model or records. | open: Nick's call | Fable 7; Nick 2026-10-12 on Akinza |

## The layers

| Layer | What it is | Shared? | How it changes |
|---|---|---|---|
| Execution machinery | Everything that records, runs, measures and reviews | Yes | Freely, with tests |
| Appearance processing | Remesh, renderer, fur and surface pipeline | Yes, pinned per build | Deliberate upgrades, checked against a small regression set of approved builds (render and compare; differences shown, not hidden) |
| Blocks | Procedures with every number in a spec: `mass`, `sweep`, `shell` now; promoted procedures later | Yes | Changed freely (approved builds are pinned to the code that made them); promoted only at retros |
| Creature specs and local code | The numbers and proportions, and any creature-local procedure or alternative representation | No, each creature owns its own | Written for this creature; never copied from another |

A creature may always use a different representation from the blocks (a sculpt-like field edit, a hand-authored mesh) when its anatomy calls for it. Blocks are offered, never required.

## References and provenance

- The orchestrator picks references by hand while there are few creatures; an automatic "similar parts" list waits until there are enough to make it worth building.
- A reference in a brief is: the earlier build's note paragraph (what was done and why), its spec, its approved image, Nick's verdict, and the block name if promoted. No script paths from other creatures.
- Brief wording: "These are references for technique only. Proportions come from this creature's references and silhouette. Start from scratch if the technique does not fit."
- `startedFrom` is set when the build is planned. The engine refuses a recipe that pins a file under another creature's folder.

## Guards against getting stuck

- Adaptation budget per part (previews, discarded work, porting all count). When it runs out, the next build needs a stall audit even if fewer than two full builds were made.
- Stall audits name the limiting assumption with evidence (the physical cause, a representation limit, a target conflict, a hidden constraint, or a copied premise) and the next build states how it removes it. This replaces the current engine rule that accepts any differently named method.
- Builders never receive an instruction to use a particular block or reference.
- Required previews for any new method stay, and count toward the budget.

## Lessons

- One file per lesson under `art/studio/lessons/`: statement, governs (block, procedure, part kind or process rule), applies when, status (current, superseded with reason, archived), evidence (build alias and image), creature, date.
- A short current summary per governed item is kept separate from the history of lessons behind it.
- Briefs carry at most five lessons, chosen by the orchestrator. Builders cite which lessons shaped their method; uncited lessons across two creatures are archived at the retro.
- Process lessons that became engine rules (declared holds, Blocked by, stall audits) are not repeated as lessons.
- Seeding: the Akinza documents (`REFINEMENT.md`, `LESSONS.md`, `furbase-notes.md`, the surface lessons) are read and condensed into current lessons. This reads documents only.

## Measuring

- Per part: attempts and tokens to Nick's approval, elapsed time, discarded adaptation cost, and defects reopened, each split by `startedFrom`.
- A same-part sheet at the Coherence stage: the same part kind across all finished creatures at one close camera, for Nick to judge sameness by eye.
- A retro at the end of each creature's Phase 1: which procedures to promote, which lessons to archive, and the per-part numbers. No dashboard until a decision depends on one.

## Changes to the parent design

- Section 7 ("Part library") is replaced by this document's layers.
- Step S6 becomes "promote proven procedures to blocks at each retro" instead of "grow the part library".
- The engine's stall-audit rule for `change-method` is tightened (decision 7), and previews count toward the part's attempts (decision 8).

## Build cost and dependencies

Depends on the brief generator, which is not built yet (`studio brief` is in the parent design but not in `packages/studio`). With it: lessons store and brief inclusion with the five-lesson cap, `startedFrom` at plan time, the cross-creature pin refusal, the tightened audit rule, adaptation budget counting, and the per-part measures. Roughly 4 to 6 hours and 4 to 6M tokens including the brief generator; seeding lessons from the Akinza documents about 1 hour. The regression set for appearance processing comes with the first upgrade that needs it.

## Risks

- Promotion may lag: a useful procedure stays creature-local until a retro. Accepted; speculative generalization was the larger waste.
- Blocks are not visually neutral (round sweep ends, a shell's bend model). Mitigation: blocks are optional, local representations are allowed, and the same-part sheet shows sameness.
- Lessons still rot if retros are skipped. Mitigation: the retro is part of the readiness stage, so Phase 1 cannot close without it.

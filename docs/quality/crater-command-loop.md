# Crater Command quality loop

Status: active quality charter, 2026-09-17. This is not a feature-completion checklist.
The player experience, not the number of implemented mechanics, is the outcome.

## North star and boundaries

A new player should understand what their next decision does, feel that aiming and
weapon choice matter, enjoy watching the shot resolve, and want another match after
winning or losing. This must hold on a phone as well as a desktop. The rigs and arsenal
remain the Arcade's in-world simulation; creature powers and account rewards are not
changed as part of this loop.

An iteration may change mechanics, camera, UI, art, animation, sound, bot behavior, or
onboarding together when they solve the same player problem. It should not add a
feature merely because another artillery game has it. Preserve deterministic rules,
server replay validation, the Arcade reward cap, and the original visual identity.

## One complete iteration

1. **Establish the baseline.** Start from the latest main branch. Read the last two
   quality records, run the deterministic artillery evaluator, and replay the relevant
   live and local scenarios. Record the commit, seed, planet, map size, mode, viewport,
   and weapon for every observation. Treat old checkmarks as implementation history,
   not a quality verdict.
2. **Play and inspect.** Play at least one entire duel at desktop size and one at a
   390×844 phone viewport. Rotate planet, map size, and difficulty across runs. Use
   targeted scenarios for every weapon, a blocked drive, a jet escape, a terrain
   collapse, a cover placement, a miss, and a direct hit over successive runs. Inspect
   setup, aiming, apex, impact, handoff, and result frames, plus console errors and
   layout overflow. A screenshot proves a frame; it does not prove a motion is smooth,
   so sample transitions or use a short recording when motion is at issue.
3. **Diagnose the bottleneck.** Describe where the player's intent and the game's
   response diverge. Rank observations by severity, how often players encounter them,
   and confidence from evidence. Select the highest-impact *experience problem* rather
   than the easiest isolated bug. A pass normally contains several connected changes.
4. **State a falsifiable hypothesis.** Before editing, write what should feel or work
   differently, the scenarios that would demonstrate it, and what regression would
   make the proposed solution unacceptable. Compare plausible alternatives when the
   issue is design-sensitive, such as camera framing or weapon behavior.
5. **Implement, then replay.** Change code and tests together. Re-run deterministic
   simulations, relevant component tests, full workspace tests, typechecks, production
   build, and bundle budgets. Play the exact baseline scenarios again on both sizes;
   inspect unintended effects on other weapons and worlds. Keep the change only if it
   improves the target experience without causing a more serious regression.
6. **Release and verify.** Use a focused PR, wait for CI, deploy through the existing
   pipeline, and smoke-test the live route at desktop and phone sizes. Record the
   before/after evidence and any remaining uncertainty. If a release fails or a
   critical regression appears, repair or roll it back before beginning new work.
7. **Choose the next bottleneck.** Update the quality record with the newly observed
   problems, even if they were outside the original hypothesis. The next iteration
   starts from that evidence, not from a frozen feature list.

## Scorecard, not checkbox count

Score each dimension from **0–4** with a one-sentence observation and a reproducible
scenario: 0 broken, 1 frustrating, 2 functional but crude, 3 good, 4 excellent. Do not
average away a 0 or 1; the lowest important dimension is the next candidate.

| Dimension | What to look for |
| --- | --- |
| Agency and controls | Input follows intent; aim, weapon, and mobility choices are understandable and reversible only when the rules say so. |
| Combat decisions | Weapons, terrain, wind, movement, and cover create distinct useful choices rather than decorative variants. |
| Shot drama and causality | Launch, travel, impact, damage, and terrain change have deliberate pacing and visually explain each other. |
| Spatial readability | Players can follow both rigs, the trajectory, and the tactical terrain at every map size. |
| Bot fairness | Rookie teaches, Standard challenges without feeling prescient, Expert punishes mistakes; outcomes are not dominated by unexplained randomness. |
| Mobile quality | The battlefield remains legible, controls are reachable, and opening a panel does not hide the decision it supports. |
| Cohesion and replay appeal | Art, sound, planet, weapons, and result screen feel like one game worth replaying, not independent UI widgets. |

Automated numbers are diagnostics, not the score itself. Run
`node --experimental-strip-types packages/rules/src/arcade/devtools/evaluateArtillery.ts`
from the repository root to compare weapon solution spaces and seeded bot outcomes.
Watch for sudden shifts in hit opportunities, weapon uniqueness, match length, and
difficulty order. Do not infer human win rate from an algorithmic player. Add targeted
seeded scenarios and regression tests when an iteration exposes a new failure mode.
Do not introduce production player telemetry without a separate privacy/product review;
local playtests and deterministic simulations are the initial evidence sources.

## Initial baseline and open questions

Evaluator on 2026-09-17, using 100 deterministic Stonera fields and a strong synthetic
player: damaging solutions occupy 3.73% of the sampled Comet aim grid, 5.31% Razor,
2.86% Drill, 7.97% Starfall, 1.60% Rampart, and 1.63% Sunspike. Synthetic-player win
rates were 99% versus Rookie, 96% versus Standard, and 71% versus Expert; median match
length was 5–6 shots. These are reproducible balance baselines, **not** evidence that
human players win at those rates or that short matches feel right.

The last desktop/phone play pass verified the larger mobile field, contextual command
tray, transient shot verdicts, and Rampart guard. It did not establish that a complete
match is compelling or that every planet and weapon is equally clear. First questions
for the next play pass:

1. Does the mobile rig-focused camera preserve enough tactical context to aim and
   choose movement, especially on Wide maps? Is the overview legible at a glance?
2. Do novice players discover a useful first hit, or does the large ballistic solution
   space make early volleys feel arbitrary? Test without turning aim into an automatic
   target preview.
3. Are terrain destruction, Rampart, drive, and jet meaningful over a full duel, or
   do optimal turns mostly ignore them?
4. Does Standard produce a fair back-and-forth for a human, rather than the synthetic
   evaluator's near-perfect player? Inspect misses and corrections, not only wins.
5. Does the post-match screen provide a compelling reason to try a different world,
   weapon strategy, or difficulty?

## Record format for every run

Append a short dated entry below. Include: build/commit; scenarios played; 0–4 scores
with the lowest dimension emphasized; evidence or reproduction steps; chosen problem;
hypothesis and alternatives; changes made; before/after comparison; automated checks;
live verification; and the next unresolved problem. A run that only audits should say
so plainly. A run should not claim completion just because tests pass.

### 2026-09-17 — charter and baseline

- Baseline: evaluator output above; prior desktop and phone battle pass. No complete
  human-style match or systematic cross-planet scorecard yet.
- Decision: establish the repeatable loop before further isolated polish changes.
- Next run: play a full Wide-map phone duel and a desktop duel on a different planet,
  score the dimensions, then implement the highest-impact connected improvement set.

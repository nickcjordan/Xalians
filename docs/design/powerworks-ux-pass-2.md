# Powerworks UX pass 2: the whole screen, the whole run

## Context

Nick, 2026-09-29: a UX pass comes before any enemy-intent layer. The flow pass (PR #753, [powerworks-turn-screen.md](powerworks-turn-screen.md) "UX pass") answered four questions about turn flow: whose turn, is it mine, what just happened, what happens next. It judged turn cycles only. This pass judges everything a first-time player meets, from the first screen to the end of a run, and the visual quality of each part. It runs on the build that carries the numbers pass ([powerworks-pillars.md](powerworks-pillars.md) "Numbers pass"), since that pass changes every number on the screen.

Nick does not list faults, so the pass finds them itself: cold readers and an independent critic on captured sequences, not the builder's own eye.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Scope is the whole journey, not only the turn cycle: arrival, first look at the stage, reading a companion's options, choosing, watching enemy turns, encounter end and the next chamber, camp and revive, defeat, victory, retreat, playback tools, the record panel, phone landscape. | 80%, Nick's earlier rejection named intuitiveness broadly ("Not much on here is intuitive") | #753 review; memory "Game UX: judge the flow" |
| 2 | Visual quality is judged alongside comprehension: hierarchy, density, one vocabulary for one meaning, the art's presence, motion. | 75% | Nick on #750: "without actually doing any visual pass" |
| 3 | Judges are cold Opus readers (no guide) and a separate Opus critic; the builder never grades. Readers answer against the engine's truth; the critic scores each journey stage 1 to 10. | 90% | memories "Blind readers need Opus", "Adversarial critic loop" |
| 4 | Bar to ship: every journey stage 8 or above from a fresh critic, and cold readers at 90% or better on the fixed question set. | 70%, the flow pass bar, extended | #753 record |
| 5 | No new mechanics in this pass: enemy intents and other parked layers wait until it ships. | 95% | Nick, 2026-09-29 |

## Method

1. **Capture** the journey on the numbers-pass build: frame sequences (the `scripts/powerworks-turns` harness) at 1366 x 768 and 1920 x 1080, and still frames at 844 x 390, for each stage. The scenario devtool gains the states it lacks today (start, camp with a fallen companion, defeat, victory).
2. **Cold readers**: three Opus readers, no guide, numbered frames with neutral names. Each narrates each sequence, says what they would do next and why, and answers a fixed set: what the goal is, which side is theirs, which move does the most to which enemy, what each mark means, what happens after this turn, what the run's state is (chamber, health that carries over, revives left).
3. **Critic**: a separate Opus critic scores each stage on clarity, hierarchy, feedback, affordance, consistency and polish, names the three weakest things per stage, and compares with the reference battlers from the research pass.
4. **Plan**: findings become a storyboard of changes in this doc, stage by stage, before any code.
5. **Build and loop**: Sonnet builders implement; each round is recaptured and judged by fresh readers and a fresh critic until the bar holds.
6. **Nick plays** the deployed build.

## Findings

(Filled in after step 3.)

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

### 2026-09-17 — range comprehension and muzzle causality

- Starting build: `6412b17` on `origin/main`. The first random practice seeds were not
  exposed by the UI, so those human-style runs are not exactly replayable. This pass
  adds a non-visual `data-artillery-seed` to the board for future records.
- Played: Stonera/Wide/Rookie at 390×844 (one interrupted baseline, then complete
  five-shot 100–0 and seven-shot 59–0 wins); Magmuth/Standard/
  Standard bot at 1280×800 (complete 13-shot 67–0 win, then a complete 17-shot
  15–0 win). Used Comet, Drill, Starfall, Sunspike and Razor, and observed bot
  Rampart cover, a drive reposition, misses, direct hits, terrain collapse and a
  target sheltered in a deep crater. The final phone match after muzzle alignment
  used seed `artillery:591cb5ce-2da8-403f-a152-9f05db184220`; earlier random
  practice seeds were not captured, so this is not a controlled A/B comparison.
- Baseline diagnosis: on Wide phone maps the target was off-screen and the tiny
  overview did not convey the shot distance. The first interrupted play reached
  volley 7 with both rigs at 100 hull. On desktop, Fire and much of the rack were
  below the 800px fold; Magmuth's default 70-power shot landed about 120 units
  short. The first complete desktop duel needed 13 shots and finished at 43%
  accuracy. A shot from a crater later appeared to clear the lip visually but
  collided beside the rig because physics spawned below the rendered muzzle.
- Hypothesis: a rough free-flight rangefinder plus an always-visible tactical panorama
  would let players make an informed first estimate while preserving uncertainty
  from terrain, wind, and weapon spread. Keeping the desktop Fire control and rack
  in the first viewport would remove unnecessary scrolling. Aligning the physical
  origin with the muzzle would make close ridge collisions visually truthful.
  Rejected an exact landing preview because it would remove the ranging game.
- Changes: added planet/weapon/wind-aware nominal reach (not terrain prediction),
  mobile target and reach readings with a tactical panorama and transient
  impact markers, approximate miss distance, a desktop reach readout in the Power
  meter, a first-row Fire control and compact rack, shorter phone setup, capped
  finishing damage feedback, a next-sortie prompt, and shared muzzle
  geometry between rules and rendering. Nearby blocked shots now say so explicitly.
- Observed after: on the first complete Wide phone duel, a ~20-unit long miss led
  to a three-power correction and a direct hit; a subsequent rival drive changed
  the target distance and the duel ended in five shots. A later phone first shot
  used the rangefinder and dealt 41 damage, then Rampart absorbed 24 from the
  next hit. In a desktop replay the rangefinder helped a 90-power Magmuth opening
  shot hit directly, but a crater demanded a steeper arc to finish; the last shot
  displayed 14 hull lost against 14 remaining rather than uncapped overkill.
  Different random seeds and choices mean these are play observations, not a
  measured win-rate improvement.
- Final phone regression: on the recorded Wide seed, a 52°/77-power Comet cleared
  the launch terrain and damaged the rival for 35; later shots accounted for
  wind, a rival drive, and a Rampart guard. The match ended in seven total shots,
  59 hull remaining, 75% accuracy, with no horizontal overflow at 390×844
  (`scrollWidth` 375). The finishing feedback reported exactly 28 remaining hull.
- Scorecard after this pass: agency/controls **3/4** (aim and Fire are reachable,
  but mobility still needs a full tactical test); combat decisions **2/4** (terrain,
  cover, weapon spread and wind matter, though Standard repeatedly chooses cover);
  shot causality **3/4** (miss distance, capped damage and muzzle origin agree with
  action; animation continuity was not re-audited); spatial readability **3/4**
  (mobile focus + panorama work, but tiny markers remain); bot fairness **2/4**
  (the two Standard matches were very different); mobile quality **3/4** (field and
  controls usable at 390×844); cohesion/replay **2/4** (next-sortie guidance helps,
  but the cockpit and post-match payoff still feel restrained).
- Deterministic evaluator before/after muzzle alignment: Comet damaging solutions
  3.73%→4.10%, Razor 5.31%→5.79%, Drill 2.86%→3.18%, Starfall 7.97%→8.86%,
  Rampart 1.60%→1.74%, Sunspike 1.63%→1.75%. Synthetic-player wins changed from
  99/96/71% to 99/100/85% versus Rookie/Standard/Expert. This is not a human
  win rate; watch Expert challenge after deployment.
- Verification: the full workspace suite passed (1,723 tests), web and rules
  typechecks passed, and the production build passed its existing artillery
  route budget after consolidating the always-visible radar and removing
  redundant turn-by-turn coaching. Live deployment verification is recorded
  separately after the release completes.
- Next bottleneck: verify drive/jet escape from a crater and make terrain recovery
  a distinct tactical choice. Also examine Standard bot's predictable immediate
  Rampart response and whether limited weapons feel worth their ammo when a basic
  Comet can do most jobs. Capture exact seeds for each future live playtest.

### 2026-09-17: mobility and phone setup follow-through

- Starting build: deployed `d96c2db`. A 390x844 production check confirmed the
  new range display and a real Comet shot with an approximately 30-unit shortfall
  verdict; the bot then took its turn. The check also exposed overlapping
  Rookie/Standard/Expert labels in the phone setup.
- Mobility audit: the rules already let a jet cross a ridge that stops a drive,
  but the held-jet visual used a sine curve that returned the rig to ground at
  full fuel before the player released the button. That undercut the intended
  high trajectory, especially when using the jet to leave a crater.
- Change: sustained jet thrust now continues rising, bounded above the field,
  until release initiates the existing descent. The flight path is independent
  of the terrain under the rig. The difficulty control uses phone-specific
  spacing and type size so all three choices fit without overlap.
- Validation: added a realistic bowl-shaped crater scenario proving a 25-fuel
  jet burst crosses the lip while a 25-fuel drive does not. A flight-shape test
  now checks that the rig remains airborne even when held thrust exhausts fuel.
  Inspected the revised setup and mobility panel at 390x844 in the local browser.
- Remaining limitation: this validates the rule and visual curve, but not the
  feel of a long physical press on a phone. Test that directly on hardware, then
  address any discontinuity between thrust and descent. Bot cover timing and
  limited-weapon value remain the next combat-decision bottlenecks.

### 2026-09-17: terrain recovery, opponent tactics, weapon roles, and match pacing

- Starting build: `6c1f770` on `origin/main`. Baseline direct play included a
  six-shot Magmuth/Wide Practice Range run and an interrupted Endessa/Wide/
  Standard bot duel. The Practice Range showed Comet at 45/90 doing 41 damage,
  Razor at the same aim doing 24, Drill near the indicated range barely hurting
  the rival, Starfall missing, Rampart granting 24 guard, and Sunspike finishing.
  Endessa demonstrated how free-air distance could match the rival while an
  intervening ridge still shielded the rig.
- Diagnosis and hypothesis: drive spent a full thrust even if stopped by a
  ridge; the jet covered more open ground than driving; Drill's buried center
  weakened its own blast; Starfall and Razor had too few useful near-hit aim
  combinations; the bot's cover response was tied to hull rather than threat;
  and close Rampart placement could trap a low firing arc. Giving each weapon
  a clearer tactical job, making movement cost match distance, and making
  bot defense depend on actual danger should create more consequential turns.
  We kept the artillery physics, limited stock, and terrain obstruction instead
  of adding an exact landing preview.
- Changes: driving now covers more clear ground per fuel, while the jet trades
  efficiency for vaulting; blocked or edge-limited movement consumes only
  proportional fuel. Drill shock reaches the rig above a buried impact, Razor
  and Starfall have wider useful coverage, and Sunspike pierces half of guard.
  Starfall's combined blast plus collapse is capped so wide coverage is not
  also the biggest opening spike. Hull damage is paced separately from full
  terrain deformation so cover and recovery have time to matter. Bot Rampart
  requires a credible recent threat and can place cover at several distances;
  bot movement avoids blocked retreats and does not discard active guard.
  A miss no longer consumes guard. The guard display now animates to zero on a
  hit, including a Sunspike hit that bypasses some protection.
- Additional experience changes from play: the rangefinder now models muzzle
  and rival elevation but reports coarse ten-unit estimates, so it helps with
  the scale of a shot without revealing an exact landing. Mobile Fire shows
  the armed weapon's role. The phone field is 50dvh, bringing Fire and both aim
  controls into the first 390x844 viewport; the aiming hint sits below the
  tactical range readout. Rampart text and blocked-muzzle feedback explain
  that a high arc can clear a close friendly wall without spending fuel or
  losing guard. The artillery route budget rose from 98/33 KB to 101/34 KB
  raw/gzip for the additional game logic and cockpit copy.
- Complete local phone play: Stonera/Wide/Rookie, 390x844, seed
  `artillery:9deb8df0-351a-41d7-b9ed-657def5e4628`. Four player shots and
  seven total shots ended 71-0, grade S, 75% accuracy, three weapon types.
  The opening Comet dealt 57, Razor missed despite a broad nominal envelope,
  the rival forged 24 guard, Sunspike pierced 12 and dealt 42, and a final
  Comet dealt the remaining hull. This caught the guard display and miss
  persistence defects; the fixes were subsequently replayed in rules tests.
- Complete local desktop play: Krystos/Standard/Standard, seed
  `artillery:b140544c-8fe8-4bd8-8483-848f13259574`. The first Comet dealt
  43; the rival Starfall dealt 69 before the combined-damage cap. At 31 hull,
  Rampart forged 24 guard. The bot's Sunspike missed, and cover correctly
  persisted. A low Comet struck our nearby wall; raising the barrel to 67
  degrees cleared it and dealt 40. The rival built its own Rampart; a later
  Drill broke that defense and finished the match at 31-0 after 11 total
  shots. The Starfall cap and revised wall guidance were applied after this
  match, so its 69-point hit is regression evidence, not a post-fix result.
- Deterministic before/after on 100 default fields: damaging aim-grid cells
  changed from Comet 4.10%, Razor 5.79%, Drill 3.18%, Starfall 8.86%, Rampart
  1.74%, and Sunspike 1.75% to 4.10%, 7.53%, 4.73%, 14.10%, 1.74%, and 1.75%.
  This measures solution coverage, not human accuracy. Twelve seeded fields
  in each of 12 planet/map combinations all retained at least one damaging
  Comet solution. A deliberately coarse, no-trajectory-search player proxy
  finished 28/30 Rookie, 26/30 Standard, and 10/30 Expert games after the
  final changes, averaging 5.0, 5.2, and 3.8 player shots respectively.
  Those are algorithmic probes, not human win rates; the lower Expert mean
  includes early defeats. A fully optimized synthetic player still wins
  99/99/66 percent, which shows how much precision changes the challenge.
- Scorecard after local replay: agency/controls **3/4** (movement cost and
  mobile aim are clearer, but a physical long press remains untested); combat
  decisions **3/4** (wall, guard, pierce, high arc, and movement have real
  tradeoffs); shot causality **3/4** (cover and damage now agree, but complex
  multi-impact art should still be inspected on hardware); spatial readability
  **3/4** (range and controls fit a phone); bot fairness **2/4** (the final
  Starfall cap needs a post-release human rematch); mobile quality **3/4**;
  cohesion/replay **2/4** (the cockpit and result still feel more utilitarian
  than the artillery spectacle). No horizontal overflow was observed in the
  390x844 local viewport.
- Verification before release: full workspace suite passed (1,733 tests),
  web and rules typechecks passed, the production build and revised artillery
  bundle budget passed, and `git diff --check` found no whitespace errors.
  Live smoke verification is recorded after deployment. Next bottleneck: watch the final
  Standard bot pacing on production, then improve the tactile cockpit and
  post-match reason to replay without adding cosmetic-only features.

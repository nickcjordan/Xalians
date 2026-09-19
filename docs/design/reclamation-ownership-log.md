# Reclamation: the ownership log

Status: the running state of the game under ownership (brief: `reclamation-ownership-brief.md`). This file is the resume point. Any reset reads this first and continues at the weakest thing named below, never from scratch. Each pass appends its own section; the standing state at the top is rewritten in place.

## Standing state (after pass 21, 2026-09-19)

### Gauges, proctor mirror

Pass 6 changed no rule. It re-read two gauges with enough statistical power to say what they mean, and both turned out to be measurement artifacts rather than regressions. Readings below are the shipped settings; pooled rows are five seeds at 1000 matches each, which is the batch size a difference of a few points actually needs.

| Gauge | Band | Reading | Verdict |
|---|---|---|---|
| Resolution changes the leader at contested worlds | 25 to 40 | 26.1 / 26.9 / 24.5 (seeds 7, 13, 21, after pass 9) | met, seed 21 marginally under |
| Downs per match | 3 to 5 | 4.85 / 4.64 / 4.80 (after pass 9) | met |
| Contested worlds that are one creature against one | lower is better | 56.2% (was 62.7%) | improved, pass 9 |
| Naive margin (pass-early under the mirror) | 8 or more points | 13.1 / 13.1 / 14.5 (was 21.5 / 19.4 / 17.8) | met, **narrowing; the constraint on the send budget** |
| **Affordance: comprehension by prediction** | beat deploy-totals-only | **12 of 12 (100%)**, 3 of 3 on flipped worlds (pass 11, with the resolution trace; was 92% and 1 of 2) | **met with room** |
| Contested worlds where no attack lands at all | reported only | 9.5 / 11.1 / 10.4 percent | **judged pass 14: not a hole** |
| A side fielding only presences wins its world | reported only | 41.9% +/- 1.5 against 53.0% +/- 1.2 with an attacker | fielding no attacker is a worse bet, not a free win |
| **Rubric critic score** | rising per pass | **65 / 100** (pass 14; was 64 at pass 10) | fiction 9, first five minutes 8, feedback 8, glanceability 7, craft 7; lowest: mobile 3 (on a bug that did not exist), reason to keep playing 5, numbers 6, style 6, pace 6 |
| **Comeback from a CONTESTED round 1** (trailing by one or two worlds) | 30 to 40 | **30.8 / 32.0 / 35.1**; pooled 29.1 +/- 1.4 | **met on three seeds** |
| Comeback from a SWEPT round 1 (trailing by three) | not safeguarded, by ruling | 7 to 12 percent; pooled 8.0 +/- 1.8 | working as ruled |
| Comeback, both populations averaged | (the old single gauge) | 25.9 / 27.1 / 30.7; pooled 25.2 +/- 1.2 | reported, superseded by the split |
| **Stake: staked world against the staker's unstaked worlds** | variance-neutral | **-0.6 +/- 3.0 points** (pooled, n=1619) | **variance-neutral, as designed** |
| Naive-policy regret (best naive against the mirror) | 8 or more points under | passEarly 25.5 against 50.0 | met with room |
| Option spread (near-best per decision) | 3 to 5 | 2.85, dominant 32.5% | just under |
| Every role inside 40 to 60 keeper win rate | 40 to 60 | shield 46.0, bolster 46.4, sweep 51.4, strike 52.3 | met (pass 7 census) |

**The lesson pass 6 paid for, and the rule that now applies to every gauge:** a gauge that compares two rates must be read against the interval of their difference, and a gauge that averages two populations must say which one it is about. The stake's trap flag compared two point estimates bare, so it fired on about half of all runs by construction, and the comeback gauge averaged a case the design protects with a case it deliberately abandons. Between them they cost three rules changes that measured nothing before the measurement was done properly. Before any future gauge is called a failure, pool it and put an interval on it.

### What the game reads of the record (pass 7 onward)

Since pass 7 the game reads schema 4 directly through **one adapter**, `packages/rules/src/expedition/recordReading.ts`. That file is the seam: every question the game asks of a record's capabilities is answered there and nowhere else, so when the platform-side redesign finishes, one file moves. `historicalCategory` is no longer called anywhere in the game.

What it reads, and where each effect kind lands (measured over the seed-7 pool, 400 records, 1384 actions):

| Effect kind | Actions | Table reading |
|---|---|---|
| harm | 771 | attack; an area footprint makes it a sweep |
| restrain | 171 | attack (no separate rule yet) |
| protect | 140 | shield |
| displace | 128 | attack (no separate rule yet) |
| transfer | 84 | attack (no separate rule yet) |
| suppress | 49 | attack (no separate rule yet) |
| restore | 41 | mend |
| enhance, reveal, status, remove | 0 today | **unsupported by name**; the act is dropped and the dossier says why |

- **`spatial.range` is read**: 46.8 percent of creatures have a best action reaching past contact (212 contact, 108 short, 79 medium). Nothing in the rules uses the distance yet; that is open item 1.
- **`spatial.area` decides strike against sweep**, so an act sweeps because the record gave it an area, not because its legacy key was one of three.
- **`delivery.mode` decides which attribute powers an attack** (contact is strength, everything else intelligence), which is pass 2's attribute jobs read from the record instead of inferred.
- **Unavailability is real**: a creature with no usable action cannot be sent and the dossier prints the reason. On current content **0 of 400 records are unfieldable and 0 actions are unsupported**, so the path costs nothing today and is the safety for the day a release produces an effect family this game has no rule for.
- **Passives are read and reported but carry no table rule.** 13 on 400 records, all `protect`.

### Open items, ranked (resume here)

1. **The status strip is the tallest block on a phone** at 250px, carrying six jobs (round, worlds, score, phase, turn, hint). Whether all six belong above the fold is open.
2. **Fire is a dead element and dromeus a dead species** in the draft. Read it pooled before treating it as a failure (pass 6's lesson), the way pass 16 read the attribute lanes.
3. **Three of the four borrowed effect kinds** (displace, transfer, suppress) still read as plain attacks. Pass 18 gave `restrain` a rule that earns its place; the other three have no separate expression at a sealed world, so each needs its own case before it gets one.
4. **The generator's attribute ranges are not published anywhere the game can read.** Pass 19 found a threshold sitting below the floor of the attribute it cuts, and the only way to find it was to sample pools. A band the game defines against a generated attribute should be checkable against that attribute's real range.
5. **No human has played a full Proving.** The notes and telemetry are built, verified, and empty.
6. **Hot-seat, the remaining three quarters.** Pass 20 landed the seat indirection; what is left is the hand-off screen and its state, the second squad's draft, and a Charter that names two people instead of a rival. Scoped below.

### Hot-seat: what pass 20 did and did not do

The seat the table is drawn for is now a value (`seatInPlay()`), not the constant `'A'` compiled into sixty-four readings. With no `hotSeat` prop it always returns `'A'`, so solo play is unchanged, and the hand-off can land without touching those call sites at the same time as everything else.

Pass 21 built the cover and the seat routing. **It is not yet playable end to end**, and the exact state is below so the next pass starts from evidence rather than re-deriving it.

**Works, checked by paint:** the cover is raised when the turn first changes seat, it names who should look, and while it is up **nothing about the position is in the document** - no bench, no worlds, no score. That was asserted and it holds.

**Does not work yet:** the cover is raised **once** and not again on later seat changes, so a Proving stalls partway. Four fixes were made on inference and none moved it; the fifth (`you={YOU}` handed to the bench, so seat B's turn drew seat A's roster and B had no creature to arm and no control to press) was the real one and was found by instrumenting the table's state rather than reading the code. The remaining fault is in when `raiseHandoffIfDue` is called, not in what it does.

Still to build, in the order they should go:

1. **Re-raising the cover** on every seat change, not just the first. The diagnosis instrument for this is `.probe-stuck.mjs`'s shape: print phase, turn, cover, and the count of live controls each loop. Reading the lifecycle did not find the last bug; printing the state did.
2. **The second squad's draft.** The draft screen assumes one human keeper, so seat B currently plays a squad drafted for seat A.
3. **The Charter naming two people** rather than a rival from the ladder (`buildMatchReport` is still called with `YOU`).

The hiding constraint that shapes all of this: **16.8 percent of sends arrive hidden, and removing hiding moves the flip gauge +2.46 +/- 0.98, beyond noise.** Hot-seat cannot simply reveal everything, or it would validate a different game from the one being shipped.

### Closed by measurement (do not reopen without new evidence)

- **"Bolster recovery is inert"** (pass 19). It is not, and the log was wrong for several passes. Ablated with intervals on the difference, pooled over five seeds at 500 matches: removing it moves the flip gauge **+2.25 +/- 0.98** and doubling it moves it **-1.24 +/- 0.96**, both beyond noise and monotone. It fires 1.28 times a match for a mean 3.17 hold. The earlier verdict compared point estimates, which is pass 6's exact error.
- **"The instinct lanes are inert"** (pass 19). Half true and the interesting half was false. Ablating the whole rule moves no match gauge, correctly - a down is a down whoever it lands on. But the DULL lane was empty: threshold 35 against a generator floor of 31 to 37 gave **five dull creatures in 609**. Moved to 50 the lane holds 21.6 percent of the pool and those creatures down **25.2 +/- 1.6** percent of what they land against conduct's 38.8, a thirteen-point penalty. See `DULL_INSTINCT`.

- **Flat flip pricing** (pass 17). `worthAt` returned a flat `flipValue` for any flip, so a lead of 0.1 hold scored the same as a lead of 30, and the bot bought the cheapest flip that cleared zero: **3105 hair-thin leads against 896 comfortable ones**. Fixed with `FLIP_SECURITY = 0.5`, which withholds half a flip's worth until it clears by `FLIP_SECURE_MARGIN`. Naive-policy margin 14.6 to 21.3 points, hair-thin leads down a fifth, and 1v1 down two points as a side effect. The remaining swift-move gap (2.0 points at gate 6) is partly irreducible: a move decided on the bot's own turn cannot know what the opponent sends next.

- **Intelligence and charisma reading negative within presences** (pass 16). The recorded -15.2 and -9.7 were small-sample artifacts. Pooled over **49,362 lane samples** on five seeds, charisma within presences reads **+0.2 +/- 2.0** and intelligence **-0.3 +/- 2.0**: both within noise. What pooling did find instead is real and was never in the item: **agility and reflex read -6.5 to -6.8 beyond noise**, because they are only speed while hold is the mean of vitality, resilience and endurance, and the generator spends a fixed budget. That led to the swift-move finding below.

- **Crowding worlds by narrowing the frame** (pass 15). `worldsPerFrame` 2 nearly halves the 1v1 share, 56 percent to 30, holding downs and flips in band on three seeds - the best crowding result measured - but it **fails the naive-policy bar**: pass-early sits 7.5 to 9.5 points under the mirror against a bar of eight, through it on seed 13. With two worlds a round, spreading evenly is the right answer, so deploy stops asking a question. A two-world round also ends level 51 percent of the time and swept 48, with nothing between, and the stake does not rescue it (0.10 stakes a match against 0.33 at width 3). A **wider** frame is worse on every axis. The full sweep is in the comment above `WORLDS_PER_FRAME`. 1v1 at 56 percent is therefore the accepted cost of a game whose deploy decisions matter, unless a later pass finds a per-world decision deeper than "how many do I send".

### Findings from the headless check (pass 5, recorded not fixed)

The check plays a whole Proving in both views at 1440 and 390 and all four configurations pass with zero page errors, zero console errors and no horizontal overflow. Three things it surfaced that are not failures but are worth a pass:

- **`?view=advanced` does not switch the view.** The masthead still lights SIMPLE when the URL asks for advanced, so the two views could only be told apart by clicking. The check drives both and they behave identically, which is itself the finding. Low cost, and it blocks per-view verification.
- ~~**On 390 the three worlds stack to full height above the bench**~~ **Fixed in pass 13**: an empty world panel went from 386px to 176px and the bench-to-world distance from 1576px to 948px, so with a creature lifted all three worlds sit within roughly one phone screen. Guarded by the check.
- **A dossier panel in the rail can intercept a press on a world**, which the check works around with a forced click. On a real screen that is a press that does nothing.


**PASS 18 CORRECTION.** The headless check had been opening `?view=simple` and `?view=advanced` since pass 5, and the page never read a `view` parameter: **both halves ran simple mode**. Half of every pass's verification was a duplicate, and the advanced table's own panels (the resolution log among them) were never exercised by it. The page now reads `?view=`, and the check asserts the mode actually took before it plays, so this cannot silently return.

### Verification run each pass

1. `npm test` at the root (1912 tests across the three workspaces).
2. `npm run typecheck -w packages/rules`.
3. The validation tool on seeds 7, 13 and 21.
4. `npm run build -w apps/web` (enforces the bundle budgets).
5. `npx vite preview --port 4173 --host 127.0.0.1` from `apps/web`, then `node apps/web/scripts/reclamation-proving.mjs` (added in pass 5; a whole Proving in both views at 1440 and 390, screenshots, overflow and console assertions).
6. Every third pass: the rubric critic (a fresh agent, screenshots only, `game-validation-principles.md` section 4) and the affordance gauge (`node apps/web/scripts/runNode.cjs packages/rules/src/expedition/devtools/predictionPositions.ts --count=12 --seed=7`, then a fresh reader predicts and `--score=` scores it). Log both numbers.

### Where the seam is

The single place the game's reading of a creature is decided:

- `packages/rules/src/expedition/creatureOnTable.ts` lines about 403, 409 and 544 are the only three calls to `historicalCategory`. Every role, act class and magnitude decision in the game flows through them. One adapter placed here is the one-place change the brief asks for, so that when the platform-side redesign finishes only this adapter moves.
- `packages/rules/src/expedition/expeditionInterpretation.ts` holds every tunable as a named constant; `expeditionRules.DEFAULT_RULES` holds every ablation flag.

## Pass log

### Pass 5 (2026-09-18): make the Clash matter

**Weakest thing:** resolution changed the leader at 13 percent of contested worlds (band 25 to 40) with downs per match at 1.4 to 1.5 (band 3 to 5). Four passes had named the lever as `magnitudeScale` and every sweep had failed, so this pass measured the cause first.

**What the measurement said.** The Clash was moving a world by a median of 2.6 hold against a median deploy gap of 4.6, so it could not reach the gap at two worlds in three; and it extended the deploy leader as often as it eroded it (624 to 614 on seed 7, mean signed swing +0.09), because both sides subtract from the one number that also decides the world. The observed rate was the arithmetic ceiling of the design.

**The hypothesis that was wrong.** Hold doing double duty (the claim and the health bar) looked like the fault, so `claimCounting: 'standing'` was built to separate them. It measured three times worse (flips 4.7 to 5.9 percent), because at 1.4 downs a match the quantum almost never fires. Kept as an ablation row with the reading written down, so it is not re-derived.

**What shipped.** The scale itself, re-swept against the bot that exists now. The sweep that declared the gauge unreachable predates pass 4's anticipating proctor, which spreads its sends instead of stacking and is what pushed downs to 1.4 in the first place; it was never re-run. `magnitudeScale` 1.1 to **3.0**, the only setting where both gauges are in band on three seeds.

**Result.** Flips 13.0/12.5/12.1 to **25.6/27.6/25.4**; downs 1.49/1.54/1.44 to **4.25/4.44/4.16**. Both bands met on three seeds for the first time since the base redesign. Naive regret, option spread and the four roles' keeper win rates all unchanged. The bolster role, inert under ablation since pass 4, now carries weight.

**What it cost, and the friction it exposed.** Comeback fell to 25.9 to 30.7 percent (band 30 to 40) and the stake turned from a good bet into a coin flip, because a deploy-time hold edge no longer predicts a world. The stake threshold was re-swept and left alone rather than moved on a reading that does not resolve. Both are open item 1 above. No gift was added to the trailing side.

**Also built:** `apps/web/scripts/reclamation-proving.mjs`, the headless Proving check the brief's verification step requires, which did not exist. It plays a whole Proving in both views at 1440 and 390 with screenshots and asserts no overflow and no console errors; all four configurations pass, and it surfaced the three findings recorded above.

**Verified:** 1785 tests green across three workspaces (two new, five re-pinned to the scale they test rather than weakened), typecheck clean, build inside its budgets, the validation report regenerated, and the headless Proving green in four configurations.

### Pass 6 (2026-09-18): the stake was never broken, the gauge was

**Weakest thing on the log:** the stake reading as a trap (staker 47.4 percent against 50.0 on its unstaked worlds) and comeback under its band at 25.9 to 30.7 percent.

**Three repairs, all measuring nothing.** Staking on any turn (`stakeTiming` 'any-turn') measured worse, trapping on three seeds instead of two: it turns the visible margin into most of the edge, so the bot stakes worlds it already leads (stakes 123 to 676, with 481 taken while ahead and held at 43.9 percent). Raising `STAKE_THRESHOLD_AHEAD` to 12, 18 and infinity lifted the staked and unstaked rates together and never closed the gap. Making the edge read the Clash (`STAKE_CLASH_WEIGHT`, adding `roleValueOf` to the stake edge) moved every seed inside its interval.

**Why none of it worked.** Pooled over five seeds at 1000 matches (n=1619 staked worlds), the staker holds its staked world 50.0 +/- 2.4 percent against 50.7 +/- 1.8 on its unstaked worlds: a difference of **-0.6 +/- 3.0 points, not significant.** The stake is variance-neutral, exactly as pass 3 measured it and exactly as a chosen risk should be. The 61.7 percent reading at the old magnitude scale was the outlier.

**The actual defect was in the tool**, in two places. The trap flag compared two point estimates with no interval, so it fired on whichever way the noise fell; at 600 matches the interval on the difference is +/- 8 to 10 points and the observed gaps were -2.6, +4.8 and -0.5. And the comeback gauge averaged two populations with opposite design intent: trailing by one or two worlds (a contest the game should let a handler back into) with trailing by three (a round swept 3-0, which by standing ruling is not safeguarded). Split, comeback from a contested round 1 is **30.8 / 32.0 / 35.1 percent, inside the band on three seeds**.

**Shipped:** the two gauge fixes, `SWEPT_ROUND_DEFICIT` as the split, and both failed levers kept at settings that change nothing with their measurements recorded so they are not rebuilt. No rule of the game moved.

**Verified:** 1826 tests green across three workspaces (one new behavioral test for `stakeTiming`, one extended for its validation), typecheck clean, build inside budgets, validation report regenerated, and the headless Proving green in all four configurations (both views at 1440 and 390, zero console errors, no overflow).

### Pass 7 (2026-09-18): the game reads the record as it is

**Weakest thing:** the game read every capability through `historicalCategory`, a projection onto sixteen legacy action keys that mis-read 431 of the pool's 1384 actions (31 percent) and discarded `spatial.range` entirely.

**Built:** `packages/rules/src/expedition/recordReading.ts`, the one seam. Primary effect says what an action does, `spatial.area` whether it lands on one recipient or many, `spatial.range` how far it reaches, `delivery` which attribute powers it, `targeting.relation` whom it may touch. All three `historicalCategory` call sites in `creatureOnTable.ts` are gone.

**The ruling implemented:** an effect kind this table has no rule for makes its action unusable BY NAME, and a creature with no usable action is not fieldable: `send` refuses it and the dossier prints the reason. Never a silent strike. On current content 0 of 400 records are unfieldable and 0 actions unsupported, so it costs nothing today and is the safety for tomorrow.

**What the table gained:** reach is visible for the first time (46.8 percent of creatures reach past contact), area is read honestly rather than through three legacy keys (sweeps 158, strikes 110, shields 71, bolsters 61), and the dossier prints each act's real footprint under the role.

**Measured:** a truthfulness change, not a tuning one, and the gauges hold. Downs 4.58 / 4.20 / 4.42, flips 27.6 / 24.8 / 25.2 percent, contested comeback 33.6 / 35.3 / 28.7 percent, every role inside the 40 to 60 band despite the sweep population rising from 1407 to 2199 dealt.

**Verified:** 1911 tests green across three workspaces (15 new, pinning the reading itself so a platform-side field change fails in one place), typecheck clean, build inside budgets, validation report regenerated, headless Proving green in all four configurations, and the dossier's new rows checked by paint (which caught one contradictory sentence, "reaches every creature here, upon itself", fixed to "from where it stands").

### Pass 8 (2026-09-18): a real bug, and two rules that did not earn their place

**Weakest thing:** the four borrowed effect kinds reading as plain attacks, and `spatial.range` read but unused.

**Shipped: a correctness fix.** Pass 7's "an act sweeps because the record gives it an area" was applied before the support filter, and 104 of the pool's protect actions carry an area (a barrier over everyone here). So **13 of 268 attacking creatures were throwing a shield as their attack.** Fixed, measured at 0 on three seeds, harm blows in the pool rising 197 to 210, regression test added.

**Built and measured, then shipped OFF:** pinning (a restraining attack takes its target's swing) and reach-first ordering. At 600 matches on three seeds every configuration sits inside every other's interval. Pinning fires 280 times per 600 matches but produces only 67 lost attacks, because 76 percent of pins land on a creature that has already swung; ordering pinners first lifted that to 92, still under a third. Only **12.4 percent of Provings contain a pin that takes a swing**. By the standing rule, that is cost in the rulebook without weight, so both are ablation rows with their measurements recorded rather than shipped rules.

**The finding that matters more than either rule:** the four effect kinds do not become interesting by getting a rule each. They become interesting when creatures MEET, and at **62 percent one creature against one** they mostly do not. That is now open item 1 and everything else about the Clash is downstream of it.

**Verified:** 1912 tests green (one new regression test for the area-shield bug), typecheck clean, build inside budgets, validation report regenerated, headless Proving green in all four configurations.

### Pass 9 (2026-09-18): the Clash's real ceiling was the send budget

**Weakest thing:** 62 percent of contested worlds were one creature against one, the wall passes 5, 7 and 8 all hit.

**The cause, measured:** a Proving offers nine worlds and the bot spent a mean of 9.31 sends, which is **1.04 sends per world**. Stacking anywhere meant abandoning a world outright. It was never that stacking is bad: a second creature takes a world from **49.0 to 74.7 percent**. The payoff was always there and the budget could not pay for it. No rule inside the Clash could have fixed this.

**Shipped:** `SENDABLE` 10 to 11 with `MAGNITUDE_SCALE` 3.0 to 2.7, as a pair (more meetings means more attacks landing). 1v1 falls **62.7 to 56.2 percent**; downs 4.64 to 4.85 and flips 24.5 to 26.9 percent, both bands held on three seeds; **comeback from a contested round 1 rises to 32.7 / 34.0 / 35.4 percent**. The bench reads the cap off state, so the table says "11 sends left" with eleven pips and no UI change was needed.

**Rejected with its numbers:** `sendable` 12 crowds far harder (1v1 44.5 percent) but cannot hold the downs band and the flip band together at any scale tried, because a crowded world makes any single exchange matter less to its total.

**The cost, which is now the binding constraint:** a bigger budget narrows the naive-policy margin. Pass-early sat 21.5 / 19.4 / 17.8 points under the mirror at 10 sends and sits 13.1 / 13.1 / 14.5 at 11. The eight-point bar still clears with room, but this, not the downs band, is what stops the budget rising further.

**Verified:** 1912 tests green, typecheck clean, build inside budgets, validation report regenerated, headless Proving green in all four configurations (now playing 11 sends), bench readout checked by paint.

### Pass 10 (2026-09-18): what two fresh readers said

**Weakest thing:** affordance and comprehension had never been measured, and five passes had gone into mechanics without the critic the brief asks for every third pass.

**The rubric critic scored 64 of 100** from screenshots alone. Its lowest lines were a reason to keep playing (4), mobile (5), numbers earning their place (5) and glanceability (6).

**Three of its findings were acted on, and one was a real bug.** The ghost preview does exist and is good (lifting a creature prints SEND HERE on every world with the hold it would have there, 9.3 / 9.3 / 6.9 on the seed-7 frame) but **the resting lead line that promises this was computed and never rendered**, because its condition required a creature to already be lifted. A player who had not yet lifted anything genuinely had nothing telling them the worlds would answer. Fixed. Also: the speed number on a bench card is now labeled on the card rather than only in a hover title, and the Proving notes fold away so the Charter ends on NEW PROVING instead of on a survey form.

**The affordance gauge was built and reads 92 percent.** `devtools/predictionPositions.ts` photographs contested worlds at the end of Deploy as the table shows them, keeps the answers separately, and scores a reader. A fresh agent with the table's numbers and a one-page rulebook predicted **11 of 12 rulings correctly**. Its first real run found a bug in the harness itself (positions sliced to the count, answers not, so the key described worlds nobody was asked about), now fixed.

**The finding that matters more than the score:** every miss was arithmetic ordering, never strategy. "I can see who should win; I cannot see whether a 6.66 clears a 6.5." Five resolution rules are exact in the engine and unstated in the rulebook, and one worked resolution trace would pin all five. That is open item 1.

**Verified:** 1912 tests green, typecheck clean, build inside budgets, headless Proving green in all four configurations, and all three UI fixes checked by paint (the speed label renders as "61 SPEED", the resting line renders its promise, the Charter ends on NEW PROVING).

### Pass 11 (2026-09-18): the resolution trace, and the affordance gauge at 100

**Weakest thing:** five resolution rules exact in the engine and stated nowhere, which was every miss the pass-10 predictor made.

**Written and pinned:** "How a Clash resolves, exactly" in the rulebook (the declared-power chain in order, the landing order, the hurt ratio, what a down costs, the Ruling, what menacing does and does not do, and a worked example), with `__tests__/resolutionOrder.test.ts` holding nine tests, one per sentence, so the prose fails a test rather than drifting.

**Result: the affordance gauge went 92 percent to 100 percent**, and on the worlds where the Clash changed the leader (the ones a reader cannot get from the deploy totals) it went 1 of 2 to **3 of 3**. Measured with a second fresh reader on a different seed.

**A second tier of five questions** came back from that reader and each was read out of the engine and added to the trace: a bolster heals friendly fire; a shield may cancel a friendly sweep; the shielder's half-share is paid at the cancel; shielders cancel separately; nothing heals mid-Clash. One of those exposed a fixture fault rather than an engine fault, which is the correct way round.

**Also measured:** one contested world in ten (9.5 to 11.1 percent on three seeds) is decided with no attack landing at all, because a side fielded only presences. Now an open item with a number on it.

**Verified:** 1921 tests green (nine new), typecheck clean, build inside budgets, headless Proving green in all four configurations.

### Pass 12 (2026-09-18): what is still reachable

**Weakest thing:** the rubric critic's lowest line, 4 of 10. A losing player had nothing on the screen telling them whether the Proving was still winnable.

**Shipped:** one sentence in the status strip, and it is arithmetic rather than a gift. Worlds still to be ruled on against each side's distance from the clinch. It says what it would take when behind ("Still yours to take: 2 more of the 3 worlds left clinches the Charter"), says when the rival can no longer clinch, says plainly when the Charter is out of reach and that worlds still count toward the record, and says nothing when the Proving is live for both, because the score already speaks.

**A bug caught by paint before it shipped:** the first version counted this round's worlds as still open after the Court had ruled on them, so it would have called an awarded world winnable and the out-of-reach case could never fire. Found by walking a whole Proving and reading the line at every Ruling.

**Verified by paint on seed 21**, where the handler falls behind 3 to 4 into the last round and the line reads exactly as intended; six unit tests pin the four cases, the ruled-round boundary, and the silence at the end.

**Verified:** 1927 tests green (six new), build inside budgets, headless Proving green in all four configurations.

### Pass 13 (2026-09-18): the phone

**Weakest thing:** the rubric critic's lowest untouched line (5 of 10) and its named worst thing, that pick-and-place required scrolling between the thing you pick and the thing you pick it for.

**Measured at 390 wide with nothing sent:** page 2258px (2.7 screens), an empty world panel 386px, bench to first world **1576px**, and sixteen visible buttons under 32px tall.

**The cause:** an empty field was 264px of the 386, two ranks of 96px around a 72px midline, holding room for creatures that were not there. An existing mobile rule tried to collapse it and lost on specificity to a desktop rule with a 40px floor per rank.

**Shipped:** an empty world keeps its head, tally and ground line and gives up the rest; the head became one row with the stake button right-aligned; every small control got its height back through padding.

**After:** page 1644px, panel 176px, bench to world **948px (down 40 percent)**, zero buttons under 32px. With a creature lifted the panel grows back to 240px with its ghost preview intact, verified by paint, so all three worlds and their SEND HERE buttons, holds and plans sit within about one screen.

**Guarded:** the headless check now asserts at 390 that no empty world panel exceeds 260px and no visible button is under 32px, so neither gain can quietly regress.

### Pass 14 (2026-09-18): the quiet worlds are not a hole

**The open item:** the prediction reader worried that "a handler who sends two bolsters into an empty world wins it for free." Pass 11 measured how often a contested world sees no attack at all (9.5 to 11.1 percent). Pass 14 measured whether that is a free win.

**It is the opposite.** Over 400 matches on each of three seeds, counting every side at every contested world: a side fielding **only attackless presences wins it 41.9 percent +/- 1.5** (n=4194), against **53.0 percent +/- 1.2** for a side with at least one attacker (n=6702). Eleven points apart, far outside either interval.

The reason is structural: a presence contributes its hold and nothing else, and a world is decided on standing hold, so a side with no attacker can only win the worlds its hold alone would have won while giving the other side a free hand to remove that hold. The side that cannot attack also cannot stop being attacked.

**Closed with a number rather than acted on**, which is the point of measuring before designing.

### Pass 14 (2026-09-18): the quiet worlds, and the critic's second reading

**Closed with a number:** a world where a side fields only attackless presences is not a free win. That side takes it **41.9 percent +/- 1.5** (n=4194) against **53.0 +/- 1.2** for a side with an attacker (n=6702), eleven points apart on three seeds. A presence contributes hold and nothing else, and the side that cannot attack also cannot stop being attacked. No lever needed.

**The rubric critic, second reading: 65 of 100** (from 64). The total barely moved, which is honest for a run of passes that fixed named faults rather than raising the whole. Two of its findings were **disproved by checking**, and that is the more useful half:

- **The "detached navbar" on mobile**, which it called the worst thing about the phone build and scored 3 of 10 for, does not exist. Checked live at 390 with a creature lifted, the navbar is sticky at y=0 with the worlds scrolling under it. A **fullPage screenshot re-renders sticky elements at each scroll band**, so it appears a second time mid-image. The screenshot was lying, not the page. The harness now takes a viewport capture beside every fullPage one.
- **The draft's "fifteen question-mark placeholders"** are the same creature silhouettes the bench renders; the critic read a stale capture.

**Acted on:** the draft card now says what its number is (`BEST 13.9 POSEIDAS`) and its nine lamps say they are the nine worlds by round; the Charter offers the next rival up the ladder **by name** on a win, with the plain rematch beside it, and nothing extra on a loss.

**The lesson worth keeping:** a blind reviewer is only as good as what it is shown. Two of its three highest-value fixes this round were artifacts of my own capture method. Check a finding against the live page before building on it.

**Verified:** 1932 tests green (five new), build inside budgets, headless Proving green in all four configurations, both UI changes checked by paint.

### Pass 15 (2026-09-19): the frame width, wired and then left alone

**Shipped: the wiring, and a negative result.** `worldsPerFrame` had been a key in `DEFAULT_RULES` since pass 9 but nothing read it - `drawFrames` dealt from the module constant, and the clinch was a hard five in five places (the Ruling, the bot, the status pips, the reachability line, the validation). So the untried half of pass 9's sends-per-world ratio could not be measured at all. It can now: `clinchFor(worldsPerFrame, framesPerMatch)` derives the bar as a majority of the worlds on offer, which yields the shipped 5 of 9 unchanged and makes any other width a coherent game rather than a half-applied setting. Eight tests pin it (`frameWidth.test.ts`), one per place the width has to reach.

**The measurement, 600 matches on seeds 7/13/21:**

| frame | worlds | clinch | 1v1 | downs | flips | worst naive |
|---|---|---|---|---|---|---|
| 3 x 3, s11 (shipped) | 9 | 5 | 55.1-56.1% | 4.64-4.85 | 28.1-30.5% | 12.3-18.0 |
| 2 x 3, s11 | 6 | 4 | 18.3-19.3% | 5.21-5.64 | 27.9-29.7% | - |
| **2 x 3, s9** | 6 | 4 | **30.1-31.1%** | 4.27-4.52 | 29.0-30.5% | **7.5-9.5** |
| 2 x 3, s8 | 6 | 4 | 42.4-44.2% | 3.63-3.77 | 26.4-30.1% | 4.5-12.5 |
| 4 x 3, s14 | 12 | 7 | 68.7-69.4% | 5.60-5.63 | 29.5-30.3% | - |

**Not shipped, for two measured reasons.** The naive-policy margin falls through its bar of eight points on seed 13, because with two worlds a round there is no allocation question left; and a two-world round can only be level (51 percent) or swept (48), so half of all rounds would say nothing about the score. The stake does not rescue it. Both readings are written into the comment above `WORLDS_PER_FRAME` with the sweep, so nobody rebuilds this.

**Worth keeping from it:** a wider frame is unambiguously worse on every axis, which nobody had checked; and the narrow frame does make the last round matter more (91.8-92.7 percent of matches still live entering round 3, against 82.5-84.7 shipped), which is the one thing to come back for if a deeper per-world decision ever exists.

**The lesson worth keeping:** *a lever nothing reads is not a lever.* This one sat in `DEFAULT_RULES` for six passes looking like an option, and four of those passes cited it as the untried alternative to a budget change. It was never testable. When a lever is recorded, the same pass should make something read it, or record that it does not.

**Verified:** 1940 tests green (eight new), typecheck clean, build inside budgets, headless Proving green in all four configurations, and the derived clinch checked by paint (five pips a side, "First to 5", three worlds on the table).

### Pass 16 (2026-09-19): the swift move was costing its users six points

**Started as "read the negative attribute lanes pooled", the standing caution from pass 6.** Two of the log's open items said intelligence and charisma read negative and should be measured before being treated as faults. Pooled over 49,362 lane samples on five seeds, both are **within noise** (charisma +0.2 +/- 2.0 within presences, intelligence -0.3 +/- 2.0). The recorded -15.2 was a small-sample artifact, and the item is closed.

**What pooling found instead was a real fault nobody had named.** Agility and reflex read **-6.8 (strikes) and -6.5 (presences)**, beyond noise. They are *only* speed, and hold is the mean of vitality, resilience and endurance, so on a fixed attribute budget a fast creature is a fragile one. That is the creature system's design, not a bug. The question is whether what speed buys pays for it, and speed buys exactly one thing: the swift move.

**It did not pay. It cost.** Ablating the rule:

| | world win rate, rule on | rule off |
|---|---|---|
| speed under 50 | 51.0% | 51.7% |
| speed 50-64 | 54.6% | 54.6% |
| **speed 65-79** | **53.9%** | **59.7%** |
| **speed 80+** | **52.2%** | **58.4%** |

The loss is confined to exactly the creatures the rule applies to. Scored at the Ruling over 1500 matches, the move won the world it went **to** 62.5 percent and the world it **left** 41.2 percent, and instrumenting the decision showed **37 percent of moves abandon a world the creature was holding alone** - handing it over. The cause is the gate: `net > 0` took any move scoring a hair better than staying, against margins that are a snapshot of the bot's own turn, and Deploy is not over.

**Shipped: `SWIFT_MOVE_GAIN = 6`,** a margin of confidence the move must clear, swept at 2000 matches a row:

| gate | swift world win | moves/match |
|---|---|---|
| 0 (before) | 53.4% | 3.61 |
| 4 | 56.7% | 2.27 |
| **6 (shipped)** | **57.9%** | **1.30** |
| 8 | 58.3% | 0.66 |
| 10 | 59.0% | 0.26 |
| rule absent | 59.3% | - |

The curve approaches the ceiling by making the rule vanish, so the highest number is not the best setting. 6 recovers 5.1 of the 6.5 available points while the move still fires more than once a match. The mirror is unmoved (48.9 to 49.5), and flips, downs and comeback all stay in band on three seeds.

**Two fixes measured worse and are recorded as such** at `stayValue`. `margins[siteId]` includes the creature's own hold while `worthAt`'s `m` excludes it, which looks like the bug; but pricing the gain from standing there made leaving *cheaper* (50.8 percent), and pricing "holding it alone" as a flip is arithmetically right and still worse, because the destination flip is priced at the same constant so the two cancel. **The real problem is that `worthAt` caps every flip at one number,** which is now open item 3.

**A test was passing for the wrong reason.** `expeditionBot.test.ts` asserted the rule fires on a board of twenty-four identical creatures. On a symmetric board no relocation is worth anything, so it only ever passed because the old gate took near-ties. The fixture now has swift-and-fragile against slow-and-solid, which is the shape that gives a move somewhere better to be.

**The lesson worth keeping:** *an attribute is only as good as what it buys.* The lane reading looked like a draft-balance problem and was really a bot bug two layers away, found only by asking what the attribute purchases and then ablating that. And a gauge that improves monotonically as a rule disappears is not telling you to delete the rule; it is telling you the rule is being used badly.

**Verified:** 2025 tests green (four new, one fixture corrected), typecheck clean, build inside budgets, headless Proving green in all four configurations, all three match gauges in band on seeds 7/13/21.

### Pass 17 (2026-09-19): a flip is worth what it clears by

**Took the open item pass 16 left behind.** `worthAt` priced every flip at a flat `flipValue` of 10, so a lead of 0.1 hold and a lead of 30 scored identically. Two consequences: the bot bought the **cheapest** flip available, because clearing zero earned full credit while every point beyond it cost `holdCost`; and a flip gained cancelled a flip lost exactly, which is why pass 16 could not price the swift move's departure.

**Measured first.** Over 1800 matches on three seeds, whether the deploy-end leader still held the world at the Ruling, by how thin the Deploy left it:

| deploy-end margin | leader still holds it | n |
|---|---|---|
| under 2 hold (a hair) | 59.2% +/- 1.7 | 3105 |
| 2 to 5 | 65.4% +/- 1.5 | 3671 |
| 5 to 12 | 78.7% +/- 1.1 | 5372 |
| over 12 | 89.7% +/- 2.0 | 896 |

A thirty-point spread the pricing was blind to, and the bot was buying the thin end of it **3105 times against 896** - not because thin flips are good but because they were cheap.

**Shipped `FLIP_SECURITY = 0.5`:** a flip is worth `flipValue * (1 - security + security * min(1, over / margin))`, so half its value depends on how far past the deficit it clears.

| flipSecurity | naive margin (bar 8) | hair-thin leads | 1v1 | flips | downs |
|---|---|---|---|---|---|
| 0 (old) | 14.6 pts | 23.6-23.9% | 56.9-58.4% | 27.1-29.9% | 4.65-4.76 |
| 0.25 | 22.1 | 20.4-21.2% | 56.0-57.6% | 29.2-31.2% | 4.52-4.65 |
| **0.5** | **21.3** | **19.1-20.9%** | **54.9-56.0%** | **31.0-31.4%** | **4.43-4.56** |
| 0.75 | 22.0 | 19.0-20.5% | 54.7-56.0% | 29.9-32.4% | 4.30-4.40 |

The naive-policy margin, which is the gauge saying deploy decisions carry weight, goes from **14.6 to 21.3 points** - restoring the headroom pass 9 recorded as shrinking when the send budget rose. All three match gauges stay in band on all three seeds.

**The unexpected gain: 1v1 fell from 56.9 to 54.9 percent.** Buying a *secure* flip means sending a second creature rather than the cheapest single one that clears zero, so better pricing crowds worlds by itself. Passes 5, 7, 8, 9 and 15 all attacked the crowd gauge directly and two points of it were sitting in the bot's valuation the whole time. **A gauge about the game can be held down by the bot.**

**The two fixes compound.** Re-swept pass 16's swift gate under the new pricing: the whole curve moved up about five points, and gate 0 now reaches 59.0 percent, which was pass 16's *ceiling* under flat pricing. Gate 6 stays correct (62.5 percent at 1.03 moves a match; gate 8 reaches 63.6 but drops under once a match).

**A test fixture's worlds were the fault, not its creatures.** The swift-move test built nine *featureless* worlds with identical environments and no hazards, so every world is interchangeable and there is genuinely nowhere better to be: proposing no moves there is correct behaviour. It now uses the authored worlds. Pass 16 had tried making the *roster* asymmetric instead, which produced fewer moves, not more - recorded in the test so it is not tried a third time.

**The lesson worth keeping:** *price the quality of an outcome, not the fact of it.* A flat reward for "achieved the thing" makes a bot buy the cheapest version of the thing, and the cheapest version is the one the opponent undoes. Checking whether a reward has a gradient is worth doing wherever one exists.

**Verified:** 2029 tests green (four new, one fixture corrected), typecheck clean, build inside budgets, headless Proving green in all four configurations.

### Pass 18 (2026-09-19): restrain earns its rule, and the harness was testing one mode twice

**Re-measured a shelved rule, and the conditions had changed.** Pass 8 built pinning (a restraining attack takes its target's swing), measured it inert and shipped it off, recording the reason precisely: it fired 280 times per 600 matches but took only 67 swings, because **76 percent of pins landed on a creature that had already swung**. That is an ordering problem, and pass 9's send budget plus pass 17's flip pricing have since taken 1v1 from 62.7 to 55.3 percent. More creatures sharing a world means more unspent swings when a pin lands. (Pass 5's lesson: a sweep's conclusion expires when the bot changes, and the bot has changed twice.)

| | pass 8 | now |
|---|---|---|
| pins per 600 matches | 280 | 356 to 490 |
| of those, took a swing | 24% | 23.9 to 31.6% |
| Provings with a bite | 12.4% | 13.2 to 24.2% |

**The number that decided it.** Pooled over five seeds at 600 matches, a creature whose attack restrains wins its world **57.5 percent with the rule off and 58.7 with it on: +1.20 +/- 0.91 points, beyond noise**, on 22,500 sends a side. Per seed: +1.24, +2.19, +0.99, +0.63, +0.92 - positive five times out of five, though no single seed resolves it alone, which is exactly the case pooling is for. And it costs nothing in shape: at 3000 matches a side, flips +0.0 +/- 0.9, comeback -0.3 +/- 2.7, 1v1 +0.0 +/- 0.9, downs 4.51 either way.

**Shipped `PINNING = true`.** 171 of the pool's 1384 actions restrain, and until now that word on a card was decoration. `REACH_FIRST` stays off: ordering reachers first moved the bite rate 29.9 to 30.3 percent, inside the noise.

**And the rule speaks.** A swing that vanishes without a sentence is how a table loses a player's trust, so both halves narrate: the pin that lands, and the swing it took. Verified by paint on the live page: *"Your Smokat restrains the rival's Akinza: the rival's Akinza does not swing this Clash."*

**THE FINDING THAT MATTERS MORE.** Hunting that paint check turned up a fault in my own verification. The headless whole-Proving check has been opening `?view=simple` and `?view=advanced` since pass 5, and **the page never read a `view` parameter** - mode comes from `localStorage`, defaulting to simple. So both halves of the loop ran simple mode. Half of every pass's verification since pass 5 was a duplicate, and the advanced table's panels were never exercised. The page now reads `?view=`, and the check asserts the mode took before playing.

**The lesson worth keeping:** *a harness that cannot fail is not a check.* Four green lines looked like coverage of two modes and were coverage of one, for thirteen passes, and it took wanting to see a specific sentence on screen to notice. When a check takes a parameter, assert the parameter had an effect. This is the same shape as pass 14's fullPage screenshots: the instrument was lying and nothing about its output said so.

**Verified:** 2034 tests green (five new), typecheck clean, build inside budgets, headless Proving green in all four configurations **with the mode now asserted**, and the pin sentence checked by paint.

### Pass 19 (2026-09-19): two "inert" levers, one wrongly accused and one that could not fire

**Both entries on the log's inert list were wrong, in different ways.** The standing caution (pass 6, pass 16) is to measure with an interval before calling something a failure, and applied here it overturned both.

**Bolster recovery was never inert.** Ablated properly and pooled over five seeds at 500 matches: removing it moves the flip gauge **+2.25 +/- 0.98**, doubling it moves it **-1.24 +/- 0.96**. Both beyond noise, monotone, and in the direction the rule intends. It fires 1.28 times a match for a mean 3.17 hold. `BOLSTER_RECOVERY = 0.5` stays; the log entry was the error.

**The instinct lanes: the dull lane was empty.** Switching `instinctLanes` off moves no match gauge (flips -0.14 +/- 0.97, comeback +0.49 +/- 2.97, 1v1 +0.08 +/- 1.03), which looked like a rule to delete. But the rule acts on targeting, and instinct reads +6.9 as an attribute - the strongest in the pool. Both could not be true.

**The generator's instinct floor runs 31 to 37 depending on the pool, and `DULL_INSTINCT` was 35.** Across seven pools of 87: **five dull creatures in 609, 0.8 percent.** Nobody was in the lane, so ablating the rule was ablating an empty half of it.

Moved to where creatures actually are (share of landed attacks that downed, three seeds, 500 matches):

| threshold | pool share | keen | conduct | dull |
|---|---|---|---|---|
| <= 35 | 0.9% | 39.2% | 35.3% | 8.3% +/- 5.5 (n=96) |
| <= 45 | 8.5% | 39.2% | 35.3% | 31.5% +/- 3.2 |
| **<= 50 (shipped)** | **21.6%** | **39.2%** | **38.8%** | **25.2% +/- 1.6** |

A thirteen-point penalty on a fifth of the pool, far beyond noise. The match gauges do not move at any threshold, which is correct rather than disappointing: this rule should change **who you draft**, not how a match feels.

**It switched on UI that already existed and had never once rendered** - the half-closed eye glyph and the dossier's targeting line, both built passes ago for a lane no creature could enter. Verified by paint on seed 7, the first tried: *"Dull instinct: it hits whatever the enemy sent earliest."*

**Friction reported** (CLAUDE.md, levers not stone): a threshold no creature can reach reads as tuned and is not. A new test pins both cuts inside the range creatures are generated in, so this cannot come back silently.

**The lesson worth keeping:** *check the population of a band before concluding a rule about it does nothing.* Ablating a rule whose lane is empty looks exactly like ablating a rule that does not matter, and this one survived nine passes and an explicit "inert" verdict on that resemblance. Same family as pass 18's harness: the measurement was honest and the thing it measured was not what I thought.

**Verified:** 2035 tests green (one new, one corrected), typecheck clean, build inside budgets, headless Proving green in all four configurations, the dull lane checked by paint.

### Pass 20 (2026-09-19): the seat the table is drawn for

**A prerequisite shipped on its own, deliberately.** The log's last two items are "no human has played a full Proving" and "hot-seat is unbuilt", and hot-seat is the instrument that fixes both. Scoping it honestly: the seat indirection (sixty-four call sites), a hand-off screen with its own state machine, hidden-send guards, a second squad's draft, and a Charter naming two people. That is more than one pass, and starting it and stopping mid-way would leave the table worse than not starting.

So this pass ships the first quarter, complete and tested: **`seatInPlay()` replaces the hard-coded `'A'`** as the seat the table is drawn for. With no `hotSeat` prop it always returns `'A'`, which is the claim the new tests hold - sixty-four readings of the table move from a constant to an accessor and every one of them must still say A.

In hot-seat it follows the seat to move during Deploy, and **holds still once Deploy is over**: the Clash and the Ruling are watched by both people at once, and flipping the view under a playback they are jointly reading would be worse than either choice.

**Measured, because it decides the design of the next pass:** hiding cannot be switched off for hot-seat. **16.8 percent of sends arrive hidden, and `hiddenSends: false` moves the flip gauge +2.46 +/- 0.98, beyond noise** (five seeds, 500 matches). A variant without hiding is a different game, so validating this one means keeping it, which means two people need a screen between their turns rather than a shared view.

**The lesson worth keeping:** *when a feature is bigger than a pass, ship its prerequisite as a pass.* The alternative is a branch that grows for days with nothing landing, and the seat indirection is independently correct, independently testable, and provably inert in solo play. Say which quarter shipped rather than implying the feature did.

**Verified:** 2040 tests green (five new), typecheck clean, build inside budgets, headless Proving green in all four configurations, solo play unchanged by construction and by test.

### Pass 21 (2026-09-19): the hand-off cover, and five fixes to find one bug

**Shipped: the cover, the seat routing, and an honest account of what is still broken.**

The cover replaces the table rather than overlaying it. An overlay can be scrolled past or read around the edges of, and the whole value of the cover is that the person who should not be looking cannot see the position, so while a hand-off is up the table is **not rendered at all**. Checked by paint: bench, worlds and score are all absent from the document, and the cover names who should be looking and nothing else.

**Seat routing:** `isYourDeployTurn`, the four engine actions (send, pass, stake, swift move), the ghost preview and the bench's `you` prop now read `seatInPlay()` instead of the constant `YOU`. Solo play is unchanged by construction and verified in all four headless configurations.

**It is not playable end to end yet.** The cover is raised once and not on later seat changes, so a Proving stalls partway. That is recorded in the open items with the diagnosis instrument that found the last bug.

**The lesson worth keeping, and it cost the most today:** *four fixes on inference moved nothing; one instrument found the bug in a minute.* I changed the componentDidUpdate guard, gave seat B its own squad, routed four engine calls, and moved the turn gates - all plausible, all inferred from reading, none of them the fault. The fault was `you={YOU}` handed to the bench, so seat B's turn drew seat A's roster and there was literally nothing on screen to press. What found it was printing the table's actual state each loop (phase, turn, cover, count of live controls) instead of reasoning about the lifecycle. **When two fixes in a row do not move a symptom, stop fixing and start printing.**

**Verified:** 2040 tests green, build inside budgets, headless Proving green in all four configurations (solo play unaffected), the cover's no-leak property checked by paint.

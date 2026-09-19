# Reclamation: the ownership log

Status: the running state of the game under ownership (brief: `reclamation-ownership-brief.md`). This file is the resume point. Any reset reads this first and continues at the weakest thing named below, never from scratch. Each pass appends its own section; the standing state at the top is rewritten in place.

## Standing state (after pass 14, 2026-09-18)

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

1. **Crowd worlds further, if it can be afforded.** 1v1 is 56 percent of contested worlds. 12 sends reaches 44.5 but cannot hold the flip band at any scale tried and closes the naive-policy margin from 21.5 to under 10 points. The other half of the ratio is the frame: `worldsPerFrame` is a lever, and a narrower frame raises sends-per-world without touching the budget, but it moves the clinch and the whole match arc, so it is a design change rather than a tuning one.
2. **The status strip is the tallest block on a phone** at 250px, carrying six jobs (round, worlds, score, phase, turn, hint). Whether all six belong above the fold is open.
3. **Intelligence and charisma read negative within presences** (charisma -15.2, intelligence -9.7). Lever: what `rateForDraft` and the bot's role value count. **Read it pooled before treating it as a failure** (pass 6's lesson).
4. **Fire is a dead element and dromeus a dead species** in the draft. Same caution.
5. **The four borrowed effect kinds** (restrain, displace, transfer, suppress) still read as plain attacks. Pass 8 measured that rules for them do not pay while worlds are thin; worth re-testing now that worlds are less thin.
6. **Bolster recovery and the instinct lanes still move nothing under ablation.** Each earns its place or goes.
7. **No human has played a full Proving.** The notes and telemetry are built, verified, and empty.
8. **Hot-seat** is unbuilt and is the cheapest validation instrument the game can have.

### Findings from the headless check (pass 5, recorded not fixed)

The check plays a whole Proving in both views at 1440 and 390 and all four configurations pass with zero page errors, zero console errors and no horizontal overflow. Three things it surfaced that are not failures but are worth a pass:

- **`?view=advanced` does not switch the view.** The masthead still lights SIMPLE when the URL asks for advanced, so the two views could only be told apart by clicking. The check drives both and they behave identically, which is itself the finding. Low cost, and it blocks per-view verification.
- ~~**On 390 the three worlds stack to full height above the bench**~~ **Fixed in pass 13**: an empty world panel went from 386px to 176px and the bench-to-world distance from 1576px to 948px, so with a creature lifted all three worlds sit within roughly one phone screen. Guarded by the check.
- **A dossier panel in the rail can intercept a press on a world**, which the check works around with a forced click. On a real screen that is a press that does nothing.

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

# Reclamation: the ownership log

Status: the running state of the game under ownership (brief: `reclamation-ownership-brief.md`). This file is the resume point. Any reset reads this first and continues at the weakest thing named below, never from scratch. Each pass appends its own section; the standing state at the top is rewritten in place.

## Standing state (after pass 31, 2026-09-20)

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
| **Rubric critic score** | rising per pass | **60 / 100** (pass 30, the FIRST read of captures that watch a Clash; 55 at pass 27) | style 8, first five minutes 7, craft 7, fiction 7; lowest: **mobile 3**, pace 5, numbers 5, glanceability 6, reason to keep playing 6, feedback 6 |
| **Comeback from a CONTESTED round 1** (trailing by one or two worlds) | 30 to 40 | **30.8 / 32.0 / 35.1**; pooled 29.1 +/- 1.4 | **met on three seeds** |
| Comeback from a SWEPT round 1 (trailing by three) | not safeguarded, by ruling | 7 to 12 percent; pooled 8.0 +/- 1.8 | working as ruled |
| Comeback, both populations averaged | (the old single gauge) | 25.9 / 27.1 / 30.7; pooled 25.2 +/- 1.2 | reported, superseded by the split |
| **Stake: staked world against the staker's unstaked worlds** | variance-neutral | **-0.6 +/- 3.0 points** (pooled, n=1619) | **variance-neutral, as designed** |
| Naive-policy regret (best naive against the mirror) | 8 or more points under | passEarly 25.5 against 50.0 | met with room |
| Option spread (near-best per decision) | 3 to 5 | 2.85, dominant 32.5% | just under |
| Every role inside 40 to 60 keeper win rate | 40 to 60 | shield 46.0, bolster 46.4, sweep 51.4, strike 52.3 | met (pass 7 census) |
| **Clash frames with a figure in motion** | 60 percent or more | **99%** (was 21% before pass 28) | **met**, `reclamation-clash.mjs` |
| **Largest figure transform in a round** | 18px or more | **26px** (was 10px) | **met**; gutted, the gauge reads 4.7px and fails |
| **Clash frames marking which world is clashing** | 60 percent or more | **95%**, all three worlds in turn (was 0%) | **met** |

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

**Nick's steer, 2026-09-19: the priority is whether the game is mechanically deep and fun, not how two people play it.**

1. **(Pass 37: addressed, needs a play.)** The table is one fixed screen at every size and the three worlds stand side by side on a phone, so all three compare at a glance. What is left is judging the phone figures by hand; they are small when a world is crowded. **Mobile scored 3 of 10, now the lowest score on the sheet.** The overlap bug is fixed, but the critic's structural complaint stands: "the three worlds need a horizontal swipe-carousel or a compact three-up summary row, because vertical stacking destroys the comparison the game is built on." At 390 you cannot see two worlds at once, so **the core act of the game, comparing three worlds to choose one, requires scrolling three times.** This is the weakest thing left and it is a layout decision, not a polish item.
2. **(Pass 45: done. Each blow is captioned on the world it lands on; the top bar names the clashing world.)** **The Clash still narrates itself in a log above the board.** Pass 28 made the board move; the critic still says "the narration of the fight is happening in a monospace log at the top of the page, which is paperwork by definition" and reads the SKIP button as the designer conceding the Clash is not worth watching. The next move is the sentence landing ON the world card rather than in the terminal.
3. **(Pass 45: closed without a change; see the pass 45 entry.)** **The footing answers "who can stand here", not "what does holding it do".** Pass 29 gave the empty world the half of the stake the game can compute from the record. The other half - what claiming a world is worth toward the Charter, what losing it costs - is still only in the status strip's sentence. Five of nine worlds clinch; a panel could say where this one sits in that count.
4. **(Pass 44: done. The phone world head carries the temperature scale and readout, each card its speed; the log stays behind ≡ and the attribute marks in the creature's reading.)** **Advanced mode is Simple on a phone.** `advanced-390` differs from `simple-390` only by a temperature range: the log and the inspector, its two best features, are both absent at 390. Either give them a phone form or say the mode is desktop-only.
5. **(Pass 38: done.)** The site navbar and masthead are gone from the match, and the top bar is one row. **The first viewport on a phone is all chrome.** Breadcrumb, mode toggle, rival name, sound, round header, world chips, two score strips, phase badge, turn line and a three-line instruction, before any world panel.
6. **(Pass 49: closed. Schema 5 retired transfer, restrain and suppress as effect types; the status layer of pass 32 carries what they meant, and displace stays an attack by the base redesign's ruling. See recordReading.ts.)** **The three borrowed effect kinds** (displace, transfer, suppress, 261 actions) still read as plain attacks. Act flip makes a creature's second act matter, which changes the case for these.
7. **(Pass 48: done for dromeus, akinza and avilily; imprit is still cut most of the time.)** **Fire is a dead element and dromeus a dead species** in the draft. Read it pooled first.
8. **(Pass 46: done. The record schema is the published range; a test holds the game's scale to it.)** **The generator's attribute ranges are not published anywhere the game can read.**
9. **No human has played a full Proving.** The instrument exists (hot-seat, passes 20 to 23).

### Hot-seat: what pass 20 did and did not do

The seat the table is drawn for is now a value (`seatInPlay()`), not the constant `'A'` compiled into sixty-four readings. With no `hotSeat` prop it always returns `'A'`, so solo play is unchanged, and the hand-off can land without touching those call sites at the same time as everything else.

**Pass 22 made it playable.** A whole Proving now plays to the Charter with two people sharing one screen: 22 covers raised across both seats, no leak, no page errors. `apps/web/scripts/reclamation-hotseat.mjs` is the check, and it runs beside the solo one.

**Pass 23 gave the second person their own draft.** Both handlers now keep twelve from their own fifteen, with a cover between them, and the two pools share no creature. Checked by paint end to end.

**What is left, and it is cosmetic rather than blocking:**

1. **The Charter names a rival, not a person.** `buildMatchReport` is still called with `YOU`, and the narration still says "your" and "the rival's" rather than naming the two handlers.

The constraint that shaped the design: **16.8 percent of sends arrive hidden, and removing hiding moves the flip gauge +2.46 +/- 0.98, beyond noise.** Hot-seat could not simply reveal everything, which is why there is a cover at all.

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

### Pass 31 (2026-09-20): the checks were asking the wrong question

**Weakest thing:** Nick asked whether the verification problem pass 30 admitted to had actually been fixed, or whether the results were still coming from the wrong layer. The honest answer was that pass 30 fixed one instance and left the class open.

**The audit that settled it.** Set `.rec-site { opacity: 0 }`, which makes the entire game board invisible while leaving the DOM untouched, and re-ran everything:

| | healthy build | board invisible |
|---|---|---|
| before this pass | 4 checks pass | **4 checks pass** |
| after | 4 checks pass | **4 checks fail** |

**All four headless checks passed with the whole board invisible.** Every assertion they made about the board was `count() > 0`, which is a question about the DOM. That is precisely why pass 28's blank-ruling bug survived four checks and 1541 unit tests: `querySelectorAll('[data-site-id]').length` was 3 throughout a screen a player would have called empty.

**What shipped:** `apps/web/scripts/lib/visible.mjs`, one shared probe asking whether an element is actually seen. It walks the ancestor chain multiplying opacity, checks display/visibility/content-visibility, confirms the box is in the document, and hit-tests several points down the element so something drawn over it is caught. All four checks now gate on it.

**Three faults in the probe itself, each caught by running it against a HEALTHY build.** A check that fails on a good build is worse than no check, because it teaches you to ignore it.

1. **It called below-the-fold "not visible".** On a phone, worlds 2 and 3 sit under world 1 and are reached by scrolling; that is the known mobile layout problem, not a rendering fault. Being outside the document is now the fault; being outside the viewport is reported separately.
2. **It called a sticky bar crossing a panel's middle "covered".** The judge bar pins across a tall world panel on a phone, and the panel above and below it is perfectly readable. It now samples five points and fails only when every one is behind something else.
3. **It read the board mid-entrance and reported 0 of 3 on a healthy build.** The panels fade in over 460ms plus a stagger. The hot-seat check now waits for the board to settle, because the question is whether the board is readable while a handler is deciding.

**A real finding kept, not fixed:** on a phone the judge bar does overlap the first world panel at the ruling. It is partial and the panel is readable around it, so it is recorded here rather than patched with padding that did not work (`.rec-table` padding-bottom was tried and had no effect, since the bar is sticky inside that element).

**The rule this pass adds to the sheet:** every gauge is audited by breaking the thing it claims to measure and confirming it fails, AND by running it against a healthy build and confirming it passes. Pass 28 did the first half for the motion gauge. Doing only the first half produces a check that cries wolf; doing only the second produces a check that cannot fail.

**Verification.** 1541 web tests green, all four headless checks green on the healthy build and all four red on an invisible board.


### Pass 30 (2026-09-20): a critic that can see the game, and two bugs it found

**Weakest thing:** passes 28 and 29 both attacked scores the critic gave and neither had been re-read. Worse, pass 28 had established that **every capture set a critic had ever scored was taken with `reducedMotion: 'reduce'` and with the Clash skipped**, so no score in the log had ever been given to the game as a player sees it.

**What shipped first: a capture set that watches the game.** `apps/web/scripts/reclamation-captures.mjs` takes eleven shots per width with motion left on, the Clash watched rather than skipped, and the moments chosen by what the game is DOING (a blow landing, the Court ruling) rather than by a timer. 22 captures at 1440 and 390, 3 blows and the ruling caught at both widths.

**The blind critic scored 60 of 100**, against 55 at pass 27. The two passes it was implicitly grading both moved: it called the armed-state preview "a real decision with a real preview", and quoted the footing back as "a rule and a piece of worldbuilding in the same sentence". Pace rose 3 to 5 and reason to keep playing 4 to 6.

**But it found two correctness bugs, and both were mine.**

**1. The Court's ruling was delivered over a blank board.** The critic called `1440-07-ruling` "an empty page" and a shipping blocker; the capture shows the header, the log, and then 600px of nothing. Confirmed by probe: the site panels were never unmounted, they were **re-running their entrance animation from opacity zero at the judge event**. The cause was pass 28. `rec-site--enter` had always been a permanent class, which was harmless only because nothing else animated the panel: the animation ran once on mount and sat filled. Pass 28 put the camera on the same element, and when the camera released at the ruling the browser restarted `rec-site-enter`. So the payoff of the round was delivered over a board fading in from nothing, in every round of every match, and four headless checks plus 1541 tests all passed. The entrance is now a one-shot dropped 900ms after mount.

**2. The phone's world panels drew their edge bands on top of the footing.** Pass 13 had collapsed the empty panel to nothing on a phone because its whole body was the word "unclaimed": ranks at zero height with the RIVAL and YOU bands absolutely positioned inside them. Pass 29 put three lines of text in that body and the bands came down over it. The first fix padded the midline, which moved the text and the bands together and changed nothing; **the geometric probe still reported both bands intersecting the footing's rectangle**, which is how it was caught rather than declared fixed. The room had to come from the ranks.

**Also shipped: the rest of the decimals** (open item 2). `formatHoldShown()` rounds every displayed hold on the Charter's world rows, its creature lines, the figure under each creature and the two totals beside the balance bar; the exact value moves to the title attribute. It differs from `formatBlow` in one way that matters: a hold of zero is a real state, so it prints 0 rather than clamping to 1. **The margin sentence deliberately keeps its tenth**, because "you lead by 0.4" is actionable and "you lead by 0" over a world that is narrowly yours would be a lie.

**Guarded.** The proving check now compares two rectangles, not a class name: it asserts no world's edge band intersects its footing text, in all four configurations. Falsified by reverting the fix, it fails on both phone configs with a message naming the defect.

**The lesson this pass paid for.** Two of the last three passes shipped a bug that every existing check passed, and both were found by a reader looking at a picture. **A check that watches the thing a player watches is worth more than another assertion about state.** The capture harness is now the instrument for that, and it should be run and re-scored every few passes rather than once.

**Verification.** 1541 web tests green (the art-registry test's `process.cwd()` flake under the root runner is unrelated and passes 6/6 from its own workspace), all four headless checks green at 1440 and 390.


### Pass 29 (2026-09-20): what a world asks of your squad

**Weakest thing:** reason to keep playing, 4 of 10. "Three identical empty black rectangles labelled UNCLAIMED are the least motivating opening board possible."

**Measured first.** An empty world panel is 411px tall with a 264px body carrying nine words, six of which are "no one", "UNCLAIMED" and "no one". Three of them is 792px of screen saying nothing about why any world is worth having or how the three differ. "Unclaimed" is true of every empty world, so it distinguishes none of them.

**They differ a great deal, and the game already knew how.** Over five seeds and every site (210 site-roster pairs, a twelve-creature squad):

| | |
|---|---|
| creatures comfortable at a site | mean 5.4 of 12, **range 0 to 11** |
| strained | mean 4.4 |
| severely strained | mean 2.2 |
| native to the world (1.5x hold) | mean 0.86, up to 3; **61% of worlds offer one** |
| sites where all twelve are comfortable | **0 of 210** |
| sites where fewer than half are | **87 of 210** |

And within a single frame, which is the comparison a handler actually makes: the comfortable count spreads by **3.67 on average, up to 9**, and 9 of 15 frames spread by 3 or more.

**What shipped.** The footing: three short lines in the body of an empty world, computed from the handler's own bench through the same `prepare()` the figures use, so the panel cannot disagree with the table. How many of your squad are at ease here, how many are strained and how many severely, and whether any of yours calls this world home and holds half again as much on it. It is replaced by the figures the moment anyone stands here, because from then on the balance bar is the better answer.

Seed 21 round 1 is the case it exists for: **Magmuth reads "0 of your 12 are at ease here, every one of them is severely strained"** beside Saiphus at 9 of 12. That is a decision written on the board before a single creature is sent.

**Named "footing", not "stake".** Stake is already the game's own mechanic, the control on the panel head that makes a world count two. Sharing the word would have made one panel say "stake" about two unrelated rules.

**One copy fix found by reading the output rather than the code:** "the other 12 are strained, 12 severely" is the arithmetic talking. When every strained creature is severely strained, which is the sharpest warning the panel can give, it now says so once.

**Guarded twice.** `reclamation-proving.mjs` asserts all three empty worlds state what they ask of the squad and that each counts it, in all four configurations; falsified by demanding four, it fails on all four. `reclamationFooting.test.js` covers every branch of the copy, including the all-severe case, the singular case, the no-native case and the no-bench case; falsified by breaking one string, it fails.

**Verification.** 1539 web tests green, all four headless checks green at 1440 and 390, phone panel-height guard (260px) still met.


### Pass 28 (2026-09-20): the Clash, made visible

**Weakest thing:** pace, 3 of 10, the lowest score any critic has given anything. "This looks like paperwork: no visible motion, no sense of creatures doing anything to each other beyond a number shrinking." Nick's steer for this pass: creature animation is his pipeline and out of scope, so the work is everything around the creatures - camera, timing, world reactions, hit punctuation.

**The first thing measured was the instrument, and it could not see the problem.** Every capture set a rubric critic has ever scored was taken with `reducedMotion: 'reduce'`, and `reclamation-proving.mjs` clicks `[data-skip]` on every loop iteration. **No automated check had ever watched a Clash play.** The critic was scoring still frames of an animation and the harness was skipping the animation entirely, so the complaint was about a thing nothing in the repo measured.

**What a live Clash actually measured.** A new probe watched one at full motion on seed 7 and sampled the document 61 times across the round:

| | before |
|---|---|
| frames where any figure was transformed | **13 of 61 (21%)** |
| largest figure transform, whole round | **10px** (the lunge's own keyframe, on a 96px figure) |
| figures that moved at all | 2 of 4 |
| frames marking which world was clashing | **0** |
| damage flash | `-6` and `-1.1` in the same round |

So the complaint was right and its cause was threefold: 79 percent of the Clash was a still frame; the moving fifth moved a figure by ten pixels, which is a twitch rather than a blow; and with all three worlds equally lit the eye had nowhere to go, so whatever motion existed went unwatched.

**What shipped.**

1. **The camera.** The world currently clashing is lifted and rimmed in the accent; the other two desaturate and recede. This is the largest single change, because it is the one that tells the eye where to look before anything moves. The clashing world also carries a slow breathing wash, which is what fills the frames between engine steps that measured as a still image.
2. **A blow that carries.** The lunge went from 10px to 26px with a scale into the blow and a recoil behind it; the jolt went from a 4px shake to a 14px knockback with rotation; a downed creature now falls 40px over 620ms instead of vanishing 16px in 420ms.
3. **Hit punctuation.** A red ring is struck off the creature a blow lands on, so the moment of contact has a mark of its own and is not carried entirely by the number.
4. **A round with a rhythm.** Every event used to be held for the same 700ms, so a downing read exactly like a shield cancelling nothing. `stepWeight()` now weights the step by what happened: a downing 1.9x, the Court's ruling 1.6x, a sweep 1.35x, a cancelled attack 0.7x. It is a lever with a test on it.
5. **The flash rounds** (open item 3, the visible half). `formatBlow()` prints a whole number, because the flash is punctuation read in under half a second while the figure is still moving. It never rounds a landed blow to zero. The inspector keeps its tenths.

**Result, same probe, same seed:**

| | before | after |
|---|---|---|
| frames with a figure in motion | 21% | **99%** |
| largest figure transform | 10px | **26px** |
| figures that moved at all | 2 of 4 | **13 of 13** |
| frames marking the clashing world | 0% | **95%, across all three worlds in turn** |
| flash | `-1.1` | `-1`, `-11`, `+3` |

**Three faults of my own, each caught by a different instrument.**

- **The entrance animation owned `opacity` and `transform`, so the camera silently did nothing.** `.rec-site--enter` runs with `both` fill and its `to` state pins both properties for the life of the panel. A filling animation beats a plain declaration, so the camera's lift never applied at all and only the one world running a *different* animation let the recede through. **The gauge said the camera was firing on 100 percent of frames; a screenshot showed one waiting world dimmed and the other at full brightness.** Found by paint, fixed by giving the camera states their own animations.
- **A waiting world may also be running the landing tint,** a second `animation` shorthand that replaces the camera's outright. The first fix made one world recede and left the one that had just been landed on untouched. Found by reading the computed style of all three panels instead of trusting the class list.
- **The gauge could not fail.** It measured each figure's bounding rect between samples. When the animations were deliberately gutted back to their pre-pass-28 values as a falsification test, it reported **identical numbers** - 77.4px, 100 percent of frames - because a downed creature leaving the board reflows every figure beside it by 60 to 77px, which has nothing to do with whether anything is animating. It was about to be committed as the evidence for this entire pass. Displacement is now read off the computed transform matrix, which is the animation and only the animation; gutted, the gauge reports 4.7px against a floor of 18 and exits 1.

**Also built:** `apps/web/scripts/reclamation-clash.mjs`, the fourth headless check, and the first that watches a Clash rather than skipping it. It asserts floors under the share of frames in motion, the largest figure transform, the camera's presence across more than one world, and that the flash carries no decimals. A Clash with no attack in it is a real position (every send landing unopposed), so the assertions about a blow only run when a blow happened, and the check says which kind of round it measured.

**Reduced motion** covers every animation added, and keeps what is not motion: the clashing world keeps its accent rim and the waiting worlds keep their desaturation, so a player who asks for reduced motion still knows which world is being read. Verified by computed style at both widths, which caught the composed selectors outranking the override.

**Verification.** 2094 tests green across all workspaces, typecheck clean, all four headless checks green at 1440 and 390, design-system guards green.


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

### Pass 22 (2026-09-19): hot-seat plays

**A human can now play a full Proving against another human.** That closes the log's oldest item, and it is the cheapest validation instrument the game has.

**The bug pass 21 could not find was not in the cover.** Printing the table's state each loop found it in a minute: the cover was raised once, correctly, and then the Proving stalled with the turn on B, twelve armable creatures on screen, and every press rejected. A dozen guards and roster lookups still read the constant `YOU`, so on seat B's turn the table said "it is the rival's turn" to seat B itself, and looked up B's armed creature in A's roster. **The cover was fine; the seat could not act.**

Twenty-one call sites moved from `YOU`/`THEM` to `seatInPlay()`/`seatOpponent()`: the action guards, the roster lookups, the stake and swift-move lists, the recommendation, the ghost preview, the status strip's score, and the bench's `you`. Solo play is unchanged because `seatInPlay()` returns `'A'` with no `hotSeat` prop, and that is verified rather than asserted.

**Checked by paint, end to end:** 22 covers raised, both seats, nothing about the position in the document while a cover is up, and the Charter reached. Promoted to `reclamation-hotseat.mjs` so it runs every pass.

**The lesson, now paid for twice:** *when two fixes in a row do not move a symptom, stop fixing and start printing.* Pass 21 spent five inferred fixes on the wrong component. Pass 22 spent one instrument and found it immediately. The instrument was six lines: phase, turn, cover, and the count of live controls, printed every loop.

**Verified:** 2049 tests green (nine new), build inside budgets, headless Proving green in all four solo configurations, and a whole hot-seat Proving played to the Charter.

### Pass 23 (2026-09-19): the second person drafts their own squad

Hot-seat played, but both people kept the same twelve: seat B was handed the squad the draft built for seat A. Now each handler keeps their own twelve from their own fifteen, with a cover between them, for the same reason the board is covered between turns - **a squad seen in advance is information the game does not mean either handler to have.**

The staging: the first handler's confirm hands the keyboard over rather than starting the Proving; their twelve is parked in `keptA` while the second person keeps from pool B; the confirm that follows builds both rosters. Solo play is untouched - it still drafts once and the rival still keeps by its habit.

**Checked by paint:** the cover appears between the two drafts, the second handler's pool is **15 creatures with zero overlap** with the first handler's, their keep starts empty, and the Proving plays to the Charter with both human-chosen squads. Folded into `reclamation-hotseat.mjs` so it stays verified.

**A vacuous assertion caught in the writing.** The first version read the first handler's pool *after* the confirm, when the draft had already moved on, so it came back empty and the overlap check compared against nothing: it would have passed however the pools were built. Reading the pool before the confirm makes it 15 against 15 and the assertion real. **An assertion that cannot fail is worth exactly as much as no assertion, and the way to tell is to look at the numbers it prints rather than the word PASS.**

**Verified:** 2054 tests green (five new), build inside budgets, headless Proving green in all four solo configurations, hot-seat green end to end including the two-stage draft.

### Pass 24 (2026-09-19): the depth gauge, read properly, and a fix that failed

**Nick's steer redirected this pass:** the priority is whether the game is mechanically deep and fun, not hot-seat. Hot-seat was built as a validation instrument, a way to find out, and the question upstream of it is the one that matters.

**Read for engagement rather than balance, the gauges say something specific.** Option spread was the only gauge below band, and split by round it is not a flat shortfall but a decay:

| | round 1 | round 2 | round 3 |
|---|---|---|---|
| mean near-best options | 3.9 | 2.8 | **2.05** |
| share with ONE dominant option | 28% | 38% | **50%** |

Consistent on three seeds. **The round that decides the Charter is the game's least interesting moment.** That is the mechanical root of the critic's "reason to keep playing 5/10" and "pace 6/10", and a better statement of the problem than either score.

**The cause is arithmetic:** round three opens with 4.8 creatures still in hand but only 3.8 sends still affordable. The budget runs dry before the roster does.

**Two fixes measured, both failed.** More budget makes it *worse* (sendable 12 and 13 take the round-three dominant share from 50 to 58 percent: a bigger budget is spent earlier and the last round arrives emptier). A per-round cap, built as `ROUND_SEND_CAP` and shipped off, looks like a triumph on the depth gauge alone (cap 3: r3 3.28 options, 30 percent dominant) and is a disaster on every other: **downs 1.9 against a band of 3 to 5, and 87 percent of contested worlds one creature against one.** It buys decisions by starving the Clash, the exact fault passes 5 to 17 spent themselves fixing. The balance-safe cells give nothing back: cap 6 with sendable 14 holds every gauge in band and makes round three *worse* at 57 percent dominant.

**What the measurement points at, and it is now open item 1.** The game has one kind of decision, and by the last round there are few creatures and few live worlds, so the product runs out. No budget setting fixes a single-axis problem. A second axis would not run out with the roster, and two are already in the record, read and unused: **reach** (46.8 percent of creatures reach past contact, nothing uses the distance) and the **three borrowed effect kinds** (261 actions reading as plain attacks).

**A scare checked and dismissed, the fourth time this rule has paid.** The validation CLI flagged `passEarly` at 44.0 against a 47.0 mirror on one seed, a 3-point margin against a bar of 8, labelled "decorative decisions?". Pooled over five seeds at 800 matches a cell the margin is **10.00 +/- 2.16**: above the bar on the point estimate, interval straddling it. Not decorative; the flag fired on 300-match noise at +/- 6.9.

**The lesson worth keeping:** *a gauge below band tells you less than the same gauge split by when it is read.* "Option spread 2.85 against a band of 3 to 5" sat on the sheet for many passes as a mild shortfall. Split by round it is a decay from 3.9 to 2.05 with the worst value at the climax, which is a different problem with a different fix, and the split cost one probe.

**Verified:** 2059 tests green (five new), typecheck clean, build inside budgets, headless Proving green in all four configurations. The art-registry test flakes under the root runner on a `process.cwd()` path and passes 6 of 6 from its own workspace; unrelated to this pass.

### Pass 25 (2026-09-19): the second axis, found by exhausting the first

**The problem, from pass 24:** the game had ONE kind of decision, which creature at which world, and it ran out. Near-best options per decision decayed 3.9 / 2.8 / 2.05 across the rounds, with half of round-three decisions having one dominant answer.

**The design had already authorised two answers, and named the condition for each.** Both conditions measure as met:

- Option spread worsened (pass 24; pass 2 measured 5.7 near-best and 14 percent dominant, so the game got shallower as it got balanced).
- **Decided after round 1 is 47.5 / 50.7 / 48.5 percent against a band of under 35**, measured with the canonical definition.

So neither of these was a taste call, and assumption 3's sealed worlds were held at 85 percent and explicitly tentative.

**FIRST ANSWER, MEASURED AND SHIPPED OFF: cross-world projection.** A long-reach area act also catches the next world. Two findings. The lever pool's literal wording describes a creature this content cannot produce: **an area act never reaches past 2, and a reach-3 act is never an area** (joint distribution over 1519 acts: reach 0 x area 226, reach 1 x area 132, reach 2 x area 89, reach 3 x single 102, nothing above). Keyed to reach 1, where every area act projects, it fires hard - **sweep victims per match 10.2 to 14.4** - and moves no gauge at all. **Reach adds damage, and the decision is about which world to commit to.** A second axis has to change what a decision is ABOUT.

**SECOND ANSWER, SHIPPED ON: act flip.** The handler chooses which of a creature's acts it uses, at send. The condition the lever pool names is "one blow per creature measures as too little expression", and measured: every creature has three or four usable acts, **72.3 percent can offer two or more genuinely different behaviours**, and the table was reading 1519 acts across five seeds and using 435 of them.

| | round 1 | round 2 | round 3 |
|---|---|---|---|
| one locked act | 3.9 / 28% | 2.8 / 38% | **2.05 / 50%** |
| act flip | **7.5 / 16%** | **5.0 / 24%** | **3.53 / 30%** |

**Round three now offers more choice than round one used to.** It works because the axis does not deplete: the third creature of a spent roster still asks which of its behaviours the world needs. Every other gauge holds on five seeds, with `MAGNITUDE_SCALE` retuned 2.7 to 2.0 to pay for it (a handler who can choose picks an attacking behaviour more often, which took downs to 5.4-6.0 before the retune). And **the naive-policy margin was already failing on seed 55 at 5.1 points against a bar of eight** - act flip lifts it to 13.0, so this fixed a latent failure the three standard seeds were hiding.

**The bug that only paint could find.** The choice was stored on the board entry and honoured by `prepare`, and then `recomputeHoldsAtSite` called `roleOfEntry` on every company change and wrote the natural role straight back over it. The picker registered the press, the send carried the choice, the engine tests passed, and **the board still showed the old role**. Reading the send path did not find it; printing the board entry after a real click did. Pinned by a test and by `reclamation-actflip.mjs`, which now runs beside the other two checks.

**The lesson worth keeping:** *when one axis is exhausted, adding to it does nothing; the fix is a second axis that does not deplete with the first.* Budget, cap, and reach were all attempts to get more out of "which creature at which world" - more of it, less of it, further from it - and all three measured inert or harmful. What worked was a question that a spent roster can still ask.

**Verified:** 2067 tests green (eight new), typecheck clean, build inside budgets, headless Proving green in all four configurations, hot-seat green end to end, and the picker checked by paint (chose strike, strike landed).

### Pass 26 (2026-09-19): the band was measuring the wrong thing

**The gauge I named the weakest thing three passes ago is not a fault.** "Matches decided after round 1 under 35 percent" is one of the fairness bands, and the reading was 45 to 52 percent. Attacking it was next on the list.

**It has never been met, in any version of the game.** 47 percent at the base redesign, 49 in the validation report, 49.3 at this pass. A band no version has ever satisfied is more likely mis-specified than a fault that survived twenty-five passes, and that suspicion is what this pass tested rather than assumed.

**What the statistic measures is lead continuity, not decidedness.** `decidedRoundOf` asks whether the winner ever surrendered the lead. **80.6 percent of round-one scores are 2-1**, so most matches are one world being held or traded, and "never fell behind or tied" is satisfied about half the time by construction. Two matches with the same final score and the same last-round drama read completely differently depending on whether a single tie occurred.

**Two independent confirmations.** First, the thing a player actually feels is live, and it is:

| | |
|---|---|
| already clinched before the last round began | **12.7%** |
| both sides could still reach the clinch entering the last round | **77.8 / 80.8 / 79.0%** |
| final margin one world or less | **45.9%** |
| comeback from one world behind | **33.1%** (band 30 to 40: met) |

Second, the metric is insensitive to what it claims to be about. **Quadrupling the catch-up aid drags it 49.3 to 40.1 percent while the comeback rate does not move at all (30.5 to 30.7)** and both-sides-live barely moves. So the aid changes lead continuity and helps nobody come back - which is independently why the trailing bonus stays at 0, per the standing rule against gifts to the losing side.

**Shipped:** the band is withdrawn in the design doc with this evidence, `decidedRoundOf` carries the correction at its definition, `matchShapeOf` now reports `bothLiveEnteringLastRound` as the honest arc figure, and five tests pin the distinction so the two are never confused again.

**The lesson worth keeping:** *a band no version of the game has ever met is a hypothesis about the band, not about the game.* Twenty-five passes read this number and treated it as an outstanding fault, including three of mine. The cheap check is to ask what the statistic would read on a game that was obviously fine - here, a 2-1 lead held to 6-3 counts as "decided after round 1", which is enough to see the band cannot be right.

**Verified:** 2072 tests green (five new), typecheck clean, build inside budgets, headless Proving green in all four configurations.

### Pass 27 (2026-09-19): a harsher critic, and five things that were actually broken

**Ran the blind critic on the current game: 55 of 100, against 65 at pass 14.** The score went DOWN, and that is the useful outcome rather than a regression. Pass 14's critic scored mobile 3 on a bug that did not exist and missed five real faults; this one found them. A critic that reads more harshly and cites the element it is reacting to is worth more than a higher number.

**Five things it called broken. Four were, and are fixed:**

- **The dossier was two rounds stale.** On the end-of-match screen the inspector still read "KOSANOS, read on STONERA" - a creature and a world from round one, beside a Charter awarding worlds it never mentioned. `inspect` was only ever cleared by Escape or the close button, so it survived every Ruling. Now dropped when the round changes and at the match end.
- **The dossier clipped its content with no affordance.** It has always scrolled, but nothing on screen said more existed below, and a reader who cannot tell is right to call it clipped. A fading bottom edge, removed at the end of the scroll where there is nothing left to promise.
- **The draft's BEST stat misled two independent critics.** "Nine of the fifteen cards advertise BEST POSEIDAS, but round one is Zolton / Stonera / Telypso." Pass 14 answered the same complaint by putting the explanation in a `title`; a reader looking at the card still could not tell. **A tooltip is not a label.** The visible legend now reads "best of nine".
- **"12/11 BRING / SEND"** was, in the critic's words, "genuinely incomprehensible as a label". It now reads "11 sends, from 12 kept".

**One was half right, and the cause was real.** The critic said simple mode has no event history and asked for the log. It has a ticker - but at two lines, and a Ruling over three worlds produces three verdict sentences, so a simple-mode player never saw the first world of the round. Four lines is the smallest number that carries a whole Ruling.

**And one fault of my own, caught by reading the paint rather than the PASS.** My first act-flip dossier addition duplicated an existing class name and data attribute (`rec-inspect-acts`, `data-inspect-act`), so the panel rendered TWO act lists and my check read both: it printed `sweep, strike, attack, attack, attack` and still said PASS. The existing pass-7 list already named every act with its reach and footprint, which is strictly more informative than a role list, so the fix was to mark which act the chosen role uses rather than add a second list.

**The lesson worth keeping:** *a falling critic score can be the instrument improving rather than the game regressing.* The comparison that matters is not 65 against 55, it is what each run found: pass 14's three top fixes included two artifacts of my own screenshots, and pass 27's five broken items were all real. Judge a critic by whether its findings survive checking, not by the number.

**Verified:** 2072 tests green, typecheck clean, build inside budgets, all three headless checks green, and the four label and lifecycle fixes checked by paint.

### Pass 37 (2026-09-22): one screen

**Nick, after pass 36:** "The screen still immediately shifted when the first creature was put on the screen ... This is a game. You should have the game characteristics, such as one constant screen without any scrolling."

**Why pass 36 missed it.** Its check measured layout shift and nothing else. Measured this pass, seed 7: the match was 1659px tall on a 1440x900 screen (2100px on a 390x844 phone), the worlds started 580px down and the bench at 1293px. A page like that scores near zero shift while the player scrolls down to lift a creature and back up to press a world on every send, and the scroll is what reads as the screen jumping.

**What changed.** The match console is exactly the viewport, split into fixed shares: a thin masthead, a status strip of fixed height, the three worlds taking what is left, and a dock of fixed height at the bottom. Everything that used to appear as its own row now has a place that never resizes:

- the stake question, the "what just happened" callout, the first round's coaching and the hint share one message slot in the status strip;
- the ticker is the strip's last column; the next round's worlds ride on the round line;
- the bench, the Court's next-round bar and the bench during the Clash share the dock, and the Charter's report covers the table when the Proving ends;
- in simple mode the dossier is a drawer over the table, closed by lifting a creature; on a phone, advanced mode's log is set aside and its dossier is the same drawer;
- figures size to their rank (container query units, rows and columns handed over by `rankGrid`), so eleven creatures stand in the space one did, and a crowded rank prints each as its piece over one line of name and hold.

**Two behaviour fixes found on the way.** Pressing a creature already standing on a world, with a creature in hand, now sends to that world; it used to open the dossier, which the new check hit on its second send. And the balance bar, the creature's temperature band and the ghost's grid are drawn so that previewing one creature after another changes paint, never layout.

**The check now measures the promise, not a proxy.** `reclamation-shift.mjs` drives a round at six screen sizes (1920x950, 1440x900, 1536x730, 1366x650, 390x844, 375x667) and fails if the page is ever taller or wider than the screen or scrolled, if any world, bench creature, pass or next-round button is off screen, or if hovering or sending moves the layout. It walks rest, hover, four sends with the rival's answers, the Clash, the Ruling and round two. Result: fits and reachable everywhere, hover 0.0000, sends 0.002 to 0.011 (the creatures already standing on a world shrinking to make room).

**Checks adjusted, with reasons.** The proving check's 260px phone panel ceiling (pass 13) is replaced by "the table fits the phone's screen", which is what it stood in for. It also moves the pointer off the bench before reading the footings, since a resting pointer previews a creature. The act-flip check reads the board while it is in play rather than under the Charter's report, and it and the hot-seat check now ask for `?draft=1`, since pass 35 made the draft opt-in and both had been timing out on the missing draft screen since.

**Found, not fixed:** `reclamation-clash.mjs` fails its 30% motion floor at 22%, and fails identically on the pass 36 build, so it predates this pass.

**The lesson worth keeping:** *measure the promise, not a proxy for it.* "Nothing jumps" was measured as layout shift; the player's promise was "I never scroll", and a page can keep the first while breaking the second on every move.

**Verified:** 1562 web tests green on a quiet machine (the Long Return extraction test and the species-art loader test time out under load, on main as well); `reclamation-shift`, `reclamation-proving` (4 of 4), `reclamation-actflip` and `reclamation-hotseat` green against this build; paint read at 1440, 1366, 390 and 375 in rest, lifted, crowded, dossier, Clash and Ruling states, simple and advanced.

### Pass 38 (2026-09-22): the declutter pass

**Nick, after pass 37:** "there's so much on the screen, I don't even know where to go. It needs to be intuitive how to play the game ... take this as a full pass of design."

**How it was scoped so it could not stop early.** Every visible string in six states (rest, lifted, after a send, mid-round, Clash, Ruling), simple and advanced, desk and phone, was listed with a verdict (keep, cut, move to a panel, replace with a visual, reword) in `docs/design/reclamation-declutter.md`. That list was the definition of done. Then blind critics (Opus, screenshots only, no code) scored the table, two per round, eight rounds in all, each round's findings fixed before the next.

**What changed.**
- **The chrome.** The site navbar and masthead are gone from a match. The top bar is one row: Leave, the round, both scores, the turn lamp, one instruction slot, and three tools (History, How to play, Settings). How to play, History and Settings are panels over the table (`reclamationPanels.js`); Escape closes them first.
- **One instruction.** The coach strip and the ticker are cut. The slot says, in order of priority: the stake question, a callout for what the rival just did, or the one next step. The rival's last move stays in the instruction until you answer it.
- **The worlds.** A color dot and the planet name head each world; the site's place name, the temperature band and the "+X" preview are advanced only. The index box, "no one", "send here" and the three identical stake buttons are gone. A world you can press glows.
- **The stake** is one key beside Pass that opens the choice on the three worlds, with a one-row confirm.
- **The preview says what the send does at this world**, from the engine's numbers: "Downs Sonalloy", "Takes 6 off Drilltail", "No rival here to strike" (amber), "Hits 2 rival creatures, and one of yours" (amber). The role's generic sentence printed the same words on all three worlds and a base figure the matchup then changed, which two critics named the worst thing on the table.
- **The forecast is the engine's own.** New `forecastClash(state, handler)` in `expeditionRules.ts` runs the real resolve and the Ruling's bolster recovery on a copy of the board with the opponent's hidden sends removed. Each creature prints its number and where it would end ("7 →1"); each world prints its total and where it would end ("32 →20"); "you lose it" / "you down it" mark a fall; "own sweep" and "no target" say why before the Clash does. `forecastClash.test.ts` holds it to the Ruling exactly across six bot matches with nothing hidden, and checks it never reads a hidden send and never touches the state it is given. The earlier per-attack forecast marked Drilltail to fall when its slower attacker would fall first; the engine forecast cannot make that mistake.
- **Fallen creatures stay on the board** at the Ruling, greyed and struck through, so the loss can be read.
- **The squad card** names the one world the creature holds best, in that world's color (the three dots are advanced only), and a sent card names where it went. A suggested pass is the one bright key.
- **Narration** says it plainly: "sweeps every other creature here, yours too", "falls before it can attack", "finds no rival to strike", whole numbers except where tenths break a tie, and no "Proving", "Charter" or "handlers" in anything the player reads.
- **The phone.** A world with two to four of a side's creatures stands them one per row, the piece beside its name and number, with the chip on its own line; the acting creature pulses in place instead of lunging over its neighbor.
- **The log** reads in order, the present at the bottom, each round's ruling a divider, in the body face.

**Scores (blind critic, "could a first-time player tell what to do next and why").** Round 1 of this pass: simple desk 5, simple phone 3.5, advanced desk 4. Final round: simple desk 5, simple phone 4, advanced desk 6, advanced phone 4. The scores moved less than the findings did, because each round's critic grades against what it sees fresh: by the last round no critic found a number that disagreed with the Clash or the Ruling ("preview numbers match the ruling at Zolton, Stonera and Telypso"), which had been the top finding in every earlier round.

**Found, not fixed (next pass):**
1. Advanced mode on a phone still shows no speed, band or strain line; the help now says the reading is in each creature's (i). A phone form for those, or calling the mode desk-only, is the decision.
2. The empty world panel at rest is one line in a tall panel. What holding a world is worth (open item 3) is the obvious thing to put there.
3. Strain's cost is invisible in the preview: a strained creature's hold is printed but not why it is lower.
4. The advanced squad card's attribute marks still rely on their tooltips.
5. A sweep defaulting on a world with nothing to hit: the preview now says a sweep will also hit your later sends there, but the role picker's default was not revisited.

**Verified:** 186 Reclamation tests and 533 rules tests green; `reclamation-shift` (one screen, nothing moving, at every size), `reclamation-proving` (4 of 4), `reclamation-actflip` and `reclamation-hotseat` green against this build; paint read at 1440 and 390, simple and advanced, in all six states plus the stake choice and the panels.


### Pass 39 (2026-09-22): the whole game, and a preview that had been blind since pass 38

**Nick:** "Iterate on, continue improving it."

**New instrument.** Every earlier critic round saw round one only. A play-through probe now follows the table's own suggestions through all three rounds and the result, at 1440 and 390, and a blind critic read the whole arc (clarity 5 desk / 3 phone; "want another game" 3 / 2).

**The bug it found.** Pass 38's per-world preview sentence read an `effect` the match never passed to the worlds, so every strike said "No rival here to strike" and every sweep "Nothing to hit yet", including beside a rival in plain view. Nothing could have caught it: the unit tests exercised `ghostSummary` directly. Fixed (one line), and `reclamation-proving` now fails if a world with a rival on it previews "No rival here" or "Nothing to hit". Checked both ways: with the line removed the check fails at all four sizes, with it restored all four pass.

**What else changed.**
- **The last round's Ruling is seen.** The result used to cover the table the instant the final Clash ended, so the round that decided the game was the one round never shown ruled. It now rules on the board like the others, with "You win the game, 5 worlds to 4" and a See the result key.
- **The reach line counts sends.** Every world won needs a creature on it and sends are a game budget; the critic reached round three needing three worlds with two sends left while the line said three of three were there. It now calls the game lost when it certainly is (worlds you stand on, plus one per send you could still make, plus two for an unused stake).
- **A strike whose instinct picks no one** says "Its instinct would not strike Crystorn" instead of claiming no rival is there.
- **The result speaks plainly**: "You lose / The Court proctor wins", "the rival reached five first", "Play again", "creatures downed", whole numbers, "tied" for a tie; no Charter, Proving or Court. On a phone the three rounds stand side by side and the whole result fits one screen.
- **Squad cards** read "won", "spent" and "fallen" (was "holding", "away"), with titles that say what each means.
- **Phone**: the preview is the number over its sentence at every world (it was cut at the column edge); the suggested world is named in the instruction instead of a tag over the world's name; the callout drops its kicker so its sentence fits.
- **Narration**: "Shuntara blocks Venemist's attack of 12."

**Open, from the play-through critic (next pass):**
1. Following the suggestions lost 4 to 5, and round one's suggestion (Graviclaw to Zolton) was punished at once. The advisor does not see the rival's likely answer; what it recommends should be re-measured with the engine forecast.
2. The end screen tallies but does not explain why you lost (sends spent per round, the closest loss).
3. The rounds look alike: each opens on three empty panels. A round-opening line with the stakes ("Round 3: you need all three") is the cheap version.
4. Advanced mode on a phone, the empty world panel and strain in the preview (carried from pass 38).

**Verified:** 1565 web and 533 rules tests; `reclamation-shift`, `reclamation-proving` (with the new honesty check), `reclamation-actflip`, `reclamation-hotseat` green; paint read of the full play-through at 390 and 1440.

### Pass 40 (2026-09-22): each round opens on its own worlds

**From the pass 39 play-through critic:** "The rounds look the same. Each one is three empty columns with the same 'X of your N hold well here'", and the result "is a tally; it never says why you lost".

- **Best here.** An empty world names the three of your squad that would hold it best, with their holds ("Neph 15, Kosanos 14, Scalatto 12"). Each is a key that picks that creature up. The names change with every round's worlds, and a world where your best is 4 says "do not go here" without a word.
- **Each round opens on its stakes:** "Endessa, Saiphus, Luminax. Either side can win the game this round: you need 2, the rival 1. The rival sends first." (It used to read "The frame loads ...".)
- **The result names your closest loss:** "Your closest loss: Stonera, round 1, 7 to 8."
- The phone's best-here keys are 32px tall; `reclamation-proving` caught them at 26.

**Verified:** 1565 web tests; `reclamation-shift`, `reclamation-proving` (4 of 4), `reclamation-actflip`, `reclamation-hotseat` green; paint read of the full play-through at 390 and 1440.

### Pass 41 (2026-09-22): the table stops contradicting itself

**From the play-through critic after pass 40** (clarity 4 desk / 3 phone): the game "gives up on you before round 3 even starts" without saying so; the end screen's explanation was "nonsense"; a suggested card named the wrong world.

- **The round's opening tells the truth about sends.** Pass 40's stakes line said "you can win the game this round: you need 3 of these 3" to a player with 2 sends left. It now reads the same sends-aware reach as the status line, and opens on "Winning is out of reach ..." when that is so.
- **The result says why.** The clinch sentence no longer calls the widest margin "the closest of them". Instead: "You left one world empty (Luminax), and the rival took it unopposed. Your closest loss was Endessa in round 2, 11 to 13." A world counts as contested if any event at it names one of your creatures, since the judge lists only survivors and a world where all yours fell would otherwise read as empty. Headline "The rival wins." (the rival's name was used nowhere else in play); site names moved to the row titles.
- **A suggested squad card names the world it is suggested for**, not its best world.
- **A strike into an empty world** reads "Nothing to strike yet; it holds the world", not an amber warning: holding an uncontested world is often the right send.
- **Preview**: keyed per creature, so hovering creature after creature is a new preview each time; hover shift is 0.0000 at all four desk sizes (it was 0.0001, at the budget). The number's column is wide enough for "13 HOLD", and the own-sweep clause no longer opens a stray space.
- **Phone**: the round reads "Round 3/3"; the armed hint is one line ("Pick a world for Graviclaw. Zolton is suggested.").
- The honesty check in `reclamation-proving` follows the new wording, and was re-proven by removing the fix: it fails at every size, then passes with the fix restored.

**Open:** the advisor still spends a round's sends without regard to what later rounds need; measure the suggestion policy against the rivals in the simulator before changing it. Advanced on a phone, strain in the preview.

**Verified:** 1565 web and 543 rules tests; `reclamation-shift` (hover 0.0000), `reclamation-proving` (4 of 4), `reclamation-actflip`, `reclamation-hotseat` green; paint read of the full play-through at 390 and 1440.

### Pass 42 (2026-09-22): what the suggestion is worth, measured

Two play-through critics followed every suggestion and lost, and read the advice as a trap. The suggestion is `chooseSend` with the default rival, the Court proctor's own policy, so its strength is the proctor's. Measured with the simulator, 300 matches per pairing, seed 41, the suggestion policy on side A:

| against | suggestion wins | 95% CI |
|---|---|---|
| Zolto envoy | 45.3% | 39.7 to 51.0 |
| Heir of the Thousand Families | 45.0% | 39.4 to 50.6 |
| Court proctor (itself) | 50.0% | 44.3 to 55.7 |
| Syndicate broker | 49.7% | 44.0 to 55.3 |
| Windsailor crew | 49.7% | 44.0 to 55.3 |

So following the suggestions is a coin flip against every rival, and slightly worse than one against the two the ladder calls weakest. Nothing in the table was lying about this, but nothing said it either. The help now says what the mark is ("what the Court proctor would do in your seat ... it wins about half its games").

**Open, and Nick's call:** a suggestion worth following needs a stronger policy than the rivals it advises against, one that reads the rival's likely answer without seeing its hidden roster (rollouts over sampled rosters, or the engine forecast plus a one-ply rival response). The alternative is to drop the per-send suggestion and keep only the Pass suggestion, whose reasons are arithmetic.

### Pass 43 (2026-09-23): the per-send suggestion is gone

**Nick, on pass 42's open decision:** "drop it if you don't feel it is providing value."

It was not. Measured in pass 42, following it is a coin flip against every rival; three blind critics followed it and read it as a trap; and it cost three marks on the table (the squad card's outline, its "suggested" word, the world's "recommended" tag, plus a clause in the armed hint). The "best here" names on each empty world (pass 40) already give a first-timer a place to start from the creatures' own numbers without claiming to be advice. `recommendation()` now returns only a suggested pass, whose reasons are arithmetic ("keep your remaining sends for the rounds to come"). The advisor module itself is untouched, so a stronger advisor can come back through the same seam.

### Pass 44 (2026-09-23): strain says why, and advanced mode on a phone

**Strain in the preview.** A strained send's hold was lower and the meter drew the lost bulbs dim, but nothing said what the dim bulbs were, so a lower number read as a weaker creature. The preview now has a line above what the send would do: "Too cold: −7 hold" (or too hot, cannot breathe, no air, wrong medium), with the full sentence in its title. `strainCause` mirrors the engine's strain rule (breath first, then a temperature band that misses the world's by more than the comfort share, then the medium) and says nothing when the cost rounds to zero. Six unit tests.

**A phone regression found on the way.** Pass 41's desk column rule for the preview (`7.5rem 10ch 1fr`) was unscoped, so on a phone it overrode the single-column layout and pushed every preview 26 to 34px past its world's edge, where the overflow clip cut each line mid-word ("Nothing to hi"). It is now desk-only. The proving check gained a guard that the preview's text sits inside the preview's box; with the fix reverted it fails on `simple-390` naming the world and the overshoot.

**Advanced mode on a phone** (open item 4, decided rather than left): it gets a phone form, not a desk-only label. The world head already kept advanced mode's height and printed only the planet's name in it; that room now holds the temperature scale (medium glyph, bands) and its readout on a second line. Each squad card shows its speed in its free top-left corner, opposite its (i), so no card grows. The log stays behind ≡ and the attribute marks stay in the creature's reading, which the help now says.

**Verified:** 1580 web tests; `reclamation-shift`, `reclamation-proving` (4 of 4, new guard included), `reclamation-actflip`, `reclamation-hotseat` green; paint read of the strain line and the phone advanced table at 390 and 1440.

### Pass 45 (2026-09-23): the Clash is told on the world

**Open item 2, since pass 28.** Each step of the Clash was a full sentence in the top bar, a screen away from the creatures doing it, while the world's midline between the two ranks sat empty. The step is now captioned there, on the clashing world: "Hippochamp sweeps: −2 to each of 3", "Crystorn downs Kosanos", "Hippochamp hits Crystorn: −2, 8 left", each name in its side's color, so the caption needs no "your" or "the rival's" and fits a phone column. `captionEvent` builds it from the same event the log sentence comes from. The top bar now says only which world is clashing ("Zolton clashes. The fastest act first."); the full sentences stay in the log and the history. The proving check now watches the first Clash in each configuration and requires a caption inside the clashing world; with the caption switched off it fails in all four.

**Found on the way:** a creature left under half a point was narrated "stands at 0" while still standing (seed 7, round one). It now "barely stands", in the log and the caption.

**Open item 3, closed without a change.** It asked the empty world to say what holding it is worth toward the win. Since passes 39 to 41 the round's opening line says exactly that for the round ("You can win the game this round: you need 2 of these 3", or "Winning is out of reach ..."), and a staked world carries its count on its own head. Nothing world-specific is left unsaid, so a line on each empty world would repeat the opening line three times, which is the clutter pass 38 removed. Reopen it if a critic or a player misses it.

**Verified:** 1584 web tests; `reclamation-shift`, `reclamation-proving` (4 of 4, caption guard included), `reclamation-actflip`, `reclamation-hotseat` green; paint read of the Clash at 1440 and 390.

### Pass 46 (2026-09-23): the gauges re-read on new content, and a devtool bug under all of them

**Nick, 2026-09-23:** keep doing the work already identified, bigger game changes included; limited time to steer.

**Why re-read first.** Four creature content freezes (generation 0.7.0-1 to 0.7.0-4, derived acts) landed since the last full measurement, and a gauge's conclusion expires when what it measures changes.

**The bug under the gauges.** The first proctor mirror on the new content read **A 30.5 percent against B** (1000 matches, seed 7). The simulator's `--mirror` handed both sides the same array, so both sides held pieces with the same record ids, and the engine finds a creature by id across the whole board (liveness, pins, status sources, the forecast): one side's piece answered for the other's. Worse, the non-mirror path had the same fault at a lower rate: both devtools drew the two rosters from one pool independently, so about three matches in ten gave the sides a shared creature. Every simulator and validation number since the status layer carried some of this.

Fixed three ways: `createMatch` now refuses rosters that share an id (`SHARED_RECORD_IDS`), the mirror gives B the same creatures under ids of its own, and both devtools draw the second roster from what the first left. The real game was never exposed: its two draft pools are disjoint slices of one batch.

**The gauges, clean** (proctor, independent rosters, 1000 matches each on seeds 7 / 13 / 21):

| Gauge | Band | Reading |
|---|---|---|
| A win rate (seat fairness) | 50 | 49.9 / 48.4 / 52.3 |
| Round-one starter win rate | 50 | 45.7 / 48.6 / 46.8, pooled about 47: the side that sends first gives up about three points |
| Comeback (trailing after round 1) | 30 to 40 | 30.3 / 30.1 / 30.1, on the floor |
| Resolution changes the leader | 25 to 40 | 28.6 / 28.1 / 29.3, met |
| Downs per match | 3 to 5 | 5.52 / 5.17 / 5.39, **just above the band** (derived acts hit harder) |
| Option spread (validation, seed 7) | 3 to 5 near-best | 5.76 overall; 8.2 / 4.8 / 3.2 by round, one dominant option on 34 percent of round-three turns (was 50) |

The mirror (same creatures both sides) reads A 53.5 pooled: with identical creatures, speed ties are common and the tie order favors A. Real rosters rarely tie, which is why the independent-roster rate is even.

**Two readings the regenerated validation report makes that are not what they look like.**
- **The attribute lanes invert** (vitality: top quartile wins its world 47.4 percent, bottom quartile 64.4; agility the reverse). Lanes compare creatures the bot CHOSE to send where it chose to send them, so they carry the bot's selection. A causal probe (the same squad on both sides, one side's creatures given +15 in one attribute) reads vitality **+7.5 points** (60.2 against 52.7, n=3000 each): vitality helps, as it should. The full per-attribute probe is the next pass's evidence.
- **Draft: four dead species** (imprit, dromeus, akinza, avilily; kept 9 to 16 percent), all with the lowest mean hold, while their keeper win rates are 44 to 58 percent. The draft keeps 12 of 15, so the bottom three by rating are cut every time; the question is whether the rating prices what these creatures are worth, which the attribute probe answers.

**Open item 8, done.** The record schema publishes the attribute range (0 to 100), frozen with the generation release, so the game restates it and `recordAttributeRange.test.ts` fails if they disagree. The old comment's "1 to 99, the generator clamps" was wrong.

**Verified:** 587 rules tests (three new), 191 content tests, typecheck clean, web build, 199 Reclamation web tests.

### Pass 47 (2026-09-23): a blind critic plays the whole game again

**Instrument.** A new play-through probe plays a full game the way a first-timer would with what the table now offers (a "best here" pick on an empty world, else the first creature, pass when suggested) at 1440 and 390, and a blind critic (screenshots only) read the arc. Scores: clarity 5, decisions 4, the Clash 4, arc 3, want another game 5, phone 5.

**What it found, and what changed:**
- **A false "out of reach" through every Clash** (critic's third problem, and a real bug from pass 39). Once you had passed, the reach line counted no new worlds at all, so a round-one Clash at 0 to 0 said winning was out of reach. A pass closes this round only; the line now counts one new world per sendable creature in this round's empty worlds (unless you passed) and the rounds to come, and says it in fewer words so it no longer truncates. Two new tests; the first fails on the old code.
- **An empty world was a free win nobody mentioned** (first problem). The critic stacked a fourth creature on a world already won while two worlds went to the rival unanswered, and learned the rule on the result screen. During Deploy a world only the rival stands on now reads "Unopposed: the rival takes it" in your empty rank, and one only you stand on "Unopposed: yours so far".
- **The budget read as per round** (second problem). "11 sends left this game" is now "7 sends left for 9 worlds", the budget beside what it has to cover.
- **Friendly fire read as a mistake** (fourth problem). A sweep catching its own side now says so: "Voltish hits its own Hippochamp: −6, barely standing". A standing creature under half a point shows "<1" rather than "0".
- **Phone** (fifth problem): the instruction wins over the rival's last move while a creature is lifted ("Pick a world for Scalatto" had been replaced by a stale rival line); the world head drops its "20 →17" forecast, which ran off the column (the figures carry their own); the YOU chip no longer sits on a four-creature list's last figure; the intro's labels no longer run together.
- **Jargon on the intro** (clarity): "Five worlds take the Charter" is "The first to five worlds wins"; "The Charter" panel is "The game"; "to clinch" is "to win"; "sends, from 12 kept" is "sends"; "Enter the frame" is "Start the game"; the "Survey program" plate is gone; the resume line and the mode title say what they mean (the mode title still described the dropped suggestion).

**Not changed, recorded:** "every ruling reads the same" and "round three is a formality when the rival needs one of three" (arc 3). The arc problem is structural, and the next pass's measurement bears on it: speed is worth about three times any hold attribute.

**Verified:** 1589 web tests (one flaky art-registry test passes alone); `reclamation-shift`, `reclamation-proving` (4 of 4), `reclamation-actflip`, `reclamation-hotseat` green; the full play-through re-shot at 1440 and 390 and read.

### Pass 48 (2026-09-23): speed had become the whole game, and the draft could not see it

**The measurement.** Pass 46's attribute lanes were selection-biased, so this pass asked causally: the same squads for both sides, side A's creatures given +15 in one attribute, proctor against proctor, 3000 matches per row on seeds 7, 13 and 21 (`devtools/attributeProbe.ts`, now tracked). With independent squads, as in real play, at the shipped blow size of 2.0:

| +15 in | win rate change |
|---|---|
| agility or reflex (speed +7.5) | **+9.0** |
| strength | +5.3 |
| vitality (hold +0.74 after compression) | +3.1 |
| intelligence | +2.1 |
| willpower | +0.4 |
| charisma | -0.4 |
| instinct | -1.2 |

(Each row is +/- 1.8 against a baseline also +/- 1.8.) Speed decides who lands first, and at that blow size the first to land often downs the other before it acts, so the fast and fragile creatures the creature system builds were not fragile enough to pay for it. The same blow size had downs at 5.2 to 5.5 against a band of 3 to 5.

**Change 1: `MAGNITUDE_SCALE` 2.0 to 1.8.** Swept on three seeds at 1000 matches (the table is in the constant's comment). 1.8 is where downs return to the band (4.4 to 4.8) with flips still in theirs (26.5 to 27.9), the criterion pass 25 used. At 1.8, +15 speed buys 7.5 points and +15 in a hold attribute about 5.0 (vitality 4.7, resilience 5.1, endurance 5.2): speed leads hold by 1.5 to 1 per attribute point, down from 2.9 to 1. Validation, seed 7: the third round now changes the leader in 49.5 percent of games (was 43.5), and half are settled only at the final Ruling (was 43.5).

**Change 2: the draft prices speed.** The rating was mean hold plus role value, and the four species the draft never kept (dromeus, imprit, akinza, avilily; kept 9 to 16 percent) are the four fastest in the pool, with keeper win rates of 44 to 58 percent. `rateForDraft` now adds `(speed - 50) * DRAFT_SPEED_VALUE`, and 0.15 hold per speed point is the ratio the probe measured at 1.8. **Checked by outcome, not only keep rate:** a proctor drafting with the speed value beats one drafting without it **52.9 percent +/- 1.8** (3000 games, each side from its own pool, pools alternated). Dead species went from four to one (imprit, 15 percent; its keeper win rate is 52 percent, so it is still undervalued), and species outside the keep band went from 23 to 19.

**Friction for the creature system (reported, not changed):** at this table, intelligence, willpower, charisma and instinct buy between -1.2 and +2.1 points per +15, which is within noise of nothing. The intro's "Every attribute a job" names a job for each, and those jobs are real but small. Either the table gives them more to do or the claim softens. Charisma scales presences (shield and bolster), which are 16 percent of sends, so its weight is diluted by how rarely it acts.

**Not changed:** simple mode still does not print speed on the cards. The preview's forecast already includes who lands first, so its consequences are shown even when the number is not.

**Verified:** 588 rules tests (the rating test now includes speed, plus a new test that a faster copy rates higher), typecheck clean, 1586 web tests, the four table checks green, and the validation report regenerated.

### Pass 49 (2026-09-23): the Ruling says why

**From pass 47's critic** (arc 3 of 10): "every Ruling reads exactly the same: 1 world yours, 2 worlds the rival's". What differed from round to round was the why, and nothing said it: a world won by 46, two given away for nothing.

- **The stamp on each world says why:** "yours by 37", "rival's, unopposed", "tied". Unopposed means the loser sent no one. The judge's own entries leave out the downed, so a world whose defenders all fell would have read as unopposed; the verdict counts who was at the world when the Clash began.
- **The Ruling line says the round world by world:** "Round 2: Endessa yours by 37; Saiphus and Luminax the rival's, unopposed." It replaces "you took 1 world, the rival 2" in both the callout and the top line.
- On a phone the stamp may wrap to two lines.

Five new tests (`reclamationRuling.test.js`), including the fallen-defenders case.

**Open item 6, closed.** Schema 5 retired transfer, restrain and suppress as effect types; the status layer of pass 32 carries what they meant, and displace stays an attack by the base redesign's ruling (a push at a sealed world is force and nothing more). The item described content that no longer exists.

**Verified:** 207 Reclamation web tests; the four table checks green; the full play-through re-shot and read at 1440 and 390.

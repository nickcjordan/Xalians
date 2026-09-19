# Reclamation: the ownership log

Status: the running state of the game under ownership (brief: `reclamation-ownership-brief.md`). This file is the resume point. Any reset reads this first and continues at the weakest thing named below, never from scratch. Each pass appends its own section; the standing state at the top is rewritten in place.

## Standing state (after pass 5, 2026-09-18)

### Gauges, three seeds, proctor mirror

Command: `node apps/web/scripts/runNode.cjs packages/rules/src/expedition/devtools/expeditionValidation.ts --matches=200 --seed=N --only=decided`. "Before" is the code as merged at the start of pass 5 (`magnitudeScale` 1.1); "after" is the shipped setting (3.0), at 600 matches where the band is close.

| Gauge | Band | Before (7 / 13 / 21) | After (7 / 13 / 21) | Verdict |
|---|---|---|---|---|
| Resolution changes the leader at contested worlds | 25 to 40 | 13.0 / 12.5 / 12.1 | **25.6 / 27.6 / 25.4** | **MET on three seeds (was the worst gauge)** |
| Downs per match | 3 to 5 | 1.49 / 1.54 / 1.44 | **4.25 / 4.44 / 4.16** | **MET on three seeds** |
| Comeback rate | 30 to 40 | 32.5 / 33.3 / 30.6 | 25.9 / 27.1 / 30.7 | **regressed, now the weakest gauge** |
| Naive-policy regret (best naive against the mirror) | 8 or more points under | passEarly 22.0 against 46.5 | passEarly 25.5 against 50.0 | met with room |
| Option spread (near-best per decision) | 3 to 5 | 2.84, dominant 33.7% | 2.85, dominant 32.5% | unchanged, just under |
| Every role inside 40 to 60 keeper win rate | 40 to 60 | met | shield 45.6, bolster 47.5, sweep 50.6, strike 52.7 | met |
| Decided after round 1 | reported only | 41.0 / 48.5 / 44.5 | 52.5 (seed 7, 600) | reported, not targeted |

Two bands that had never been met since the base redesign are met, and the cost is one band that was met and now is not. The trade was taken deliberately: the Clash existing at all is the precondition for most of the remaining work (roles mattering, the record being read, moments a player would talk about), and the comeback gauge has a named avenue (the stake) that is now the thing to fix rather than a gift to invent.

### Why the two unmet gauges are one problem (measured, pass 5)

The earlier passes named the lever as `magnitudeScale` and the hold compression, and every sweep of those failed: scaling attacks up breaks the downs band before it moves the flip rate. The measurement below says why, and it is a structural fault rather than a scale constant.

Probe over 200 matches per seed, contested worlds only. Deploy gap is the absolute hold margin at the end of Deploy; Clash swing is the absolute change in that margin by the Ruling.

| Reading | Seed 7 | Seed 13 | Seed 21 |
|---|---|---|---|
| Median deploy gap | 4.6 | 4.7 | 5.0 |
| Median Clash swing | 2.6 | 2.7 | 2.4 |
| Clash swing exceeded the gap | 37.6% | 35.3% | 34.1% |
| Contested worlds where the Clash moved nothing at all | 10.1% | | |
| Swing extended the deploy leader against eroded it (seed 7) | 624 to 614, mean signed +0.09 | | |
| Contested worlds that are one creature against one | 61.9% | 61.4% | 62.5% |
| Resolve mattered by crowd: 2 present / 3 / 4 or more | 14.9% / 16.0% / 22.1% | 14.4% / 17.4% / 17.0% | 13.1% / 17.1% / 19.7% |

Three facts follow, and they are the pass-5 diagnosis:

1. **The Clash is about half the size of the gap it must cross.** A median swing of 2.6 against a median gap of 4.6 caps the flip rate at the roughly 35% of worlds where the swing is even large enough, and a flip additionally needs the swing to run the right way, which halves it again to the roughly 13% observed. The observed rate is therefore close to the arithmetic ceiling of the current design, and the gauge cannot be reached by tuning the size of attacks.
2. **The Clash is directionless.** It extends the deploy leader almost exactly as often as it erodes it (624 to 614, mean signed swing +0.09). Both sides subtract from each other's hold, so the net effect largely cancels. This is why raising `magnitudeScale` does not move the flip rate: it scales both sides equally and reaches only the downs gauge.
3. **Creatures rarely meet.** 62% of contested worlds are one creature against one. Resolve-mattered does rise with the crowd, from 14.9% at two present to 22.1% at four or more, but it never reaches the band even at four, so stacking is not the fix by itself.

The underlying cause is that **hold does double duty as both the score and the health bar**. Damage is subtracted from the same number that decides the world, so an attack moves the score symmetrically with the enemy's reply and the Clash reads as noise on the deploy margin rather than as an event. Any fix that separates what a creature contributes to the claim from what a creature can absorb attacks all three facts at once. That is the pass-5 design target.

### What the game does not read of the record (inventory, pass 5)

The game reads schema 4 through `packages/content/src/abilityCompatibility.ts`, which projects each action onto one of sixteen legacy keys. Measured over the seed-7 pool of 400 records (32 species, release generation-0.5.0-4, schema 4.0.0):

- **`historicalCategory` throws zero times** on the current content. The "cannot be fielded here" path the brief requires is therefore not yet exercised by real content, but it must exist before any new effect family ships.
- **1384 actions carry seven effect kinds**: harm 771, restrain 171, protect 140, displace 128, transfer 84, suppress 49, restore 41. The game gives distinct meaning only to harm (attack), protect (shield) and restore (bolster). **Restrain, displace, transfer and suppress, 432 actions or 31% of the pool's repertoire, read as plain damage or as nothing.**
- **`spatial.range` is entirely unread**: 883 actions are contact-only, 159 short, 92 medium, 250 self or none. Reach exists in the data already and is the second dimension the brief asks about.
- **Area footprint is read only as the sweep or strike split**: 226 radial-medium, 124 sweep-small, 85 cone-medium, 949 none. Shape and extent are discarded.
- **Passives are ignored**, but there are only 13 on 400 records, all `protect`, so the cost of ignoring them today is near zero. This is the cheapest of the record-reading gaps and the last to matter.
- **Delivery mode is read only through the legacy key**: contact 883, field 155, stream 113, signal 74, pulse 71, projectile 64, self 24.

### Open items, ranked (resume here)

1. **The stake has become a coin flip, and comeback is under its band.** These are one problem. With a Clash that moves worlds, a deploy-time hold edge no longer predicts who holds one, so the staker now wins its staked world 47.4 percent against 50.0 on its unstaked worlds (it won 61.7 against 48.7 at the old scale), and the comeback rate it was meant to serve fell to 25.9 to 30.7 percent. Re-sweeping `STAKE_THRESHOLD_BEHIND` (4.4, 5.5, 6.5, 8.0 at 600 matches on three seeds) is non-monotonic and does not resolve, so the threshold was left alone. The fix is not a bigger number: either the stake reads something the Clash cannot erase (the creatures already standing at a world rather than the roster's fit for it), or the comeback avenue becomes a different chosen risk. **No gift to the trailing side under any circumstances.**
2. **Read the record as it is now.** Replace the legacy projection at its three call sites in `creatureOnTable.ts` with a reading of effects, range and area; give restrain, displace, transfer and suppress one legible table meaning each, or mark the creature unavailable. Reach is the most promising unused signal, and now that the Clash decides worlds, a second dimension on it has something to bite on.
3. **Intelligence and charisma read negative within presences** (charisma -15.2, intelligence -9.7). Lever: what `rateForDraft` and the bot's role value count.
4. **Fire is a dead element and dromeus a dead species** in the draft.
5. **Bolster recovery and the instinct lanes still move nothing under ablation.** (The bolster ROLE now does, as of pass 5 — the bigger Clash gave it something to do.) Each of the remaining two earns its place or goes.
6. **No human has played a full Proving** under the current rules. Notes and telemetry hooks exist and are empty. The Charter's notes panel is verified present and rendering at both widths.
7. **Hot-seat** is unbuilt and is the cheapest validation instrument the game can have.
8. **Affordance and comprehension are unmeasured.** The prediction-protocol harness does not exist.

### Findings from the headless check (pass 5, recorded not fixed)

The check plays a whole Proving in both views at 1440 and 390 and all four configurations pass with zero page errors, zero console errors and no horizontal overflow. Three things it surfaced that are not failures but are worth a pass:

- **`?view=advanced` does not switch the view.** The masthead still lights SIMPLE when the URL asks for advanced, so the two views could only be told apart by clicking. The check drives both and they behave identically, which is itself the finding. Low cost, and it blocks per-view verification.
- **On 390 the three worlds stack to full height above the bench**, so lifting a creature and then pressing a world is a long scroll in both directions. This is the open item the rulebook already carries ("on a phone the three sites stack above the deploy panel, so choosing means scrolling"); the check now has the screenshot that proves it.
- **A dossier panel in the rail can intercept a press on a world**, which the check works around with a forced click. On a real screen that is a press that does nothing.

### Verification run each pass

1. `npm test` at the root (1785 tests across the three workspaces).
2. `npm run typecheck -w packages/rules`.
3. The validation tool on seeds 7, 13 and 21.
4. `npm run build -w apps/web` (enforces the bundle budgets).
5. `npx vite preview --port 4173 --host 127.0.0.1` from `apps/web`, then `node apps/web/scripts/reclamation-proving.mjs` (added in pass 5; a whole Proving in both views at 1440 and 390, screenshots, overflow and console assertions).

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

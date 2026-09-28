# Reclamation: support that carries weight (pass 69)

Status: shipped in pass 69 (guard, keep clear, mend in the fight; cross-world projection removed). The support creature's reach is a proposal waiting on Nick, measured below.

## The request

Pass 68 made temperature weigh a tenth, and the bolster lost its main job: lifting a struggling ally one grade. Bolster keepers fell to 35 to 37 percent. I put five options to Nick, and he answered each one (2026-09-28):

1. **Reach every world you hold this round:** "I'd consider this, but I feel like it should be presented differently. Instead of placing the support creature on one world and their moves affecting another world. Maybe we rethink this in a way where support creatures are not necessarily on any individual world, and we just kind of abstract that away to imply that they are providing their support from a distance." On the area attacker's reach to the next world: "I don't think I want that in place. I don't think a splash on one world makes sense to splash over to the next world."
2. **Pass its guard to allies:** "definitely something worth putting in place to see how things are affected."
3. **Allies shrug off statuses:** "that's a big part of what 'support' generally implies so I think it could work."
4. **Heal during the fight:** "since we have the clash phase expanding now so that the battles play out fully. I think the healing probably makes more sense than it did before."
5. **More statuses in play:** "hold it, let's see what the other changes look like first."

## What changed

A support creature (the bolster) covers its own side at its own world, itself included, while it stands. For the creatures it covers:

| Job | Rule | Lever |
|---|---|---|
| **Guard** | Every blow on them lands at three quarters. Guards do not stack. | `SUPPORT_GUARD` 0.75 |
| **Keep clear** | They shrug off weakened (half power) and held (no swing). Harm statuses still bite, since the blow that carries them has landed. | `SUPPORT_STEADIES` on |
| **Mend** | At its own turn in each exchange, in speed order like a blow, it mends the covered creature closest to falling. The amount is its heal (or its strongest act, when the record carries no heal), times its charisma. It mends at full strength however hurt it is, and never more than that creature lost. | `SUPPORT_MEND` 1 |

The following are unchanged:
- The Ruling's recovery (half of what the fight took, `BOLSTER_RECOVERY`).
- The strain lift.
- The flat +1 (`BOLSTER_FLOOR`).

The in-fight mend replaces the between-exchanges recovery that pass 56 added.

**Cross-world projection is gone.** Pass 25 built it and shipped it off because it moved no gauge. It was already off, so nothing plays differently: the code, the rule fields and the constant are deleted. The measurement stays in the ownership log's pass 25 entry.

**One place decides the reach.** `supportAt` in `expeditionRules.ts` answers "who covers this creature?" for all three jobs. Changing the reach (below) is one edit there, plus the Ruling, the targeting and the table.

## On the table

- **A guarded blow** reads before and after, on the world: "Your Scalatto strikes Bioflim: −11→8 guarded, 5 left". The log says "for 8 (guarded from 11)".
- **A mend** is a beat of its own, at the mender's turn: "Bioflim mends itself: +7, 12 left", or "Kosanos mends Tizzie: +5, 9 left". The flash over the creature reads "+7".
- **A status kept clear** is a beat: "Kosanos keeps Tizzie clear: no restrained". The flash reads "clear". I chose "keeps clear" over "steadies" because pass 62 already uses "steadies" for the strain lift.
- **The words under a lifted creature** name each job with its number: "your Kosanos's guard takes 3 off; your Kosanos keeps it clear: no restrained; your Kosanos mends 4".
- **The role sentence** (card title, dossier, preview): "Guards yours here (a quarter off every blow), keeps them from being weakened or held, and mends the one closest to falling for N".
- **How to play** says the same.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Guard is a flat quarter off every blow, not only the first | 70%: one rule a player can check against every number; "first blow only" would need a per-creature counter on the table | sweep below: guard alone moves bolster keepers about 2 points |
| 2 | Keep clear covers weakened and held, not harm | 75%: those two take the fight away from a creature; harm is part of a blow already landed | `statusLayer.ts` concepts |
| 3 | The mend goes to the creature closest to falling, not the most damaged | 70%: "keeps one ally from falling" was the pitch Nick agreed to | the proposal (option 4) |
| 4 | A hurt mender mends at full strength | 80%: priced like a blow it spiralled, and bolster keepers fell to 26 to 30 percent | sweep below |
| 5 | The whole mend (share 1), not half | 75%: 0.5 and 0.75 left bolster keepers at 30 to 39 percent | sweep below |
| 6 | A support creature with no heal mends with its strongest act | 60%: 46 of 84 support creatures in a 960-record sample carry no heal and are support by archetype; the alternative is re-rolling them as strikers | `_bolsterPool` probe |
| 7 | Keep the Ruling's recovery and the strain lift for now | 55%: removing them is a separate question, and the reach proposal changes both | this doc, next section |

## Measured

**What statuses do today** (600 simulated games). Only 2 to 3 statuses land per match, out of about 31 blows. A creature is held out of its swing 0.2 to 1 times per match. At a support creature's world, 0.14 to 0.24 statuses land on its allies. Keeping them clear is right for what support means, and small in the numbers.

**Why support was weak, beyond temperature: it stands alone.**
- Over half of all sends stand alone at their world.
- The average creature shares its world with 0.46 of its own side.
- A support creature shares its world with 0.31.

Everything a support creature does at its own world lands mostly on itself.

**The sweep** (300 matches, seeds 7 / 13, bolster keeper win rate):

| Setting | Bolster keepers |
|---|---|
| None of pass 69 (old recovery, no guard, no keep clear) | 36.7 / 37.3 |
| Guard and keep clear, old recovery | 36.3 / 33.4 |
| Everything, mend 0.5, hurt mends less | 30.0 / 25.2 |
| Everything, mend 1, hurt mends less | 35.2 / 31.2 |
| Everything, mend 0.75, full strength | 39.4 / 33.9 |
| **Everything, mend 1, full strength (shipped)** | **44.0 / 39.0** |
| Everything, mend 0.5 to every covered creature | 32.2 / 26.5 |

**Shipped, 500 matches:**

| Gauge | Band | Pass 68, seed 7 / 13 | Pass 69, seed 7 / 13 |
|---|---|---|---|
| Round-one starter wins | about 50 | 48.2 / 50.4 | 47.0 / 51.0 |
| Comeback | 30 to 40 | 29.4 / 29.0 | 26.7 / 31.3 |
| The Clash changes the leader | 25 to 40 | 31.7 / 30.6 | 26.7 / 27.3 |
| Downs per match | reported | 8.90 / 8.73 | 8.34 / 8.28 |
| Strike keepers | 40 to 60 | 67.0 / 63.2 | 65.2 / 62.8 |
| Sweep keepers | 40 to 60 | 51.5 / 54.0 | 53.3 / 55.3 |
| Shield keepers | 40 to 60 | 50.7 / 51.2 | 51.9 / 51.2 |
| **Bolster keepers** | 40 to 60 | 35.2 / 37.0 | **43.2 / 39.0** |

- **Fights are no longer.** Exchanges per fought world are 2.3 either way. A world runs to the twelve-exchange cap 1.6 to 1.8 percent of the time now, against 2.2 to 2.6 before.
- **The world a support creature stands on** is now won 39 to 43 percent of the time, up from 35 to 37.
- **The round is not.** A side that fields a support creature in a round wins 48.6 / 47.3 percent of that round's worlds, against 50.3 / 50.8 when it does not. A send that holds a little and strikes nothing still costs its side a world's worth of pressure, because it is alone.

## Support from a distance: the proposal

Nick's direction was that support creatures are not on any one world and support from a distance. I built it as a throwaway prototype, measured it, and removed it. Nothing of it ships.

**The rule as prototyped:**
- A support creature is sent to your side for the round, not to a world.
- It covers every creature of yours on all three worlds that round:
  - its guard on every blow they take;
  - keeping them clear;
  - its mend at its own turn in each world's fight.
- It holds nothing at any world, and no rival can strike it.

**Measured** (500 matches, seeds 7 / 13, the bot not taught to value it):

| | At its world (shipped) | From a distance (prototype) |
|---|---|---|
| A side's share of a round's worlds, with a support creature that round | 48.6 / 47.3 | **53.7 / 49.5** |
| The same side, without one | 50.3 / 50.8 | 46.6 / 47.7 |
| The Clash changes the leader | 26.7 / 27.3 | 32.8 / 33.5 |
| Downs per match | 8.34 / 8.28 | 7.55 / 7.37 |

From a distance, a support creature is worth something to the round for the first time: its side does 2 to 7 points better that round than without one. At its own world, it does 2 to 3 points worse.

**How it would read on the table.** Each side's row sits at its edge (pass 65). A support creature sent for the round would stand in that row, beside your pennants, with its guard and mend numbers, and a thin line or mark on each world it covers. Nothing about it would sit on a world.

**Questions the proposal settles only with Nick:**
1. **Whether it can be struck at all.** The prototype says no, and its price is that it holds nothing. The other reading lets a rival spend a send to reach it.
2. **One per side per round,** or several with guards that do not stack. I would start with one.
3. **Whether the strain lift and the flat +1 go.** They are world-bound ideas, and with three clear jobs the support creature is easier to explain without them.
4. **What it is called** in the game's world: your corner, your camp, the relay.

## Verified

- **Rules:** all 652 tests pass (on the Mac mini). Eight new ones in `supportCarriesWeight.test.ts`:
  - the guard and its number;
  - no guard without a support creature;
  - keeping clear, and the bind taking the swing without it;
  - the mend's target and turn;
  - the mend lever;
  - the forecast's guard facts.

  The pass 56 test now checks that the mend lands inside the exchange. The forecast toll test runs ten seeds, since the rarer "lift lost with a fallen ally" case needs more than five. The typecheck is clean.
- **Web:** all 265 Reclamation tests pass. New tests cover the guarded caption and sentence, the mend and self-mend captions, the kept-clear caption, and the forecast words.
- **Table checks:** proving (1440, 1366 and 390, both views), shift, actflip, hotseat and clash all pass.
- **Paint:** at 1366 by 768 and 390 by 844, "−11→8 guarded, 5 left" and "Bioflim mends itself: +7, 12 left" sit on the clashing world. At 390 the guarded caption wraps to two lines inside the column.
- **The critic's capture now waits for the Ruling.** It missed the Ruling this pass: a fight to the end outlasted the 260 polls it waited. It now waits up to 900.
- **Three quarters on a card is written ×0.75.** At a card's mark size the font's ¾ reads as "%", and the critic read "×%".
- **Each card's factor now stacks under its mark.** Since pass 68, "×0.9" (30 pixels) had run into the next 23-pixel column at 1366. An overlap check over every card at 1366 and 1440 finds none now, where the live site had three. Every card reserves the two lines, so the bars keep one height across the bench.
- **The blind critic** (Opus, seed 21, overdue since pass 68) scored clarity 6, decisions 5, Clash 4, arc 4, another game 4, phone 5, numbers 4, feedback 6. Its capture's harness spent 8 of 11 sends in round 1. The scores and problems are in the ownership log.


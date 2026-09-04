# Tribute: design-completion supplement

**Status:** recommended rules baseline for the first playable  
**Purpose:** completes the open design in `xalians-card-game-spoke-brainstorm.md`; it does not change creature generation, creature sheets, ownership, or the Duel spoke.

## Executive decision

Tribute should ship first as a **12-card, 180-Battle-Fee, best-of-three card-economy game**. Its load-bearing mechanics are permanent passing, a hand that lasts the match, three stat-driven Theaters, the existing `canFly`/`attackRange` traits, and a small symmetric Condition system. Gambits and every derived keyword wait until the base pass game is demonstrably balanced.

| Rule | First-playable value |
|---|---:|
| Creature deck | Exactly 12 unique owned Xalians |
| Battle Fee limit | 180 |
| Planet cap | 4 Xalians per planet |
| Opening hand | 10 creatures |
| Mulligan | Up to 2 creatures, once |
| Condition loadout | 2 distinct Decrees from the 6-card Standard set; separate from the creature deck |
| Bouts | Best of 3; first to 2 |
| Theaters | Vanguard, Skirmish, Bombard |
| Base card power | 2–10 |
| First-player offset | +1 Court Favor for that Bout |
| Target match time | 8–12 minutes versus the bot |

“12–15 cards” is not retained. With a ten-card opening hand and no later draw, a 12-card deck is more consistent than a 15-card deck and pays less total Battle Fee; there is no compensating advantage to bringing 13–15. An exact size makes the budget comparable and the draw odds legible.

## 1. Real-data audit

All calculations below use the 25 records in `my-app/src/json/mock/xalianSamples.json`, the 29 species in `lambda/src/json/species.json`, the element data and matrix under `lambda/src/json/`, and the allocation path in `lambda/src/ai.js`.

`populateStats()` allocates eight generated stats. It separately budgets four primary ratings and four secondary ratings around “medium,” then rolls points inside overlapping rating ranges. `healthPoints` is currently fixed at 999 and is not one of those eight allocations. This is why health must not affect Battle Fee: today it would add the same amount to every creature.

| Quantity across the 25 samples | Min | Q1 | Median | Mean | Q3 | Max | Population SD |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sum of 8 allocated stats | 3,096 | 3,484 | 3,652 | 3,664.6 | 3,879 | 4,225 | 277.2 |

The raw total varies, but not enough to create a useful roster economy by itself. More importantly, it does not price *where* the points are. A card with two extreme peaks is more reusable across Xalian games than an evenly distributed card with the same total, so the canonical fee should charge for concentration.

## 2. Canonical Battle Fee

### Formula

Use the eight allocated point values and exclude fixed health.

| Symbol | Definition |
|---|---|
| `T` | Sum of the eight allocated stats |
| `H` | Sum of the two highest allocated stats |
| `D` | Concentration delta: `H − T/4` |
| `Rmax` | Highest rating among the creature’s four moves |
| `A` | Set of valid attack types on the sheet: primary type, secondary type, and any typed move elements |
| `C` | Number of the 14 defending elements for which `max(matrix[a][defender]) > 1` over `a ∈ A` |

Use round-half-up everywhere that a rule says “round.”

```text
StatBase          = floor(T / 500 + 0.5)
SpecialistPremium = ceil(D / 100)
FlightPremium     = canFly ? 2 : 0
RangePremium      = low: 0, medium: 1, high: 2
MovePremium       = clamp(floor((Rmax - 11) / 2), 0, 2)
CoveragePremium   = clamp(floor((C - 5) / 2), 0, 2)

Battle Fee = StatBase + SpecialistPremium + FlightPremium
             + RangePremium + MovePremium + CoveragePremium
```

Why these terms are present:

- `StatBase` preserves the glossary’s promise that stronger raw sheets cost more.
- `SpecialistPremium` is the discriminator the raw total lacks. Two peaks are charged because both Duel and Tribute can turn a peak into a decisive role. A perfectly even sheet pays zero concentration premium.
- Flight costs 2 because it is scarce (6 of 29 species) and removes placement/path restrictions in both known spokes.
- Range costs at most 2. It matters, but it is narrower than flight.
- Move and element coverage cost only 0–2 each. They recognize real combat utility without letting element lottery overwhelm stats. In these 25 samples, typed moves add no third attack type beyond the creature’s two native types, but the definition remains valid if future generated records do.

This is a canonical *capability* fee, not a promise that every point of fee is equally useful in every spoke. Tribute may underuse a high-defense specialist in v1 while Duel may underuse a recovery specialist; that cross-spoke difference is desirable trading texture.

### Result over all 25 real samples

`V/S/B` is the creature’s potential Vanguard/Skirmish/Bombard printed power under the card curve in section 3. Bombard eligibility is still governed by range/flight.

| # | Xalian | Elements | `T` | `D` | Fly / range | `Rmax` | `C` | Fee | V/S/B |
|---:|---|---|---:|---:|---|---:|---:|---:|---|
| 1 | Xylum | Plant/Psychic | 4,225 | 442.8 | no / medium | 11 | 7 | **15** | 8/7/7 |
| 2 | Dromeus | Fire/Water | 3,448 | 521.0 | no / low | 11 | 8 | **14** | 8/7/5 |
| 3 | Tetrahive | Dark/Water | 3,528 | 301.0 | yes / low | 13 | 7 | **15** | 6/4/5 |
| 4 | Bioflim | Chemical/Dark | 3,484 | 324.0 | no / low | 10 | 6 | **11** | 6/3/4 |
| 5 | Smokat | Ghost/Plant | 3,712 | 654.0 | no / low | 12 | 7 | **15** | 9/8/3 |
| 6 | Newtapede | Water/Psychic | 3,812 | 705.0 | no / low | 13 | 7 | **18** | 5/6/10 |
| 7 | Voltish | Electric/Ghost | 3,225 | 646.8 | no / medium | 13 | 9 | **17** | 4/6/9 |
| 8 | Tizzie | Psychic/Plant | 3,657 | 583.8 | no / medium | 12 | 7 | **15** | 5/6/9 |
| 9 | Crystorn | Light/Psychic | 4,125 | 547.8 | no / medium | 14 | 6 | **16** | 4/3/7 |
| 10 | Luceras | Air/Rock | 3,392 | 392.0 | yes / low | 14 | 7 | **15** | 5/4/7 |
| 11 | Codazzo | Rock/Plant | 3,497 | 498.8 | no / high | 11 | 8 | **15** | 4/3/7 |
| 12 | Figzy | Psychic/Chemical | 3,986 | 532.5 | no / high | 11 | 8 | **17** | 5/8/9 |
| 13 | Foromeer | Metal/Rock | 4,101 | 470.8 | no / low | 11 | 6 | **13** | 6/4/5 |
| 14 | Venemist | Chemical/Ghost | 3,643 | 669.2 | no / medium | 13 | 10 | **18** | 6/4/5 |
| 15 | Kosanos | Plant/Psychic | 3,890 | 490.5 | no / medium | 13 | 7 | **16** | 7/5/3 |
| 16 | Imprit | Fire/Air | 3,761 | 604.8 | no / low | 14 | 9 | **18** | 4/3/9 |
| 17 | Scalatto | Sand/Chemical | 3,096 | 304.0 | no / low | 15 | 8 | **13** | 4/4/5 |
| 18 | Akinza | Ice/Chemical | 3,617 | 348.8 | no / low | 11 | 5 | **11** | 5/6/6 |
| 19 | Avilily | Plant/Fire | 3,416 | 476.0 | yes / low | 13 | 10 | **17** | 4/7/5 |
| 20 | Thirstaserp | Sand/Fire | 3,879 | 353.2 | no / low | 12 | 7 | **13** | 7/7/7 |
| 21 | Graviclaw | Dark/Ghost | 3,652 | 561.0 | no / low | 13 | 9 | **16** | 6/6/2 |
| 22 | Yetimoth | Ice/Chemical | 3,690 | 372.5 | no / low | 15 | 5 | **13** | 6/5/7 |
| 23 | Chromocat | Light/Psychic | 3,341 | 800.8 | no / low | 12 | 6 | **16** | 4/9/3 |
| 24 | Ectoghoul | Ghost/Light | 3,521 | 595.8 | yes / medium | 13 | 9 | **19** | 5/9/6 |
| 25 | Hippochamp | Water/Chemical | 3,917 | 407.8 | no / high | 10 | 8 | **16** | 5/7/7 |

| Fee result | Min | Median | Mean | Max | Population SD |
|---|---:|---:|---:|---:|---:|
| 25 samples | 11 | 15 | 15.28 | 19 | 2.07 |

The fee’s Pearson correlation is only **0.061 with raw total** and **0.590 with stat coefficient-of-variation** in this sample. That is the intended behavior: total still matters, but specialist shape actually creates the price spread.

### Deck budget

There are 5,200,300 distinct 12-card subsets of the 25-card sample. Exhaustive enumeration produces:

| Fee cap | Legal 12-card subsets | Share of all subsets |
|---:|---:|---:|
| 174 | 243,282 | 4.7% |
| **180** | **1,549,701** | **29.8%** |
| 186 | 3,740,860 | 71.9% |
| 192 | 4,986,265 | 95.9% |

The cheapest possible sample deck costs 163, the mean 12-card subset costs 183.36, and the most expensive costs 204. **Use 180.** It allows many builds but rejects “take all the premium specialists.” At 186 the constraint already permits nearly three quarters of possible sample decks; at 192 it is decorative.

The planet cap does not affect this enumeration because no planet has more than three representatives in the 25-card mock pool. It must be tested with synthetic/real collections that contain deeper same-planet ownership.

If a later format truly needs a different exact deck size, set its cap to `15 × deck size` as the starting calibration (195 for 13, 210 for 14, 225 for 15). Do not allow a variable size inside one format.

## 3. Card value curve

### Actual distributions

Quartiles use the 25-value ordered samples for each stat.

| Theater stat | Min | Q1 | Median | Mean | Q3 | Max | Population SD |
|---|---:|---:|---:|---:|---:|---:|---:|
| `standardAttackPoints` | 315 | 397 | 485 | 505.7 | 554 | 812 | 140.9 |
| `speedPoints` | 212 | 325 | 531 | 513.6 | 667 | 886 | 191.6 |
| `specialAttackPoints` | 96 | 418 | 543 | 545.2 | 649 | 957 | 215.4 |
| All 75 theater values | 96 | 388.5 | 518 | 521.5 | 647 | 957 | 186.1 |

### Recommended mapping

```text
PrintedPower(points) = clamp(1 + floor(points / 100), 2, 10)
```

| Stat points | Printed power |
|---:|---:|
| 1–199 | 2 |
| 200–299 | 3 |
| 300–399 | 4 |
| 400–499 | 5 |
| 500–599 | 6 |
| 600–699 | 7 |
| 700–799 | 8 |
| 800–899 | 9 |
| 900–999 | 10 |

This is intentionally banded rather than curved. A high-range roll is generally two printed points above a medium-range roll, while adjacent rolls remain easy to compare. The floor of 2 prevents a legal Xalian from feeling like blank cardboard; the ceiling of 10 gives the UI one digit almost everywhere and preserves an obvious maximum.

| Printed power | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Count among all 75 theater values | 1 | 7 | 13 | 15 | 13 | 14 | 4 | 7 | 1 |

Mean printed values are 5.52 Vanguard, 5.64 Skirmish, and 6.08 Bombard; the combined mean is 5.75. A normal Bout in which a player commits 3–5 creatures therefore lands around **17–29 Tribute** before Conditions. A 9–10 point creature matters, but it does not beat a normal committed board alone. This smaller scale is appropriate: Tribute has only ten hand cards for the whole match, not Gwent’s much larger unit density.

Placement remains:

| Theater | Printed stat | Eligibility |
|---|---|---|
| Vanguard | `standardAttackPoints` | All creatures |
| Skirmish | `speedPoints` | All creatures |
| Bombard | `specialAttackPoints` | `attackRange` medium/high, or `canFly` |

Flight does **not** add power. It only lets a low-range flier enter Bombard. That keeps the trait premium in deck construction instead of double-charging it on the board.

## 4. Conditions: the real set

### Resolution rule

A Condition is an element-typed **Court Decree** affecting one Theater symmetrically. For Condition element `e` and a creature with primary `p` and secondary `s`:

```text
conditionMultiplier = (matrix[e][p] + matrix[e][s]) / 2
conditionedPower    = floor(PrintedPower × conditionMultiplier + 0.5)
```

Always average both types. The brainstorm’s “average only when primary is weak” rule makes secondary types strictly upside and creates a hidden branch in arithmetic. The unconditional average is predictable and permits a secondary type to be either hedge or liability. Replacing a Condition immediately recalculates every creature in that Theater. Only the final per-card result rounds; never round the multiplier or row subtotal.

A matrix zero fully blanks a dual-type creature only when **both** types are zero against that Condition. In the full matrix this can happen only for Electric against Rock/Sand or Chemical against Light/Ice. That is one reason those two Decrees are excluded from Standard.

### Matrix audit and ranking

Every matrix row has a uniform-element mean of exactly 1.0, so mean strength cannot select good Conditions. The important measures are breadth and swing: how many matchups are non-neutral, how many double, and how many hard-zero.

| Rank | Planet Decree | Element | 0× | 0.5× | 1× | 1.5× | 2× | Non-neutral | Decision |
|---:|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | **Floria Worldbloom** | Plant | 1 | 4 | 4 | 4 | 1 | 10 | Standard; broad but graduated |
| 2 | **Poseidas Death Tide** | Water | 1 | 3 | 6 | 3 | 1 | 8 | Standard; ideal baseline profile |
| 3 | **Stonera Jorian Rain** | Rock | 1 | 3 | 6 | 3 | 1 | 8 | Standard; same count profile, different targets |
| 4 | **Telypso Dreamwake** | Psychic | 1 | 3 | 6 | 3 | 1 | 8 | Standard; same count profile, different targets |
| 5 | **Saiphus Benthane Gale** | Air | 1 | 3 | 5 | 5 | 0 | 9 | Standard; smooth upside, no doubles |
| 6 | **Veridium Ironwake** | Metal | 1 | 4 | 5 | 2 | 2 | 9 | Standard; upper edge of acceptable swing |
| 7 | Krystos Whiteout | Ice | 1 | 3 | 7 | 1 | 2 | 7 | Reserve; too polarized for the small set |
| 8 | Endessa Glasswind | Sand | 0 | 3 | 8 | 3 | 0 | 6 | Reserve; too weak to justify a turn often enough |
| 9 | Luminax ION-9 Flare | Light | 1 | 4 | 6 | 0 | 3 | 8 | Disabled; binary, three doubles and no 1.5× |
| 10 | Grimedes Eventide | Dark | 1 | 4 | 6 | 0 | 3 | 8 | Disabled; binary, three doubles and no 1.5× |
| 11 | Zolton Bloodstorm | Electric | 2 | 2 | 6 | 2 | 2 | 8 | Disabled; Rock/Sand duals can be zeroed |
| 12 | Drainov Fallout | Chemical | 2 | 4 | 3 | 2 | 3 | 11 | Disabled; two zeroes plus three doubles |
| 13 | Magmuth Ashfall | Fire | 1 | 6 | 2 | 2 | 3 | 12 | Disabled; affects almost everything, usually a board reset |
| 14 | Phantiri Dreadscape | Ghost | 1 | 5 | 2 | 5 | 1 | 12 | Disabled; only two neutral matchups, too much arithmetic |

There are **six tournament-legal Conditions in v1**. The other eight names exist as design reserve, not player-selectable content. Zolton Bloodstorm is the clearest degenerate Condition despite its excellent lore: its two zeroes permit an actual dual-type blank. Sand is the opposite failure—it seldom changes enough to spend a turn on. Fire and Ghost are not numerically biased, but changing 12 of 14 elements makes every row harder to read.

### Condition economy

- Each deck registers **two distinct Standard Decrees**. They are outside the 12-creature deck, cost no Battle Fee, and are public at match start.
- Each Decree may be played once per match. Playing one consumes the player’s turn just like playing a creature.
- Each player may play at most **one Decree per Bout**.
- A Theater holds at most **one active Condition**. A new one replaces and spends the old one.
- Because each player gets at most one Condition play per Bout, at most **two Conditions can be active at once** across the three Theaters.
- Conditions expire at Bout end. A spent Decree does not refresh.
- Passing ends all action for that player, including Decrees.

These rules retain symmetric weather pressure without diluting the ten-card hand or allowing all three rows to become modifier puzzles.

## 5. Complete first-playable match procedure

### Deck registration

1. Register exactly 12 distinct owned `xalianId` values.
2. Total Battle Fee must be 180 or less.
3. At most four may share a home planet.
4. Register two distinct Standard Decrees.
5. Both creature rosters, fees, planet counts, and Decree loadouts are public. Draw order and hands are hidden.

Rank/tournament tier must **not** raise a player’s budget inside the same queue. A higher cap is a separate named format with separate matchmaking. Account progression may unlock cosmetics, events, and formats; it must not quietly buy a stronger Standard deck.

### Setup and mulligan

1. Shuffle the 12 creatures with a match seed and draw 10.
2. Each player may set aside zero, one, or two cards simultaneously.
3. Draw the same number from the remaining deck, then shuffle the set-aside cards into the two-to-four-card draw pile. A player cannot redraw a card just mulliganed.
4. No routine cards are drawn between Bouts.
5. Randomly choose the Bout 1 starter. The starter alternates each Bout.
6. Place a **+1 Court Favor** marker on the starting player’s side for that Bout. It counts in the final total and then expires.

Court Favor compensates for acting before the opponent in an open-total game. Track starter win rate; the acceptance band is 48–52% over at least 500 bot-vs-bot mirrors. If it misses, tune Favor—not card power or draw count.

### Turn and pass sequence

On a turn, a non-passed player must do exactly one:

1. Play one creature from hand to a legal Theater.
2. Play one available Decree on a Theater, observing the one-per-Bout limit.
3. Pass.

Pass is permanent for the Bout. Once one player passes, their turns are skipped and the opponent may take consecutive actions until also passing. A player with no legal hand or Decree actions is auto-passed at the start of their turn.

The instant both players are passed:

1. Recalculate all conditioned cards.
2. Add the three Theater totals and Court Favor.
3. Higher Tribute wins the Bout.
4. On an exact total tie, the player with **more creatures remaining in hand** wins. The brainstorm’s “fewer remaining” rule was backwards: fewer remaining means more cards were spent.
5. If hand counts also tie, the player who passed first wins. If neither voluntarily passed, the non-starting player wins.
6. Move every played creature face-up to its owner’s discard. Expire active Conditions and Court Favor.
7. If a player now has two Bout wins, end the match. Otherwise begin the next Bout with the other starter.

There is no literal simultaneous pass in an alternating-turn engine. The second pass immediately resolves the Bout; auto-pass uses the same procedure. Cards in discard never return in v1.

### End states and target duration

- A match ends immediately at 2–0; no third Bout is played.
- If both hands empty before either player reaches two wins, normal auto-pass and tie-breaks resolve the remaining Bout. This cannot create a drawn match.
- Target: 18–26 total player actions and 8–12 minutes against the local bot. Surface a warning if a match exceeds 15 minutes; that indicates pass prompts or Condition arithmetic are too slow.

## 6. Opponent bot

The bot uses only public information: registered rosters, played/discarded cards, active Conditions, visible scores, hand counts, Bout score, and Decree loadouts. It may not inspect the player’s actual hand or draw pile even though Local transport technically makes that state available.

### Derived values

For every bot card `c` and legal Theater `r`:

| Value | Definition |
|---|---|
| `gain(c,r)` | Current conditioned contribution in `r` |
| `reserve(c)` | Highest unconditioned printed power the card can legally produce |
| `flex(c)` | Number of legal Theaters minus 1; 0–2 |
| `risk(c,r)` | `gain(c,r)` minus its worst contribution under any opponent Decree still available; minimum 0 |
| `crowd(r)` | Bot’s current points already committed to `r`, divided by 10 |
| `lead` | Bot total minus opponent total |
| `q60` | 60th percentile of the opponent’s best one-card gains estimated from unseen cards in their public roster |

Set the target gain:

```text
if lead <= 0: target = 1 - lead
if lead > 0:  target = max(0, q60 - lead + 1)
```

Score every legal card placement:

```text
overshoot  = max(0, gain - target)
CardScore  = 3.0 × min(gain, target)
           + 0.6 × gain
           - 0.9 × overshoot
           - 0.55 × reserve
           - 0.30 × flex
           - 0.40 × risk
           - 0.10 × crowd
           + jitter
```

`jitter` is deterministic from match seed + turn + card id, uniformly in `[-0.6, +0.6]`. It stops identical boards producing robotic repetition without permitting wild errors. The reserve/flex penalties make the bot spend a narrow card that fits now before burning a versatile 9. Risk and crowd stop it stacking everything under a Decree the player visibly retains.

For a Decree action on Theater `r`:

```text
nowSwing    = (new bot row - new opponent row)
              - (old bot row - old opponent row)
futureSwing = mean(best gain of bot's 3 cheapest remaining cards under Decree)
              - estimated equivalent for opponent

DecreeScore = 1.4 × nowSwing + 0.25 × futureSwing - 1.5 + jitter
```

Do not play a Decree with negative `nowSwing` unless `futureSwing >= 8`. After the pass heuristic decides “play,” choose the highest score across creature placements and legal Decree actions.

### Exact helper: cheapest winning plan

With at most ten cards, enumerate all subsets of the bot hand (at most 1,024). Give each card its best current legal gain and find subsets that reach the required total. Rank qualifying subsets by:

1. Lowest `2 × cardsUsed + 0.35 × sum(reserve) + 0.5 × overshoot`.
2. Lowest cards used.
3. Lowest overshoot.

This is used only when the opponent has passed or when deciding whether catching up is affordable. It is small, deterministic, and much better than “play the largest card.”

### Pass heuristic

The bot has three match states:

- `MUST_WIN`: opponent already has one Bout win.
- `CAN_YIELD`: bot leads 1–0.
- `EVEN`: 0–0 or 1–1 cannot occur before the deciding Bout logic; at 1–1 both players are effectively `MUST_WIN`.

```text
function choosePassOrPlay(publicState, ownHand):
    if opponent has passed:
        if bot currently wins after all tie-breaks:
            PASS

        plan = cheapestWinningPlan(ownHand, pointsNeeded)
        if no plan:
            PASS  // concede; dumping cards cannot change the result

        if state is MUST_WIN:
            PLAY first action in plan

        futureEdge = sum(reserve of hand after plan)
                     - expected reserve of opponent hand

        if plan uses 3+ cards:
            PASS
        if state is CAN_YIELD and plan uses 2+ cards:
            PASS
        if futureEdge < -6:
            PASS
        PLAY first action in plan

    // Opponent remains active.
    if bot is tied or behind:
        plan = cheapestWinningPlan(ownHand, pointsNeeded)
        if no plan:
            PASS
        if state is MUST_WIN:
            PLAY
        if plan uses 3+ cards:
            PASS
        if plan cost consumes >45% of bot's remaining reserve:
            PASS
        if plan uses 2 cards and bot hand count <= opponent hand count:
            PASS with 75% probability; otherwise PLAY
        PLAY

    // Bot is ahead. Passing now sets a price for the opponent.
    Estimate, from the opponent's unseen public-roster candidates,
    the distribution K of minimum cards needed to overtake this lead.

    if median(K) >= 2:
        PASS  // force a real overcommitment
    if bot hand count <= opponent hand count and lead >= 1:
        PASS  // protect parity while ahead

    thinBluffChance = clamp(0.15
                            + 0.05 × max(0, opponentHand - botHand),
                            0.15, 0.30)
    if state is not MUST_WIN and lead <= 3 and random < thinBluffChance:
        PASS  // intentional thin-lead bluff

    PLAY highest-scoring legal action
```

Estimate `K` by enumerating the opponent roster cards not publicly seen and all subsets up to their known hand count; weight each card uniformly as being in hand. It is a belief calculation, not a peek. Cache by public-state hash.

The bot is competent because it prices card advantage, exact catch-up cost, Conditions, and match score. It remains beatable because it uses a one-step opponent model, assumes unseen cards uniformly, preserves cards with fixed coefficients rather than solving the whole match, and deliberately makes a thin bluff 15–30% of the time.

## 7. First-playable scope: keep and cut

| Mechanic | v1 decision | Reason |
|---|---|---|
| Best-of-three Bouts, persistent hand, permanent pass | **Keep** | This is the game, not a feature around the game. |
| Three stat-driven Theaters | **Keep** | Makes immutable stat shapes into placement decisions. |
| `canFly` and `attackRange` | **Keep** | Existing, legible sheet traits; no new generator data. |
| Six Standard Conditions | **Keep** | Without Conditions, a player nearly always chooses a card’s largest legal number and rows are cosmetic. Conditions create commitment risk. |
| Gambits | **Cut** | They double every creature’s action identity before generated move effects have a balanced vocabulary. |
| Entrenched | **Cut** | Condition immunity directly switches off the v1 row-interaction system. |
| Elusive | **Cut** | There are no v1 single-target hostile effects, so it has no job. |
| Rally | **Cut** | Returning a card is card advantage, the game’s strongest resource; it would obscure whether the pass economy works. |
| Relentless | **Cut** | Replaying from discard has the same test contamination and needs additional timing rules. |
| Kindred | **Cut** | It creates quadratic row snowballing, adds arithmetic, and pushes same-planet clustering before the Condition/planet-cap tension is proven. |

The first playable is not “vanilla forever.” It is a controlled experiment. Add only one module after the following are healthy in at least 500 bot mirrors and 50 human matches: first-seat win rate 48–52%, average match 8–12 minutes, pass chosen on 20–40% of eligible turns after each player has committed a card, and no single Decree present in more than 35% of winning decks.

The first post-v1 mechanic should be **Kindred**, capped at `+1 per card if at least one same-planet ally is already in that Theater`—not +1 for every additional ally. Rally and Relentless should remain later because they alter card economy.

## 8. Answers to the six open questions

1. **Card scale:** Do not use ambiguous `points / 100`. Use `clamp(1 + floor(points/100), 2, 10)`. It produces a centered 2–10 curve with mean 5.75 on the real theater stats.
2. **Conditions per Bout:** One Decree play per player per Bout, one active Condition per Theater, two active Conditions maximum across the board. Decrees expire after the Bout.
3. **Gambit limit:** Cut Gambits from v1. When moves have an explicit card-effect table, permit at most one Gambit per player per Bout and two per match; never unlimited conversion of the hand.
4. **Planet cap:** Use four per planet in v1, not three. An exact 12-card deck then needs at least three planets. Move to three only in a mature Standard season after collection data shows at least 80% of active players own 12 legal Xalians across four planets. Do not scale this by competitive rank.
5. **Rally:** It is too strong as written. Cut it from v1. If later tested, make it once per match, trigger only when `recoveryPoints >= 800`, and return the card only after its owner loses the Bout; that makes it comeback insurance rather than repeatable advantage.
6. **Shared Duel roster:** Do not use it. Tribute needs a separate 12-card deck. Sharing a 2–6 creature Duel squad would remove collection breadth, make the ten-card hand impossible, and turn the second spoke into a Duel subsystem rather than an independent reason to own and trade creatures.

## 9. Missing systems the original design needs

### Information and ownership

- A creature can appear only once by immutable `xalianId`; species name is not identity.
- Registered rosters and Decrees are public, hands and draw piles hidden, discard piles face-up.
- Deck validation must use the current canonical sheet referenced by id. No cached UI value may override fee, power, traits, or types.
- A creature being traded after a deck is saved makes the deck invalid until repaired; never silently substitute another creature.

### Deck-builder UI

Every collection card needs, without opening its full sheet:

| Required display | Why |
|---|---|
| Battle Fee and running `used / 180` | The primary legality constraint |
| V/S/B printed powers | Immediate role comparison |
| Bombard lock or flight icon | Prevents false deck assumptions |
| Primary/secondary types | Condition planning |
| Home planet and `count / 4` | Planet-cap legality |
| Best move rating and coverage count | Explains fee differences that stats alone do not |

Provide filters for planet, type, fee, each Theater power, flight, and range. “Why this fee?” expands the six formula components. An auto-complete tool may fill empty slots with the lowest-fee legal owned cards, but it must never remove a player-selected card.

### Readability rules

- Each card shows its three base printed powers; the legal destination highlights the relevant one.
- Under a Condition, show `base × averaged multiplier = contribution` on hover/tap and only the final contribution at rest.
- Row headers show both players’ row totals; the center shows whole-Bout totals and the exact number needed to lead.
- The Pass button must say the consequence: `PASS — opponent needs 7` or `PASS — concede Bout`.
- When one player has passed, keep a persistent banner: `PASSED: opponent may play until they pass`.

### Balance telemetry

Record locally now even before a backend exists, and upload only if/when account event infrastructure is in scope:

- roster ids, fees, planet counts, and Decree loadouts;
- opening hand and mulligans;
- every action, displayed score before/after, and pass state;
- cards and reserve value remaining at every pass;
- Bout winner, tie-break path, starting seat, and Court Favor;
- match duration, action count, and bot bluff trigger.

The first balance review should answer four questions with data: whether 180 rejects enough desirable decks, whether Bombard access is worth its fee premium, whether any Decree dominates, and whether +1 Court Favor neutralizes seat advantage.

## Final recommendation

Build the first playable around the **pass decision**, not the move generator. The exact 12/180 roster, 2–10 printed curve, six controlled Conditions, public rosters, deterministic tie procedure, and non-cheating heuristic bot are enough to test whether Tribute has an identity. If that version is not fun, Gambits and recovery keywords will hide the problem rather than solve it. If it is fun, the cut mechanics become clean, separately measurable expansions.

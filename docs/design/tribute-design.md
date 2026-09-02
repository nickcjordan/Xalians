# Tribute: the Xalians card game (working design, first attempt)

Status: first-attempt ruleset agreed with Nick 2026-09-01, now implemented as a headless engine with a bot and simulator (`my-app/src/gameplay/tribute/`); the "First numbers" section at the end records what bot-vs-bot play showed and what was tuned in response. Supersedes all earlier Tribute documents (`tribute-supplement-codex.md`, `tribute-v1-supplement-legacy-stats.md`, `xalians-card-game-spoke-brainstorm.md`), which were built on the legacy 8-stat creature system or on a wrong placement model and are retained for history only.

## What this game is

A second game spoke for the Xalians platform, inspired by the Gwent minigame from The Witcher 3 but deliberately not a replica of it. The structural ideas borrowed from Gwent: a best-of-three round contest, one hand of cards that must last the whole match, alternating single plays, and a permanent pass that creates the bluffing and card-economy decisions that made that game great. Everything else is built from the Xalians creature record and the world's lore.

Guiding principles, agreed with Nick:

1. **The game bends to the creatures, never the reverse.** Creature records and species templates are never modified to make this game work. Anything the game needs to understand about a creature (for example, that a talon is not a ranged instrument) is defined in the registry as descriptive fact, usable by any game.
2. **Games have freedom to read as much of the record as they want.** The exhaustive creature detail is the asset. This design deliberately spreads different record layers across different mechanics instead of mashing everything into one scalar.
3. **A creature being unable to do something is a feature, not a bug.** Row-locking is normal (Gwent locked every card to a row). Specialists are the standard case; flexibility is scarce and precious.
4. Everything must remain hobby-scale (AWS free tier), solo-buildable, bot-first with no server, mirroring the Duel prototype's boardgame.io Local approach.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Rows are ranges (Close / Mid / Far), and a creature's eligible rows are derived from its abilities through a registry range lens, never chosen freely | 90% (Nick's direction: "the game can retrieve the details of the creature through that lens") | Conversation 2026-09-01 |
| 2 | Card power is a blend: ability intensity scaled by a governing attribute chosen per action; ratified as first attempt | 85% (Nick: "it feels fine to me... let's go with that for now"; playtest will reshape) | Conversation 2026-09-01 |
| 3 | Every creature is always Close-eligible (anything can stand and fight with its body); Mid and Far require qualifying abilities | 75% (kills all eligibility edge cases; mirrors Gwent's melee default; my call, not explicitly ratified) | Design reasoning below |
| 4 | The action-to-row and action-to-attribute tables below are provisional interpretation data owned by this game, pending registry delivery-class tags on instrument-action pairs | 80% (the registry ask is game-agnostic: what an instrument physically is) | Conversation 2026-09-01 |
| 5 | The Gwent structural skeleton (rounds, pass, persistent hand, tiebreaks) carries over from the prior design cycle since none of it reads creature data | 90% | Prior cycle docs |
| 6 | No generated creature corpus exists yet; first playtests will use hand-authored or provisionally scripted records following the ratified template | 95% (only the Graviclaw pilot record exists) | `xalian-creature-system-redesign.md` §9 |
| 7 | Temperament is never read for power (hard platform rule); appearance is not read at all (not an appearance-shaped game) | 95% | `xalian-creature-system-redesign.md` §0, §13/5b |

## The board

Three rows per side, representing engagement range: **Close** (in the enemy's face), **Mid** (skirmish distance), **Far** (projection distance). Both players' matching rows face each other. Each player's three row totals sum to their score for the round.

## Card derivation: how a creature becomes a card

The card is a read-only view of the record. Nothing is stored on the creature.

### Row eligibility (where it can fight)

Each of a creature's abilities maps to a row through the action's range class. Provisional classification (to be replaced by registry delivery-class tags on instrument-action pairs, since the pairing matters: a burst from vents is artillery, a burst from the body is a self-centered wave):

| Range class | Actions (provisional) | Row granted |
|---|---|---|
| Contact | strike, crush, rake, shove | Close |
| Reach | lash, snare, drain, ambush | Mid |
| Projection | beam, hurl, spray, burst, cloud | Far |
| Support | ward, mend, terrorize | grants no row by itself; usable from wherever the creature stands |

A creature's eligible rows are the union over its abilities (signature included; it is a real ability). **Every creature is additionally always Close-eligible**: anything can stand in the front and struggle with its body. This eliminates all edge cases (a creature whose abilities are all support-class still has a legal placement) and mirrors Gwent's melee-heavy default. Multi-row creatures are the scarce flexible finds, and they earn it from their actual bodies.

### Row power (the number it adds)

An ability's strength on the board blends what the act is (intensity) with how well this individual's body drives it (a governing attribute chosen by the action):

```text
printed(ability) = max(1, round( (intensity / 10) × (0.5 + governingAttr / 100) ))
```

A creature placed in a row uses its best ability of that row's range class. Attribute 50 is neutral; 100 gives 1.5x; 0 gives 0.5x. Card values land on a 1 to 15 scale (coincidentally Gwent's exact unit power range), and typical committed rows total around 15 to 45.

If a creature stands in Close without any contact-class ability, it fights with its bare body: a virtual intensity-30 effort governed by strength, so `printed = max(1, round(3 × (0.5 + strength/100)))`, a deliberately weak 1 to 5. Specialists beat improvisers.

The governing-attribute table (first attempt; owned by this game's interpretation registry; every attribute has a job somewhere):

| Action | Governing attribute | Reading |
|---|---|---|
| strike, crush, shove, hurl | strength | raw force delivers these |
| lash, rake | agility | whipping and slashing precision |
| snare | reflex | timing the catch |
| ambush | instinct | the predator's moment |
| beam | instinct | aim at distance |
| spray, burst, cloud | endurance | sustained or explosive output |
| drain | vitality | life force pulling on life force |
| ward | willpower | holding a barrier takes will |
| mend | intelligence | repair is knowledge |
| terrorize | charisma | presence is the weapon |

A pleasing consequence: the archetype system's causal river flows onto the card face. A predator-archetype individual rolled high instinct, so its ambush and beam abilities specifically print higher. Two same-species creatures with identical abilities but different archetypes are visibly different cards, for honest and explainable reasons.

### What each record layer feeds (the property map)

| Record layer | Game use | When |
|---|---|---|
| abilities (action, instrument, intensity) | row eligibility + row power, as above | first playable |
| attributes (10) | governing-attribute scaling | first playable |
| element.primary + graded affinities | type matchups against element-typed Decrees | first playable |
| archetype | visible card badge; synergy bonus (Kindred) later | badge now, bonus later |
| traits (24-key registry) | card keywords via an interpretation table (armored, anchored, stealthy, inspiring, menacing, and friends) | later module |
| signature ability | the card's special play: spend the creature as its lore-defining act instead of as a body | later module |
| capabilities.flight (high threshold) | once-per-round row reposition (flight changes where you can be; abilities change what you can do from there) | later module |
| heightCm / weightKg | physical basis for push and immovability interactions alongside `anchored` | later module |
| environmentalTolerance + breathes | Decrees carry a declared environment (temperature, medium); creatures outside tolerance suffer extra. A Krystos creature genuinely shrugs off a whiteout; no other card game knows what its units breathe | later module, the sleeper hit |
| temperament | never power (hard rule); bot behavior color only | maybe never |
| appearance | not read | never |

## Match structure (the Gwent skeleton, kept)

- **Deck:** exactly 12 owned Xalians. (Deck-cost rules via Battle Fee come later, once creatures exist to price; first playtests skip fees entirely.)
- **Hand:** draw 10 of 12 at match start; mulligan up to 2 once; **no redrawing between rounds**. The hand is the whole match's resource.
- **Rounds:** best of three. Players alternate taking exactly one action: play one creature to a legal row, play one Decree, or pass. **Pass is permanent for the round.** When both have passed, the higher total score wins the round.
- **Ties:** a tied round goes to the player with **more cards remaining in hand** (the one who reached the same total more efficiently), then to the first passer, then to the non-starter.
- **Turn order:** random starter for round one, alternating after; the round's starter gets a **Court Favor** marker added to their total, compensating first-play disadvantage. First set at +1; bot-vs-bot simulation put the starter at 44 to 49 percent with +1 and 50 to 54 percent with +2, so the engine ships with **+2** (`COURT_FAVOR` in `tributeRules.js`). Retune against human play.
- **Round end:** played creatures go to the discard; they do not return this match. Active Decrees expire.

## Decrees (the weather layer)

A **Court Decree** is an element-typed declaration about the battleground, affecting one row on **both sides** symmetrically.

- Each deck registers 2 Decrees from the legal set; they are public, sit outside the 12-creature deck, and each may be played once per match, at most one per player per round.
- One active Decree per row; a new one replaces (and spends) the old.
- Effect: every creature in the row is multiplied by its element matchup against the Decree's element, read from the 14x14 type chart. Orientation matters and is fixed: the **creature is the attacker and the Decree's element is the defender** (`matrix[creature][decree]`), so a Fire creature under Poseidas Death Tide fights at half strength and a Plant creature under it at double. Read the other way the softened-immunity rule would punish a creature for being immune to the weather. Graded affinities blend in proportionally: a creature that is partially of a second type is partially treated as it. Full immunities (0x in the chart) are softened to one-quarter power rather than erasing the card, and no creature's contribution drops below 1, so a hard counter is dramatic but a played card is never worthless.

```text
softened(m) = (m == 0) ? 0.25 : m
multiplier  = (100 × softened(m_primary) + grade × softened(m_secondary)) / (100 + grade)
contribution = max(1, round(printed × multiplier))
```

Playing a Decree is a bet, not pure removal: it hits your side of the row too. The legal Decree set (which elements make fair weather) gets picked once real creature batches exist to test against; analytic first guess: Psychic, Rock, Water, Air, Ice, Electric, with names drawn from planet lore (Telypso Dreamwake, Stonera Jorian Rain, Poseidas Death Tide, Saiphus Benthane Gale, Krystos Whiteout, Zolton Bloodstorm).

## The bot

Public information only (it is handed `getPublicState`, which hides the opponent's hand, draw pile and the match seed). The economy in one sentence: a round you can afford to lose is only worth winning if it is cheap, and a card you do not have to spend is a card you take into the decisive round. As implemented in `tributeBot.js`, every threshold an exported constant:

- **Match state.** A round is *must-win* when the opponent already holds a round win; otherwise it *can be yielded*. Round 3 is always must-win for both.
- **After the opponent passes:** pass if ahead. Otherwise find the cheapest winning plan by exact subset search over the hand (fewest cards, then fewest points). No plan: pass. A plan that costs more than one card in a yieldable round: pass. Otherwise play it, largest card first (the plan is recomputed every turn).
- **While the opponent is still in:** pass on an unbeatable lead (their hand at maximum power under a doubling decree could not reach us). In a yieldable round, once anything is on the board: pass when ahead with card parity or better (every card they spend to overtake is card advantage next round); yield when behind if the catch-up plan needs three or more cards, or once we have already committed three cards to the round while trailing with no more cards spent than the opponent. That last budget is what stops two careful players trading one-card overtakes until both hands are empty. Never pass in a must-win round while the opponent holds cards.
- **Bluff:** ahead by three or less with more cards than the opponent, pass one time in five, from the match PRNG so it is replayable.
- **What to spend.** A decree costs no card, so one that flips the lead on its own is always played first; in a must-win round a decree is also spent once it swings four or more. Otherwise, when behind, the smallest card that takes the lead (least overkill); when ahead, the smallest card (a cheap bid that keeps the bombs); when no single card reaches, the largest.

Every pass carries a reason string so the simulator can report why rounds end.

## Lore framing

Before a faction may enter Kozrak's arena, it presents its roster to the court, range by range, so the court can assess it. The presentation became a ritual, the ritual became a contest, and the contest outgrew the tournament it was meant to precede. Now Tribute is played everywhere: the neutral courts of Poseidas where it settles disputes too small for a real duel, the Windsailor decks of Saiphus, the mining camps of Stonera. Kozrak permits it because a galaxy arguing over card placement is a galaxy not organizing against him. The Zolto play it across star systems over the QED, one entangled move at a time (the built-in fiction for asynchronous play, if we ever build it). A Tribute card is a court dossier on a real creature you own, which is why the card face shows the real record: pure diegetic UI. Decrees are the court declaring the notional battleground's conditions.

## Path to playing it

1. **Provisional creatures.** The generator does not exist yet, so first playtests need hand-authored or script-generated records following the ratified template (a rough scripted roller over draft species bands is fine; these are throwaway test creatures, clearly never canon).
2. **Headless rules engine** in `my-app/src/gameplay/tribute/` mirroring the Duel layout, with Jest tests from day one (the rules above are a state machine, the most testable thing there is).
3. **Bot vs bot batches** to eyeball score ranges, round lengths, and pass behavior; retune Court Favor and the bot thresholds.
4. **boardgame.io Local + minimal UI** (three rows and a hand is far simpler than the Duel board), then play it and let the design change.

Zero new infrastructure at every step.

## First numbers (bot vs bot, 2026-09-01)

The simulator (`devtools/tributeSimulator.js`, run through `devtools/runNode.cjs`) plays random 12-card decks drawn from 60 provisional never-canon creatures, 500 matches per seed. What it showed, in the order it was found:

1. **A starter win rate of 98 percent** was a measurement bug (the simulator compared the winner to the *final* round's starter, which is biased by construction). Measured against the round-one starter it was 51 percent.
2. **The first bot never passed** (1 percent voluntary passes), so every round was a hand dump and the card economy never happened. The pass policy above fixed that; the first version of it then produced the opposite failure, two bots trading one-card overtakes until both hands were empty, which the three-card budget stopped.
3. **The decree orientation was inverted** in the first implementation (decree as attacker), so a Water decree doubled Fire creatures. Fixed and pinned by tests.
4. With the policy above and Court Favor +2, across seeds 7, 99 and 2024: starter wins 52 to 54 percent, 96 percent of matches go three rounds, the round-one winner takes the match 49 to 50 percent of the time, both sides carry about seven cards out of round one and four out of round two, round three is the dump (average winning score 50 against 25 and 31 in the first two), and decrees are played on 13 percent of turns.

Open questions for human play, in rough priority: does conceding rounds one and two on purpose feel like a game or like a stall; is +2 Court Favor visible enough to read as a rule; and whether the six-element decree set produces enough matchups against real generated creatures to be worth registering.

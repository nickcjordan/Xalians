# Brainstorm: "Tribute" — a Gwent-inspired card-game spoke for Xalians

Status: design sketch / brainstorm output. Not a plan of record, not an implementation plan. Written 2026-08-30.

## Context

Xalians is becoming a hub-and-spoke platform. The hub is creature identity: Generate (procedural generator mints unique, permanently-owned Xalians), Own (binder/Codex with provenance and append-only event history), Trade (direct social swaps). Spokes are games that read the same immutable creature sheet through different lenses. The flagship spoke is the Duel game — an 8×8 capture-the-flag tactics prototype built on boardgame.io with Local transport, already playable end-to-end with a heuristic bot (see `CLAUDE.md`, `my-app/src/gameplay/duel/`).

This document explores a **second spoke**: a card game inspired by Gwent, the minigame inside The Witcher 3. The goal is to borrow the structural ideas that made W3 Gwent great — the best-of-three round economy, the pass/bluff decision, board rows, and hard deck-construction limits — while building the actual game out of Xalian material: 8 stats, 14 elements with a full 14×14 type-effectiveness matrix, species traits (`canFly`, `attackRange`), procedurally generated moves, and the 14-planet lore.

Settled platform principles that constrain this design: no levels or XP (creatures are immutable; power comes from choice, not grinding); the **Battle Fee** is the one canonical power scalar and gates roster construction; progression lives on the player account (Scrambler Tokens, tournament tiers, collection breadth) and in the creature's event history, never in its stats; record all events now and assign meaning later; and everything must stay hobby-scale inside the AWS free tier, solo-buildable.

One empirical fact shapes everything below. I sampled the 25 generated Xalians in `my-app/src/json/mock/xalianSamples.json`: **total stat points across all 8 stats range 3096–4225 with a mean of 3665** — a spread of roughly ±15% around a near-fixed budget. Xalians are not stronger or weaker than each other in any large way; they are *shaped* differently. That is the single most important input to this design. A card game where every card's raw power is roughly equal, and all the differentiation is in distribution, elements, and traits, is a game about *matching shapes to situations* — which is precisely what a Gwent-like round economy rewards.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Total stat points are near-constant across Xalians (mean 3665, range 3096–4225), so card power must come from stat *shape*, not stat *total*. This is the load-bearing assumption of the whole design. | 95% — measured directly over the 25-sample mock set; the generator allocates a fixed budget by design | `my-app/src/json/mock/xalianSamples.json`; `lambda/src/constants/constants.js` (`STAT_COUNT_PER_CHARACTER` × `STAT_POINT_MAX` / 2), `lambda/src/ai.js` `populateStats()` |
| 2 | The round/pass/card-advantage economy is the transferable core of W3 Gwent, and it transfers cleanly to any game with a hidden hand and a "highest total wins" scoring rule. Rows, weather, and the specific ability keywords are decoration around it and are the parts we replace. | 90% — near-universal in design commentary on Gwent; the pass rule is what stops "dump everything" being correct | [Medium: Game Design Lessons From Gwent](https://medium.com/@wolfzzyy/game-design-lessons-from-gwent-1950b6ab3417), [Kotaku on standalone changes](https://kotaku.com/standalone-gwent-makes-some-big-changes-to-the-witcher-1788452502) |
| 3 | Deriving card power from a *single* stat per row (rather than a blended formula) is correct, because it makes a creature's card value legible from its sheet at a glance and makes collection breadth matter — you need creatures with different peaks. | 75% — design judgment; a blended formula would flatten every card toward the same number given assumption 1, which would kill the game | Derived from #1 |
| 4 | Battle Fee should gate deck construction here the same way it gates squad selection in Duel, so both spokes share one power scalar and one mental model. Battle Fee is currently **lore only** — defined in the glossary, not implemented anywhere in code. | 85% — the glossary defines it in exactly these terms; implementing it is a prerequisite for both spokes, not new scope invented here | `lambda/src/json/glossary.json:267-268` ("A value assigned to each Xalian based on the strength of its stats... A faction may only enter a team whose combined battle fee falls within the imposed battle fee limit.") |
| 5 | This spoke can ship bot-first on boardgame.io Local transport exactly as Duel did, with zero new backend, and therefore costs nothing in AWS. Async/ghost play is a later, optional phase. | 90% — Duel already proves the pattern in this repo | `CLAUDE.md` Duel section ("`Local` transport only — no server"); `my-app/src/gameplay/duel/duelBot.js` |
| 6 | A card game's bot is far easier to write well than a tactics bot, because the branching factor is a hand of ~10 cards rather than a board of pieces × squares. A greedy scorer plus a pass heuristic will feel competent. | 80% — inference from state-space size; Duel needed a six-strategy heuristic scorer to feel decent | `my-app/src/gameplay/duel/duelActionBuilder.js` (six situational strategies) |
| 7 | The type-effectiveness matrix should apply **card-vs-row-element**, not card-vs-card, because card-vs-card in a simultaneous-total game creates an unresolvable ordering problem (whose bonus applies first?) and an unreadable board. | 70% — design judgment; the alternative is workable but needs careful ordering rules | `lambda/src/json/typeEffectivenessMatrix.json` (complete 14×14, multipliers 0/0.5/1/1.5/2) |
| 8 | Zeroes in the effectiveness matrix (Electric vs Rock = 0, Electric vs Sand = 0, Air vs Ghost = 0, Light vs Air = 0) are a feature here, not a bug — they create hard counters that make a row commitment genuinely risky. | 75% — the matrix contains real zeroes; they would be catastrophic in a fine-grained combat sim but are dramatic and fine in a card game | `lambda/src/json/elements.json` (Electric: Rock 0, Sand 0; Air: Ghost 0; Light: Air 0) |
| 9 | Generated moves are best used as **one-shot card abilities** rather than a per-card attack menu, because a card game lacks the turn structure to support choosing among four moves per card, and `rating` gives a ready-made magnitude knob. | 70% — design judgment; moves carry `name`/`type`/`element`/`rating`/`cost`, which reads naturally as an ability | `my-app/src/json/mock/xalianSamples.json` move objects (e.g. `{name: "Balmy Enchanting Hex", type: "Psychic", element: "Enchanting", rating: 11, cost: 10}`) |
| 10 | Deck size should be small (12–15 creatures) rather than Gwent's 22+, because the player's collection will be small for a long time and a large minimum would make the spoke unplayable until the collection is deep. | 80% — practical constraint; can be raised later as collections grow | Platform status: pre-launch, no users |
| 11 | This spoke should reward *breadth* of collection (many elements, many stat shapes) while Duel rewards *depth* (a few well-suited tacticians), so the two spokes create demand for different creatures and thereby drive trading. | 70% — this is the strategic reason to build the spoke at all; unproven until both are playable | Design intent; Duel's meta favors `canFly` + high attack/speed per `CLAUDE.md` Duel section |
| 12 | Lore framing as a Kozrak-sanctioned *tribute ledger* game (not a tavern dice game) is preferable, because it ties the card game to the existing Scrambler Token tournament economy rather than inventing a parallel fiction. | 65% — interpretive; a pure tavern-game framing is equally valid and lighter | `lambda/src/json/glossary.json`, planet lore in `CLAUDE.md` (Kozrak's arena tournaments, Scrambler Tokens) |

## Part 1 — What actually made Witcher 3 Gwent work

Worth being precise here, because the temptation is to copy the surface (three rows, weather, a Scorch) and miss the engine.

**The rules, briefly.** Each player brings a deck of at least 22 unit cards plus up to 10 special cards, drawing an opening hand of 10 with a small mulligan. The board has three rows per side — close combat, ranged, siege — and each unit is locked to a row (except Agile units, which choose between close and ranged). Players alternate playing exactly one card, and the only alternative to playing a card is to **pass**, which is permanent for that round. When both players have passed, the higher total power wins the round. Win two of three rounds and you win the match; ties count as losses for both players, so a drawn round burns a round-win from each. Weather cards (Biting Frost, Impenetrable Fog, Torrential Rain) crush every unit in the corresponding row on *both* sides to power 1. A short keyword list does the rest: Spy (play on the opponent's side, draw 2), Medic (resurrect from the discard), Muster (all copies of a name deploy at once), Tight Bond (identical adjacent cards double), Morale Boost, Commander's Horn (double a row), Scorch (destroy the strongest unit on the board), and Hero cards that are immune to all of it. ([game8 rules summary](https://game8.co/games/Witcher3/archives/277237), [Witcher 3 wiki](https://thewitcher3.wiki.fextralife.com/Gwent))

**The engine underneath is card economy, not card power.** Your hand of 10 is your entire resource for all three rounds — you do not redraw between rounds. So every card played in round 1 is a card unavailable in round 3. This converts an apparently simple "who has more points" game into a resource-allocation problem under hidden information, and it produces the signature Gwent moment: deliberately conceding round 1 cheaply, passing early to bank cards, and letting the opponent win a round they overpaid for. Without the pass rule, the dominant strategy would be to dump everything as fast as possible and the game would evaporate. ([Medium: Game Design Lessons from Gwent](https://medium.com/@wolfzzyy/game-design-lessons-from-gwent-1950b6ab3417))

**The pass decision is the whole game in one button.** Passing is a bluff, a concession, and a tempo play at once, and its correctness is unknowable — it depends on cards you cannot see. Reading whether an opponent holds a finisher or is genuinely out of gas is the skill the game actually tests. Everything else exists to make that read harder or more interesting.

**Weather is the best of the "decoration" mechanics** because it is symmetric and punishes commitment. It hits both sides' matching row, so it is not simply removal — it is a threat that makes stacking one row a gamble, which makes the row structure meaningful instead of cosmetic.

**Where W3 Gwent was actually broken.** It is a beloved minigame, not a balanced competitive game, and naming the flaws keeps us from importing them. Hero cards are immune to everything, so a hero-dense deck has no counterplay. Spies sit so far above the power curve that Northern Realms' spy density made it the consensus best faction. Scorch is a swingy blowout that punishes exactly the strong play the rest of the game rewards. Draws counting as double losses is elegant but produces confusing match states. And the AI passes badly, which makes single-player trivial once learned. The standalone GWENT spent years fixing these — bronze/silver/gold tiering with per-tier deck limits, provisioned deck-building costs, removing the flatness of "one card at a time regardless of cost" — which is itself evidence about which parts of the original were fragile. ([Kotaku on standalone changes](https://kotaku.com/standalone-gwent-makes-some-big-changes-to-the-witcher-1788452502))

**Survives translation:** the best-of-three round structure, permanent pass, a hand that must last all three rounds, hard deck-construction limits, symmetric row-wide effects, and a small legible keyword vocabulary.

**Needs replacing:** hero immunity (no counterplay), spies as drawn (too strong, and "give your creature to the enemy" reads oddly for permanently-owned creatures), Muster and Tight Bond, unconditional Scorch, and the fixed faction perks (we have 14 planets, not 5 factions, and they should not collapse into five flat rules).

That last point deserves emphasis: **uniqueness kills every "copies of the same card" mechanic outright.** Muster, Tight Bond, and much of standalone GWENT's synergy design are literally impossible when every Xalian is unique. Whatever replaces them must key off *shared attributes* — same element, same planet, same trait — rather than shared identity. That is a constraint, but it points directly at the elements and planets we already have.

## Part 2 — The design sketch: "Tribute"

**Working name: Tribute.** In lore, a *tribute* is the offering a faction presents to Kozrak's court to be entered in the arena.

### Core loop

Best of three **Bouts**. Win two Bouts, win the Tribute. Each player draws a hand of **10 cards from a 12–15 card deck** and **does not redraw between Bouts** — the hand is the entire match resource, exactly as in Gwent. Players alternate placing one card, or passing. Pass is permanent for that Bout. When both have passed, higher **Tribute Value** wins the Bout.

Two deliberate divergences from Gwent, both aimed at its known flaws:

- **A ten-card hand from a twelve-card deck means you see almost your whole deck.** Deck construction becomes near-deterministic and the game becomes about sequencing and reading, not drawing well. This suits a small collection and removes the "I lost to variance" feeling that plagues card games with thin collections.
- **No draws.** If a Bout ties, it goes to whoever has **fewer cards remaining in hand** — the player who reached the same total more efficiently. This replaces Gwent's confusing double-loss rule with a tiebreak that reinforces the card-economy theme instead of sidestepping it.

### Rows: three Theaters, read from the creature sheet

Three rows per side, and — the key move — **a creature's power in each row is read from a different stat on its sheet**. Because total stat points are near-constant (assumption 1), a creature strong in one theater is necessarily weak in another. There are no good cards and bad cards, only cards that are good *here*.

| Theater | Power stat | Also gated by |
|---|---|---|
| **Vanguard** (front) | `standardAttackPoints` | — |
| **Skirmish** (mid) | `speedPoints` | — |
| **Bombard** (back) | `specialAttackPoints` | requires `attackRange` of `medium` or `high` |

Card power = the relevant stat scaled to a readable integer (roughly `points / 100`, giving 1–8 from the observed 151–798 spread). A creature is playable in any theater it qualifies for and the player chooses at play time — so **every card is a decision, not a placement**. The sampled Xalian above (`standardAttack` 798 / `speed` 693 / `specialAttack` 630) is an 8 in Vanguard, a 7 in Skirmish, a 6 in Bombard: a flexible generalist. A creature with "very low" standard attack and "high" special attack is a dedicated bombardier and nothing else.

Two traits from `species.json` modify placement rather than power:

- **`canFly`** — the Xalian equivalent of Gwent's Agile, earned from the sheet rather than assigned by a designer. Fliers ignore theater restrictions and may be placed in any row. Only 6 of 29 species fly, so this is genuinely scarce.
- **`attackRange`** — gates Bombard as above; `low` range creatures are locked out of the back row.

`standardDefensePoints`, `specialDefensePoints`, `evasionPoints`, `staminaPoints`, `recoveryPoints`, and `healthPoints` are unused by this mapping and remain available as keyword knobs (below) — which is good, because it means Duel's stat priorities and this game's are genuinely different.

### Elements: Conditions replace weather, and the matrix does the work

Each Theater can be put under a **Condition** — an element-typed environmental effect named from the planets. A Condition affects **both players' cards in that row**, symmetric like Gwent weather, but instead of flattening everything to 1 it runs each card's primary element through the existing 14×14 `typeEffectivenessMatrix.json` against the Condition's element and multiplies.

This is much richer than Gwent weather and costs nothing to build, because the matrix already exists and is complete. A **Zolton Bloodstorm** (Electric) in the Skirmish theater doubles Water and Metal creatures, halves Air and Plant, and **zeroes Rock and Sand outright**. A **Grimedes Nightfall** (Dark) rewards an entirely different set. Playing a Condition is therefore not pure removal — it is a bet that your row composition survives it better than your opponent's, and it can backfire spectacularly. The zeroes in the matrix (assumption 8) are what give Conditions teeth.

**Reading rule (assumption 7):** effectiveness applies only card-vs-Condition, never card-vs-card. Cards do not fight each other; they contribute to a total. This keeps the board readable and avoids ordering paradoxes. A creature's **secondary element** grants partial resistance: if the primary would be zeroed or halved, the secondary's multiplier against the Condition is averaged in, so dual-typed creatures are the hedge against Conditions. That is a real, discoverable deck-building principle emerging directly from existing generator output.

### Keywords, derived not invented

Every keyword reads off a stat or trait the creature already has. Nothing new is written to the sheet; nothing about the generator changes.

- **Entrenched** (high `standardDefensePoints`) — immune to Conditions. The counterplay-having replacement for Hero immunity: immunity to *one* category of effect, earned from a stat, paid for with power elsewhere.
- **Elusive** (high `evasionPoints`) — cannot be targeted by an opponent's single-target effect. Again, narrow immunity rather than blanket immunity.
- **Rally** (high `recoveryPoints`) — when the Bout ends, this card returns to hand instead of the discard. This is the card-economy keyword and the strongest thing in the game — the Gwent-spy role, but instead of handing a creature to the enemy it rewards holding a recovery-shaped creature. Deliberately scarce.
- **Relentless** (high `staminaPoints`) — may be played a second time in a later Bout from the discard.
- **Kindred** (shared planet) — the uniqueness-proof replacement for Tight Bond. Cards from the same planet in the same theater each gain +1 per additional kindred card. This is the mechanic that makes collecting *across* planets pay off, and it is why the deck-building rules below care about breadth.

**Moves as one-shot abilities (assumption 9).** Each Xalian carries 4 generated moves with a `rating` and a `type`. Rather than a per-card attack menu — which the turn structure cannot support — a card may be played **face-down as a Gambit**, spending the creature as a one-shot version of its highest-rated move instead of as a body: a `rating`-scaled effect of that move's element. This is the Xalian answer to Gwent's special cards, it gives the generated move text a mechanical home, and it creates a real dilemma — a strong creature is also a strong gambit, and you cannot have both.

### Deck construction and the Battle Fee

Battle Fee is defined in the glossary as "a value assigned to each Xalian based on the strength of its stats, used to keep King Kozrak's tournaments competitive. A faction may only enter a team whose combined battle fee falls within the imposed battle fee limit" (`lambda/src/json/glossary.json:267`). It is **lore only today — not implemented in any code**. Both spokes need it, and it should be implemented once in the shared layer, not per-game.

Deck rules:

- **12–15 creatures**, each a real owned Xalian from the player's binder.
- **Total Battle Fee ≤ the tier's limit.** Tiers ladder upward as the account progresses — the account-side progression the platform principles call for.
- **At most 3 creatures per planet.** This is the constraint that makes the whole thing work.

That last rule is the strategic heart of the spoke. It forces breadth: a legal deck needs creatures from **at least 4–5 different planets**, hence 4–5 different elements, hence a spread of Condition vulnerabilities that cannot be blanked by a single Condition. Meanwhile Kindred pulls the other way, rewarding clustering right up to the 3-per-planet cap. The tension between "spread out to survive Conditions" and "cluster for Kindred" *is* the deck-building game.

**Why this creates trading demand, and different demand than Duel (assumption 11).** Duel wants a small squad of `canFly`, high-attack, high-speed tacticians — depth in a narrow profile. Tribute wants 12–15 creatures spanning many planets, including creatures Duel considers junk: a slow, high-defense Entrenched wall is nearly useless in a CTF race and is a premium Condition-proof anchor here; a high-recovery creature with mediocre attack is a Rally engine. **Every Xalian is good at something in at least one spoke** — exactly the property that makes a collection worth having and makes a direct swap feel like a trade between people with genuinely different needs rather than a strictly-better/worse exchange. This is the strongest argument for building the spoke at all.

### Lore framing

**The frame: the Tribute.** Before a faction may enter Kozrak's arena, it must present its roster to the court — a formal accounting of what it brings, theater by theater, so the court can set the Battle Fee. The presentation became a ritual, the ritual became a contest, and the contest outgrew the tournament it was meant to precede. Now factions play Tribute everywhere: the neutral courts of Poseidas where it settles arbitration too small for a real duel, the Windsailor decks of Saiphus, the mining camps of Stonera. Kozrak permits it because a galaxy arguing over card placement is a galaxy not organizing against him. The Zolto play it over the QED across star systems — one instantaneous entangled move at a time — which is, incidentally, the exact fiction for asynchronous play if we ever build it.

This framing beats a generic tavern game on three counts. It reuses the existing Battle Fee lore instead of inventing a parallel economy. It explains why creatures appear as *cards*: a Tribute card is a court dossier on a real creature you own, which is why the card shows the real sheet — a nice bit of diegetic UI. And it gives an immediate lore-native reason for both the three theaters and Conditions (planetary environments the court declares as the notional battleground).

Stakes fit the existing economy without inventing anything: Scrambler Tokens as the wager, tournament tiers as the Battle Fee ladder, and every match writing an event to each participating creature's append-only history — "presented in Tribute at the Poseidas courts, won 2–1." Record now, assign meaning later.

## Part 3 — Build path

**Phase 0 — Battle Fee (shared, blocks both spokes).** A pure function from a creature sheet to a single number. Lives in `lambda/src/gameplay/` alongside `attackCalculator.js` and reaches the frontend via the existing copy build step. Duel squad selection needs it too, so this is not cost attributable to this spoke.

**Phase 1 — rules engine, headless.** `my-app/src/gameplay/tribute/` mirroring the `gameplay/duel/` layout: card-value derivation from the sheet, Condition/matrix resolution, keyword resolution, Bout and pass state machine, win conditions. Jest tests from the start — the repo already runs `my-app/src/gameplay/duel/__tests__/duelRules.test.js` in CI, and a rules engine is the most test-friendly thing there is.

**Phase 2 — boardgame.io Local + bot.** Same transport as Duel: no server, no cost. The bot is a greedy "best points per card" scorer plus a pass heuristic (pass when the points needed to win the Bout exceed what the remaining hand can deliver without over-committing). Per assumption 6 this should feel competent quickly, because the branching factor is a hand of ten rather than a board.

**Phase 3 — UI.** Card layout is the real design work; the rest is drag-and-drop into three rows, simpler than the Duel board. Element-themed styling already exists in `constants/constants.js` and `utils/valueTranslator.js`.

**Phase 4 (optional, later) — async/ghost play.** Turn state is tiny (a few hundred bytes of card ids and row assignments), so one DynamoDB item per match suffices. Ghost play — battling a snapshot of another player's deck and recorded play pattern — gets multiplayer *feel* with no realtime infrastructure and no matchmaking, the right trade at hobby scale. Fits the QED lore hook exactly.

**Cost: zero through Phase 3.** Frontend-only, deployed by the existing S3+CloudFront pipeline.

## Open questions

1. **Is `points / 100` the right card-value scale?** Observed stats run 151–798, giving cards of 1–8. It may want a curve rather than a linear divide, so "high" stats feel meaningfully above "medium" instead of one point above.
2. **How many Conditions per Bout?** Unlimited Condition-stacking could reduce a Bout to zeroes on both sides. A cap of one active Condition per theater, replaceable, is the obvious first rule to try.
3. **Should Gambits be limited?** If any card can be a Gambit, the "body or ability" dilemma is nice but the effective card pool doubles. A cap of 2–3 Gambits per Bout may be needed.
4. **Does the 3-per-planet cap bite too early?** With a small collection a player may not own creatures from 5 planets. The cap may need to start loose and tighten with tier.
5. **Is Rally too strong?** It is the card-advantage keyword, and card advantage is the game. It may need to be once-per-match rather than once-per-Bout.
6. **Road not taken:** rather than a separate deck, the card game could use the *same* roster as a Duel squad, as a pre-battle ritual that seeds the Duel. More lore-elegant; strictly worse for creating breadth demand, which is the main strategic reason to build the spoke.

# Powerworks on creature schema v5: battle mechanics

Status: contract, written 2026-09-21. Pass 1 in progress. Successor to the frozen paper cards described in [powerworks-prototype.md](powerworks-prototype.md); the accepted workshop rules (whole-squad planning, hidden enemy orders, speed interleave, same-move retargeting in fixed row order, persistent health and knockouts, one revival, command-replay saves) are unchanged. Tracks issues #299 and #300.

## Context

Powerworks shipped on frozen cards (`packages/rules/src/dungeon/cards.json`) with five move kinds (hit, snare, ward, charge, fallback), a melee/ranged flag, three uses per secondary and one signature per encounter. None of it read a creature record. Schema v5 (`generation-0.6.0-1`, 32 species, four distinct actions each) now carries the fields the workshop was waiting for: an explicit approach flag, preparation and recovery timing, effect likelihood, statuses, displacement, protection, restoration, removal and passives.

Measured over 2,560 v5 actions (20 seeds per species): approach closing 592 / stationary 1,968; preparation immediate 1,121 / brief 1,420 / prolonged 19; recovery repeatable 621 / brief 1,734 / prolonged 205; likelihood consistent 2,400 / likely 200 / occasional 95; fourteen statuses present.

## Assumptions & Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | `timing.recovery` is read as a cooldown in rounds (repeatable 0, brief 1, prolonged 2); per-move use counters are removed. Nick reopened the uniform-allowance and no-cooldown rulings on 2026-09-21 because the creature now stores this information. | 90%, Nick's words: "cooldown I guess is more direct to recovery" | `docs/design/creature-model-current.md` ability fields; this conversation |
| 2 | The signature stays once per encounter as a game lever on top of its cooldown. | 70%, boss timing and the intro lesson were tuned on it; revisit after the first v5 sim | `powerworks-prototype.md` |
| 3 | `timing.preparation === 'prolonged'` is a player-side charge-up using the enemy cycle (charge, release, one recovery opportunity). Immediate preparation adds a small initiative bonus so it beats a brief move at equal speed. | 75% | 19 of 2,560 actions are prolonged, so this is rare by construction |
| 4 | Binding statuses (restrained, paralyzed, frozen, pinned, buried) all map to the accepted Snare rule: block `approach: closing` moves through the target's next opportunity, dispel a charge. Stationary contact stays legal. | 85%, Nick accepted the approach-dependent reading on 2026-09-15 and asked for the explicit field | workshop, "Snare accepted; explicit move range forthcoming" |
| 5 | `displace` breaks a charge (the charging machine is pulled off its footing) and otherwise deals impact harm at 60% of its force intensity. This replaces Graviclaw's lost restraint as the intro lesson's second answer. | 65%, a game reading, not canon; Graviclaw's v5 audit deliberately has no restraint | `docs/species-templates/v5/graviclaw.ability-audit.md` |
| 6 | `likelihood` is the application roll for status effects only (consistent 100%, likely 75%, occasional 40%), drawn from the run's seeded rng. Harm stays deterministic. | 80%, matches the 2026-09-15 deterministic-outcomes baseline and issue #295's scope | workshop |
| 7 | Enemies remain dedicated and noncollectible but are authored in the same effect grammar, so the engine has one resolver. Their numbers stay at parity with the shipped cards. | 85% | `creature-adventure-design-workshop.md`, "Dedicated dungeon enemies accepted" |
| 8 | HP, speed and damage derive from attributes with formulas held in one levers file; every constant is a lever pinned by this doc, not a ruling. | 90% | Reclamation precedent `expedition/creatureOnTable.ts` |
| 9 | Unsupported effects are explicitly unavailable and named, never misread. A move is usable if any of its effects is supported; the rest show as "no effect here". | 95%, Nick's standing ruling | `reclamation-v5-migration.md` |

## The reading seam

`packages/rules/src/dungeon/reading.ts` is the only file that reads a creature record. It produces table units:

```text
Unit
  id, species, name, element, enemy
  hp, max          from mean(vitality, endurance, resilience)
  speed            from mean(agility, reflex)
  attrs            { strength, willpower }  scale harm
  moves: Move[]    four actions; signature flagged
  cooldowns[]      rounds remaining per move
  signatureSpent   once per encounter
  bound, ward, charge, recovery   encounter state (unchanged semantics)

Move
  key, name, signature
  approach         closing | stationary | self
  range            contact | short | medium | long | none
  preparation      immediate | brief | prolonged
  recovery         repeatable | brief | prolonged
  element?         classification, drives matchup when present, else the creature's element
  effects[]        the v5 effects, with a per-effect `support` reading:
                     harm      -> damage = intensity/10 * (0.5 + attr/100) * matchup * ward
                     displace  -> breaks charge; impact harm at 0.6 * intensity
                     protect   -> ward (self) until the owner's next opportunity
                     status    -> binding group applies bound; other statuses pass 2
                     restore   -> heal intensity/10 * (0.5 + willpower/100) on target
                     remove    -> pass 2 (nothing to remove yet)
```

Legality per opportunity: not on cooldown; not (bound and closing); not (charging or recovering and a different charge); signature not spent. Desperate strike survives unchanged as the only move when nothing damaging is legal; with repeatable moves it should almost never appear, and the sim reports how often it does.

The four companions are generated from fixed seeds of the frozen `generation-0.6.0-1` release so a run is replayable. Cards for the five machines carry the same Move shape by hand.

## Passes

1. **Seam and real records.** This document's contract. Save format version 2. The existing seeded-run test and a bot-vs-bot check report: win rate, rounds per encounter, Desperate strike frequency, cooldown lockouts (opportunities with no legal move), charge interruptions by binding versus by displace.
2. **Status layer.** Degrading statuses (corroding, poisoned, burning, chilled) tick harm at the victim's opportunity; guarding statuses (shielded, protected, reinforced) generalize ward; attention statuses (entranced, frightened) redirect the victim's next order under a disclosed rule; concealed changes fallback targeting; `remove` and protection descriptors get something to act on.
3. **Passives and triggers.** `contact` and `harmed` triggers as retaliation, ongoing restore as regeneration.

## Pass 1: what it measured, 2026-09-21

The four companions are `powerworks-graviclaw-1`, `powerworks-avilily-6`, `powerworks-crystorn-1` and `powerworks-hippochamp-1`. Avilily's first seed read four paralysis variants and no harm, and speed 64 against the two chargers at 65, so no companion could react to a charge; seed 6 reads speed 82 with a repeatable piercing touch. A test now fails if any companion lacks a damaging move or if no companion outspeeds a charger.

The 200-run greedy sim (`packages/rules/src/dungeon/devtools/powerworksSim.ts`, reactive bind on a charging enemy, blind pull on any known charger, else highest preview damage) read three ways as the levers moved:

| lever state | win rate | rounds / encounter | Desperate strike | charges landing | interruptions bind / displace |
|---|---|---|---|---|---|
| first seeds, no pre-emptive tactic | 94.5% | 4.47 | 17.2% of opportunities | not counted | 93 / 0 |
| seed 6, pre-emptive pull, equal pause after release and interruption | 100% | 4.84 | 0% | 0 of 1,200 | 5 / 1,195 |
| **`INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES` = 0** (a broken charge may restart at the very next opportunity; a release still earns the one-opportunity pause) | 100% | 4.92 | 0% | **141 of 1,572 (9%)** | 644 / 474 |

The second row is a lock: Gravity Draw's one-round cooldown matched the charger's two-opportunity cycle exactly, so a blind pull every other round meant no release ever landed. The lever in the third row is a deliberate move away from the paper rule "the next charge may start only after one ordinary opportunity following release **or interruption**", with this table as the evidence. Nine percent of charges landing under a perfect-information bot is a forgiving intro, which the prototype doc says it should be; the greedy bot is not a first-time player.

Opportunities with no legal move: 0 in every run, so cooldowns never lock a companion out. Bind application under `likelihood`: 87% landed (682 of 783).

## Friction reported

- The pre-emptive pull is close to a free answer: a five-damage move that also removes an eighteen-damage release. `DISPLACE_HARM_FACTOR`, the pull's own cooldown and the interrupted-recovery lever are the three places to move it if human play agrees.
- Base names collide in the tray: Crystorn shows two cards titled "Impact Touch", differing only in cooldown pips; the qualifier lives in the tooltip and the inspector.

- Graviclaw's v5 signature is compression, not restraint; the intro dungeon's lesson now rests on Avilily's paralysis and on decision 5.
- Compositional names such as "Impact Touch (Brief Preparation)" read flat in a move tray. Left as generated; a naming lever, not a game lever.

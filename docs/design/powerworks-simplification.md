# Powerworks, simplified: one clear round

Status: not adopted (Nick, 2026-09-28). He agreed with reducing the factors in play but not with this set, and pointed out that it was scoped to one dungeon: the design has to hold for all fourteen elements, many themed dungeons and enemy types not yet imagined. Kept as a record of the measurement (the census and the grid table below stay true of the current rules) and of one option considered. The brainstorm continues from the pillars Nick named: element, a move's attack power shaped by element synergy, and simple support moves (healing and non-healing). Evidence tool: `packages/rules/src/dungeon/devtools/powerworksGrid.ts`.

## Context

Nick, 2026-09-28, after three rounds of move-picker designs: "I don't want to be required to select a move in order to understand how the move's expected result differs from each other per creature ... I don't think there's any version of this game where you have to click through 16 different options to understand your move is actually a fun user experience." Then: "I think I came in a little hot trying to implement all aspects of any mechanic that fits the creature schema ... let's take a step back and simplify things to the point where the game has a much clearer direction and the gameplay is much more straightforward."

Powerworks currently reads almost every field of a v5 creature record: approach, range, preparation, recovery, likelihood, nine status groups with their own durations and exceptions, area geometry, displacement, protections, passives and their triggers, speed interleave, a nimble slip, and hidden machine orders priced as an expectation. Each was added for a real reason. Together they make a move's worth depend on which machine it is aimed at, for reasons the screen cannot show, so the only way to compare moves is to try them one at a time.

This proposal keeps the creature record as it is (other games read it) and changes what this game reads from it.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The goal is a screen where, once a companion is selected, every move's result on every machine can be read without selecting the move. Selecting the companion stays required. | 95%, Nick's words this session | Context above |
| 2 | Machines show their exact next action at the start of each round (which move, which companion, how much). This reverses the accepted workshop rule of hidden enemy orders. | 75%, the largest source of invisible difference is the machine's blow being an average; a telegraph makes it one number. Nick decides. | Grid table below, "a status stops a bigger blow"; `value.ts` `blowOf` averages over targets weighted by size |
| 3 | The squad always acts before the machines each round. This removes speed interleave, the turn strip, slowed and the immediate-preparation bonus, and leaves the speed attribute unused in battle. | 70%, "finish it before it strikes" becomes always true; the cost is a creature attribute with no job here (friction below) | `index.ts` `initiative`; audit run 1 found "7 → 0" readouts wrong because of turn order (`powerworks-intuitiveness-audit.md`) |
| 4 | Every move reads as one or two of six verbs: Strike, Sweep, Stop, Weaken, Guard, Mend. The reading seam decides the verb; the player never sees the record's fields. | 80% | Census below: harm 63%, status 24%, area 12%, displace 9%, guard 3%, heal 2% |
| 5 | Nothing rolls. A status the record marks likely or occasional still lands every time; a status that rides on a damaging move reads as Weaken, and only a move whose point is the status reads as Stop. | 70%, removes chance from every preview; the rider rule keeps Stop from appearing on a third of all moves | 872 of 1,159 status moves roll today |
| 6 | Every effect lasts this round only. There are no lingering statuses, ticks, or durations to track. | 65%, the biggest cut to depth; durations can come back as a lever once the base reads | `levers.ts` duration tables |
| 7 | Elements read in three steps, strong (×1.5), normal, weak (×½), from the shared chart (1.5 and 2 read as strong; 0.5 and 0 as weak). The shared chart is unchanged, so Duel is untouched. | 80% | Machines carry three elements (sand, light, electric); only 21% of moves carry an element; 1% of creatures carry two |
| 8 | Area moves hit every machine, wherever they are aimed. | 85% | Area reach by aim causes 18% of uneven grids |
| 9 | Displacement reads as Stop (the machine is knocked off its footing), which is what it did to a charge already. | 60%, generous; a lever if Stop proves too common | `index.ts` displace breaks a charge (contract decision 5) |
| 10 | Machine charges stay: a charging machine shows the blow it will release next round, and a Stop in either round breaks it. This is the one two-round threat. | 85%, the boss's identity and the clearest "stop it" puzzle | `cards.json` Capacitor rush, Core surge |
| 11 | Companions resolve left to right as they stand, and an order whose machine has already fallen goes to the next standing machine, as it does now. | 70% | `projectOrders` redirect |
| 12 | Cut from battle: likelihood rolls, status durations and ticks, the nine status groups, closing versus stationary, range, reception, area geometry, nimble, target-size weighting as a hidden average, innate protections, triggered passives, cleanse. The record keeps every field; this game stops reading them. | 75% | Census below |
| 13 | Run structure is unchanged: preset squad of four, four chambers, persistent health, one revival, the recovery station, cooldowns and the once-per-fight signature. | 90%, none of these cause the per-machine problem | `levers.ts` |

## The direction, in one sentence

Each round the machines show you exactly what they are about to do, and you choose one move for each of your four companions to break them down before their blows break your squad down.

The decision each round is always one of three questions: which blow do I stop, which machine do I finish, and who do I protect. Everything on the screen should serve those three.

## Evidence

### What the creatures a player can field carry

1,204 distinct creatures (the preset squad and every creature the draft offers across 150 run seeds), 4,816 moves.

| Mechanic | Moves | Share |
|---|---|---|
| Harm (damage) | 3,014 | 63% |
| Any status on a foe or squadmate | 1,159 | 24% |
| A status that rolls (likely or occasional) | 872 | 18% |
| Area | 600 | 12% |
| Displace | 438 | 9% |
| Protect or ward | 142 | 3% |
| Restore | 74 | 2% |
| Remove (cleanse) | 69 | 1% |
| Prolonged preparation (charge-up) | 182 | 4% |
| Recovery repeatable / rests 1 / rests 2 | 1,855 / 2,709 / 252 | 39% / 56% / 5% |
| Carries an element (not physical) | 1,005 | 21% |

Status groups by moves carrying them: binding 11%, degrading 5%, attention 5%, senses 1%, tempo 1%, shock 1%, guarding under 1%. Innate protections on 10% of creatures; ongoing passives on 14%; triggered (contact) passives on 3%. Ten of 1,204 creatures carry moves of two elements.

Most of the rule surface serves a few percent of moves. Binding, the one status group with real reach, is 11%.

### How a move's worth differs by machine today

At every planning moment of greedy runs (150 seeds, preset and random drafts), each companion's moves that may aim at two or more machines: 43,360 grids of (move, machine) worths.

63% are already flat: the move is worth the same on every machine. The other 37% differ, for these reasons (a grid can have several):

| Why the worth differs by machine | Share of uneven grids | After this proposal |
|---|---|---|
| A status works on some machines and not others (bind only stops a closing blow, blind only a ranged one, any status is wasted on a machine that already loses its turn) | 27% | Gone. Stop and Weaken work on every machine. |
| A status stops a bigger blow on one machine (the blow is an average over whom the machine might pick) | 27% | Visible. Each machine shows its exact blow. |
| Element matchup | 26% | Visible. One mark per machine for the selected companion, three steps. |
| Finishes some machines and not others | 22% | Visible. A finishing mark under the machine, keyed to the move. |
| Area reach depends on where it is aimed | 18% | Gone. A sweep hits every machine. |
| A machine's guard or protection | 10% | Visible. A guarding machine wears its guard mark; innate protections are cut. |
| None of these (the size-weighted average, ticks) | 6% | Gone. |

The choice genuinely depends on the machine: in 40% of planning moments a companion's best move is not the same move on every machine. The proposal keeps that (element, finishing and which blow to stop still differ by machine); it only makes the reasons visible. The build pass measures the share again and it should stay well above zero, or the target choice has stopped mattering.

## The rules

### A round

1. **The machines declare.** Every standing machine shows its move, the companion it will hit, and the damage, with the element step already applied. A charging machine shows "charging" and the blow it will release next round.
2. **You plan.** One order per companion: a move and a target. The screen shows the result of the whole plan as you build it.
3. **The squad acts**, left to right.
4. **The machines act.** Each machine that is still standing and was not stopped carries out what it declared, halved if it was weakened or its target is guarded.

### The six verbs

A move reads as one verb, or a verb and a rider (Strike 8 + Weaken).

| Verb | What it does, this round | Read from the record |
|---|---|---|
| Strike N | N damage to one machine | harm on the target; a degrading status adds one tick to N |
| Sweep N | N damage to every machine | harm with an area |
| Stop | The machine's declared action does not happen; a charge breaks | a move whose point is binding, shock or entranced; displace |
| Weaken | The machine's declared blow is halved | a status riding on a damaging move; frightened, blinded, slowed, sedated, disoriented on their own |
| Guard | Blows on one companion (or itself) are halved | protect, ward, shielded, reinforced, protected, focused |
| Mend N | Restores N to one companion | restore; mending |

Timing words stay as they are on the screen now: ready, rests 1, rests 2, once (the signature). A companion's prolonged move acts at once and rests 2.

A passive reads as one flat line on the companion or not at all: "mends N each round" (ongoing restore), "blows on it are halved" (ongoing protect). Triggered passives are cut for now.

### Elements

Strong ×1.5, normal, weak ×½. Physical moves are normal against everything, as now. The machines are sand, light and electric, so the whole chart the player ever meets is three columns:

| Companion element | Sand | Light | Electric |
|---|---|---|---|
| Fire | weak | weak | normal |
| Water | strong | normal | weak |
| Air | strong | normal | normal |
| Electric | weak (immune today) | normal | normal |
| Rock | strong | normal | normal |
| Plant | strong | strong | normal |
| Chemical | weak | weak (immune today) | normal |
| Light | weak | weak | normal |
| Dark | normal | strong (×2 today) | normal |
| Psychic | normal | strong | normal |
| Ghost | strong | weak | strong |
| Metal | strong | strong (×2 today) | weak |
| Ice | weak | weak | normal |
| Sand | normal | normal | strong |

### Machines

Machines use the same verbs. The five cards reduce to:

| Machine | Declares |
|---|---|
| Crawler | Strike 7 (its corroding rider is cut) |
| Drone | Strike 7, light |
| Shield unit | Strike 6, or Guard itself |
| Discharge unit | Strike 7, or charges Capacitor rush 16 |
| Central guardian | Strike 7 + Stop (the companion loses its next move), or charges Core surge 18 |

A machine still picks whom to hit the way it does now (larger bodies more often); the difference is that the pick is made and shown before you plan.

### What the screen shows once a companion is selected

- On each key: its verb and number, and its timing word.
- On each machine: its declared blow (target portrait and number), an element mark for the selected companion (strong, weak, or nothing), a finishing mark keyed to any move that finishes it, and a guard mark when it guards.
- Hovering a key confirms by drawing its result on the machines, but nothing needs a hover to be known.

The turn strip, "later" and "sooner", chance percentages, status durations, and the expected-threat bar all go.

## What each cut costs

| Cut | What the game loses | Why it is worth it now |
|---|---|---|
| Hidden machine orders | Bluffing; the tension of not knowing | Every stop and guard becomes an exact number; Into the Breach's clarity |
| Speed interleave | Fast companions mattering; the race to act first | "Finish it before it strikes" is always true; the turn strip goes |
| Status fit (closing, ranged, held) | "Bind the charger, blind the gunner" texture | The largest invisible cause (27%); Stop and Weaken read on any machine |
| Rolls | Swingy moments | Every preview is exact |
| Durations and ticks | Setting up next round | Nothing to track between rounds except charges |
| Area geometry | Aiming the middle of the row | With three machines the puzzle was small (18% of uneven grids) |
| Innate protections, triggered passives, cleanse | Creature individuality at the edges | 10%, 3% and 1% of creatures or moves; they can return as flat lines |
| Five element steps | ×2 and immunity | One mark, three states |

Each is a lever, not a ruling: any of them can come back once the base game reads cleanly, one at a time, with the grid tool rerun to show it did not bring back invisible differences.

## Build plan

1. **Rules pass.** The reading seam maps each move to its verbs; the resolver runs the four-step round; machines declare at round start; `value.ts` prices from the declared blows. SAVE_VERSION 11. Rules tests rewritten for the new round. Sim: rerun the look-ahead and naive players on the preset squad and random drafts and retune `MACHINE_HP_FACTOR` so the preset squad sits where it does now (naive about 93%). Rerun the grid tool: flat or visible should be 100%, and "best move differs by machine" should stay well above zero.
2. **Screen pass.** Keys carry verbs and numbers; machines carry their declared blow and the three marks; the turn strip goes. The move console concept is redrawn on these rules before it is built.
3. **Readers.** Blind Opus readers on the live build, with the question this started from: "which move is best on which machine, without clicking a move." Then Nick's cold play.

## Friction reported

- **Speed has no job in battle.** Agility and reflex feed speed, and speed only ordered the turn. After this proposal the attribute does nothing here. Smallest fix: leave it unused in Powerworks for now; if the game wants it back, one readable use is a "quick" mark (a companion faster than a machine acts before it), which reintroduces one pairwise comparison and should be measured with the grid tool first.
- **Most of a creature's status vocabulary collapses to two verbs.** Paralyzed, frozen, pinned and stunned all read as Stop; frightened and blinded both read as Weaken. The names stay on the moves, so the creature still sounds like itself, but the game no longer distinguishes them. This is the intended trade.
- **Support stays thin.** Guard and heal are 3% and 2% of moves, and the preset squad aims none at a squadmate. The "who do I protect" question depends on having a guard; that is a squad-composition question for later, not a rule.

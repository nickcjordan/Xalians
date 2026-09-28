# Powerworks pillars: the battle rebuilt from what the platform is about

Status: direction approved by Nick, 2026-09-28 ("let's go with this direction"). Brainstorm in progress: the pillars below are settled as a direction; the pieces under "Still to design" are not. Supersedes the battle rules in [powerworks-v5-mechanics.md](powerworks-v5-mechanics.md) once built; [powerworks-simplification.md](powerworks-simplification.md) is the measurement and the option that was not adopted.

## Context

Nick asked for a game where a player who has selected a companion can see how each of its moves fares against each enemy without selecting the move, and said the game had tried to implement every mechanic the creature schema could express too early. The first simplification proposal was scoped to the one existing dungeon (three machine elements) and was not adopted: every rule here has to hold for all fourteen elements, many themed dungeons, and enemy types not yet imagined.

The pillars come from what the platform is: fourteen worlds, each creature built for its world's element; creatures generated from their anatomy, so every kit is different; one collection used across games.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Element works in both directions: a move's element against its target, and an enemy attack's element against the companion it hits. | 90%, Nick named element as a big pillar; approved direction | This conversation, 2026-09-28 |
| 2 | Players never need the 14×14 chart memorized: the screen shows the computed matchup on each enemy for the selected companion. The shared chart (`typeEffectivenessMatrix.json`) stays as it is. | 85%, 10 of 1,204 fieldable creatures carry moves of two elements, so one mark per enemy covers almost every companion | `devtools/powerworksGrid.ts` census |
| 3 | Physical moves are steady (never strong, never weak); elemental moves swing with the matchup. | 80%, already the rule (`PHYSICAL_HARM_NEUTRAL`); it becomes a named decision | `packages/rules/src/dungeon/levers.ts` |
| 4 | An attack has one power number, from the move's intensity; element synergy is the only thing that changes it from one target to another. An area attack hits everything it reaches with one reduced number. | 85%, Nick: "attack power can be enhanced or reduced based on the synergy of the elements" | This conversation |
| 5 | Support is four kinds, each with one number in health: Heal N, Shield N, Boost +N, Hinder −N. Each aims at one target, or at everyone for a smaller number. | 85%, Nick approved; the record's restore, protect, enhancement and weakening effects all fold into them | Table below |
| 6 | Element does not touch support in the base game. | 70%, keeps element the attack axis; elemental shields are a candidate layer | This conversation |
| 7 | Rest times from the record stay (ready, rests 1, rests 2), and the signature stays once per fight. | 80%, cheap to read, gives the "when" decision | `levers.ts` `COOLDOWN_ROUNDS` |
| 8 | Speed is turn order and nothing else: one number per unit, fastest acts first, the order fixed for the whole fight, ties by a fixed rule shown on the turn strip. Nimble, the immediate-preparation bonus and the rotating tie order are cut; slowed stays parked with lasting effects. | 90%, Nick approved 2026-09-28: giving one side the first strike would invent a rule, and speed is easy to understand | This conversation; `index.ts` `initiative`, `nimbleFactor` |
| 9 | Shield and Hinder wait for the next hit, so turn order never wastes them: a shield holds until used up or until its caster's next turn; a hinder applies to the enemy's next attack, next round if it already struck. Heal lands at once. | 85%, approved with decision 8 | This conversation |

## The pillars

**Element, both directions.** Your move's element against the enemy's; the enemy attack's element against your companion's. With a companion selected, each enemy wears the result for that companion's element. This scales to any dungeon and any enemy without the player learning the chart.

**Attack power.** One number per attack. Element is the only per-target modifier. Physical is the sure hit; elemental is the gamble on the matchup.

**Support, in one currency.**

| Support | What it does | What it reads from the record |
|---|---|---|
| Heal N | Restores N health now | restore, mending |
| Shield N | Absorbs the next N damage on an ally; holds until used up or until its caster's next turn | protect, shielded, reinforced, resistant |
| Boost +N | The ally's next attack deals N more | stimulated, focused (the enhancement family) |
| Hinder −N | An enemy's next attack deals N less, next round if it has already struck | frightened, blinded, slowed and their like; binding may be the strong form |

Every number is health, so "strike for 8" and "shield for 6" compare directly.

**Timing.** Ready, rests 1, rests 2; the signature once per fight.

**Speed.** Turn order, nothing more: the fastest acts first, and the order is set when the fight starts and never changes, so it is learned once per fight. Turn order decides whether a finishing blow lands before the enemy strikes, so the finishing mark reads in two forms, before it strikes and after. Supports wait for the next hit, so order only changes which attack they cover, never whether they count.

A round is three pulls: attack to end the fight sooner, support to survive it, aim for the matchup, plus when to spend a move that rests.

## Parked: reintroduce one at a time after the pillars are built

Nick, 2026-09-28: hold these off and reintroduce them one by one once the pillars are ironed out. Each comes back alone, with the grid tool rerun to show it did not bring back differences the screen cannot show.

| Parked mechanism | What it would add | What it costs |
|---|---|---|
| Showing each enemy's next move | Shield and Hinder become exact numbers | Surprise |
| Lasting effects (burning over rounds, statuses with durations) | Setting up future rounds | State to track between rounds |
| Chance on statuses | Swing | Inexact previews |
| Charged enemy attacks (a big blow announced a round ahead) | A clear "stop it" puzzle | A second kind of enemy turn |
| Elemental shields | Element reaches support | A second element axis |

Also parked from the current engine: area geometry by aim, status fit (closing versus stationary, ranged), innate protections, triggered passives, cleanse, displacement as its own effect.

## What the creatures can supply today

Every move of the 1,204 creatures a player could field (the preset squad and 150 draft offers), read in the pillars' terms (`devtools/powerworksGrid.ts`, "Move shape"):

| Move shape | Share |
|---|---|
| Attack | 55% |
| Hinder (standalone; includes the binding moves) | 16% |
| Attack on an area | 10% |
| Shield on itself | 4% |
| Attack + a lasting effect (parked) | 3% |
| Shield on an ally | 2% |
| Heal | 1% |
| Attack + hinder | 1% |
| Attack + heal itself (a drain) | under 1% |
| Boost | 0 |

About 94% of moves are one kind already, so "one move, one kind, one number" loses little. The riders that exist (attack + hinder, drains) are 2%.

**Friction reported, 2026-09-28.** Boost has no source: no species' acts produce `stimulated` (the enhancement status is in the vocabulary, `packages/content/src/schema/status.ts`, but `acts.ts` never derives it), and `focused` reads as a guard. Heal is 1% of moves and shielding an ally 2%, so most squads a collection can field have no support aimed past themselves, and "who do I protect" rarely comes up. Smallest fix, for Nick to rule on: an authoring pass over the species audits for anatomy that justifies helping a squadmate (restoring secretions, signals that rally, bodies that cover others), adding enhancement and ally-aimed acts where the anatomy supports them, versioned as a new generation release. Until then Boost can live on enemies only.

## Still to design

1. **Enemies: settled.** Already ruled in [creature-adventure-design-workshop.md](creature-adventure-design-workshop.md) ("Dedicated dungeon enemies accepted", 2026-09-16), restated by Nick 2026-09-28: enemies are creatures with every mechanic the squad has, authored by us to fit the existing worlds and elements, and never part of the canon or the generator pool, so a dungeon needs no deep backstory and cannot conflict with lore. A dungeon is designed by picking a place, imagining the scene, and building its enemies from the roles, the mechanics and the lesson that dungeon should teach. Settled per dungeon when the first one is designed, not as general rules: whether enemies are reused between dungeons, and each enemy's move count and signature budget (the workshop allows these to differ from the squad's).
2. **The base round: settled.** The whole squad plans together; enemy orders stay hidden (workshop); units act in speed order, fixed for the fight (decision 8); an attack whose target has fallen goes to the next enemy in the row (workshop).
3. **Numbers.** How intensity becomes power and support degree, health scale, the element steps, how big an area's reduction is.
4. **Dungeons and squads.** Themed dungeons, and what a squad meets in them. Not a reopening of Nick's 2026-09-24 ruling: the game will be played with a person's own creatures, and building squad selection now would be throwaway code, so the run keeps the preset squad while the design assumes any squad a collection can field.
5. **The screen.** Checked against the question this began with: which move is best on which enemy, without selecting a move.

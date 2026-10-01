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

## What the schema can express

Fit is judged against the creature schema (`packages/content/src/schema/ability.ts`, `status.ts`), not against the creatures generated so far: almost all of those predate the current design guidelines (Nick, 2026-09-28), so they are a check on the present, never evidence of what a future creature can be. Every effect kind the schema defines lands in a pillar or a named parked slot:

| Schema effect | Pillar |
|---|---|
| harm (elemental, or impact, cutting, piercing, compression) | Attack: elemental swings with the matchup, the rest are physical and steady |
| restore, integrity | Heal |
| protect, against harm | Shield |
| enhance | Boost |
| suppress; restrain (movement or attention) | Hinder (restrain may be its strong form) |
| transfer of vitality from target to self | Attack plus Heal on itself (a drain) |
| displace | Attack, by its impact; displacement as its own effect is parked |
| status: protection family (shielded, reinforced, resistant) | Shield |
| status: enhancement family (stimulated, focused) | Boost |
| status: restoration family (mending) | Heal (lasting effects are parked, so it lands at once) |
| status: movement, sensory, mental families | Hinder |
| status: thermal, degradation, chemical families (burning, corroding, poisoned) | Parked with lasting effects |
| status: information family (revealed, marked); reveal | Parked; reveal intent is a natural way back in for "showing an enemy's next move" |
| restore, composure or reserve; protect, against impairment; remove; transfer of other resources | Parked; they need statuses or resources the base game does not track |

The schema's targeting (`relation: other`) lets any helpful effect name a squadmate, so all four supports can aim at an ally.

Rare support is intended, not a gap. The workshop ruled on 2026-09-14 ("Future support capabilities", "Current creature audit and rare support direction") that healing and buffing are relatively rare, lore-gated capabilities, possibly absent from a starting squad, that give a reason to learn the lore and pursue a creature; core dungeons must be winnable by a healer-free squad. The pillars keep that: Heal, Shield and Boost exist for the creatures that have them, and nothing grants them generically.

A check on the present, not a verdict: of the 4,816 moves of the 1,204 creatures a player could field today (`devtools/powerworksGrid.ts`, "Move shape"), about 94% are already one kind, and no current species produces an enhance or `stimulated` effect.

## Still to design

1. **Enemies: settled.** Already ruled in [creature-adventure-design-workshop.md](creature-adventure-design-workshop.md) ("Dedicated dungeon enemies accepted", 2026-09-16), restated by Nick 2026-09-28: enemies are creatures with every mechanic the squad has, authored by us to fit the existing worlds and elements, and never part of the canon or the generator pool, so a dungeon needs no deep backstory and cannot conflict with lore. A dungeon is designed by picking a place, imagining the scene, and building its enemies from the roles, the mechanics and the lesson that dungeon should teach. Settled per dungeon when the first one is designed, not as general rules: whether enemies are reused between dungeons, and each enemy's move count and signature budget (the workshop allows these to differ from the squad's).
2. **The base round: settled.** The whole squad plans together; enemy orders stay hidden (workshop); units act in speed order, fixed for the fight (decision 8); an attack whose target has fallen goes to the next enemy in the row (workshop).
3. **Numbers.** How intensity becomes power and support degree, health scale, the element steps, how big an area's reduction is.
4. **Dungeons and squads: settled by the workshop.** Each dungeon's enemies form a cohesive theme explained by the place; teaching belongs to the dungeon as a whole, from simple behaviors to combinations, and ordinary attackers need no lesson of their own ("Cohesive dungeon themes accepted", "Teaching belongs to the dungeon", 2026-09-16). Core dungeons are validated with healer-free squads (2026-09-14). The run keeps the preset squad for now: the game will be played with a person's own creatures, and building selection today would be throwaway code (2026-09-24); the design assumes any squad a collection can field.
5. **The screen.** Checked against the question this began with: which move is best on which enemy, without selecting a move.

## Screen concepts, 2026-09-28

Three concepts were drawn on the live stage with pillar numbers computed from the real records (mock tooling, untracked). The page with every shot is https://claude.ai/artifact/6kQbLYJDZ9jLqG6zTG1wfB.

- **Answer keys** (recommended): each move key carries its result on every enemy, one cell per enemy in stage order, headed by the enemy's letter; a move that deals the same to everyone collapses to one number. Independent critic 50 of 80.
- **Ledger**: results written under each enemy's plate. Critic 39; the panels bury the enemy art.
- **Marks**: one matchup mark per enemy, and the player does the sum. Critic 38; the arithmetic fails the test.

Shared vocabulary: the landed number with a chevron (green when good for you, red when bad), a struck circle for no effect, enemy letters on every plate, a filled ember cell when a finish lands before the enemy strikes and an outlined cell with crossed swords when it strikes first, the enemy's hit on the selected creature on its plate, and Hinder shown as that hit before and after (9 → 0).

Blind Opus readers got every damage, immune, hit and knockout answer on all three. Before-or-after was read correctly once the turn strip showed speed order; a discarded round showed readers trust the strip over any mark. Still open: an area Hinder is not previewed on the enemies, the keys cover the enemies' lower edge at 1920, the column heads on a phone, and the intensity scale (Avilily's pecks read as 1).

## Research: where other games put the element, 2026-09-28

Report with sources: https://claude.ai/artifact/Qr6h3cTBpP2xQHwYFRpc3S. Every hero battler studied (Dungeon Boss, Summoners War, Epic Seven, Raid, AFK Arena, Honkai: Star Rail) puts the element on the unit, not on each move, so the move-by-enemy grid collapses to one advantage mark per enemy (arrows on targets) and skills differ in shape, effect and timing. Advantages are small (10 to 30%) or yes/no weaknesses (Star Rail, Octopath, Fire Emblem Engage), often paid out in turns, shields or breaks rather than damage. Pokémon keeps per-move types and has the screen label each move per target. Full-information tactics games (Into the Breach, Slay the Spire, Wildfrost) keep numbers small, put per-target variance in visible target states, and always show enemy intents.

Paths proposed for Powerworks, awaiting Nick: 1, the element belongs to the creature (recommended; 1b keeps physical moves steady); 2, one damage number per creature, moves differ only in effect; 3, yes/no weakness with a shield-and-break payoff (a later layer); 4, only visible target states change results; 5, keep per-move elements and let the screen compute (answer keys).

## Rules pass: Path 1 in the engine, 2026-09-28

Nick chose Path 1 (every attack takes its creature's element), with Path 2 (one damage number per creature) measured in the simulator rather than drawn. The pillar rules are a new engine beside the v5 one, `packages/rules/src/dungeon/pillars/` (`@xalians/rules/dungeon/pillars`): `read.ts` turns a record's moves into an attack power, an element and at most one of each support; `engine.ts` resolves rounds; `levers.ts` holds every number; `policy.ts` and `devtools/pillarsSim.ts` measure it; `pillars.test.ts` pins the rules. The live page still runs the v5 engine until the screen pass moves it over.

Decisions made while building, each a lever:

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 10 | An area attack hits every standing enemy at 0.6 of its power (area geometry stays parked). | 80% | `pillars/levers.ts` `AREA_FACTOR` |
| 11 | A support aimed at everyone gives 0.6 of its number to each; binding is Hinder at 1.4 times. | 70% | `ALL_SUPPORT_FACTOR`, `BINDING_HINDER_FACTOR` |
| 12 | A prolonged preparation (the machines' Capacitor rush and Core surge, 4% of companion moves) acts at once and rests 2 rounds, since charged attacks are parked. | 75% | `PROLONGED_REST` |
| 13 | A shield absorbs before health and ends at its caster's next turn; boost and hinder are used up by the unit's next attack; a pass is always a legal order. | 85% | `engine.ts` |
| 14 | Enemies pick their strongest ready attack, a self-shield half the time when below 60% health, and whom to hit by size, all hidden. | 75% | `prepare` in `engine.ts` |

Measured (`node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsSim.ts --runs=120`, enemy health at 0.62 of the row, the prototype's setting; look-ahead over 30 runs):

| Rules | Squad | random | biggest number | planner | look-ahead | strongest hit changes with the enemy | best move changes with the enemy |
|---|---|---|---|---|---|---|---|
| Element on each move (today) | preset | 14% | 38% | 100% | 100% | 32% | 15% |
| Element on each move (today) | random draft | 32% | 63% | 68% | 80% | 7% | 13% |
| Path 1 | preset | 22% | 75% | 100% | 100% | 0% | 9% |
| Path 1 | random draft | 46% | 75% | 79% | 87% | 4% | 15% |
| Path 2 | preset | 13% | 19% | 95% | 97% | 0% | 0% |
| Path 2 | random draft | 31% | 47% | 53% | 50% | 1% | 9% |

Reading:

- **Path 1 reads as intended.** The move that hits hardest is the same on every enemy (0% on the preset squad against 32% today; the 4% left on drafts are ties and immune matchups). What still differs by enemy is finishing and shields, which the screen marks on the enemy.
- **Per-move power makes real decisions, so Path 2 is not taken.** At the same enemy health, Path 2 lowers every player's results and narrows the planner's lead over random play on drafts from 33 to 22 points; the value between the best move and the others drops from 2.3 to 1.6 health. `UNIFORM_POWER` stays in the levers, off.
- **Difficulty moved.** Every attack now carries an element, so the facility's three machine elements matter to every creature, and the same enemy health is easier on drafts. At 0.8 the planner wins 59% of random drafts and the naive "biggest number" player 14% of preset runs: steep. Enemy health is set in the screen pass against Nick's play.
- **Looking ahead adds little yet** (0 to 8 points): most choices are decided this round; rests add some timing. Worth watching when parked mechanisms return.

## Depth pass, 2026-09-28

Nick asked for one bounded pass on the mechanisms before the screen, because the rules pass hinted the choices were thin. Three questions, Path 1 rules, `devtools/pillarsDepth.ts` (150 runs per player; the look-ahead over 100, about ±10 points). New tooling: `pillars/roles.json`, a test facility whose rooms add support enemies built from the pillars' grammar (a Repair drone that heals, a Barrier node that shields, a Signal jammer that hinders, an Overclock relay that boosts; not canon); an enemy planner that weighs heal, shield, boost and hinder in health like the squad's; a "hardest-hit" player that sends every attack to the enemy it damages most; a rest-bonus lever.

**1. Difficulty.** On the preset squad a real gap exists: the prototype facility at 0.75 of row health, or the roles facility at 0.62, has random play winning 1 to 4%, the naive "biggest number" player about a third, and a careful player 87 to 100%. On random drafts the gap compresses (random about a quarter, careful 57 to 70%): the squad decides more than the play.

**2. Enemy roles and target choice.**

| Rooms | Enemy health | Squad | random | biggest number | hardest-hit targets | planner | look-ahead | look-ahead from hardest-hit | target choice worth |
|---|---|---|---|---|---|---|---|---|---|
| facility | 0.75 | preset | 4% | 32% | 100% | 100% | 99% | 98% | -2 pts |
| facility | 0.75 | draft | 22% | 47% | 56% | 57% | 57% | 58% | 4 pts |
| roles | 0.62 | preset | 1% | 36% | 97% | 87% | 93% | 96% | -1 pts |
| roles | 0.62 | draft | 25% | 59% | 63% | 60% | 66% | 70% | 7 pts |

Choosing whom to hit is worth at most 7 points over the plain rule "hit the enemy your attack damages most", even with enemies that heal, shield and hinder. The support enemies made the facility harder, not deeper.

**3. Rests.** A bonus of 25% power per rest round raised what planning ahead is worth on the preset squad from 4 to 12 points (drafts unchanged at 6), but it also raised the machines' charged attacks (they rest 2), so the game got much harder (careful play 87% to 53%) and the two effects cannot be told apart. Not adopted; `restBonus` stays in the rules, off.

**Reading.** None of the three levers made the round-to-round choice clearly deeper. Under the pillars as built, the game is decided mostly by the squad and by one plain rule a player learns fast. The sim players are crude, so a person may find more, but the gap between thinking and the plain rule is small everywhere. The research points at where depth comes from in the games that have it: triage against known threats (Into the Breach, Slay the Spire, Wildfrost show enemy intents), and a threat you can stop (charged attacks). Both are parked mechanisms; this is the evidence to reintroduce one, measured with the same tool.

## Turn by turn, 2026-09-29

Nick, after watching the reference games: planning four creatures at once is the paralysis ("you have to click through each creature to see how their moves would result"); a timeline should decide who acts, and on each turn the player makes only that creature's choice. This replaces the workshop's whole-squad planning (2026-09-14, "Whole-squad planning selected") and makes hidden enemy orders moot, since an enemy chooses on its own turn. He also set the goal of "easy to learn, hard to master": a base that is fun as it is, and layers that add strategy for harder battles.

Built as `pillars/turns.ts` beside the whole-squad engine, with its own players (`turnPolicy.ts`), tests (`turns.test.ts`) and measure (`devtools/pillarsTurns.ts`). Two timelines and one layer, all levers:

- **Rounds**: every unit acts once per round, fastest first; two companions next to each other in speed act back to back.
- **Speed**: a unit's next turn comes `1000 / (100 + speed)` after its last, so faster units act a little more often. The first sweep used `1000 / speed` and the slow preset squad lost every run (machines at 45 to 65 acted up to twice as often as Crystorn at 28); `SPEED_BASE` 100 caps the spread at 1.34 times.
- **Turn-order layer** (`tempo`): slowing statuses and pulls push the target's next turn back 30% of its interval.

At matched difficulty (roles facility; enemy health 0.62, 0.62, 0.55, 0.55 so the naive player lands near a third on the preset squad; 150 runs, look-ahead 60):

| Mode | Squad | random | biggest number | hardest-hit | planner | look-ahead |
|---|---|---|---|---|---|---|
| whole-squad planning | preset | 1% | 36% | 97% | 87% | 93% |
| whole-squad planning | draft | 25% | 59% | 63% | 60% | 65% |
| turn by turn, rounds | preset | 2% | 26% | 100% | 84% | 82% |
| turn by turn, rounds | draft | 22% | 55% | 58% | 51% | 55% |
| turn by turn, speed | preset | 4% | 15% | 99% | 81% | 57% |
| turn by turn, speed | draft | 25% | 57% | 57% | 59% | 62% |
| speed + turn-order layer | preset | 15% | 27% | 100% | 97% | 97% |
| speed + turn-order layer | draft | 30% | 61% | 72% | 69% | 73% |

Reading:

- **Turn by turn costs nothing the sim can see.** Difficulty and the gap between careless and careful play match whole-squad planning at matched enemy health, and the choice per decision drops from a joint plan of four creatures to one creature's moves and targets.
- **The best player in every mode is a simple rule**: choose the move by its worth, and send an attack to the enemy it damages most. The planner and look-ahead do worse than that rule on the preset squad, so the sim's "thinking" players are weaker than the rule and cannot measure mastery depth. That is a limit of the tools, not evidence either way; depth now has to be judged by play.
- **The simple rule is the base game's good news**: a new player who hits where the marks say wins most runs. That is "easy to learn".
- **The turn-order layer is strong**: every player improves, random play most (2% to 15% on the preset squad). It needs tuning before it is a mastery layer rather than an easy button.

Recommendation: rounds as the base (one strip is one round, easiest to read), the speed timeline and the turn-order layer held as the first mastery layers, and the screen pass next so depth can be judged in play.


## Numbers pass, 2026-09-29

Context: the turn screen shows every attack's result on every enemy, and some of those numbers contradict their own marks. Avilily's pecks read "1 (strong matchup)", and on a weak matchup a peck reads 0, which looks like immunity. The cause is the scale, not the chart: attack power is `floor(intensity / 10)`, so across the 4,614 attacks of the roughly 1,200 creatures a player can field (census over draft seeds 1 to 200), 12% have power 1. On those, a strong step (x1.5) changes nothing and a weak step (x0.5) floors to 0. Supports share the scale (Hinder 7, Shield 5, Heal 6 at the median), so they move with it.

Goal: every element step is visible on every attack (immune 0 < weak < neutral < strong), with the balance between the sides unchanged, so difficulty stays a separate lever for play.

### Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Double the scale: attack and support divisors 10 to 5, and every unit's health times 2 (`HEALTH_SCALE`, applied to both sides in `fighter`), so time to knock out is unchanged and the smallest attack is power 2 or more. | 80%, the smallest change that makes every step visible; the cost is three-digit health on the largest units (companion p95 76 becomes 152) | census above; `pillars/levers.ts` `POWER_DIVISOR`, `SUPPORT_DIVISOR` |
| 2 | Round half up instead of flooring, at the read (power) and at the matchup (power x step); a non-immune attack deals at least 1 before boost and hinder. Flooring made weak steps harsher than the chart (3 x 0.5 dealt 1, a third). | 85% | `engine.ts` `attackOn`, `read.ts` `readMove` |
| 3 | The chart's steps are unchanged; only how they round. | 90%, Nick's ruling (PR #724: shared chart unchanged) | "Rules pass" above |
| 4 | Difficulty stays where it is: after the rescale, enemy health factor is retuned so the hardest-hit rule and the random player on the preset squad land within 3 points of today's turn-by-turn rounds figures; the target itself comes from Nick's play. | 75% | "Turn by turn" table above |
| 5 | Fixed health amounts scale too: the recovery station 10 to 20. | 90% | `RECOVERY_STATION_HP` |
| 6 | Saves move to version 2; a version 1 run is dropped and a new run starts (the page already does this on a version mismatch). | 90% | `PILLAR_SAVE_VERSION`, `powerworksTurnsPage.tsx` load |
| 7 | The very weakest area attacks (power x 0.6 below 1.5) may still read weak equal to neutral at 1; accepted and counted rather than special-cased. | 70% | census after the change |
| 8 | The v5 engine and `/powerworks/classic` keep their own levers; this pass touches only `pillars/`. | 95% | `dungeon/levers.ts` `HP_SCALE` is shared with the classic page |

### Built and measured, 2026-09-29

Built as decided: `POWER_DIVISOR` and `SUPPORT_DIVISOR` 5, `HEALTH_SCALE` 2 (applied once, in `fighter()`, so both sides and both engines get it), round half up everywhere a power or support number is scaled (`read.ts`, `stepDamage` and `allShare` in `engine.ts`, and the sim players and the page's key view through the same two helpers), `RECOVERY_STATION_HP` 20, `PILLAR_SAVE_VERSION` 2. The look-ahead players' position value scales its two fixed health constants (25 per standing companion, 60 for reaching camp) by `HEALTH_SCALE`, so those players value what they did before.

**Census** (`devtools/pillarsNumbers.ts`, 1,600 creatures and 4,614 attacks from the draft offers of seeds 1 to 200, the engine's own `attackOn`):

| | before | after |
|---|---|---|
| weak step not strictly between 0 and neutral | 555 (12.0%), all dealing 0 | 19 (0.4%), none dealing 0 |
| strong step not strictly above neutral | 504 (10.9%) | 0 |
| health p5 / p50 / p95 | 31 / 58 / 76 | 62 / 116 / 152 |
| median Hinder / Heal / Shield | 7 / 6 / 5 | 14 / 13 / 11 |

Attack power, by bucket (count of attacks):

| power | 1 | 2 to 3 | 4 to 6 | 7 to 9 | 10 to 12 | 13 to 18 |
|---|---|---|---|---|---|---|
| before | 555 | 1,809 | 1,889 | 361 | 0 | 0 |
| after | 19 | 394 | 1,236 | 1,285 | 1,029 | 651 |

The 19 attacks that still fail are area attacks at power 1 (power x 0.6 rounds to 1): their weak step reads 1, equal to neutral. Accepted (decision 7).

**Difficulty** (`devtools/pillarsTurns.ts`, turn by turn on the round timeline, roles rooms, 150 runs, look-ahead 60 runs). Baseline is the unchanged engine at enemy health 0.62. The rescale alone made the game easier (at 0.62: random 27%, biggest number 81% on the preset squad), because rounding up and the weak-step floor add damage on both sides; the factor was retuned to 0.76 (sweep below).

| Squad | | random | biggest number | hardest-hit | planner | look-ahead | turns per encounter |
|---|---|---|---|---|---|---|---|
| preset | baseline (0.62) | 2% | 26% | 100% | 84% | 82% | 21.7 |
| preset | after (0.76) | 5% | 40% | 97% | 82% | 67% | 22.5 |
| draft | baseline (0.62) | 22% | 55% | 58% | 51% | 55% | 34.1 |
| draft | after (0.76) | 27% | 53% | 61% | 51% | 48% | 41.8 |

Turns per encounter are companion turns, hardest-hit rule, averaged over the encounters each run enters.

Enemy health sweep (random / biggest number / hardest-hit, 150 runs):

| Enemy health | preset | draft |
|---|---|---|
| 0.62 | 27% / 81% / 100% | 37% / 72% / 72% |
| 0.68 | 10% / 57% / 99% | 32% / 65% / 73% |
| 0.74 | 5% / 43% / 99% | 30% / 61% / 65% |
| 0.75 | 5% / 41% / 97% | 27% / 53% / 61% |
| 0.76 | 5% / 40% / 97% | 27% / 53% / 61% |
| 0.77 | 5% / 34% / 96% | 27% / 51% / 60% |
| 0.78 | 3% / 33% / 96% | 26% / 51% / 62% |
| 0.80 | 0% / 25% / 94% | 24% / 47% / 59% |

`ENEMY_HP_FACTOR` is 0.76: the hardest-hit rule (97%) and the random player (5%) on the preset squad each sit exactly 3 points from the baseline, which is the edge of the tolerance, and the draft squad is closest there. The biggest-number player on the preset squad is 14 points easier than before (40% against 26%) and does not come back without pushing the hardest-hit rule below the tolerance; this pass did not chase it. The look-ahead player reads 15 points lower on the preset squad (67% against 82%); 60 runs is a wide interval, and the sim's thinking players were already weaker than the simple rule.

Screen: the geometry check passes at 1920x1080, 1366x768 and 844x390 with three-digit health on every plate (387 checks, 0 failures), and the flow plan runs without errors.

Run:

```
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsNumbers.ts
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=compare --modes=1 --hps=0.76,0.76,0.76,0.76 --rooms=roles --runs=150 --look=60
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=sweep --modes=1 --runs=150 --hp=0.7,0.76,0.8
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=length --modes=1 --hp=0.76 --runs=150
```

### Against the sample set, 2026-09-29

The catalog is still being filled in, so many mechanisms the creature guidelines allow are barely exercised by today's creatures (no species produces a boost, heals are 1% of moves). Every measure below reports the real catalog and the creature sample set ([creature-sample-set.md](creature-sample-set.md)) as separate columns, never merged. Three sources: **catalog** (the draft offers of seeds 1 to 200, 1,600 creatures, as in the census above), **samples** (the 168 generated records of the 56 sample species, 14 roles by 14 elements, 7 attribute profiles, 5 output bands), and **grid** (each of the 472 effect-grid actions read as the only move of a standard unit, attributes 50). Nothing here changed a lever; the findings propose them.

Built: `createTurnRunFrom(seed, records, rules)` in `turns.ts` starts a run from an explicit list of records (same reading and rules; `"starter"` and draft squads and the save format are untouched, and the run's `squad` field is a placeholder, so it is a measuring run, never a saved one). `pillarsNumbers.ts` takes `--source=catalog|samples|grid|all`. `pillarsTurns.ts` takes `--part=sources --squads=preset,draft,samples,mixed` and `--part=roles --roleruns=600`. Tests: `pillars/samples.test.ts` plays all 168 sample creatures, each with three starters, to an end (no exception, no NaN or negative health, finite event amounts, under a 3,000-command cap), and `powerworksTurns/view.samples.test.ts` steps 20 squads (every one of the 14 roles) and renders `turnView`, `eventWords` and `playback` at every state with no NaN, undefined or null in any string.

**Census by source** (`pillarsNumbers.ts`, the engine's own `stepDamage` and `attackOn`):

| | catalog | samples | grid |
|---|---|---|---|
| creatures or actions | 1,600 | 168 | 472 |
| attacks (area) | 4,614 (762) | 404 (43) | 183 (63) |
| attack power, max | 18 | 26 | 30 |
| weak step not strictly between 0 and neutral | 19 (0.4%) | 25 (6.2%) | 18 (9.8%) |
| strong step not strictly above neutral | 0 | 0 | 0 |
| health p0 / p5 / p50 / p95 / p100 | 46 / 62 / 116 / 152 / 166 | 16 / 20 / 100 / 204 / 208 | none (no health of its own) |

All weak-step failures are power 1 in every source. Support numbers, count and p5 / p50 / p95 (max):

| Kind | catalog | samples | grid |
|---|---|---|---|
| heal, ally | 63: 9 / 13 / 13 (13) | 35: 2 / 11 / 26 (27) | 25: 2 / 10 / 20 (30) |
| heal, self | 33: 2 / 3 / 6 (9) | 42: 1 / 7 / 16 (26) | 23: 2 / 5 / 15 (30) |
| shield, ally | 127: 11 / 12 / 12 (13) | 15: 5 / 11 / 19 (20) | 24: 2 / 10 / 20 (30) |
| shield, self | 269: 10 / 10 / 14 (14) | 50: 9 / 10 / 21 (27) | 63: 5 / 10 / 10 (30) |
| hinder | 1,192: 10 / 14 / 14 (21) | 125: 10 / 14 / 27 (38) | 51: 4 / 10 / 14 (30) |
| boost, ally | 1: 10 | 13: 5 / 20 / 25 (26) | 13: 10 / 10 / 10 |
| boost, self | none | 1: 14 | 11: 10 / 15 / 15 (15) |

**What the pillar reading does not read** (grid, each effect read alone; 510 effects, 399 read, 111 not read; 103 of the 472 whole actions turn into nothing, no attack and no support):

| Effect x recipient | read | not read | read as |
|---|---|---|---|
| harm x target / area | 111 / 57 | 0 / 0 | attack / area attack |
| harm x self | 0 | 3 | |
| displace x target / area | 12 / 7 | 0 / 0 | attack (x0.6) / area attack |
| displace x self | 0 | 2 | |
| restore x target / area / self | 22 / 2 / 20 | 1 / 0 / 1 | heal ally (self for a drain) / heal all / heal self |
| protect x target / area / self | 14 / 2 / 10 | 1 / 0 / 1 | shield ally / shield all / shield self |
| remove x target / area / self | 0 | 11 / 8 / 8 | |
| status x target | 56 | 32 | boost 11, heal 1, hinder 38, shield 6 |
| status x area | 20 | 18 | boost 2, heal 1, hinder 14, shield 3 |
| status x self | 66 | 25 | boost 11, heal 2, shield 53 |

Not read, by reason (effects): lasting damage ticks (burning, chilled, corroding, overheated, poisoned on a target or area) 37; cleanse (`remove`) 27; a hostile status on itself 17; a number that rounds to 0 (intensity 1 restore, protect or slowed) 5; concealment 4; phased 4; harm aimed at itself 3; deafened, revealed, marked, dispersed 3 each; displacement aimed at itself 2. So Powerworks exercises harm, displace, restore, protect, and the helping and hindering statuses; it does not exercise cleanse, damage over time, concealment, perception statuses (deafened, revealed, marked), phasing or dispersal. Dead keys (a move that reads as nothing) are 4.2% of catalog moves and 2.8% of sample moves (9 of 168 sample signatures, all status-appliers); the sample set is no worse here than the catalog.

**Difficulty by source** (`pillarsTurns.ts --part=sources`, round timeline, roles rooms, `ENEMY_HP_FACTOR` 0.76, 150 runs, look-ahead 60; the run has four rooms; mixed is two starter companions and two sample creatures; unfinished is a run still going after 3,000 commands):

| Squads | random | biggest number | hardest-hit | planner | look-ahead | hardest-hit won / lost / retreated / unfinished | mean rooms entered (of 4) | turns per encounter |
|---|---|---|---|---|---|---|---|---|
| preset (catalog) | 5% | 40% | 97% | 82% | 67% | 97% / 3% / 0% / 0% | 4.00 | 22.5 |
| draft (catalog) | 27% | 53% | 61% | 51% | 48% | 61% / 25% / 11% / 2% | 3.92 | 27.0 |
| samples | 17% | 35% | 35% | 35% | 53% | 35% / 37% / 23% / 5% | 3.39 | 35.1 |
| mixed | 12% | 37% | 48% | 38% | 52% | 48% / 39% / 12% / 1% | 3.75 | 32.6 |

Turns per encounter are over finished runs only; the earlier table's draft figure (41.8) included the unfinished runs at the cap, which is why it moves to 27.0 here. On sample squads the hardest-hit rule (35%) is no better than the biggest number (35%) and the planner (35%), and the look-ahead (53%, 60 runs) is 18 points better: these squads have real decisions that the catalog squads do not (supports, drains, boosts) and the simple rule is worse at them.

**Win rate by the role, profile and band of each squad member** (600 sample squads, hardest-hit; a squad counts toward every value it holds, so rows overlap; all squads 36% won, 39% lost, 20% retreated, 4% unfinished, 3.37 rooms):

| role | squads | won | lost | retreated | unfinished | mean rooms |
|---|---|---|---|---|---|---|
| ally-healer | 147 | 31% | 41% | 23% | 5% | 3.29 |
| ally-shielder | 145 | 32% | 40% | 24% | 4% | 3.41 |
| area-striker | 153 | 44% | 31% | 22% | 3% | 3.52 |
| binder | 160 | 51% | 36% | 13% | 1% | 3.51 |
| booster | 141 | 40% | 37% | 16% | 8% | 3.51 |
| charger | 151 | 39% | 46% | 13% | 2% | 3.43 |
| displacer | 166 | 28% | 45% | 22% | 5% | 3.34 |
| drain | 165 | 49% | 35% | 10% | 7% | 3.42 |
| hinderer | 172 | 38% | 38% | 21% | 3% | 3.37 |
| pure-support | 163 | 20% | 51% | 24% | 5% | 2.93 |
| self-guard | 151 | 32% | 42% | 21% | 5% | 3.32 |
| self-healer | 149 | 33% | 40% | 17% | 10% | 3.18 |
| status-applier | 157 | 34% | 41% | 23% | 2% | 3.41 |
| striker | 162 | 37% | 38% | 23% | 2% | 3.52 |

| profile | squads | won | lost | retreated | unfinished | mean rooms |
|---|---|---|---|---|---|---|
| bulky | 295 | 33% | 43% | 21% | 3% | 3.44 |
| exceptional | 272 | 58% | 25% | 12% | 5% | 3.60 |
| fast | 261 | 43% | 33% | 18% | 7% | 3.56 |
| fragile | 282 | 34% | 44% | 17% | 4% | 3.34 |
| minimal | 273 | 21% | 45% | 29% | 5% | 3.08 |
| slow | 291 | 28% | 49% | 19% | 3% | 3.22 |
| standard | 242 | 44% | 28% | 24% | 3% | 3.51 |

| band | squads | won | lost | retreated | unfinished | mean rooms |
|---|---|---|---|---|---|---|
| 25 | 354 | 32% | 45% | 17% | 5% | 3.25 |
| 50 | 350 | 40% | 34% | 22% | 5% | 3.46 |
| 75 | 357 | 36% | 44% | 15% | 4% | 3.30 |
| 100 | 378 | 40% | 34% | 23% | 3% | 3.56 |
| 130 | 360 | 35% | 38% | 21% | 6% | 3.29 |

The band axis is nearly flat (32% to 40%), so the signature's output size does not decide runs; the profile axis does (minimal 21%, slow 28%, exceptional 58%), and pure-support is the weakest role (20%).

**Findings** (for Nick and the orchestrator to decide; no lever changed). Each is a shape the guidelines allow that the catalog does not yet have.

1. **Exceptional-band signatures can one-shot a small enemy.** Case: the sample drain and charger signatures at band 130 read as power 25 to 26 (catalog maximum 18; 15 of 404 sample attacks are above 18). At the best matchup step (x1.5 to x2) that is 39 to 52 damage against the Maintenance crawler (34 health), Security drone (36) and Signal jammer (34): 3 of 404 sample attacks (0.7%) can one-shot one, against 0 of 4,614 catalog attacks. Smallest lever: cap an attack's power at read, `MAX_POWER` 18 (the catalog's own maximum). Checked by arithmetic on the reading: with the cap, 0 of 404 sample attacks one-shot a small enemy. It costs the 15 attacks above 18 their extra power.
2. **Minimal and fragile profiles fall to a single blow.** Case: minimal creatures (every rating 8 to 12) have 16 to 20 health, fragile ones about 35, against the Discharge unit's blow of 32 and the Central guardian's 36 (the catalog's weakest creature has 46). Of the 24 minimal sample records, 12 fall from full health to the single worst enemy blow at its matchup step; 9 of 24 fragile do; 1 of the 1,600 catalog creatures does. 48 of 168 sample creatures are under 46 health. Minimal squads win 21% (standard 44%) and retreat 29%. Smallest lever: a floor on scaled health in `fighter()`, `HEALTH_FLOOR` 40 (above the strongest unboosted enemy blow, 36; the catalog minimum is 46). It changes only creatures under 40 (48 of 168 samples, none of the catalog).
3. **Weak steps collapse at low intensity.** Case: an attack at intensity 1 to 7 reads as power 1, where x0.5 rounds half up to 1, equal to neutral. 25 of the 404 sample attacks (6.2%, against 0.4% for the catalog) and 18 of the 183 grid attacks (9.8%) do this. All 25 sample cases are minimal-profile creatures: 25 of their 54 attacks are power 1 and 48 of 54 are power 2 or less; every other profile has none. Strong steps never collapse (0 in every source). Smallest lever: floor an attack's power at 2 after the area factor, `MIN_POWER` 2, so a weak step deals 1 and a neutral hit 2. It doubles the smallest attacks.
4. **Supports dwarf attacks.** Case: sample support numbers reach 26 to 27 (heal), 25 to 26 (boost), 27 to 38 (hinder) and 27 (shield), against a sample median attack of 7, a catalog support p95 of 13 to 14 and the enemies' own strongest support of 16. A hinder of 38 cancels every enemy blow (the strongest is 36); a boost is flat, not scaled by the matchup, so a boost of 25 on a catalog p95 attack of 14 is 39, more than any small enemy's health (3 of 14 sample boosts reach 36 on a power-14 attack); 3 of 77 heals are at least the healer's own maximum health. Above 16: 15 of 125 hinders, 15 of 77 heals, 9 of 65 shields, 7 of 14 boosts. Smallest lever: cap a support number at read, `SUPPORT_CAP` 16 (the enemies' strongest support; it touches only the catalog's top tail, hinder max 21 against p95 14).
5. **Some fights never end.** Case: 25 of 600 sample squads (4.2%; 2% of catalog draft runs, 0% of the preset) are still fighting after 3,000 commands under the hardest-hit rule, 24 of them in the Security checkpoint (room 2) and 1 in the Power chamber. Example: striker-fire, hinderer-plant, hinderer-ghost, booster-dark (attack numbers 1 to 9): they take the drone and the crawler down, then chip the Repair drone (40 health) for 14 every fourth turn and its heal (16 to all, 10 each after the share) puts it back to 39 or 40 the next turn. The stall counter resets whenever any unit loses health, so each chip resets it and the fight cycles without end. The roles that end this way most: self-healer 10%, booster 8%, drain 7%. Smallest change (an engine rule, not a lever): reset `stalled` only when the enemies' total health reaches a new low for the encounter; or add a per-encounter turn cap lever. The page lets the player retreat, so this is mostly a simulation and scoring problem, but a fight a squad can neither win nor lose is a dead end for a player who does not think to leave.
6. **A squad of pure supports cannot damage anything.** Case: all 12 pure-support records have no attack. Four of them (60 squads) lose 60 of 60 in the first room; three starters and one pure-support win 23 of 60 (the preset squad of four starters wins 97%). Across the 600 squads, pure-support squads reach 2.93 rooms against 3.37 overall. Smallest change: a draft rule that a squad needs at least two attackers (the draft already guarantees answers), or a fallback strike for a unit with no attack (the classic page already has a desperate strike); neither is a numbers lever.
7. **Elements and dead keys are not a problem.** The step chart holds for every source (strong steps 0 failures) and dead keys are no more common in the samples (2.8% of moves) than in the catalog (4.2%). The reading table above is the list of what the game cannot yet show: cleanse, damage over time, concealment, perception statuses, phasing and dispersal.

Run:

```
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsNumbers.ts --source=all
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=sources --runs=150 --look=60
node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=roles --roleruns=600
```

### Decisions on the sample-set findings, 2026-09-29

Applied, each a lever or rule that reaches only shapes the catalog does not have yet (the preset squad's figures are unchanged: random 5%, hardest-hit 97%):

| # | Finding | Decision | Confidence | Evidence |
|---|---|---|---|---|
| 2 | Minimal and fragile companions fall to one blow | `HEALTH_FLOOR` 40 for companions only (enemies are authored). Minimal squads 21% to 24%. | 75%, a floor flattens the weakest bodies together; an affine health curve is the alternative if that ever matters | `levers.ts`, `engine.ts` `fighter` |
| 3 | Weak steps collapse at low intensity | `MIN_POWER` 2. Weak-step failures 0 of 4,614 catalog, 0 of 404 sample, 0 of 183 grid attacks. | 85% | census below |
| 5 | Fights that never end | The stall counter now resets only when either side's total health reaches a new low for the encounter; a total can only fall so often, so every encounter ends. Unfinished runs 0 in every source (samples were 4.2%, drafts 2%). | 90% | `turns.ts` `act`, `STALL_TURNS_PER_UNIT` |

Not applied, recorded so they can be reopened on evidence:

| # | Finding | Why not now |
|---|---|---|
| 1 | Band-130 signatures can knock out a small enemy in one hit (3 of 404 sample attacks, at the best matchup) | A signature is once per fight and an exceptional output should feel exceptional; a cap at the catalog's maximum would fit the rules to today's creatures. Reopen when a dungeon meets it. |
| 4 | Exceptional supports dwarf attacks (hinder 38 cancels any blow; boost 25) | Same reasoning: exceptional supports are rare by the workshop's ruling. One real question inside it stays open: a boost adds its flat number to every target of an area attack. |
| 6 | Pure-support squads cannot finish a room | A squad rule, not a number: when players field their own creatures, a squad needs an attacker or an attack-less unit needs a fallback strike. Squad building is deferred (2026-09-24). |

After the changes (round timeline, roles rooms, enemy health 0.76, 150 runs, look-ahead 60):

| Squads | random | biggest number | hardest-hit | planner | look-ahead | hardest-hit won / lost / retreated / unfinished | turns per encounter |
|---|---|---|---|---|---|---|---|
| preset | 5% | 40% | 97% | 82% | 67% | 97 / 3 / 0 / 0 | 22.5 |
| draft | 27% | 52% | 61% | 51% | 45% | 61 / 25 / 13 / 0 | 27.3 |
| samples | 17% | 37% | 38% | 37% | 53% | 38 / 32 / 30 / 0 | 34.0 |
| mixed | 12% | 35% | 49% | 40% | 53% | 49 / 37 / 14 / 0 | 31.7 |

Sample roles, hardest-hit over 600 squads: pure support 22% is the one outlier (finding 6); every other role sits between 31% (displacer) and 52% (binder). Profiles: exceptional 61%, standard 43%, minimal 24%, slow 29%. Output bands are flat (36% to 41%).

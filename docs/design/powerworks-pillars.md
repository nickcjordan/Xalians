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


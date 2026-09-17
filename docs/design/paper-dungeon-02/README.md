# Paper dungeon 02: The Dormant Powerworks

Working title; revised discussion fixture, 2026-09-16. This replaces the first fixture as the current paper design. No production implementation, planetary placement, canonical history, or final balance is implied.

## Setting and objective

An abandoned power facility still treats intruders as threats. Bring your four-Xalian squad through the service entrance, security checkpoint, and power chamber to disable the central guardian and reach the control chamber. Every enemy is a dedicated, noncollectible machine belonging to this game. They are not renamed collectible species or collectible variants. Their functions explain their design and behavior; ordinary attackers need no unique lesson.

The fixture uses existing player species/signature identities and the current elemental matchup chart. Player HP, speed, secondary moves and range remain temporary cards pending the separate moveset redesign. Enemy cards, names and elemental assignments are provisional authored content. No canonical files are changed.

## Play procedure and shared rules

A facilitator privately selects all enemy orders before seeing the player's committed orders. The player chooses one move and target for every standing squad member, then all actions resolve by descending speed. Display HP, speed, move rules, charge/recovery states and the matchup chart; keep selected enemy targets hidden. The transcripts are facilitator answer keys, not advance instructions for the player.

- Randomize each side's row at encounter setup and retain it. Position has no tactical effect except fallback targeting. If the original target falls, redirect the same move to the next living enemy in row order, wrapping around. Poor matchups still spend the move.
- Player creatures have three secondary moves with three uses each and one signature use per encounter. This is a temporary uniform count. Enemy actions have no use counters; behavior cycles constrain their special actions instead.
- Every standing actor gets one opportunity per round. Speed ties use alphabetical participating IDs rotated one place each round, a temporary neutral tie rule. A defeated actor cannot act. Stop immediately when one side has no standing units; remaining orders cost nothing.
- Damage is floor(base damage × attacker's primary-element matchup × ward factor). Ward factor is 0.5, otherwise 1. No critical hits, misses, defense subtraction, traits, perks, secondary affinities or same-element bonus in this isolated test.
- Every offensive move can target any living enemy. Melee means requiring approach, not a distance or row restriction.
- Snare blocks melee through the target's next opportunity, then expires even if the actor chose a permitted ranged action. Applied after the target acted, it affects the next round. A blocked player move consumes no use. Reapplication refreshes one opportunity, never adds durations. Chain protection and boss resistance remain open.
- The shield unit's self-ward halves damage until the beginning of its next opportunity. It can activate while snared and never protects an ally.
- An actor with no usable move waits as a diagnostic fallback only. Stop at 20 rounds as unresolved. Neither waiting nor that round limit is an accepted shipping rule.

## Enemy charge cycle

The discharge unit and guardian begin charging whenever ready and not restrained. That consumes their action and reveals a charge marker; they secretly select a target then. Their next opportunity must release at that target, with normal fallback if it fell. Snare blocks the melee release and dissipates the charge.

After either a release or an interrupted release, the unit spends its next opportunity in recovery: it may make its ordinary attack but cannot start charging. After that opportunity it is ready again. A blocked recovery attack still counts as the recovery opportunity. Preventing the initial charge does not trigger recovery. These are explicit test rules, not a universal boss contract.

Thus the uninterrupted cycle is **charge → release → ordinary attack → charge**. Interruption replaces the release with a lost action; it does not disable the cycle permanently. Both charge attacks are physical approaches powered by stored electricity, so their melee classification has a visible rationale. Artwork should show that distinction from the ranged security beam.

## Attrition and rewards

HP and knockouts persist between encounters; move uses reset. Once per run, revive one fallen squad member between battles at half maximum HP rounded up. This cannot rescue a full wipe. Before the boss, a recovery station restores 10 HP to standing members only, capped at maximum. These values remain test settings, not finalized recovery balance.

Retreat between encounters and retain earned paper XP. A fresh run restores the squad. Award each starting member 10 paper XP per first-three victory and 30 for the boss, including knocked-out members. A first-clear token marker is an economy discussion placeholder; no live token, credit, perk or reward is issued. Total successful-run XP is 60 each.

## Player cards

All three secondaries have three uses each. M = approach-dependent melee; R = ranged. Labels describe the proposed action rather than adding names to the canonical move catalog.

| ID / species | Element | HP | Speed | Secondary 1 | Secondary 2 | Secondary 3 | Signature, one use |
|---|---|---:|---:|---|---|---|---|
| G / Graviclaw | Dark | 64 | 40 | Pincer strike: 8 M | Claw compression: 10 M | Shell shove: 6 M | Point of No Return: Snare, R |
| A / Avilily | Plant | 38 | 80 | Beak strike: 6 M | Talon rake: 8 M | Saliva spray: 5 R | Blossoming Ambuscade: Snare, M |
| C / Crystorn | Light | 56 | 35 | Horn beam: 8 R | Fist strike: 7 M | Light spray: 6 R | Coronet of the Twin Suns: 16 R |
| H / Hippochamp | Water | 56 | 55 | Water stream: 8 R | Hoof strike: 7 M | Tail lash: 6 M | Hydrostatic Lance: 16 R |

Graviclaw's slow control is not interchangeable with Avilily's fast control. Avilily is fragile and its own snare requires approach, while Graviclaw's projection remains available when restrained. These range interpretations are paper assumptions to verify against the new schema. A shove is simplified to damage here; this does not settle the full action grammar.

## Dedicated enemy cards

All damage uses the enemy's listed element. These are combat affinities selected for the prototype, not planetary canon.

| Enemy | ID(s) | Element | HP | Speed | Actions |
|---|---|---|---:|---:|---|
| Maintenance crawler | M1–M5 | Sand | 22 | 60 | Tool strike: 7 melee |
| Security drone | D2, D4 | Light | 24 | 50 | Security beam: 7 ranged |
| Shield unit | S2 | Sand | 30 | 45 | Ram: 6 melee; Shield cycle: self-ward |
| Discharge unit | V3 | Electric | 48 | 65 | Contact strike: 7 melee; Capacitor rush: charge then 16 melee |
| Central guardian | B4 | Electric | 110 | 65 | Clamp strike: 7 melee; Core surge: charge then 18 melee |

Ordinary enemies use their only attack. Shield units choose Ram with weight 2 and Shield cycle with weight 1. Charge units obey their cycle; if Snare prevents starting a charge, no melee action is legal and they lose that opportunity. All offensive targets are uniformly random among standing player creatures when orders are committed. Targets remain fixed until execution or legal fallback. Hidden orders do not imply every decision must be unpredictable: the charge cycle is learnable.

## Encounter sequence

| Encounter | Roster | Purpose |
|---|---|---|
| 1. Service entrance | M1 and M2 | Straightforward opening; learn the squad without a new special enemy |
| 2. Security checkpoint | M3, D2, S2 | Mix ordinary ranged pressure and self-protection; target selection |
| 3. Power chamber | M4, V3 | Introduce the visible charge and the cost of spending control elsewhere |
| 4. Control chamber | M5, D4, B4 | Combine familiar defenders with a recurring boss threat |

The shield is not guaranteed to demonstrate protection before it falls; this is acceptable here because the boss does not depend on that lesson. Essential charge behavior starts reliably when legal. Encounters should be evaluated as a sequence, without requiring every enemy to teach a unique mechanic.

Relevant matchups for these cards:

| Attacking element | Dark | Plant | Light | Water | Sand | Electric |
|---|---:|---:|---:|---:|---:|---:|
| Dark | 0.5 | 0 | 2 | 1 | 1 | 1 |
| Plant | 0.5 | 1 | 1.5 | 2 | 1.5 | 1 |
| Light | 2 | 1 | 0.5 | 1 | 0.5 | 1 |
| Water | 1 | 0.5 | 1 | 1 | 1.5 | 0.5 |
| Sand | 1 | 1 | 1 | 0.5 | 1 | 1.5 |
| Electric | 1.5 | 0.5 | 1 | 2 | 0 | 1 |

The checked source matrix wins if this copied reference disagrees. No secondary affinity or same-element attack bonus is added.

## Checked sample and limitations

Run `node docs/design/paper-dungeon-02/simulate.mjs` from the repository root. The dependency-free calculator reads actual player signature names/elements and the actual type chart, checks basic legality/counters and emits the transcripts and results. It does not alter canonical or production data.

[Sample run](sample-run.md), seed 1: the guardian charges on round 1, Avilily interrupts its release on round 2, it attacks ordinarily on round 3, charges again on round 4, and lands an 18-damage hit on Crystorn on round 5 before falling. The squad finishes at G 54/64, A 38/38, C 38/56, H 46/56. Several preferred secondary moves exhaust before the final round. See [adverse run](adverse-run.md) for the selected least-favorable run under the same policy, and [results](results.json) for complete summaries.

| Policy, seeds 1–200 | Wins | Runs with a player knockout | Unresolved at 20 rounds |
|---|---:|---:|---:|
| Visible-state planner reserving fast control around charge enemies | 200 | 2 | 0 |
| Same scoring policy with restraint disabled | 200 | 53 | 0 |
| First available secondary / first living target, no signatures | 175 | 153 | 2 |

The first two policies use the same healer-free squad; disabling restraint does not test a different roster. They show that taking charge damage is survivable in these trials and control can reduce knockouts. They do not establish human difficulty, ideal balance, equal histories between policies, or viability of all crews. Random streams diverge as decisions change state. Both informed policies winning every run suggests a forgiving introductory fixture, not a competitive benchmark.

The planner reads only visible state, favors damage/finishing opportunities, and saves fast restraint if a charge-capable foe is present. It never reads committed enemy orders. It is a simple scripted policy, not an optimal strategy or a model of a new player.

Still open: ordinary move differentiation pending the new schema; meaningful situations for slower control; exhausted-player handling (enemy attacks can continue); alternate squads and multiple difficulty bands; status-chain protection; human pacing and whether the boss remains enjoyable after defenders fall. A repeated charge cycle is intended predictability, but future bosses need not all use that pattern. No final reward economy or new perk balance is established.

## Facilitated first turn

Start all player cards at full HP and uses. Reveal only encounter 1: M1 and M2, each 22 HP, Sand, speed 60, one 7-damage melee attack. For a reproducible initial row use squad H, C, A, G and enemies M1, M2; a fresh session can randomize them. The facilitator commits the crawlers' random targets privately, then asks the player for one move and target per creature. Resolve their actual choices; the sample transcript is not a required solution. Record confusion and decisions without changing numbers during the run.

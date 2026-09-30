# Powerworks: enemy intents, and keys that show power

## Context

Nick, 2026-09-30, after the UX pass: the move keys show one result cell per enemy, and in practice that crowds the screen ("A and B both show that it's going to hit for six points"). He wants the choice more direct: look at which attacks have the most power, look at which enemy is the most desirable target (least health, a shield, a matchup), and send the attack there. He is wary of making every attack land the same on every enemy, because target choice is part of the fun. He also approved enemy intents: the UX pass's readers put the enemy hit chip first in every round, because it is a what-if computed on whichever companion is acting, and only a committed intent can make it a fact.

Two facts already on record make this work. Path 1 (Nick, 2026-09-28, [powerworks-pillars.md](powerworks-pillars.md)) gives every attack its creature's element, so a companion's attacks rise and fall together against an enemy: the matchup belongs to the pair (companion, enemy), not to each move. And the research pass found that every hero battler shows the element on the unit and the advantage on the target, not a move-by-enemy grid.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | A key shows the move's power once (one number), plus its shape (ALL, hinder, shield, heal, rests, once per fight). The per-enemy cells go. | 85%, Nick's own proposal; it is also what Path 1 allows, since the matchup is per pair | Nick 2026-09-30; `pillars/levers.ts` `ELEMENT_SOURCE` |
| 2 | Each enemy plate carries what makes it a target for the companion now acting: health, shield, the matchup mark (strong, weak, immune) for this companion's element, and its intent. The matchup is shown once per enemy, not once per move. | 85% | research report, "Research: where other games put the element" |
| 3 | The exact result is one step away, on the target: hovering or selecting a key shows on each enemy plate what that move would land (the number, a skull when it finishes, "no effect" when immune). The player never does arithmetic to act, and the number sits on the thing it changes. | 80%, the earlier "marks only" concept scored low because the player had to sum; a preview on the target keeps the numbers without the grid | screen concepts, 2026-09-28 (critic: marks 38, answer keys 50) |
| 4 | Acting is choose a key, then choose an enemy (click the key, then the enemy's plate or figure; keyboard 1 to 4 then A to F). A move with one legal target, an area move, and a self move act on the key click alone. On phone: tap a key to select and preview, tap an enemy to act. | 80%, the standard battler flow; one extra click on single-target attacks | UX pass 2 phone ruling (tap to preview, tap to use) |
| 5 | Attacks keep their per-enemy differences (matchup, shields, finishing); nothing is locked to land the same everywhere. Target choice stays a real decision: health left, shields, matchup, and now intents. | 90%, Nick is wary of locking it | Nick 2026-09-30 |
| 6 | Intents: each enemy commits to its next move and target when it enters an encounter and again right after each of its turns, and shows both on its plate. It chooses with the same logic as today (`enemyChoice`), using moves that will be ready on its next turn. | 80% | `pillars/engine.ts` `enemyChoice`; `turns.ts` `run` |
| 7 | At its turn an enemy carries out its intent. If the target has fallen, an attack goes to the next standing companion in row order (the workshop's redirect rule, mirrored) and a support picks again among its allies; the move stays the same. Hinders, shields and boosts applied since change the numbers, never the choice. | 80% | "The base round: settled" (redirect rule) |
| 8 | The intent chip replaces the what-if hit chip: the target's portrait and name, the number it would land now (uncapped, a skull when lethal), and the move name on hover. A support intent shows its kind and recipient. The squad plate's "can fall" becomes exact: a companion targeted by a lethal intent. | 85% | UX pass 2 readers, every round |
| 9 | Difficulty is re-measured after intents (enemies now choose earlier, with less information, and the player can react); enemy health factor retuned only if the hardest-hit rule on the preset squad moves more than 3 points. The sim players stay as they are (they do not read intents). | 70% | `devtools/pillarsTurns.ts` |
| 10 | Save version moves to 3 (a run now stores intents). | 90% | `PILLAR_SAVE_VERSION` |

## Engine (packages/rules/src/dungeon/pillars)

- `TRun.intents: Record<enemyId, { move: number; target: string }>`, set on encounter entry for every enemy and after each enemy act for that enemy (skipped when the enemy has fallen or the encounter ended).
- The choice: `enemyChoice` with readiness judged at the enemy's next turn (a move whose cooldown is 1 or less is ready then, since cooldowns tick at the start of the unit's own turn).
- Execution in `run`: use the intent; redirect per decision 7; if the move is somehow not ready or illegal, choose afresh (and test that this never happens in ordinary play).
- Tests: intents exist for every standing enemy on every companion turn; an enemy executes exactly its intent when its target stands; redirect when the target fell; a support intent picks again when its ally fell; save version 3.

## Screen (apps/web/src/pages/games/powerworksTurns)

- Keys: name, one power number (or the support's number), shape tags, rests/once. The key is a single pressable surface. States: ready, selected (strong frame), resting, spent.
- Enemy plates: health, shield, matchup mark against the active companion, intent chip. While a key is hovered or selected: the landed number on each legal target's plate (large, same spot every time), skull when it finishes, "no effect" when immune; illegal targets dim.
- Allies: a support key aimed at allies previews on squad plates the same way.
- Area keys preview on every enemy at once and act on the key click.
- The Guide, the briefing's lesson row, first-use notes and the phone layout are updated to the new flow.
- The rules held by UX pass 2 stay: numbers and words in place, never suggestions; sides by position; calm motion; one fixed screen; phone text at least 12 px and controls at least 40 px.

## Verification

Unit and page tests for the flow; the geometry check at five sizes; frames of the journey; then one fresh critic and three fresh readers (the reader brief gains: "which enemy will each enemy attack next, and for how much?").

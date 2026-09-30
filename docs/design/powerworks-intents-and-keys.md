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

## Measured

Difficulty, before and after intents (decision 9). Command, both runs the same: `node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=sources --squads=preset,draft,samples,mixed --runs=150 --look=60` (round timeline, roles rooms, `ENEMY_HP_FACTOR` 0.76, seeds 1 to 150). The "before" run was taken on the engine as it stood at the contract commit (enemies choosing at their own turn), the "after" run with intents (enemies choosing when they enter and after each of their turns, readiness judged at the next turn, redirect when the target has fallen). The sim players do not read intents.

Before:

| Squads | random | biggest number | hardest-hit | planner | look-ahead | hardest-hit won / lost / retreated / unfinished | mean rooms entered | turns per encounter (finished runs) |
|---|---|---|---|---|---|---|---|---|
| preset | 5% | 40% | 97% | 82% | 67% | 97% / 3% / 0% / 0% | 4.00 | 22.5 |
| draft | 27% | 52% | 61% | 51% | 45% | 61% / 25% / 13% / 0% | 3.92 | 27.3 |
| samples | 17% | 37% | 38% | 37% | 53% | 38% / 32% / 30% / 0% | 3.42 | 34.0 |
| mixed | 12% | 35% | 49% | 40% | 53% | 49% / 37% / 14% / 0% | 3.75 | 31.7 |

After:

| Squads | random | biggest number | hardest-hit | planner | look-ahead | hardest-hit won / lost / retreated / unfinished | mean rooms entered | turns per encounter (finished runs) |
|---|---|---|---|---|---|---|---|---|
| preset | 5% | 36% | 99% | 78% | 98% | 99% / 1% / 0% / 0% | 4.00 | 20.7 |
| draft | 27% | 57% | 67% | 60% | 67% | 67% / 19% / 15% / 0% | 3.94 | 26.3 |
| samples | 17% | 40% | 41% | 37% | 53% | 41% / 29% / 31% / 0% | 3.52 | 31.3 |
| mixed | 16% | 34% | 57% | 49% | 63% | 57% / 31% / 13% / 0% | 3.83 | 28.2 |

Reading: the preset squad's hardest-hit win rate moved from 97% to 99%, two points, inside decision 9's three-point bound, so `ENEMY_HP_FACTOR` stays 0.76. The other sources moved up 3 to 8 points for hardest-hit (draft +6, samples +3, mixed +8) and encounters got a little shorter (0.9 to 3.5 turns), as expected: an enemy that commits before the player's turn can no longer be re-chosen against a state the player has just changed, so the players (which do not read intents) lose a few enemy attacks that the old choice would have aimed better. Likely cause, not isolated by a run of its own: an enemy that commits before the player's turn can no longer be re-aimed at a state the player has just changed, and the sim players do not read intents, so they lose the value of that information. These are sim-player numbers; a human who reads intents is a stronger player than any of them, so the playtest, not this table, is the difficulty test. `ENEMY_HP_FACTOR` is not retuned.

## Built

Engine (`packages/rules/src/dungeon/pillars`), every line confirmed by a test in `turns.test.ts` unless it names another:

- `TRun.intents` (enemy id to move and target) is set for every standing enemy on encounter entry and after each enemy act, pruned for the fallen, emptied when the encounter ends (test "has an intent for every standing enemy on every companion turn, and none for the fallen", both timelines; "clears intents when the encounter ends").
- The choice is `enemyChoice(s, u, slack = 1)`: a move whose rest counter is 1 or less counts as ready, because a rest counter ticks down at the start of the unit's own turn (`ready(u, i, slack)`, `legalMoves(u, slack)`; the same test proves the committed move is usable at its turn).
- `run` executes `resolveIntent`: the intent when its target stands (test "carries out exactly the committed move and target, or redirects from it when the target fell"), an attack turned to the next standing companion in row order when the target has fallen (test "sends an attack to the next standing companion in row order"; a `redirect` event is emitted, which the screen already worded), a support picking again among its allies, the most hurt first (test "picks a support's recipient again among its allies"), and a fresh `enemyChoice` for an intent that is somehow unusable (never reached in the 16-seed test).
- `PILLAR_SAVE_VERSION` is 3 (test "saves as version 3"); an older save starts a new run.

Screen (`apps/web/src/pages/games/powerworksTurns`). Frames are from the capture set of 2026-09-30 (`plan-ux2.json` entries S01 to S13f, 1366x768 and 844x390 read by eye; 1920x1080, 932x430 and 667x375 are held by the geometry check only, not read by eye, so "not confirmed" by frame at those three sizes):

1. A key is one button with one power number, shape tags and its rest (decision 1). Frames `S02-first-look-1366x768/000-0.png`, `S02-first-look-844x390/000-0.png`; test "a key shows one power number and no cell per enemy".
2. Each enemy plate carries health, shield, the matchup mark against the acting companion (strong, weak, no effect; an icon alone on a phone), and its intent chip: the target's portrait and name (an enemy ally by its letter), the number it would land now, uncapped, a skull when lethal, the strong or weak chevron; a support intent shows its kind, number and recipient (decisions 2 and 8). Frames `S03a-options-graviclaw-1366x768/000-0.png` (a shield chip and a struck number), `S13c-intents-support-1366x768/000-0.png` and `S13c-intents-support-844x390/000-0.png` (a heal for an ally, "C 16"), `S13b-intents-lethal-1366x768/000-0.png` (a skull, lethal). The number, target and lethal flag are proven in `view.test.ts` "an enemy's intent".
3. Hovering a key shows the exact landed number on each legal target's plate (a skull when it finishes, no effect when immune, the shield note, a hinder as the enemy's committed hit before and after, a heal or shield on squadmates, a self or whole-squad key on the units it reaches), in one place on every plate, and units the key cannot name step back (decision 3). Frames `S13a-intents-first-look-1366x768/001-326.png` (hover), `S13a-intents-first-look-1366x768/002-743.png` (selected), `S13a-intents-first-look-844x390/002-746.png` (phone, selected), `S13b-intents-lethal-1366x768/000-0.png` for the skull; tests "hovering a key shows what it would land on each enemy's plate" and "previews the exact landed number on each legal target's plate".
4. Acting is a key, then an enemy: a key that needs a target is selected (strong mint frame, "pick a target", the banner says "Now choose a target."), then the plate is pressed; a self or whole-squad key, an area attack and a lone target act on the key alone (decision 4). Frames `S13a-intents-first-look-1366x768/002-743.png`, `S04a-acting-1366x768/001-662.png` (the acted attack), `S04a-acting-844x390/001-677.png`; tests "acting is a key, then an enemy", "an area key previews on every enemy at once and acts on the press alone", `phone.test.ts` "acts at once on a mouse or keyboard when the key needs no target".
5. Keyboard 1 to 4 then A to F (1 to 4 for a squadmate when the selected key is aimed at one; Escape backs out), covered by the test "the keyboard is a key (1 to 4), then an enemy (A to F)" only; no frame.
6. Phone: a tap selects a key and shows its numbers on the plates, a tap on an enemy uses it; a key that acts on its own takes a second tap. Tests "a tap on a key selects it and shows its numbers on the plates; a tap on an enemy uses it" and "a key that acts on its own takes a second tap on a touch screen"; the geometry tap flow at 844x390, 932x430 and 667x375; frame `S13a-intents-first-look-844x390/002-746.png`.
7. Enemies execute their intents: the chips read on the companion's turn are what plays. Frames `S13e-intents-execute-1366x768/000-0.png` (A on Hippochamp for 7, B on Graviclaw for 14) then `S13e-intents-execute-1366x768/006-3074.png` (A's hit on Hippochamp) and `S13e-intents-execute-1366x768/010-5380.png` (B hit Graviclaw for 14). The chips are not drawn while beats play (the plate keeps their space) and come back freshly committed at the hand-off; the matchup mark follows the same rule (test "intent chips are not drawn while enemies act, and come back freshly committed at the settled hand-off").
8. A redirect: Overclock relay B turned from Hippochamp to Avilily after A's hit felled Hippochamp. Frames `S13d-intents-redirect-1366x768/009-4715.png`, `S13d-intents-redirect-844x390/010-4853.png`; the redirect scenario is searched by `turnScenarios.ts`.
9. "Can fall" is exact: a companion targeted (or reached by an area attack) by a lethal intent of an enemy acting before its next turn. Frame `S13b-intents-lethal-1366x768/000-0.png` (Hippochamp 17 against B's 28) and `S13b-intents-lethal-844x390/000-0.png` (the mark above the element tag); tests in "round 5: knockout warnings from lethal intents".
10. The what-if hit chip, the per-enemy key cells, the ALL band, the rider chips, the cell-only CSS (about 530 lines net) and `hitDuring`, `threatOn`, `hitComing` are gone. The struck skull and the rider before and after live on the preview now (test "item 6: a hinder rider on an attack shows what that enemy's committed hit falls to").
11. Guide, the briefing's lesson row and the first-use notes are rewritten for the new flow (the notes' words say "preview", "Each enemy's plate shows its own number", and name the enemy's committed hit for a hinder). Frames `S01-arrival-1366x768/000-0.png` (the lesson row) and `S01-arrival-1366x768/012-7349.png` (the Guide); tests "the Guide is a legend drawn with the real components", "shows the briefing on a new run", `view.test.ts` "round 5: first-occurrence notes".
12. Camp and the next sector: the camp panel is unchanged and the next sector opens with freshly committed intents. Frames `S13f-intents-camp-1366x768/000-0.png` and `S13f-intents-camp-1366x768/006-4382.png`.

Checks: `npx vitest run packages/rules/src/dungeon/pillars` 41 tests; `npm run typecheck -w packages/rules`; `npx vitest run src/pages/games/powerworksTurns` 168 tests and `npx tsc --noEmit -p tsconfig.json` in `apps/web`; the geometry check (`scripts/powerworks-turns/geometry.cjs`) at 1920x1080, 1366x768, 844x390, 932x430 and 667x375 over 17 scenarios: 2174 checks, 0 failures.

Changes to the layout the intents forced, stated so the next pass can move them: the desktop key bar is 132 px tall (a key is one button, not a row of cells) and the enemy figures are 98 px (boss 110) so an enemy plaque with its chip clears the squad row; the phone stage gives the enemy row 58% and the squad row 40%; on a phone the preview number may rise above a short figure area and cover the enemy's letter and guardian tags (the plaque's name row repeats both), a landing number the same, and the "can fall" mark rides above the element tag; the phone banner sentence check is desktop-only (the phone banner clamps to two lines by design and the key column repeats the sentence while it plays).

Not done, or open:

- Frames at 1920x1080, 932x430 and 667x375 were not read by eye (geometry only).
- Difficulty: not retuned (decision 9); the preset squad moved 2 points, the other sim sources moved up 3 to 8. Nick's playtest is the test.
- One fresh critic and three fresh readers (the Verification paragraph above) were not run in this pass.
- The Guide's plate column reads tightly (row text sits close to the next row's sample); it fits at every size but was not given a paint pass.

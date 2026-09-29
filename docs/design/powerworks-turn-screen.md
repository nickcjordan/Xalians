# Powerworks turn screen: the page on the turn-by-turn engine

Status: built, 2026-09-29 (live at /powerworks; the v5 page at /powerworks/classic). Nick approved the screen pass on turn by turn with rounds ("yeah lets see it"). Rules of record: [powerworks-pillars.md](powerworks-pillars.md), sections "The pillars", "Screen concepts" and "Turn by turn". This file is the build contract for the page.

## Context

The live `/powerworks` page runs the v5 engine (`@xalians/rules/dungeon`) with whole-squad planning. The pillar engine's turn-by-turn mode (`packages/rules/src/dungeon/pillars/turns.ts`, PR #748) is built and measured. This pass puts a new page on it: on each companion's turn the player sees only that creature's four keys, each key already carries its result on every target (the "answer keys" concept, the recommended one of the 2026-09-28 concepts), and one click on a target cell acts. Enemies take their turns between, played back one beat at a time.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | A new page, not a retrofit: the v5 page is 2,620 lines bound to the v5 `Run`, frames and radial; the pillar engine shares none of it. The v5 page moves to `/powerworks/classic` until Nick retires it. | 85%, the simplification's point is fewer mechanics; retrofitting would keep the old reading alive | `apps/web/src/pages/games/powerworksPage.tsx` imports |
| 2 | Round timeline, roles rooms, enemy health factor 0.62, preset squad; the speed timeline and turn-order layer stay off. | 85%, the pillars doc recommendation and its matched-difficulty table | `powerworks-pillars.md` "Turn by turn" |
| 3 | Answer keys: an enemy-aimed key shows one cell per standing enemy (letter, landed number, matchup chevron, finish mark); an ally-aimed key shows one cell per squadmate; clicking a cell acts. One click per turn for most moves. | 80%, answer keys scored highest with the critic and blind readers; the cell doubles as the target button | `powerworks-pillars.md` "Screen concepts" |
| 4 | One finish mark, not the concept's two (before / after it strikes). In turn by turn a knockout always stops the enemy's next turn, so the distinction no longer changes the decision. | 75%, simpler base; can return as a mastery hint | `turns.ts` `run()` |
| 5 | Each enemy plate shows its strongest hit on the active companion (swords, number, chevron): element in both directions, pillar 1. | 70%, the concept vocabulary; the enemy's real target is its own choice | `powerworks-pillars.md` decision 1 |
| 6 | Role enemies borrow the five machine paintings (mender and warden the shield unit, jammer and rallier the drone); no two in one room share a painting, and letters tell them apart. | 70%, no new art in this pass | `pillars/roles.json`, `PAINTED_SPECIES` |
| 7 | No briefing screen: the run opens on the first companion's turn; a Guide panel states the rules in a few lines. | 70%, less to build; the briefing returns if Nick wants it | this pass |
| 8 | The console scales to fit any landscape screen above 600 px wide, below 1 as well (zoom, so text stays crisp); portrait phones get the rotate prompt. | 75%, games are one fixed screen | `consoleScale` in the v5 page |

## Layout (the console is composed at 1280 x 720)

- **Top bar**: back to Xalians, sector n/4 and room name, "Round n", Guide, Record, Restart.
- **Stage** over `PowerworksEnvironment` for the room: enemies on the upper row, squad on the lower row, sides by position only (no side colors). Every plate: portrait, name, health bar with its number, chips for shield (Shield icon + n), boost (+n) and hinder (−n). Enemy plates add the letter and the hit on the active companion. The active companion's plate is lifted and ringed.
- **Keys** above the squad row, only for the active companion: four keys plus a small Pass. A key: number (1 to 4), name, its cells or its one number, and a foot line with "rests n" or "resting, n" or "once" for the signature. Resting and spent keys are dimmed and inert.
  - Attack cells: letter head, landed number large, a chevron up (green) for step above 1 and down (red) for below 1, a struck circle and 0 for immune, a skull when it finishes, a small shield when shields absorb part. When `same`, the number shows once with "every enemy" and the letter buttons stay as a thin row for aiming.
  - Hinder-only cells: the enemy's hit on the active companion before and after (struck 9, then 5).
  - Heal, shield and boost cells for squadmates: small portrait head and the number.
  - "now" keys (self or everyone) act on press and read "on itself" or "whole squad".
- **Turn strip** along the bottom: this round in order as small portraits, enemies with their letters; done slots dimmed, the active one ringed, fallen ones struck. The round number sits at its left.
- **Playback**: after a command, the page replays the beats (player's action, then each enemy turn) at about 700 ms each: the actor's plate lights, the target shows a floating number, the caption line reads the beat's words. Space, Enter or a click on "Skip" finishes it at once. Input is off during playback.
- **Camp** between encounters, over the next room's backdrop: "Sector cleared, +XP", squad health, Revive (when a companion is down and a revival is left), Continue. The room before the last notes the recovery station.
- **End**: won, lost, or forced out (stall), with Play again.
- **Keyboard**: 1 to 4 picks a key; for an aimed key, A to F picks an enemy cell and 1 to 4 a squadmate cell; Escape backs out; P passes.

## Engine additions (turns.ts)

- `export * from "./turns.ts"` through `pillars/index.ts` (explicit names where they collide).
- `roundOf(s)`: the 1-based round of the encounter, from the clocks.
- `roundStrip(s)`: every unit of this round in timeline order with `done` (acted this round), for the round timeline; the speed timeline falls back to `upcoming`.

## Save

`localStorage` key `xalians.powerworks.turns.v1` holding `{ version: PILLAR_SAVE_VERSION, state }`; a bad or old save starts fresh. `?seed=n` starts a new run with that seed.

## Verification

Vitest for `view.ts` and the new engine helpers; a page test that plays a turn by clicking a cell and reaches camp from a seeded state; `tsc`; paint at 1920 x 1080, 1366 x 768 and 844 x 390 with no page scroll and every control in view; blind readers on Opus.

## Build record, 2026-09-29

Built by two Sonnet agents against this contract (data layer: `turns.ts` `roundOf` and `roundStrip`, `powerworksTurns/view.ts`; page: `powerworksTurns/`), validated by paint and blind readers over six review rounds.

- **Paint.** A geometry check (every figure, letter and plaque inside the stage; every squad plaque above the key bar) passed 243 checks over four saved situations (Security checkpoint with finishes and a shield, Power chamber with an area attack, Control chamber with the guardian and a fallen companion, the first turn) at 1920 x 1080, 1366 x 768 and 844 x 390. No page scroll at any size.
- **Bugs found in review and fixed:** the enemy hit chip vanished for any enemy that had already acted (a rest counter read as "not ready" until the enemy's own turn); the settled state was applied before playback ended, which soft-locked the page at an encounter's final blow; the boss figure shrank when its plaque grew; the enemy row overflowed the top of the stage once hit chips appeared.
- **Blind readers (Opus), round 1:** turn, damage per enemy, finishes, shields, matchup arrows, which cell to click and turn order all read right; missed hinder ("-3" with a link icon), area attacks (Water Sweep read as single target, its rider under one cell), who had acted, and what "once" meant.
- **After fixes, round 2 (two fresh readers):** hinder read as "its attack cut by 3" with the hit chip already net of it, Water Sweep read as hitting all three with "3 each", acted units read from the checks, "once per fight" and "rests 1 turn" read. Still weak: the arrows on an enemy's hit chip (read as "strong" by one reader, unsure by the other), the boost chip's icon, and whether a finishing cell's number is the hit or the target's remaining health (it is the health it takes, capped).

## Open, for play

- **Numbers.** Avilily's two pecks land for 1 (intensity 10 to 19 reads as power 1 under `POWER_DIVISOR` 10), and one of them rests; her kit's value is Hinder 9 and 7, which cancels a crawler's hit outright. A lever case for the numbers pass, not for this screen.
- **Difficulty.** Enemy health factor 0.62 comes from the simulator; tune it with Nick's play.

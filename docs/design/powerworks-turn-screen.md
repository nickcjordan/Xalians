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

## UX pass, 2026-09-29

Nick, after playing #750: "It feels like you built the pieces and put them in place and said good enough without actually doing any visual pass. Not much on here is intuitive. It's hard to tell whose turn it is currently or if it's my turn or what just happened or what's happening next."

Frame captures of one turn (300 ms apart, 1366 x 768) confirm it: the enemy phase flashes by in about two seconds; the caption sits in the key bar, far from the action; the companion who just acted stays lit while the enemies act, and the enemies never light; the floating number is small; the hand-off to the next companion is a silent snap; the turn strip is a row of 42 px portraits in the bottom-left corner; nothing on screen says what happened since your last turn. The v5 page already had choreography for this (lunge, projectile, impact, recoil, collapse, a 1.5x calm pace Nick asked for on 2026-09-26); the new page dropped it.

### The four questions, and what answers each

| Question | Answer on screen |
|---|---|
| Whose turn is it? | The actor is spotlit on the stage (brighter, a little larger, a ring on the floor, a pointer over its head; everyone else a step dimmer), and it is the big NOW slot on the turn rail. |
| Is it mine? | The turn banner: "Your turn · Hippochamp" in the accent (the one forward action) with the keys raised and headed by the creature's portrait and name, or "Enemy turn · B Maintenance crawler" in neutral ink with the key bar lowered and inert. The banner changes with a short slide at every hand-off. |
| What just happened? | Every action plays as a beat on the stage: the actor lunges or casts toward its target, the target flashes, a large number rises over it, its health bar drains with a ghost segment. The beat's sentence sits under the banner, near the action. What happened since your last turn stays visible through your turn: a "-7" (or "+5") delta on each plate that changed, and a short "Since your last turn" list under the banner that opens the full Record. |
| What happens next? | The turn rail: a large strip across the top of the stage, time running left to right, two lanes (enemies in the upper lane, the squad in the lower lane, the same sides as the stage), NOW enlarged, the next slot labeled NEXT, acted slots checked and dimmed, a divider and "Round 2" where the next round starts. |

### Storyboard of one turn cycle

1. **Hand-off to you** (about 600 ms): the rail advances; the banner slides to "Your turn · <name>"; the spotlight moves to the companion; the key bar rises with its portrait and name at the left edge.
2. **Choosing**: hovering a cell rings its enemy on the stage and draws a faint aim line from your companion to it; hovering an enemy lights that enemy's cell in every key.
3. **Your action** (about 1.4 s): keys lower; your companion lunges (contact) or casts (ranged) toward the target; impact flash; number rises; bar drains with a ghost; the sentence shows under the banner.
4. **Enemy phase**, one beat per enemy (about 1.4 s each at 1x): the banner reads "Enemy turn · <letter> <name>", the spotlight and the rail's NOW move to that enemy, it acts on its target the same way. A 1x / 2x toggle and Skip sit by the banner; Skip jumps to the hand-off, never past it.
5. **Round change**: the rail slides; "Round n" shows briefly in the banner.
6. Back to 1, with the "Since your last turn" deltas set.

Reduced motion: every step is instant, the banner and the deltas still change.

### Validation (before Nick sees it)

- A frame-capture harness plays scripted turns and writes frame sequences (about 100 ms apart) for each beat of the storyboard, as contact sheets, at 1920 x 1080 and 1366 x 768.
- The geometry check from the build stays green.
- Blind Opus readers get numbered frame sequences, not stills, and answer: at frame n, whose turn is it, is it yours, what just happened between frames m and n, who acts next, what did your squad lose since your last turn.
- A separate Opus critic scores the flow against this storyboard, 0 to 10 per question and beat; the bar is 8 on every line before it ships.

### UX pass record, 2026-09-29

Built against the storyboard above and judged in motion: a capture harness (`scripts/powerworks-turns/`: saved situations from `pillars/devtools/turnScenarios.ts`, frame sequences with contact sheets and per-frame hooks, and the geometry check) played three cycles (an attack into a two-enemy phase, a knockout into a round change, an every-enemy attack with a rider) and five rounds of fresh Opus critics scored them against the four questions and the beats, with blind Opus readers on the same sequences.

| Round | Whose turn | Is it mine | What just happened | What happens next | Lowest beat |
|---|---|---|---|---|---|
| 1 | 8 | 9 | 6 | 7 | 7 |
| 3 | 9 | 9 | 7 | 8 | round change 6 |
| 5 | 9 | 9 | 8 | 8 | 8 on every beat |

What changed on the way, in the order the reviews asked for it: the top bar became place, banner (round, whose turn, the moment's sentence or what changed since your last turn), turn rail (one time axis, enemies above the track and the squad below, NOW and NEXT pills, the next round's start) and tools; beats became moments (one actor's one move, however many targets), with strike lines from actor to target, a lunge, a rising number, health that drops when the blow lands, and a knockout that sinks after it lands; the key bar shows "Enemy turn · Your next turn: X" while enemies act and "Round n · Your turn · X" at the hand-off; each plate keeps its change since your last turn beside its health; an enemy's hit chip shows whom it is about and what a weakening took off; the rail's next-round peek repeated the round's last unit (an off-by-one, fixed with a test).

Still open, for play: a round change that opens on an enemy's turn has no captured sequence; "strong matchup" on a hit of 1 reads as a contradiction (the numbers pass, Avilily's pecks); the hover ring only appears once the pointer moves onto a cell.

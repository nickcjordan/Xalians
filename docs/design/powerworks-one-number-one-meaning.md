# Powerworks: one number, one meaning, one place

## Context

Nick, 2026-10-02, with two screenshots of the first turn after the threat tags shipped (#777):

- Hovering Slashing Peck (card "✺3"): a big "5" appeared above each crawler.
- Hovering Binding Rake (card "−14"): "14 → 0, its hit" appeared above each crawler, plus a hover tip, "Its next hit 14. On an enemy."

He said: "I have no idea how to read this, or why the 2 read so differently. Why when I hover over one move does it show a different number on the enemy than the move shows, and then when I hover over the other move, it shows the same number, but then it goes from 14 to 0. This just doesn't make any sense. ... slapping on these little tooltips is not the answer to fixing the ambiguity."

He is right, and the cause is structural. Not one of these numbers can be understood where it appears:

1. **The card's 3 and the preview's 5 are different quantities in the same form.** The 3 is power before the matchup; the 5 is the damage after it. Both are a bare big number next to a glyph.
2. **The hinder preview talks about a number that is not shown there.** "14 → 0" above a crawler is that crawler's next hit, but since #777 the crawler's plate no longer shows its next hit. The 14 has no home on the plate it appears over, and it collides with the card's own 14.
3. **The card glyphs need a legend.** The ✺ and the crossed swords on the move cards are the same marks the enemy tags use, so "✺3" on a card and "✺14" on a tag look like the same kind of thing.
4. **The words were patches.** The hover tip, the first-use banner notes and "its hit" were added to rescue those forms. The hover tip is also wrong for a hinder: "Its next hit 14" should say "cuts its next hit by 14".

Readers flagged parts of this in both rounds of #777 (hinder previews on every enemy read as "hits both"; whose bonus the ×1.5 is). The critic loop scored the build 7 and it shipped anyway. The reader test also missed it: readers studied each frame with crops, while Nick reads at a glance.

## The rules

1. **Each number has one kind, one form and one home.**
   - Health lives on health rows.
   - A move's strength lives on its card.
   - An enemy's next act lives on that enemy's plate and, as a threat tag, on the plate it lands on.
   - Marks (shield, boost, weaken) live in the marks row.
2. **A preview changes a number in its home, before and after, and never puts a new kind of number somewhere else.**
   - Strike: the target's health row reads "34 → 29" and the bar segment that would go is lit.
   - Weaken: the target's next-hit number reads "14 → 0".
   - Mend: the ally's health row.
   - Guard: the ally's shield chip.
   - No floating preview badges.
3. **A preview stays on the plate it changes.**
   - While a move is hovered or chosen, every plate it could target shows that move's effect on that plate. Each plate is an option, read in place.
   - The threat tags on companion plates and the link line change only for the target being pointed at (hovered, or chosen on a phone).
4. **Moves are named by what the player does.** A move card shows a verb and its number: Strike 3, Sweep 6, Weaken 14, Mend 9, Guard 6, Boost 4, Slow 1. A rider follows the main act ("Sweep 6 · Weaken 6"). These are the player's choices, so words are the ruled form (Nick, 2026-09-30: strike, sweep, mend, guard). Cards carry no ✺ or crossed swords; those glyphs belong to enemy hits only.
5. **No hover tips, no first-use notes, no "its hit" captions.** If a reader needs one of them, the form is wrong.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | **Each enemy plate shows its next act again**, as one row under its health: the hit glyph and number ("✺14"), with a small downward pointer toward the squad. An area hit adds ALL. A support shows its icon, its number and the recipient's letter ("♥+15 C"); a self support shows its icon and number. The plate still never names a companion. #777 removed the act together with the companion's name, but only the name was the problem: without the act on the enemy's plate, a weaken preview there had nothing to change (Nick's "it goes from 14 to 0"). | 80% | Nick 2026-10-02; #777 critic: the enemy is the subject of its own act |
| 2 | **Threat tags stay on companion plates as they are** ("A ✺14", lethal raspberry with skull, notch). The enemy's number appearing twice is deliberate. On the enemy it says how hard this option hits; on the companion it says what is coming at me. The two always agree. | 75% | #777 readers 8/8/8 on who-hits-whom |
| 3 | **Move cards are verb plus number, in two sizes of the same line** ("STRIKE 3", "SWEEP 6 ALL", "WEAKEN 14", "MEND 9", "GUARD 6"). The timing word stays on the foot ("once", "rests 1", "ready in 2"). A strike changed by the actor's own boost or weaken reads "STRIKE ~~3~~ 1". The verb is decided by the move's main act: an attack on one enemy is Strike, an attack on all is Sweep, then the supports. | 80% | ruling 2026-09-30 (words for the player's choices) |
| 4 | **Attack previews live on the health row** of every enemy the move can hit: "~~34~~ 29" with the lost segment lit, and a skull at the number when it reaches 0. The matchup tab on that plate lights while the preview shows, so 3 on the card and 5 lost read as "3, ×1.5". No separate damage number. | 70%, the 3 against 5 gap is now explained by the lit factor beside it; glance readers decide | Nick 2026-10-02 question 1 |
| 5 | **Weaken previews live on the enemy's next-act row**: "✺ ~~14~~ 0" on every enemy the move can name. Hovering one enemy also re-reads its threat tag on the companion and draws the link line. A finishing strike crosses out the enemy's next-act row on that enemy's plate, and, for the pointed target, its threat tags. | 80% | rule 2 |
| 6 | **Support previews live where the support lands**: Mend on the ally's health row (gain segment in green); Guard as a shield chip appearing in the ally's marks row, with the ally's threat tags re-reading after the shield; Boost as a "+4" chip on the ally's marks row. | 75% | rule 2 |
| 7 | **Removed**: the hover tip (desktop), the first-use notes ("Hinder: cuts that enemy's next hit", shield, ALL), the floating preview badges and their chevrons, and the "its hit" caption. The banner keeps only the prompt ("Choose a move", "Now choose a target") and the since-your-last-turn line. The Guide teaches the verbs and the before-and-after form with one example each. | 85% | Nick 2026-10-02: "slapping on these little tooltips is not the answer" |
| 8 | **Playback uses the same homes.** A weaken that lands turns the enemy's next-act row and its tag from 7 to 0 in place. The "NEXT HIT −14" float goes. A hit that lands drains the health row. The landed damage number at impact stays, since it is the event itself. | 75% | #777 critic issue 5 |
| 9 | **The phone gets the same card language** (verb plus number in its column) and the same previews. | 75% | |

## Storyboard (what the glance test reads)

1. First turn at rest: each crawler's plate shows "✺14 ▾" under its health; the companions carry "A ✺14" and "B ✺14"; the cards read "WEAKEN 21 once", "STRIKE 4 rests 1", "WEAKEN 14", "STRIKE 3".
2. Hover STRIKE 3: each crawler's health row reads "~~34~~ 29" with the segment lit, and its ×1.5 tab is lit.
3. Hover WEAKEN 14: each crawler's next-act row reads "✺ ~~14~~ 0"; nothing else changes.
4. With WEAKEN 14 chosen, point at B: B's tag on its companion re-reads "~~14~~ 0" and the line joins B to it.
5. A finishing strike: the target's health row "~~1~~ 0 ☠"; its next-act row crossed out.
6. A Mend on a hurt ally and a Guard on a threatened ally (sample scenario).
7. Playback of a weaken then the enemy turns: numbers change in place; no floats except landed damage.
8. Phone 844x390, at rest and with a move chosen.

## Verification

Page tests for every rule. Geometry at all five sizes. Then a glance test, built to match how Nick reads:

- Three cold Opus readers each get single frames (storyboard 1 to 5 and 8). They answer fixed questions within one viewing, without cropping:
  - What does each number mean?
  - The card says 3; what happens to each crawler, and why that much?
  - What will WEAKEN 14 do if used on B?
  - Has anything happened yet?
- An answer key from the engine grades the replies. The bar is every reader right on every number question and none of them confused by the card against preview gap.
- Then a fresh critic scores the storyboard.
- Ship only when both hold; then Nick plays.

## Built (2026-10-02, branch feat/powerworks-one-meaning)

Frames are in the session scratchpad under `onemeaning/frames/final/` (each folder holds 1366x768 and 1920x1080 unless named 844x390; the first frame of a folder is a true rest frame where the step says at rest). Code is in `apps/web/src/pages/games/powerworksTurns/`: `view.ts` (`ActLine`, `NextAct`, `nextActsOf`, `PlatePreview`, `platePreviewOf`), `keys.tsx` (the verb and number card), `plate.tsx` (`HealthBar` preview, `NextActRow`, chips with previews, the lit matchup tab), `moves.tsx`, `banner.tsx`, `guide.tsx`, the page and four CSS files. Scenarios `mend-ally` and `guard-ally` were added to `turnScenarios.ts` (the starters have no ally heal or shield, so these are three starters plus one sample creature, reached by real turns).

1. Enemy plates show their next act again, one row under health: hit glyph, number, a small downward pointer; ALL for an area hit; a support shows icon, number and the ally's letter; the row is reserved so a plate never changes height. It names no companion. Frames: `s1-rest` (every crawler "7" and "14" with the pointer), `s2-hover-strike/first-1366x768/001-*` (the same rows at rest beside a strike). Tests: view.test.ts "decision 1" (two tests), page test "decision 1: at rest each enemy's plate says its next act".
2. Companion threat tags are unchanged, and the enemy's number appearing twice agrees by construction (both read `threatsOf`). Frames: `s1-rest` (A 7 on Hippochamp, B 14 on Graviclaw). Test: the same page test compares each enemy row with its tag.
3. Cards are verb plus number with no glyph (STRIKE 3, WEAKEN 14, SWEEP 6 ALL, MEND 9, GUARD 5, a rider on its own line after a dot), timing on the foot, the actor's own boost or hinder as the struck plain number then the new one. Frames: `s1-rest`, `s6-mend` and `s6-guard` (Mend 21, Guard 5), `s8-phone/first-844x390/000-0.png`. Tests: view.test.ts "decision 3", page test "rule 4 and 5: a move card is a verb and a number with no glyph".
4. Attack previews live on the target's health row, old struck then new, the lost bar segment lit, a skull at 0, the matchup tab lit, an absorbed shield share read on the shield chip. Frames: `s2-hover-strike/first-1366x768/001-*.png` and the 1920 one ("34 29" with the segment and the lit x1.5 tab), `s5-finish/finish-1366x768/003-*.png` (A "1 0" with a skull). Tests: view.test.ts "decision 4", page test "decisions 2 and 4".
5. Weaken previews live on every enemy's next-act row ("7 to 0", "14 to 0"), nothing else changes; pointing at B with the weaken chosen re-reads only B's tag on its companion and draws the link line; a finishing strike crosses out the row on its plate and the tag. Frames: `s3-hover-weaken`, `s4-weaken-chosen-point-B/first-1920x1080/002-*.png` (both rows read old then new, only B's tag on Graviclaw reads "14 to 0"), `s5-finish`. Tests: view.test.ts "decision 5", page tests "decisions 2 and 5" and "decision 5" (two).
6. Support previews live where they land: a mend is the gain segment and "old new" on the ally's health row, a guard is a lit shield chip in its marks row, a boost a "+N" chip, and with the guard chosen and an ally pointed at, that ally's tags re-read. Frames: `s6-mend/mend-ally-1366x768/001-*.png` (112 to 126, 122 to 136, 36 to 57), `s6-guard/guard-ally-1366x768/003-*.png` (shield chips on the three allies and Hippochamp's tags "1 to 0" after the guard). Tests: view.test.ts "decision 6", page test "decision 6".
7. Removed: the hover tip, first-use notes and their storage, the floating `PreviewBadge` and chevrons, the "its hit" caption, and the banner's hindered sentence (the card's struck number and the plate's own chip say it). The banner keeps the prompt, the since line and, while playing, the beat words and the next turn. The Guide and the briefing lesson teach the verbs and the before-and-after form with one example each, drawn by the real components. Frames: every frame above (no badge, tip or note anywhere); `brief` via the geometry run. Tests: page tests "rule 5" and "decision 7", Guide tests.
8. Playback changes the same homes: after the weaken lands the enemy's row and its tag read 0 in place and the hinder chip appears; the "next hit" float and every float except the landed blow are gone (a heal changes the health row and its delta chip). Frames: `s7-playback-weaken/first-1366x768/003-1673.png` (A's row "0", tag "A 0" on Hippochamp, no float) and the following frames for the landed hit. Tests: the page playback test now also asserts the row reads 0 and no "next hit" float; view.test.ts "decision 8".
9. The phone has the same card language and previews at 12 px or more with 40 px controls. Frames: `s8-phone/first-844x390/000-0.png` (rest) and `001-*.png` (Strike chosen, both health rows "34 29"), `s8-phone-guard/guard-ally-844x390/000-*.png` (guard chips on the allies). Geometry checks the 12 px floor on the new rows.

Deviations and what was left:
- A rider follows the main act on its own line after a dot, not on one line ("SWEEP 6 / . WEAKEN 6"): a 124 px card cannot hold both.
- A strike that does 0 (an own hinder of 14 on a 4-power move, or an immune matchup) shows no health change; the card's struck number and the lit "no effect" tab are the whole story. A slow changes no row of the target's own, so it previews nothing (its home would be the turn rail, not built here). A self mend, guard or boost carried as a rider on an attack previews nowhere, as before.
- `Cell.hitOn`, `saves`, `knocks`, `ownBefore`, `KeyView.powerNow`, `ownMark` and `TurnView.activeStatus` were deleted as dead; the lethal-saved information now reads through the re-read tags.
- Geometry: the preview-badge and tip checks became checks that the next-act row stays inside its plaque and is never cut short, that a previewed health row and number are never cut short, and that no removed element is on screen. Last run, all five sizes and 20 scenarios (the two new ones included): 2461 checks, 0 failures. The briefing's lesson was reshaped (a smaller plaque sample, a shorter phone sentence) because the first draft pushed the 667x375 briefing 11 px past its panel.

Form fix after review: the health row now reads before, arrow, after ("34 -> 29", "112 -> 126", "1 -> 0" with a skull), the after number larger and heavier than a resting health number; a finished enemy's next-act row is one 2 px ink strike through the hit glyph and number (the pointer is hidden, the number dimmed but legible). Frames: `frames/final2/`. Geometry again 2461 checks, 0 failures.
